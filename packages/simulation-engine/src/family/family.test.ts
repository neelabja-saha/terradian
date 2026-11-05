import type { Family, PersonalityTraits, Terrestrial } from "@terradian/shared";
import { describe, expect, it } from "vitest";
import { createRng } from "../rng.js";
import { createTerrestrial, type CreateTerrestrialInput } from "../terrestrial/terrestrial.js";
import { DAYS_PER_YEAR, ageInYears } from "../util.js";
import { FAMILY_AGE_RULES, generateFamily } from "./family.js";
import { getNameSet } from "./name-data.js";

const CURRENT_DAY = 200 * DAYS_PER_YEAR;
const SEEDS = Array.from({ length: 200 }, (_, i) => i);
const PLAYER_AGES = [0, 5, 18, 35, 60, 85];

function makeTerrestrial(
  seed: number,
  overrides: Partial<CreateTerrestrialInput> = {},
  ageYears = 10,
): Terrestrial {
  return createTerrestrial(
    {
      id: "t-1",
      name: "Asha Rao",
      gender: "female",
      birthDay: CURRENT_DAY - ageYears * DAYS_PER_YEAR,
      location: { city: "Kolkata", region: "West Bengal", country: "India" },
      socioeconomicTier: "middle",
      ...overrides,
    },
    CURRENT_DAY,
    createRng(`terrestrial-${seed}`),
  );
}

function family(seed: number, terrestrial: Terrestrial): Family {
  return generateFamily(terrestrial, createRng(seed), CURRENT_DAY);
}

function yearsBetween(olderBirthDay: number, youngerBirthDay: number): number {
  return (youngerBirthDay - olderBirthDay) / DAYS_PER_YEAR;
}

