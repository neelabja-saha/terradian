export type Gender = "male" | "female";

export type SocioeconomicTier = "low" | "lower-middle" | "middle" | "upper-middle" | "high";

export type LifeStage = "infant" | "child" | "student" | "college" | "career" | "retirement";

export interface Location {
  city: string;
  region: string;
  country: string;
}

/** Big Five traits, each 0-100. */
export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface Stats {
  /** 0-100 */
  health: number;
  /** 0-100 */
  happiness: number;
  /** 0-100 */
  intelligence: number;
  /** 0-100. Recovers with rest, spent by activities and work. */
  energy: number;
  /** 0-100. Higher is worse. */
  stress: number;
  /**
   * In-game money, >= 0. Kept separate from spark points, which live in the
   * economy ledger (module 9).
   */
  wealth: number;
}

export interface Terrestrial {
  id: string;
  name: string;
  gender: Gender;
  /** Simulation day index (day 0 = epoch) the Terrestrial was born on. */
  birthDay: number;
  location: Location;
  socioeconomicTier: SocioeconomicTier;
  personality: PersonalityTraits;
  stats: Stats;
  lifeStage: LifeStage;
}
