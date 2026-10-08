import type { Sex } from "@/types/user";

/**
 * Basal metabolic rate via Mifflin–St Jeor (1990).
 * Returns kcal/day, rounded to the nearest whole number.
 */
export function calculateBMR(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const { weightKg, heightCm, age, sex } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (sex === "male" ? 5 : -161));
}
