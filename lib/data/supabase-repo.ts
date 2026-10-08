import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Repo, LogBundle, NewFoodItem, NewExercise } from "./types";
import type { Profile, ProfileInput } from "@/types/user";
import type { MealType, UserFood } from "@/types/nutrition";
import type { WeightLog } from "@/types/exercise";

const NUMERIC_KEYS = new Set([
  "height_cm", "weight_kg", "target_weight_kg", "weekly_change_kg", "quantity", "calories", "protein_g", "carbs_g",
  "fat_g", "ai_original_calories", "distance_km", "calories_burned", "body_fat_percentage", "muscle_mass_kg",
]);

/** Postgres numeric can arrive as string; normalise to numbers. */
function num<T>(row: T): T {
  const r = row as Record<string, unknown>;
  for (const k of Object.keys(r)) {
    if (NUMERIC_KEYS.has(k) && r[k] !== null && r[k] !== undefined) r[k] = Number(r[k]);
  }
  return row;
}

function fail(op: string, error: { message: string } | null): never | void {
  if (error) {
    console.error(`[supabase] ${op} failed:`, error.message);
    throw new Error(`Database error during ${op}`);
  }
}

export class SupabaseRepo implements Repo {
  readonly mode = "supabase" as const;
  constructor(private db: SupabaseClient, private userId: string, private email: string | null) {}

  async userEmail() {
    return this.email;
  }

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await this.db.from("profiles").select("*").eq("user_id", this.userId).maybeSingle();
    fail("getProfile", error);
    return data ? num(data as Profile) : null;
  }

  async saveProfile(input: ProfileInput): Promise<Profile> {
    const { data, error } = await this.db
      .from("profiles")
      .upsert({ ...input, user_id: this.userId }, { onConflict: "user_id" })
      .select("*")
      .single();
    fail("saveProfile", error);
    return num(data as Profile);
  }

  async getLogs(start: string, end: string): Promise<LogBundle> {
    const q = (table: string) =>
      this.db.from(table).select("*").eq("user_id", this.userId).gte("logged_at", start).lt("logged_at", end).order("logged_at");
    const [food, exercise, water, weight, sleep, steps, notes] = await Promise.all([
      q("food_logs"), q("exercise_logs"), q("water_logs"), q("weight_logs"), q("sleep_logs"), q("step_logs"), q("notes"),
    ]);
    for (const [name, r] of Object.entries({ food, exercise, water, weight, sleep, steps, notes })) fail(`getLogs.${name}`, r.error);
    return {
      food: (food.data ?? []).map(num),
      exercise: (exercise.data ?? []).map(num),
      water: water.data ?? [],
      weight: (weight.data ?? []).map(num),
      sleep: sleep.data ?? [],
      steps: steps.data ?? [],
      notes: notes.data ?? [],
    } as LogBundle;
  }

  async firstWeight(): Promise<WeightLog | null> {
    const { data, error } = await this.db
      .from("weight_logs").select("*").eq("user_id", this.userId).order("logged_at", { ascending: true }).limit(1).maybeSingle();
    fail("firstWeight", error);
    return data ? num(data as WeightLog) : null;
  }

  async addMeal(meal_type: MealType, logged_at: string, items: NewFoodItem[], notes: string | null = null) {
    const { data: meal, error } = await this.db
      .from("meals").insert({ user_id: this.userId, meal_type, logged_at, notes }).select("id").single();
    fail("addMeal", error);
    const rows = items.map((i) => ({ ...i, user_id: this.userId, meal_id: meal!.id, meal_type, logged_at }));
    const { error: e2 } = await this.db.from("food_logs").insert(rows);
    fail("addMeal.items", e2);
  }

  async updateFood(id: string, patch: Partial<NewFoodItem> & { meal_type?: MealType }) {
    const { error } = await this.db.from("food_logs").update(patch).eq("id", id).eq("user_id", this.userId);
    fail("updateFood", error);
  }

  async deleteFood(id: string) {
    const { error } = await this.db.from("food_logs").delete().eq("id", id).eq("user_id", this.userId);
    fail("deleteFood", error);
  }

  async addExercise(e: NewExercise) {
    const { error } = await this.db.from("exercise_logs").insert({ ...e, user_id: this.userId });
    fail("addExercise", error);
  }
  async deleteExercise(id: string) {
    const { error } = await this.db.from("exercise_logs").delete().eq("id", id).eq("user_id", this.userId);
    fail("deleteExercise", error);
  }

  async addWater(amount_ml: number, logged_at: string) {
    const { error } = await this.db.from("water_logs").insert({ amount_ml, logged_at, user_id: this.userId });
    fail("addWater", error);
  }
  async deleteWater(id: string) {
    const { error } = await this.db.from("water_logs").delete().eq("id", id).eq("user_id", this.userId);
    fail("deleteWater", error);
  }

  async addWeight(w: { weight_kg: number; body_fat_percentage: number | null; muscle_mass_kg: number | null; logged_at: string }) {
    const { error } = await this.db.from("weight_logs").insert({ ...w, user_id: this.userId });
    fail("addWeight", error);
  }
  async deleteWeight(id: string) {
    const { error } = await this.db.from("weight_logs").delete().eq("id", id).eq("user_id", this.userId);
    fail("deleteWeight", error);
  }

  async addSleep(s: { bedtime: string | null; wake_time: string | null; duration_minutes: number; quality: number | null; logged_at: string }) {
    const { error } = await this.db.from("sleep_logs").insert({ ...s, user_id: this.userId });
    fail("addSleep", error);
  }
  async deleteSleep(id: string) {
    const { error } = await this.db.from("sleep_logs").delete().eq("id", id).eq("user_id", this.userId);
    fail("deleteSleep", error);
  }

  async addSteps(steps: number, logged_at: string) {
    const { error } = await this.db.from("step_logs").insert({ steps, logged_at, user_id: this.userId });
    fail("addSteps", error);
  }
  async addNote(content: string, logged_at: string) {
    const { error } = await this.db.from("notes").insert({ content, logged_at, user_id: this.userId });
    fail("addNote", error);
  }
  async deleteNote(id: string) {
    const { error } = await this.db.from("notes").delete().eq("id", id).eq("user_id", this.userId);
    fail("deleteNote", error);
  }

  async listUserFoods(): Promise<UserFood[]> {
    const { data, error } = await this.db
      .from("user_foods").select("*").eq("user_id", this.userId).order("times_logged", { ascending: false }).limit(50);
    fail("listUserFoods", error);
    return (data ?? []).map(num) as UserFood[];
  }

  async rememberFood(f: { name: string; normalized_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; unit: string }) {
    const { data: existing } = await this.db
      .from("user_foods").select("id,times_logged").eq("user_id", this.userId).eq("normalized_name", f.normalized_name).maybeSingle();
    if (existing) {
      const { error } = await this.db
        .from("user_foods")
        .update({ ...f, times_logged: existing.times_logged + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      fail("rememberFood.update", error);
    } else {
      const { error } = await this.db.from("user_foods").insert({ ...f, user_id: this.userId });
      fail("rememberFood.insert", error);
    }
  }

  async deleteUserFood(id: string) {
    const { error } = await this.db.from("user_foods").delete().eq("id", id).eq("user_id", this.userId);
    fail("deleteUserFood", error);
  }
}
