import { Client } from "@elastic/elasticsearch";
import {
  QueryDslQueryContainer,
  SearchRequest,
} from "@elastic/elasticsearch/lib/api/types";

import {
  createCompatTransport,
  normalizeElasticsearchBaseUrl,
  normalizeElasticsearchMessageKey,
  resolveElasticsearchCompatVersion,
} from "../../utils/elasticsearch.js";
import {
  Credentials,
  ElasticsearchListSourcesAggregations,
  LogEntry,
  LogProvider,
  LogSource,
  LogSummary,
  QueryParams,
  TraceParams,
  TraceResult,
} from "../types.js";

export class ElasticsearchProvider implements LogProvider {
  readonly id = "elasticsearch";
  readonly name = "Elasticsearch";
  private readonly sourceIndexPatterns = ["logs-*", "filebeat-*", "logstash-*"];
  private readonly creds?: Credentials;

  constructor(creds?: Credentials) {
    this.creds = creds;
  }

  async queryLogs(params: QueryParams) {
    const client = await this.getClient(params.scope);

    const searchContract: SearchRequest = {
      size: params.limit || 50,
      sort: [{ "@timestamp": { order: "desc" } }],
    };

    if (params.resource_type) {
      searchContract.index = params.resource_type;
    }

    const timestampRange: { gte?: string; lte?: string } = {};

    if (params.start_time) {
      timestampRange.gte = params.start_time;
    }

    if (params.end_time) {
      timestampRange.lte = params.end_time;
    }

    const mustQueries: QueryDslQueryContainer[] = [];

    const filterQueries: QueryDslQueryContainer[] = [];

    if (Object.keys(timestampRange).length) {
      filterQueries.push({
        range: {
          "@timestamp": timestampRange,
        },
      });
    }

    if (params.text_filter) {
      mustQueries.push({
        multi_match: {
          query: params.text_filter,
          fields: ["message^3", "body^2", "log", "event.original"],
        },
      });
    }

    if (params.severity) {
      filterQueries.push({
        bool: {
          minimum_should_match: 1,
          should: [
            { term: { "severity.keyword": params.severity } },
            { term: { severity: params.severity } },
            { term: { "log.level.keyword": params.severity } },
            { term: { "log.level": params.severity } },
          ],
        },
      });
    }

    if (params.log_name) {
      filterQueries.push({
        bool: {
          minimum_should_match: 1,
          should: [
            { term: { "log_name.keyword": params.log_name } },
            { term: { log_name: params.log_name } },
            { term: { "log.logger.keyword": params.log_name } },
            { term: { "log.logger": params.log_name } },
            { term: { "logger.keyword": params.log_name } },
            { term: { logger: params.log_name } },
          ],
        },
      });
    }

    if (mustQueries.length || filterQueries.length) {
      searchContract.query = {
        bool: {
          ...(mustQueries.length ? { must: mustQueries } : {}),
          ...(filterQueries.length ? { filter: filterQueries } : {}),
        },
      };
    }

    try {
      const res = await client.search(searchContract);

      const logs = res.hits.hits;

      return logs.map((hit): LogEntry => {
        const source = (hit._source ?? {}) as Record<string, unknown>;

        const timestampValue =
          source["@timestamp"] ?? source.timestamp ?? new Date().toISOString();

        const messageValue =
          source.message ??
          source.body ??
          source.log ??
          source["event.original"];

        const severityValue =
          source.severity ?? source["log.level"] ?? source.level ?? "INFO";

        return {
          timestamp: String(timestampValue),
          message:
            messageValue == null
              ? JSON.stringify(source)
              : String(messageValue),
          severity: String(severityValue),
          resource_type:
            source.resource_type == null
              ? undefined
              : String(source.resource_type),
          log_name:
            source.log_name == null ? undefined : String(source.log_name),
          insert_id: hit._id,
          trace_id:
            source.trace_id == null ? undefined : String(source.trace_id),
        };
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Elasticsearch queryLogs failed: ${message}`);
    }
  }

  async summarizeLogs(params: QueryParams): Promise<LogSummary> {
    const entries = await this.queryLogs({
      ...params,
      limit: params.limit || 200,
    });

    const severityCounts: Record<string, number> = {};

    const patterns = new Map<string, { count: number; sample: string }>();

    for (const entry of entries) {
      severityCounts[entry.severity] =
        (severityCounts[entry.severity] || 0) + 1;

      const patternKey = normalizeElasticsearchMessageKey(entry.message);

      const existing = patterns.get(patternKey);

      if (existing) existing.count += 1;
      else patterns.set(patternKey, { count: 1, sample: entry.message });
    }

    const topPatterns = [...patterns.entries()]
      .map(([pattern, value]) => ({
        pattern,
        count: value.count,
        sample: value.sample,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const timestamps = entries
      .map((entry) => entry.timestamp)
      .filter(Boolean)
      .sort();

    return {
      total_entries: entries.length,
      severity_counts: severityCounts,
      top_patterns: topPatterns,
      time_range: {
        earliest: timestamps[0] || "",
        latest: timestamps[timestamps.length - 1] || "",
      },
    };
  }

  async listSources(scope: string): Promise<LogSource[]> {
    const client = await this.getClient(scope);
    const uniqueNames = new Set<string>();
    const errors: string[] = [];

    for (const indexPattern of this.sourceIndexPatterns) {
      try {
        const res = await client.search({
          index: indexPattern,
          size: 0,
          aggs: {
            unique_sources: {
              terms: {
                field: "host.name.keyword",
                size: 50,
              },
            },
          },
        });

        const aggregations = res.aggregations as
          | ElasticsearchListSourcesAggregations
          | undefined;

        const buckets = aggregations?.unique_sources?.buckets || [];

        for (const bucket of buckets) {
          uniqueNames.add(String(bucket.key));
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`[${indexPattern}] ${message}`);
      }
    }

    if (uniqueNames.size > 0) {
      return [...uniqueNames].map((name) => ({
        type: "resource_type",
        name,
        display_name: name,
      }));
    }

    throw new Error(
      `Elasticsearch listSources failed for all index patterns: ${errors.join("; ")}`,
    );
  }

  async traceRequests(params: TraceParams): Promise<TraceResult[]> {
    if (!params.trace_id) {
      throw new Error(
        "trace_id is required for Elasticsearch traceRequests (basic implementation).",
      );
    }

    const client = await this.getClient(params.scope);

    const timestampRange: { gte?: string; lte?: string } = {};

    if (params.start_time) {
      timestampRange.gte = params.start_time;
    }

    if (params.end_time) {
      timestampRange.lte = params.end_time;
    }

    const mustQueries: QueryDslQueryContainer[] = [
      {
        bool: {
          minimum_should_match: 1,
          should: [
            { term: { "trace_id.keyword": params.trace_id } },
            { term: { trace_id: params.trace_id } },
            { term: { "trace.id.keyword": params.trace_id } },
            { term: { "trace.id": params.trace_id } },
            { match_phrase: { message: params.trace_id } },
            { match_phrase: { body: params.trace_id } },
            { match_phrase: { log: params.trace_id } },
            { match_phrase: { "event.original": params.trace_id } },
          ],
        },
      },
    ];

    const filterQueries: QueryDslQueryContainer[] = [];

    if (Object.keys(timestampRange).length) {
      filterQueries.push({
        range: {
          "@timestamp": timestampRange,
        },
      });
    }

    if (params.severity) {
      filterQueries.push({
        bool: {
          minimum_should_match: 1,
          should: [
            { term: { "severity.keyword": params.severity } },
            { term: { severity: params.severity } },
            { term: { "log.level.keyword": params.severity } },
            { term: { "log.level": params.severity } },
          ],
        },
      });
    }

    if (params.text_filter) {
      mustQueries.push({
        multi_match: {
          query: params.text_filter,
          fields: ["message^3", "body^2", "log", "event.original"],
        },
      });
    }

    if (params.resource_type) {
      filterQueries.push({
        bool: {
          minimum_should_match: 1,
          should: [
            { term: { "resource_type.keyword": params.resource_type } },
            { term: { resource_type: params.resource_type } },
            { term: { "_index.keyword": params.resource_type } },
          ],
        },
      });
    }

    const index = params.resource_type || this.sourceIndexPatterns.join(",");

    try {
      const res = await client.search({
        index,
        size: params.limit || 200,
        sort: [{ "@timestamp": { order: "asc" } }],
        query: {
          bool: {
            must: mustQueries,
            ...(filterQueries.length ? { filter: filterQueries } : {}),
          },
        },
      });

      const entries = res.hits.hits.map((hit): LogEntry => {
        const source = (hit._source ?? {}) as Record<string, unknown>;

        const timestampValue =
          source["@timestamp"] ?? source.timestamp ?? new Date().toISOString();
        const messageValue =
          source.message ??
          source.body ??
          source.log ??
          source["event.original"];
        const severityValue =
          source.severity ?? source["log.level"] ?? source.level ?? "INFO";
        const traceIdValue =
          source.trace_id ?? source["trace.id"] ?? params.trace_id;

        return {
          timestamp: String(timestampValue),
          message:
            messageValue == null
              ? JSON.stringify(source)
              : String(messageValue),
          severity: String(severityValue),
          resource_type:
            source.resource_type == null
              ? undefined
              : String(source.resource_type),
          log_name:
            source.log_name == null ? undefined : String(source.log_name),
          insert_id: hit._id,
          trace_id: String(traceIdValue),
        };
      });

      if (!entries.length) return [];

      const services = [
        ...new Set(
          entries
            .map((entry) => entry.resource_type || entry.log_name)
            .filter(Boolean),
        ),
      ] as string[];

      let durationMs = 0;

      if (entries.length > 1) {
        const first = new Date(entries[0].timestamp).getTime();
        const last = new Date(entries[entries.length - 1].timestamp).getTime();
        durationMs = last - first;
      }

      return [
        {
          trace_id: params.trace_id,
          entries,
          services,
          duration_ms: durationMs,
        },
      ];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Elasticsearch traceRequests failed: ${message}`);
    }
  }

  private async getClient(scope: string) {
    const baseUrl = normalizeElasticsearchBaseUrl(scope);

    const compatVersion = resolveElasticsearchCompatVersion(
      this.creds?.elasticsearchCompatVersion ?? process.env.ELASTICSEARCH_COMPAT_VERSION,
    );

    const apiKey = this.creds?.elasticsearchApiKey ?? process.env.ELASTICSEARCH_API_KEY;
    const username = this.creds?.elasticsearchUsername ?? process.env.ELASTICSEARCH_USERNAME;
    const password = this.creds?.elasticsearchPassword ?? process.env.ELASTICSEARCH_PASSWORD;

    const clientOptions: ConstructorParameters<typeof Client>[0] = {
      node: baseUrl,
      Transport: createCompatTransport(compatVersion),
    };

    if (apiKey) {
      clientOptions.auth = { apiKey };
    } else if (username && password) {
      clientOptions.auth = { username, password };
    }

    const client = new Client(clientOptions);

    try {
      await client.ping();
    } catch {
      throw new Error("Elasticsearch cluster not connecting");
    }

    return client;
  }
}
