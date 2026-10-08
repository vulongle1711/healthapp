"use client";

import { useState, useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { addNoteAction, addSleepAction, addStepsAction, addWaterAction, addWeightAction } from "@/app/actions";
import { cn, fmt } from "@/lib/utils/cn";
import { useToast } from "./toast";
import { useT } from "@/components/i18n-provider";

function useSaver(onDone?: () => void) {
  const toast = useToast();
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) return setError(t(r.error ?? "Couldn't save. Please try again."));
      toast(msg);
      onDone?.();
    });
  return { pending, error, setError, save, t };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">{error}</p> : null;
}

export function WaterLogger({ onDone }: { onDone?: () => void }) {
  const { pending, error, save, t } = useSaver(onDone);
  const [custom, setCustom] = useState("");
  const add = (ml: number) => save(() => addWaterAction(ml), t("+{n} ml water", { n: fmt(ml) }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[250, 500, 750].map((ml) => (
          <button key={ml} type="button" disabled={pending} onClick={() => add(ml)} className="flex flex-col items-center gap-1 rounded-2xl bg-surface-2 py-4 transition active:scale-95 hover:bg-line disabled:opacity-50">
            <span className="text-xl" aria-hidden>{ml === 250 ? "🥛" : ml === 500 ? "🍶" : "🫙"}</span>
            <span className="num text-sm font-semibold">+{ml} ml</span>
          </button>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(custom); if (n > 0) add(n); }}>
        <label htmlFor="water-custom" className="sr-only">{t("Custom amount in ml")}</label>
        <Input id="water-custom" type="number" inputMode="numeric" min={10} max={5000} placeholder={t("Custom ml")} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <Button type="submit" disabled={pending || !(Number(custom) > 0)}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Add")}</Button>
      </form>
      <ErrorText error={error} />
    </div>
  );
}

export function WeightLogger({ onDone, current }: { onDone?: () => void; current?: number }) {
  const { pending, error, setError, save, t } = useSaver(onDone);
  const [w, setW] = useState(current ? String(current) : "");
  const [bf, setBf] = useState("");
  const [mm, setMm] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const weight = Number(w);
        if (!(weight >= 30 && weight <= 300)) return setError(t("Enter a weight between 30 and 300 kg."));
        save(() => addWeightAction({ weight_kg: weight, body_fat_percentage: bf ? Number(bf) : null, muscle_mass_kg: mm ? Number(mm) : null, logged_at: new Date().toISOString() }), t("Weight saved · {n} kg", { n: weight }));
      }}
    >
      <Field label={t("Weight (kg)")} htmlFor="w-kg">
        <Input id="w-kg" type="number" inputMode="decimal" step="0.1" autoFocus value={w} onChange={(e) => setW(e.target.value)} className="num h-14 text-2xl font-semibold" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Body fat % (optional)")} htmlFor="w-bf">
          <Input id="w-bf" type="number" inputMode="decimal" step="0.1" value={bf} onChange={(e) => setBf(e.target.value)} />
        </Field>
        <Field label={t("Muscle mass kg (optional)")} htmlFor="w-mm">
          <Input id="w-mm" type="number" inputMode="decimal" step="0.1" value={mm} onChange={(e) => setMm(e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-ink-3">{t("Tip: weigh in the morning before eating — daily numbers fluctuate ±1 kg with water and salt.")}</p>
      <ErrorText error={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{t("Save weight")}</Button>
    </form>
  );
}

function minutesBetween(bed: string, wake: string) {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let d = wh * 60 + wm - (bh * 60 + bm);
  if (d <= 0) d += 24 * 60;
  return d;
}

export function SleepLogger({ onDone }: { onDone?: () => void }) {
  const { pending, error, save, t } = useSaver(onDone);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("06:30");
  const [quality, setQuality] = useState<number | null>(null);
  const dur = minutesBetween(bed, wake);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const wakeD = new Date();
        const [wh, wm] = wake.split(":").map(Number);
        wakeD.setHours(wh, wm, 0, 0);
        if (wakeD.getTime() > Date.now()) wakeD.setDate(wakeD.getDate() - 1);
        const bedD = new Date(wakeD.getTime() - dur * 60000);
        save(() => addSleepAction({ bedtime: bedD.toISOString(), wake_time: wakeD.toISOString(), duration_minutes: dur, quality, logged_at: wakeD.toISOString() }), t("Sleep saved · {h}h {m}m", { h: Math.floor(dur / 60), m: dur % 60 }));
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Bedtime")} htmlFor="s-bed"><Input id="s-bed" type="time" value={bed} onChange={(e) => setBed(e.target.value)} /></Field>
        <Field label={t("Wake time")} htmlFor="s-wake"><Input id="s-wake" type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></Field>
      </div>
      <p className="num text-center text-3xl font-semibold">{Math.floor(dur / 60)}h {dur % 60}m</p>
      <div>
        <p className="mb-2 text-xs font-medium text-ink-2">{t("Sleep quality")}</p>
        <div className="flex justify-center gap-2" role="radiogroup" aria-label={t("Sleep quality")}>
          {[1, 2, 3, 4, 5].map((q) => (
            <button key={q} type="button" role="radio" aria-checked={quality === q} aria-label={t("{n} of 5", { n: q })} onClick={() => setQuality(q)} className="rounded-full p-1.5">
              <Star className={cn("h-7 w-7 transition", quality && q <= quality ? "fill-warn text-warn" : "text-line")} />
            </button>
          ))}
        </div>
      </div>
      <ErrorText error={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{t("Save sleep")}</Button>
    </form>
  );
}

export function StepsLogger({ onDone }: { onDone?: () => void }) {
  const { pending, error, setError, save, t } = useSaver(onDone);
  const [steps, setSteps] = useState("");
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const n = Number(steps); if (!(n >= 0 && n <= 200000)) return setError(t("Enter a step count.")); save(() => addStepsAction(n), t("Steps saved · {n}", { n: fmt(n) })); }}>
      <Field label={t("Steps today")} htmlFor="st" hint={t("Copy today's total from your phone or watch. Logging again replaces today's value.")}>
        <Input id="st" type="number" inputMode="numeric" autoFocus value={steps} onChange={(e) => setSteps(e.target.value)} className="num h-14 text-2xl font-semibold" />
      </Field>
      <ErrorText error={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{t("Save steps")}</Button>
    </form>
  );
}

export function NoteLogger({ onDone }: { onDone?: () => void }) {
  const { pending, error, save, t } = useSaver(onDone);
  const [text, setText] = useState("");
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (text.trim()) save(() => addNoteAction(text), t("Note saved")); }}>
      <label htmlFor="note" className="sr-only">{t("Note")}</label>
      <Textarea id="note" rows={4} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={t("How are you feeling? Anything notable today?")} />
      <ErrorText error={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending || !text.trim()}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{t("Save note")}</Button>
    </form>
  );
}
