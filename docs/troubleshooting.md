# Troubleshooting

## Tools are not visible in MCP client

Checks:

1. Confirm `.mcp.json` is in the directory where your MCP client starts.
2. Restart the MCP client after changing config.
3. Run `/mcp` and verify `logs-sieve` is listed.
4. Make sure command path in config actually exists.

## Server exits immediately

Most common cause is Node version mismatch.

Check:

```bash
node -v
```

This project requires Node 20+.

## Elasticsearch `compatible-with=9` errors on ES 8

Set:

```bash
export ELASTICSEARCH_COMPAT_VERSION=8
```

Then restart your MCP client so the server process picks up the env var.

## AWS query errors about `log_name`

`query_logs` requires `log_name` for AWS. Pass your log group name.

## AWS tracing errors about `resource_type`

For AWS tracing, `resource_type` should be the CloudWatch log group name.

## Loki auth errors

Use one of:

- `LOKI_BEARER_TOKEN`
- `LOKI_USERNAME` + `LOKI_PASSWORD`

## Azure query returns no tables

Check:

- workspace ID is correct in `scope`
- table name is valid in `log_name`
- time window actually contains data

## GCP permission errors

Make sure the principal used by ADC can read logs in the project.
