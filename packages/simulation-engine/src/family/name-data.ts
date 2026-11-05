import rawNameData from "../../data/names.json" with { type: "json" };

export interface NameSet {
  male: readonly string[];
  female: readonly string[];
  surnames: readonly string[];
}

/** Country key used when a country has no name set of its own. */
export const DEFAULT_NAME_SET_KEY = "default";

const NAME_LIST_KEYS = ["male", "female", "surnames"] as const;

/**
 * Validates raw name data (keyed by country) and returns it typed. Throws an
 * Error naming the exact entry that is wrong, so bad data fails at load time
 * rather than mid-game.
 */
export function parseNameData(raw: unknown, source = "names.json"): Record<string, NameSet> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`${source}: expected an object keyed by country`);
  }
  const result: Record<string, NameSet> = {};
  for (const [country, entry] of Object.entries(raw)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`${source}: "${country}" must be an object with male, female and surnames`);
    }
    const lists: Partial<Record<(typeof NAME_LIST_KEYS)[number], string[]>> = {};
    for (const key of NAME_LIST_KEYS) {
      const list: unknown = (entry as Record<string, unknown>)[key];
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error(`${source}: "${country}.${key}" must be a non-empty array of names`);
      }
      list.forEach((name: unknown, index) => {
        if (typeof name !== "string" || name.trim() === "") {
          throw new Error(`${source}: "${country}.${key}[${index}]" must be a non-empty string`);
        }
      });
      lists[key] = [...(list as string[])];
    }
    result[country] = {
      male: lists.male as string[],
      female: lists.female as string[],
      surnames: lists.surnames as string[],
    };
  }
  if (!(DEFAULT_NAME_SET_KEY in result)) {
    throw new Error(`${source}: missing the "${DEFAULT_NAME_SET_KEY}" fallback name set`);
  }
  return result;
}

const NAME_DATA = parseNameData(rawNameData);

/** Name set for a country, or the default set if the country has none. */
export function getNameSet(country: string): NameSet {
  return (NAME_DATA[country] ?? NAME_DATA[DEFAULT_NAME_SET_KEY]) as NameSet;
}
