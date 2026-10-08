import { describe, expect, it } from "vitest";
import {
  parseFoodText,
  parseExerciseText,
  parseDayText,
  parseDuration,
  parseWaterMl,
  parseSteps,
  detectMealType,
} from "@/lib/ai/parser";
import { macrosReconcile } from "@/lib/calculations/macros";

describe("offline food parser", () => {
  it("parses '2 eggs and one banana'", () => {
    const r = parseFoodText("I ate 2 eggs and one banana");
    expect(r.items.map((i) => i.name)).toEqual(["Egg", "Banana"]);
    expect(r.items[0].quantity).toBe(2);
    expect(r.items[0].calories).toBe(144);
    expect(r.items[1].calories).toBe(105);
    expect(r.unrecognized).toEqual([]);
  });

  it("parses '1 tô phở bò'", () => {
    const r = parseFoodText("1 tô phở bò");
    expect(r.items).toHaveLength(1);
    expect(r.items[0].name).toBe("Phở bò");
    expect(r.items[0].calories).toBeGreaterThan(380);
    expect(r.items[0].calories).toBeLessThan(600);
    expect(r.items[0].calories_low!).toBeLessThan(r.items[0].calories);
    expect(r.items[0].calories_high!).toBeGreaterThan(r.items[0].calories);
  });

  it("understands half portions in Vietnamese and English", () => {
    const vi = parseFoodText("Ăn nửa tô phở bò");
    const en = parseFoodText("half a bowl of pho bo");
    const full = parseFoodText("1 tô phở bò");
    expect(vi.items[0].calories).toBe(Math.round(full.items[0].calories / 2));
    expect(en.items[0].calories).toBe(vi.items[0].calories);
  });

  it("prefers the most specific dish name", () => {
    expect(parseFoodText("1 phần cơm tấm sườn bì chả").items[0].name).toBe("Cơm tấm sườn bì chả");
    expect(parseFoodText("cơm tấm").items[0].name).toBe("Cơm tấm sườn");
  });

  it("accepts the 'bánh mỳ' spelling", () => {
    expect(parseFoodText("bánh mỳ thập cẩm").items[0]?.name).toBe("Bánh mì thịt");
    expect(parseFoodText("bánh mì thập cẩm").items[0]?.name).toBe("Bánh mì thịt");
  });

  it("counts rolls", () => {
    const r = parseFoodText("2 cuốn gỏi cuốn");
    expect(r.items[0].name).toBe("Gỏi cuốn");
    expect(r.items[0].quantity).toBe(2);
    expect(r.items[0].calories).toBe(180);
  });

  it("parses drinks and multiple items without diacritics", () => {
    const r = parseFoodText("an 1 to pho bo, uong ca phe sua da");
    expect(r.items.map((i) => i.name)).toEqual(["Phở bò", "Cà phê sữa đá"]);
  });

  it("handles the acceptance-test sentence", () => {
    const r = parseFoodText("I had a bowl of pho bo and an iced milk coffee.");
    expect(r.items.map((i) => i.name)).toEqual(["Phở bò", "Cà phê sữa đá"]);
  });

  it("scales up 'hơi nhiều' and flags it", () => {
    const base = parseFoodText("ăn cơm").items[0];
    const more = parseFoodText("ăn hơi nhiều cơm").items[0];
    expect(more.calories).toBeGreaterThan(base.calories);
    expect(more.assumptions.join(" ")).toMatch(/Larger portion/);
  });

  it("uses grams when given", () => {
    const r = parseFoodText("300g chicken breast");
    expect(r.items[0].unit).toBe("g");
    expect(r.items[0].calories).toBe(500);
  });

  it("reports unknown foods instead of inventing numbers", () => {
    const r = parseFoodText("2 eggs and a quokka sandwich");
    expect(r.items.map((i) => i.name)).toEqual(["Egg"]);
    expect(r.unrecognized.join(" ")).toMatch(/quokka/);
  });

  it("keeps calories and macros roughly consistent for every item", () => {
    const r = parseFoodText("pho bo, banh mi, com tam suon bi cha, ca phe sua da, tra sua, 2 eggs, banana");
    for (const i of r.items) expect(macrosReconcile(i, 0.25)).toBe(true);
  });

  it("does not mistake 'tôi' (I) for dinner", () => {
    expect(detectMealType("Tôi ăn bánh mì")).toBeNull();
    expect(detectMealType("tôi ăn tối với cơm")).toBe("dinner");
    expect(detectMealType("bữa sáng")).toBe("breakfast");
  });
});

describe("offline exercise parser", () => {
  it("parses 'Played pickleball for 90 minutes'", () => {
    const [e] = parseExerciseText("Played pickleball for 90 minutes", 74);
    expect(e.activity).toBe("Pickleball");
    expect(e.duration_minutes).toBe(90);
    expect(e.intensity).toBe("moderate");
    // (4.5 − 1) × 74 × 1.5
    expect(e.calories_burned).toBe(389);
  });

  it("parses Vietnamese 'Chơi pickleball 1 tiếng rưỡi'", () => {
    const [e] = parseExerciseText("Chơi pickleball 1 tiếng rưỡi", 74);
    expect(e.duration_minutes).toBe(90);
  });

  it("uses pace when distance is given", () => {
    const [e] = parseExerciseText("ran 5km in 30 minutes", 70);
    expect(e.activity).toBe("Running");
    expect(e.met).toBe(10);
    expect(e.confidence).toBe("high");
  });

  it("parses durations in several formats", () => {
    expect(parseDuration("1h30")).toBe(90);
    expect(parseDuration("1.5 hours")).toBe(90);
    expect(parseDuration("45 phút")).toBe(45);
    expect(parseDuration("half an hour")).toBe(30);
    expect(parseDuration("một tiếng")).toBe(60);
  });
});

describe("water, steps and day log", () => {
  it("parses '2 liters of water'", () => {
    expect(parseWaterMl("2 liters of water")).toBe(2000);
    expect(parseWaterMl("uống 3 ly nước")).toBe(750);
    expect(parseWaterMl("nước ép cam")).toBeNull();
  });

  it("parses steps", () => {
    expect(parseSteps("8,420 steps")).toBe(8420);
    expect(parseSteps("đi 8k bước")).toBe(8000);
  });

  it("splits a whole day into events", () => {
    const r = parseDayText(
      "I had pho for breakfast, chicken rice for lunch, played pickleball for 1.5 hours and drank 2 liters of water.",
      74,
    );
    expect(r.meals.map((m) => m.meal_type)).toEqual(["breakfast", "lunch"]);
    expect(r.meals[0].items[0].name).toBe("Phở bò");
    expect(r.meals[1].items[0].name).toBe("Cơm gà");
    expect(r.exercise[0].activity).toBe("Pickleball");
    expect(r.exercise[0].duration_minutes).toBe(90);
    expect(r.water_ml).toBe(2000);
  });

  it("splits a Vietnamese day", () => {
    const r = parseDayText("Sáng ăn 1 tô phở bò, uống cà phê sữa đá. Chơi pickleball 1 tiếng rưỡi, uống 2 lít nước", 74);
    expect(r.meals[0].meal_type).toBe("breakfast");
    expect(r.meals[0].items.map((i) => i.name)).toEqual(["Phở bò", "Cà phê sữa đá"]);
    expect(r.exercise[0].duration_minutes).toBe(90);
    expect(r.water_ml).toBe(2000);
  });
});
