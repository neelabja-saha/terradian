import type { PersonalityTraits } from "@terradian/shared";
import type { Rng } from "../rng.js";

/** Generates an independent, uniformly random Big Five profile (each trait 0-100). */
export function generatePersonality(rng: Rng): PersonalityTraits {
  return {
    openness: rng.nextInt(0, 100),
    conscientiousness: rng.nextInt(0, 100),
    extraversion: rng.nextInt(0, 100),
    agreeableness: rng.nextInt(0, 100),
    neuroticism: rng.nextInt(0, 100),
  };
}
