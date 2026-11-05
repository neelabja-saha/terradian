import type { Terrestrial } from "./terrestrial.js";

export type RelationshipType = "mother" | "father" | "sibling" | "grandmother" | "grandfather";

/** A family NPC. Carries full Terrestrial fields plus family-specific metadata. */
export interface FamilyMember extends Terrestrial {
  relationshipType: RelationshipType;
  isAlive: boolean;
}

/**
 * A directed closeness edge. Two edges exist per pair (fromId -> toId and
 * toId -> fromId) because each side's closeness is influenced by that side's
 * own personality and is not assumed to be symmetric.
 */
export interface Relationship {
  fromId: string;
  toId: string;
  /** 0-100 */
  closeness: number;
}

export interface Family {
  terrestrialId: string;
  members: FamilyMember[];
  relationships: Relationship[];
}
