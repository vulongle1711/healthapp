import type { Profile, ProfileInput } from "@/types/user";
import type { Confidence, FoodLog, MealType, UserFood, WaterLog } from "@/types/nutrition";
import type { ExerciseLog, Intensity, NoteLog, SleepLog, StepLog, WeightLog } from "@/types/exercise";

export interface LogBundle {
  food: FoodLog[];
  exercise: ExerciseLog[];
  water: WaterLog[];
  weight: WeightLog[];
  sleep: SleepLog[];
  steps: StepLog[];
  notes: NoteLog[];
}

export interface NewFoodItem {
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
}

export interface NewExercise {
  activity: string;
  duration_minutes: number;
  distance_km: number | null;
  intensity: Intensity;
  heart_rate_avg: number | null;
  calories_burned: number;
  ai_estimated: boolean;
  confidence: Confidence | null;
  notes: string | null;
  logged_at: string;
}

/**
 * Storage abstraction. Every implementation is already scoped to the
 * signed-in user — callers never pass a user id.
 */
export interface Repo {
  readonly mode: "supabase" | "demo";
  userEmail(): Promise<string | null>;

  getProfile(): Promise<Profile | null>;
  saveProfile(input: ProfileInput): Promise<Profile>;

  getLogs(startIso: string, endIso: string): Promise<LogBundle>;
  firstWeight(): Promise<WeightLog | null>;

  addMeal(meal_type: MealType, logged_at: string, items: NewFoodItem[], notes?: string | null): Promise<void>;
  updateFood(id: string, patch: Partial<NewFoodItem> & { meal_type?: MealType }): Promise<void>;
  deleteFood(id: string): Promise<void>;

  addExercise(e: NewExercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;

  addWater(amount_ml: number, logged_at: string): Promise<void>;
  deleteWater(id: string): Promise<void>;

  addWeight(w: { weight_kg: number; body_fat_percentage: number | null; muscle_mass_kg: number | null; logged_at: string }): Promise<void>;
  deleteWeight(id: string): Promise<void>;

  addSleep(s: { bedtime: string | null; wake_time: string | null; duration_minutes: number; quality: number | null; logged_at: string }): Promise<void>;
  deleteSleep(id: string): Promise<void>;

  addSteps(steps: number, logged_at: string): Promise<void>;
  addNote(content: string, logged_at: string): Promise<void>;
  deleteNote(id: string): Promise<void>;

  listUserFoods(): Promise<UserFood[]>;
  rememberFood(f: { name: string; normalized_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; unit: string }): Promise<void>;
  deleteUserFood(id: string): Promise<void>;
}
