export const Providers = {
  GCP: "gcp",
  AWS: "aws",
  AZURE: "azure",
} as const;

export type Provider = (typeof Providers)[keyof typeof Providers];
