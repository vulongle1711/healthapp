"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Sparkles, Clock } from "lucide-react";
import type { MealType, UserFood } from "@/types/nutrition";
import { MEAL_LABELS, MEAL_TYPES } from "@/types/nutrition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/progress";
import { analyzeFoodPhoto, analyzeFoodText, FriendlyError, nowHHMM, todayAt } from "@/lib/client/api";
import { mealForHour } from "@/lib/ai/parser";
import { saveMealAction } from "@/app/actions";
import { cn, fmt } from "@/lib/utils/cn";
import { AddItemButton, FoodReview, blankFood, toEditable, type EditableFood } from "./food-review";
import { useToast } from "./toast";
import { useT } from "@/components/i18n-provider";

const EXAMPLES = ["1 tô phở bò, 1 ly cà phê sữa đá", "2 eggs and a banh mi", "1 phần cơm tấm sườn bì chả", "2 cuốn gỏi cuốn"];

export function FoodLogger({
  userFoods = [],
  onDone,
  autoFocus,
  variant = "sheet",
  initialMeal,
}: {
  userFoods?: UserFood[];
  onDone?: () => void;
  autoFocus?: boolean;
  variant?: "sheet" | "inline";
  initialMeal?: MealType;
}) {
  const toast = useToast();
  const t = useT();
  const [text, setText] = useState("");
  const [items, setItems] = useState<EditableFood[] | null>(null);
  const [meal, setMeal] = useState<MealType>(initialMeal ?? mealForHour(new Date().getHours() + new Date().getMinutes() / 60));
  const [time, setTime] = useState(nowHHMM());
  const [busy, setBusy] = useState<"text" | "photo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "offline" | null>(null);
  const [saving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(kind: "text" | "photo", fn: () => ReturnType<typeof analyzeFoodText>) {
    setBusy(kind);
    setError(null);
    try {
      const r = await fn();
      setItems((prev) => [...(prev ?? []), ...toEditable(r.items, true)]);
      setClarification(r.clarification ?? null);
      setSource(r.source);
      if (r.meal_type) setMeal(r.meal_type);
      if (!r.items.length && !r.clarification) setError(t("We couldn't find any food in that. Try again or add it manually."));
    } catch (e) {
      setError(t(e instanceof FriendlyError ? e.message : "We couldn't analyze that meal. You can try again or enter the nutrition manually."));
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  const analyze = () => text.trim().length >= 2 && run("text", () => analyzeFoodText(text));
  const onPhoto = (f: File | undefined) => f && run("photo", () => analyzeFoodPhoto(f, text || undefined));

  const total = (items ?? []).reduce(
    (a, i) => ({ calories: a.calories + i.calories, low: a.low + (i.calories_low ?? i.calories), high: a.high + (i.calories_high ?? i.calories), p: a.p + i.protein_g, c: a.c + i.carbs_g, f: a.f + i.fat_g }),
    { calories: 0, low: 0, high: 0, p: 0, c: 0, f: 0 },
  );

  const save = () => {
    const valid = (items ?? []).filter((i) => i.name.trim());
    if (!valid.length) return setError(t("Add at least one item with a name."));
    startSaving(async () => {
      const res = await saveMealAction({
        meal_type: meal,
        logged_at: todayAt(time),
        items: valid.map((i) => ({
          food_name: i.name.trim(),
          quantity: i.quantity || 1,
          unit: i.unit || "serving",
          calories: Math.max(0, Math.round(i.calories)),
          protein_g: Math.max(0, i.protein_g),
          carbs_g: Math.max(0, i.carbs_g),
          fat_g: Math.max(0, i.fat_g),
          confidence: i.ai ? i.confidence : null,
          ai_estimated: i.ai,
          ai_assumptions: i.ai ? i.assumptions.slice(0, 10) : null,
          ai_original_calories: i.original_calories,
        })),
      });
      if (!res.ok) return setError(t(res.error));
      toast(t("{meal} saved · {n} kcal", { meal: t(MEAL_LABELS[meal]), n: fmt(Math.round(total.calories)) }));
      setItems(null);
      setText("");
      setClarification(null);
      onDone?.();
    });
  };

  const addUserFood = (u: UserFood) =>
    setItems((prev) => [
      ...(prev ?? []),
      ...toEditable([{ name: u.name, quantity: 1, unit: u.unit, calories: u.calories, protein_g: u.protein_g, carbs_g: u.carbs_g, fat_g: u.fat_g, confidence: "high", assumptions: [t("From My Foods")], emoji: "⭐" }], false),
    ]);

  return (
    <div className="space-y-4">
      <div className={cn(variant === "inline" && "rounded-3xl p-5 shadow-card ai-glow")}>
        {variant === "inline" && <p className="mb-3 text-[15px] font-semibold tracking-tight">{t("What did you eat?")}</p>}
        <label htmlFor="food-text" className="sr-only">
          {t("Describe your food")}
        </label>
        <Textarea
          id="food-text"
          rows={variant === "inline" ? 2 : 3}
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze();
          }}
          placeholder={t("e.g. “1 tô phở bò và 1 ly cà phê sữa đá”")}
        />
        {!items && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.slice(0, variant === "inline" ? 2 : 4).map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-2 hover:text-ink">
                {ex}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button variant="ai" className="flex-1" onClick={analyze} disabled={!!busy || text.trim().length < 2}>
            {busy === "text" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t(busy === "text" ? "Analyzing…" : items ? "Analyze & add" : "Analyze with AI")}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!!busy} aria-label={t("Scan food photo")}>
            {busy === "photo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span className="hidden min-[400px]:inline">{t("Scan")}</span>
          </Button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>
        {busy && (
          <div className="mt-4 space-y-2" aria-hidden>
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl opacity-60" />
          </div>
        )}
      </div>

      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">{error}</p>}

      {!items && userFoods.length > 0 && variant === "sheet" && (
        <div>
          <p className="mb-2 text-xs font-medium text-ink-3">{t("My foods")}</p>
          <div className="flex flex-wrap gap-1.5">
            {userFoods.slice(0, 8).map((u) => (
              <button key={u.id} type="button" onClick={() => addUserFood(u)} className="rounded-full border border-line px-3 py-1.5 text-xs hover:bg-surface-2">
                ⭐ {u.name} · <span className="num">{fmt(u.calories)}</span> kcal
              </button>
            ))}
          </div>
        </div>
      )}

      {!items && variant === "sheet" && (
        <button type="button" className="w-full text-center text-sm text-ink-3 underline-offset-4 hover:underline" onClick={() => setItems([blankFood()])}>
          {t("Or enter nutrition manually")}
        </button>
      )}

      {items && (
        <div className="space-y-4 animate-fade-up">
          {clarification && (
            <p className="rounded-2xl bg-ai-soft px-4 py-3 text-sm text-ink-2">
              <span className="font-medium text-ai">✨ </span>
              {t(clarification)}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("Review before saving")}</p>
            {source && <Badge tone={source === "ai" ? "ai" : "neutral"}>{t(source === "ai" ? "AI estimate" : "Offline estimate")}</Badge>}
          </div>
          <FoodReview items={items} onChange={setItems} />
          <AddItemButton onAdd={() => setItems([...(items ?? []), blankFood()])} />

          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-2">{t("Estimated total")}</span>
              <span className="num text-2xl font-semibold">≈ {fmt(Math.round(total.calories))} kcal</span>
            </div>
            {total.high > total.low + 5 && (
              <p className="num mt-0.5 text-right text-xs text-ink-3">
                {t("likely {lo}–{hi} kcal", { lo: fmt(Math.round(total.low)), hi: fmt(Math.round(total.high)) })}
              </p>
            )}
            <p className="num mt-2 text-xs text-ink-2">
              {t("Protein")} {fmt(total.p, 1)} g · {t("Carbs")} {fmt(total.c, 1)} g · {t("Fat")} {fmt(total.f, 1)} g
            </p>
          </div>

          <Segmented label={t("Meal")} value={meal} onChange={setMeal} options={MEAL_TYPES.map((m) => ({ value: m, label: t(MEAL_LABELS[m]) }))} />
          <label className="flex items-center justify-between rounded-2xl border border-line px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-ink-2">
              <Clock className="h-4 w-4" /> {t("Time")}
            </span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="num bg-transparent font-medium outline-none" aria-label={t("Meal time")} />
          </label>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setItems(null); setClarification(null); }} disabled={saving}>
              {t("Discard")}
            </Button>
            <Button className="flex-1" size="lg" onClick={save} disabled={saving || !items.length}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Confirm & save")}
            </Button>
          </div>
          <p className="text-center text-[11px] text-ink-3">{t("AI estimates aren't exact measurements — edit anything that looks off.")}</p>
        </div>
      )}
    </div>
  );
}
