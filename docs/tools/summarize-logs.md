# summarize_logs

Summarize logs into counts and repeated patterns so you can see what is failing quickly.

## Input

- `scope` (required): provider-specific scope value
- `severity` (optional)
- `start_time` (optional): ISO timestamp or relative value (default `6h`)
- `end_time` (optional)
- `text_filter` (optional)
- `resource_type` (optional)
- `log_name` (optional)
- `limit` (optional): `1..1000` (default `200`)

## Example

```text
summarize_logs(
  scope="my-gcp-project",
  start_time="24h",
  severity="WARNING",
  text_filter="payment"
)
```

## Response shape

- `total_entries`
- `severity_counts`
- `top_patterns`
- `time_range`
- `resource_type_counts` (provider dependent)
