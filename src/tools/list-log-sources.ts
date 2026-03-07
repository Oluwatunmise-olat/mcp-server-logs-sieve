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
      description: "List available log names and resource types in a project",
      inputSchema: {
        scope: z.string().describe("GCP project ID, AWS region (e.g. us-east-1), or Azure Log Analytics workspace ID"),
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
