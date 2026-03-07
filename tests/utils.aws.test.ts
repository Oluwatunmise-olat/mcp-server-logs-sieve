import { detectSeverity, normalizeMessageKey } from "../src/utils/aws.js";

describe("detectSeverity", () => {
  it("Should map common log text patterns to severities", () => {
    expect(detectSeverity("[ERROR] db connection refused")).toBe("ERROR");
    expect(detectSeverity("Unhandled Exception: null ref")).toBe("ERROR");
    expect(detectSeverity("warn: rate limit approaching")).toBe("WARNING");
    expect(detectSeverity("debug cache miss")).toBe("DEBUG");
    expect(detectSeverity("critical: queue is down")).toBe("CRITICAL");
    expect(detectSeverity("order ORD-123 placed successfully")).toBe("INFO");
  });
});

describe("normalizeMessageKey", () => {
  it("Should collapse variable id so similar message are grouped together", () => {
    const a = normalizeMessageKey("shipment failed for order ORD-3001 user 42");
    const b = normalizeMessageKey("shipment failed for order ORD-4502 user 17");
    expect(a).toBe(b);
  });
});
