import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  FilterLogEventsCommandInput,
  DescribeLogGroupsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

import {
  Credentials,
  LogProvider,
  QueryParams,
  TraceParams,
  TraceResult,
} from "../types.js";
import { toLogEntry, normalizeMessageKey } from "../../utils/aws.js";

export class AwsLogProvider implements LogProvider {
  readonly id = "aws";
  readonly name = "AWS CloudWatch Logs";

  private readonly clientCache = new Map<string, CloudWatchLogsClient>();
  private readonly creds?: Credentials;

  constructor(creds?: Credentials) {
    this.creds = creds;
  }

  async queryLogs(params: QueryParams) {
    const client = this.getClientForRegion(params.scope);

    if (!params.log_name) {
      throw new Error("log_name (log group name) is required for AWS");
    }

    const input: FilterLogEventsCommandInput = {
      logGroupName: params.log_name,
      limit: params.limit || 50,
    };

    if (params.start_time) {
      input.startTime = new Date(params.start_time).getTime();
    }

    if (params.end_time) {
      input.endTime = new Date(params.end_time).getTime();
    }

    if (params.text_filter) {
      input.filterPattern = params.text_filter;
    }

    try {
      const res = await client.send(new FilterLogEventsCommand(input));

      const events = res.events || [];

      return events.map((e) => toLogEntry(e, params.log_name!));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`AWS queryLogs failed: ${message}`);
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

      const key = normalizeMessageKey(entry.message);

      const hit = patterns.get(key);

      if (hit) hit.count++;
      else patterns.set(key, { count: 1, sample: entry.message });
    }

    const topPatterns = [...patterns.entries()]
      .map(([pattern, v]) => ({ pattern, count: v.count, sample: v.sample }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const timestamps = entries
      .map((e) => e.timestamp)
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

  async listSources(projectId: string) {
    const client = this.getClientForRegion(projectId || undefined);

    try {
      const res = await client.send(
        new DescribeLogGroupsCommand({ limit: 50 }),
      );

      const groups = res.logGroups || [];

      return groups.map((g) => ({
        type: "log_name" as const,
        name: g.logGroupName || "",
        display_name: g.logGroupName,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`AWS listSources failed: ${message}`);
    }
  }

  async traceRequests(params: TraceParams) {
    const client = this.getClientForRegion(params.scope);

    const logGroupName = params.resource_type;

    if (!logGroupName) {
      throw new Error(
        "resource_type (log group name) is required for AWS tracing",
      );
    }

    let traceIds: string[] = [];

    if (params.trace_id) {
      traceIds = [params.trace_id];
    } else {
      const seed = await this.queryLogs({
        scope: params.scope,
        log_name: logGroupName,
        start_time: params.start_time,
        end_time: params.end_time,
        text_filter: params.text_filter,
        limit: params.limit || 50,
      });

      const seen = new Set<string>();

      for (const entry of seed) {
        const match = entry.message.match(/Root=([^\s;,]+)/);
        if (match) seen.add(match[1]);
      }

      traceIds = [...seen];
    }

    if (!traceIds.length) return [];

    traceIds = traceIds.slice(0, 5);

    const results: TraceResult[] = [];

    for (const traceId of traceIds) {
      try {
        const input: FilterLogEventsCommandInput = {
          logGroupName,
          filterPattern: traceId,
          limit: 200,
        };

        if (params.start_time)
          input.startTime = new Date(params.start_time).getTime();

        if (params.end_time)
          input.endTime = new Date(params.end_time).getTime();

        const res = await client.send(new FilterLogEventsCommand(input));

        const logEntries = (res.events || []).map((e) =>
          toLogEntry(e, logGroupName),
        );

        let durationMs = 0;

        if (logEntries.length > 1) {
          const first = new Date(logEntries[0].timestamp).getTime();
          const last = new Date(
            logEntries[logEntries.length - 1].timestamp,
          ).getTime();
          durationMs = last - first;
        }

        results.push({
          trace_id: traceId,
          entries: logEntries,
          services: [logGroupName],
          duration_ms: durationMs,
        });
      } catch {
        continue;
      }
    }

    return results;
  }

  private getClientForRegion(region?: string) {
    const key = region || "default";

    if (!this.clientCache.has(key)) {
      const { awsAccessKeyId, awsSecretAccessKey, awsSessionToken } = this.creds ?? {};
      this.clientCache.set(key, new CloudWatchLogsClient({
        ...(region ? { region } : {}),
        ...(awsAccessKeyId && awsSecretAccessKey ? {
          credentials: {
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
            sessionToken: awsSessionToken,
          },
        } : {}),
      }));
    }

    return this.clientCache.get(key)!;
  }
}
