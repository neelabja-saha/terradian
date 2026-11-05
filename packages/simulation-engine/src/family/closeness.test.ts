import type { PersonalityTraits, RelationshipType } from "@terradian/shared";
import { describe, expect, it } from "vitest";
import { createRng } from "../rng.js";
import { computeCloseness } from "./closeness.js";

const TYPES: RelationshipType[] = ["mother", "father", "sibling", "grandmother", "grandfather"];

function traits(overrides: Partial<PersonalityTraits> = {}): PersonalityTraits {
  return {
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50,
    ...overrides,
  };
}

describe("computeCloseness", () => {
  it("stays an integer in 0-100 even for extreme personalities", () => {
    const extremes = [
      traits({ agreeableness: 100, neuroticism: 0 }),
      traits({ agreeableness: 0, neuroticism: 100 }),
    ];
    for (const type of TYPES) {
      for (const personality of extremes) {
        for (let seed = 0; seed < 200; seed++) {
          const value = computeCloseness(type, personality, createRng(seed));
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("rises with agreeableness and falls with neuroticism (same noise)", () => {
    for (let seed = 0; seed < 50; seed++) {
      const base = computeCloseness("mother", traits(), createRng(seed));
      const agreeable = computeCloseness("mother", traits({ agreeableness: 80 }), createRng(seed));
      const neurotic = computeCloseness("mother", traits({ neuroticism: 80 }), createRng(seed));
      expect(agreeable).toBeGreaterThan(base);
      expect(neurotic).toBeLessThan(base);
    }
  });

  it("draws exactly one rng value", () => {
    const used = createRng(5);
    computeCloseness("sibling", traits(), used);
    const reference = createRng(5);
    reference.next();
    expect(used.getState()).toBe(reference.getState());
  });
});
