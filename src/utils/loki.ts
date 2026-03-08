import { LogEntry, LokiStream, QueryParams } from "../providers/types.js";

const MATCHER_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*("?)(.*?)\2\s*$/;

const TRACE_ID_PATTERNS = [
  /\btrace[_-]?id["'=:\s]+([A-Za-z0-9-]{8,128})\b/i,
  /\btrace["'=:\s]+([A-Za-z0-9-]{8,128})\b/i,
  /\b([a-f0-9]{16}|[a-f0-9]{32})\b/i,
];

export function buildLokiQuery(params: QueryParams) {
  let query = buildLokiSelector(params.log_name, params.resource_type);

  if (params.text_filter) {
    query += ` |= "${escapeLogqlDoubleQuotedString(params.text_filter)}"`;
  }

  if (params.severity) {
    const pattern = severityToPattern(params.severity);
    if (pattern) query += ` |~ "(?i)${pattern}"`;
  }

  return query;
}

export function buildLokiSelector(logName?: string, resourceType?: string) {
  if (logName && isRawSelector(logName)) {
    if (resourceType) {
      throw new Error(
        "resource_type cannot be combined with a raw Loki selector in log_name.",
      );
    }

    return logName.trim();
  }

  const matchers: Array<{ key: string; value: string }> = [];

  if (logName) {
    const parsed = parseMatcher(logName);

    if (parsed) matchers.push(parsed);
    else matchers.push({ key: "job", value: logName });
  }

  if (resourceType) {
    const parsed = parseMatcher(resourceType);

    if (parsed) matchers.push(parsed);
    else matchers.push({ key: "app", value: resourceType });
  }

  matchers.sort((a, b) => a.key.localeCompare(b.key));

  let selector = "{";

  for (let i = 0; i < matchers.length; i++) {
    const matcher = matchers[i];

    const key = validateLabelName(matcher.key);

    const value = escapeLogqlDoubleQuotedString(matcher.value);

    if (i > 0) selector += ",";

    selector += `${key}="${value}"`;
  }

  selector += "}";

  return selector;
}

export function mapStreamsToEntries(streams: LokiStream[]) {
  const entries: LogEntry[] = [];

  for (const stream of streams) {
    const labels = stream.stream;

    for (const [timestampNs, line] of stream.values) {
      entries.push({
        timestamp: lokiNanosecondsToIso(timestampNs),
        severity: detectLokiSeverity(line, labels),
        message: line || "",
        resource_type: labels.app || labels.service || labels.namespace,
        log_name: labels.job,
        trace_id: extractLokiTraceId(line, labels)!,
        labels,
      });
    }
  }

  return entries;
}

export function lokiIsoToNanoseconds(input: string) {
  const millis = new Date(input).getTime();

  if (!Number.isFinite(millis)) throw new Error(`Invalid timestamp "${input}"`);

  return (BigInt(millis) * 1_000_000n).toString();
}

export function lokiNanosecondsToIso(input: string) {
  const value = input.trim();

  if (!value) return "";

  try {
    const nanos = BigInt(value);

    if (nanos < 0n) return "";

    const millis = Number(nanos / 1_000_000n);

    if (!Number.isFinite(millis)) return "";

    return new Date(millis).toISOString();
  } catch {
    return "";
  }
}

export function escapeLogqlDoubleQuotedString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function extractLokiTraceId(
  line: string,
  labels: Record<string, string>,
) {
  if (labels.trace_id) return labels.trace_id;
  if (labels.traceid) return labels.traceid;
  if (labels.traceID) return labels.traceID;
  if (labels.trace) return labels.trace;
  if (labels.otelTraceID) return labels.otelTraceID;

  for (const pattern of TRACE_ID_PATTERNS) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function normalizeLokiMessageKey(message: string) {
  let value = message.replace(/\s+/g, " ").trim();

  value = value.slice(0, 120);

  value = value.replace(/[0-9a-f-]{8,}/gi, "*");

  value = value.replace(/\b\d+\b/g, "N");

  return value;
}

export function normalizeLokiBaseUrl(scope: string) {
  const baseUrl = scope;

  if (!baseUrl) throw new Error("Loki scope must be a base URL.");

  const withScheme =
    baseUrl.startsWith("http://") || baseUrl.startsWith("https://")
      ? baseUrl
      : `http://${baseUrl}`;

  return withScheme.endsWith("/") ? withScheme.slice(0, -1) : withScheme;
}

function detectLokiSeverity(line: string, labels: Record<string, string>) {
  const labelSeverity = (labels.level || labels.severity || "").toUpperCase();

  if (labelSeverity) return normalizeSeverity(labelSeverity);

  const upper = line.toUpperCase();

  if (upper.includes("ERROR") || upper.includes("EXCEPTION")) return "ERROR";
  if (upper.includes("WARN")) return "WARNING";
  if (upper.includes("DEBUG") || upper.includes("TRACE")) return "DEBUG";
  if (upper.includes("CRITICAL") || upper.includes("FATAL")) return "CRITICAL";

  return "INFO";
}

function normalizeSeverity(raw: string) {
  if (raw.includes("WARN")) return "WARNING";
  if (raw.includes("ERR")) return "ERROR";
  if (raw.includes("CRIT") || raw.includes("FATAL")) return "CRITICAL";
  if (raw.includes("DEBUG") || raw.includes("TRACE")) return "DEBUG";
  if (raw.includes("NOTICE")) return "INFO";
  if (raw.includes("ALERT") || raw.includes("EMERG")) return "CRITICAL";

  return "INFO";
}

function severityToPattern(input: string) {
  const severity = input.toUpperCase();

  switch (severity) {
    case "DEBUG":
      return "\\b(?:debug|trace)\\b";
    case "INFO":
      return "\\binfo\\b";
    case "NOTICE":
      return "\\b(?:notice|info)\\b";
    case "WARNING":
      return "\\b(?:warn|warning)\\b";
    case "ERROR":
      return "\\b(?:error|err)\\b";
    case "CRITICAL":
      return "\\b(?:critical|fatal|panic)\\b";
    case "ALERT":
      return "\\b(?:alert|critical|fatal|panic)\\b";
    case "EMERGENCY":
      return "\\b(?:emerg|emergency|critical|fatal|panic)\\b";
    default:
      return null;
  }
}

function parseMatcher(value: string) {
  const match = value.match(MATCHER_PATTERN);

  if (!match) return null;

  const [, key, , matcherValue] = match;

  return { key, value: matcherValue };
}

function isRawSelector(value: string) {
  const text = value.trim();

  return text.startsWith("{") && text.endsWith("}");
}

function validateLabelName(name: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid Loki label name "${name}"`);
  }

  return name;
}
