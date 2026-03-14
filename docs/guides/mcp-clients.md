# MCP Client Setup

`mcp-server-logs-sieve` works with any MCP-compatible client. Each client has its own config file location.

> **First-time install:** `npx` downloads the package on first run (~40s). Run the command below once in your terminal before configuring any client, so the cache is primed and the client doesn't time out:
>
> ```bash
> npx mcp-server-logs-sieve@latest --provider gcp
> # Ctrl+C once it starts — you just need the install to finish
> ```

---

## Claude Code

Uses `.mcp.json` in your project root.

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

Restart Claude Code after editing. Confirm with `/mcp`.

---

## Claude Desktop

Config file location:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop after saving.

---

## Cursor

Uses `.cursor/mcp.json` in your project root (project-scoped) or `~/.cursor/mcp.json` (global).

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

Reload the MCP server from Cursor's MCP settings panel after saving.

---

## Windsurf

Config file location: `~/.codeium/windsurf/mcp_config.json`

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

Restart Windsurf after saving.

---

## Passing environment variables

Some providers require env vars (API keys, compat version flags). Use the `env` field in the server config — it is supported by Claude Code, Claude Desktop, Cursor, and Windsurf:

```json
{
  "mcpServers": {
    "logs-sieve": {
      "command": "npx",
      "args": ["-y", "mcp-server-logs-sieve@latest", "--provider", "elasticsearch"],
      "env": {
        "ELASTICSEARCH_API_KEY": "your-api-key",
        "ELASTICSEARCH_COMPAT_VERSION": "8"
      }
    }
  }
}
```

If your client does not support `env` in the config, set variables in your shell profile (`~/.zshrc`, `~/.bashrc`) instead and restart the client.

---

## Swapping providers

Change the `--provider` arg and update any required env vars:

| Provider      | arg             | Required env / scope value                        |
|---------------|-----------------|---------------------------------------------------|
| GCP           | `gcp`           | Scope: GCP project ID. Auth via ADC or `GOOGLE_APPLICATION_CREDENTIALS` |
| AWS           | `aws`           | Scope: AWS region. Auth via AWS credentials chain |
| Azure         | `azure`         | Scope: Log Analytics workspace ID. Auth via `AZURE_*` env vars |
| Loki          | `loki`          | Scope: Loki base URL                              |
| Elasticsearch | `elasticsearch` | Scope: Elasticsearch base URL. Optional: `ELASTICSEARCH_COMPAT_VERSION` |

See [Provider docs](../providers/) for full auth details per provider.
