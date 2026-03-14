import "reflect-metadata";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createProvider } from "./providers/index.js";
import { registerQueryLogs } from "./tools/query-logs.js";
import { registerSummarizeLogs } from "./tools/summarize-logs.js";
import { registerListLogSources } from "./tools/list-log-sources.js";
import { registerTraceRequest } from "./tools/trace-request.js";

const providerIdx = process.argv.indexOf("--provider");

const providerName =
  providerIdx !== -1 ? process.argv[providerIdx + 1] : process.env.PROVIDER;

const server = new McpServer({
  name: "mcp-server-logs-sieve",
  version: "1.0.0",
});

if (providerName) {
  const provider = createProvider(providerName);

  registerQueryLogs(server, provider);
  registerSummarizeLogs(server, provider);
  registerListLogSources(server, provider);
  registerTraceRequest(server, provider);
} else {
  console.error("--provider is required. Supported: gcp, aws, azure, loki, elasticsearch");
}

const transport = new StdioServerTransport();

await server.connect(transport);
