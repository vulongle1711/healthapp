import { NextResponse } from "next/server";
import { aiContext, jsonError } from "@/lib/api/context";
import { loadDay, loadRange } from "@/lib/data/queries";
import { generateDailyInsight, generateWeeklyInsight } from "@/lib/ai/insights";
import { addDays, dateKey } from "@/lib/utils/dates";
import { groupMeals } from "@/lib/calculations/summary";
import { getLang } from "@/lib/i18n/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await aiContext();
  if ("error" in ctx) return ctx.error;
  if (!ctx.profile) return jsonError("Finish your profile first.", 409);
  const lang = await getLang();
  const kind = new URL(req.url).searchParams.get("kind") === "weekly" ? "weekly" : "daily";

  try {
    if (kind === "daily") {
      const day = await loadDay(ctx.repo, ctx.profile, ctx.tz);
      const meals = groupMeals(day.bundle.food).map((m) => ({
        meal_type: m.meal_type,
        calories: m.totals.calories,
        protein_g: m.totals.protein_g,
        items: m.items.map((i) => i.food_name),
      }));
      const insight = await generateDailyInsight({ profile: ctx.profile, day: day.metrics, score: day.score, meals, lang });
      return NextResponse.json({ ...insight, score: day.score });
    }

    // Last 7 complete days (today is still in progress, so it would drag averages down).
    const yesterday = addDays(dateKey(new Date(), ctx.tz), -1);
    const week = await loadRange(ctx.repo, ctx.profile, ctx.tz, 7, yesterday);
    const prev = await loadRange(ctx.repo, ctx.profile, ctx.tz, 7, addDays(yesterday, -7));
    const topMeals = [...week.bundle.food].sort((a, b) => b.calories - a.calories).slice(0, 5).map((f) => ({ name: f.food_name, calories: Math.round(f.calories) }));
    const insight = await generateWeeklyInsight({
      profile: ctx.profile,
      week: week.stats,
      previous: prev.stats.daysLogged ? prev.stats : null,
      proteinByMeal: week.proteinByMeal,
      topMeals,
      lang,
    });
    return NextResponse.json({ ...insight, stats: week.stats });
  } catch (e) {
    console.error("[api/ai/insights]", e);
    return jsonError("Insights are unavailable right now. Please try again later.", 502);
  }
}
