import { FilteredLogEvent } from "@aws-sdk/client-cloudwatch-logs";

export function toLogEntry(event: FilteredLogEvent, logGroupName: string) {
  const ts = event.timestamp ? new Date(event.timestamp).toISOString() : "";

  const message = event.message || "";

  return {
    timestamp: ts,
    severity: detectSeverity(message),
    message,
    log_name: logGroupName,
    insert_id: event.eventId,
    resource_type: "cloudwatch_log_group",
    resource_labels: {
      log_stream: event.logStreamName || "",
    },
  };
}

export function normalizeMessageKey(message: string) {
  return message
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .replace(/[0-9a-f-]{8,}/gi, "*")
    .replace(/\b\d+\b/g, "N");
}

export function detectSeverity(message: string) {
  const upper = message.toUpperCase();

  if (upper.includes("ERROR") || upper.includes("EXCEPTION")) return "ERROR";

  if (upper.includes("WARN")) return "WARNING";

  if (upper.includes("DEBUG")) return "DEBUG";

  if (upper.includes("FATAL") || upper.includes("CRITICAL")) return "CRITICAL";

  return "INFO";
}
