# AWS Provider

Use provider `aws` to query CloudWatch Logs.

## Scope value

For all tools, `scope` is the AWS region.

Example:

```text
scope: "us-east-1"
```

## Auth

Uses standard AWS credential resolution (environment, profile, IAM role).

Common local setup:

```bash
aws configure
```

Or set env vars.

Current terminal only:

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="us-east-1"
```

Persist across terminal sessions:

```bash
cat >> ~/.bashrc <<'EOF'
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="us-east-1"
EOF
source ~/.bashrc
```

Use your shell profile file (`~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`) based on your shell.

If you already use named profiles, that is usually cleaner than raw key exports.

## Important behavior

- `query_logs` requires `log_name` (CloudWatch log group name).
- `trace_request` requires `resource_type` and expects it to be the log group name.

## Useful examples

```text
query_logs(scope="us-east-1", log_name="/aws/lambda/payments", start_time="6h", text_filter="timeout")
```

```text
trace_request(scope="us-east-1", resource_type="/aws/lambda/payments", trace_id="Root=1-...", start_time="2h")
```
