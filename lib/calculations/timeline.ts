import type { LogBundle } from "@/lib/data/types";
import { MEAL_LABELS } from "@/types/nutrition";
import { fmt } from "@/lib/utils/cn";
import type { T } from "@/lib/i18n";

export interface TimelineEntry {
  id: string;
  at: string;
  kind: "meal" | "exercise" | "water" | "weight" | "sleep" | "note";
  title: string;
  subtitle: string;
  kcal: number | null;
  emoji: string;
}

const MEAL_EMOJI = { breakfast: "🍳", lunch: "🍱", dinner: "🍽️", snack: "🍪", other: "🍴" } as const;

export function buildTimeline(b: LogBundle, t: T = (s) => s): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  const meals = new Map<string, typeof b.food>();
  for (const f of b.food) {
    const key = f.meal_id ?? `${f.meal_type}-${f.logged_at}`;
    meals.set(key, [...(meals.get(key) ?? []), f]);
  }
  for (const [key, items] of meals) {
    const first = items[0];
    out.push({
      id: `m-${key}`,
      at: first.logged_at,
      kind: "meal",
      title: t(MEAL_LABELS[first.meal_type]),
      subtitle: items.map((i) => i.food_name).join(", "),
      kcal: Math.round(items.reduce((s, i) => s + i.calories, 0)),
      emoji: MEAL_EMOJI[first.meal_type],
    });
  }
  for (const e of b.exercise) {
    out.push({ id: `e-${e.id}`, at: e.logged_at, kind: "exercise", title: t(e.activity), subtitle: `${e.duration_minutes} ${t("min")} · ${t(e.intensity)}`, kcal: -Math.round(e.calories_burned), emoji: "🏃" });
  }
  for (const w of b.water) out.push({ id: `wa-${w.id}`, at: w.logged_at, kind: "water", title: t("Water"), subtitle: `${fmt(w.amount_ml)} ml`, kcal: null, emoji: "💧" });
  for (const w of b.weight) out.push({ id: `w-${w.id}`, at: w.logged_at, kind: "weight", title: t("Weight"), subtitle: `${w.weight_kg} kg`, kcal: null, emoji: "⚖️" });
  for (const s of b.sleep) out.push({ id: `s-${s.id}`, at: s.logged_at, kind: "sleep", title: t("Sleep"), subtitle: `${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60}m${s.quality ? ` · ${"★".repeat(s.quality)}` : ""}`, kcal: null, emoji: "😴" });
  for (const n of b.notes) out.push({ id: `n-${n.id}`, at: n.logged_at, kind: "note", title: t("Note"), subtitle: n.content, kcal: null, emoji: "📝" });
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
