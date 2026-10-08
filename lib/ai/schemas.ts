import { z } from "zod";

const num = z.coerce.number().finite();
const nonNeg = num.min(0);

export const ConfidenceSchema = z.enum(["low", "medium", "high"]).catch("medium");
export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack", "other"]);
export const IntensitySchema = z.enum(["light", "moderate", "vigorous"]).catch("moderate");

export const FoodEstimateSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: num.positive().max(100).catch(1),
  unit: z.string().max(40).catch("serving"),
  calories: nonNeg.max(5000),
  calories_low: nonNeg.max(6000).optional(),
  calories_high: nonNeg.max(6000).optional(),
  protein_g: nonNeg.max(500),
  carbs_g: nonNeg.max(800),
  fat_g: nonNeg.max(400),
  confidence: ConfidenceSchema,
  assumptions: z.array(z.string().max(200)).max(8).catch([]),
  emoji: z.string().max(8).optional(),
});

export const FoodAnalysisSchema = z.object({
  meal_type: MealTypeSchema.nullable().catch(null),
  items: z.array(FoodEstimateSchema).max(25),
  clarification: z.string().max(300).nullable().optional(),
});

export const ExerciseEstimateSchema = z.object({
  activity: z.string().min(1).max(80),
  duration_minutes: num.positive().max(1440),
  distance_km: nonNeg.max(500).nullable().catch(null),
  intensity: IntensitySchema,
  calories_burned: nonNeg.max(6000),
  calories_low: nonNeg.max(8000).optional(),
  calories_high: nonNeg.max(8000).optional(),
  met: nonNeg.max(25).nullable().catch(null),
  confidence: ConfidenceSchema,
  assumptions: z.array(z.string().max(200)).max(8).catch([]),
  emoji: z.string().max(8).optional(),
});

export const ExerciseAnalysisSchema = z.object({
  items: z.array(ExerciseEstimateSchema).min(1).max(10),
  clarification: z.string().max(300).nullable().optional(),
});

/** Universal "how was your day" parse. */
export const DayParseSchema = z.object({
  meals: z
    .array(z.object({ meal_type: MealTypeSchema, time: z.string().regex(/^\d{2}:\d{2}$/).nullable().catch(null), items: z.array(FoodEstimateSchema).min(1) }))
    .catch([]),
  exercise: z.array(ExerciseEstimateSchema).catch([]),
  water_ml: nonNeg.max(10000).nullable().catch(null),
  weight_kg: num.min(30).max(300).nullable().catch(null),
  sleep_minutes: num.min(0).max(1440).nullable().catch(null),
  steps: num.min(0).max(200000).nullable().catch(null),
  note: z.string().max(500).nullable().catch(null),
  clarification: z.string().max(300).nullable().optional(),
});

export const DailyInsightSchema = z.object({
  headline: z.string().max(80),
  summary: z.string().max(600),
  improvement: z.string().max(300),
});

export const WeeklyInsightSchema = z.object({
  headline: z.string().max(100),
  went_well: z.array(z.string().max(200)).max(5),
  to_improve: z.array(z.string().max(200)).max(5),
  focus: z.array(z.string().max(200)).max(3),
});

export const CoachAnswerSchema = z.object({
  answer: z.string().max(1500),
});

export type FoodAnalysisRaw = z.infer<typeof FoodAnalysisSchema>;
export type ExerciseAnalysisRaw = z.infer<typeof ExerciseAnalysisSchema>;
export type DayParse = z.infer<typeof DayParseSchema>;
export type DailyInsight = z.infer<typeof DailyInsightSchema>;
export type WeeklyInsight = z.infer<typeof WeeklyInsightSchema>;

/**
 * Pull the first JSON object out of a model response (handles ```json fences and chatter)
 * and validate it. Returns null instead of throwing.
 */
export function parseJsonSafe<T>(text: string, schema: z.ZodType<T>): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    const r = schema.safeParse(parsed);
    if (!r.success) {
      console.warn("[ai] schema validation failed:", r.error.issues.slice(0, 3));
      return null;
    }
    return r.data;
  } catch (e) {
    console.warn("[ai] invalid JSON from model:", (e as Error).message);
    return null;
  }
}
