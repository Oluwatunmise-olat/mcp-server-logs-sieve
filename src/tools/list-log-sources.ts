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
        project_id: z.string().describe("Cloud project ID"),
      },
    },
    async (params) => {
      const sources = await provider.listSources(params.project_id);

      const text = sources.length
        ? sources.map((s) => `[${s.type}] ${s.name}`).join("\n")
        : "No log sources found.";

      return { content: [{ type: "text", text }] };
    },
  );
}
