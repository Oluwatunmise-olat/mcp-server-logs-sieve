import {
  buildFilter,
  buildTraceFilter,
  messagePatternKey,
  normalizeTraceId,
  safeParsePayload,
} from "../src/utils/gcp.js";

describe("buildFilter", () => {
  it("Should build the accurate query string with all importnt clauses", () => {
    const f = buildFilter({
      scope: "my-project-id",
      severity: "ERROR",
      text_filter: "payment failed",
    });
    expect(f).toBe(
      'resource.labels.project_id = "my-project-id" AND severity >= ERROR AND SEARCH("payment failed")',
    );
  });

  it("Should expand the short log names to the full log path", () => {
    const f = buildFilter({ scope: "my-project-id", log_name: "orderflow" });
    expect(f).toBe(
      `resource.labels.project_id = "my-project-id" AND logName = "projects/my-project-id/logs/orderflow"`,
    );
  });

  it("Should include time frames if provided", () => {
    const f = buildFilter({
      scope: "my-project-id",
      start_time: "2026-03-07T00:00:00Z",
      end_time: "2026-03-07T01:00:00Z",
    });
    expect(f).toBe(
      'resource.labels.project_id = "my-project-id" AND timestamp >= "2026-03-07T00:00:00Z" AND timestamp <= "2026-03-07T01:00:00Z"',
    );
  });
});

describe("buildTraceFilter", () => {
  it("Should build a trace filter", () => {
    expect(
      buildTraceFilter(
        "my-project-id",
        "projects/my-project-id/traces/jesttest123",
        "2026-03-07T00:00:00Z",
        "2026-03-07T01:00:00Z",
      ),
    ).toBe(
      'resource.labels.project_id = "my-project-id" AND trace = "projects/my-project-id/traces/jesttest123" AND timestamp >= "2026-03-07T00:00:00Z" AND timestamp <= "2026-03-07T01:00:00Z"',
    );
  });
});

describe("messagePatternKey", () => {
  it("Should extract valid fields from JSON logs and drop unneeded keys", () => {
    const msg =
      '{"level":"error","message":"failed to process order 1234","requestId":"abc-def-1234","timestamp":"2026-03-07T12:00:00Z"}';
    expect(messagePatternKey(msg)).toBe(
      "level=error | message=failed to process order N",
    );
  });
});
