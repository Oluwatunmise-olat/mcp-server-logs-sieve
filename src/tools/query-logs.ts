import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { LogProvider } from "../providers/types.js";
import { parseRelativeTime } from "../utils/time.js";
import { sanitizeEntries } from "../utils/sanitize.js";

export function registerQueryLogs(server: McpServer, provider: LogProvider) {
  server.registerTool(
    "query_logs",
    {
      description:
        "Search and filter log entries by severity, time range, text patterns, and resource type",
      annotations: { readOnlyHint: true },
      inputSchema: {
        scope: z
          .string()
          .describe(
            "GCP project ID, AWS region (e.g. us-east-1), Azure Log Analytics workspace ID, Loki base URL or Elasticsearch base URL",
          ),
        severity: z
          .enum([
            "DEBUG",
            "INFO",
            "NOTICE",
            "WARNING",
            "ERROR",
            "CRITICAL",
            "ALERT",
            "EMERGENCY",
          ])
          .optional()
          .describe("Minimum severity"),
        start_time: z
          .string()
          .optional()
          .describe(
            "Start time - ISO 8601 or relative like 1h, 30m, 7d (defaults to 1h)",
          ),
        end_time: z
          .string()
          .optional()
          .describe("End time - ISO 8601, defaults to now"),
        text_filter: z
          .string()
          .optional()
          .describe("Text to search for in log messages"),
        resource_type: z
          .string()
          .optional()
          .describe(
            "GCP resource type, AWS log group name for traces, Azure table hint, Loki label matcher (e.g. app=payments), or Elasticsearch index/index-pattern",
          ),
        log_name: z
          .string()
          .optional()
          .describe(
            "GCP log name, AWS log group name (required for AWS), Azure table name, Loki job/raw selector, or Elasticsearch logger/log_name field value",
          ),
        limit: z
          .number()
          .min(1)
          .max(500)
          .optional()
          .describe("Max entries to return (default 50, max 500)"),
      },
    },
    async (params) => {
      const entries = await provider.queryLogs({
        ...params,
        start_time: parseRelativeTime(params.start_time || "1h"),
        end_time: params.end_time
          ? parseRelativeTime(params.end_time)
          : undefined,
      });

      return {
        content: [
          { type: "text", text: JSON.stringify(sanitizeEntries(entries)) },
        ],
      };
    },
  );
}
