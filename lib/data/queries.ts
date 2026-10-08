import "server-only";
import type { Repo } from "./types";
import type { Profile } from "@/types/user";
import { dateKey, rangeUtc, startOfDayUtc, addDays } from "@/lib/utils/dates";
import { calculateBMR } from "@/lib/calculations/bmr";
import { calculateTDEE } from "@/lib/calculations/tdee";
import { dayBalance } from "@/lib/calculations/calories";
import { dayScore, groupMeals, metricsFor, periodStats, seriesFor, proteinByMeal } from "@/lib/calculations/summary";

export function energyFor(p: Profile) {
  const bmr = calculateBMR({ weightKg: p.weight_kg, heightCm: p.height_cm, age: p.age, sex: p.sex });
  return { bmr, tdee: calculateTDEE(bmr, p.activity_level) };
}

export async function loadDay(repo: Repo, profile: Profile, tz: string, key = dateKey(new Date(), tz)) {
  const start = startOfDayUtc(key, tz).toISOString();
  const end = startOfDayUtc(addDays(key, 1), tz).toISOString();
  const bundle = await repo.getLogs(start, end);
  const metrics = metricsFor(key, bundle);
  const { bmr, tdee } = energyFor(profile);
  const balance = dayBalance({ consumed: metrics.nutrition.calories, exercise: metrics.exerciseKcal, target: profile.daily_calorie_target, bmr });
  return {
    key,
    bundle,
    metrics,
    meals: groupMeals(bundle.food),
    balance,
    bmr,
    tdee,
    score: dayScore(metrics, profile),
  };
}

export async function loadRange(repo: Repo, profile: Profile, tz: string, days: number, endKey = dateKey(new Date(), tz)) {
  const r = rangeUtc(endKey, days, tz);
  const bundle = await repo.getLogs(r.start, r.end);
  const series = seriesFor(bundle, r.startKey, r.endKey, tz);
  return {
    ...r,
    bundle,
    series,
    stats: periodStats(series, profile, bundle.exercise.length),
    proteinByMeal: proteinByMeal(bundle.food, Math.max(1, series.filter((d) => d.logged).length)),
  };
}
