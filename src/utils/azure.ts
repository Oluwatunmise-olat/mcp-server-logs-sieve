import type { LogsTable } from "@azure/monitor-query-logs";

import { LogEntry } from "../providers/types.js";

export function toLogEntry(
  row: LogsTable["rows"][number],
  table: LogsTable,
): LogEntry {
  const column = (...names: string[]) =>
    table.columnDescriptors.findIndex((c) => names.includes(c.name));

  const timeIdx = column("TimeGenerated");
  const severityIdx = column("SeverityLevel", "Level");
  const messageIdx = column("Message", "OperationName");
  const idIdx = column("OperationId", "operation_Id", "operationId", "_ItemId");

  return {
    timestamp: timeIdx !== -1 ? String(row[timeIdx] ?? "") : "",
    severity: severityIdx !== -1 ? String(row[severityIdx] ?? "INFO") : "INFO",
    message: messageIdx !== -1 ? String(row[messageIdx] ?? "") : "",
    resource_type: table.name,
    trace_id: idIdx !== -1 ? String(row[idIdx] ?? "") : "",
  };
}

export function buildAzureQuery(params: {
  log_name?: string;
  severity?: string;
  text_filter?: string;
  limit?: number;
}) {
  const table = sanitizeTableName(params.log_name || "AppTraces");

  const parts = [table];

  if (params.severity) {
    const level = severityToLevel(params.severity);
    parts.push(
      `| where toint(column_ifexists("SeverityLevel", column_ifexists("Level", 1))) >= ${level}`,
    );
  }

  if (params.text_filter) {
    parts.push(
      `| where tostring(column_ifexists("Message", column_ifexists("OperationName", ""))) contains '${escapeSingleQuotedKqlStringLiteral(params.text_filter)}'`,
    );
  }

  parts.push("| order by TimeGenerated desc");
  parts.push(`| take ${Math.max(1, Math.floor(params.limit || 50))}`);

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

export function escapeSingleQuotedKqlStringLiteral(value: string) {
  return value.replace(/'/g, "''");
}

export function sanitizeTableName(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(
      `Invalid Azure table name "${value}". Use a valid KQL identifier.`,
    );
  }

  return value;
}

function severityToLevel(severity: string) {
  const map: Record<string, number> = {
    DEBUG: 0,
    INFO: 1,
    NOTICE: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4,
    ALERT: 4,
    EMERGENCY: 4,
  };

  return map[severity.toUpperCase()] ?? 1;
}
