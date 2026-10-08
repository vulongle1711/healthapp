import { NextResponse } from "next/server";
import { z } from "zod";
import { aiContext, jsonError } from "@/lib/api/context";
import { analyzeFood, analyzeFoodImage, AIUnavailableError } from "@/lib/ai/nutrition";

export const runtime = "nodejs";

const TextBody = z.object({ text: z.string().trim().min(2).max(1000) });
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function POST(req: Request) {
  const ctx = await aiContext();
  if ("error" in ctx) return ctx.error;
  const userFoods = await ctx.repo.listUserFoods().catch(() => []);

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image");
      if (!(file instanceof File)) return jsonError("No photo received.");
      if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) return jsonError("Please upload a JPEG, PNG or WebP photo.");
      if (file.size > MAX_IMAGE_BYTES) return jsonError("That photo is too large (max 5 MB).");
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const note = typeof form.get("note") === "string" ? (form.get("note") as string) : undefined;
      const result = await analyzeFoodImage({ mediaType: file.type as (typeof IMAGE_TYPES)[number], base64 }, note, { userFoods, localTime: ctx.localTime });
      return NextResponse.json({ ...result, meal_type: result.meal_type ?? ctx.defaultMeal });
    }

    const body = TextBody.safeParse(await req.json().catch(() => null));
    if (!body.success) return jsonError("Describe what you ate, e.g. “1 tô phở bò”.");
    const result = await analyzeFood(body.data.text, { userFoods, localTime: ctx.localTime });
    return NextResponse.json({ ...result, meal_type: result.meal_type ?? ctx.defaultMeal });
  } catch (e) {
    if (e instanceof AIUnavailableError) {
      return jsonError("Photo scanning needs an AI key. Describe the meal in words instead — that works offline.", 503);
    }
    console.error("[api/ai/food]", e);
    return jsonError("We couldn't analyze that meal. You can try again or enter the nutrition manually.", 502);
  }
}
