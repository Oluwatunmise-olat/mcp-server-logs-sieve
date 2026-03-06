import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { LogProvider } from "../providers/types.js";
import { parseRelativeTime, formatTrace } from "../utils/formatting.js";

export function registerTraceRequest(
  server: McpServer,
  provider: LogProvider,
) {
  server.registerTool(
    "trace_request",
    {
      description:
        "Trace a request flow across services. Pass a trace_id directly, or use filters to find matching logs and automatically extract traces from them.",
      inputSchema: {
        project_id: z.string().describe("Cloud project ID"),
        trace_id: z.string().optional().describe("Trace ID if known"),
        start_time: z
          .string()
          .optional()
          .describe("Start time - ISO 8601 or relative like 1h, 30m"),
        end_time: z.string().optional().describe("End time - ISO 8601"),
        text_filter: z
          .string()
          .optional()
          .describe("Text to search for (e.g. user ID, endpoint, error message)"),
        severity: z.enum(["DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY"]).optional().describe("Minimum severity"),
        resource_type: z.string().optional().describe("Resource type"),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .describe("Max seed entries to search for traces (default 50, max 200)"),
      },
    },
    async (params) => {
      const traces = await provider.traceRequests({
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
          { type: "text", text: formatTrace(traces) },
          { type: "text", text: JSON.stringify(traces) },
        ],
      };
    },
  );
}
