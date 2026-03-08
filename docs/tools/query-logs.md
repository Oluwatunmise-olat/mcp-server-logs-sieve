# query_logs

Search raw log entries by time range, severity, text, and source fields.

## Input

- `scope` (required): provider-specific scope value
- `severity` (optional): `DEBUG | INFO | NOTICE | WARNING | ERROR | CRITICAL | ALERT | EMERGENCY`
- `start_time` (optional): ISO timestamp or relative value like `1h`, `30m`, `7d` (default `1h`)
- `end_time` (optional): ISO timestamp or relative value
- `text_filter` (optional): text to search for
- `resource_type` (optional): provider-specific source hint
- `log_name` (optional): provider-specific log name
- `limit` (optional): `1..500` (default `50`)

## Example

```text
query_logs(
  scope="http://localhost:9200",
  resource_type="logs-*",
  start_time="2h",
  severity="ERROR",
  text_filter="payment failed",
  limit=100
)
```

## Response shape

Array of entries with fields like:

- `timestamp`
- `severity`
- `message`
- `resource_type`
- `log_name`
- `trace_id`
