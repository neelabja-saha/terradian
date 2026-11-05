import type { RelationshipType } from "@terradian/shared";
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

/**
 * Closeness as perceived by `fromAgreeableness`'s owner looking at the other
 * person. Higher agreeableness raises how close someone feels to their
 * family; a small random component keeps results varied but bounded.
 */
export function computeCloseness(
  relationshipType: RelationshipType,
  fromAgreeableness: number,
  rng: Rng,
): number {
  const agreeablenessBonus = (fromAgreeableness - 50) * 0.3;
  const noise = rng.nextInt(-10, 10);
  return clamp(Math.round(BASE_CLOSENESS[relationshipType] + agreeablenessBonus + noise), 0, 100);
}
