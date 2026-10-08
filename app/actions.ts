"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getRepo } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resetDemoStore } from "@/lib/data/memory-repo";
import { canonicalFoodKey } from "@/lib/ai/parser";
import { suggestTargets } from "@/lib/calculations/calories";
import { MealTypeSchema, IntensitySchema } from "@/lib/ai/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

const FRIENDLY = "Something went wrong saving that. Please try again.";

async function run(fn: () => Promise<void>, paths: string[] = ["/", "/dashboard", "/log", "/nutrition", "/exercise", "/progress", "/insights"]): Promise<ActionResult> {
  try {
    await fn();
    paths.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.warn("[action] validation:", e.issues.slice(0, 3));
      return { ok: false, error: "Some values look invalid — please check and try again." };
    }
    if ((e as Error).message === "unauthenticated") return { ok: false, error: "Your session expired. Please sign in again." };
    console.error("[action] failed:", e);
    return { ok: false, error: FRIENDLY };
  }
}

async function repo() {
  const r = await getRepo();
  if (!r) throw new Error("unauthenticated");
  return r;
}

const iso = z.string().datetime({ offset: true }).or(z.string().datetime());
const n = (min: number, max: number) => z.coerce.number().finite().min(min).max(max);

// ───────────────────────── profile ─────────────────────────

const ProfileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  age: n(13, 110).int(),
  sex: z.enum(["male", "female"]),
  height_cm: n(100, 250),
  weight_kg: n(30, 300),
  target_weight_kg: n(30, 300).nullable(),
  weekly_change_kg: n(-1, 1).nullable(),
  activity_level: z.enum(["sedentary", "light", "moderate", "very", "athlete"]),
  goal: z.enum(["lose_weight", "maintain", "gain_weight", "build_muscle", "improve_fitness"]),
  daily_calorie_target: n(800, 6000).int(),
  daily_protein_target: n(20, 400).int(),
  daily_carbs_target: n(0, 900).int(),
  daily_fat_target: n(10, 400).int(),
  daily_water_target_ml: n(500, 6000).int(),
  daily_step_goal: n(0, 50000).int(),
  daily_exercise_goal_min: n(0, 300).int(),
});

export async function saveProfileAction(input: z.input<typeof ProfileSchema>): Promise<ActionResult> {
  return run(async () => {
    const data = ProfileSchema.parse(input);
    await (await repo()).saveProfile(data);
  }, ["/", "/dashboard", "/profile", "/progress", "/insights"]);
}

/** Preview targets for onboarding/profile (pure calculation, server-side to keep one source of truth). */
export async function previewTargetsAction(input: {
  age: number; sex: "male" | "female"; heightCm: number; weightKg: number;
  activity: "sedentary" | "light" | "moderate" | "very" | "athlete";
  goal: "lose_weight" | "maintain" | "gain_weight" | "build_muscle" | "improve_fitness";
  weeklyChangeKg?: number | null;
}) {
  return suggestTargets(input);
}

// ───────────────────────── food ─────────────────────────

const FoodItemSchema = z.object({
  food_name: z.string().trim().min(1).max(120),
  quantity: n(0.01, 10000),
  unit: z.string().trim().min(1).max(40),
  calories: n(0, 6000),
  protein_g: n(0, 500),
  carbs_g: n(0, 900),
  fat_g: n(0, 400),
  confidence: z.enum(["low", "medium", "high"]).nullable(),
  ai_estimated: z.boolean(),
  ai_assumptions: z.array(z.string().max(200)).max(10).nullable(),
  ai_original_calories: n(0, 6000).nullable(),
});

const SaveMealSchema = z.object({
  meal_type: MealTypeSchema,
  logged_at: iso,
  items: z.array(FoodItemSchema).min(1).max(30),
});

