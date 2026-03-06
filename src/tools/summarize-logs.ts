import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { LogProvider } from "../providers/types.js";
import { parseRelativeTime, formatSummary } from "../utils/formatting.js";

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
        project_id: z.string().describe("Cloud project ID"),
        severity: z.enum(["DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY"]).optional().describe("Minimum severity"),
        start_time: z
          .string()
          .optional()
          .describe("Start time - ISO 8601 or relative"),
        end_time: z.string().optional().describe("End time - ISO 8601"),
        text_filter: z.string().optional().describe("Text to search for"),
        resource_type: z.string().optional().describe("Resource type"),
        log_name: z.string().optional().describe("Specific log name"),
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
        start_time: params.start_time
          ? parseRelativeTime(params.start_time)
          : undefined,
        end_time: params.end_time
          ? parseRelativeTime(params.end_time)
          : undefined,
      });

      return {
        content: [
          { type: "text", text: formatSummary(summary) },
          { type: "text", text: JSON.stringify(summary) },
        ],
      };
    },
  );
}
