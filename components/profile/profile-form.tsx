"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { ActivityLevel, Goal, Profile, Sex } from "@/types/user";
import { ACTIVITY_LABELS, GOAL_LABELS } from "@/types/user";
import { suggestTargets } from "@/lib/calculations/calories";
import { calculateMacroTargets } from "@/lib/calculations/macros";
import { saveProfileAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/log/toast";
import { fmt } from "@/lib/utils/cn";
import { useT } from "@/components/i18n-provider";

const selectCls = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] outline-none focus:border-ai";

export function ProfileForm({ profile }: { profile: Profile }) {
  const toast = useToast();
  const t = useT();
  const [p, setP] = useState(profile);
  const [pending, start] = useTransition();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));

  const suggested = useMemo(
    () => suggestTargets({ age: p.age, sex: p.sex, heightCm: p.height_cm, weightKg: p.weight_kg, activity: p.activity_level, goal: p.goal, weeklyChangeKg: p.weekly_change_kg }),
    [p.age, p.sex, p.height_cm, p.weight_kg, p.activity_level, p.goal, p.weekly_change_kg],
  );

  const applySuggested = () => {
    setP((x) => ({ ...x, daily_calorie_target: suggested.calories, daily_protein_target: suggested.protein_g, daily_carbs_target: suggested.carbs_g, daily_fat_target: suggested.fat_g, daily_water_target_ml: suggested.water_ml }));
  };

  const setCalories = (c: number) => {
    const m = calculateMacroTargets({ calories: c, weightKg: p.weight_kg, goal: p.goal });
    setP((x) => ({ ...x, daily_calorie_target: c, daily_carbs_target: Math.max(0, Math.round((c - x.daily_protein_target * 4 - m.fat_g * 9) / 4)), daily_fat_target: m.fat_g }));
  };

  const save = () =>
    start(async () => {
      const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = p;
      void _i; void _u; void _c; void _up;
      const r = await saveProfileAction(rest);
      toast(r.ok ? t("Profile saved") : t(r.error), r.ok ? "good" : "bad");
    });

  const num = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value === "" ? null : Number(e.target.value)) as never);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Field label={t("Name")} htmlFor="pf-name"><Input id="pf-name" value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Age")} htmlFor="pf-age"><Input id="pf-age" type="number" value={p.age} onChange={num("age")} /></Field>
          <Field label={t("Sex")} htmlFor="pf-sex">
            <select id="pf-sex" className={selectCls} value={p.sex} onChange={(e) => set("sex", e.target.value as Sex)}>
              <option value="male">{t("Male")}</option>
              <option value="female">{t("Female")}</option>
            </select>
          </Field>
          <Field label={t("Height (cm)")} htmlFor="pf-h"><Input id="pf-h" type="number" value={p.height_cm} onChange={num("height_cm")} /></Field>
          <Field label={t("Weight (kg)")} htmlFor="pf-w"><Input id="pf-w" type="number" step="0.1" value={p.weight_kg} onChange={num("weight_kg")} /></Field>
          <Field label={t("Target weight (kg)")} htmlFor="pf-tw"><Input id="pf-tw" type="number" step="0.1" value={p.target_weight_kg ?? ""} onChange={num("target_weight_kg")} /></Field>
          <Field label={t("Weekly change (kg)")} htmlFor="pf-wc" hint={t("e.g. −0.5 to lose")}><Input id="pf-wc" type="number" step="0.05" value={p.weekly_change_kg ?? ""} onChange={num("weekly_change_kg")} /></Field>
        </div>
        <Field label={t("Goal")} htmlFor="pf-goal">
          <select id="pf-goal" className={selectCls} value={p.goal} onChange={(e) => set("goal", e.target.value as Goal)}>
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => <option key={g} value={g}>{t(GOAL_LABELS[g])}</option>)}
          </select>
        </Field>
        <Field label={t("Activity level")} htmlFor="pf-act">
          <select id="pf-act" className={selectCls} value={p.activity_level} onChange={(e) => set("activity_level", e.target.value as ActivityLevel)}>
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => <option key={a} value={a}>{t(ACTIVITY_LABELS[a])}</option>)}
          </select>
        </Field>
      </section>

      <section className="rounded-3xl bg-surface-2 p-4">
        <p className="text-sm font-semibold">{t("Estimated daily needs")}</p>
        <dl className="num mt-2 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-ink-2">{t("BMR (Mifflin–St Jeor)")}</dt><dd>{fmt(suggested.bmr)} kcal</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">{t("Activity: {level}", { level: t(ACTIVITY_LABELS[p.activity_level]) })}</dt><dd>{t("× multiplier")}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">{t("Estimated TDEE")}</dt><dd>{fmt(suggested.tdee)} kcal</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">{t("Suggested target")}</dt><dd className="font-semibold">{t("{k} kcal · {p} g protein", { k: fmt(suggested.calories), p: suggested.protein_g })}</dd></div>
        </dl>
        {suggested.notes.map((n) => <p key={n} className="mt-2 text-xs text-warn">{t(n)}</p>)}
        <p className="mt-2 text-xs text-ink-3">{t("Estimates only — real needs vary ±10–15%.")}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={applySuggested}><RefreshCw className="h-3.5 w-3.5" /> {t("Use suggested targets")}</Button>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold">{t("Your targets")}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Calories (kcal)")} htmlFor="pf-cal"><Input id="pf-cal" type="number" value={p.daily_calorie_target} onChange={(e) => setCalories(Number(e.target.value) || 0)} /></Field>
          <Field label={t("Protein (g)")} htmlFor="pf-p"><Input id="pf-p" type="number" value={p.daily_protein_target} onChange={num("daily_protein_target")} /></Field>
          <Field label={t("Carbs (g)")} htmlFor="pf-c"><Input id="pf-c" type="number" value={p.daily_carbs_target} onChange={num("daily_carbs_target")} /></Field>
          <Field label={t("Fat (g)")} htmlFor="pf-f"><Input id="pf-f" type="number" value={p.daily_fat_target} onChange={num("daily_fat_target")} /></Field>
          <Field label={t("Water (ml)")} htmlFor="pf-wa"><Input id="pf-wa" type="number" step="100" value={p.daily_water_target_ml} onChange={num("daily_water_target_ml")} /></Field>
          <Field label={t("Steps")} htmlFor="pf-st"><Input id="pf-st" type="number" step="500" value={p.daily_step_goal} onChange={num("daily_step_goal")} /></Field>
          <Field label={t("Exercise (min/day)")} htmlFor="pf-ex"><Input id="pf-ex" type="number" value={p.daily_exercise_goal_min} onChange={num("daily_exercise_goal_min")} /></Field>
        </div>
      </section>

      <Button size="lg" className="w-full" onClick={save} disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} {t("Save changes")}
      </Button>
    </div>
  );
}
