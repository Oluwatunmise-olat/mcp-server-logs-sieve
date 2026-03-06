# mcp-server-logs-sieve

MCP server for querying and summarizing Cloud Platform logs from coding assistants (Claude Code, Codex, Gemini, etc.).

This repo is built for debugging workflows, not dashboards. You point your assistant at a project and ask practical questions like:

- "show me wallet debit errors in the last 6 hours"
- "summarize incident patterns for this user"
- "trace request flow around a failed transaction"

## What it exposes

The server registers these MCP tools:

- `query_logs`: filtered log search
- `summarize_logs`: counts + top patterns
- `list_log_sources`: discover log names and resource types
- `trace_request`: pull logs grouped by trace

## Project links

- Issues: [GitHub Issues](https://github.com/Oluwatunmise-olat/mcp-server-logs-sieve/issues)
- Discussions: [GitHub Discussions](https://github.com/Oluwatunmise-olat/mcp-server-logs-sieve/discussions)
