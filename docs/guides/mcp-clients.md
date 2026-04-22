# MCP Client Setup

`mcp-server-logs-sieve` works with any MCP-compatible client. Each client has its own config file location.

> **First-time install:** `npx` downloads the package on first run (~40s). Run the command below once in your terminal before configuring any client, so the cache is primed and the client doesn't time out:
>
> ```bash
> npx mcp-server-logs-sieve@latest --provider gcp
> # Ctrl+C once it starts — you just need the install to finish
> ```

---

## <img src="https://github.com/anthropics.png" width="20" style="vertical-align:middle"/> Claude Code

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

## <img src="https://github.com/anthropics.png" width="20" style="vertical-align:middle"/> Claude Desktop

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

## <img src="https://github.com/getcursor.png" width="20" style="vertical-align:middle"/> Cursor

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

## <img src="https://github.com/codeium-ai.png" width="20" style="vertical-align:middle"/> Windsurf

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

---

## Config examples by provider

### GCP

```json
{
  "mcpServers": {
    "logs-sieve": {
      "command": "npx",
      "args": ["-y", "mcp-server-logs-sieve@latest", "--provider", "gcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json"
      }
    }
  }
}
```

> If you're already authenticated via `gcloud auth application-default login`, the `env` field is not needed.

---

### AWS

```json
{
  "mcpServers": {
    "logs-sieve": {
      "command": "npx",
      "args": ["-y", "mcp-server-logs-sieve@latest", "--provider", "aws"],
      "env": {
        "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
        "AWS_SECRET_ACCESS_KEY": "your-secret-key",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

> If you're using an AWS profile or instance role, omit the key env vars — the SDK picks them up automatically.

---

### Azure

```json
{
  "mcpServers": {
    "logs-sieve": {
      "command": "npx",
      "args": ["-y", "mcp-server-logs-sieve@latest", "--provider", "azure"],
      "env": {
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-client-secret",
        "AZURE_TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

---

### Loki

```json
{
  "mcpServers": {
    "logs-sieve": {
      "command": "npx",
      "args": ["-y", "mcp-server-logs-sieve@latest", "--provider", "loki"],
      "env": {
        "LOKI_BEARER_TOKEN": "your-bearer-token"
      }
    }
  }
}
```

> For basic auth instead of a bearer token, use `LOKI_USERNAME` and `LOKI_PASSWORD`.

---

### Elasticsearch

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

> For basic auth instead of an API key, use `ELASTICSEARCH_USERNAME` and `ELASTICSEARCH_PASSWORD`. Set `ELASTICSEARCH_COMPAT_VERSION` to match your cluster version (`7` or `8`).
