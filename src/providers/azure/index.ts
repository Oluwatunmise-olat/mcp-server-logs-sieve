import { LogsQueryClient, LogsTable } from "@azure/monitor-query-logs";
import { DefaultAzureCredential } from "@azure/identity";

import { LogProvider, QueryParams, TraceParams } from "../types.js";
import {
  toLogEntry,
  buildAzureQuery,
  normalizeMessage,
} from "../../utils/azure.js";

export class AzureLogProvider implements LogProvider {
  readonly id = "azure";
  readonly name = "Azure Monitor Logs";

  private readonly client = new LogsQueryClient(new DefaultAzureCredential());

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
      const result = (await this.client.queryWorkspace(
        params.scope,
        query,
        timeRange,
      )) as any;

      if (result.status === "Failed") {
        throw new Error(result.partialError?.message || "query failed");
      }

      const logsTable = result.tables?.[0] as LogsTable | undefined;

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

  async listSources(_scope: string) {
    const commonTables = [
      "AppTraces",
      "AppExceptions",
      "AppRequests",
      "AppDependencies",
      "AppEvents",
      "ContainerLog",
      "AzureActivity",
      "AzureDiagnostics",
    ];

    return commonTables.map((table) => ({
      type: "log_name" as const,
      name: table,
      display_name: table,
    }));
  }

  async traceRequests(params: TraceParams) {
    const table = params.resource_type || "AppRequests";

    let operationIds: string[] = [];

    if (params.trace_id) {
      operationIds = [params.trace_id];
    } else {
      const seed = await this.queryLogs({
        scope: params.scope,
        log_name: table,
        start_time: params.start_time,
        end_time: params.end_time,
        text_filter: params.text_filter,
        limit: params.limit || 50,
      });

      const seen = new Set<string>();

      for (const entry of seed) {
        if (entry.trace_id) seen.add(entry.trace_id);
      }

      operationIds = [...seen];
    }

    if (!operationIds.length) return [];

    operationIds = operationIds.slice(0, 5);

    const results: {
      trace_id: string;
      entries: any[];
      services: string[];
      duration_ms: number;
    }[] = [];

    for (const opId of operationIds) {
      try {
        const query = `${table} | where OperationId == "${opId}" | order by TimeGenerated asc`;

        const timeRange = {
          startTime: params.start_time
            ? new Date(params.start_time)
            : new Date(Date.now() - 3600000),
          endTime: params.end_time ? new Date(params.end_time) : new Date(),
        };

        const result = (await this.client.queryWorkspace(
          params.scope,
          query,
          timeRange,
        )) as any;

        const resultTable = result.tables?.[0] as LogsTable | undefined;

        const logEntries = resultTable
          ? resultTable.rows.map((row) => toLogEntry(row, resultTable))
          : [];

        let durationMs = 0;

        if (logEntries.length > 1) {
          const first = new Date(logEntries[0].timestamp).getTime();
          const last = new Date(
            logEntries[logEntries.length - 1].timestamp,
          ).getTime();
          durationMs = last - first;
        }

        results.push({
          trace_id: opId,
          entries: logEntries,
          services: [table],
          duration_ms: durationMs,
        });
      } catch {
        continue;
      }
    }

    return results;
  }
}
