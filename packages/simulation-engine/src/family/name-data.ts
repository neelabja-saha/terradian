export interface NameSet {
  male: readonly string[];
  female: readonly string[];
  surnames: readonly string[];
}

const NAME_DATA_BY_COUNTRY: Record<string, NameSet> = {
  USA: {
    male: ["James", "Michael", "David", "Robert", "William", "Daniel"],
    female: ["Mary", "Jennifer", "Linda", "Patricia", "Elizabeth", "Susan"],
    surnames: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller"],
  },
  India: {
    male: ["Arjun", "Rohan", "Vikram", "Aditya", "Karan", "Rahul"],
    female: ["Priya", "Ananya", "Divya", "Neha", "Pooja", "Kavita"],
    surnames: ["Sharma", "Patel", "Iyer", "Reddy", "Gupta", "Nair"],
  },
  UK: {
    male: ["Oliver", "George", "Harry", "Jack", "Charlie", "Thomas"],
    female: ["Olivia", "Amelia", "Isla", "Ava", "Emily", "Sophie"],
    surnames: ["Taylor", "Wilson", "Evans", "Thomas", "Roberts", "Walker"],
  },
};

const DEFAULT_NAME_SET: NameSet = {
  male: ["Alex", "Sam", "Jordan", "Chris", "Morgan", "Taylor"],
  female: ["Alex", "Sam", "Jordan", "Chris", "Morgan", "Taylor"],
  surnames: ["Rivers", "Stone", "Hale", "Fields", "Brooks", "Shaw"],
};

export function getNameSet(country: string): NameSet {
  return NAME_DATA_BY_COUNTRY[country] ?? DEFAULT_NAME_SET;
}
