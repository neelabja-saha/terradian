/**
 * Seeded RNG — the ONLY source of randomness allowed anywhere in the
 * simulation engine. Never call Math.random() directly: the same seed must
 * always produce the same simulation result.
 */
export interface Rng {
  readonly seed: number;
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive on both ends. */
  nextInt(min: number, max: number): number;
  /** Float in [min, max). */
  nextFloat(min: number, max: number): number;
  /** True with the given probability (default 0.5). */
  nextBool(probability?: number): boolean;
  /** Picks a uniformly random element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /**
   * Internal position of the generator. Store it with a saved game and pass
   * it to restoreRng to continue the exact same sequence.
   */
  getState(): number;
}

/** Hashes an arbitrary string seed into a 32-bit unsigned int (cyrb53-style mix). */
function hashStringSeed(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

/** One mulberry32 step: small, fast, good-enough-for-games PRNG. */
function mulberry32Step(state: number): { state: number; value: number } {
  const next = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { state: next, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

class SeededRng implements Rng {
  readonly seed: number;
  private state: number;

  constructor(seed: number, state: number) {
    this.seed = seed >>> 0;
    this.state = state | 0;
  }

  next(): number {
    const step = mulberry32Step(this.state);
    this.state = step.state;
    return step.value;
  }

  getState(): number {
    return this.state;
  }

  nextInt(min: number, max: number): number {
    if (min > max) {
      throw new RangeError(`nextInt: min (${min}) must be <= max (${max})`);
    }
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    if (min > max) {
      throw new RangeError(`nextFloat: min (${min}) must be <= max (${max})`);
    }
    return this.next() * (max - min) + min;
  }

  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError("pick: items must not be empty");
    }
    return items[this.nextInt(0, items.length - 1)] as T;
  }
}

/** Creates a seeded RNG. String seeds are hashed deterministically into a number. */
export function createRng(seed: number | string): Rng {
  const numericSeed = typeof seed === "number" ? seed >>> 0 : hashStringSeed(seed);
  return new SeededRng(numericSeed, numericSeed);
}

/**
 * Recreates an RNG at a saved position. The restored RNG produces exactly the
 * values the original would have produced next.
 */
export function restoreRng(seed: number, state: number): Rng {
  if (!Number.isInteger(seed) || !Number.isInteger(state)) {
    throw new TypeError(`restoreRng: seed and state must be integers (got ${seed}, ${state})`);
  }
  return new SeededRng(seed, state);
}
