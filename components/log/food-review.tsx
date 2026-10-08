"use client";

import { useState } from "react";
import { ChevronDown, Info, Plus, Trash2 } from "lucide-react";
import type { FoodEstimate } from "@/types/nutrition";
import { Badge } from "@/components/ui/progress";
import { cn, fmt } from "@/lib/utils/cn";
import { useT } from "@/components/i18n-provider";

export interface EditableFood extends FoodEstimate {
  key: string;
  ai: boolean;
  original_calories: number | null;
  /** Per-1-quantity baseline, so editing quantity rescales everything. */
  base: { quantity: number; calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

let k = 0;
export function toEditable(items: FoodEstimate[], ai: boolean): EditableFood[] {
  return items.map((i) => ({
    ...i,
    key: `f${++k}`,
    ai,
    original_calories: ai ? i.calories : null,
    base: { quantity: i.quantity || 1, calories: i.calories, protein_g: i.protein_g, carbs_g: i.carbs_g, fat_g: i.fat_g },
  }));
}

export function blankFood(): EditableFood {
  return {
    key: `f${++k}`,
    name: "",
    quantity: 1,
    unit: "serving",
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    confidence: "high",
    assumptions: [],
    emoji: "🍽️",
    ai: false,
    original_calories: null,
    base: { quantity: 1, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  };
}

const CONF_TONE = { high: "good", medium: "ai", low: "warn" } as const;

function NumInput({ label, value, onChange, suffix, className, id }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; className?: string; id: string }) {
  return (
    <label htmlFor={id} className={cn("flex flex-col rounded-xl bg-surface-2 px-2.5 py-1.5", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3">{label}</span>
      <span className="flex items-baseline gap-0.5">
        <input
          id={id}
          inputMode="decimal"
          type="number"
          min={0}
          step="any"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="num w-full min-w-0 bg-transparent text-[15px] font-semibold outline-none"
        />
        {suffix && <span className="text-[11px] text-ink-3">{suffix}</span>}
      </span>
    </label>
  );
}

export function FoodReview({ items, onChange }: { items: EditableFood[]; onChange: (items: EditableFood[]) => void }) {
  const t = useT();
  const [openInfo, setOpenInfo] = useState<string | null>(items[0]?.key ?? null);

  const update = (key: string, patch: Partial<EditableFood>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const setQuantity = (item: EditableFood, q: number) => {
    const ratio = item.base.quantity > 0 ? q / item.base.quantity : 1;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    update(item.key, {
      quantity: q,
      calories: Math.round(item.base.calories * ratio),
      protein_g: r1(item.base.protein_g * ratio),
      carbs_g: r1(item.base.carbs_g * ratio),
      fat_g: r1(item.base.fat_g * ratio),
      calories_low: item.calories_low !== undefined ? Math.round((item.calories_low / (item.calories || 1)) * item.base.calories * ratio) : undefined,
      calories_high: item.calories_high !== undefined ? Math.round((item.calories_high / (item.calories || 1)) * item.base.calories * ratio) : undefined,
      original_calories: item.original_calories !== null ? Math.round(item.base.calories * ratio) : null,
    });
  };

  /** Direct edits to nutrition values become the new baseline for quantity scaling. */
  const setValue = (item: EditableFood, field: "calories" | "protein_g" | "carbs_g" | "fat_g", v: number) => {
    const ratio = item.quantity > 0 ? item.base.quantity / item.quantity : 1;
    update(item.key, { [field]: v, base: { ...item.base, [field]: v * ratio }, calories_low: undefined, calories_high: undefined });
  };

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const edited = item.ai && item.original_calories !== null && Math.abs(item.calories - item.original_calories) > 1;
        return (
          <li key={item.key} className="rounded-2xl border border-line p-3 animate-fade-up">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>{item.emoji ?? "🍽️"}</span>
              <input
                aria-label={t("Food name")}
                value={item.name}
                placeholder={t("Food name")}
                onChange={(e) => update(item.key, { name: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-ink-3"
              />
              <button type="button" onClick={() => onChange(items.filter((i) => i.key !== item.key))} className="rounded-full p-2 text-ink-3 hover:bg-bad-soft hover:text-bad" aria-label={t("Remove {label}", { label: item.name || t("item") })}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-[1fr_1.3fr] gap-2">
              <NumInput id={`${item.key}-q`} label={t("Qty")} value={item.quantity} onChange={(q) => setQuantity(item, q)} />
              <label htmlFor={`${item.key}-u`} className="flex flex-col rounded-xl bg-surface-2 px-2.5 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3">{t("Unit")}</span>
                <input id={`${item.key}-u`} value={item.unit} onChange={(e) => update(item.key, { unit: e.target.value })} className="w-full bg-transparent text-[15px] font-semibold outline-none" />
              </label>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <NumInput id={`${item.key}-k`} label="kcal" value={item.calories} onChange={(v) => setValue(item, "calories", v)} />
              <NumInput id={`${item.key}-p`} label={t("Protein")} suffix="g" value={item.protein_g} onChange={(v) => setValue(item, "protein_g", v)} />
              <NumInput id={`${item.key}-c`} label={t("Carbs")} suffix="g" value={item.carbs_g} onChange={(v) => setValue(item, "carbs_g", v)} />
              <NumInput id={`${item.key}-f`} label={t("Fat")} suffix="g" value={item.fat_g} onChange={(v) => setValue(item, "fat_g", v)} />
            </div>

            {(item.ai || item.assumptions.length > 0) && (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setOpenInfo(openInfo === item.key ? null : item.key)}
                  className="flex w-full items-center gap-2 text-left text-xs text-ink-3"
                  aria-expanded={openInfo === item.key}
                >
                  {edited ? (
                    <Badge tone="good">{t("Your value")}</Badge>
                  ) : (
                    <Badge tone={CONF_TONE[item.confidence]}>{t(`${item.confidence[0].toUpperCase() + item.confidence.slice(1)} confidence`)}</Badge>
                  )}
                  {!edited && item.calories_low !== undefined && item.calories_high !== undefined && item.calories_high > item.calories_low && (
                    <span className="num">
                      {fmt(item.calories_low)}–{fmt(item.calories_high)} kcal
                    </span>
                  )}
                  {item.assumptions.length > 0 && (
                    <span className="ml-auto flex items-center gap-0.5">
                      <Info className="h-3.5 w-3.5" /> {t("Assumptions")}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition", openInfo === item.key && "rotate-180")} />
                    </span>
                  )}
                </button>
                {openInfo === item.key && item.assumptions.length > 0 && (
                  <ul className="mt-2 space-y-1 rounded-xl bg-ai-soft/60 px-3 py-2 text-xs text-ink-2">
                    {item.assumptions.map((a, i) => (
                      <li key={i}>• {t(a)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AddItemButton({ onAdd }: { onAdd: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onAdd} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-ink-2 hover:bg-surface-2">
      <Plus className="h-4 w-4" /> {t("Add item manually")}
    </button>
  );
}
