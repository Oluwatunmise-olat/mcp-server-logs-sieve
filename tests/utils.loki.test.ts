import { buildLokiSelector } from "../src/utils/loki.js";

describe("buildLokiSelector", () => {
  it("Should build selector from log_name and resource_type", () => {
    expect(buildLokiSelector("payments", "app=checkout")).toBe(
      '{app="checkout",job="payments"}',
    );
  });

  it("Should use raw selector if provided", () => {
    expect(buildLokiSelector('{namespace="prod"}')).toBe('{namespace="prod"}');
  });
});
