# PRD — Terradian

| Field            | Detail        |
| ---------------- | ------------- |
| **Product Name** | Terradian     |
| **PM**           | Neelabja Saha |
| **Date**         | 2026-11-05    |
| **Status**       | Draft         |

---

## 1. One-Sentence Definition

Terradian is a deterministic life-simulation game where a player's character (a "Terrestrial") is born into a generated family and lives a full life of school, work, travel and play on a real-world map, playable by humans and AI agents.

## 2. Problem

### 2.1 Context

Life-simulation games are popular, but most are built as closed apps: game logic is tangled with UI, randomness is not reproducible, and nothing outside the app can play or inspect a life.

### 2.2 The Gap

There is no life sim designed engine-first, where the same simulation can be driven from a terminal, an API, an MCP-connected AI agent or a 3D client, and where any life can be replayed exactly from its seed and choices.

### 2.3 Why This Matters Now

AI agents can now use tools through MCP. A simulation built as a clean library with typed tools is a natural playground for agents, and a good way to learn and demonstrate modern system design end to end.

## 3. Goal

Ship a simulation engine that can run a believable life from birth to death, deterministically, and expose it through progressively richer surfaces: CLI, MCP, GraphQL/REST, a 3D web client, and multiplayer.

## 4. Scope — V1 (Phase 1)

### 4.1 In Scope

- Terrestrial creation with Big Five personality and stats
- Procedural family generation with closeness relationships
- Life-stage state machine
- Data-driven life events with player choices
- World clock, daily ticks, mortality and life summary
- Family members simulated as NPCs
- CLI game loop with save/load
- MCP server v1 so Claude can play

### 4.2 Out of Scope — V1

- Economy, careers, education depth, activities and milestones (Phase 2)
- Persistence, REST and auth (Phase 3)
- 3D world and HUD (Phase 4)
- Travel, live updates, multiplayer and the LLM event director (Phases 5-7)

## 5. Architecture

### 5.1 Technology Decisions

| Decision      | Choice                                           | Reason                                                       |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| Language      | TypeScript (strict)                              | One language from engine to web client; shared types         |
| Repo layout   | pnpm monorepo                                    | Engine stays a pure library; each surface is its own package |
| Randomness    | Single seeded RNG (mulberry32) with save/restore | Exact replays, reproducible tests and bug reports            |
| State updates | Pure functions returning new objects             | Safe to replay, easy to test, no hidden side effects         |
| Content       | Data files (JSON)                                | Tune events, names and jobs without code changes             |
| Tests         | Vitest                                           | Fast, TypeScript-native                                      |

### 5.2 System Architecture

See [architecture.md](architecture.md).

## 6. Component Specifications

| Component        | Module | Summary                                                                                                                          |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Terrestrial      | 1      | Identity, location, socioeconomic tier, personality, stats (health, happiness, intelligence, energy, stress, wealth), life stage |
| Family generator | 2      | Parents, 0-3 siblings, 0-2 grandparents with plausible ages and directed closeness edges                                         |
| Life-stage FSM   | 3      | Table-driven transitions, time budgets and daily stat drift per stage                                                            |
| Life events      | 4      | 40+ JSON events, weighted by personality, with choices and cooldowns                                                             |
| World clock      | 5      | Daily ticks, calendar, mortality, JSON save/load with RNG state                                                                  |
| Family NPCs      | 6      | NPC arcs and coupled events that affect the player                                                                               |
| CLI              | 7      | Interactive and auto modes, seeds, save/load                                                                                     |
| MCP server v1    | 8      | Tools to create, advance, choose, inspect and save                                                                               |

Full per-module requirements live in [ROADMAP.md](ROADMAP.md).

## 7. Non-Functional Requirements

- **Determinism:** same seed and same choices must produce an identical history.
- **Invariants:** stats always stay in range (0-100, wealth >= 0) across thousands of seeded runs.
- **Purity:** no I/O inside the simulation engine.
- **Quality gates:** typecheck, lint and tests pass in CI on every push to `main` and `develop`.

## 8. Success Metrics

| Metric                 | Target                                                     |
| ---------------------- | ---------------------------------------------------------- |
| Replay determinism     | 100% identical histories for the same seed and choices     |
| Headless full life     | A 0-to-death run completes with zero invariant violations  |
| Agent playability      | Claude plays one in-game week through MCP tools            |
| Test coverage of rules | Every module ships determinism, bounds and edge-case tests |

## 9. Project Structure

```
terradian/
├── packages/
│   ├── shared/              # shared types
│   └── simulation-engine/   # pure game logic + tests
├── docs/
│   ├── PRD.md
│   ├── ROADMAP.md
│   ├── architecture.md
│   ├── architecture/        # detailed diagrams (e.g. life-stage FSM)
│   ├── design/              # design docs (e.g. economy)
│   └── PM_RETROSPECTIVE.md
└── .github/workflows/ci.yml
```

## 10. V2 Roadmap

Phases 2-7 add the economy, career, education, activities and milestones; APIs, persistence and auth; the 3D world; travel and live updates; multiplayer; and an LLM event director. See [ROADMAP.md](ROADMAP.md).

## 11. Open Questions

- **Life-stage names:** code uses `infant` and `retirement`; the module prompts say `child ... retired`. Decide before module 3.
- **Career vs education order:** career eligibility (module 10) depends on education history (module 11). Build 11 first, or stub education in 10.
- **Keeping CLI and MCP current:** modules 9-13 should extend the CLI and MCP tools as they land, or they will fall behind.
- **3D collision:** raycasting against Google 3D tiles must be checked against the Map Tiles API terms before module 18.
- **gRPC in module 22:** consider whether HTTP or the event bus is enough before adding a new protocol.

## 12. Dependencies

- Node 20+, pnpm 9
- Later: MCP TypeScript SDK, Postgres, Google Map Tiles API key
