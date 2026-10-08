import "server-only";
import type { ExerciseEstimate } from "@/types/exercise";
import { getAIProvider } from "./provider";
import { EXERCISE_SYSTEM } from "./prompts";
import { ExerciseAnalysisSchema, parseJsonSafe } from "./schemas";
import { parseExerciseText } from "./parser";

export interface ExerciseAnalysis {
  items: ExerciseEstimate[];
  clarification: string | null;
  source: "ai" | "offline";
}

function sanitize(e: ExerciseEstimate, weightKg: number): ExerciseEstimate {
  const out = { ...e, assumptions: [...(e.assumptions ?? [])] };
  // Sanity cap: > 15 active kcal/min sustained is implausible for almost everyone.
  const cap = Math.round(out.duration_minutes * 15 * (weightKg / 70));
  if (out.calories_burned > cap) {
    out.calories_burned = cap;
    out.confidence = "low";
    out.assumptions.push("Capped at a plausible maximum");
  }
  out.calories_burned = Math.round(out.calories_burned);
  return out;
}

export async function analyzeExercise(description: string, weightKg: number): Promise<ExerciseAnalysis> {
  const text = description.trim().slice(0, 600);
  const provider = getAIProvider();
  if (provider) {
    try {
      const raw = await provider.complete({
        system: EXERCISE_SYSTEM,
        prompt: `Body weight: ${weightKg} kg\nDescription: """${text}"""`,
        maxTokens: 800,
      });
      const parsed = parseJsonSafe(raw, ExerciseAnalysisSchema);
      if (parsed) {
        return { items: parsed.items.map((i) => sanitize(i, weightKg)), clarification: parsed.clarification ?? null, source: "ai" };
      }
    } catch (e) {
      console.error("[ai] exercise request failed:", (e as Error).message);
    }
  }
  const items = parseExerciseText(text, weightKg).map((i) => sanitize(i, weightKg));
  return {
    items,
    clarification: items.length ? null : "I couldn't recognise an activity. Try “chạy bộ 30 phút” or “pickleball 90 minutes”.",
    source: "offline",
  };
}
