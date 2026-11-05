import { describe, expect, it } from "vitest";
import { DAYS_PER_YEAR, ageInYears, clamp } from "./util.js";

describe("clamp", () => {
  it("returns the value when inside the range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to the bounds", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(105, 0, 100)).toBe(100);
  });

  it("keeps the bounds themselves", () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

describe("ageInYears", () => {
  it("is 0 on the day of birth", () => {
    expect(ageInYears(1000, 1000)).toBe(0);
  });

  it("ticks over exactly on the birthday", () => {
    expect(ageInYears(0, DAYS_PER_YEAR - 1)).toBe(0);
    expect(ageInYears(0, DAYS_PER_YEAR)).toBe(1);
    expect(ageInYears(0, 18 * DAYS_PER_YEAR)).toBe(18);
  });

  it("works with negative birth days (born before the epoch)", () => {
    expect(ageInYears(-40 * DAYS_PER_YEAR, 0)).toBe(40);
  });
});