export async function saveMealAction(input: z.input<typeof SaveMealSchema>): Promise<ActionResult> {
  return run(async () => {
    const data = SaveMealSchema.parse(input);
    const r = await repo();
    await r.addMeal(data.meal_type, data.logged_at, data.items);
    // Personal food memory: remember the user's corrections of AI estimates.
    for (const item of data.items) {
      const orig = item.ai_original_calories;
      const corrected = item.ai_estimated && orig !== null && orig > 0 && Math.abs(item.calories - orig) / orig > 0.05;
      if (!corrected || ["g", "ml"].includes(item.unit)) continue;
      const q = item.quantity || 1;
      await r.rememberFood({
        name: item.food_name,
        normalized_name: canonicalFoodKey(item.food_name),
        calories: Math.round(item.calories / q),
        protein_g: Math.round((item.protein_g / q) * 10) / 10,
        carbs_g: Math.round((item.carbs_g / q) * 10) / 10,
        fat_g: Math.round((item.fat_g / q) * 10) / 10,
        unit: item.unit,
      });
    }
  });
}

/** Log a saved "My food" directly (quick re-log). */
export async function quickLogFoodAction(input: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; unit: string; meal_type: string; logged_at: string }): Promise<ActionResult> {
  return run(async () => {
    const meal_type = MealTypeSchema.parse(input.meal_type);
    const item = FoodItemSchema.parse({ food_name: input.name, quantity: 1, unit: input.unit, calories: input.calories, protein_g: input.protein_g, carbs_g: input.carbs_g, fat_g: input.fat_g, confidence: "high", ai_estimated: false, ai_assumptions: null, ai_original_calories: null });
    const r = await repo();
    await r.addMeal(meal_type, iso.parse(input.logged_at), [item]);
    await r.rememberFood({ name: item.food_name, normalized_name: canonicalFoodKey(item.food_name), calories: item.calories, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g, unit: item.unit });
  });
}

const UpdateFoodSchema = FoodItemSchema.pick({ food_name: true, quantity: true, unit: true, calories: true, protein_g: true, carbs_g: true, fat_g: true }).partial().extend({ meal_type: MealTypeSchema.optional() });

export async function updateFoodAction(id: string, patch: z.input<typeof UpdateFoodSchema>): Promise<ActionResult> {
  return run(async () => (await repo()).updateFood(z.string().min(1).parse(id), UpdateFoodSchema.parse(patch)));
}

export async function deleteFoodAction(id: string): Promise<ActionResult> {
  return run(async () => (await repo()).deleteFood(z.string().min(1).parse(id)));
}

export async function deleteUserFoodAction(id: string): Promise<ActionResult> {
  return run(async () => (await repo()).deleteUserFood(z.string().min(1).parse(id)), ["/nutrition", "/profile"]);
}

// ───────────────────────── exercise ─────────────────────────

const ExerciseSchema = z.object({
  activity: z.string().trim().min(1).max(80),
  duration_minutes: n(1, 1440).int(),
  distance_km: n(0, 500).nullable(),
  intensity: IntensitySchema,
  heart_rate_avg: n(30, 230).int().nullable(),
  calories_burned: n(0, 6000),
  ai_estimated: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]).nullable(),
  notes: z.string().max(500).nullable(),
  logged_at: iso,
});

export async function saveExerciseAction(input: z.input<typeof ExerciseSchema>[]): Promise<ActionResult> {
  return run(async () => {
    const items = z.array(ExerciseSchema).min(1).max(10).parse(input);
    const r = await repo();
    for (const e of items) await r.addExercise(e);
  });
}

export async function deleteExerciseAction(id: string): Promise<ActionResult> {
  return run(async () => (await repo()).deleteExercise(z.string().min(1).parse(id)));
}

// ───────────────────────── water / weight / sleep / steps / notes ─────────────────────────

export async function addWaterAction(amount_ml: number, logged_at?: string): Promise<ActionResult> {
  return run(async () => (await repo()).addWater(n(10, 5000).int().parse(Math.round(amount_ml)), logged_at ? iso.parse(logged_at) : new Date().toISOString()));
}

export async function deleteWaterAction(id: string): Promise<ActionResult> {
  return run(async () => (await repo()).deleteWater(z.string().min(1).parse(id)));
}

const WeightSchema = z.object({ weight_kg: n(30, 300), body_fat_percentage: n(2, 70).nullable(), muscle_mass_kg: n(10, 150).nullable(), logged_at: iso });

