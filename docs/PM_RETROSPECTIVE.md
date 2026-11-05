# PM Retrospective — terradian

A running log of design decisions, edge cases, trade-offs, and planned enhancements discovered during the development of this project.

---

## Entry 1 — TypeScript Project References Removed

**Observation:**
The scaffold used TypeScript project references with `composite: true`, while each package's `main` pointed at its raw `src/index.ts`. Running `tsc --noEmit` in `simulation-engine` failed with `TS6305` ("output file has not been built"), because references expect the referenced package to be built first. Every other type error downstream was a side effect of this.

**Decision:**
Removed `composite`, declaration output and project references. Each package now typechecks its own source directly, and `@terradian/shared` resolves to its source through the pnpm workspace link.

**Why This Matters:**
The quality gate in CI could never have passed. With no build step yet, source-level typechecking is the simplest setup that works.

**Files Affected:** `tsconfig.base.json`, `tsconfig.json`, `packages/*/tsconfig.json`

**Future Enhancement:**
If packages are ever published or bundled separately, reintroduce a build step and project references together.

---

## Entry 2 — RNG Save and Restore

**Observation:**
The seeded RNG kept its position in a closure, so there was no way to save mid-game and continue the same random sequence. Module 5 requires that a saved game replays exactly.

**Decision:**
Rewrote the generator around an explicit integer state. Added `getState()` to the `Rng` interface and `restoreRng(seed, state)` to rebuild an RNG at a saved position. The initial state equals the seed, so every existing seed still produces the same numbers.

**Why This Matters:**
Determinism is the core promise of the engine. Without savable RNG state, save/load would silently produce a different future than an uninterrupted run.

**Files Affected:** `packages/simulation-engine/src/rng.ts`

---

## Entry 3 — Energy and Stress Added to Stats

**Observation:**
`Stats` only had health, happiness, intelligence and wealth. Modules 3, 5, 10 and 12 all depend on energy (spent by activities, recovered by rest) and stress (raised by work and events).

**Decision:**
Added `energy` and `stress` (both 0-100) to the shared `Stats` type now, with starting rolls of 60-100 and 5-40.

**Why This Matters:**
Adding fields to a core shared type is cheapest before many modules depend on it.

**Files Affected:** `packages/shared/src/terrestrial.ts`, `packages/simulation-engine/src/terrestrial/stats.ts`

---

## Entry 4 — Health Trends With Socioeconomic Tier

**Observation:**
Only wealth depended on tier. The family generator spec asks that members inherit health tendencies from the tier as well.

**Decision:**
Each tier now has its own starting health range, from 35-80 (low) to 50-95 (high). The ranges overlap, so tier is a tendency rather than a rule. The family generator reuses `generateStats`, so it inherits this automatically.

**Why This Matters:**
Keeps the rule in one place instead of re-implementing it for NPCs.

**Files Affected:** `packages/simulation-engine/src/terrestrial/stats.ts`

---

## Entry 5 — Wealth Is Money, Not Spark Points

**Observation:**
`Stats.wealth` was documented as the "spark points balance". Module 9 requires in-game money and spark points to be separate, with spark points derived from an append-only ledger.

**Decision:**
Re-documented `wealth` as in-game money. Spark points will live only in the ledger.

**Why This Matters:**
Storing a balance on the character would conflict with the ledger-as-source-of-truth design and invite the two drifting apart.

**Files Affected:** `packages/shared/src/terrestrial.ts`

---

## Entry 6 — Personality Overrides Without Changing RNG Consumption

**Observation:**
The CLI (module 7) lets players set personality sliders. If overriding traits skipped RNG draws, every later roll (stats, family) would shift, and the same seed would give a different family depending on whether sliders were used.

**Decision:**
`createTerrestrial` always rolls the full personality first, then applies any overrides (rounded and clamped to 0-100). A test asserts that stats are identical with and without overrides.

**Why This Matters:**
Player choices should change only what they touch, not reshuffle unrelated randomness.

**Files Affected:** `packages/simulation-engine/src/terrestrial/terrestrial.ts`

---

## Entry 7 — Input Validation at Creation

**Observation:**
`createTerrestrial` accepted a birth day in the future, fractional days and empty names, producing characters with negative ages.

**Decision:**
Throws a `RangeError` with a clear message for each of these cases. Being born on the current day is allowed.

