"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Trash2, Watch, Clock } from "lucide-react";
import type { ExerciseEstimate, Intensity } from "@/types/exercise";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/progress";
import { analyzeExerciseText, FriendlyError, nowHHMM, todayAt } from "@/lib/client/api";
import { estimateExercise, findActivity } from "@/lib/ai/parser";
import { ACTIVITY_DB } from "@/lib/ai/exercise-db";
import { saveExerciseAction } from "@/app/actions";
import { fmt } from "@/lib/utils/cn";
import { useToast } from "./toast";
import { msg } from "@/lib/i18n";
import { useT } from "@/components/i18n-provider";

interface EditableExercise extends ExerciseEstimate {
  key: string;
  ai: boolean;
  deviceKcal: number | null;
  heartRate: number | null;
}

let k = 0;
const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: "light", label: msg("Light|intensity") },
  { value: "moderate", label: msg("Moderate|intensity") },
  { value: "vigorous", label: msg("Vigorous|intensity") },
];

const EXAMPLES = ["Pickleball 90 phút", "Chạy bộ 5km trong 30 phút", "Tập gym 1 tiếng", "Walked 45 minutes"];

function recompute(e: EditableExercise, weightKg: number): EditableExercise {
  const ref = findActivity(e.activity);
  if (ref) {
    const est = estimateExercise({ ref, minutes: e.duration_minutes, distanceKm: e.distance_km, intensity: e.intensity, weightKg, durationGiven: true });
    return { ...e, calories_burned: est.calories_burned, calories_low: est.calories_low, calories_high: est.calories_high, met: est.met, assumptions: est.assumptions };
  }
  return e;
}

