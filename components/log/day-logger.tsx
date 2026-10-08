"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import type { MealType } from "@/types/nutrition";
import type { ExerciseEstimate } from "@/types/exercise";
import { MEAL_LABELS } from "@/types/nutrition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/progress";
import { analyzeDayText, FriendlyError } from "@/lib/client/api";
import { saveDayLogAction } from "@/app/actions";
import { fmt } from "@/lib/utils/cn";
import { FoodReview, toEditable, type EditableFood } from "./food-review";
import { useToast } from "./toast";
import { useT } from "@/components/i18n-provider";

const MEAL_HOUR: Record<MealType, string> = { breakfast: "07:30", lunch: "12:15", dinner: "19:00", snack: "15:30", other: "" };
const MEAL_EMOJI: Record<MealType, string> = { breakfast: "🍳", lunch: "🍱", dinner: "🍽️", snack: "🍪", other: "🍴" };

interface Draft {
  meals: { meal_type: MealType; time: string | null; items: EditableFood[] }[];
  exercise: (ExerciseEstimate & { key: string })[];
  water_ml: number | null;
  weight_kg: number | null;
  sleep_minutes: number | null;
  steps: number | null;
}

function isoForMeal(meal: MealType, time: string | null): string {
  const t = time || MEAL_HOUR[meal];
  if (!t) return new Date().toISOString();
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime() > Date.now() ? new Date().toISOString() : d.toISOString();
}

