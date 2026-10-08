import "server-only";
import type { FoodAnalysis, FoodEstimate, MealType, UserFood } from "@/types/nutrition";
import { sumNutrition, caloriesFromMacros } from "@/lib/calculations/macros";
import { getAIProvider, type AIImage } from "./provider";
import { NUTRITION_SYSTEM, IMAGE_SYSTEM } from "./prompts";
import { FoodAnalysisSchema, parseJsonSafe } from "./schemas";
import { canonicalFoodKey, parseFoodText } from "./parser";

export class AIUnavailableError extends Error {
  constructor(msg = "AI provider not configured") {
    super(msg);
  }
}

export interface NutritionContext {
  userFoods?: UserFood[];
  /** Local time, e.g. "12:40", helps the model guess the meal. */
  localTime?: string;
}

function sanitizeItem(i: FoodEstimate): FoodEstimate {
  const item = { ...i, assumptions: [...(i.assumptions ?? [])] };
  // Keep the range sensible
  if (item.calories_low !== undefined && item.calories_low > item.calories) item.calories_low = item.calories;
  if (item.calories_high !== undefined && item.calories_high < item.calories) item.calories_high = item.calories;
  // Flag inconsistent macros instead of silently trusting them
  const implied = caloriesFromMacros(item);
  if (item.calories > 50 && Math.abs(implied - item.calories) / item.calories > 0.35 && !/alcohol|bia|beer|wine|ruou/i.test(item.name)) {
    item.confidence = "low";
    item.assumptions.push(`Macros imply ~${implied} kcal — check the numbers`);
  }
  return item;
}

/** Apply the user's own past corrections ("I log cà phê sữa đá as 150 kcal"). */
export function applyPersonalFoods(items: FoodEstimate[], userFoods: UserFood[] = []): FoodEstimate[] {
  if (!userFoods.length) return items;
  const byKey = new Map(userFoods.map((u) => [u.normalized_name, u]));
  return items.map((item) => {
    const u = byKey.get(canonicalFoodKey(item.name));
    if (!u) return item;
    const sameUnit = item.unit === u.unit || !["g", "ml"].includes(item.unit);
    if (!sameUnit) return item;
    const q = item.quantity || 1;
    return {
      ...item,
      unit: u.unit,
      calories: Math.round(u.calories * q),
      calories_low: Math.round(u.calories * q * 0.9),
      calories_high: Math.round(u.calories * q * 1.1),
      protein_g: Math.round(u.protein_g * q * 10) / 10,
      carbs_g: Math.round(u.carbs_g * q * 10) / 10,
      fat_g: Math.round(u.fat_g * q * 10) / 10,
      confidence: "high",
      assumptions: [`Using your usual value: ${u.calories} kcal per ${u.unit}`, ...item.assumptions.slice(0, 2)],
    };
  });
}

function offline(description: string): FoodAnalysis {
  const r = parseFoodText(description);
  const clarification = r.unrecognized.length
    ? `I couldn't estimate "${r.unrecognized.join(", ")}" offline — add it as a manual item.`
    : r.items.length === 0
      ? "I couldn't find any food in that. Try e.g. “1 tô phở bò và 1 ly cà phê sữa đá”."
      : null;
  return { meal_type: r.meal_type, items: r.items, total: sumNutrition(r.items), clarification, source: "offline" };
}

function finalize(meal_type: MealType | null, items: FoodEstimate[], clarification: string | null | undefined, source: "ai" | "offline", ctx: NutritionContext): FoodAnalysis {
  const cleaned = applyPersonalFoods(items.map(sanitizeItem), ctx.userFoods);
  return { meal_type, items: cleaned, total: sumNutrition(cleaned), clarification: clarification ?? null, source };
}

/** Estimate nutrition from a text description. Never throws for bad AI output — falls back to the offline estimator. */
export async function analyzeFood(description: string, ctx: NutritionContext = {}): Promise<FoodAnalysis> {
  const text = description.trim().slice(0, 1000);
  const provider = getAIProvider();
  if (provider) {
    try {
      const raw = await provider.complete({
        system: NUTRITION_SYSTEM,
        prompt: `Local time: ${ctx.localTime ?? "unknown"}\nDescription: """${text}"""`,
      });
      const parsed = parseJsonSafe(raw, FoodAnalysisSchema);
      if (parsed && (parsed.items.length || parsed.clarification)) {
        return finalize(parsed.meal_type, parsed.items, parsed.clarification, "ai", ctx);
      }
      console.warn("[ai] nutrition: unusable response, falling back to offline estimator");
    } catch (e) {
      console.error("[ai] nutrition request failed:", (e as Error).message);
    }
  }
  const off = offline(text);
  return finalize(off.meal_type, off.items, off.clarification, "offline", ctx);
}

/** Estimate nutrition from a meal photo. Requires an AI provider. */
export async function analyzeFoodImage(image: AIImage, note: string | undefined, ctx: NutritionContext = {}): Promise<FoodAnalysis> {
  const provider = getAIProvider();
  if (!provider) throw new AIUnavailableError("Photo analysis needs an AI key");
  const raw = await provider.complete({
    system: IMAGE_SYSTEM,
    prompt: `Local time: ${ctx.localTime ?? "unknown"}\n${note ? `User note: """${note.slice(0, 300)}"""` : "No note."}\nEstimate this meal.`,
    image,
    maxTokens: 1500,
  });
  const parsed = parseJsonSafe(raw, FoodAnalysisSchema);
  if (!parsed) throw new Error("Invalid AI response for image");
  // Photo estimates are never "high" confidence
  const items = parsed.items.map((i) => ({
    ...i,
    confidence: i.confidence === "high" ? ("medium" as const) : i.confidence,
    calories_low: i.calories_low ?? Math.round(i.calories * 0.8),
    calories_high: i.calories_high ?? Math.round(i.calories * 1.25),
  }));
  return finalize(parsed.meal_type, items, parsed.clarification, "ai", ctx);
}
