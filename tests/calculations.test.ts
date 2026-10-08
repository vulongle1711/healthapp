import { describe, expect, it } from "vitest";
import { calculateBMR } from "@/lib/calculations/bmr";
import { calculateTDEE, ACTIVITY_MULTIPLIERS } from "@/lib/calculations/tdee";
import { calculateMacroTargets, caloriesFromMacros, macrosReconcile, sumNutrition } from "@/lib/calculations/macros";
import { suggestTargets, dayBalance, calorieStatus, MIN_CALORIES } from "@/lib/calculations/calories";
import { dayScore, metricsFor, periodStats, seriesFor } from "@/lib/calculations/summary";
import { activeCalories } from "@/lib/ai/exercise-db";
import { buildDemoData } from "@/lib/data/seed";
import { addDays, dateKey, rangeUtc, startOfDayUtc } from "@/lib/utils/dates";

describe("BMR (Mifflin–St Jeor)", () => {
  it("matches the published formula for men", () => {
    // 10×74 + 6.25×175 − 5×30 + 5 = 1688.75
    expect(calculateBMR({ weightKg: 74, heightCm: 175, age: 30, sex: "male" })).toBe(1689);
  });
  it("matches the published formula for women", () => {
    // 10×60 + 6.25×165 − 5×28 − 161 = 1330.25
    expect(calculateBMR({ weightKg: 60, heightCm: 165, age: 28, sex: "female" })).toBe(1330);
  });
});

describe("TDEE", () => {
  it("applies activity multipliers", () => {
    expect(calculateTDEE(1689, "moderate")).toBe(Math.round(1689 * 1.55));
    expect(calculateTDEE(1000, "sedentary")).toBe(1200);
    expect(Object.values(ACTIVITY_MULTIPLIERS)).toEqual([1.2, 1.375, 1.55, 1.725, 1.9]);
  });
});

describe("targets", () => {
  it("creates a ~500 kcal deficit for 0.5 kg/week loss", () => {
    const t = suggestTargets({ age: 30, sex: "male", heightCm: 175, weightKg: 74, activity: "moderate", goal: "lose_weight" });
    expect(t.tdee).toBe(2618);
    expect(t.adjustment).toBe(-550);
    expect(t.calories).toBe(2070);
    expect(t.protein_g).toBe(148);
  });

  it("caps aggressive deficits at 25% of TDEE", () => {
    const t = suggestTargets({ age: 30, sex: "male", heightCm: 175, weightKg: 74, activity: "sedentary", goal: "lose_weight", weeklyChangeKg: -1.5 });
    expect(t.adjustment).toBe(-Math.round(t.tdee * 0.25));
    expect(t.notes.join(" ")).toMatch(/capped/);
  });

  it("never suggests below the safety floor", () => {
    const t = suggestTargets({ age: 70, sex: "female", heightCm: 150, weightKg: 45, activity: "sedentary", goal: "lose_weight", weeklyChangeKg: -1 });
    expect(t.calories).toBeGreaterThanOrEqual(MIN_CALORIES.female);
  });

  it("splits macros so they add back up to the calorie target", () => {
    const m = calculateMacroTargets({ calories: 2200, weightKg: 74, goal: "build_muscle" });
    expect(m.protein_g).toBe(148);
    expect(Math.abs(caloriesFromMacros(m) - 2200)).toBeLessThan(10);
  });
});

describe("calorie balance", () => {
  it("computes net and remaining without treating exercise as total burn", () => {
    const b = dayBalance({ consumed: 1980, exercise: 420, target: 2200, bmr: 1689 });
    expect(b.net).toBe(1560);
    expect(b.remaining).toBe(220);
    expect(b.estimatedBurned).toBe(Math.round(1689 * 1.2) + 420);
  });

  it("classifies status for colours", () => {
    expect(calorieStatus(1400, 2200)).toBe("on_track");
    expect(calorieStatus(2150, 2200)).toBe("near");
    expect(calorieStatus(2500, 2200)).toBe("over");
  });

  it("computes active exercise calories with (MET − 1)", () => {
    expect(activeCalories(4.5, 74, 90)).toBe(389);
    expect(activeCalories(1, 74, 60)).toBe(0);
  });
});

describe("macro helpers", () => {
  it("sums nutrition", () => {
    expect(sumNutrition([{ calories: 480, protein_g: 28, carbs_g: 60, fat_g: 13 }, { calories: 160, protein_g: 3, carbs_g: 25, fat_g: 5 }])).toEqual({ calories: 640, protein_g: 31, carbs_g: 85, fat_g: 18 });
  });
  it("detects inconsistent macros", () => {
    expect(macrosReconcile({ calories: 480, protein_g: 28, carbs_g: 60, fat_g: 13 })).toBe(true);
    expect(macrosReconcile({ calories: 100, protein_g: 40, carbs_g: 40, fat_g: 20 })).toBe(false);
  });
});

describe("dates & aggregation", () => {
  it("computes local midnight in Saigon", () => {
    expect(startOfDayUtc("2026-10-07", "Asia/Ho_Chi_Minh").toISOString()).toBe("2026-10-06T17:00:00.000Z");
    expect(dateKey("2026-10-06T17:30:00Z", "Asia/Ho_Chi_Minh")).toBe("2026-10-07");
  });

  it("aggregates demo data into a sensible series and score", () => {
    const now = new Date("2026-10-07T10:00:00Z");
    const tz = "Asia/Ho_Chi_Minh";
    const { profile, logs } = buildDemoData(now, tz);
    const end = addDays(dateKey(now, tz), -1);
    const r = rangeUtc(end, 7, tz);
    const series = seriesFor(logs, r.startKey, r.endKey, tz);
    expect(series).toHaveLength(7);
    const stats = periodStats(series, profile);
    expect(stats.avgCalories).toBeGreaterThan(1400);
    expect(stats.avgCalories).toBeLessThan(3000);
    const logged = series.find((d) => d.logged)!;
    const score = dayScore(logged, profile)!;
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(10);
    expect(score.components.reduce((s, c) => s + c.max, 0)).toBe(10);
  });

  it("returns no score for a day with no food", () => {
    const { profile } = buildDemoData();
    const empty = metricsFor("2026-01-01", { food: [], exercise: [], water: [], weight: [], sleep: [], steps: [], notes: [] });
    expect(dayScore(empty, profile)).toBeNull();
  });
});
