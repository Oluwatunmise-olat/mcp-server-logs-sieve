import { LogEntry, LogSummary, TraceResult } from "../providers/types.js";

const TIME_UNITS: { [key: string]: number } = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const MAX_OUTPUT_CHARS = 80_000;

export function parseRelativeTime(input: string): string {
  const match = input.match(/^(\d+)([mhd])$/);

  if (match) {
    const [, amount, unit] = match;
    return new Date(
      Date.now() - Number(amount) * TIME_UNITS[unit],
    ).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input;

  throw new Error(
    `Invalid time format "${input}". Use ISO 8601 (e.g. 2026-03-06T00:00:00Z) or relative (e.g. 1h, 30m, 7d).`,
  );
}

export function formatEntries(entries: LogEntry[]): string {
  if (!entries.length) return "No log entries found.";

  return entries
    .map(
      (e) =>
        `[${e.timestamp}] ${e.severity} ${truncate(normalizeMessage(e.message), 280)}`,
    )
    .join("\n");
}

export function formatSummary(summary: LogSummary): string {
  const lines: string[] = [];

  lines.push(`Total entries: ${summary.total_entries}`);

  lines.push(
    `Time range: ${summary.time_range.earliest} to ${summary.time_range.latest}`,
  );

  lines.push("");

  lines.push("Severity:");

  for (const [level, count] of Object.entries(summary.severity_counts)) {
    lines.push(`  ${level}: ${count}`);
  }

  if (summary.top_patterns.length) {
    lines.push("");
    lines.push("Top patterns:");
    for (const p of summary.top_patterns) {
      lines.push(`  (${p.count}x) ${redactText(p.pattern)}`);
    }
  }

  return lines.join("\n");
}

export function formatTrace(traces: TraceResult[]): string {
  if (!traces.length) return "No traces found.";

  const lines: string[] = [];

  for (const trace of traces) {
    lines.push(`--- Trace: ${trace.trace_id} ---`);
    lines.push(`Services: ${trace.services.join(", ") || "unknown"}`);
    lines.push(`Duration: ${trace.duration_ms}ms`);
    lines.push(`Entries: ${trace.entries.length}`);
    lines.push("");

    for (const e of trace.entries) {
      lines.push(
        `  [${e.timestamp}] ${e.severity} (${e.resource_type || "?"}) ${truncate(normalizeMessage(e.message), 220)}`,
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1)}...`;
}

function normalizeMessage(message: string): string {
  if (!message) return "";

  const compact = redactText(message.replace(/\s+/g, " ").trim());

  if (compact.startsWith("{") && compact.endsWith("}")) {
    try {
      const obj = JSON.parse(compact) as Record<string, unknown>;
      const out = summarizeObject(obj);
      if (out) return out;
    } catch {}
  }

  return compact;
}

function summarizeObject(
  obj: Record<string, unknown>,
  prefix = "",
  maxFields = 14,
): string {
  const pairs: string[] = [];

  const visit = (value: unknown, keyPath: string) => {
    if (pairs.length >= maxFields) return;

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      const rendered = redactValueByKey(keyPath, value);
      pairs.push(`${keyPath}=${rendered}`);
      return;
    }

    if (Array.isArray(value)) {
      const preview = value
        .slice(0, 3)
        .map((v) => (typeof v === "object" && v !== null ? "{...}" : String(v)))
        .join(",");
      pairs.push(`${keyPath}=[${preview}${value.length > 3 ? ",..." : ""}]`);
      return;
    }

    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value as Record<string, unknown>);
      for (const [k, v] of entries) {
        if (pairs.length >= maxFields) break;
        visit(v, keyPath ? `${keyPath}.${k}` : k);
      }
    }
  };

  const entries = Object.entries(obj);
  for (const [k, v] of entries) {
    if (pairs.length >= maxFields) break;
    visit(v, prefix ? `${prefix}.${k}` : k);
  }

  return pairs.join(" ");
}

function redactValueByKey(keyPath: string, value: unknown): string {
  const lower = keyPath.toLowerCase();

  const sensitiveKeyHints = [
    "password",
    "passwd",
    "token",
    "secret",
    "apikey",
    "api_key",
    "authorization",
    "auth",
    "cookie",
    "session",
    "otp",
    "pin",
    "cvv",
    "card",
    "account_number",
    "private_key",
    "private_key_id",
    "client_secret",
    "service_account_key",
    "aws_secret",
    "secret_access_key",
    "access_key_id",
    "connection_string",
    "database_url",
    "db_url",
    "dsn",
    "refresh_token",
    "id_token",
    "access_token",
    "x-api-key",
    "x_api_key",
    "ssn",
    "social_security",
    "encryption_key",
    "signing_key",
    "hmac",
  ];

  if (sensitiveKeyHints.some((hint) => lower.includes(hint))) {
    return "[REDACTED]";
  }

  return redactText(String(value));
}

function redactText(input: string): string {
  let out = input;

  out = out.replace(
    /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|amqp|amqps):\/\/[^\s"']+/g,
    "[REDACTED_CONNECTION_STRING]",
  );

  out = out.replace(
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    "[REDACTED_JWT]",
  );

  out = out.replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]");

  out = out.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    "[REDACTED_EMAIL]",
  );

  out = out.replace(
    /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    (match) => {
      if (match === "127.0.0.1" || match === "0.0.0.0") return match;
      return "[REDACTED_IP]";
    },
  );

  out = out.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]");

  out = out.replace(/\bBearer\s+[A-Za-z0-9_\-.]{16,}/g, "[REDACTED_BEARER]");

  out = out.replace(
    /\b(?:sk_|pk_|ghp_|xox[baprs]-|ya29\.)[A-Za-z0-9_\-]{16,}\b/g,
    "[REDACTED_TOKEN]",
  );

  out = out.replace(/\b(?:\+?\d[\d\s\-()]{8,}\d)\b/g, "[REDACTED_PHONE]");

  out = out.replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_CARD]");

  return out;
}

export function sanitizeEntries(entries: LogEntry[]): unknown {
  const redacted = entries.map((e) => ({
    ...e,
    message: truncate(e.message, 500),
  }));

  const sanitized = redacted.map((e) => redactDeep(e));

  if (JSON.stringify(sanitized).length <= MAX_OUTPUT_CHARS) return sanitized;

  let lowEnd = 1;

  let highEnd = sanitized.length - 1;

  while (lowEnd < highEnd) {
    const mid = Math.ceil((lowEnd + highEnd) / 2);

    if (JSON.stringify(sanitized.slice(0, mid)).length <= MAX_OUTPUT_CHARS) {
      lowEnd = mid;
    } else {
      highEnd = mid - 1;
    }
  }

  return {
    entries: sanitized.slice(0, lowEnd),
    _note: `Showing ${lowEnd} of ${redacted.length} entries. Narrow your query with time range or text_filter.`,
  };
}

export function sanitizeSummary(summary: LogSummary): unknown {
  const cleaned = {
    ...summary,
    top_patterns: summary.top_patterns.map((p) => ({
      ...p,
      sample: truncate(p.sample, 200),
    })),
  };

  return redactDeep(cleaned);
}

export function sanitizeTraces(traces: TraceResult[]): unknown {
  return traces.map((trace) => {
    const capped =
      trace.entries.length > 50 ? trace.entries.slice(0, 50) : trace.entries;

    return redactDeep({
      ...trace,
      entries: capped.map((e) => ({
        ...e,
        message: truncate(e.message, 500),
      })),
      ...(trace.entries.length > 50
        ? {
            _note: `Showing 50 of ${trace.entries.length} entries for this trace.`,
          }
        : {}),
    });
  });
}

export function redactDeep(value: unknown, keyHint?: string): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (keyHint) {
      const redacted = redactValueByKey(keyHint, value);
      if (redacted === "[REDACTED]") return redacted;
    }
    return redactText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, keyHint));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v, k);
    }
    return out;
  }

  return value;
}
