import { msg } from "@/lib/i18n";
export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very"
  | "athlete";

export type Goal =
  | "lose_weight"
  | "maintain"
  | "gain_weight"
  | "build_muscle"
  | "improve_fitness";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number | null;
  weekly_change_kg: number | null;
  activity_level: ActivityLevel;
  goal: Goal;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_carbs_target: number;
  daily_fat_target: number;
  daily_water_target_ml: number;
  daily_step_goal: number;
  daily_exercise_goal_min: number;
  created_at: string;
  updated_at: string;
}

export type ProfileInput = Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">;

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: msg("Sedentary"),
  light: msg("Lightly active"),
  moderate: msg("Moderately active"),
  very: msg("Very active"),
  athlete: msg("Athlete"),
};

export const ACTIVITY_HINTS: Record<ActivityLevel, string> = {
  sedentary: msg("Desk job, little exercise"),
  light: msg("Light exercise 1–3 days/week"),
  moderate: msg("Exercise 3–5 days/week"),
  very: msg("Hard exercise 6–7 days/week"),
  athlete: msg("Training twice a day or physical job"),
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight: msg("Lose weight"),
  maintain: msg("Maintain weight"),
  gain_weight: msg("Gain weight"),
  build_muscle: msg("Build muscle"),
  improve_fitness: msg("Improve fitness"),
};
