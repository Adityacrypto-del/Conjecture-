import { describe, it, expect } from "vitest";
import { looseJsonParse, parseRetryAfterMs } from "./llm";

describe("looseJsonParse", () => {
  it("parses plain JSON", () => {
    expect(looseJsonParse('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    expect(looseJsonParse('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(looseJsonParse('```\n[1,2]\n```')).toEqual([1, 2]);
  });

  it("extracts JSON embedded in prose (thinking-model prefix)", () => {
    expect(looseJsonParse('Here is the result: {"ok":true} hope that helps')).toEqual({ ok: true });
  });

  it("handles arrays wrapped in text", () => {
    expect(looseJsonParse('Reasoning... [{"id":"H1"}]')).toEqual([{ id: "H1" }]);
  });

  it("throws when there is no JSON at all", () => {
    expect(() => looseJsonParse("no json here")).toThrow();
  });
});

describe("parseRetryAfterMs", () => {
  it("parses 'retry in Ns' from the message", () => {
    expect(parseRetryAfterMs("Please retry in 7s.", null)).toBe(7000);
  });

  it("rounds fractional seconds up", () => {
    // 32.565s -> ceil to whole ms
    expect(parseRetryAfterMs("retry in 32.565s", null)).toBe(Math.ceil(32.565 * 1000));
  });

  it("parses retryDelay from structured details", () => {
    expect(parseRetryAfterMs("quota exceeded", [{ retryDelay: "12s" }])).toBe(12000);
  });

  it("returns undefined when no delay is present", () => {
    expect(parseRetryAfterMs("invalid model", null)).toBeUndefined();
    expect(parseRetryAfterMs("bad request", [{ foo: "bar" }])).toBeUndefined();
  });
});
