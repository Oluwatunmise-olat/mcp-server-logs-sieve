import "reflect-metadata";
import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createProvider } from "./providers/index.js";
import { registerQueryLogs } from "./tools/query-logs.js";
import { registerSummarizeLogs } from "./tools/summarize-logs.js";
import { registerListLogSources } from "./tools/list-log-sources.js";
import { registerTraceRequest } from "./tools/trace-request.js";

const providerName = process.env.PROVIDER;

if (!providerName) {
  console.error(
    "PROVIDER env var is required. Supported: gcp, aws, azure, loki, elasticsearch",
  );
  process.exit(1);
}

const provider = createProvider(providerName);

const mcpServer = new McpServer({
  name: "mcp-server-logs-sieve",
  version: "1.0.0",
});

registerQueryLogs(mcpServer, provider);
registerSummarizeLogs(mcpServer, provider);
registerListLogSources(mcpServer, provider);
registerTraceRequest(mcpServer, provider);

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

await mcpServer.connect(transport);

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const httpServer = createServer(async (req, res) => {
  if (req.url === "/mcp" || req.url?.startsWith("/mcp?")) {
    let parsedBody: unknown;

    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf-8");
      try {
        parsedBody = JSON.parse(raw);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
    }

    await transport.handleRequest(req, res, parsedBody);
    return;
  }

  res.writeHead(404).end();
});

httpServer.listen(PORT, () => {
  console.log(`Listening on :${PORT}`);
});