**Files Affected:** `packages/simulation-engine/src/terrestrial/terrestrial.ts`

---

## Entry 8 — Tests Co-located With Source

**Observation:**
Other projects keep tests in a top-level `tests/` folder. Here, each package's `tsconfig` only includes `src`, so tests elsewhere would not be typechecked.

**Decision:**
Tests live next to the code as `*.test.ts`. They are typechecked, linted and run by Vitest. Module 1 now has 57 tests covering determinism, bounds over 200 seeds and every tier, life-stage boundaries, RNG save/restore and validation.

**Files Affected:** `packages/simulation-engine/src/**/*.test.ts`

---

## Entry 9 — Open: Life-Stage Naming

**Observation:**
The code uses `infant ... retirement`; the module 3 spec uses `child ... retired`.

**Decision:**
Deferred to module 3, where the state machine will define the canonical stage list.

**Priority:** Must resolve before module 3.

---

## Entry 10 — Open: Line Endings on Windows

**Observation:**
Git on this machine converts LF to CRLF on checkout, while Prettier expects LF. A fresh checkout could fail `format:check`.

**Decision:**
Added `.gitattributes` with `* text=auto eol=lf`, so every checkout keeps LF regardless of local Git settings.

**Files Affected:** `.gitattributes`

---

## Entry 11 — Neuroticism Lowers Family Closeness

**Observation:**
The spec says agreeableness raises closeness and neuroticism lowers it. Only agreeableness was used.

**Decision:**
`computeCloseness` now takes the whole personality: +0.3 per agreeableness point above 50, -0.2 per neuroticism point above 50, plus noise of ±10, clamped to 0-100. It still draws exactly one rng value, which a test asserts.

**Why This Matters:**
Personality should visibly shape relationships from day one, and the module 4 event weights will build on the same idea.

**Files Affected:** `packages/simulation-engine/src/family/closeness.ts`

---

## Entry 12 — Name Lists Moved to a Validated Data File

**Observation:**
Names were a TypeScript constant, against the rule that content lives in data files.

**Decision:**
Names now live in `data/names.json`, keyed by country with a required `default` set. `parseNameData` validates the file when it loads and names the exact bad entry (for example `"India.female[3]" must be a non-empty string`). Lists grew from 6 to 8 first names per gender.

**Why This Matters:**
Adding a country is now a data change. Validation at load time means a typo fails immediately instead of producing a nameless character mid-game. This is the pattern module 4's event files will follow.

**Files Affected:** `packages/simulation-engine/data/names.json`, `packages/simulation-engine/src/family/name-data.ts`

---

## Entry 13 — Plausible Family Ages and Deceased Relatives

**Observation:**
Reviewing the generator showed three implausible outcomes:

- An older sibling could be born when the mother was 8 (sibling 12 years older, mother only 20 years older).
- An 80-year-old Terrestrial could have living parents aged 120 and grandparents of 150.
- A newborn's younger siblings were clamped to "born today", producing same-day siblings.

**Decision:**
Age rules are now explicit in `FAMILY_AGE_RULES`:

- Sibling gaps are limited so both parents are at least 18, and the mother at most 45, at every birth. Younger siblings are never born after the current day.
- Parents older than 100 are generated with `isAlive: false`. They stay in the family because they still matter to the story.
- All four grandparents are rolled, only living ones (100 or under) are kept, and 0-2 of those are chosen.

**Why This Matters:**
Module 6 will age and kill NPCs from this starting point, so the starting family has to be believable for players of any age.

**Files Affected:** `packages/simulation-engine/src/family/family.ts`

**Future Enhancement:**
A probabilistic death roll for elderly relatives (instead of a hard 100-year cutoff) belongs with module 5's mortality model.

---

## Entry 14 — Family Surname and Unique First Names

**Observation:**
The family surname was rolled independently, so "Asha Rao" could get the "Sharma" family. First names could repeat inside one family.

**Decision:**
The family takes the Terrestrial's surname (last word of the name). A surname is only rolled when the Terrestrial has a single name, and it is always drawn so rng use stays the same either way. First names avoid repeats, including the Terrestrial's own, when the list has enough names.

**Files Affected:** `packages/simulation-engine/src/family/family.ts`

**Future Enhancement:**
Maternal grandparents currently share the family surname. Separate maternal and paternal surnames could come with marriages in module 6.
