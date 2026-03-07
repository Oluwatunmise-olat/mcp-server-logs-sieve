import { Entry } from "@google-cloud/logging";

import { LogEntry, QueryParams } from "../types.js";

export function toLogEntry(entry: Entry): LogEntry {
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

export function buildFilter(params: QueryParams): string {
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

  if (params.log_name) {
    const logName = params.log_name.startsWith("projects/")
      ? params.log_name
      : `projects/${params.project_id}/logs/${params.log_name}`;
    parts.push(`logName = "${logName}"`);
  }

  return parts.join(" AND ");
}

export function normalizeTraceId(projectId: string, traceId: string): string {
  if (traceId.startsWith("projects/")) return traceId;

  return `projects/${projectId}/traces/${traceId}`;
}

export function buildTraceFilter(
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

export function safeParsePayload(data: unknown): string {
  if (!data) return "";

  if (typeof data === "string") return data;

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export function messagePatternKey(message: string): string {
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
