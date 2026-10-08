"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import type { FoodLog } from "@/types/nutrition";
import { deleteExerciseAction, deleteFoodAction, deleteNoteAction, deleteSleepAction, deleteWaterAction, deleteWeightAction, deleteUserFoodAction, updateFoodAction, type ActionResult } from "@/app/actions";
import { useToast } from "@/components/log/toast";
import { Badge } from "@/components/ui/progress";
import { fmt } from "@/lib/utils/cn";
import { useT } from "@/components/i18n-provider";

const DELETERS = {
  food: deleteFoodAction,
  exercise: deleteExerciseAction,
  water: deleteWaterAction,
  weight: deleteWeightAction,
  sleep: deleteSleepAction,
  note: deleteNoteAction,
  userFood: deleteUserFoodAction,
} satisfies Record<string, (id: string) => Promise<ActionResult>>;

export function DeleteButton({ kind, id, label }: { kind: keyof typeof DELETERS; id: string; label: string }) {
  const toast = useToast();
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await DELETERS[kind](id);
          toast(r.ok ? t("Deleted") : t(r.error), r.ok ? "good" : "bad");
        })
      }
      className="rounded-full p-2 text-ink-3 transition hover:bg-bad-soft hover:text-bad disabled:opacity-50"
      aria-label={t("Delete {label}", { label })}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

export function FoodRow({ item }: { item: FoodLog }) {
  const toast = useToast();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ food_name: item.food_name, calories: item.calories, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g });
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <li className="rounded-2xl bg-surface-2 p-3">
        <input aria-label={t("Food name")} value={v.food_name} onChange={(e) => setV({ ...v, food_name: e.target.value })} className="w-full bg-transparent font-semibold outline-none" />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(["calories", "protein_g", "carbs_g", "fat_g"] as const).map((f) => (
            <label key={f} className="rounded-xl bg-surface px-2 py-1">
              <span className="block text-[10px] uppercase tracking-wide text-ink-3">{f === "calories" ? "kcal" : t(f === "protein_g" ? "Protein" : f === "carbs_g" ? "Carbs" : "Fat")}</span>
              <input type="number" inputMode="decimal" value={v[f]} onChange={(e) => setV({ ...v, [f]: Number(e.target.value) || 0 })} className="num w-full bg-transparent font-semibold outline-none" />
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-end gap-1">
          <button type="button" onClick={() => setEditing(false)} className="rounded-full p-2 text-ink-3 hover:bg-surface" aria-label={t("Cancel")}><X className="h-4 w-4" /></button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await updateFoodAction(item.id, v);
                if (r.ok) setEditing(false);
                toast(r.ok ? t("Updated") : t(r.error), r.ok ? "good" : "bad");
              })
            }
            className="rounded-full bg-ink p-2 text-bg"
            aria-label={t("Save")}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.food_name}</p>
        <p className="num text-xs text-ink-3">
          {fmt(item.quantity, 1)} {t(item.unit)} · {t("P")} {fmt(item.protein_g)} · {t("C")} {fmt(item.carbs_g)} · {t("F")} {fmt(item.fat_g)}
          {item.ai_estimated && <Badge tone="ai" className="ml-1.5">AI</Badge>}
        </p>
      </div>
      <span className="num text-sm font-semibold">{fmt(item.calories)}</span>
      <button type="button" onClick={() => setEditing(true)} className="rounded-full p-2 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label={t("Edit {label}", { label: item.food_name })}>
        <Pencil className="h-4 w-4" />
      </button>
      <DeleteButton kind="food" id={item.id} label={item.food_name} />
    </li>
  );
}
