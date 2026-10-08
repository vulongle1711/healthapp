import "server-only";
import type { MealType } from "@/types/nutrition";
import type { UserFood } from "@/types/nutrition";
import { getAIProvider } from "./provider";
import { DAY_SYSTEM } from "./prompts";
import { DayParseSchema, parseJsonSafe, type DayParse } from "./schemas";
import { parseDayText } from "./parser";
import { applyPersonalFoods } from "./nutrition";

export interface DayAnalysis extends DayParse {
  source: "ai" | "offline";
}

export async function analyzeDay(
  text: string,
  ctx: { weightKg: number; localTime: string; fallbackMeal: MealType; userFoods?: UserFood[] },
): Promise<DayAnalysis> {
  const input = text.trim().slice(0, 2000);
  const provider = getAIProvider();
  let result: DayAnalysis | null = null;

  if (provider) {
    try {
      const raw = await provider.complete({
        system: DAY_SYSTEM,
        prompt: `Body weight: ${ctx.weightKg} kg\nLocal time now: ${ctx.localTime}\nText: """${input}"""`,
        maxTokens: 2500,
      });
      const parsed = parseJsonSafe(raw, DayParseSchema);
      if (parsed) result = { ...parsed, source: "ai" };
    } catch (e) {
      console.error("[ai] day parse failed:", (e as Error).message);
    }
  }

  if (!result) {
    const off = parseDayText(input, ctx.weightKg, ctx.fallbackMeal);
    result = {
      meals: off.meals,
      exercise: off.exercise,
      water_ml: off.water_ml,
      weight_kg: off.weight_kg,
      sleep_minutes: off.sleep_minutes,
      steps: off.steps,
      note: off.note,
      clarification: off.unrecognized.length ? `I couldn't estimate "${off.unrecognized.join(", ")}" offline — add it manually.` : null,
      source: "offline",
    };
  }

  result.meals = result.meals.map((m) => ({ ...m, items: applyPersonalFoods(m.items, ctx.userFoods) }));
  return result;
}
