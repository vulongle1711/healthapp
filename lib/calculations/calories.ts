import type { ActivityLevel, Goal, Sex } from "@/types/user";
import { calculateBMR } from "./bmr";
import { calculateTDEE } from "./tdee";
import { calculateMacroTargets } from "./macros";

/** Never suggest a target below these floors, regardless of goal. */
export const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };

/** Largest deficit we will suggest, as a fraction of TDEE. */
const MAX_DEFICIT_FRACTION = 0.25;

export interface TargetInput {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  /** Desired weekly change in kg (negative = loss). Optional. */
  weeklyChangeKg?: number | null;
}

export interface SuggestedTargets {
  bmr: number;
  tdee: number;
  adjustment: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  steps: number;
  notes: string[];
}

const DEFAULT_WEEKLY_CHANGE: Record<Goal, number> = {
  lose_weight: -0.5,
  maintain: 0,
  gain_weight: 0.25,
  build_muscle: 0.2,
  improve_fitness: 0,
};

/** ~7,700 kcal per kg of body weight change (rule-of-thumb; real change varies). */
const KCAL_PER_KG = 7700;

export function suggestTargets(input: TargetInput): SuggestedTargets {
  const bmr = calculateBMR(input);
  const tdee = calculateTDEE(bmr, input.activity);
  const notes: string[] = [];

  const weekly = input.weeklyChangeKg ?? DEFAULT_WEEKLY_CHANGE[input.goal];
  let adjustment = Math.round((weekly * KCAL_PER_KG) / 7);

  const maxDeficit = Math.round(tdee * MAX_DEFICIT_FRACTION);
  if (adjustment < -maxDeficit) {
    adjustment = -maxDeficit;
    notes.push("Deficit capped at 25% of your estimated needs to keep it sustainable.");
  }
  if (adjustment > 500) adjustment = 500;

  let calories = roundTo(tdee + adjustment, 10);
  const floor = MIN_CALORIES[input.sex];
  if (calories < floor) {
    calories = floor;
    notes.push(`Target raised to a minimum of ${floor} kcal. Talk to a professional before going lower.`);
  }

  const macros = calculateMacroTargets({ calories, weightKg: input.weightKg, goal: input.goal });

  // ~35 ml per kg, rounded to 100 ml, between 1.5 and 4 L.
  const water_ml = clamp(roundTo(input.weightKg * 35, 100), 1500, 4000);

  return { bmr, tdee, adjustment, calories, ...macros, water_ml, steps: 10000, notes };
}

export interface DayBalance {
  consumed: number;
  exercise: number;
  net: number;
  target: number;
  remaining: number;
  /** Estimated total burned today = TDEE baseline (excluding exercise already priced in) + logged exercise. */
  estimatedBurned: number;
}

/**
 * Net = consumed − exercise. Remaining is measured against the target using
 * consumed calories only: exercise is shown separately rather than "earned back",
 * because the activity multiplier already assumes some exercise and device
 * estimates tend to overstate burn.
 */
export function dayBalance(input: {
  consumed: number;
  exercise: number;
  target: number;
  bmr: number;
}): DayBalance {
  const consumed = Math.round(input.consumed);
  const exercise = Math.round(input.exercise);
  const net = consumed - exercise;
  // Rough baseline for a non-exercise day: BMR × 1.2 (sedentary NEAT) + logged exercise.
  const estimatedBurned = Math.round(input.bmr * 1.2) + exercise;
  return {
    consumed,
    exercise,
    net,
    target: input.target,
    remaining: input.target - consumed,
    estimatedBurned,
  };
}

export type TargetStatus = "under" | "on_track" | "near" | "over";

/** Semantic status used for colours: green on track, orange near, red over. */
export function calorieStatus(consumed: number, target: number): TargetStatus {
  if (target <= 0) return "on_track";
  const r = consumed / target;
  if (r > 1.05) return "over";
  if (r > 0.95) return "near";
  return r < 0.5 ? "under" : "on_track";
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
