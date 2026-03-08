# mcp-server-logs-sieve

An MCP server that gives your AI coding assistant direct access to your cloud logs. Instead of copy-pasting log snippets into chat, you just ask questions and let the assistant pull what it needs.

Built for debugging workflows. Things like:

- _"show me wallet debit errors for user X in the last 6 hours"_
- _"summarize what's been failing in the payments service today"_
- _"trace the request flow around this failed transaction"_

Currently supports **Google Cloud Logging**, with other cloud platforms in view.

---

## Getting started

**Node.js requirement:**

```bash
nvm use
```

This project targets Node.js 20+.

**Install dependencies and build:**

```bash
npm install
npm run build
```

**Add it to your MCP client config** (e.g. `.mcp.json` in your project root, or `~/.claude/mcp.json` for Claude Code globally):

```json
{
  "mcpServers": {
    "logs-sieve": {
      "command": "npx",
      "args": ["-y", "node@20", "./bin/mcp-server-logs-sieve.js", "--provider", "gcp"]
    }
  }
}
```

Change `gcp` to `aws`, `azure`, `loki`, or `elasticsearch` for other providers.

For Elasticsearch, you can explicitly set API compatibility header version:

```bash
export ELASTICSEARCH_COMPAT_VERSION=8
```

Allowed values: `7`, `8`, `9` (default: `8`).

Once connected, your assistant can call the tools directly without any extra setup on your end.

---

## Authentication

For GCP, the server uses [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials). Run this once if you haven't already:

```bash
gcloud auth application-default login
```

If you're running inside GCP (Cloud Run, GCE, etc.), credentials are picked up automatically from the metadata server.

---

## Tools

All tools accept a `project_id` to target a specific GCP project. Time filters accept ISO 8601 timestamps or relative shorthands like `1h`, `30m`, `7d`.

| Tool               | What it does                                                                      |
| ------------------ | --------------------------------------------------------------------------------- |
| `query_logs`       | Search and filter log entries by severity, time, text, resource type, or log name |
| `summarize_logs`   | Aggregate counts by severity and surface the top recurring patterns               |
| `list_log_sources` | Discover what log names and resource types exist in a project                     |
| `trace_request`    | Pull all logs for one or more traces, grouped and ordered by time                 |

Sensitive values (tokens, connection strings, emails, IPs, card numbers, etc.) are automatically redacted before results are returned to the model.

---

## CLI

The same binary works as a command-line tool if you want to query logs outside of an AI session:

```bash
# Search logs
node bin/mcp-server-logs-sieve.js query \
  --provider gcp \
  --project my-project-id \
  --log_name payments \
  --filter "xyz.failed" \
  --last 2h

# Summarize
node bin/mcp-server-logs-sieve.js summarize \
  --provider gcp \
  --project my-project-id \
  --last 24h

# Trace a request
node bin/mcp-server-logs-sieve.js trace \
  --provider gcp \
  --project my-project-id \
  --trace <trace-id>

# List available log sources
node bin/mcp-server-logs-sieve.js sources \
  --provider gcp \
  --project my-project-id
```

---

## Example walkthrough

This shows the full flow using a demo e-commerce order service with seeded bugs — duplicate charges, missing shipments, and price mismatches.

**1. Add the config to your project**

Drop a `.mcp.json` at your project root pointing at the server. If it's published to npm, `npx` is all you need:

![MCP config](docs/images/gcp-order-flow-demo-config.png)

**2. Start Claude Code — it picks up the MCP server automatically**

On first launch you'll see a prompt confirming that MCP servers are connected and may execute tools on your behalf:

![Claude Code launch with MCP](docs/images/step-1.png)

**3. Confirm the server is connected with `/mcp`**

Running `/mcp` lists all active servers. You should see `logs-sieve` with its tools ready:

![MCP server list](docs/images/step-2.png)

**4. Ask your debugging question in plain English**

No special syntax — just describe what you're investigating:

![Debug prompt](docs/images/step-3.png)

**5. Claude asks permission before calling the tool**

You stay in control. Approve once and it queries your logs:

![Tool permission prompt](docs/images/step-4.png)

**6. Results come back structured and ready to act on**

The assistant surfaces the exact issues — which users were affected, what went wrong, and when:

![Debug results](docs/images/step-5.png)

---

## Feedback

- Bug reports and feature requests: [GitHub Issues](https://github.com/Oluwatunmise-olat/mcp-server-logs-sieve/issues)
- Questions and ideas: [GitHub Discussions](https://github.com/Oluwatunmise-olat/mcp-server-logs-sieve/discussions)
