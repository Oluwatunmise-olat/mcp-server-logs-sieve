export interface LogEntry {
  timestamp: string;
  severity: string;
  message: string;
  resource_type?: string;
  resource_labels?: Record<string, string>;
  labels?: Record<string, string>;
  log_name?: string;
  insert_id?: string;
  trace_id?: string;
}

export interface QueryParams {
  scope: string;
  resource_type?: string;
  start_time?: string;
  end_time?: string;
  severity?: string;
  text_filter?: string;
  log_name?: string;
  limit?: number;
}

export interface LogSummary {
  total_entries: number;
  severity_counts: Record<string, number>;
  top_patterns: Array<{
    pattern: string;
    count: number;
    sample: string;
  }>;
  time_range: { earliest: string; latest: string };
  resource_type_counts?: Record<string, number>;
}

export interface LogSource {
  type: "project" | "log_name" | "resource_type";
  name: string;
  display_name?: string;
}

export interface TraceParams {
  scope: string;
  trace_id?: string;
  start_time?: string;
  end_time?: string;
  text_filter?: string;
  severity?: string;
  resource_type?: string;
  limit?: number;
}

export interface TraceResult {
  trace_id: string;
  entries: LogEntry[];
  services: string[];
  duration_ms: number;
}

export interface LogProvider {
  readonly id: string;
  readonly name: string;

  queryLogs(params: QueryParams): Promise<LogEntry[]>;
  summarizeLogs(params: QueryParams): Promise<LogSummary>;
  listSources(projectId: string): Promise<LogSource[]>;
  traceRequests(params: TraceParams): Promise<TraceResult[]>;
}
