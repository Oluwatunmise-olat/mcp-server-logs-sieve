import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  FilterLogEventsCommandInput,
} from "@aws-sdk/client-cloudwatch-logs";

import {
  LogProvider,
  LogEntry,
  QueryParams,
  LogSummary,
  LogSource,
  TraceParams,
  TraceResult,
} from "../types.js";
import { toLogEntry } from "../../utils/aws.js";

export class AwsLogProvider implements LogProvider {
  readonly id = "aws";
  readonly name = "AWS CloudWatch Logs";

  private readonly clientCache = new Map<string, CloudWatchLogsClient>();

  async queryLogs(params: QueryParams): Promise<LogEntry[]> {
    const client = this.getClientForRegion(params.project_id);

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

  async summarizeLogs(_params: QueryParams): Promise<LogSummary> {
    throw new Error("");
  }

  async listSources(_projectId: string): Promise<LogSource[]> {
    throw new Error("");
  }

  async traceRequests(_params: TraceParams): Promise<TraceResult[]> {
    throw new Error("");
  }

  private getClientForRegion(region?: string): CloudWatchLogsClient {
    const key = region || "default";

    if (!this.clientCache.has(key)) {
      const config = region ? { region } : {};

      this.clientCache.set(key, new CloudWatchLogsClient(config));
    }

    return this.clientCache.get(key)!;
  }
}
