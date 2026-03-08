import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { LogProvider } from "../providers/types.js";

export function registerListLogSources(
  server: McpServer,
  provider: LogProvider,
) {
  server.registerTool(
    "list_log_sources",
    {
      description: "List available log names and resource/source types for the selected scope",
      inputSchema: {
        scope: z
          .string()
          .describe(
            "GCP project ID, AWS region (e.g. us-east-1), Azure Log Analytics workspace ID, Loki base URL or Elasticsearch base URL",
          ),
      },
    },
    async (params) => {
      const sources = await provider.listSources(params.scope);

      const text = sources.length
        ? sources.map((s) => `[${s.type}] ${s.name}`).join("\n")
        : "No log sources found.";

      return { content: [{ type: "text", text }] };
    },
  );
}
