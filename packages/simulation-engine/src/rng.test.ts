import { describe, expect, it } from "vitest";
import { createRng, restoreRng } from "./rng.js";

function draw(rng: ReturnType<typeof createRng>, count: number): number[] {
  return Array.from({ length: count }, () => rng.next());
}

describe("createRng", () => {
  it("gives the same sequence for the same numeric seed", () => {
    expect(draw(createRng(42), 50)).toEqual(draw(createRng(42), 50));
  });

  it("gives the same sequence for the same string seed", () => {
    expect(draw(createRng("terradian"), 50)).toEqual(draw(createRng("terradian"), 50));
  });

  it("gives different sequences for different seeds", () => {
    expect(draw(createRng(1), 10)).not.toEqual(draw(createRng(2), 10));
    expect(draw(createRng("a"), 10)).not.toEqual(draw(createRng("b"), 10));
  });

  it("normalises negative and large seeds to unsigned 32-bit", () => {
    expect(createRng(-1).seed).toBe(0xffffffff);
    expect(createRng(2 ** 32 + 5).seed).toBe(5);
  });

  it("keeps next() in [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("nextInt", () => {
  it("stays within inclusive bounds and reaches both ends", () => {
    const rng = createRng(123);
    const seen = new Set<number>();
    for (let i = 0; i < 5_000; i++) {
      const value = rng.nextInt(-3, 3);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThanOrEqual(3);
      seen.add(value);
    }
    expect(seen.size).toBe(7);
  });

  it("returns min when min equals max", () => {
    expect(createRng(1).nextInt(5, 5)).toBe(5);
  });

  it("throws when min > max", () => {
    expect(() => createRng(1).nextInt(5, 4)).toThrow(RangeError);
  });
});

describe("nextFloat", () => {
  it("stays within [min, max)", () => {
    const rng = createRng(9);
    for (let i = 0; i < 5_000; i++) {
      const value = rng.nextFloat(-2.5, 2.5);
      expect(value).toBeGreaterThanOrEqual(-2.5);
      expect(value).toBeLessThan(2.5);
    }
  });

  it("throws when min > max", () => {
    expect(() => createRng(1).nextFloat(1, 0)).toThrow(RangeError);
  });
});

describe("nextBool", () => {
  it("respects probability 0 and 1", () => {
    const rng = createRng(3);
    for (let i = 0; i < 1_000; i++) {
      expect(rng.nextBool(0)).toBe(false);
      expect(rng.nextBool(1)).toBe(true);
    }
  });

  it("is roughly fair by default", () => {
    const rng = createRng(11);
    let trues = 0;
    const trials = 20_000;
    for (let i = 0; i < trials; i++) if (rng.nextBool()) trues++;
    expect(trues / trials).toBeGreaterThan(0.47);
    expect(trues / trials).toBeLessThan(0.53);
  });
});

describe("pick", () => {
  it("only returns items from the array and reaches all of them", () => {
    const rng = createRng(5);
    const items = ["a", "b", "c", "d"] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 1_000; i++) {
      const value = rng.pick(items);
      expect(items).toContain(value);
      seen.add(value);
    }
    expect(seen.size).toBe(items.length);
  });

  it("throws on an empty array", () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });
});

describe("getState / restoreRng", () => {
  it("continues the exact sequence from a saved position", () => {
    const original = createRng("save-test");
    draw(original, 37);
    const restored = restoreRng(original.seed, original.getState());
    expect(draw(restored, 100)).toEqual(draw(original, 100));
  });

  it("restoring at the initial state matches a fresh rng", () => {
    const fresh = createRng(99);
    const restored = restoreRng(fresh.seed, fresh.getState());
    expect(draw(restored, 20)).toEqual(draw(createRng(99), 20));
  });

  it("survives a JSON round trip", () => {
    const original = createRng(2024);
    draw(original, 10);
    const saved = JSON.parse(
      JSON.stringify({ seed: original.seed, state: original.getState() }),
    ) as {
      seed: number;
      state: number;
    };
    const restored = restoreRng(saved.seed, saved.state);
    expect(draw(restored, 20)).toEqual(draw(original, 20));
  });

  it("rejects non-integer seed or state", () => {
    expect(() => restoreRng(1.5, 0)).toThrow(TypeError);
    expect(() => restoreRng(1, Number.NaN)).toThrow(TypeError);
  });
});
