# Loki Provider

Use provider `loki` to query Grafana Loki via HTTP API.

## Scope value

For all tools, `scope` is your Loki base URL.

Example:

```text
scope: "http://localhost:3100"
```

## Auth

You can use either:

- `LOKI_BEARER_TOKEN`
- `LOKI_USERNAME` and `LOKI_PASSWORD`

If both are set, bearer token takes precedence.

Set one of these before starting your MCP client.

Bearer token:

```bash
export LOKI_BEARER_TOKEN="your-token"
```

Basic auth:

```bash
export LOKI_USERNAME="your-username"
export LOKI_PASSWORD="your-password"
```

Persist across terminal sessions:

```bash
cat >> ~/.bashrc <<'EOF'
export LOKI_BEARER_TOKEN="your-token"
EOF
source ~/.bashrc
```

Use your shell profile file (`~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`) based on your shell.

Use the basic auth vars instead if that is what your Loki deployment expects.

## Important behavior

- `log_name` is used as label selector input.
- `resource_type` can be used as a selector hint depending on query.

## Useful examples

```text
query_logs(scope="http://localhost:3100", log_name="{job=\"payments\"}", start_time="1h", text_filter="failed")
```

```text
summarize_logs(scope="http://localhost:3100", start_time="6h", severity="ERROR")
```
