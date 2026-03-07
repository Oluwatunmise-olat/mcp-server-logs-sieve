import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { LogProvider } from "../providers/types.js";
import { parseRelativeTime } from "../utils/time.js";
import { sanitizeSummary } from "../utils/sanitize.js";

export function registerSummarizeLogs(
  server: McpServer,
  provider: LogProvider,
) {
  server.registerTool(
    "summarize_logs",
    {
      description:
        "Summarize and aggregate log entries - severity counts, top error patterns, time range",
      inputSchema: {
        scope: z.string().describe("GCP project ID, AWS region (e.g. us-east-1), Azure Log Analytics workspace ID, or Loki base URL"),
        severity: z.enum(["DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY"]).optional().describe("Minimum severity"),
        start_time: z
          .string()
          .optional()
          .describe("Start time - ISO 8601 or relative (defaults to 6h)"),
        end_time: z.string().optional().describe("End time - ISO 8601"),
        text_filter: z.string().optional().describe("Text to search for"),
        resource_type: z.string().optional().describe("GCP resource type, AWS log group name for traces, Azure table hint, or Loki label matcher (e.g. app=payments)"),
        log_name: z.string().optional().describe("GCP log name, AWS log group name (required for AWS), Azure table name, or Loki job/raw selector"),
        limit: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Max entries to analyze (default 200, max 1000)"),
      },
    },
    async (params) => {
      const summary = await provider.summarizeLogs({
        ...params,
        start_time: parseRelativeTime(params.start_time || "6h"),
        end_time: params.end_time
          ? parseRelativeTime(params.end_time)
          : undefined,
      });

      return {
        content: [
          { type: "text", text: JSON.stringify(sanitizeSummary(summary)) },
        ],
      };
    },
  );
}
