# Environment Variables

## How to set variables

Current terminal only:

```bash
export KEY="value"
```

Persist in your shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`):

```bash
echo 'export KEY="value"' >> ~/.bashrc
source ~/.bashrc
```

You can also set env vars in your runtime environment (Docker, systemd, CI, or cloud platform settings).

## Provider-independent

No global env var is required for startup.

## Loki

- `LOKI_BEARER_TOKEN`: bearer auth token
- `LOKI_USERNAME`: basic auth username
- `LOKI_PASSWORD`: basic auth password

Example:

```bash
export LOKI_BEARER_TOKEN="your-token"
# or
export LOKI_USERNAME="your-username"
export LOKI_PASSWORD="your-password"
```

## Elasticsearch

- `ELASTICSEARCH_API_KEY`
- `ELASTICSEARCH_USERNAME`
- `ELASTICSEARCH_PASSWORD`
- `ELASTICSEARCH_COMPAT_VERSION`: `7`, `8`, or `9` (default `8`)

Example:

```bash
export ELASTICSEARCH_API_KEY="your-api-key"
export ELASTICSEARCH_COMPAT_VERSION="8"
```

## Cloud provider credentials

Use each cloud SDK's default credential chain:

- GCP: Application Default Credentials
- AWS: AWS default credential provider chain
- Azure: `DefaultAzureCredential`
