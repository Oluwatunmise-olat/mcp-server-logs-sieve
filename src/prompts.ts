import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "debug_errors",
    {
      description: "Show recent errors from a log scope",
      argsSchema: {
        scope: z.string().describe("GCP project ID, AWS region, Azure workspace ID, Loki URL, or Elasticsearch URL"),
        window: z.string().optional().describe("Time window e.g. 1h, 30m, 24h — defaults to 1h"),
      },
    },
    ({ scope, window = "1h" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Query the logs for "${scope}" over the last ${window}. Show all ERROR and CRITICAL entries, group recurring patterns, and highlight anything that looks like a root cause.`,
        },
      }],
    }),
  );

  server.registerPrompt(
    "summarize_recent",
    {
      description: "Summarize logs for a scope over a time window",
      argsSchema: {
        scope: z.string().describe("GCP project ID, AWS region, Azure workspace ID, Loki URL, or Elasticsearch URL"),
        window: z.string().optional().describe("Time window e.g. 1h, 6h, 24h — defaults to 6h"),
      },
    },
    ({ scope, window = "6h" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Summarize the logs for "${scope}" over the last ${window}. Break down severity counts, surface the top recurring error patterns, and flag anything unusual.`,
        },
      }],
    }),
  );

  server.registerPrompt(
    "trace_request",
    {
      description: "Trace a request's journey across services",
      argsSchema: {
        scope: z.string().describe("GCP project ID, AWS region, Azure workspace ID, Loki URL, or Elasticsearch URL"),
        trace_id: z.string().optional().describe("Trace ID to look up directly"),
        filter: z.string().optional().describe("Text to find the request — e.g. user ID, endpoint, or error message"),
      },
    },
    ({ scope, trace_id, filter }) => {
      const target = trace_id ? `trace ID "${trace_id}"` : filter ? `"${filter}"` : "recent requests";
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Trace ${target} in "${scope}". Show the full journey across services, where time was spent, and flag any errors along the way.`,
          },
        }],
      };
    },
  );
}
