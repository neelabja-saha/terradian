import type { SocioeconomicTier, Stats } from "@terradian/shared";
import type { Rng } from "../rng.js";

/** Starting wealth (in-game money) range per socioeconomic tier. */
const WEALTH_RANGE_BY_TIER: Record<SocioeconomicTier, readonly [number, number]> = {
  low: [0, 2000],
  "lower-middle": [1500, 5000],
  middle: [4000, 12000],
  "upper-middle": [10000, 30000],
  high: [25000, 100000],
};

/**
 * Starting health range per tier. Better-off households tend to start
 * healthier, but the ranges overlap so tier is a tendency, not a rule.
 */
const HEALTH_RANGE_BY_TIER: Record<SocioeconomicTier, readonly [number, number]> = {
  low: [35, 80],
  "lower-middle": [40, 85],
  middle: [40, 90],
  "upper-middle": [45, 92],
  high: [50, 95],
};

/**
 * Generates starting stats. Wealth and health depend on tier; happiness,
 * intelligence, energy and stress do not.
 */
export function generateStats(tier: SocioeconomicTier, rng: Rng): Stats {
  const [minHealth, maxHealth] = HEALTH_RANGE_BY_TIER[tier];
  const [minWealth, maxWealth] = WEALTH_RANGE_BY_TIER[tier];
  return {
    health: rng.nextInt(minHealth, maxHealth),
    happiness: rng.nextInt(40, 90),
    intelligence: rng.nextInt(40, 90),
    energy: rng.nextInt(60, 100),
    stress: rng.nextInt(5, 40),
    wealth: rng.nextInt(minWealth, maxWealth),
  };
}
