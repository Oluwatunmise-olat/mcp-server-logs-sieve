import "reflect-metadata";

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
  console.error("--provider is required.");
  process.exit(1);
}

const projectId = args.project;

if (!projectId) {
  console.error("--project is required.");
  process.exit(1);
}

const provider = createProvider(args.provider);

const params = {
  project_id: projectId,
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

  console.log(formatEntries(entries));
} else if (subcommand === "summarize") {
  const summary = await provider.summarizeLogs(params);

  console.log(formatSummary(summary));
} else if (subcommand === "trace") {
  const traces = await provider.traceRequests({
    project_id: projectId,
    trace_id: args.trace,
    start_time: args.last ? parseRelativeTime(args.last) : undefined,
    end_time: args.end ? parseRelativeTime(args.end) : undefined,
    text_filter: args.filter,
    severity: args.severity,
    resource_type: args.resource_type,
    limit: args.limit ? parseInt(args.limit, 10) : undefined,
  });

  console.log(formatTrace(traces));
} else if (subcommand === "sources") {
  const sources = await provider.listSources(projectId);

  const text = sources.length
    ? sources.map((s) => `[${s.type}] ${s.name}`).join("\n")
    : "No log sources found.";

  console.log(text);
} else {
  console.error(`Unknown command: ${subcommand}`);

  console.error(
    "Usage: mcp-server-logs-sieve <query|summarize|trace|sources> --provider <provider> --project <id> [options]",
  );

  process.exit(1);
}
