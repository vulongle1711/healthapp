/**
 * Offline natural-language parser (English + Vietnamese, with or without diacritics).
 *
 * Used when no AI key is configured, when the AI call fails, and as a
 * deterministic baseline in tests. It recognises foods from the built-in
 * table, quantities ("2", "nửa tô", "half a bowl", "200g"), meal words,
 * exercise durations ("1 tiếng rưỡi", "90 min", "1h30"), water, weight,
 * sleep and steps.
 */
import type { FoodEstimate, MealType, Confidence } from "@/types/nutrition";
import type { ExerciseEstimate, Intensity } from "@/types/exercise";
import { ALIAS_INDEX, type FoodRef } from "./food-db";
import { ACTIVITY_ALIAS_INDEX, activeCalories, metFromSpeed, type ActivityRef } from "./exercise-db";

// ───────────────────────── text utils ─────────────────────────

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\bbanh my\b/g, "banh mi") // "bánh mỳ" is a common spelling; "my" would otherwise be dropped as a stopword
    .replace(/(\d),(\d)/g, "$1.$2") // 1,5 → 1.5 (Vietnamese decimal comma)
    .replace(/[^a-z0-9.,;:+\n%\s-]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const NUM_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  couple: 2, half: 0.5, mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10, nua: 0.5, vai: 2,
};

const UNIT_WORDS = new Set([
  "to", "bat", "chen", "dia", "phan", "suat", "ly", "coc", "cuon", "cai", "o", "qua", "trai", "mieng", "lon", "chai", "hop",
  "goi", "con", "khuc", "lat", "muong", "tach",
  "bowl", "bowls", "plate", "plates", "cup", "cups", "glass", "glasses", "slice", "slices", "piece", "pieces", "can", "cans",
  "bottle", "bottles", "serving", "servings", "portion", "portions", "roll", "rolls", "scoop", "scoops", "pack", "packs",
  "sandwich", "sandwiches", "medium", "large", "small",
]);

const BIGGER = ["hoi nhieu", "nhieu", "lon", "big", "large", "extra", "dac biet", "double", "huge", "a lot of", "lots of", "loads of", "size l"];
const SMALLER = ["it", "nho", "small", "little", "a bit of", "mini", "size s"];
const LESS_SUGAR = ["it duong", "less sugar", "50 duong", "50% duong", "half sugar"];
const NO_SUGAR = ["khong duong", "no sugar", "unsweetened", "0 duong", "0% duong", "sugar free"];

