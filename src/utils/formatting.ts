import { LogEntry, LogSummary, TraceResult } from "../providers/types.js";

const TIME_UNITS: { [key: string]: number } = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseRelativeTime(input: string): string {
  const match = input.match(/^(\d+)([mhd])$/);

  if (!match) return input;

  const [, amount, unit] = match;

  return new Date(Date.now() - Number(amount) * TIME_UNITS[unit]).toISOString();
}

export function formatEntries(entries: LogEntry[]): string {
  if (!entries.length) return "No log entries found.";

  return entries
    .map((e) => `[${e.timestamp}] ${e.severity} ${e.message}`)
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
      lines.push(`  (${p.count}x) ${p.pattern}`);
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
        `  [${e.timestamp}] ${e.severity} (${e.resource_type || "?"}) ${e.message}`,
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}
