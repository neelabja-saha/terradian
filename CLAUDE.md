# CLAUDE.md

Terradian is a TypeScript pnpm monorepo for a life-simulation game. Players create a "Terrestrial" (character), get a procedurally generated family, and live a life of school, work, travel and play on a real-world map.

Read [README.md](README.md), [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/architecture.md](docs/architecture.md) before starting a module.

## Commands

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check   # pnpm format to fix
pnpm test
```

All four checks must pass before starting a module and before finishing one.

Local machine note: Node lives in `C:\Program Files\nodejs` and may not be on the shell PATH. If `pnpm` is missing, run it as `npx -y pnpm@9.15.0 <command>` after adding that folder to PATH.

## Engine rules

- All randomness goes through the seeded `Rng` (`packages/simulation-engine/src/rng.ts`). Never `Math.random()`. Same seed and input must give the same output.
- Game logic is pure and immutable: functions return updated copies and never mutate inputs. No I/O inside `simulation-engine`.
- Optional player choices must not change how the RNG is consumed (roll first, then override).
- Shared types live in `packages/shared`; extend them there rather than redefining.
- Content (event tables, name lists, job lists) lives in data files under `packages/simulation-engine/data/`, validated at load time with clear errors.

## Tests

- Vitest, co-located with source as `*.test.ts` (so they are typechecked).
- Every module covers determinism per seed, bounds and invariants over many seeds (200+), and edge cases.

## Docs

Follow the project template used across this GitHub profile:

- `README.md`: keep the Package Status table current.
- `docs/ROADMAP.md`: update module status when a module starts or finishes.
- `docs/PM_RETROSPECTIVE.md`: add an `## Entry N — Title` for each notable decision, with **Observation**, **Decision**, **Why This Matters** and **Files Affected** (plus **Future Enhancement** / **Priority** when relevant).
- `docs/PRD.md`: update Open Questions as they are resolved.
- Detailed diagrams go in `docs/architecture/`, design docs in `docs/design/`.

## Git

- Work on `develop`; merge to `main` through pull requests.
- Small commits using Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:` (scope optional, e.g. `feat(simulation-engine):`).
- Remote is SSH: `git@github.com:neelabja-saha/terradian.git`.
