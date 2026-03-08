export enum LokiApiEndpoint {
  QueryRange = "/loki/api/v1/query_range",
  LabelValuesBase = "/loki/api/v1/label",
}

export const LOKI_API_TIMEOUT_MS = 10000;
