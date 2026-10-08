import { msg } from "@/lib/i18n";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type Confidence = "low" | "medium" | "high";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "other"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: msg("Breakfast"),
  lunch: msg("Lunch"),
  dinner: msg("Dinner"),
  snack: msg("Snack"),
  other: msg("Other"),
};

/** One food item as estimated by AI (or entered manually) before saving. */
export interface FoodEstimate {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  calories_low?: number;
  calories_high?: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: Confidence;
  assumptions: string[];
  emoji?: string;
}

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodAnalysis {
  meal_type: MealType | null;
  items: FoodEstimate[];
  total: NutritionTotals;
  clarification?: string | null;
  source: "ai" | "offline";
}

export interface Meal {
  id: string;
  user_id: string;
  meal_type: MealType;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  meal_id: string | null;
  meal_type: MealType;
  logged_at: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: Confidence | null;
  ai_estimated: boolean;
  ai_assumptions: string[] | null;
  ai_original_calories: number | null;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
}

export interface UserFood {
  id: string;
  user_id: string;
  name: string;
  normalized_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  unit: string;
  times_logged: number;
  updated_at: string;
}
