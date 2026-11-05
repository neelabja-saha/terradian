import type { SocioeconomicTier, Stats } from "@terradian/shared";
import { describe, expect, it } from "vitest";
import { createRng } from "../rng.js";
import { DAYS_PER_YEAR } from "../util.js";
import { lifeStageForAge } from "./life-stage.js";
import { generatePersonality } from "./personality.js";
import { generateStats } from "./stats.js";
import { createTerrestrial, type CreateTerrestrialInput } from "./terrestrial.js";

const TIERS: SocioeconomicTier[] = ["low", "lower-middle", "middle", "upper-middle", "high"];
const SEEDS = Array.from({ length: 200 }, (_, i) => i);
const CURRENT_DAY = 50 * DAYS_PER_YEAR;

function baseInput(overrides: Partial<CreateTerrestrialInput> = {}): CreateTerrestrialInput {
  return {
    id: "t-1",
    name: "Asha Rao",
    gender: "female",
    birthDay: CURRENT_DAY - 10 * DAYS_PER_YEAR,
    location: { city: "Kolkata", region: "West Bengal", country: "India" },
    socioeconomicTier: "middle",
    ...overrides,
  };
}

function expectStatsInBounds(stats: Stats): void {
  for (const key of ["health", "happiness", "intelligence", "energy", "stress"] as const) {
    expect(Number.isInteger(stats[key])).toBe(true);
    expect(stats[key]).toBeGreaterThanOrEqual(0);
    expect(stats[key]).toBeLessThanOrEqual(100);
  }
  expect(stats.wealth).toBeGreaterThanOrEqual(0);
}

describe("lifeStageForAge", () => {
  it.each([
    [0, "infant"],
    [2, "infant"],
    [3, "child"],
    [12, "child"],
    [13, "student"],
    [18, "student"],
    [19, "college"],
    [22, "college"],
    [23, "career"],
    [64, "career"],
    [65, "retirement"],
    [110, "retirement"],
  ] as const)("age %i -> %s", (age, stage) => {
    expect(lifeStageForAge(age)).toBe(stage);
  });
});

