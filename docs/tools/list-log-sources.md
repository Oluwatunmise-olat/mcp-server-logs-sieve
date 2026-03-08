# list_log_sources

List discoverable log sources for a scope.

Use this first when you are not sure what `resource_type` or `log_name` values to pass.

## Input

- `scope` (required)

## Example

```text
list_log_sources(scope="us-east-1")
```

## Response shape

Plain text lines in this format:

```text
[log_name] /aws/lambda/payments
[resource_type] cloud_run_revision
```
