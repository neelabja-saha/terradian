export const DAYS_PER_YEAR = 365;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ageInYears(birthDay: number, currentDay: number): number {
  return Math.floor((currentDay - birthDay) / DAYS_PER_YEAR);
}
