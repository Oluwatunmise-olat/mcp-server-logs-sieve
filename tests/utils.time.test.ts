import { jest } from "@jest/globals";

import { parseRelativeTime } from "../src/utils/time.js";

describe("parseRelativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-07T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("Should return relative values from current time", () => {
    expect(parseRelativeTime("1h")).toBe("2026-03-07T11:00:00.000Z");
    expect(parseRelativeTime("30m")).toBe("2026-03-07T11:30:00.000Z");
    expect(parseRelativeTime("7d")).toBe("2026-02-28T12:00:00.000Z");
  });
});
