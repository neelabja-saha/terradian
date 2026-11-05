import type {
  Family,
  FamilyMember,
  Gender,
  Relationship,
  RelationshipType,
  Terrestrial,
} from "@terradian/shared";
import type { Rng } from "../rng.js";
import { createTerrestrial } from "../terrestrial/terrestrial.js";
import { DAYS_PER_YEAR, ageInYears } from "../util.js";
import { computeCloseness } from "./closeness.js";
import { getNameSet, type NameSet } from "./name-data.js";

/** Age rules for generated families, in years. */
export const FAMILY_AGE_RULES = {
  /** How much older each parent is than the Terrestrial. */
  parentAgeGap: [20, 40],
  /** Largest age difference between the Terrestrial and a sibling. */
  maxSiblingAgeGap: 12,
  /** How much older each grandparent is than their child (the parent). */
  grandparentAgeGap: [20, 35],
  /** Youngest a parent can be when any of their children is born. */
  minParentAgeAtBirth: 18,
  /** Oldest the mother can be when any of her children is born. */
  maxMotherAgeAtBirth: 45,
  /** Anyone older than this at generation time is treated as deceased. */
  maxLivingAge: 100,
  maxSiblings: 3,
  maxLivingGrandparents: 2,
} as const;

interface NamePicker {
  first(gender: Gender): string;
}

/**
 * Picks first names, avoiding repeats within the family (including the
 * Terrestrial's own first name) when the name list allows. Always draws
 * exactly one rng value per name.
 */
function createNamePicker(nameSet: NameSet, terrestrialFirstName: string, rng: Rng): NamePicker {
  const used = new Set<string>([terrestrialFirstName]);
  return {
    first(gender) {
      const pool = gender === "male" ? nameSet.male : nameSet.female;
      const unused = pool.filter((name) => !used.has(name));
      const name = rng.pick(unused.length > 0 ? unused : pool);
      used.add(name);
      return name;
    },
  };
}

function splitName(fullName: string): { first: string; surname: string | undefined } {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? fullName;
  return { first, surname: parts.length > 1 ? parts[parts.length - 1] : undefined };
}

function buildFamilyMember(
  id: string,
  relationshipType: RelationshipType,
  gender: Gender,
  birthDay: number,
  firstName: string,
  surname: string,
  terrestrial: Terrestrial,
  currentDay: number,
  rng: Rng,
): FamilyMember {
  const base = createTerrestrial(
    {
      id,
      name: `${firstName} ${surname}`,
      gender,
      birthDay,
      location: terrestrial.location,
      socioeconomicTier: terrestrial.socioeconomicTier,
    },
    currentDay,
    rng,
  );
  const isAlive = ageInYears(birthDay, currentDay) <= FAMILY_AGE_RULES.maxLivingAge;
  return { ...base, relationshipType, isAlive };
}

/** Deterministic Fisher-Yates shuffle that returns a new array. */
function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

interface GrandparentCandidate {
  relationshipType: "grandmother" | "grandfather";
  birthDay: number;
}

/**
 * Generates a player Terrestrial's family:
 * - a mother and father, 20-40 years older (marked deceased if over 100);
 * - 0-3 siblings within 12 years, spaced so both parents were 18+ and the
 *   mother was at most 45 at each birth, and nobody is born after currentDay;
 * - 0-2 living grandparents, 20-35 years older than their child.
 *
 * Every member gets personality, stats and life stage from createTerrestrial,
 * plus closeness edges to and from the Terrestrial. All randomness flows
 * through `rng`, so the same inputs always produce the same family. The
 * Terrestrial is not modified.
 */
