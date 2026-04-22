import "reflect-metadata";
import { createServer, IncomingMessage } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createProvider } from "./providers/index.js";
import { Credentials } from "./providers/types.js";
import { registerQueryLogs } from "./tools/query-logs.js";
import { registerSummarizeLogs } from "./tools/summarize-logs.js";
import { registerListLogSources } from "./tools/list-log-sources.js";
import { registerTraceRequest } from "./tools/trace-request.js";

function credentialsFromHeaders(req: IncomingMessage): Credentials {
  const headers = req.headers;

  return {
    googleApplicationCredentials: headers[
      "googleapplicationcredentials"
    ] as string,
    awsAccessKeyId: headers["awsaccesskeyid"] as string,
    awsSecretAccessKey: headers["awssecretaccesskey"] as string,
    awsSessionToken: headers["awssessiontoken"] as string,
    azureClientId: headers["azureclientid"] as string,
    azureClientSecret: headers["azureclientsecret"] as string,
    azureTenantId: headers["azuretenantid"] as string,
    lokiBearerToken: headers["lokibearertoken"] as string,
    lokiUsername: headers["lokiusername"] as string,
    lokiPassword: headers["lokipassword"] as string,
    elasticsearchApiKey: headers["elasticsearchapikey"] as string,
    elasticsearchUsername: headers["elasticsearchusername"] as string,
    elasticsearchPassword: headers["elasticsearchpassword"] as string,
    elasticsearchCompatVersion: headers["elasticsearchcompatversion"] as string,
  };
}

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);

  if (url.pathname !== "/mcp") {
    res.writeHead(404).end();
    return;
  }

  const providerName = url.searchParams.get("provider") ?? process.env.PROVIDER;

  const creds = credentialsFromHeaders(req);

  const errorProviderRequired = () => {
    throw new Error(
      "provider is required. Pass ?provider=gcp|aws|azure|loki|elasticsearch",
    );
  };

  const provider = providerName
    ? createProvider(providerName, creds)
    : {
        id: "none",
        name: "none",
        queryLogs: errorProviderRequired,
        summarizeLogs: errorProviderRequired,
        listSources: errorProviderRequired,
        traceRequests: errorProviderRequired,
      };

  const server = new McpServer({
    name: "mcp-server-logs-sieve",
    version: "1.0.0",
  });

  registerQueryLogs(server, provider);
  registerSummarizeLogs(server, provider);
  registerListLogSources(server, provider);
  registerTraceRequest(server, provider);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  let parsedBody: unknown;

  if (req.method === "POST") {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      parsedBody = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON body" }));
      return;
    }
  }

  await transport.handleRequest(req, res, parsedBody);
});

httpServer.listen(PORT, () => {
  console.log(`Listening on :${PORT}`);
});
