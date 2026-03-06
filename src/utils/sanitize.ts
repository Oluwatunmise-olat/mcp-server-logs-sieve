import { LogEntry, LogSummary, TraceResult } from "../providers/types.js";
import { redactText, redactValueByKey, redactDeep } from "./redact.js";

const MAX_OUTPUT_CHARS = 80_000;

export function sanitizeEntries(entries: LogEntry[]): unknown {
  const cleaned = entries.map((e) =>
    redactDeep({ ...e, message: truncate(e.message, 500) }),
  );

  const json = JSON.stringify(cleaned);

  if (json.length <= MAX_OUTPUT_CHARS) return cleaned;

  const avgSize = Math.ceil(json.length / cleaned.length);
  const keep = Math.max(1, Math.floor(MAX_OUTPUT_CHARS / avgSize));

  return {
    entries: cleaned.slice(0, keep),
    _note: `Showing ${keep} of ${entries.length} entries. Narrow your query with time range or text_filter.`,
  };
}

export function sanitizeSummary(summary: LogSummary): unknown {
  return redactDeep({
    ...summary,
    top_patterns: summary.top_patterns.map((p) => ({
      ...p,
      sample: truncate(p.sample, 200),
    })),
  });
}

export function sanitizeTraces(traces: TraceResult[]): unknown {
  return traces.map((trace) => {
    const capped = trace.entries.slice(0, 50);

    return redactDeep({
      ...trace,
      entries: capped.map((e) => ({ ...e, message: truncate(e.message, 500) })),
      ...(trace.entries.length > 50
        ? {
            _note: `Showing 50 of ${trace.entries.length} entries for this trace.`,
          }
        : {}),
    });
  });
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
  const lines = [
    `Total entries: ${summary.total_entries}`,
    `Time range: ${summary.time_range.earliest} to ${summary.time_range.latest}`,
    "",
    "Severity:",
    ...Object.entries(summary.severity_counts).map(
      ([level, count]) => `  ${level}: ${count}`,
    ),
  ];

  if (summary.top_patterns.length) {
    lines.push("", "Top patterns:");

    for (const p of summary.top_patterns) {
      lines.push(`  (${p.count}x) ${redactText(p.pattern)}`);
    }
  }

  return lines.join("\n");
}

export function formatTrace(traces: TraceResult[]): string {
  if (!traces.length) return "No traces found.";

  return traces
    .map((trace) => {
      const header = [
        `--- Trace: ${trace.trace_id} ---`,
        `Services: ${trace.services.join(", ") || "unknown"}`,
        `Duration: ${trace.duration_ms}ms`,
        `Entries: ${trace.entries.length}`,
        "",
      ];

      const body = trace.entries.map(
        (e) =>
          `  [${e.timestamp}] ${e.severity} (${e.resource_type || "?"}) ${truncate(normalizeMessage(e.message), 220)}`,
      );

      return [...header, ...body, ""].join("\n");
    })
    .join("\n");
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;

  return input.slice(0, max - 1) + "...";
}

function normalizeMessage(message: string): string {
  if (!message) return "";

  const compact = redactText(message.replace(/\s+/g, " ").trim());

  if (compact.startsWith("{") && compact.endsWith("}")) {
    try {
      const obj = JSON.parse(compact) as Record<string, unknown>;
      const flat = flattenObject(obj);

      if (flat) return flat;
    } catch {}
  }

  return compact;
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
  maxFields = 14,
): string {
  const pairs: string[] = [];

  const stack: { value: unknown; keyPath: string }[] = [];

  for (const [k, v] of Object.entries(obj)) {
    stack.push({ value: v, keyPath: prefix ? `${prefix}.${k}` : k });
  }

  while (stack.length > 0 && pairs.length < maxFields) {
    const { value, keyPath } = stack.shift()!;

    if (value === null || typeof value !== "object") {
      pairs.push(`${keyPath}=${redactValueByKey(keyPath, value)}`);
      continue;
    }

    if (Array.isArray(value)) {
      const preview = value
        .slice(0, 3)
        .map((v) =>
          typeof v === "object" && v !== null ? "{...}" : String(v),
        );

      pairs.push(
        `${keyPath}=[${preview.join(",")}${value.length > 3 ? ",..." : ""}]`,
      );
      continue;
    }

    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      stack.push({ value: v, keyPath: `${keyPath}.${k}` });
    }
  }

  return pairs.join(" ");
}
