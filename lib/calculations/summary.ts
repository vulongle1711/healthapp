import type { LogBundle } from "@/lib/data/types";
import type { Profile } from "@/types/user";
import type { FoodLog, MealType, NutritionTotals } from "@/types/nutrition";
import { MEAL_TYPES } from "@/types/nutrition";
import { dateKey, listKeys, weekdayOf } from "@/lib/utils/dates";
import { sumNutrition } from "./macros";

export interface DayMetrics {
  key: string;
  nutrition: NutritionTotals;
  exerciseKcal: number;
  exerciseMin: number;
  waterMl: number;
  steps: number | null;
  weightKg: number | null;
  sleepMin: number | null;
  foodCount: number;
  logged: boolean;
}

export interface MealGroup {
  meal_type: MealType;
  items: FoodLog[];
  totals: NutritionTotals;
  firstAt: string;
}

/** Group a bundle's logs by local day. */
export function bucketByDay(bundle: LogBundle, keys: string[], tz: string): Map<string, LogBundle> {
  const map = new Map<string, LogBundle>();
  for (const k of keys) map.set(k, { food: [], exercise: [], water: [], weight: [], sleep: [], steps: [], notes: [] });
  (Object.keys(bundle) as (keyof LogBundle)[]).forEach((kind) => {
    for (const row of bundle[kind]) {
      const b = map.get(dateKey(row.logged_at, tz));
      if (b) (b[kind] as unknown[]).push(row);
    }
  });
  return map;
}

export function metricsFor(key: string, b: LogBundle): DayMetrics {
  const nutrition = sumNutrition(b.food);
  const last = <T,>(a: T[]) => (a.length ? a[a.length - 1] : null);
  return {
    key,
    nutrition,
    exerciseKcal: Math.round(b.exercise.reduce((s, e) => s + e.calories_burned, 0)),
    exerciseMin: b.exercise.reduce((s, e) => s + e.duration_minutes, 0),
    waterMl: b.water.reduce((s, w) => s + w.amount_ml, 0),
    steps: last(b.steps)?.steps ?? null,
    weightKg: last(b.weight)?.weight_kg ?? null,
    sleepMin: b.sleep.length ? b.sleep.reduce((s, x) => s + x.duration_minutes, 0) : null,
    foodCount: b.food.length,
    logged: b.food.length > 0,
  };
}

export function seriesFor(bundle: LogBundle, startKey: string, endKey: string, tz: string): DayMetrics[] {
  const keys = listKeys(startKey, endKey);
  const buckets = bucketByDay(bundle, keys, tz);
  return keys.map((k) => metricsFor(k, buckets.get(k)!));
}

export function groupMeals(food: FoodLog[]): MealGroup[] {
  const groups: MealGroup[] = [];
  for (const mt of MEAL_TYPES) {
    const items = food.filter((f) => f.meal_type === mt);
    if (!items.length) continue;
    groups.push({ meal_type: mt, items, totals: sumNutrition(items), firstAt: items[0].logged_at });
  }
  return groups;
}

export interface ScoreComponent {
  label: string;
  points: number;
  max: number;
  /** English template with {placeholders}; the UI translates it and fills in `vars`. */
  detail: string;
  vars: Record<string, number>;
}

/**
 * A simple, explainable 0–10 day score. Not a scientific measure:
 * it just rewards hitting the targets the user set.
 */
export function dayScore(m: DayMetrics, p: Profile): { score: number; components: ScoreComponent[] } | null {
  if (!m.logged) return null;
  const comps: ScoreComponent[] = [];

  const calRatio = m.nutrition.calories / p.daily_calorie_target;
  const calDev = Math.abs(1 - calRatio);
  const calPts = calDev <= 0.1 ? 3 : Math.max(0, 3 - ((calDev - 0.1) / 0.3) * 3);
  comps.push({ label: "Calories", points: calPts, max: 3, detail: "{pct}% of target (full points within ±10%)", vars: { pct: Math.round(calRatio * 100) } });

  const pr = Math.min(1, m.nutrition.protein_g / p.daily_protein_target);
  comps.push({ label: "Protein", points: pr * 3, max: 3, detail: "{pct}% of target", vars: { pct: Math.round(pr * 100) } });

  const ex = Math.min(1, m.exerciseMin / Math.max(1, p.daily_exercise_goal_min));
  comps.push({ label: "Exercise", points: ex * 2, max: 2, detail: "{done} of {goal} min", vars: { done: m.exerciseMin, goal: p.daily_exercise_goal_min } });

  const wa = Math.min(1, m.waterMl / p.daily_water_target_ml);
  comps.push({ label: "Water", points: wa * 2, max: 2, detail: "{pct}% of target", vars: { pct: Math.round(wa * 100) } });

  const score = Math.round(comps.reduce((s, c) => s + c.points, 0) * 10) / 10;
  return { score, components: comps.map((c) => ({ ...c, points: Math.round(c.points * 10) / 10 })) };
}

