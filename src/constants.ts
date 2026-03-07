export const Providers = {
  GCP: "gcp",
  AWS: "aws",
  AZURE: "azure",
  DATADOG: "datadog",
  LOKI: "loki",
  ELASTICSEARCH: "elasticsearch",
} as const;

export type Provider = (typeof Providers)[keyof typeof Providers];
