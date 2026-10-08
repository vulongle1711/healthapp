import { beforeEach, describe, expect, it, vi } from "vitest";
import { FoodAnalysisSchema, parseJsonSafe } from "@/lib/ai/schemas";

const complete = vi.fn<(...a: unknown[]) => Promise<string>>();
let providerOn = false;
vi.mock("@/lib/ai/provider", () => ({
  getAIProvider: () => (providerOn ? { name: "mock", complete } : null),
  aiAvailable: () => providerOn,
}));

const { analyzeFood, applyPersonalFoods } = await import("@/lib/ai/nutrition");
const { analyzeExercise } = await import("@/lib/ai/exercise");

beforeEach(() => {
  complete.mockReset();
  providerOn = false;
});

describe("AI response validation", () => {
  it("extracts JSON from fenced, chatty output", () => {
    const raw = 'Sure!\n```json\n{"meal_type":"lunch","items":[{"name":"Phở bò","quantity":1,"unit":"bowl","calories":480,"protein_g":28,"carbs_g":60,"fat_g":13,"confidence":"medium","assumptions":["regular bowl"]}],"clarification":null}\n```';
    const r = parseJsonSafe(raw, FoodAnalysisSchema);
    expect(r?.items[0].name).toBe("Phở bò");
  });

  it("returns null for malformed JSON instead of throwing", () => {
    expect(parseJsonSafe("{ items: [oops", FoodAnalysisSchema)).toBeNull();
    expect(parseJsonSafe("no json here", FoodAnalysisSchema)).toBeNull();
    expect(parseJsonSafe('{"items":[{"name":"x","calories":-5}]}', FoodAnalysisSchema)).toBeNull();
  });

  it("tolerates unknown enum values by falling back", () => {
    const r = parseJsonSafe('{"meal_type":"brunch","items":[{"name":"Egg","quantity":2,"unit":"egg","calories":144,"protein_g":12.6,"carbs_g":0.8,"fat_g":9.6,"confidence":"very high","assumptions":[]}]}', FoodAnalysisSchema);
    expect(r?.meal_type).toBeNull();
    expect(r?.items[0].confidence).toBe("medium");
  });
});

describe("analyzeFood", () => {
  it("works offline without an API key", async () => {
    const r = await analyzeFood("I had a bowl of pho bo and an iced milk coffee.");
    expect(r.source).toBe("offline");
    expect(r.items).toHaveLength(2);
    expect(r.total.calories).toBe(r.items[0].calories + r.items[1].calories);
  });

  it("falls back to the offline estimator when the AI returns garbage", async () => {
    providerOn = true;
    complete.mockResolvedValue("I'm sorry, I can't do that");
    const r = await analyzeFood("2 eggs and one banana");
    expect(complete).toHaveBeenCalledOnce();
    expect(r.source).toBe("offline");
    expect(r.items.map((i) => i.name)).toEqual(["Egg", "Banana"]);
  });

  it("falls back when the AI request throws", async () => {
    providerOn = true;
    complete.mockRejectedValue(new Error("network down"));
    const r = await analyzeFood("1 tô phở bò");
    expect(r.source).toBe("offline");
    expect(r.items[0].name).toBe("Phở bò");
  });

  it("uses valid AI output, recomputes totals and flags inconsistent macros", async () => {
    providerOn = true;
    complete.mockResolvedValue(JSON.stringify({
      meal_type: "breakfast",
      items: [
        { name: "Bánh mì thịt", quantity: 1, unit: "sandwich", calories: 500, protein_g: 21, carbs_g: 60, fat_g: 19, confidence: "medium", assumptions: ["street size"] },
        { name: "Mystery", quantity: 1, unit: "serving", calories: 900, protein_g: 5, carbs_g: 5, fat_g: 5, confidence: "high", assumptions: [] },
      ],
      total: { calories: 1, protein_g: 1, carbs_g: 1, fat_g: 1 },
      clarification: null,
    }));
    const r = await analyzeFood("banh mi");
    expect(r.source).toBe("ai");
    expect(r.total.calories).toBe(1400);
    expect(r.items[1].confidence).toBe("low");
  });
});

describe("personal food memory", () => {
  it("applies the user's corrected value across languages", () => {
    const items = [{ name: "Vietnamese iced milk coffee", quantity: 2, unit: "glass", calories: 360, protein_g: 6, carbs_g: 50, fat_g: 10, confidence: "medium" as const, assumptions: [] }];
    const out = applyPersonalFoods(items, [
      { id: "1", user_id: "u", name: "Cà phê sữa đá", normalized_name: "ca phe sua da", calories: 150, protein_g: 3, carbs_g: 23, fat_g: 5, unit: "glass", times_logged: 4, updated_at: "" },
    ]);
    expect(out[0].calories).toBe(300);
    expect(out[0].confidence).toBe("high");
    expect(out[0].assumptions[0]).toMatch(/usual value/);
  });
});

describe("analyzeExercise", () => {
  it("estimates offline", async () => {
    const r = await analyzeExercise("Played pickleball for 90 minutes", 74);
    expect(r.items[0].calories_burned).toBe(389);
  });
  it("caps implausible AI numbers", async () => {
    providerOn = true;
    complete.mockResolvedValue(JSON.stringify({ items: [{ activity: "Walking", duration_minutes: 30, distance_km: null, intensity: "light", calories_burned: 3000, met: 3, confidence: "high", assumptions: [] }], clarification: null }));
    const r = await analyzeExercise("walk 30 min", 70);
    expect(r.items[0].calories_burned).toBeLessThanOrEqual(450);
    expect(r.items[0].confidence).toBe("low");
  });
});