export function ExerciseLogger({ weightKg, onDone }: { weightKg: number; onDone?: () => void }) {
  const toast = useToast();
  const t = useT();
  const [text, setText] = useState("");
  const [items, setItems] = useState<EditableExercise[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [time, setTime] = useState(nowHHMM());
  const [saving, startSaving] = useTransition();

  const analyze = async () => {
    if (text.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const r = await analyzeExerciseText(text);
      if (!r.items.length) setError(t(r.clarification ?? "We couldn't recognise that activity. Try again or add it manually."));
      else setItems((prev) => [...(prev ?? []), ...r.items.map((i) => ({ ...i, key: `e${++k}`, ai: true, deviceKcal: null, heartRate: null }))]);
      setNote(r.clarification);
    } catch (e) {
      setError(t(e instanceof FriendlyError ? e.message : "We couldn't analyze that workout. You can enter it manually."));
    } finally {
      setBusy(false);
    }
  };

  const addManual = (activity: string) => {
    const ref = ACTIVITY_DB.find((a) => a.name === activity) ?? null;
    const est = estimateExercise({ ref, activityName: activity, minutes: 30, distanceKm: null, intensity: "moderate", weightKg, durationGiven: true });
    setItems((prev) => [...(prev ?? []), { ...est, key: `e${++k}`, ai: false, deviceKcal: null, heartRate: null }]);
  };

  const update = (key: string, patch: Partial<EditableExercise>, recalc = false) =>
    setItems((prev) => (prev ?? []).map((i) => (i.key === key ? (recalc ? recompute({ ...i, ...patch }, weightKg) : { ...i, ...patch }) : i)));

  const save = () => {
    const valid = (items ?? []).filter((i) => i.activity.trim() && i.duration_minutes > 0);
    if (!valid.length) return setError(t("Add at least one activity with a duration."));
    startSaving(async () => {
      const res = await saveExerciseAction(
        valid.map((i) => ({
          activity: i.activity.trim(),
          duration_minutes: Math.round(i.duration_minutes),
          distance_km: i.distance_km,
          intensity: i.intensity,
          heart_rate_avg: i.heartRate,
          // A measured value from a watch always wins over an estimate.
          calories_burned: i.deviceKcal ?? i.calories_burned,
          ai_estimated: i.deviceKcal === null && i.ai,
          confidence: i.deviceKcal !== null ? "high" : i.confidence,
          notes: i.deviceKcal !== null ? "Calories from device" : null,
          logged_at: todayAt(time),
        })),
      );
      if (!res.ok) return setError(t(res.error));
      const kcal = valid.reduce((s, i) => s + (i.deviceKcal ?? i.calories_burned), 0);
      toast(t("Exercise saved · {n} kcal burned", { n: fmt(kcal) }));
      setItems(null);
      setText("");
      onDone?.();
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ex-text" className="sr-only">{t("Describe your workout")}</label>
        <Textarea id="ex-text" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("e.g. “Chơi pickleball 1 tiếng rưỡi”")} />
        {!items && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-2 hover:text-ink">
                {ex}
              </button>
            ))}
          </div>
        )}
        <Button variant="ai" className="mt-3 w-full" onClick={analyze} disabled={busy || text.trim().length < 2}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t(busy ? "Estimating…" : "Estimate with AI")}
        </Button>
      </div>

      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">{error}</p>}

      {!items && (
        <div>
          <p className="mb-2 text-xs font-medium text-ink-3">{t("Or pick an activity")}</p>
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_DB.slice(0, 15).map((a) => (
              <button key={a.name} type="button" onClick={() => addManual(a.name)} className="rounded-full border border-line px-3 py-1.5 text-xs hover:bg-surface-2">
                {a.emoji} {t(a.name)}
              </button>
            ))}
            <button type="button" onClick={() => addManual("Custom activity")} className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs hover:bg-surface-2">
              ＋ {t("Custom")}
            </button>
          </div>
        </div>
      )}

      {items && (
        <div className="space-y-3 animate-fade-up">
          {note && <p className="rounded-2xl bg-ai-soft px-4 py-3 text-sm text-ink-2">✨ {t(note)}</p>}
          {items.map((e) => (
            <div key={e.key} className="rounded-2xl border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>{e.emoji ?? "💪"}</span>
                <input aria-label={t("Activity")} value={e.activity} onChange={(ev) => update(e.key, { activity: ev.target.value })} onBlur={() => update(e.key, {}, true)} className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none" />
                <button type="button" onClick={() => setItems(items.filter((i) => i.key !== e.key))} className="rounded-full p-2 text-ink-3 hover:bg-bad-soft hover:text-bad" aria-label={t("Remove {label}", { label: e.activity })}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="rounded-xl bg-surface-2 px-2.5 py-1.5">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-3">{t("Minutes")}</span>
                  <input type="number" inputMode="numeric" min={1} value={e.duration_minutes} onChange={(ev) => update(e.key, { duration_minutes: Number(ev.target.value) || 0 }, true)} className="num w-full bg-transparent text-[15px] font-semibold outline-none" />
                </label>
                <label className="rounded-xl bg-surface-2 px-2.5 py-1.5">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-3">{t("Distance km")}</span>
                  <input type="number" inputMode="decimal" min={0} step="any" value={e.distance_km ?? ""} placeholder="—" onChange={(ev) => update(e.key, { distance_km: ev.target.value ? Number(ev.target.value) : null }, true)} className="num w-full bg-transparent text-[15px] font-semibold outline-none" />
                </label>
                <label className="rounded-xl bg-surface-2 px-2.5 py-1.5">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-3">{t("Avg HR")}</span>
                  <input type="number" inputMode="numeric" min={30} value={e.heartRate ?? ""} placeholder="—" onChange={(ev) => update(e.key, { heartRate: ev.target.value ? Number(ev.target.value) : null })} className="num w-full bg-transparent text-[15px] font-semibold outline-none" />
                </label>
              </div>
              <Segmented className="mt-2" label={t("Intensity")} value={e.intensity} onChange={(v) => update(e.key, { intensity: v }, true)} options={INTENSITIES.map((o) => ({ ...o, label: t(o.label) }))} />

              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-3">{t(e.deviceKcal !== null ? "From your device" : "Estimated active burn")}</p>
                  <p className="num text-2xl font-semibold">{fmt(e.deviceKcal ?? e.calories_burned)} <span className="text-sm font-normal text-ink-3">kcal</span></p>
                  {e.deviceKcal === null && e.calories_low !== undefined && e.calories_high !== undefined && (
                    <p className="num text-xs text-ink-3">{fmt(e.calories_low)}–{fmt(e.calories_high)} kcal · <Badge tone={e.confidence === "high" ? "good" : e.confidence === "low" ? "warn" : "ai"}>{t(e.confidence)}</Badge></p>
                  )}
                </div>
                <label className="w-36 rounded-xl border border-line px-2.5 py-1.5">
                  <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-ink-3"><Watch className="h-3 w-3" /> {t("Watch kcal")}</span>
                  <input type="number" inputMode="numeric" min={0} value={e.deviceKcal ?? ""} placeholder={t("optional")} onChange={(ev) => update(e.key, { deviceKcal: ev.target.value ? Number(ev.target.value) : null })} className="num w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-sm placeholder:font-normal placeholder:text-ink-3" />
                </label>
              </div>
              {e.deviceKcal === null && e.assumptions.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-ink-3">
                  {e.assumptions.slice(0, 3).map((a, i) => <li key={i}>• {t(a)}</li>)}
                </ul>
              )}
            </div>
          ))}

          <label className="flex items-center justify-between rounded-2xl border border-line px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-ink-2"><Clock className="h-4 w-4" /> {t("Time")}</span>
            <input type="time" value={time} onChange={(ev) => setTime(ev.target.value)} className="num bg-transparent font-medium outline-none" aria-label={t("Exercise time")} />
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setItems(null)} disabled={saving}>{t("Discard")}</Button>
            <Button className="flex-1" size="lg" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Confirm & save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

