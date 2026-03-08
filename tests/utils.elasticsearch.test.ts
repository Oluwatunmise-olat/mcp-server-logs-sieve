import {
  normalizeElasticsearchBaseUrl,
  normalizeElasticsearchMessageKey,
} from "../src/utils/elasticsearch.js";

describe("normalizeElasticsearchBaseUrl", () => {
  it("Should add default http scheme when omitted", () => {
    expect(normalizeElasticsearchBaseUrl("localhost:9200")).toBe(
      "http://localhost:9200",
    );
  });

  it("Should remove trailing slash", () => {
    expect(normalizeElasticsearchBaseUrl("https://es.example.com/")).toBe(
      "https://es.example.com",
    );
  });
});

describe("normalizeElasticsearchMessageKey", () => {
  it("Should collapse ids and digits so similar log messages are grouped together", () => {
    const a = normalizeElasticsearchMessageKey(
      "request 123 failed for trace 7f3a9c11d22a88ff",
    );
    const b = normalizeElasticsearchMessageKey(
      "request 456 failed for trace a1b2c3d4e5f60789",
    );

    expect(a).toBe(b);
  });
});