const STOPWORDS = new Set([
  "i", "ate", "had", "have", "eat", "eating", "drank", "drink", "drinking", "for", "a", "an", "the", "and", "with", "of", "some", "my",
  "also", "then", "plus", "just", "today", "this", "morning", "afternoon", "evening", "night", "at", "in", "on", "to", "too",
  "an", "uong", "toi", "minh", "em", "anh", "va", "voi", "roi", "cho", "bua", "sang", "trua", "chieu", "nay", "hom", "them", "duoc",
  "breakfast", "lunch", "dinner", "snack", "supper", "vat", "xe", "phu", "buoi", "luc", "khoang", "tam", "around", "about", "like",
  "hoi", "nhieu", "it", "nho", "lon", "big", "small", "large", "medium", "little", "bit", "lot", "lots", "half",
  ...Object.keys(NUM_WORDS), ...UNIT_WORDS,
]);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(text: string, phrase: string) {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(phrase)}([^a-z0-9]|$)`).test(text);
}

// ───────────────────────── meal type ─────────────────────────

const MEAL_WORDS: [MealType, string[]][] = [
  ["breakfast", ["breakfast", "an sang", "bua sang", "sang nay", "buoi sang", "sang"]],
  ["lunch", ["lunch", "an trua", "bua trua", "trua nay", "buoi trua", "trua"]],
  ["dinner", ["dinner", "supper", "an toi", "bua toi", "toi nay", "buoi toi", "an chieu", "bua chieu"]],
  ["snack", ["snack", "snacks", "an vat", "an xe", "bua phu", "an nhe"]],
];

export function detectMealType(text: string): MealType | null {
  const t = normalizeText(text);
  for (const [meal, words] of MEAL_WORDS) if (words.some((w) => hasPhrase(t, w))) return meal;
  return null;
}

/** Default meal for a time of day (local hour). */
export function mealForHour(hour: number): MealType {
  if (hour >= 4 && hour < 10.5) return "breakfast";
  if (hour >= 10.5 && hour < 14.5) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

// ───────────────────────── quantities ─────────────────────────

interface Qty {
  qty: number | null;
  grams: number | null;
  ml: number | null;
  unit: string | null;
}

function parseQuantityPrefix(prefix: string): Qty {
  const tokens = prefix.trim().split(/\s+/).filter(Boolean);
  const out: Qty = { qty: null, grams: null, ml: null, unit: null };
  while (tokens.length && ["of", "cua"].includes(tokens[tokens.length - 1])) tokens.pop();
  let last = tokens[tokens.length - 1];

  // "200g" / "200 g" / "300ml"
  const gm = last?.match(/^(\d+(?:\.\d+)?)(g|gr|gram|grams|ml)$/);
  if (gm) {
    if (gm[2] === "ml") out.ml = Number(gm[1]);
    else out.grams = Number(gm[1]);
    return out;
  }
  if (last && ["g", "gr", "gram", "grams", "ml"].includes(last) && /^\d+(\.\d+)?$/.test(tokens[tokens.length - 2] ?? "")) {
    const n = Number(tokens[tokens.length - 2]);
    if (last === "ml") out.ml = n;
    else out.grams = n;
    return out;
  }

  if (last && UNIT_WORDS.has(last) && !["medium", "large", "small"].includes(last)) {
    out.unit = last;
    tokens.pop();
    last = tokens[tokens.length - 1];
  } else if (last && ["medium", "large", "small"].includes(last)) {
    tokens.pop();
    last = tokens[tokens.length - 1];
  }
  if (!last) return out;

  let q: number | null = null;
  if (/^\d+(\.\d+)?$/.test(last)) q = Number(last);
  else if (last in NUM_WORDS) q = NUM_WORDS[last];
  if (q !== null) {
    tokens.pop();
    const prev = tokens[tokens.length - 1];
    // "half a bowl", "nua to", "mot nua" (one half), "1 and a half"
    if ((prev === "half" || prev === "nua") && q === 1) q = 0.5;
    if (last === "nua" && prev === "mot") q = 0.5;
    out.qty = q;
  } else if (out.unit && (last === "nua" || last === "half")) {
    out.qty = 0.5;
  }
  // "1 to ruoi" style handled by caller; "a couple of" → 2
  return out;
}

function spreadFor(c: Confidence) {
  return c === "high" ? 0.1 : c === "medium" ? 0.2 : 0.3;
}

function lowerConfidence(c: Confidence): Confidence {
  return c === "high" ? "medium" : "low";
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

const DRINK_UNITS = new Set(["glass", "cup", "can"]);

function buildFoodEstimate(ref: FoodRef, q: Qty, context: string): FoodEstimate {
  const assumptions: string[] = [];
  let factor = 1;
  let quantity = 1;
  let unit = ref.unit;
  let confidence: Confidence = ref.confidence;

  if (q.grams && ref.grams) {
    factor = q.grams / ref.grams;
    quantity = q.grams;
    unit = "g";
    assumptions.push(`${q.grams} g as stated`);
    if (confidence === "low") confidence = "medium";
  } else if (q.ml && ref.grams) {
    factor = q.ml / ref.grams;
    quantity = q.ml;
    unit = "ml";
    assumptions.push(`${q.ml} ml as stated`);
  } else if (q.qty !== null) {
    factor = q.qty;
    quantity = q.qty;
    assumptions.push(ref.assumption + (q.qty !== 1 ? ` (× ${q.qty})` : ""));
  } else {
    assumptions.push(ref.assumption);
    if (!ref.countable) assumptions.push(`Amount not specified — assumed 1 ${ref.unit}`);
    else assumptions.push(`Count not specified — assumed 1`);
  }

  let mod = 1;
  if (BIGGER.some((w) => hasPhrase(context, w))) {
    mod = 1.3;
    assumptions.push("Larger portion than usual (+30%)");
    confidence = lowerConfidence(confidence);
  } else if (SMALLER.some((w) => hasPhrase(context, w)) && q.qty === null) {
    mod = 0.7;
    assumptions.push("Smaller portion than usual (−30%)");
  }

  let calories = ref.calories * factor * mod;
  let carbs = ref.carbs_g * factor * mod;
  if (DRINK_UNITS.has(ref.unit) && ref.carbs_g > 5) {
    if (NO_SUGAR.some((w) => hasPhrase(context, w))) {
      const sugarKcal = Math.min(carbs * 4, calories) * 0.8;
      calories -= sugarKcal;
      carbs -= sugarKcal / 4;
      assumptions.push("No added sugar");
    } else if (LESS_SUGAR.some((w) => hasPhrase(context, w))) {
      const sugarKcal = Math.min(carbs * 4, calories) * 0.4;
      calories -= sugarKcal;
      carbs -= sugarKcal / 4;
      assumptions.push("Less sugar");
    }
  }

  const s = spreadFor(confidence);
  const cal = Math.round(calories);
  return {
    name: ref.name,
    quantity: round1(quantity),
    unit,
    calories: cal,
    calories_low: Math.round(cal * (1 - s)),
    calories_high: Math.round(cal * (1 + s)),
    protein_g: round1(ref.protein_g * factor * mod),
    carbs_g: round1(Math.max(0, carbs)),
    fat_g: round1(ref.fat_g * factor * mod),
    confidence,
    assumptions,
    emoji: ref.emoji,
  };
}

interface FoodMatch {
  start: number;
  end: number;
  ref: FoodRef;
}

function findFoodMatches(t: string): FoodMatch[] {
  const taken: boolean[] = new Array(t.length).fill(false);
  const matches: FoodMatch[] = [];
  for (const { alias, ref } of ALIAS_INDEX) {
    const re = new RegExp(`(^|[^a-z0-9])(${escapeRe(alias)})(?=[^a-z0-9]|$)`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const start = m.index + m[1].length;
      const end = start + alias.length;
      if (taken.slice(start, end).some(Boolean)) continue;
      for (let i = start; i < end; i++) taken[i] = true;
      matches.push({ start, end, ref });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

function leftoverWords(t: string): string[] {
  return t
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d/.test(w));
}

export interface OfflineFoodResult {
  meal_type: MealType | null;
  items: FoodEstimate[];
  unrecognized: string[];
}

/** Parse a food description into items. */
export function parseFoodText(text: string): OfflineFoodResult {
  const t = normalizeText(text);
  const matches = findFoodMatches(t);
  const items: FoodEstimate[] = [];
  const unrecognized: string[] = [];

  let cursor = 0;
  matches.forEach((m, i) => {
    const prefix = t.slice(cursor, m.start);
    const nextStart = matches[i + 1]?.start ?? t.length;
    // Context for modifiers: the words just before and just after this match (until a separator or next match)
    const after = t.slice(m.end, nextStart).split(/[,;\n]| and | va | voi /)[0];
    const before = prefix.split(/[,;\n]| and | va /).pop() ?? "";
    const context = `${before} ${after}`;

    // Leftover in the prefix that isn't a quantity → maybe an unknown food
    const prefixSeg = prefix.split(/[,;\n]| and | va | voi |\+/);
    prefixSeg.slice(0, -1).forEach((seg) => {
      const lw = leftoverWords(seg);
      if (lw.length) unrecognized.push(lw.join(" "));
    });

    const q = parseQuantityPrefix(before.replace(new RegExp(`(${BIGGER.concat(SMALLER).map(escapeRe).join("|")})\\s*$`), ""));
    // "1 to ruoi" (one and a half)
    if (q.qty !== null && hasPhrase(after.split(" ").slice(0, 2).join(" "), "ruoi")) q.qty += 0.5;
    items.push(buildFoodEstimate(m.ref, q, context));
    cursor = m.end;
  });

  const tail = t.slice(cursor).split(/[,;\n]| and | va | voi |\+/);
  // first tail piece belongs to the last matched item's context (e.g. "pho bo size lon")
  tail.slice(matches.length ? 1 : 0).forEach((seg) => {
    const lw = leftoverWords(seg);
    if (lw.length) unrecognized.push(lw.join(" "));
  });
  if (!matches.length && tail.length && !unrecognized.length) {
    const lw = leftoverWords(t);
    if (lw.length) unrecognized.push(lw.join(" "));
  }

  return { meal_type: detectMealType(text), items, unrecognized };
}

// ───────────────────────── exercise ─────────────────────────

/** Parse a duration in minutes from free text. Returns null if none found. */
export function parseDuration(text: string): number | null {
  let t = normalizeText(text);
  if (/\b(half an hour|half hour|nua tieng|nua gio)\b/.test(t) && !/\d+\s*(h|hr|hrs|hours?|gio|tieng)\b/.test(t)) return 30;
  // word numbers → digits for duration contexts
  t = t.replace(/\b(an|a|one|mot)\s+(hour|hr|tieng|gio)\b/g, "1 $2");
  t = t.replace(/\b(two|hai)\s+(hours?|hrs?|tieng|gio)\b/g, "2 $2");
  t = t.replace(/\b(three|ba)\s+(hours?|hrs?|tieng|gio)\b/g, "3 $2");

  let minutes: number | null = null;

  // 1h30, 1h 30m, 1:30h
  const hm = t.match(/\b(\d+)\s*(?:h|g|gio|tieng)\s*(\d{1,2})\s*(?:m|min|mins|minutes?|phut|p)?\b/);
  if (hm && Number(hm[2]) < 60) minutes = Number(hm[1]) * 60 + Number(hm[2]);

  if (minutes === null) {
    const h = t.match(/\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|gio|tieng)\b(\s*(?:ruoi|and a half))?/);
    if (h) minutes = Math.round(Number(h[1]) * 60 + (h[2] ? 30 : 0));
  }
  if (minutes === null) {
    const m = t.match(/\b(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes|phut|p)\b/);
    if (m) minutes = Math.round(Number(m[1]));
  }
  if (minutes !== null && (minutes <= 0 || minutes > 1440)) return null;
  return minutes;
}

export function parseDistanceKm(text: string): number | null {
  const t = normalizeText(text);
  const km = t.match(/\b(\d+(?:\.\d+)?)\s*(?:km|k|kms|kilometers?|kilometres?|cay so)\b/);
  if (km) return Number(km[1]);
  const mi = t.match(/\b(\d+(?:\.\d+)?)\s*(?:mi|miles?)\b/);
  if (mi) return Math.round(Number(mi[1]) * 1.609 * 100) / 100;
  return null;
}

export function parseIntensity(text: string): Intensity | null {
  const t = normalizeText(text);
  if (/\b(light|easy|gentle|slow|nhe|cham|thu gian|relaxed)\b/.test(t)) return "light";
  if (/\b(hard|intense|vigorous|fast|heavy|nang|manh|nhanh|cang|het suc|max)\b/.test(t)) return "vigorous";
  if (/\b(moderate|medium|vua|binh thuong|normal)\b/.test(t)) return "moderate";
  return null;
}

export function findActivity(text: string): ActivityRef | null {
  const t = normalizeText(text);
  for (const { alias, ref } of ACTIVITY_ALIAS_INDEX) if (hasPhrase(t, alias)) return ref;
  return null;
}

export function estimateExercise(input: {
  ref: ActivityRef | null;
  activityName?: string;
  minutes: number;
  distanceKm: number | null;
  intensity: Intensity | null;
  weightKg: number;
  durationGiven: boolean;
}): ExerciseEstimate {
  const { ref, minutes, distanceKm, weightKg } = input;
  const intensity = input.intensity ?? "moderate";
  const assumptions: string[] = [];
  let confidence: Confidence = "medium";
  let met: number;

  if (!ref) {
    met = intensity === "light" ? 3 : intensity === "moderate" ? 4.5 : 7;
    confidence = "low";
    assumptions.push(`Unrecognised activity — used a generic ${intensity} effort (MET ${met})`);
  } else {
    met = ref.met[intensity];
    if (ref.distanceBased && distanceKm) {
      const speed = distanceKm / (minutes / 60);
      const sMet = metFromSpeed(ref.name, speed);
      if (sMet) {
        met = Math.round(sMet * 10) / 10;
        assumptions.push(`Pace ≈ ${speed.toFixed(1)} km/h from distance and time`);
        confidence = "high";
      }
    }
    assumptions.push(`MET ≈ ${met} for ${intensity} ${ref.name.toLowerCase()}`);
  }
  if (!input.intensity) assumptions.push("Intensity not specified — assumed moderate");
  if (!input.durationGiven) {
    assumptions.push(`Duration not specified — assumed ${minutes} min`);
    confidence = "low";
  }
  assumptions.push(`Body weight ${weightKg} kg; active calories only (resting burn excluded)`);

  const kcal = activeCalories(met, weightKg, minutes);
  const s = spreadFor(confidence);
  return {
    activity: ref?.name ?? input.activityName ?? "Activity",
    duration_minutes: minutes,
    distance_km: distanceKm,
    intensity,
    calories_burned: kcal,
    calories_low: Math.round(kcal * (1 - s)),
    calories_high: Math.round(kcal * (1 + s)),
    met,
    confidence,
    assumptions,
    emoji: ref?.emoji ?? "💪",
  };
}

export function parseExerciseText(text: string, weightKg: number): ExerciseEstimate[] {
  const segments = normalizeText(text)
    .split(/[,;\n]|\. | and then | then | roi | sau do | va | and | \+ /)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: ExerciseEstimate[] = [];
  for (const seg of segments) {
    const ref = findActivity(seg);
    const duration = parseDuration(seg);
    const distance = parseDistanceKm(seg);
    if (!ref && duration === null) continue;
    let minutes = duration;
    if (minutes === null && distance && ref?.distanceBased) {
      const defaultSpeed = ref.name === "Running" ? 10 : ref.name === "Walking" ? 5 : 18;
      minutes = Math.round((distance / defaultSpeed) * 60);
    }
    const custom = !ref ? leftoverWords(seg).filter((w) => !/^(min|mins|minutes|phut|hour|hours|tieng|gio|played|play|did|choi|tap)$/.test(w)).join(" ") : undefined;
    out.push(
      estimateExercise({
        ref,
        activityName: custom ? custom.charAt(0).toUpperCase() + custom.slice(1) : undefined,
        minutes: minutes ?? 30,
        distanceKm: distance,
        intensity: parseIntensity(seg),
        weightKg,
        durationGiven: minutes !== null,
      }),
    );
  }
  return out;
}

// ───────────────────────── water / weight / sleep / steps ─────────────────────────

export function parseWaterMl(text: string): number | null {
  const t = normalizeText(text);
  if (!/\b(nuoc|water|nuoc loc|nuoc suoi)\b/.test(t)) return null;
  if (/\b(nuoc (ep|mia|ngot|cam|dua|chanh|sam|dau)|nuoc trai cay)\b/.test(t)) return null;
  const m = t.match(/(\d+(?:\.\d+)?|a|an|one|two|three|four|five|mot|hai|ba|bon|nam)\s*(l|lit|lits|liter|liters|litre|litres|ml|ly|coc|glass|glasses|cups?|chai|bottles?)\b/);
  if (!m) return null;
  const n = /^\d/.test(m[1]) ? Number(m[1]) : NUM_WORDS[m[1]] ?? 1;
  const u = m[2];
  if (u === "ml") return Math.round(n);
  if (["l", "lit", "lits", "liter", "liters", "litre", "litres"].includes(u)) return Math.round(n * 1000);
  if (["chai", "bottle", "bottles"].includes(u)) return Math.round(n * 500);
  return Math.round(n * 250);
}

export function parseWeightKg(text: string): number | null {
  const t = normalizeText(text);
  if (!/\b(weigh|weighed|weight|can nang|nang|can|scale)\b/.test(t)) return null;
  const m = t.match(/(\d{2,3}(?:\.\d)?)\s*(kg|kgs|ky|ki|kilo|kilos)\b/);
  if (!m) return null;
  const w = Number(m[1]);
  return w >= 30 && w <= 300 ? w : null;
}

export function parseSleepMin(text: string): number | null {
  const t = normalizeText(text);
  if (!/\b(slept|sleep|ngu|giac ngu)\b/.test(t)) return null;
  const d = parseDuration(t);
  return d && d >= 60 && d <= 960 ? d : null;
}

export function parseSteps(text: string): number | null {
  const t = normalizeText(text);
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(k)?\s*(steps|buoc)\b/);
  if (!m) return null;
  let n = Number(m[1].replace(/[.,](\d{3})$/, "$1").replace(",", "."));
  if (m[2]) n *= 1000;
  return Math.round(n);
}

// ───────────────────────── universal day log ─────────────────────────

export interface OfflineDayResult {
  meals: { meal_type: MealType; time: string | null; items: FoodEstimate[] }[];
  exercise: ExerciseEstimate[];
  water_ml: number | null;
  weight_kg: number | null;
  sleep_minutes: number | null;
  steps: number | null;
  note: string | null;
  unrecognized: string[];
}

export function parseDayText(text: string, weightKg: number, fallbackMeal: MealType = "other"): OfflineDayResult {
  const t = normalizeText(text);
  const segments = t
    .split(/[;\n]|,(?!\d)|\. | and then | then | roi | sau do | sau khi | va | and | \+ /)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: OfflineDayResult = { meals: [], exercise: [], water_ml: null, weight_kg: null, sleep_minutes: null, steps: null, note: null, unrecognized: [] };
  let currentMeal: MealType | null = null;

  for (const seg of segments) {
    const water = parseWaterMl(seg);
    if (water !== null) {
      out.water_ml = (out.water_ml ?? 0) + water;
      continue;
    }
    const weight = parseWeightKg(seg);
    if (weight !== null) {
      out.weight_kg = weight;
      continue;
    }
    const sleep = parseSleepMin(seg);
    if (sleep !== null) {
      out.sleep_minutes = sleep;
      continue;
    }
    const steps = parseSteps(seg);
    if (steps !== null) {
      out.steps = steps;
      continue;
    }

    const food = parseFoodText(seg);
    const activity = findActivity(seg);
    const duration = parseDuration(seg);
    // An activity word counts as exercise when it has a duration/distance or no food was found.
    if (activity && (duration !== null || parseDistanceKm(seg) !== null || food.items.length === 0)) {
      out.exercise.push(...parseExerciseText(seg, weightKg));
      continue;
    }
    if (food.items.length) {
      const meal: MealType = food.meal_type ?? currentMeal ?? fallbackMeal;
      currentMeal = food.meal_type ?? currentMeal;
      const existing = out.meals.find((m) => m.meal_type === meal);
      if (existing) existing.items.push(...food.items);
      else out.meals.push({ meal_type: meal, time: null, items: food.items });
      out.unrecognized.push(...food.unrecognized);
      continue;
    }
    const mealOnly = detectMealType(seg);
    if (mealOnly) {
      currentMeal = mealOnly;
      continue;
    }
    if (duration !== null && /\b(played|play|choi|tap|did|lam)\b/.test(seg)) {
      out.exercise.push(...parseExerciseText(seg, weightKg));
      continue;
    }
    const lw = leftoverWords(seg);
    if (lw.length) out.unrecognized.push(lw.join(" "));
  }
  return out;
}

// ───────────────────────── personal food memory key ─────────────────────────

/**
 * Canonical key for a food name, so "Vietnamese iced milk coffee", "cafe sua da"
 * and "Cà phê sữa đá" all map to the same personal-memory entry.
 */
export function canonicalFoodKey(name: string): string {
  const t = normalizeText(name);
  const matches = findFoodMatches(t);
  if (matches.length === 1) return normalizeText(matches[0].ref.name);
  return t.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
