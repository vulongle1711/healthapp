import type { Goal } from "@/types/user";
import type { NutritionTotals } from "@/types/nutrition";

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** Protein grams per kg body weight by goal (sports-nutrition consensus ranges, mid-points). */
const PROTEIN_PER_KG: Record<Goal, number> = {
  lose_weight: 2.0,
  maintain: 1.6,
  gain_weight: 1.8,
  build_muscle: 2.0,
  improve_fitness: 1.6,
};

export interface MacroTargets {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/**
 * Split a calorie target into protein / fat / carbs.
 * Protein from body weight, fat at 25% of calories (never below 0.6 g/kg),
 * carbs fill the remainder.
 */
export function calculateMacroTargets(input: {
  calories: number;
  weightKg: number;
  goal: Goal;
}): MacroTargets {
  const { calories, weightKg, goal } = input;
  const protein = Math.round(weightKg * PROTEIN_PER_KG[goal]);
  const fat = Math.round(Math.max((calories * 0.25) / KCAL_PER_GRAM.fat, weightKg * 0.6));
  const remaining = calories - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat;
  const carbs = Math.max(0, Math.round(remaining / KCAL_PER_GRAM.carbs));
  return { protein_g: protein, carbs_g: carbs, fat_g: fat };
}

/** Calories implied by macros (Atwater factors). */
export function caloriesFromMacros(m: { protein_g: number; carbs_g: number; fat_g: number }): number {
  return Math.round(
    m.protein_g * KCAL_PER_GRAM.protein + m.carbs_g * KCAL_PER_GRAM.carbs + m.fat_g * KCAL_PER_GRAM.fat,
  );
}

/**
 * True when stated calories and macro-derived calories agree within tolerance.
 * Fibre, alcohol and rounding mean they never match exactly.
 */
export function macrosReconcile(
  m: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  tolerance = 0.2,
): boolean {
  const implied = caloriesFromMacros(m);
  if (m.calories === 0) return implied < 15;
  return Math.abs(implied - m.calories) / m.calories <= tolerance;
}

export function sumNutrition(items: NutritionTotals[] | { calories: number; protein_g: number; carbs_g: number; fat_g: number }[]): NutritionTotals {
  const t = items.reduce(
    (acc, i) => ({
      calories: acc.calories + (Number(i.calories) || 0),
      protein_g: acc.protein_g + (Number(i.protein_g) || 0),
      carbs_g: acc.carbs_g + (Number(i.carbs_g) || 0),
      fat_g: acc.fat_g + (Number(i.fat_g) || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  return {
    calories: Math.round(t.calories),
    protein_g: Math.round(t.protein_g * 10) / 10,
    carbs_g: Math.round(t.carbs_g * 10) / 10,
    fat_g: Math.round(t.fat_g * 10) / 10,
  };
}
