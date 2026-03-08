# mcp-server-logs-sieve

`mcp-server-logs-sieve` is an MCP server that lets AI assistants query logs directly from your observability backend.

Ask debugging questions in plain language, and let Logs Sieve pull the exact logs and context for you.

## Why this exists

During incidents, a lot of time goes into repetitive steps:

- finding the right log source
- narrowing the time window
- spotting recurring failure patterns
- following one trace across services

Logs Sieve packages those workflows into four tools: `query_logs`, `summarize_logs`, `trace_request`, and `list_log_sources`.

## Supported providers

- Google Cloud Logging (`gcp`)
- AWS CloudWatch Logs (`aws`)
- Azure Monitor Logs (`azure`)
- Grafana Loki (`loki`)
- Elasticsearch (`elasticsearch`)

Node.js 20+ is required.

## Quick MCP config

Example `.mcp.json`:

```json
{
  "mcpServers": {
    "logs-sieve": {
      "command": "npx",
      "args": ["-y", "mcp-server-logs-sieve@latest", "--provider", "gcp"]
    }
  }
}
```

If you are running from this repo source directly, you can still use `node ./bin/mcp-server-logs-sieve.js --provider gcp`.

After updating config, restart your MCP client and confirm with `/mcp`.

## Provider auth and env vars

See provider-specific setup and auth docs:

- [GCP](docs/providers/gcp.md)
- [AWS](docs/providers/aws.md)
- [Azure](docs/providers/azure.md)
- [Loki](docs/providers/loki.md)
- [Elasticsearch](docs/providers/elasticsearch.md)

For Elasticsearch API compatibility headers:

```bash
export ELASTICSEARCH_COMPAT_VERSION=8
```

## CLI usage

The package also includes a CLI for direct terminal usage:

```bash
mcp-server-logs-sieve query --provider gcp --scope my-project --last 1h --filter "payment failed"
mcp-server-logs-sieve summarize --provider gcp --scope my-project --last 24h
mcp-server-logs-sieve trace --provider gcp --scope my-project --trace <trace-id>
mcp-server-logs-sieve sources --provider gcp --scope my-project
```

## Documentation

- [Docs home](docs/index.md)
- [Getting started](docs/getting-started.md)
- [Tool reference](docs/tools/query-logs.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Compatibility matrix](docs/reference/compatibility.md)

## Contributing

Contributions are welcome.

- Start here: [CONTRIBUTING.md](CONTRIBUTING.md)
- Issues: <https://github.com/Oluwatunmise-olat/mcp-server-logs-sieve/issues>
- Discussions: <https://github.com/Oluwatunmise-olat/mcp-server-logs-sieve/discussions>
