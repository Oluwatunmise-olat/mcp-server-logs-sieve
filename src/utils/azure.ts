import type { LogsTable } from "@azure/monitor-query-logs";

import { LogEntry } from "../providers/types.js";

export function toLogEntry(
  row: LogsTable["rows"][number],
  table: LogsTable,
): LogEntry {
  const column = (name: string) =>
    table.columnDescriptors.findIndex((c) => c.name === name);

  const timeIdx = column("TimeGenerated");
  const severityIdx =
    column("SeverityLevel") !== -1 ? column("SeverityLevel") : column("Level");
  const messageIdx =
    column("Message") !== -1 ? column("Message") : column("OperationName");
  const idIdx =
    column("OperationId") !== -1 ? column("OperationId") : column("_ItemId");

  return {
    timestamp: timeIdx !== -1 ? String(row[timeIdx] ?? "") : "",
    severity: severityIdx !== -1 ? String(row[severityIdx] ?? "INFO") : "INFO",
    message: messageIdx !== -1 ? String(row[messageIdx] ?? "") : "",
    resource_type: table.name,
    insert_id: idIdx !== -1 ? String(row[idIdx] ?? "") : "",
  };
}

export function buildAzureQuery(params: {
  log_name?: string;
  severity?: string;
  text_filter?: string;
  limit?: number;
}) {
  const table = params.log_name || "AppTraces";

  const parts = [table];

  if (params.severity) {
    const level = severityToLevel(params.severity);
    parts.push(`| where SeverityLevel >= ${level}`);
  }

  if (params.text_filter) {
    parts.push(`| where Message contains "${params.text_filter}"`);
  }

  parts.push("| order by TimeGenerated desc");
  parts.push(`| take ${params.limit || 50}`);

  return parts.join("\n");
}

export function normalizeMessage(message: string) {
  return message
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .replace(/[0-9a-f-]{8,}/gi, "*")
    .replace(/\b\d+\b/g, "N");
}

function severityToLevel(severity: string) {
  const map: Record<string, number> = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4,
  };

  return map[severity] ?? 1;
}