export function generateFamily(terrestrial: Terrestrial, rng: Rng, currentDay: number): Family {
  if (terrestrial.birthDay > currentDay) {
    throw new RangeError(
      `generateFamily: terrestrial birthDay (${terrestrial.birthDay}) must not be after currentDay (${currentDay})`,
    );
  }
  const rules = FAMILY_AGE_RULES;
  const nameSet = getNameSet(terrestrial.location.country);
  const { first: terrestrialFirstName, surname: terrestrialSurname } = splitName(terrestrial.name);
  // Always draw a surname so rng use doesn't depend on the player's name format.
  const rolledSurname = rng.pick(nameSet.surnames);
  const familySurname = terrestrialSurname ?? rolledSurname;
  const names = createNamePicker(nameSet, terrestrialFirstName, rng);

  const members: FamilyMember[] = [];
  const relationships: Relationship[] = [];

  const addMember = (member: FamilyMember): void => {
    members.push(member);
    relationships.push(
      {
        fromId: terrestrial.id,
        toId: member.id,
        closeness: computeCloseness(member.relationshipType, terrestrial.personality, rng),
      },
      {
        fromId: member.id,
        toId: terrestrial.id,
        closeness: computeCloseness(member.relationshipType, member.personality, rng),
      },
    );
  };

  // Parents
  const motherGap = rng.nextInt(rules.parentAgeGap[0], rules.parentAgeGap[1]);
  const fatherGap = rng.nextInt(rules.parentAgeGap[0], rules.parentAgeGap[1]);
  const motherBirthDay = terrestrial.birthDay - motherGap * DAYS_PER_YEAR;
  const fatherBirthDay = terrestrial.birthDay - fatherGap * DAYS_PER_YEAR;
  const parentSpecs = [
    { id: "mother", type: "mother", gender: "female", birthDay: motherBirthDay },
    { id: "father", type: "father", gender: "male", birthDay: fatherBirthDay },
  ] as const;
  for (const spec of parentSpecs) {
    addMember(
      buildFamilyMember(
        `${terrestrial.id}-${spec.id}`,
        spec.type,
        spec.gender,
        spec.birthDay,
        names.first(spec.gender),
        familySurname,
        terrestrial,
        currentDay,
        rng,
      ),
    );
  }

  // Siblings: positive gap = older than the Terrestrial, negative = younger.
  const terrestrialAge = ageInYears(terrestrial.birthDay, currentDay);
  const maxOlder = Math.min(
    rules.maxSiblingAgeGap,
    motherGap - rules.minParentAgeAtBirth,
    fatherGap - rules.minParentAgeAtBirth,
  );
  const maxYounger = Math.min(
    rules.maxSiblingAgeGap,
    terrestrialAge,
    rules.maxMotherAgeAtBirth - motherGap,
  );
  const siblingCount = rng.nextInt(0, rules.maxSiblings);
  for (let i = 0; i < siblingCount; i++) {
    const gapYears = rng.nextInt(-maxYounger, maxOlder);
    const gender: Gender = rng.nextBool() ? "male" : "female";
    addMember(
      buildFamilyMember(
        `${terrestrial.id}-sibling-${i}`,
        "sibling",
        gender,
        terrestrial.birthDay - gapYears * DAYS_PER_YEAR,
        names.first(gender),
        familySurname,
        terrestrial,
        currentDay,
        rng,
      ),
    );
  }

  // Grandparents: roll all four, keep the living ones, then choose 0-2.
  const candidates: GrandparentCandidate[] = [motherBirthDay, fatherBirthDay].flatMap(
    (parentBirthDay) =>
      (["grandmother", "grandfather"] as const).map((relationshipType) => ({
        relationshipType,
        birthDay:
          parentBirthDay -
          rng.nextInt(rules.grandparentAgeGap[0], rules.grandparentAgeGap[1]) * DAYS_PER_YEAR,
      })),
  );
  const living = candidates.filter(
    (candidate) => ageInYears(candidate.birthDay, currentDay) <= rules.maxLivingAge,
  );
  const grandparentCount = rng.nextInt(0, Math.min(rules.maxLivingGrandparents, living.length));
  shuffled(living, rng)
    .slice(0, grandparentCount)
    .forEach((candidate, index) => {
      const gender: Gender = candidate.relationshipType === "grandmother" ? "female" : "male";
      addMember(
        buildFamilyMember(
          `${terrestrial.id}-grandparent-${index}`,
          candidate.relationshipType,
          gender,
          candidate.birthDay,
          names.first(gender),
          familySurname,
          terrestrial,
          currentDay,
          rng,
        ),
      );
    });

  return {
    terrestrialId: terrestrial.id,
    members,
    relationships,
  };
}
