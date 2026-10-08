import { NextResponse } from "next/server";
import { z } from "zod";
import { aiContext, jsonError } from "@/lib/api/context";
import { analyzeDay } from "@/lib/ai/daylog";

export const runtime = "nodejs";

const Body = z.object({ text: z.string().trim().min(2).max(2000) });

export async function POST(req: Request) {
  const ctx = await aiContext();
  if ("error" in ctx) return ctx.error;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError("Tell me about your day, e.g. “phở for breakfast, pickleball 90 min”.");
  try {
    const userFoods = await ctx.repo.listUserFoods().catch(() => []);
    const result = await analyzeDay(body.data.text, { weightKg: ctx.profile?.weight_kg ?? 70, localTime: ctx.localTime, fallbackMeal: ctx.defaultMeal, userFoods });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/ai/day]", e);
    return jsonError("We couldn't read that. Try again, or log items one by one.", 502);
  }
}
