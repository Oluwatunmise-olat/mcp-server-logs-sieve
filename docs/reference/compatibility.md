# Compatibility Matrix

## Runtime

- Node.js: 20+

## Providers

- GCP: Google Cloud Logging API
- AWS: CloudWatch Logs API
- Azure: Azure Monitor Logs API
- Loki: Loki HTTP API
- Elasticsearch: Elasticsearch HTTP API

## Elasticsearch compatibility header

When using the JS client v9 against older Elasticsearch servers, set:

```bash
export ELASTICSEARCH_COMPAT_VERSION=8
```

Use `7` for ES 7 clusters and `9` for ES 9 clusters.
