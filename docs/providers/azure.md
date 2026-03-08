# Azure Provider

Use provider `azure` to query Azure Monitor Logs.

## Scope value

For all tools, `scope` is the Log Analytics workspace ID.

Example:

```text
scope: "<workspace-id>"
```

## Auth

Uses `DefaultAzureCredential`.

For local development, sign in with Azure CLI:

```bash
az login
```

Credential location:

- `az login` stores account/session credentials for CLI-based auth.
- You usually do not need to export secrets in each terminal.

For deployed workloads, use managed identity where possible.

If you want to use service principal env vars instead, set:

```bash
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
```

To persist them, add them to your shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`) and reload that file.

## Important behavior

- `log_name` is treated as the Azure table name.
- For tracing, `resource_type` is treated as table name and defaults to `AppRequests`.

## Useful examples

```text
query_logs(scope="<workspace-id>", log_name="AppTraces", start_time="4h", severity="ERROR")
```

```text
trace_request(scope="<workspace-id>", resource_type="AppRequests", trace_id="abc123", start_time="2h")
```
