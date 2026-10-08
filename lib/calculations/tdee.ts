import type { ActivityLevel } from "@/types/user";

/** Standard activity multipliers applied to BMR. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
};

/**
 * Estimated total daily energy expenditure.
 * The multiplier already accounts for a typical amount of exercise,
 * which is why logged exercise is shown separately rather than added on top.
 */
export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}