export function DayLogger({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const toast = useToast();
  const t = useT();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const analyze = async () => {
    if (text.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const r = await analyzeDayText(text);
      const d: Draft = {
        meals: r.meals.map((m) => ({ meal_type: m.meal_type, time: m.time, items: toEditable(m.items, true) })),
        exercise: r.exercise.map((e, i) => ({ ...e, key: `x${i}` })),
        water_ml: r.water_ml,
        weight_kg: r.weight_kg,
        sleep_minutes: r.sleep_minutes,
        steps: r.steps,
      };
      const count = d.meals.length + d.exercise.length + [d.water_ml, d.weight_kg, d.sleep_minutes, d.steps].filter((x) => x !== null).length;
      if (!count) setError(t(r.clarification ?? "I couldn't find anything to log in that. Try mentioning foods, exercise or water."));
      else setDraft(d);
      setNote(r.clarification ?? null);
    } catch (e) {
      setError(t(e instanceof FriendlyError ? e.message : "We couldn't read that. Try again, or log items one by one."));
    } finally {
      setBusy(false);
    }
  };

  const count = draft ? draft.meals.length + draft.exercise.length + [draft.water_ml, draft.weight_kg, draft.sleep_minutes, draft.steps].filter((x) => x !== null).length : 0;

  const confirmAll = () => {
    if (!draft) return;
    startSaving(async () => {
      const res = await saveDayLogAction({
        meals: draft.meals
          .map((m) => ({
            meal_type: m.meal_type,
            logged_at: isoForMeal(m.meal_type, m.time),
            items: m.items.filter((i) => i.name.trim()).map((i) => ({
              food_name: i.name.trim(), quantity: i.quantity || 1, unit: i.unit || "serving", calories: Math.round(i.calories),
              protein_g: i.protein_g, carbs_g: i.carbs_g, fat_g: i.fat_g, confidence: i.ai ? i.confidence : null,
              ai_estimated: i.ai, ai_assumptions: i.ai ? i.assumptions.slice(0, 10) : null, ai_original_calories: i.original_calories,
            })),
          }))
          .filter((m) => m.items.length),
        exercise: draft.exercise.map((e) => ({
          activity: e.activity, duration_minutes: Math.round(e.duration_minutes), distance_km: e.distance_km, intensity: e.intensity,
          heart_rate_avg: null, calories_burned: Math.round(e.calories_burned), ai_estimated: true, confidence: e.confidence, notes: null,
          logged_at: new Date().toISOString(),
        })),
        water_ml: draft.water_ml,
        weight_kg: draft.weight_kg,
        sleep_minutes: draft.sleep_minutes,
        steps: draft.steps,
        logged_at: new Date().toISOString(),
      });
      if (!res.ok) return setError(t(res.error));
      toast(t(count === 1 ? "Logged {n} entry" : "Logged {n} entries", { n: count }));
      setDraft(null);
      setText("");
      onDone?.();
    });
  };

  const setNum = (field: "water_ml" | "weight_kg" | "sleep_minutes" | "steps", v: string) =>
    setDraft((d) => (d ? { ...d, [field]: v === "" ? null : Number(v) } : d));

  return (
    <div className="space-y-4">
      {!draft && (
        <>
          <label htmlFor="day-text" className="sr-only">{t("Describe your day")}</label>
          <Textarea
            id="day-text"
            rows={compact ? 3 : 4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("e.g. “Sáng ăn phở bò, trưa cơm gà, chơi pickleball 1 tiếng rưỡi, uống 2 lít nước.”")}
          />
          <Button variant="ai" size="lg" className="w-full" onClick={analyze} disabled={busy || text.trim().length < 2}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t(busy ? "Reading your day…" : "Analyze my day")}
          </Button>
          {busy && <div className="skeleton h-24 rounded-2xl" aria-hidden />}
        </>
      )}

      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">{error}</p>}

      {draft && (
        <div className="space-y-4 animate-fade-up">
          <p className="text-[15px] font-semibold">{t(count === 1 ? "I found {n} thing to log:" : "I found {n} things to log:", { n: count })}</p>
          {note && <p className="rounded-2xl bg-ai-soft px-4 py-3 text-sm text-ink-2">✨ {t(note)}</p>}

          {draft.meals.map((m, idx) => (
            <section key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{MEAL_EMOJI[m.meal_type]} {t(MEAL_LABELS[m.meal_type])}</h3>
                <span className="num text-sm text-ink-2">~{fmt(m.items.reduce((s, i) => s + i.calories, 0))} kcal</span>
              </div>
              <FoodReview items={m.items} onChange={(items) => setDraft({ ...draft, meals: draft.meals.map((x, j) => (j === idx ? { ...x, items } : x)).filter((x) => x.items.length) })} />
            </section>
          ))}

          {draft.exercise.map((e) => (
            <div key={e.key} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <span className="text-xl" aria-hidden>{e.emoji ?? "💪"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t(e.activity)}</p>
                <p className="num text-xs text-ink-3">{e.duration_minutes} {t("min")} · {t(e.intensity)} · <Badge tone="ai">{t(e.confidence)}</Badge></p>
              </div>
              <label className="w-20 text-right">
                <span className="sr-only">{t("Calories burned")}</span>
                <input type="number" value={e.calories_burned} onChange={(ev) => setDraft({ ...draft, exercise: draft.exercise.map((x) => (x.key === e.key ? { ...x, calories_burned: Number(ev.target.value) || 0 } : x)) })} className="num w-full bg-transparent text-right text-lg font-semibold outline-none" />
                <span className="block text-[10px] text-ink-3">{t("kcal burned")}</span>
              </label>
              <button type="button" onClick={() => setDraft({ ...draft, exercise: draft.exercise.filter((x) => x.key !== e.key) })} className="rounded-full p-2 text-ink-3 hover:bg-bad-soft hover:text-bad" aria-label={t("Remove {label}", { label: e.activity })}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {([
            ["water_ml", `💧 ${t("Water")}`, "ml"],
            ["weight_kg", `⚖️ ${t("Weight")}`, "kg"],
            ["sleep_minutes", `😴 ${t("Sleep")}`, t("min")],
            ["steps", `👟 ${t("Steps")}`, ""],
          ] as const).map(([field, label, unit]) =>
            draft[field] !== null ? (
              <div key={field} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <span className="flex-1 font-semibold">{label}</span>
                <input aria-label={label} type="number" value={draft[field] ?? ""} onChange={(e) => setNum(field, e.target.value)} className="num w-24 bg-transparent text-right text-lg font-semibold outline-none" />
                <span className="w-7 text-xs text-ink-3">{unit}</span>
                <button type="button" onClick={() => setNum(field, "")} className="rounded-full p-2 text-ink-3 hover:bg-bad-soft hover:text-bad" aria-label={t("Remove {label}", { label })}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null,
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>{t("Edit text")}</Button>
            <Button size="lg" className="flex-1" onClick={confirmAll} disabled={saving || count === 0}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Confirm all")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
