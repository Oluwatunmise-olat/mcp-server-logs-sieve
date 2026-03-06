import { injectable, inject } from "tsyringe";
import { Logging, Entry } from "@google-cloud/logging";

import {
  LogProvider,
  LogEntry,
  QueryParams,
  LogSummary,
  LogSource,
  TraceParams,
  TraceResult,
} from "../types.js";

@injectable()
export class GcpLogProvider implements LogProvider {
  readonly id = "gcp";
  readonly name = "Google Cloud Logging";

  private readonly clientCache = new Map<string, Logging>();

  constructor(@inject("Logging") private readonly logging: Logging) {}

  private loggingForProject(projectId?: string): Logging {
    if (!projectId) return this.logging;

    let client = this.clientCache.get(projectId);

    if (!client) {
      client = new Logging({ projectId });
      this.clientCache.set(projectId, client);
    }

    return client;
  }

  async queryLogs(params: QueryParams): Promise<LogEntry[]> {
    try {
      const [entries] = await this.loggingForProject(
        params.project_id,
      ).getEntries({
        filter: buildFilter(params),
        pageSize: params.limit || 50,
        orderBy: "timestamp desc",
      });

      return entries.map(toLogEntry);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`GCP queryLogs failed: ${message}`);
    }
  }

  async summarizeLogs(params: QueryParams): Promise<LogSummary> {
    const entries = await this.queryLogs({
      ...params,
      limit: params.limit || 200,
    });

    const severityCounts: Record<string, number> = {};

    const resourceTypeCounts: Record<string, number> = {};

    const patterns = new Map<string, { count: number; sample: string }>();

    for (const entry of entries) {
      severityCounts[entry.severity] =
        (severityCounts[entry.severity] || 0) + 1;

      if (entry.resource_type) {
        resourceTypeCounts[entry.resource_type] =
          (resourceTypeCounts[entry.resource_type] || 0) + 1;
      }

      const key = messagePatternKey(entry.message);

      const hit = patterns.get(key);

      if (hit) hit.count++;
      else patterns.set(key, { count: 1, sample: entry.message });
    }

    const topPatterns = [...patterns.entries()]
      .map(([pattern, v]) => ({ pattern, count: v.count, sample: v.sample }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const timestamps = entries
      .map((e) => e.timestamp)
      .filter(Boolean)
      .sort();

    return {
      total_entries: entries.length,
      severity_counts: severityCounts,
      top_patterns: topPatterns,
      time_range: {
        earliest: timestamps[0] || "",
        latest: timestamps[timestamps.length - 1] || "",
      },
      resource_type_counts: resourceTypeCounts,
    };
  }

  async listSources(projectId: string): Promise<LogSource[]> {
    try {
      const logging = this.loggingForProject(projectId);
      const sources: LogSource[] = [];
      const seenLogNames = new Set<string>();
      const seenResourceTypes = new Set<string>();

      const [recent] = await logging.getEntries({
        filter: `resource.labels.project_id = "${projectId}"`,
        pageSize: 100,
        orderBy: "timestamp desc",
      });

      for (const entry of recent) {
        if (
          entry.metadata.logName &&
          !seenLogNames.has(entry.metadata.logName)
        ) {
          seenLogNames.add(entry.metadata.logName);
          sources.push({ type: "log_name", name: entry.metadata.logName });
        }

        const rt = entry.metadata.resource?.type;

        if (rt && !seenResourceTypes.has(rt)) {
          seenResourceTypes.add(rt);
          sources.push({ type: "resource_type", name: rt });
        }
      }

      return sources;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      throw new Error(`GCP listSources failed: ${message}`);
    }
  }

  async traceRequests(params: TraceParams): Promise<TraceResult[]> {
    try {
      const logging = this.loggingForProject(params.project_id);

      let traceIds: string[] = [];

      if (params.trace_id) {
        traceIds = [normalizeTraceId(params.project_id, params.trace_id)];
      } else {
        const seed = await this.queryLogs({
          project_id: params.project_id,
          start_time: params.start_time,
          end_time: params.end_time,
          text_filter: params.text_filter,
          severity: params.severity,
          resource_type: params.resource_type,
          limit: params.limit || 50,
        });

        const seen = new Set<string>();
        for (const entry of seed) {
          if (entry.trace_id) seen.add(entry.trace_id);
        }
        traceIds = [...seen];
      }

      if (!traceIds.length) return [];

      traceIds = traceIds.slice(0, 5);

      const results: TraceResult[] = [];

      for (const traceId of traceIds) {
        const filter = buildTraceFilter(
          params.project_id,
          traceId,
          params.start_time,
          params.end_time,
        );

        const [entries] = await logging.getEntries({
          filter,
          pageSize: 200,
          orderBy: "timestamp asc",
        });

        const logEntries = entries.map(toLogEntry);

        const services = [
          ...new Set(logEntries.map((e) => e.resource_type).filter(Boolean)),
        ] as string[];

        let durationMs = 0;

        if (logEntries.length > 1) {
          const first = new Date(logEntries[0].timestamp).getTime();

          const last = new Date(
            logEntries[logEntries.length - 1].timestamp,
          ).getTime();

          durationMs = last - first;
        }

        results.push({
          trace_id: traceId,
          entries: logEntries,
          services,
          duration_ms: durationMs,
        });
      }

      return results;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`GCP traceRequests failed: ${message}`);
    }
  }
}

