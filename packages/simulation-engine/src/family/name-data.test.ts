import { describe, expect, it } from "vitest";
import { getNameSet, parseNameData } from "./name-data.js";

const VALID_SET = { male: ["A"], female: ["B"], surnames: ["C"] };

describe("getNameSet", () => {
  it("returns the country's own names when present", () => {
    expect(getNameSet("India").surnames).toContain("Sharma");
  });

  it("falls back to the default set for unknown countries", () => {
    expect(getNameSet("Atlantis")).toEqual(getNameSet("default"));
  });
});

describe("parseNameData", () => {
  it("accepts valid data", () => {
    expect(parseNameData({ default: VALID_SET, India: VALID_SET })).toEqual({
      default: VALID_SET,
      India: VALID_SET,
    });
  });

  it("rejects non-object input", () => {
    expect(() => parseNameData([])).toThrow(/expected an object keyed by country/);
    expect(() => parseNameData(null)).toThrow(/expected an object keyed by country/);
  });

  it("requires a default set", () => {
    expect(() => parseNameData({ India: VALID_SET })).toThrow(/missing the "default"/);
  });

  it("rejects a country entry that is not an object", () => {
    expect(() => parseNameData({ default: VALID_SET, India: "names" })).toThrow(
      /"India" must be an object/,
    );
  });

  it("rejects missing or empty name lists, naming the field", () => {
    expect(() => parseNameData({ default: { ...VALID_SET, female: [] } })).toThrow(
      /"default.female" must be a non-empty array/,
    );
    expect(() => parseNameData({ default: { male: ["A"], female: ["B"] } })).toThrow(
      /"default.surnames" must be a non-empty array/,
    );
  });

  it("rejects blank or non-string names, naming the index", () => {
    expect(() => parseNameData({ default: { ...VALID_SET, male: ["A", " "] } })).toThrow(
      /"default.male\[1\]" must be a non-empty string/,
    );
    expect(() => parseNameData({ default: { ...VALID_SET, surnames: [42] } })).toThrow(
      /"default.surnames\[0\]"/,
    );
  });

  it("returns copies, not the original arrays", () => {
    const raw = { default: { male: ["A"], female: ["B"], surnames: ["C"] } };
    const parsed = parseNameData(raw);
    expect(parsed.default?.male).not.toBe(raw.default.male);
  });
});
