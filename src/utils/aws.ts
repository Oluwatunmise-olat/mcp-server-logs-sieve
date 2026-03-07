import { FilteredLogEvent } from "@aws-sdk/client-cloudwatch-logs";

import { LogEntry } from "../types.js";

export function toLogEntry(event: FilteredLogEvent, logGroupName: string): LogEntry {
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

export function detectSeverity(message: string): string {
  const upper = message.toUpperCase();

  if (upper.includes("ERROR") || upper.includes("EXCEPTION")) return "ERROR";

  if (upper.includes("WARN")) return "WARNING";

  if (upper.includes("DEBUG")) return "DEBUG";

  if (upper.includes("FATAL") || upper.includes("CRITICAL")) return "CRITICAL";

  return "INFO";
}
