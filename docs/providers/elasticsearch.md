# Elasticsearch Provider

Use provider `elasticsearch` to query Elasticsearch logs.

## Scope value

For all tools, `scope` is your Elasticsearch base URL.

Example:

```text
scope: "http://localhost:9200"
```

## Auth

Choose one:

- `ELASTICSEARCH_API_KEY`
- `ELASTICSEARCH_USERNAME` and `ELASTICSEARCH_PASSWORD`

If API key is set, it is used first.

Current terminal only:

```bash
export ELASTICSEARCH_API_KEY="your-api-key"
```

Or:

```bash
export ELASTICSEARCH_USERNAME="your-username"
export ELASTICSEARCH_PASSWORD="your-password"
```

Persist across terminal sessions:

```bash
cat >> ~/.bashrc <<'EOF'
export ELASTICSEARCH_API_KEY="your-api-key"
EOF
source ~/.bashrc
```

Use your shell profile file (`~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`) based on your shell.

## Compatibility control

Set `ELASTICSEARCH_COMPAT_VERSION` to match your server API compatibility target.

Allowed values:

- `7`
- `8`
- `9`

Default is `8`.

Example:

```bash
export ELASTICSEARCH_COMPAT_VERSION=8
```

You can also persist it in your shell profile if you always target the same cluster version.

## Important behavior

- `resource_type` is treated as index or index pattern when provided.
- `trace_request` currently requires `trace_id`.

## Useful examples

```text
query_logs(scope="http://localhost:9200", resource_type="logs-*", start_time="6h", severity="WARNING", text_filter="payment")
```

```text
trace_request(scope="http://localhost:9200", trace_id="trace-abc", resource_type="logs-*", start_time="6h")
```
