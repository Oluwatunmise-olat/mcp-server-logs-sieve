import "reflect-metadata";

import { consola } from "consola";

import { createProvider } from "./providers/index.js";
import { parseRelativeTime } from "./utils/time.js";
import { formatEntries, formatSummary, formatTrace } from "./utils/sanitize.js";

const subcommand = process.argv[2];

const args: Record<string, string> = {};

for (let i = 3; i < process.argv.length; i += 2) {
  const key = process.argv[i];

  const value = process.argv[i + 1];

  if (key?.startsWith("--") && value) {
    args[key.slice(2)] = value;
  }
}

if (!args.provider) {
  consola.error("--provider is required.");
  process.exit(1);
}

const scope = args.scope;

if (!scope) {
  consola.error("--scope is required.");
  process.exit(1);
}

const provider = createProvider(args.provider);

const params = {
  scope,
  severity: args.severity,
  start_time: args.last ? parseRelativeTime(args.last) : undefined,
  end_time: args.end ? parseRelativeTime(args.end) : undefined,
  text_filter: args.filter,
  resource_type: args.resource_type,
  log_name: args.log_name,
  limit: args.limit ? parseInt(args.limit, 10) : undefined,
};

if (subcommand === "query") {
  const entries = await provider.queryLogs(params);

  consola.log(formatEntries(entries));
} else if (subcommand === "summarize") {
  const summary = await provider.summarizeLogs(params);

  consola.log(formatSummary(summary));
} else if (subcommand === "trace") {
  const traces = await provider.traceRequests({
    scope,
    trace_id: args.trace,
    start_time: args.last ? parseRelativeTime(args.last) : undefined,
    end_time: args.end ? parseRelativeTime(args.end) : undefined,
    text_filter: args.filter,
    severity: args.severity,
    resource_type: args.resource_type,
    limit: args.limit ? parseInt(args.limit, 10) : undefined,
  });

  consola.log(formatTrace(traces));
} else if (subcommand === "sources") {
  const sources = await provider.listSources(scope);

  const text = sources.length
    ? sources.map((s) => `[${s.type}] ${s.name}`).join("\n")
    : "No log sources found.";

  consola.log(text);
} else {
  consola.error(`Unknown command: ${subcommand}`);

  consola.info(
    "Usage: mcp-server-logs-sieve <query|summarize|trace|sources> --provider <provider> --scope <value> [options]",
  );

  process.exit(1);
}