export async function addWeightAction(input: z.input<typeof WeightSchema>): Promise<ActionResult> {
  return run(async () => {
    const data = WeightSchema.parse(input);
    const r = await repo();
    await r.addWeight(data);
    // Keep the profile's current weight in sync so BMR/TDEE stay current.
    const p = await r.getProfile();
    if (p) {
      const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...rest } = p;
      void _id; void _u; void _c; void _up;
      await r.saveProfile({ ...rest, weight_kg: data.weight_kg });
    }
  });
}

export async function deleteWeightAction(id: string): Promise<ActionResult> {
  return run(async () => (await repo()).deleteWeight(z.string().min(1).parse(id)));
}

const SleepSchema = z.object({ bedtime: iso.nullable(), wake_time: iso.nullable(), duration_minutes: n(1, 1440).int(), quality: n(1, 5).int().nullable(), logged_at: iso });

export async function addSleepAction(input: z.input<typeof SleepSchema>): Promise<ActionResult> {
  return run(async () => (await repo()).addSleep(SleepSchema.parse(input)));
}

export async function deleteSleepAction(id: string): Promise<ActionResult> {
  return run(async () => (await repo()).deleteSleep(z.string().min(1).parse(id)));
}

export async function addStepsAction(steps: number, logged_at?: string): Promise<ActionResult> {
  return run(async () => (await repo()).addSteps(n(0, 200000).int().parse(Math.round(steps)), logged_at ? iso.parse(logged_at) : new Date().toISOString()));
}

export async function addNoteAction(content: string): Promise<ActionResult> {
  return run(async () => (await repo()).addNote(z.string().trim().min(1).max(2000).parse(content), new Date().toISOString()));
}

export async function deleteNoteAction(id: string): Promise<ActionResult> {
  return run(async () => (await repo()).deleteNote(z.string().min(1).parse(id)));
}

// ───────────────────────── universal day log ─────────────────────────

const DayLogSchema = z.object({
  meals: z.array(SaveMealSchema).max(10),
  exercise: z.array(ExerciseSchema).max(10),
  water_ml: n(10, 10000).int().nullable(),
  weight_kg: n(30, 300).nullable(),
  sleep_minutes: n(30, 1440).int().nullable(),
  steps: n(0, 200000).int().nullable(),
  logged_at: iso,
});

export async function saveDayLogAction(input: z.input<typeof DayLogSchema>): Promise<ActionResult> {
  const data = (() => {
    try {
      return DayLogSchema.parse(input);
    } catch (e) {
      return e as z.ZodError;
    }
  })();
  if (data instanceof z.ZodError) return { ok: false, error: "Some values look invalid — please check and try again." };

  for (const m of data.meals) {
    const r = await saveMealAction(m);
    if (!r.ok) return r;
  }
  if (data.exercise.length) {
    const r = await saveExerciseAction(data.exercise);
    if (!r.ok) return r;
  }
  if (data.water_ml) {
    const r = await addWaterAction(data.water_ml, data.logged_at);
    if (!r.ok) return r;
  }
  if (data.weight_kg) {
    const r = await addWeightAction({ weight_kg: data.weight_kg, body_fat_percentage: null, muscle_mass_kg: null, logged_at: data.logged_at });
    if (!r.ok) return r;
  }
  if (data.sleep_minutes) {
    const r = await addSleepAction({ bedtime: null, wake_time: null, duration_minutes: data.sleep_minutes, quality: null, logged_at: data.logged_at });
    if (!r.ok) return r;
  }
  if (data.steps !== null) {
    const r = await addStepsAction(data.steps, data.logged_at);
    if (!r.ok) return r;
  }
  return { ok: true };
}

// ───────────────────────── auth / misc ─────────────────────────

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }
  redirect("/dashboard");
}

export async function resetDemoAction(empty: boolean): Promise<ActionResult> {
  if (isSupabaseConfigured) return { ok: false, error: "Only available in demo mode." };
  resetDemoStore(empty);
  revalidatePath("/", "layout");
  return { ok: true };
}
