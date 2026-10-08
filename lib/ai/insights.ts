import "server-only";
import type { Profile } from "@/types/user";
import type { MealType } from "@/types/nutrition";
import type { DayMetrics, PeriodStats, ScoreComponent } from "@/lib/calculations/summary";
import { getAIProvider } from "./provider";
import { INSIGHT_SYSTEM } from "./prompts";
import {
  CoachAnswerSchema,
  DailyInsightSchema,
  WeeklyInsightSchema,
  parseJsonSafe,
  type DailyInsight,
  type WeeklyInsight,
} from "./schemas";
import { normalizeText, parseFoodText } from "./parser";
import { fmt } from "@/lib/utils/cn";
import { DEFAULT_LANG, makeT, type Lang } from "@/lib/i18n";

type Src = { source: "ai" | "offline" };

// ───────────────────────── daily ─────────────────────────

export interface DailyInput {
  profile: Profile;
  day: DayMetrics;
  score: { score: number; components: ScoreComponent[] } | null;
  meals: { meal_type: MealType; calories: number; protein_g: number; items: string[] }[];
  lang?: Lang;
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

export function offlineDailyInsight({ profile: p, day: d, lang = DEFAULT_LANG }: DailyInput): DailyInsight {
  const t = makeT(lang);
  if (!d.logged) {
    return { headline: t("Nothing logged yet"), summary: t("Log a meal to see how today is going."), improvement: t("Try the quick log: “1 tô phở bò, 1 ly cà phê sữa đá”.") };
  }
  const calP = pct(d.nutrition.calories, p.daily_calorie_target);
  const proP = pct(d.nutrition.protein_g, p.daily_protein_target);
  const watP = pct(d.waterMl, p.daily_water_target_ml);
  const parts: string[] = [];
  parts.push(
    calP > 110
      ? t("You're about {over} kcal over your {target} kcal target.", { over: fmt(d.nutrition.calories - p.daily_calorie_target), target: fmt(p.daily_calorie_target) })
      : calP >= 90
        ? t("You're right around your calorie target ({pct}%).", { pct: calP })
        : t("You've had {eaten} kcal so far — {left} kcal left.", { eaten: fmt(d.nutrition.calories), left: fmt(p.daily_calorie_target - d.nutrition.calories) }),
  );
  parts.push(
    d.exerciseMin
      ? t("Protein is at {pct}% of target and you trained for {min} min.", { pct: proP, min: d.exerciseMin })
      : t("Protein is at {pct}% of target.", { pct: proP }),
  );

  let improvement: string;
  if (proP < 80) improvement = t("Add a protein-rich option (~{g} g to go) — e.g. grilled chicken, eggs, tofu or Greek yogurt.", { g: Math.round(p.daily_protein_target - d.nutrition.protein_g) });
  else if (watP < 85) improvement = t("Drink another ~{ml} ml of water.", { ml: fmt(Math.ceil((p.daily_water_target_ml - d.waterMl) / 50) * 50) });
  else if (d.exerciseMin < p.daily_exercise_goal_min) improvement = t("A {min}-minute walk would close your activity goal.", { min: p.daily_exercise_goal_min - d.exerciseMin });
  else improvement = t("Keep doing what you're doing — consistency beats perfection.");

  const headline = t(calP > 115 ? "A bigger day" : proP >= 90 && calP <= 110 ? "Great day" : "Solid progress");
  return { headline, summary: parts.join(" "), improvement };
}

export async function generateDailyInsight(input: DailyInput): Promise<DailyInsight & Src> {
  const provider = getAIProvider();
  if (provider && input.day.logged) {
    try {
      const raw = await provider.complete({
        system: INSIGHT_SYSTEM,
        prompt: `Write today's coach note. JSON shape: {"headline": string (≤5 words), "summary": string (2 sentences, cite numbers), "improvement": string (one concrete, small action)}.
Data: ${JSON.stringify({
          name: input.profile.name,
          goal: input.profile.goal,
          targets: { kcal: input.profile.daily_calorie_target, protein_g: input.profile.daily_protein_target, water_ml: input.profile.daily_water_target_ml, exercise_min: input.profile.daily_exercise_goal_min },
          today: input.day,
          meals: input.meals,
          score: input.score?.score,
        })}`,
        maxTokens: 500,
      });
      const parsed = parseJsonSafe(raw, DailyInsightSchema);
      if (parsed) return { ...parsed, source: "ai" };
    } catch (e) {
      console.error("[ai] daily insight failed:", (e as Error).message);
    }
  }
  return { ...offlineDailyInsight(input), source: "offline" };
}

// ───────────────────────── weekly ─────────────────────────

export interface WeeklyInput {
  profile: Profile;
  week: PeriodStats;
  previous: PeriodStats | null;
  proteinByMeal: Record<MealType, number>;
  topMeals: { name: string; calories: number }[];
  lang?: Lang;
}

export function offlineWeeklyInsight({ profile: p, week: w, previous: prev, proteinByMeal, lang = DEFAULT_LANG }: WeeklyInput): WeeklyInsight {
  const t = makeT(lang);
  const good: string[] = [];
  const improve: string[] = [];
  const focus: string[] = [];

  if (w.daysLogged === 0) {
    return { headline: t("No data this week yet"), went_well: [], to_improve: [t("Log at least one meal a day to unlock weekly insights.")], focus: [t("Log breakfast tomorrow")] };
  }

  const calDiff = w.avgCalories - p.daily_calorie_target;
  if (Math.abs(calDiff) <= p.daily_calorie_target * 0.1) good.push(t("Average calories ({n} kcal) stayed within ±10% of target", { n: fmt(w.avgCalories) }));
  else if (calDiff > 0) improve.push(t("Average calories were ~{n} kcal/day above target", { n: fmt(calDiff) }));
  else improve.push(t("Average calories were ~{n} kcal/day below target — make sure you're eating enough", { n: fmt(-calDiff) }));
  const calFocus = calDiff > p.daily_calorie_target * 0.1 ? t("Bring average intake closer to {n} kcal", { n: fmt(p.daily_calorie_target) }) : calDiff < -p.daily_calorie_target * 0.15 ? t("Eat enough: add a balanced snack on low days") : null;

  const proP = pct(w.avgProtein, p.daily_protein_target);
  if (prev && prev.avgProtein > 0) {
    const change = Math.round(((w.avgProtein - prev.avgProtein) / prev.avgProtein) * 100);
    if (change >= 5) good.push(t("Protein improved {pct}% vs last week ({g} g/day)", { pct: change, g: w.avgProtein }));
  }
  if (proP >= 90) good.push(t("Protein averaged {g} g/day — {pct}% of target", { g: w.avgProtein, pct: proP }));
  else improve.push(t("Protein averaged {g} g/day ({pct}% of target)", { g: w.avgProtein, pct: proP }));

  const meals = (["breakfast", "lunch", "dinner"] as MealType[]).filter((m) => proteinByMeal[m] > 0);
  const lowest = meals.sort((a, b) => proteinByMeal[a] - proteinByMeal[b])[0];
  if (lowest && proP < 95) {
    const mealName = t(lowest[0].toUpperCase() + lowest.slice(1));
    improve.push(t("{meal} is your lowest-protein meal (~{g} g)", { meal: mealName, g: proteinByMeal[lowest] }));
    focus.push(t("Add 20–30 g protein to {meal} (eggs, Greek yogurt, chicken, tofu)", { meal: lang === "vi" ? mealName.toLowerCase() : lowest }));
  }

  if (w.weekendAvgCalories && w.weekdayAvgCalories && w.weekdayAvgCalories > 0) {
    const diff = Math.round(((w.weekendAvgCalories - w.weekdayAvgCalories) / w.weekdayAvgCalories) * 100);
    if (diff >= 10) {
      improve.push(t("Weekend calories are ~{pct}% higher than weekdays", { pct: diff }));
      focus.push(t("Keep weekend calories within ±10% of target"));
    }
  }

  if (prev && w.exerciseMin > prev.exerciseMin) good.push(t("Exercise went up to {now} min (from {before})", { now: w.exerciseMin, before: prev.exerciseMin }));
  else if (w.exerciseMin >= 150) good.push(t("{n} min of exercise — at or above the WHO 150-minute guideline", { n: w.exerciseMin }));
  else {
    improve.push(t("{n} min of exercise this week", { n: w.exerciseMin }));
    focus.push(t("Aim for 150 min of activity (e.g. 3 × 50 min)"));
  }

  if (w.waterMet >= Math.ceil(w.days * 0.7)) good.push(t("Hit your water goal {n} of {days} days", { n: w.waterMet, days: w.days }));
  else {
    improve.push(t("Water goal met on {n} of {days} days (avg {l} L)", { n: w.waterMet, days: w.days, l: (w.avgWaterMl / 1000).toFixed(1) }));
    focus.push(t("Drink {l} L a day — keep a bottle at your desk", { l: (p.daily_water_target_ml / 1000).toFixed(1) }));
  }

  if (w.sleepLoggedDays < w.days - 1) {
    improve.push(t("Sleep data is missing on {n} days", { n: w.days - w.sleepLoggedDays }));
    if (focus.length < 3) focus.push(t("Log sleep each morning"));
  }
  if (w.weightChange !== null && w.weightChange < 0 && p.goal === "lose_weight") good.push(t("Weight trend down {n} kg", { n: Math.abs(w.weightChange) }));

  if (calFocus) focus.unshift(calFocus);
  for (const extra of ["Log every meal, including drinks and snacks", "Weigh in 2–3 mornings a week"]) if (focus.length < 3) focus.push(t(extra));

  return {
    headline: t(good.length >= improve.length ? "A strong week" : "Room to grow"),
    went_well: good.slice(0, 4),
    to_improve: improve.slice(0, 4),
    focus: focus.slice(0, 3),
  };
}

export async function generateWeeklyInsight(input: WeeklyInput): Promise<WeeklyInsight & Src> {
  const provider = getAIProvider();
  if (provider && input.week.daysLogged > 0) {
    try {
      const raw = await provider.complete({
        system: INSIGHT_SYSTEM,
        prompt: `Write the weekly report. JSON shape: {"headline": string (≤6 words), "went_well": string[] (≤4, each with a number),
"to_improve": string[] (≤4), "focus": string[] (exactly 3 concrete actions for next week)}.
Data: ${JSON.stringify({ goal: input.profile.goal, targets: { kcal: input.profile.daily_calorie_target, protein_g: input.profile.daily_protein_target, water_ml: input.profile.daily_water_target_ml }, this_week: input.week, last_week: input.previous, avg_protein_by_meal_g: input.proteinByMeal, highest_calorie_items: input.topMeals })}`,
        maxTokens: 800,
      });
      const parsed = parseJsonSafe(raw, WeeklyInsightSchema);
      if (parsed) return { ...parsed, source: "ai" };
    } catch (e) {
      console.error("[ai] weekly insight failed:", (e as Error).message);
    }
  }
  return { ...offlineWeeklyInsight(input), source: "offline" };
}

// ───────────────────────── coach Q&A ─────────────────────────

export interface CoachContext {
  profile: Profile;
  today: DayMetrics;
  todayFoods: { name: string; calories: number; meal_type: MealType }[];
  last14: PeriodStats;
  weightTrend: { first: number | null; last: number | null; days: number };
  bmr: number;
  tdee: number;
}

const isVi = (q: string) => /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(q) || /\b(an|uong|hom nay|toi|minh|sao|khong|duoc)\b/.test(normalizeText(q));

export function offlineCoach(question: string, c: CoachContext): string {
  const q = normalizeText(question);
  const vi = isVi(question);
  const remaining = c.profile.daily_calorie_target - c.today.nutrition.calories;
  const p = c.profile;

  // "Hôm nay ăn hơi nhiều" / "why so many calories today"
  if (/(an (hoi )?nhieu|qua nhieu|ate too much|too much|over|vuot)/.test(q) || (/(hom nay|today)/.test(q) && /(sao|why|tai sao)/.test(q))) {
    const top = [...c.todayFoods].sort((a, b) => b.calories - a.calories).slice(0, 3);
    if (!top.length) return vi ? "Hôm nay bạn chưa ghi món nào cả." : "You haven't logged any food today yet.";
    const list = top.map((f) => `${f.name} (~${fmt(f.calories)} kcal)`).join(", ");
    const over = c.today.nutrition.calories - p.daily_calorie_target;
    return vi
      ? `Hôm nay bạn đã ghi ~${fmt(c.today.nutrition.calories)} / ${fmt(p.daily_calorie_target)} kcal${over > 0 ? ` (dư ~${fmt(over)} kcal)` : ""}. Nhiều calo nhất là: ${list}. Một ngày cao hơn mục tiêu không sao cả — xu hướng cả tuần mới quan trọng. Nếu muốn, bữa tiếp theo chọn món nhiều đạm, nhiều rau và ít dầu mỡ.`
      : `You've logged ~${fmt(c.today.nutrition.calories)} / ${fmt(p.daily_calorie_target)} kcal today${over > 0 ? ` (~${fmt(over)} over)` : ""}. The biggest contributors: ${list}. One higher day is fine — the weekly trend matters more. If you like, make the next meal protein- and veg-forward.`;
  }

  // "Why am I not losing weight?"
  if (/(not losing|khong giam|giam can|lose weight|plateau|chung lai)/.test(q)) {
    const avg = c.last14.avgCalories;
    const trend = c.weightTrend.first !== null && c.weightTrend.last !== null ? Math.round((c.weightTrend.last - c.weightTrend.first) * 10) / 10 : null;
    return vi
      ? `14 ngày qua bạn ghi trung bình ~${fmt(avg)} kcal/ngày, mục tiêu là ${fmt(p.daily_calorie_target)} kcal (TDEE ước tính ${fmt(c.tdee)}).${trend !== null ? ` Cân nặng thay đổi ${trend > 0 ? "+" : ""}${trend} kg.` : ""} Bạn ghi ${c.last14.daysLogged}/14 ngày — những ngày không ghi thường là ngày ăn nhiều hơn. Calo ước tính và cân nặng dao động hằng ngày đều không chính xác, nên hãy xem đây là xu hướng, không phải chẩn đoán.`
      : `Over the last 14 days you logged an average of ~${fmt(avg)} kcal/day vs a target of ${fmt(p.daily_calorie_target)} (estimated TDEE ${fmt(c.tdee)}).${trend !== null ? ` Weight changed ${trend > 0 ? "+" : ""}${trend} kg.` : ""} You logged ${c.last14.daysLogged}/14 days — unlogged days are often higher-calorie days. Calorie estimates and daily weight fluctuations are both noisy, so treat this as a trend rather than a diagnosis.`;
  }

  // "Can I eat pizza tonight?" / "ăn thêm 1 tô bún bò được không"
  const food = parseFoodText(question);
  if (food.items.length) {
    const kcal = food.items.reduce((s, i) => s + i.calories, 0);
    const lo = food.items.reduce((s, i) => s + (i.calories_low ?? i.calories), 0);
    const hi = food.items.reduce((s, i) => s + (i.calories_high ?? i.calories), 0);
    const names = food.items.map((i) => `${i.quantity !== 1 ? `${i.quantity} × ` : ""}${i.name}`).join(" + ");
    const fits = kcal <= remaining;
    return vi
      ? `${fits ? "Được." : "Hơi vượt một chút."} Hôm nay bạn còn khoảng ${fmt(Math.max(0, remaining))} kcal. ${names} thường khoảng ${fmt(lo)}–${fmt(hi)} kcal tuỳ khẩu phần.${fits ? "" : " Bạn có thể ăn ít hơn, hoặc cân bằng lại vào ngày mai — không cần bù bằng cách nhịn."}`
      : `${fits ? "Yes." : "It would put you a little over."} You have about ${fmt(Math.max(0, remaining))} kcal left today. ${names} is usually around ${fmt(lo)}–${fmt(hi)} kcal depending on portion.${fits ? "" : " You could have a smaller portion, or just balance it out over the week — no need to compensate by skipping meals."}`;
  }

  // Protein question
  if (/(protein|dam|dam\b)/.test(q)) {
    const left = Math.max(0, p.daily_protein_target - c.today.nutrition.protein_g);
    return vi
      ? `Hôm nay bạn đã ăn ${fmt(c.today.nutrition.protein_g)} g đạm, còn ~${fmt(left)} g. Gợi ý: 150 g ức gà (~46 g), 3 quả trứng (~19 g), 1 hộp sữa chua Hy Lạp (~17 g), 150 g đậu hũ (~15 g).`
      : `You've had ${fmt(c.today.nutrition.protein_g)} g protein today, ~${fmt(left)} g to go. Easy options: 150 g chicken breast (~46 g), 3 eggs (~19 g), Greek yogurt (~17 g), 150 g tofu (~15 g).`;
  }

  return vi
    ? `Hôm nay: ${fmt(c.today.nutrition.calories)} / ${fmt(p.daily_calorie_target)} kcal, đạm ${fmt(c.today.nutrition.protein_g)} / ${p.daily_protein_target} g, nước ${(c.today.waterMl / 1000).toFixed(1)} / ${(p.daily_water_target_ml / 1000).toFixed(1)} L, tập ${c.today.exerciseMin} phút. (Chế độ offline — thêm AI_API_KEY hoặc GEMINI_API_KEY để hỏi đáp tự do hơn.)`
    : `Today: ${fmt(c.today.nutrition.calories)} / ${fmt(p.daily_calorie_target)} kcal, protein ${fmt(c.today.nutrition.protein_g)} / ${p.daily_protein_target} g, water ${(c.today.waterMl / 1000).toFixed(1)} / ${(p.daily_water_target_ml / 1000).toFixed(1)} L, ${c.today.exerciseMin} min exercise. (Offline mode — add an AI_API_KEY or GEMINI_API_KEY for open-ended questions.)`;
}

export async function askCoach(question: string, c: CoachContext): Promise<{ answer: string } & Src> {
  const provider = getAIProvider();
  if (provider) {
    try {
      const raw = await provider.complete({
        system: INSIGHT_SYSTEM,
        prompt: `Answer the user's question in 2–5 sentences, in the language of the question. JSON: {"answer": string}.
Question: """${question.slice(0, 500)}"""
Data: ${JSON.stringify({
          name: c.profile.name,
          goal: c.profile.goal,
          bmr: c.bmr,
          estimated_tdee: c.tdee,
          targets: { kcal: c.profile.daily_calorie_target, protein_g: c.profile.daily_protein_target, water_ml: c.profile.daily_water_target_ml },
          today: c.today,
          today_foods: c.todayFoods,
          last_14_days: c.last14,
          weight_trend: c.weightTrend,
        })}`,
        maxTokens: 700,
      });
      const parsed = parseJsonSafe(raw, CoachAnswerSchema);
      if (parsed) return { ...parsed, source: "ai" };
    } catch (e) {
      console.error("[ai] coach failed:", (e as Error).message);
    }
  }
  return { answer: offlineCoach(question, c), source: "offline" };
}