describe("generatePersonality", () => {
  it("keeps every trait an integer in 0-100 over many seeds", () => {
    for (const seed of SEEDS) {
      const traits = generatePersonality(createRng(seed));
      for (const value of Object.values(traits)) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("generateStats", () => {
  it.each(TIERS)("keeps stats in bounds for tier %s", (tier) => {
    for (const seed of SEEDS) {
      expectStatsInBounds(generateStats(tier, createRng(seed)));
    }
  });

  it("gives higher tiers more wealth and better health on average", () => {
    const averages = TIERS.map((tier) => {
      let wealth = 0;
      let health = 0;
      for (const seed of SEEDS) {
        const stats = generateStats(tier, createRng(seed));
        wealth += stats.wealth;
        health += stats.health;
      }
      return { wealth: wealth / SEEDS.length, health: health / SEEDS.length };
    });
    for (let i = 1; i < averages.length; i++) {
      const prev = averages[i - 1]!;
      const curr = averages[i]!;
      expect(curr.wealth).toBeGreaterThan(prev.wealth);
      expect(curr.health).toBeGreaterThanOrEqual(prev.health - 1);
    }
    expect(averages[4]!.health).toBeGreaterThan(averages[0]!.health);
  });
});

describe("createTerrestrial", () => {
  it("is deterministic for the same seed and input", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const a = createTerrestrial(baseInput(), CURRENT_DAY, createRng(seed));
      const b = createTerrestrial(baseInput(), CURRENT_DAY, createRng(seed));
      expect(a).toEqual(b);
    }
  });

  it("varies across seeds", () => {
    const a = createTerrestrial(baseInput(), CURRENT_DAY, createRng(1));
    const b = createTerrestrial(baseInput(), CURRENT_DAY, createRng(2));
    expect(a).not.toEqual(b);
  });

  it("copies identity fields from the input", () => {
    const input = baseInput();
    const t = createTerrestrial(input, CURRENT_DAY, createRng(1));
    expect(t.id).toBe(input.id);
    expect(t.name).toBe(input.name);
    expect(t.gender).toBe(input.gender);
    expect(t.birthDay).toBe(input.birthDay);
    expect(t.location).toEqual(input.location);
    expect(t.socioeconomicTier).toBe(input.socioeconomicTier);
  });

  it("does not share or mutate the input objects", () => {
    const input = baseInput({ personality: { openness: 80 } });
    const snapshot = JSON.parse(JSON.stringify(input)) as CreateTerrestrialInput;
    const t = createTerrestrial(input, CURRENT_DAY, createRng(1));
    expect(input).toEqual(snapshot);
    expect(t.location).not.toBe(input.location);
  });

  it("derives life stage from age at currentDay", () => {
    for (const age of [0, 5, 15, 20, 40, 70]) {
      const t = createTerrestrial(
        baseInput({ birthDay: CURRENT_DAY - age * DAYS_PER_YEAR }),
        CURRENT_DAY,
        createRng(1),
      );
      expect(t.lifeStage).toBe(lifeStageForAge(age));
    }
  });

  it("keeps stats and personality in bounds over many seeds and tiers", () => {
    for (const tier of TIERS) {
      for (const seed of SEEDS) {
        const t = createTerrestrial(
          baseInput({ socioeconomicTier: tier }),
          CURRENT_DAY,
          createRng(seed),
        );
        expectStatsInBounds(t.stats);
        for (const value of Object.values(t.personality)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("allows being born today", () => {
    const t = createTerrestrial(baseInput({ birthDay: CURRENT_DAY }), CURRENT_DAY, createRng(1));
    expect(t.lifeStage).toBe("infant");
  });

  describe("personality overrides", () => {
    it("applies given traits and rolls the rest", () => {
      const rolled = createTerrestrial(baseInput(), CURRENT_DAY, createRng(7));
      const custom = createTerrestrial(
        baseInput({ personality: { agreeableness: 90, neuroticism: 10 } }),
        CURRENT_DAY,
        createRng(7),
      );
      expect(custom.personality.agreeableness).toBe(90);
      expect(custom.personality.neuroticism).toBe(10);
      expect(custom.personality.openness).toBe(rolled.personality.openness);
      expect(custom.personality.conscientiousness).toBe(rolled.personality.conscientiousness);
      expect(custom.personality.extraversion).toBe(rolled.personality.extraversion);
    });

    it("does not change how the rng is consumed", () => {
      const rolled = createTerrestrial(baseInput(), CURRENT_DAY, createRng(7));
      const custom = createTerrestrial(
        baseInput({ personality: { openness: 0 } }),
        CURRENT_DAY,
        createRng(7),
      );
      expect(custom.stats).toEqual(rolled.stats);
    });

    it("rounds and clamps out-of-range values", () => {
      const t = createTerrestrial(
        baseInput({ personality: { openness: 150, neuroticism: -20, extraversion: 49.6 } }),
        CURRENT_DAY,
        createRng(1),
      );
      expect(t.personality.openness).toBe(100);
      expect(t.personality.neuroticism).toBe(0);
      expect(t.personality.extraversion).toBe(50);
    });

    it("rejects non-finite values", () => {
      expect(() =>
        createTerrestrial(
          baseInput({ personality: { openness: Number.NaN } }),
          CURRENT_DAY,
          createRng(1),
        ),
      ).toThrow(RangeError);
    });
  });

  describe("input validation", () => {
    it("rejects a birthDay after currentDay", () => {
      expect(() =>
        createTerrestrial(baseInput({ birthDay: CURRENT_DAY + 1 }), CURRENT_DAY, createRng(1)),
      ).toThrow(RangeError);
    });

    it("rejects non-integer days", () => {
      expect(() =>
        createTerrestrial(baseInput({ birthDay: 10.5 }), CURRENT_DAY, createRng(1)),
      ).toThrow(RangeError);
    });

    it("rejects empty id or name", () => {
      expect(() => createTerrestrial(baseInput({ id: " " }), CURRENT_DAY, createRng(1))).toThrow(
        RangeError,
      );
      expect(() => createTerrestrial(baseInput({ name: "" }), CURRENT_DAY, createRng(1))).toThrow(
        RangeError,
      );
    });
  });
});
