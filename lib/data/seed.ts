import type { LogBundle } from "./types";
import type { Profile } from "@/types/user";
import type { FoodLog, MealType, UserFood } from "@/types/nutrition";
import { addDays, dateKey, localToIso, DEFAULT_TZ } from "@/lib/utils/dates";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

type Dish = { name: string; unit: string; calories: number; protein_g: number; carbs_g: number; fat_g: number };

const BREAKFASTS: Dish[][] = [
  [{ name: "Phở bò", unit: "bowl", calories: 480, protein_g: 28, carbs_g: 60, fat_g: 13 }],
  [{ name: "Bánh mì thịt", unit: "sandwich", calories: 500, protein_g: 21, carbs_g: 60, fat_g: 19 }],
  [
    { name: "Eggs", unit: "2 large", calories: 145, protein_g: 12.5, carbs_g: 1, fat_g: 10 },
    { name: "Whole-wheat toast", unit: "2 slices", calories: 160, protein_g: 7, carbs_g: 28, fat_g: 2.5 },
  ],
  [{ name: "Xôi gà", unit: "portion", calories: 520, protein_g: 20, carbs_g: 78, fat_g: 14 }],
  [
    { name: "Greek yogurt", unit: "cup", calories: 150, protein_g: 17, carbs_g: 8, fat_g: 4 },
    { name: "Banana", unit: "medium", calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4 },
  ],
];
const COFFEE: Dish = { name: "Cà phê sữa đá", unit: "glass", calories: 160, protein_g: 3, carbs_g: 25, fat_g: 5 };
const LUNCHES: Dish[][] = [
  [{ name: "Cơm tấm sườn bì chả", unit: "plate", calories: 750, protein_g: 35, carbs_g: 90, fat_g: 26 }],
  [{ name: "Cơm gà", unit: "plate", calories: 620, protein_g: 35, carbs_g: 75, fat_g: 18 }],
  [{ name: "Bún bò Huế", unit: "bowl", calories: 560, protein_g: 30, carbs_g: 65, fat_g: 18 }],
  [
    { name: "Grilled chicken breast", unit: "150 g", calories: 250, protein_g: 46, carbs_g: 0, fat_g: 5.5 },
    { name: "White rice", unit: "bowl", calories: 260, protein_g: 5, carbs_g: 57, fat_g: 0.5 },
    { name: "Stir-fried vegetables", unit: "portion", calories: 90, protein_g: 3, carbs_g: 9, fat_g: 5 },
  ],
  [{ name: "Bún thịt nướng", unit: "bowl", calories: 600, protein_g: 26, carbs_g: 75, fat_g: 21 }],
];
const DINNERS: Dish[][] = [
  [
    { name: "Thịt kho trứng", unit: "portion", calories: 420, protein_g: 26, carbs_g: 8, fat_g: 31 },
    { name: "White rice", unit: "bowl", calories: 260, protein_g: 5, carbs_g: 57, fat_g: 0.5 },
    { name: "Canh rau", unit: "bowl", calories: 50, protein_g: 2, carbs_g: 6, fat_g: 2 },
  ],
  [
    { name: "Cá kho tộ", unit: "portion", calories: 280, protein_g: 28, carbs_g: 10, fat_g: 14 },
    { name: "White rice", unit: "bowl", calories: 260, protein_g: 5, carbs_g: 57, fat_g: 0.5 },
  ],
  [{ name: "Gỏi cuốn", unit: "4 rolls", calories: 360, protein_g: 20, carbs_g: 52, fat_g: 7 }],
  [
    { name: "Salmon fillet", unit: "150 g", calories: 310, protein_g: 33, carbs_g: 0, fat_g: 19 },
    { name: "Sweet potato", unit: "medium", calories: 130, protein_g: 2.5, carbs_g: 30, fat_g: 0.2 },
  ],
  [{ name: "Hủ tiếu Nam Vang", unit: "bowl", calories: 520, protein_g: 26, carbs_g: 68, fat_g: 15 }],
];
const SNACKS: Dish[][] = [
  [{ name: "Trà sữa trân châu", unit: "cup (500 ml)", calories: 380, protein_g: 4, carbs_g: 65, fat_g: 11 }],
  [{ name: "Protein shake", unit: "scoop + water", calories: 130, protein_g: 25, carbs_g: 4, fat_g: 2 }],
  [{ name: "Apple", unit: "medium", calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3 }],
  [{ name: "Bia Saigon", unit: "2 cans", calories: 290, protein_g: 2, carbs_g: 22, fat_g: 0 }],
];

