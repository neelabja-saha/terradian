import type {
  Gender,
  Location,
  PersonalityTraits,
  SocioeconomicTier,
  Terrestrial,
} from "@terradian/shared";
import type { Rng } from "../rng.js";
import { ageInYears, clamp } from "../util.js";
import { lifeStageForAge } from "./life-stage.js";
import { generatePersonality } from "./personality.js";
import { generateStats } from "./stats.js";

export interface CreateTerrestrialInput {
  id: string;
  name: string;
  gender: Gender;
  birthDay: number;
  location: Location;
  socioeconomicTier: SocioeconomicTier;
  /**
   * Optional player-chosen traits (e.g. sliders). Any trait left out is
   * rolled; given values are rounded and clamped to 0-100.
   */
  personality?: Partial<PersonalityTraits>;
}

function validateInput(input: CreateTerrestrialInput, currentDay: number): void {
  if (input.id.trim() === "") {
    throw new RangeError("createTerrestrial: id must not be empty");
  }
  if (input.name.trim() === "") {
    throw new RangeError("createTerrestrial: name must not be empty");
  }
  if (!Number.isInteger(input.birthDay) || !Number.isInteger(currentDay)) {
    throw new RangeError(
      `createTerrestrial: birthDay and currentDay must be integers (got ${input.birthDay}, ${currentDay})`,
    );
  }
  if (input.birthDay > currentDay) {
    throw new RangeError(
      `createTerrestrial: birthDay (${input.birthDay}) must not be after currentDay (${currentDay})`,
    );
  }
}

function applyPersonalityOverrides(
  rolled: PersonalityTraits,
  overrides: Partial<PersonalityTraits> | undefined,
): PersonalityTraits {
  if (overrides === undefined) return rolled;
  const result = { ...rolled };
  for (const key of Object.keys(rolled) as (keyof PersonalityTraits)[]) {
    const value = overrides[key];
    if (value !== undefined) {
      if (!Number.isFinite(value)) {
        throw new RangeError(`createTerrestrial: personality.${key} must be a finite number`);
      }
      result[key] = clamp(Math.round(value), 0, 100);
    }
  }
  return result;
}

/**
 * Builds a full Terrestrial: personality and stats are rolled via the
 * supplied rng, life stage is derived from age relative to currentDay.
 * Personality is always rolled before overrides are applied, so the rng is
 * consumed the same way with or without overrides.
 */
export function createTerrestrial(
  input: CreateTerrestrialInput,
  currentDay: number,
  rng: Rng,
): Terrestrial {
  validateInput(input, currentDay);
  const age = ageInYears(input.birthDay, currentDay);
  const personality = applyPersonalityOverrides(generatePersonality(rng), input.personality);
  return {
    id: input.id,
    name: input.name,
    gender: input.gender,
    birthDay: input.birthDay,
    location: { ...input.location },
    socioeconomicTier: input.socioeconomicTier,
    personality,
    stats: generateStats(input.socioeconomicTier, rng),
    lifeStage: lifeStageForAge(age),
  };
}
