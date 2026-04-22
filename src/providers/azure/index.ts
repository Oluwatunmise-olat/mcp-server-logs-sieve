import {
  LogsQueryClient,
  LogsQueryResultStatus,
  LogsTable,
} from "@azure/monitor-query-logs";
import { ClientSecretCredential, DefaultAzureCredential } from "@azure/identity";

import {
  Credentials,
  LogProvider,
  QueryParams,
  TraceParams,
  TraceResult,
} from "../types.js";
import {
  toLogEntry,
  buildAzureQuery,
  normalizeMessage,
  escapeSingleQuotedKqlStringLiteral,
  sanitizeTableName,
} from "../../utils/azure.js";

export class AzureLogProvider implements LogProvider {
  readonly id = "azure";
  readonly name = "Azure Monitor Logs";

  private readonly client: LogsQueryClient;

  constructor(creds?: Credentials) {
    const credential =
      creds?.azureClientId && creds?.azureClientSecret && creds?.azureTenantId
        ? new ClientSecretCredential(creds.azureTenantId, creds.azureClientId, creds.azureClientSecret)
        : new DefaultAzureCredential();
    this.client = new LogsQueryClient(credential);
  }

  async queryLogs(params: QueryParams) {
    const query = buildAzureQuery({
      log_name: params.log_name,
      severity: params.severity,
      text_filter: params.text_filter,
      limit: params.limit,
    });

    const timeRange = {
      startTime: params.start_time
        ? new Date(params.start_time)
        : new Date(Date.now() - 3600000),
      endTime: params.end_time ? new Date(params.end_time) : new Date(),
    };

    try {
      const result = await this.client.queryWorkspace(
        params.scope,
        query,
        timeRange,
      );

      if (
        result.status !== LogsQueryResultStatus.Success &&
        result.status !== LogsQueryResultStatus.PartialFailure
      ) {
        throw new Error("query failed");
      }

      const tables =
        result.status === LogsQueryResultStatus.PartialFailure
          ? result.partialTables
          : result.tables;

      const logsTable = tables?.[0] as LogsTable | undefined;

      if (!logsTable) return [];

      const data = logsTable.rows.map((row) => toLogEntry(row, logsTable));

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Azure queryLogs failed: ${message}`);
    }
  }

  async summarizeLogs(params: QueryParams) {
    const entries = await this.queryLogs({
      ...params,
      limit: params.limit || 200,
    });

    const severityCounts: Record<string, number> = {};

    const patterns = new Map<string, { count: number; sample: string }>();

    for (const entry of entries) {
      severityCounts[entry.severity] =
        (severityCounts[entry.severity] || 0) + 1;

      const key = normalizeMessage(entry.message);

      const hit = patterns.get(key);

      if (hit) hit.count++;
      else patterns.set(key, { count: 1, sample: entry.message });
    }

    const topPatterns = [...patterns.entries()]
      .map(([pattern, v]) => ({ pattern, count: v.count, sample: v.sample }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const timestamps = entries
      .map((entry) => entry.timestamp)
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
    };
  }

  async listSources(scope: string) {
    const query = `union withsource=TableName *
      | where TimeGenerated > ago(7d)
      | summarize count() by TableName
      | order by count_ desc`;

    const timeRange = {
      startTime: new Date(Date.now() - 7 * 24 * 3600000),
      endTime: new Date(),
    };

    try {
      const result = await this.client.queryWorkspace(
        scope,
        query,
        timeRange,
      );

      if (
        result.status !== LogsQueryResultStatus.Success &&
        result.status !== LogsQueryResultStatus.PartialFailure
      ) {
        throw new Error("query failed");
      }

      const tables =
        result.status === LogsQueryResultStatus.PartialFailure
          ? result.partialTables
          : result.tables;

      const logsTable = tables?.[0] as LogsTable | undefined;

      if (!logsTable) return [];

      return logsTable.rows.map((row) => {
        const name = String(row[0] ?? "");

        return {
          type: "log_name" as const,
          name,
          display_name: name,
        };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Azure listSources failed: ${message}`);
    }
  }

  async traceRequests(params: TraceParams) {
    const table = sanitizeTableName(params.resource_type || "AppRequests");

    let operationIds: string[] = [];

    if (params.trace_id) {
      operationIds = [params.trace_id];
    } else {
      const seedEntries = await this.queryLogs({
        scope: params.scope,
        log_name: table,
        start_time: params.start_time,
        end_time: params.end_time,
        text_filter: params.text_filter,
        severity: params.severity,
        limit: params.limit || 50,
      });

      const uniqueOperationIds = new Set<string>();

      for (const entry of seedEntries) {
        if (entry.trace_id) uniqueOperationIds.add(entry.trace_id);
      }

      operationIds = [...uniqueOperationIds];
    }

    if (!operationIds.length) return [];

    operationIds = operationIds.slice(0, 5);

    const traceResults: TraceResult[] = [];

    for (const operationId of operationIds) {
      try {
        const query = `${table} | where OperationId == '${escapeSingleQuotedKqlStringLiteral(operationId)}' | order by TimeGenerated asc`;

        const timeRange = {
          startTime: params.start_time
            ? new Date(params.start_time)
            : new Date(Date.now() - 3600000),
          endTime: params.end_time ? new Date(params.end_time) : new Date(),
        };

        const result = await this.client.queryWorkspace(
          params.scope,
          query,
          timeRange,
        );

        if (
          result.status !== LogsQueryResultStatus.Success &&
          result.status !== LogsQueryResultStatus.PartialFailure
        ) {
          continue;
        }

        const tables =
          result.status === LogsQueryResultStatus.PartialFailure
            ? result.partialTables
            : result.tables;

        const resultTable = tables?.[0] as LogsTable | undefined;

        const logEntries = resultTable
          ? resultTable.rows.map((row) => toLogEntry(row, resultTable))
          : [];

        let durationMs = 0;

        if (logEntries.length > 1) {
          const firstEntry = new Date(logEntries[0].timestamp).getTime();
          const lastEntry = new Date(
            logEntries[logEntries.length - 1].timestamp,
          ).getTime();
          durationMs = lastEntry - firstEntry;
        }

        traceResults.push({
          trace_id: operationId,
          entries: logEntries,
          services: [table],
          duration_ms: durationMs,
        });
      } catch {
        continue;
      }
    }

    return traceResults;
  }
}