export interface PeriodStats {
  days: number;
  daysLogged: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgWaterMl: number;
  avgSteps: number | null;
  avgSleepMin: number | null;
  exerciseMin: number;
  exerciseSessions: number;
  avgWeight: number | null;
  weightChange: number | null;
  caloriesMet: number;
  proteinMet: number;
  exerciseMet: number;
  waterMet: number;
  streak: number;
  weekendAvgCalories: number | null;
  weekdayAvgCalories: number | null;
  sleepLoggedDays: number;
}

const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function periodStats(series: DayMetrics[], p: Profile, exerciseSessions = 0): PeriodStats {
  const logged = series.filter((d) => d.logged);
  const weights = series.filter((d) => d.weightKg !== null).map((d) => d.weightKg!) as number[];
  const steps = series.filter((d) => d.steps !== null).map((d) => d.steps!);
  const sleeps = series.filter((d) => d.sleepMin !== null).map((d) => d.sleepMin!);
  const weekend = logged.filter((d) => [0, 6].includes(weekdayOf(d.key)));
  const weekday = logged.filter((d) => ![0, 6].includes(weekdayOf(d.key)));

  // Streak: consecutive logged days ending at the most recent day (today counts if logged, otherwise start from yesterday).
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].logged) streak++;
    else if (i === series.length - 1) continue;
    else break;
  }

  return {
    days: series.length,
    daysLogged: logged.length,
    avgCalories: Math.round(avg(logged.map((d) => d.nutrition.calories))),
    avgProtein: Math.round(avg(logged.map((d) => d.nutrition.protein_g))),
    avgCarbs: Math.round(avg(logged.map((d) => d.nutrition.carbs_g))),
    avgFat: Math.round(avg(logged.map((d) => d.nutrition.fat_g))),
    avgWaterMl: Math.round(avg(series.filter((d) => d.waterMl > 0).map((d) => d.waterMl))),
    avgSteps: steps.length ? Math.round(avg(steps)) : null,
    avgSleepMin: sleeps.length ? Math.round(avg(sleeps)) : null,
    exerciseMin: series.reduce((s, d) => s + d.exerciseMin, 0),
    exerciseSessions,
    avgWeight: weights.length ? Math.round(avg(weights) * 10) / 10 : null,
    weightChange: weights.length >= 2 ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 : null,
    caloriesMet: logged.filter((d) => Math.abs(1 - d.nutrition.calories / p.daily_calorie_target) <= 0.1).length,
    proteinMet: logged.filter((d) => d.nutrition.protein_g >= p.daily_protein_target * 0.9).length,
    exerciseMet: series.filter((d) => d.exerciseMin >= p.daily_exercise_goal_min).length,
    waterMet: series.filter((d) => d.waterMl >= p.daily_water_target_ml).length,
    streak,
    weekendAvgCalories: weekend.length ? Math.round(avg(weekend.map((d) => d.nutrition.calories))) : null,
    weekdayAvgCalories: weekday.length ? Math.round(avg(weekday.map((d) => d.nutrition.calories))) : null,
    sleepLoggedDays: sleeps.length,
  };
}

/** Average protein by meal type across a set of food logs (per logged day). */
export function proteinByMeal(food: FoodLog[], days: number): Record<MealType, number> {
  const out = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, other: 0 } as Record<MealType, number>;
  for (const f of food) out[f.meal_type] += f.protein_g;
  for (const k of Object.keys(out) as MealType[]) out[k] = Math.round(out[k] / Math.max(1, days));
  return out;
}
