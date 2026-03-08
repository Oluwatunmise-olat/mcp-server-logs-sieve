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
