import type { LifeStage } from "./terrestrial.js";

/** Placeholder — fleshed out in Phase 1's event-table work. */
export interface LifeEvent {
  id: string;
  title: string;
  applicableLifeStages: LifeStage[];
  weight: number;
}