/** Deterministic PRNG so the demo looks the same on every restart. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

let idCounter = 0;
export function demoId(): string {
  idCounter += 1;
  return `demo-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function buildDemoData(now = new Date(), tz = DEFAULT_TZ): { profile: Profile; logs: LogBundle; userFoods: UserFood[] } {
  const r = rng(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const today = dateKey(now, tz);
  const created = localToIso(addDays(today, -35), "08:00", tz);

  const profile: Profile = {
    id: "demo-profile",
    user_id: DEMO_USER_ID,
    name: "Long",
    age: 30,
    sex: "male",
    height_cm: 175,
    weight_kg: 74,
    target_weight_kg: 70,
    weekly_change_kg: -0.5,
    activity_level: "moderate",
    goal: "lose_weight",
    daily_calorie_target: 2200,
    daily_protein_target: 150,
    daily_carbs_target: Math.round((2200 - 150 * 4 - 61 * 9) / 4),
    daily_fat_target: 61,
    daily_water_target_ml: 2500,
    daily_step_goal: 10000,
    daily_exercise_goal_min: 30,
    created_at: created,
    updated_at: created,
  };

  const logs: LogBundle = { food: [], exercise: [], water: [], weight: [], sleep: [], steps: [], notes: [] };
  const DAYS = 34;

  const addMeal = (key: string, meal: MealType, time: string, dishes: Dish[], ai = true) => {
    const iso = localToIso(key, time, tz);
    const mealId = demoId();
    for (const d of dishes) {
      const f: FoodLog = {
        id: demoId(), user_id: DEMO_USER_ID, meal_id: mealId, meal_type: meal, logged_at: iso,
        food_name: d.name, quantity: 1, unit: d.unit, calories: d.calories, protein_g: d.protein_g,
        carbs_g: d.carbs_g, fat_g: d.fat_g, confidence: ai ? "medium" : null, ai_estimated: ai,
        ai_assumptions: ai ? ["Typical Saigon street-food portion"] : null, ai_original_calories: ai ? d.calories : null,
        created_at: iso,
      };
      logs.food.push(f);
    }
  };

  for (let i = DAYS; i >= 1; i--) {
    const key = addDays(today, -i);
    const dow = new Date(`${key}T00:00:00Z`).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    if (r() < 0.06) continue; // a few missed days, like real life

    addMeal(key, "breakfast", `0${7 + Math.floor(r() * 2)}:${r() < 0.5 ? "15" : "40"}`, pick(BREAKFASTS));
    if (r() < 0.75) addMeal(key, "snack", "10:30", [COFFEE]);
    addMeal(key, "lunch", "12:20", pick(LUNCHES));
    if (r() < 0.55) addMeal(key, "snack", "16:00", [SNACKS[1][0]]); // protein shake after work
    if (r() < (weekend ? 0.7 : 0.35)) addMeal(key, "snack", "15:30", pick(SNACKS));
    addMeal(key, "dinner", "19:10", pick(DINNERS));
    if (weekend && r() < 0.5) addMeal(key, "snack", "21:00", [SNACKS[3][0]]);

    // Exercise ~4×/week
    if (r() < 0.6) {
      const kind = pick([
        { activity: "Pickleball", duration: 90, kcal: 520, intensity: "moderate" as const },
        { activity: "Weight training", duration: 60, kcal: 300, intensity: "moderate" as const },
        { activity: "Running", duration: 35, kcal: 400, intensity: "vigorous" as const, distance: 5.2 },
        { activity: "Walking", duration: 45, kcal: 190, intensity: "light" as const, distance: 3.8 },
      ]);
      const iso = localToIso(key, weekend ? "07:00" : "18:00", tz);
      logs.exercise.push({
        id: demoId(), user_id: DEMO_USER_ID, activity: kind.activity, duration_minutes: kind.duration,
        distance_km: "distance" in kind ? kind.distance ?? null : null, intensity: kind.intensity, heart_rate_avg: null,
        calories_burned: Math.round(kind.kcal * (0.9 + r() * 0.2)), ai_estimated: true, confidence: "medium",
        notes: null, logged_at: iso, created_at: iso,
      });
    }

    // Water: 4–9 glasses
    const glasses = 6 + Math.floor(r() * 5);
    for (let g = 0; g < glasses; g++) {
      logs.water.push({ id: demoId(), user_id: DEMO_USER_ID, amount_ml: g % 3 === 0 ? 500 : 250, logged_at: localToIso(key, `${String(8 + g).padStart(2, "0")}:00`, tz) });
    }

    // Weight trending 78 → ~74.4 with daily noise; logged most mornings
    if (r() < 0.8) {
      const trend = 78 - ((DAYS - i) / DAYS) * 3.6;
      const w = Math.round((trend + (r() - 0.5) * 0.8) * 10) / 10;
      logs.weight.push({ id: demoId(), user_id: DEMO_USER_ID, weight_kg: w, body_fat_percentage: Math.round((22 - (DAYS - i) * 0.06) * 10) / 10, muscle_mass_kg: null, logged_at: localToIso(key, "06:45", tz) });
    }

    // Sleep (logged against the wake-up day)
    if (r() < 0.85) {
      const dur = 360 + Math.floor(r() * 120);
      const wake = localToIso(key, "06:30", tz);
      logs.sleep.push({ id: demoId(), user_id: DEMO_USER_ID, bedtime: new Date(new Date(wake).getTime() - dur * 60000).toISOString(), wake_time: wake, duration_minutes: dur, quality: 2 + Math.floor(r() * 4), logged_at: wake });
    }

    logs.steps.push({ id: demoId(), user_id: DEMO_USER_ID, steps: 5000 + Math.floor(r() * 7000), logged_at: localToIso(key, "22:00", tz) });
  }

  // Today: breakfast + coffee + some water, so there is room to try logging.
  addMeal(today, "breakfast", "07:45", BREAKFASTS[1]);
  addMeal(today, "snack", "10:30", [COFFEE]);
  logs.water.push({ id: demoId(), user_id: DEMO_USER_ID, amount_ml: 500, logged_at: localToIso(today, "08:00", tz) });
  logs.water.push({ id: demoId(), user_id: DEMO_USER_ID, amount_ml: 250, logged_at: localToIso(today, "11:00", tz) });
  logs.sleep.push({ id: demoId(), user_id: DEMO_USER_ID, bedtime: localToIso(addDays(today, -1), "23:20", tz), wake_time: localToIso(today, "06:40", tz), duration_minutes: 440, quality: 4, logged_at: localToIso(today, "06:40", tz) });

  const userFoods: UserFood[] = [
    { id: demoId(), user_id: DEMO_USER_ID, name: "Cà phê sữa đá", normalized_name: "ca phe sua da", calories: 150, protein_g: 3, carbs_g: 23, fat_g: 5, unit: "glass", times_logged: 18, updated_at: created },
  ];

  return { profile, logs, userFoods };
}
