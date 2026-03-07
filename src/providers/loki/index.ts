import axios from "axios";

import { LogProvider, LogSource, QueryParams, TraceParams } from "../types.js";
import {
  buildLokiQuery,
  extractLokiTraceId,
  lokiIsoToNanoseconds,
  mapStreamsToEntries,
  normalizeLokiBaseUrl,
  normalizeLokiMessageKey,
} from "../../utils/loki.js";
import { LokiApiEndpoint } from "./constants.js";

export class LokiLogProvider implements LogProvider {
  readonly id = "loki";
  readonly name = "Grafana Loki";
  // Docs - https://grafana.com/docs/loki/latest/reference/loki-http-api/

  async queryLogs(params: QueryParams) {
    const query = buildLokiQuery(params);

    const response = await this.queryRange(params.scope, {
      query,
      startTime: params.start_time,
      endTime: params.end_time,
      limit: params.limit || 50,
      direction: "backward",
    });

    const entries = mapStreamsToEntries(response.data?.result || []);

    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async summarizeLogs(params: QueryParams) {
    const entries = await this.queryLogs({
      ...params,
      limit: params.limit || 200,
    });

    const severityCounts: Record<string, number> = {};

    const patterns = new Map<string, { count: number; sample: string }>();

    for (const entry of entries) {
      severityCounts[entry.severity] =
        (severityCounts[entry.severity] || 0) + 1;

      const key = normalizeLokiMessageKey(entry.message);

      const hit = patterns.get(key);

      if (hit) hit.count++;
      else patterns.set(key, { count: 1, sample: entry.message });
    }

    const topPatterns = [...patterns.entries()]
      .map(([pattern, v]) => ({ pattern, count: v.count, sample: v.sample }))
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

  async listSources(scope: string) {
    try {
      const jobs = await this.fetchLabelValues(
        scope,
        `${LokiApiEndpoint.LabelValuesBase}/job/values`,
      );

      const apps = await this.fetchLabelValues(
        scope,
        `${LokiApiEndpoint.LabelValuesBase}/app/values`,
      );

      console.log("[loki] listSources:counts>>", {
        jobs: jobs.length,
        apps: apps.length,
      });

      if (jobs.length === 0 && apps.length === 0) {
        throw new Error("no data returned");
      }

      const output: LogSource[] = [];

      for (const job of jobs) {
        output.push({ type: "log_name", name: job, display_name: job });
      }

      for (const app of apps) {
        output.push({ type: "resource_type", name: app, display_name: app });
      }

      return output;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Loki listSources failed: ${message}`);
    }
  }

  async traceRequests(params: TraceParams) {
    let traceIds: string[] = [];

    if (params.trace_id) {
      traceIds = [params.trace_id];
    } else {
      const seedEntries = await this.queryLogs({
        scope: params.scope,
        log_name: params.resource_type,
        start_time: params.start_time,
        end_time: params.end_time,
        text_filter: params.text_filter,
        severity: params.severity,
        limit: params.limit || 50,
      });

      const seen = new Set<string>();

      for (const entry of seedEntries) {
        const traceId =
          entry.trace_id ||
          extractLokiTraceId(entry.message, entry.labels || {});

        if (traceId) seen.add(traceId);
      }

      traceIds = [...seen];
    }

    if (!traceIds.length) return [];

    traceIds = traceIds.slice(0, 5);

    const results = [];

    for (const traceId of traceIds) {
      const scopedQuery = buildLokiQuery({
        scope: params.scope,
        log_name: params.resource_type,
        text_filter: traceId,
        severity: params.severity,
      });

      try {
        const response = await this.queryRange(params.scope, {
          query: scopedQuery,
          startTime: params.start_time,
          endTime: params.end_time,
          limit: 200,
          direction: "forward",
        });

        const entries = mapStreamsToEntries(response.data?.result).sort(
          (a, b) => a.timestamp.localeCompare(b.timestamp),
        );

        let durationMs = 0;

        if (entries.length > 1) {
          const firstEntry = new Date(entries[0].timestamp).getTime();

          const lastEntry = new Date(
            entries[entries.length - 1].timestamp,
          ).getTime();

          durationMs = lastEntry - firstEntry;
        }

        const servicesSet = new Set<string>();

        for (const entry of entries) {
          const service = entry.resource_type || entry.log_name;

          if (service) servicesSet.add(service);
        }

        const services = [...servicesSet];

        results.push({
          trace_id: traceId,
          entries,
          services,
          duration_ms: durationMs,
        });
      } catch {
        continue;
      }
    }

    return results;
  }

  private async queryRange(
    scope: string,
    params: {
      query: string;
      startTime?: string;
      endTime?: string;
      limit: number;
      direction: "forward" | "backward";
    },
  ) {
    try {
      const endpoint = this.buildLokiApiUrl(scope, LokiApiEndpoint.QueryRange);

      const headers = this.authHeaders();

      const res = await axios.get(endpoint, {
        headers,
        params: {
          query: params.query,
          limit: params.limit,
          direction: params.direction,
          start: lokiIsoToNanoseconds(
            params.startTime || new Date(Date.now() - 3600000).toISOString(),
          ),
          end: lokiIsoToNanoseconds(params.endTime || new Date().toISOString()),
        },
      });

      const json = res.data;

      console.log("[loki] queryRange:response>>>", {
        status: res.status,
        resultType: json?.data?.resultType,
      });

      if (res.status < 200 || res.status >= 300 || json.status !== "success") {
        const message = json?.error || `${res.status}`;
        throw new Error(message);
      }

      if (json?.data?.resultType !== "streams") {
        throw new Error(
          `Unsupported Loki resultType "${json?.data?.resultType || "unknown"}". Expected "streams".`,
        );
      }

      if (!Array.isArray(json?.data?.result)) {
        throw new Error(
          "Invalid Loki query_range response: result is not an array.",
        );
      }

      return json;
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : String(err);

      throw new Error(`Loki query_range failed: ${message}`);
    }
  }

  private async fetchLabelValues(scope: string, endpointPath: string) {
    try {
      const endpoint = this.buildLokiApiUrl(scope, endpointPath);

      const headers = this.authHeaders();

      const res = await axios.get(endpoint, { headers });

      const json = res.data;

      if (res.status < 200 || res.status >= 300 || json.status !== "success") {
        const message = json?.error || `${res.status}`;

        throw new Error(message);
      }

      return json.data.filter(Boolean);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : String(err);

      throw new Error(`Loki label values query failed: ${message}`);
    }
  }

  private authHeaders() {
    const headers = { Accept: "application/json" } as any;

    const bearerToken = process.env.LOKI_BEARER_TOKEN;

    if (bearerToken) {
      headers["Authorization"] = `Bearer ${bearerToken}`;

      return headers;
    }

    const username = process.env.LOKI_USERNAME;

    const password = process.env.LOKI_PASSWORD;

    if (username && password) {
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    }

    return headers;
  }

  private buildLokiApiUrl(scope: string, endpointPath: string) {
    const baseUrl = normalizeLokiBaseUrl(scope);

    const path = endpointPath.startsWith("/")
      ? endpointPath.slice(1)
      : endpointPath;

    return `${baseUrl}/${path}`;
  }
}
