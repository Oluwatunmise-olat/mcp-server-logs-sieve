import { buildAzureQuery } from "../src/utils/azure.js";

describe("buildAzureQuery", () => {
  it("Should build a safe query with severity and escaped text", () => {
    const query = buildAzureQuery({
      log_name: "AppTraces",
      severity: "ERROR",
      text_filter: "can't connect",
      limit: 25,
    });

    expect(query).toContain("AppTraces");
    expect(query).toContain(
      '| where toint(column_ifexists("SeverityLevel", column_ifexists("Level", 1))) >= 3',
    );
  });
});
