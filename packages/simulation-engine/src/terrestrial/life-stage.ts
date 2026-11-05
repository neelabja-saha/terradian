import type { LifeStage } from "@terradian/shared";

/** Rough age bands used to derive a plausible life stage for generated NPCs. */
export function lifeStageForAge(age: number): LifeStage {
  if (age < 3) return "infant";
  if (age < 13) return "child";
  if (age < 19) return "student";
  if (age < 23) return "college";
  if (age < 65) return "career";
  return "retirement";
}
