import { Transport } from "@elastic/elasticsearch";

export function normalizeElasticsearchBaseUrl(scope: string) {
  const baseUrl = scope;

  if (!baseUrl) throw new Error("Elasticsearch scope must be a base URL.");

  const withScheme =
    baseUrl.startsWith("http://") || baseUrl.startsWith("https://")
      ? baseUrl
      : `http://${baseUrl}`;

  return withScheme.endsWith("/") ? withScheme.slice(0, -1) : withScheme;
}

export function normalizeElasticsearchMessageKey(message: string): string {
  return message
    .replace(/[0-9a-f]{8,}/gi, "*")
    .replace(/\d+/g, "#")
    .slice(0, 200);
}

export function resolveElasticsearchCompatVersion(
  value: string | undefined,
): 7 | 8 | 9 {
  if (!value) return 8;

  if (value === "7" || value === "8" || value === "9") {
    return Number(value) as 7 | 8 | 9;
  }

  throw new Error(
    `Invalid ELASTICSEARCH_COMPAT_VERSION (${value}). Use one of: 7, 8, 9.`,
  );
}

export function createCompatTransport(
  compatVersion: 7 | 8 | 9,
): typeof Transport {
  // The Elasticsearch v9 library defaults to compatible-with=9.
  // I added this to force the requested compatibility level.
  const compat = `compatible-with=${compatVersion}`;

  const compatHeaders = {
    jsonContentType: `application/vnd.elasticsearch+json; ${compat}`,
    ndjsonContentType: `application/vnd.elasticsearch+x-ndjson; ${compat}`,
    accept: `application/vnd.elasticsearch+json; ${compat},text/plain`,
  };

  class CompatTransport extends Transport {
    constructor(options: ConstructorParameters<typeof Transport>[0]) {
      super({
        ...options,
        vendoredHeaders: {
          ...options.vendoredHeaders,
          ...compatHeaders,
        },
      });
    }
  }

  return CompatTransport;
}