function buildFilter(params: QueryParams): string {
  const parts: string[] = [];

  if (params.project_id)
    parts.push(`resource.labels.project_id = "${params.project_id}"`);

  if (params.severity) parts.push(`severity >= ${params.severity}`);

  if (params.start_time) parts.push(`timestamp >= "${params.start_time}"`);

  if (params.end_time) parts.push(`timestamp <= "${params.end_time}"`);

  if (params.text_filter) {
    const escaped = params.text_filter
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    parts.push(`SEARCH("${escaped}")`);
  }

  if (params.resource_type)
    parts.push(`resource.type = "${params.resource_type}"`);

  if (params.log_name) parts.push(`logName = "${params.log_name}"`);

  return parts.join(" AND ");
}

function normalizeTraceId(projectId: string, traceId: string): string {
  if (traceId.startsWith("projects/")) return traceId;

  return `projects/${projectId}/traces/${traceId}`;
}

function buildTraceFilter(
  projectId: string,
  traceId: string,
  startTime?: string,
  endTime?: string,
): string {
  const parts = [
    `resource.labels.project_id = "${projectId}"`,
    `trace = "${traceId}"`,
  ];

  if (startTime) parts.push(`timestamp >= "${startTime}"`);

  if (endTime) parts.push(`timestamp <= "${endTime}"`);

  return parts.join(" AND ");
}

function toLogEntry(entry: Entry): LogEntry {
  const m = entry.metadata;
  const ts = m.timestamp;

  return {
    timestamp: ts instanceof Date ? ts.toISOString() : "",
    severity: String(m.severity || "DEFAULT"),
    message: safeParsePayload(entry.data),
    resource_type: m.resource?.type || undefined,
    resource_labels: m.resource?.labels as Record<string, string> | undefined,
    labels: m.labels as Record<string, string> | undefined,
    log_name: m.logName || undefined,
    insert_id: m.insertId || undefined,
    trace_id: m.trace || undefined,
  };
}

function safeParsePayload(data: unknown): string {
  if (!data) return "";

  if (typeof data === "string") return data;

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function messagePatternKey(message: string): string {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text) return "";

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const noisyKeyParts = [
      "id",
      "uuid",
      "trace",
      "span",
      "request",
      "session",
      "timestamp",
      "time",
      "date",
      "created",
      "updated",
      "ip",
      "email",
      "user",
      "account",
      "token",
      "hash",
      "path",
      "url",
      "uri",
      "stack",
      "line",
      "column",
      "offset",
    ];
    const entries = Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
    const parts: string[] = [];

    for (const [key, value] of entries) {
      const keyLower = key.toLowerCase();
      if (noisyKeyParts.some((part) => keyLower.includes(part))) continue;

      let normalized: string | null = null;

      if (typeof value === "string") {
        normalized = value.replace(/\s+/g, " ").trim();
      } else if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        normalized = String(value);
      }

      if (!normalized) continue;

      const cleaned = normalized
        .replace(/[0-9a-f-]{8,}/gi, "*")
        .replace(/\b\d+\b/g, "N");
      if (!cleaned) continue;

      parts.push(`${key}=${cleaned}`);
      if (parts.length >= 4) break;
    }

    if (parts.length > 0) return parts.join(" | ").slice(0, 180);
  }

  const shortText = text.slice(0, 120);
  return shortText.replace(/[0-9a-f-]{8,}/gi, "*").replace(/\b\d+\b/g, "N");
}
