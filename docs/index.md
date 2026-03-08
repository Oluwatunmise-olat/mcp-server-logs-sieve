# Logs Sieve Docs

Logs Sieve is an MCP server that lets AI assistants query and summarize production logs directly from your observability stack.

If you want the fastest path to value, start with:

1. [Getting Started](./getting-started.md)
2. [Tool Reference](./tools/query-logs.md)
3. [Troubleshooting](./troubleshooting.md)

## What it gives you

- One MCP server, multiple log backends.
- A consistent tool surface across providers.
- Built-in sanitization for common sensitive values before responses are returned.

## Supported providers

- [Google Cloud Logging](./providers/gcp.md)
- [AWS CloudWatch Logs](./providers/aws.md)
- [Azure Monitor Logs](./providers/azure.md)
- [Grafana Loki](./providers/loki.md)
- [Elasticsearch](./providers/elasticsearch.md)

## Docs map

- Setup: [Getting Started](./getting-started.md)
- Tool reference: [query_logs](./tools/query-logs.md)
- Tool reference: [summarize_logs](./tools/summarize-logs.md)
- Tool reference: [trace_request](./tools/trace-request.md)
- Tool reference: [list_log_sources](./tools/list-log-sources.md)
- Ops docs: [Environment Variables](./reference/env-vars.md)
- Ops docs: [Compatibility Matrix](./reference/compatibility.md)
- Ops docs: [Troubleshooting](./troubleshooting.md)
- Guide: [Debug Payment Failures](./guides/debug-payment-failures.md)
