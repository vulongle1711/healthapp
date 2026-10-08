import { NextResponse } from "next/server";
import { z } from "zod";
import { aiContext, jsonError } from "@/lib/api/context";
import { loadDay, loadRange } from "@/lib/data/queries";
import { askCoach } from "@/lib/ai/insights";

export const runtime = "nodejs";

const Body = z.object({ question: z.string().trim().min(2).max(500) });

export async function POST(req: Request) {
  const ctx = await aiContext();
  if ("error" in ctx) return ctx.error;
  if (!ctx.profile) return jsonError("Finish your profile first.", 409);
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError("Ask me something, e.g. “Hôm nay ăn hơi nhiều?”");

  try {
    const [day, range] = await Promise.all([loadDay(ctx.repo, ctx.profile, ctx.tz), loadRange(ctx.repo, ctx.profile, ctx.tz, 14)]);
    const weights = range.series.filter((d) => d.weightKg !== null);
    const result = await askCoach(body.data.question, {
      profile: ctx.profile,
      today: day.metrics,
      todayFoods: day.bundle.food.map((f) => ({ name: f.food_name, calories: Math.round(f.calories), meal_type: f.meal_type })),
      last14: range.stats,
      weightTrend: { first: weights[0]?.weightKg ?? null, last: weights.at(-1)?.weightKg ?? null, days: 14 },
      bmr: day.bmr,
      tdee: day.tdee,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/ai/coach]", e);
    return jsonError("The coach is unavailable right now. Please try again later.", 502);
  }
}
