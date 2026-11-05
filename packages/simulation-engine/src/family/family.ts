import type {
  Family,
  FamilyMember,
  Gender,
  Relationship,
  RelationshipType,
  Terrestrial,
} from "@terradian/shared";
import type { Rng } from "../rng.js";
import { createTerrestrial } from "../terrestrial/terrestrial.js";
import { DAYS_PER_YEAR } from "../util.js";
import { computeCloseness } from "./closeness.js";
import { getNameSet, type NameSet } from "./name-data.js";

function buildFamilyMember(
  id: string,
  relationshipType: RelationshipType,
  gender: Gender,
  birthDay: number,
  nameSet: NameSet,
  familySurname: string,
  terrestrial: Terrestrial,
  currentDay: number,
  rng: Rng,
): FamilyMember {
  const firstName = rng.pick(gender === "male" ? nameSet.male : nameSet.female);
  const base = createTerrestrial(
    {
      id,
      name: `${firstName} ${familySurname}`,
      gender,
      birthDay,
      location: terrestrial.location,
      socioeconomicTier: terrestrial.socioeconomicTier,
    },
    currentDay,
    rng,
  );
  return { ...base, relationshipType, isAlive: true };
}

interface GrandparentSlot {
  relationshipType: "grandmother" | "grandfather";
  parentBirthDay: number;
}

/**
 * Generates a player Terrestrial's family: a mother and father (~20-40 years
 * older), 0-3 siblings (within ~12 years of the player), and 0-2 living
 * grandparents (~20-35 years older than their child). All randomness flows
 * through `rng`, so the same inputs always produce the same family.
 */
export function generateFamily(terrestrial: Terrestrial, rng: Rng, currentDay: number): Family {
  const nameSet = getNameSet(terrestrial.location.country);
  const familySurname = rng.pick(nameSet.surnames);

  const members: FamilyMember[] = [];
  const relationships: Relationship[] = [];

  const addMember = (member: FamilyMember): void => {
    members.push(member);
    relationships.push(
      {
        fromId: terrestrial.id,
        toId: member.id,
        closeness: computeCloseness(
          member.relationshipType,
          terrestrial.personality.agreeableness,
          rng,
        ),
      },
      {
        fromId: member.id,
        toId: terrestrial.id,
        closeness: computeCloseness(member.relationshipType, member.personality.agreeableness, rng),
      },
    );
  };

  const motherBirthDay = terrestrial.birthDay - rng.nextInt(20, 40) * DAYS_PER_YEAR;
  const mother = buildFamilyMember(
    `${terrestrial.id}-mother`,
    "mother",
    "female",
    motherBirthDay,
    nameSet,
    familySurname,
    terrestrial,
    currentDay,
    rng,
  );
  addMember(mother);

  const fatherBirthDay = terrestrial.birthDay - rng.nextInt(20, 40) * DAYS_PER_YEAR;
  const father = buildFamilyMember(
    `${terrestrial.id}-father`,
    "father",
    "male",
    fatherBirthDay,
    nameSet,
    familySurname,
    terrestrial,
    currentDay,
    rng,
  );
  addMember(father);

  const siblingCount = rng.nextInt(0, 3);
  for (let i = 0; i < siblingCount; i++) {
    const ageDiffYears = rng.nextInt(-12, 12);
    let siblingBirthDay = terrestrial.birthDay - ageDiffYears * DAYS_PER_YEAR;
    if (siblingBirthDay > currentDay) {
      siblingBirthDay = currentDay;
    }
    const siblingGender: Gender = rng.nextBool() ? "male" : "female";
    const sibling = buildFamilyMember(
      `${terrestrial.id}-sibling-${i}`,
      "sibling",
      siblingGender,
      siblingBirthDay,
      nameSet,
      familySurname,
      terrestrial,
      currentDay,
      rng,
    );
    addMember(sibling);
  }

  const grandparentSlots: GrandparentSlot[] = [
    { relationshipType: "grandmother", parentBirthDay: motherBirthDay },
    { relationshipType: "grandfather", parentBirthDay: motherBirthDay },
    { relationshipType: "grandmother", parentBirthDay: fatherBirthDay },
    { relationshipType: "grandfather", parentBirthDay: fatherBirthDay },
  ];
  const grandparentCount = rng.nextInt(0, 2);
  const chosenSlotIndices = new Set<number>();
  while (chosenSlotIndices.size < grandparentCount) {
    chosenSlotIndices.add(rng.nextInt(0, grandparentSlots.length - 1));
  }

  let grandparentIndex = 0;
  for (const slotIndex of chosenSlotIndices) {
    const slot = grandparentSlots[slotIndex] as GrandparentSlot;
    const grandparentBirthDay = slot.parentBirthDay - rng.nextInt(20, 35) * DAYS_PER_YEAR;
    const gender: Gender = slot.relationshipType === "grandmother" ? "female" : "male";
    const grandparent = buildFamilyMember(
      `${terrestrial.id}-grandparent-${grandparentIndex}`,
      slot.relationshipType,
      gender,
      grandparentBirthDay,
      nameSet,
      familySurname,
      terrestrial,
      currentDay,
      rng,
    );
    addMember(grandparent);
    grandparentIndex++;
  }

  return {
    terrestrialId: terrestrial.id,
    members,
    relationships,
  };
}
