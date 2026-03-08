# trace_request

Follow one request through multiple services.

You can pass a `trace_id` directly, or use filters to discover candidate traces (provider dependent).

## Input

- `scope` (required)
- `trace_id` (optional in schema, but required by some providers)
- `start_time` (optional): ISO timestamp or relative value (default `1h`)
- `end_time` (optional)
- `text_filter` (optional)
- `severity` (optional)
- `resource_type` (optional)
- `limit` (optional): `1..200` (default `50`)

## Example

```text
trace_request(
  scope="http://localhost:9200",
  trace_id="trace-abc",
  resource_type="logs-*",
  start_time="6h"
)
```

## Response shape

Array of traces:

- `trace_id`
- `entries` (time-ordered)
- `services`
- `duration_ms`

## Provider notes

- Elasticsearch currently requires `trace_id`.
- AWS tracing expects log group in `resource_type`.
