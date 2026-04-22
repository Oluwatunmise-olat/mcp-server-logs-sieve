import { Logging } from "@google-cloud/logging";

import {
  Credentials,
  LogProvider,
  LogEntry,
  QueryParams,
  LogSummary,
  LogSource,
  TraceParams,
  TraceResult,
} from "../types.js";
import {
  toLogEntry,
  buildFilter,
  buildTraceFilter,
  normalizeTraceId,
  messagePatternKey,
} from "../../utils/gcp.js";

export class GcpLogProvider implements LogProvider {
  readonly id = "gcp";
  readonly name = "Google Cloud Logging";

  private readonly logging: Logging;
  private readonly clientCache = new Map<string, Logging>();

  constructor(creds?: Credentials) {
    const credentials = creds?.googleApplicationCredentials
      ? JSON.parse(creds.googleApplicationCredentials)
      : undefined;
    this.logging = new Logging({ credentials });
  }

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
        params.scope,
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
      const logging = this.loggingForProject(params.scope);

      let traceIds: string[] = [];

      if (params.trace_id) {
        traceIds = [normalizeTraceId(params.scope, params.trace_id)];
      } else {
        const seed = await this.queryLogs({
          scope: params.scope,
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
          params.scope,
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
