# Guide: Debug Payment Failures

This is a practical workflow you can reuse during incidents.

## Step 1: Find where the noise is

Run summary first:

```text
summarize_logs(scope="my-gcp-project", start_time="6h", severity="WARNING", text_filter="payment")
```

Look at:

- `severity_counts`
- top patterns with the highest counts

## Step 2: Pull concrete failing events

```text
query_logs(scope="my-gcp-project", start_time="6h", severity="ERROR", text_filter="payment failed", limit=100)
```

Collect from entries:

- recurring endpoints
- customer ids (if present)
- trace IDs

## Step 3: Trace one failing request end-to-end

```text
trace_request(scope="my-gcp-project", trace_id="<trace-id>", start_time="6h")
```

Check service order and first failure point.

## Step 4: Validate if this is still active

Narrow to recent window:

```text
query_logs(scope="my-gcp-project", start_time="30m", text_filter="same error signature")
```

If count is zero, the issue may already be mitigated.