describe("generateFamily", () => {
  it("is deterministic for the same seed and input", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const t = makeTerrestrial(seed);
      expect(family(seed, t)).toEqual(family(seed, t));
    }
  });

  it("varies across seeds", () => {
    const t = makeTerrestrial(1);
    expect(family(1, t)).not.toEqual(family(2, t));
  });

  it("does not mutate the terrestrial", () => {
    const t = makeTerrestrial(1);
    const snapshot = JSON.parse(JSON.stringify(t)) as Terrestrial;
    const result = family(1, t);
    expect(t).toEqual(snapshot);
    for (const member of result.members) {
      expect(member.location).not.toBe(t.location);
    }
  });

  it("rejects a terrestrial born after currentDay", () => {
    const t = { ...makeTerrestrial(1), birthDay: CURRENT_DAY + 1 };
    expect(() => generateFamily(t, createRng(1), CURRENT_DAY)).toThrow(RangeError);
  });

  describe.each(PLAYER_AGES)("age plausibility for a %i-year-old over 200 seeds", (playerAge) => {
    const rules = FAMILY_AGE_RULES;

    it("always has one mother and one father 20-40 years older", () => {
      for (const seed of SEEDS) {
        const t = makeTerrestrial(seed, {}, playerAge);
        const { members } = family(seed, t);
        const mothers = members.filter((m) => m.relationshipType === "mother");
        const fathers = members.filter((m) => m.relationshipType === "father");
        expect(mothers).toHaveLength(1);
        expect(fathers).toHaveLength(1);
        for (const parent of [...mothers, ...fathers]) {
          const gap = yearsBetween(parent.birthDay, t.birthDay);
          expect(gap).toBeGreaterThanOrEqual(rules.parentAgeGap[0]);
          expect(gap).toBeLessThanOrEqual(rules.parentAgeGap[1]);
          expect(parent.isAlive).toBe(
            ageInYears(parent.birthDay, CURRENT_DAY) <= rules.maxLivingAge,
          );
        }
      }
    });

    it("has 0-3 siblings born to parents of plausible age, none in the future", () => {
      for (const seed of SEEDS) {
        const t = makeTerrestrial(seed, {}, playerAge);
        const { members } = family(seed, t);
        const mother = members.find((m) => m.relationshipType === "mother")!;
        const father = members.find((m) => m.relationshipType === "father")!;
        const siblings = members.filter((m) => m.relationshipType === "sibling");
        expect(siblings.length).toBeLessThanOrEqual(rules.maxSiblings);
        for (const sibling of siblings) {
          expect(sibling.birthDay).toBeLessThanOrEqual(CURRENT_DAY);
          expect(Math.abs(yearsBetween(sibling.birthDay, t.birthDay))).toBeLessThanOrEqual(
            rules.maxSiblingAgeGap,
          );
          const motherAgeAtBirth = yearsBetween(mother.birthDay, sibling.birthDay);
          const fatherAgeAtBirth = yearsBetween(father.birthDay, sibling.birthDay);
          expect(motherAgeAtBirth).toBeGreaterThanOrEqual(rules.minParentAgeAtBirth);
          expect(motherAgeAtBirth).toBeLessThanOrEqual(rules.maxMotherAgeAtBirth);
          expect(fatherAgeAtBirth).toBeGreaterThanOrEqual(rules.minParentAgeAtBirth);
        }
      }
    });

    it("has 0-2 living grandparents 20-35 years older than a parent", () => {
      for (const seed of SEEDS) {
        const t = makeTerrestrial(seed, {}, playerAge);
        const { members } = family(seed, t);
        const parents = members.filter(
          (m) => m.relationshipType === "mother" || m.relationshipType === "father",
        );
        const grandparents = members.filter(
          (m) => m.relationshipType === "grandmother" || m.relationshipType === "grandfather",
        );
        expect(grandparents.length).toBeLessThanOrEqual(rules.maxLivingGrandparents);
        for (const grandparent of grandparents) {
          expect(grandparent.isAlive).toBe(true);
          expect(ageInYears(grandparent.birthDay, CURRENT_DAY)).toBeLessThanOrEqual(
            rules.maxLivingAge,
          );
          const fitsAParent = parents.some((parent) => {
            const gap = yearsBetween(grandparent.birthDay, parent.birthDay);
            return gap >= rules.grandparentAgeGap[0] && gap <= rules.grandparentAgeGap[1];
          });
          expect(fitsAParent).toBe(true);
        }
      }
    });
  });

  it("produces every sibling and grandparent count somewhere across seeds", () => {
    const siblingCounts = new Set<number>();
    const grandparentCounts = new Set<number>();
    for (const seed of SEEDS) {
      const { members } = family(seed, makeTerrestrial(seed, {}, 10));
      siblingCounts.add(members.filter((m) => m.relationshipType === "sibling").length);
      grandparentCounts.add(members.filter((m) => m.relationshipType.startsWith("grand")).length);
    }
    expect([...siblingCounts].sort()).toEqual([0, 1, 2, 3]);
    expect([...grandparentCounts].sort()).toEqual([0, 1, 2]);
  });

  it("has no living grandparents for a very old terrestrial", () => {
    for (const seed of SEEDS) {
      const { members } = family(seed, makeTerrestrial(seed, {}, 85));
      expect(members.some((m) => m.relationshipType.startsWith("grand"))).toBe(false);
    }
  });

  it("keeps stats, personality and closeness in bounds", () => {
    for (const seed of SEEDS) {
      const { members, relationships } = family(seed, makeTerrestrial(seed, {}, 30));
      for (const member of members) {
        for (const key of ["health", "happiness", "intelligence", "energy", "stress"] as const) {
          expect(member.stats[key]).toBeGreaterThanOrEqual(0);
          expect(member.stats[key]).toBeLessThanOrEqual(100);
        }
        expect(member.stats.wealth).toBeGreaterThanOrEqual(0);
        for (const value of Object.values(member.personality)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
      }
      for (const edge of relationships) {
        expect(Number.isInteger(edge.closeness)).toBe(true);
        expect(edge.closeness).toBeGreaterThanOrEqual(0);
        expect(edge.closeness).toBeLessThanOrEqual(100);
      }
    }
  });

  it("creates exactly one edge in each direction per member", () => {
    for (const seed of SEEDS) {
      const t = makeTerrestrial(seed);
      const { members, relationships } = family(seed, t);
      expect(relationships).toHaveLength(members.length * 2);
      for (const member of members) {
        expect(relationships.filter((r) => r.fromId === t.id && r.toId === member.id)).toHaveLength(
          1,
        );
        expect(relationships.filter((r) => r.fromId === member.id && r.toId === t.id)).toHaveLength(
          1,
        );
      }
    }
  });

  it("has no duplicate ids", () => {
    for (const seed of SEEDS) {
      const t = makeTerrestrial(seed);
      const ids = [t.id, ...family(seed, t).members.map((m) => m.id)];
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("shares tier and location and sets terrestrialId", () => {
    const t = makeTerrestrial(1, { socioeconomicTier: "high" });
    const result = family(1, t);
    expect(result.terrestrialId).toBe(t.id);
    for (const member of result.members) {
      expect(member.socioeconomicTier).toBe("high");
      expect(member.location).toEqual(t.location);
    }
  });

  describe("names", () => {
    it("uses the terrestrial's surname", () => {
      const { members } = family(1, makeTerrestrial(1));
      for (const member of members) expect(member.name.endsWith(" Rao")).toBe(true);
    });

    it("rolls a surname from the country list when the terrestrial has one name", () => {
      const india = getNameSet("India");
      for (const seed of SEEDS.slice(0, 20)) {
        const { members } = family(seed, makeTerrestrial(seed, { name: "Asha" }));
        const surnames = new Set(members.map((m) => m.name.split(" ").at(-1)));
        expect(surnames.size).toBe(1);
        expect(india.surnames).toContain([...surnames][0]);
      }
    });

    it("uses the country's first names, by gender", () => {
      const india = getNameSet("India");
      const { members } = family(3, makeTerrestrial(3));
      for (const member of members) {
        const first = member.name.split(" ")[0]!;
        expect(member.gender === "male" ? india.male : india.female).toContain(first);
      }
    });

    it("falls back to the default name set for unknown countries", () => {
      const fallback = getNameSet("Atlantis");
      const t = makeTerrestrial(1, {
        name: "Kai",
        location: { city: "Poseidonis", region: "Deep", country: "Atlantis" },
      });
      for (const member of family(1, t).members) {
        const [first, surname] = member.name.split(" ");
        expect([...fallback.male, ...fallback.female]).toContain(first);
        expect(fallback.surnames).toContain(surname);
      }
    });

    it("does not repeat first names within a family when the list allows", () => {
      for (const seed of SEEDS) {
        const t = makeTerrestrial(seed);
        const firsts = [t, ...family(seed, t).members].map((m) => m.name.split(" ")[0]);
        expect(new Set(firsts).size).toBe(firsts.length);
      }
    });
  });

  describe("personality nudges closeness", () => {
    function meanOutgoingCloseness(traits: Partial<PersonalityTraits>): number {
      let total = 0;
      let count = 0;
      for (const seed of SEEDS) {
        const t = makeTerrestrial(seed, { personality: traits });
        for (const edge of family(seed, t).relationships) {
          if (edge.fromId === t.id) {
            total += edge.closeness;
            count++;
          }
        }
      }
      return total / count;
    }

    it("high agreeableness raises closeness", () => {
      const high = meanOutgoingCloseness({ agreeableness: 90, neuroticism: 50 });
      const low = meanOutgoingCloseness({ agreeableness: 10, neuroticism: 50 });
      expect(high - low).toBeGreaterThan(15);
    });

    it("high neuroticism lowers closeness", () => {
      const high = meanOutgoingCloseness({ agreeableness: 50, neuroticism: 90 });
      const low = meanOutgoingCloseness({ agreeableness: 50, neuroticism: 10 });
      expect(low - high).toBeGreaterThan(10);
    });
  });
});
