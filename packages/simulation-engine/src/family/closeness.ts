import type { PersonalityTraits, RelationshipType } from "@terradian/shared";
import type { Rng } from "../rng.js";
import { clamp } from "../util.js";

/** Starting-point closeness before personality/noise adjustment. */
const BASE_CLOSENESS: Record<RelationshipType, number> = {
  mother: 70,
  father: 70,
  sibling: 55,
  grandmother: 60,
  grandfather: 60,
};

/** Points of closeness per trait point away from the midpoint (50). */
const AGREEABLENESS_WEIGHT = 0.3;
const NEUROTICISM_WEIGHT = 0.2;
const NOISE_RANGE = 10;

/**
 * Closeness (0-100) as felt by the person with `fromPersonality` towards a
 * family member. Agreeableness raises it, neuroticism lowers it, and a small
 * random component keeps results varied but bounded. Always draws exactly
 * one rng value.
 */
export function computeCloseness(
  relationshipType: RelationshipType,
  fromPersonality: PersonalityTraits,
  rng: Rng,
): number {
  const agreeablenessBonus = (fromPersonality.agreeableness - 50) * AGREEABLENESS_WEIGHT;
  const neuroticismPenalty = (fromPersonality.neuroticism - 50) * NEUROTICISM_WEIGHT;
  const noise = rng.nextInt(-NOISE_RANGE, NOISE_RANGE);
  return clamp(
    Math.round(BASE_CLOSENESS[relationshipType] + agreeablenessBonus - neuroticismPenalty + noise),
    0,
    100,
  );
}
