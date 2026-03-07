import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { LogProvider } from "../providers/types.js";
import { parseRelativeTime } from "../utils/time.js";
import { sanitizeTraces } from "../utils/sanitize.js";

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
        scope: z.string().describe("GCP project ID, AWS region (e.g. us-east-1), Azure Log Analytics workspace ID, or Loki base URL"),
        trace_id: z.string().optional().describe("Trace ID if known"),
        start_time: z
          .string()
          .optional()
          .describe("Start time - ISO 8601 or relative like 1h, 30m (defaults to 1h)"),
        end_time: z.string().optional().describe("End time - ISO 8601"),
        text_filter: z
          .string()
          .optional()
          .describe("Text to search for (e.g. user ID, endpoint, error message)"),
        severity: z.enum(["DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY"]).optional().describe("Minimum severity"),
        resource_type: z.string().optional().describe("GCP resource type, AWS log group name (required for AWS), Azure table name, or Loki stream selector hint"),
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
        start_time: parseRelativeTime(params.start_time || "1h"),
        end_time: params.end_time
          ? parseRelativeTime(params.end_time)
          : undefined,
      });

      return {
        content: [
          { type: "text", text: JSON.stringify(sanitizeTraces(traces)) },
        ],
      };
    },
  );
}
