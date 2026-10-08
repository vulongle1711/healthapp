import { NextResponse } from "next/server";
import { z } from "zod";
import { aiContext, jsonError } from "@/lib/api/context";
import { analyzeExercise } from "@/lib/ai/exercise";

export const runtime = "nodejs";

const Body = z.object({ text: z.string().trim().min(2).max(600) });

export async function POST(req: Request) {
  const ctx = await aiContext();
  if ("error" in ctx) return ctx.error;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError("Describe your workout, e.g. “pickleball 90 phút”.");
  try {
    const result = await analyzeExercise(body.data.text, ctx.profile?.weight_kg ?? 70);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/ai/exercise]", e);
    return jsonError("We couldn't analyze that workout. You can enter it manually.", 502);
  }
}
