# GCP Provider

Use provider `gcp` to query Google Cloud Logging.

## Scope value

For all tools, `scope` is your GCP project ID.

Example:

```text
scope: "my-gcp-project"
```

## Auth

Logs Sieve uses Application Default Credentials.

Local development (recommended):

```bash
gcloud auth application-default login
```

Credential location:

- `gcloud auth application-default login` stores credentials on disk.
- You do not need to export anything in each terminal.

Workload environments (GCE, GKE, Cloud Run):

- Attach a service account with permission to read logs.
- ADC is picked up automatically.

## Useful examples

```text
query_logs(scope="my-gcp-project", start_time="2h", severity="ERROR", text_filter="payment")
```

```text
trace_request(scope="my-gcp-project", trace_id="123abc", start_time="1h")
```

## Notes

- `resource_type` maps to GCP resource type (for example `cloud_run_revision`).
- `log_name` maps to GCP log name.
