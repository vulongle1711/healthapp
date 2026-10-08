"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { ActivityLevel, Goal, Profile, Sex } from "@/types/user";
import { ACTIVITY_HINTS, ACTIVITY_LABELS, GOAL_LABELS } from "@/types/user";
import { suggestTargets } from "@/lib/calculations/calories";
import { saveProfileAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/nav";
import { cn, fmt } from "@/lib/utils/cn";
import { useT } from "@/components/i18n-provider";

const GOAL_EMOJI: Record<Goal, string> = { lose_weight: "📉", maintain: "⚖️", gain_weight: "📈", build_muscle: "💪", improve_fitness: "🏃" };

export function Onboarding({ existing }: { existing: Profile | null }) {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(existing?.name ?? "");
  const [age, setAge] = useState(existing ? String(existing.age) : "");
  const [sex, setSex] = useState<Sex>(existing?.sex ?? "male");
  const [height, setHeight] = useState(existing ? String(existing.height_cm) : "");
  const [weight, setWeight] = useState(existing ? String(existing.weight_kg) : "");
  const [goal, setGoal] = useState<Goal>(existing?.goal ?? "lose_weight");
  const [activity, setActivity] = useState<ActivityLevel>(existing?.activity_level ?? "light");
  const [targetWeight, setTargetWeight] = useState(existing?.target_weight_kg ? String(existing.target_weight_kg) : "");
  const [override, setOverride] = useState<{ calories?: string; protein?: string; water?: string; steps?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const bodyValid = Number(age) >= 13 && Number(age) <= 110 && Number(height) >= 100 && Number(height) <= 250 && Number(weight) >= 30 && Number(weight) <= 300;

  const tg = useMemo(
    () => (bodyValid ? suggestTargets({ age: Number(age), sex, heightCm: Number(height), weightKg: Number(weight), activity, goal }) : null),
    [age, sex, height, weight, activity, goal, bodyValid],
  );

  const finalCalories = Number(override.calories) || tg?.calories || 0;
  const finalProtein = Number(override.protein) || tg?.protein_g || 0;

  const submit = () => {
    if (!tg) return;
    const fat = Math.round(Math.max((finalCalories * 0.25) / 9, Number(weight) * 0.6));
    const carbs = Math.max(0, Math.round((finalCalories - finalProtein * 4 - fat * 9) / 4));
    start(async () => {
      const r = await saveProfileAction({
        name: name.trim(),
        age: Number(age),
        sex,
        height_cm: Number(height),
        weight_kg: Number(weight),
        target_weight_kg: targetWeight ? Number(targetWeight) : null,
        weekly_change_kg: null,
        activity_level: activity,
        goal,
        daily_calorie_target: finalCalories,
        daily_protein_target: finalProtein,
        daily_carbs_target: carbs,
        daily_fat_target: fat,
        daily_water_target_ml: Number(override.water) ? Math.round(Number(override.water) * 1000) : tg.water_ml,
        daily_step_goal: Number(override.steps) || tg.steps,
        daily_exercise_goal_min: existing?.daily_exercise_goal_min ?? 30,
      });
      if (!r.ok) return setError(t(r.error));
      router.push("/dashboard");
      router.refresh();
    });
  };

  const steps = [
    {
      title: t("What's your name?"),
      valid: name.trim().length > 0,
      body: (
        <Field label={t("Name")} htmlFor="ob-name">
          <Input id="ob-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Long" className="h-14 text-xl" />
        </Field>
      ),
    },
    {
      title: t("Tell us about yourself"),
      subtitle: t("Used to estimate your energy needs. Stays private to your account."),
      valid: bodyValid,
      body: (
        <div className="space-y-4">
          <div role="radiogroup" aria-label={t("Sex")} className="grid grid-cols-2 gap-2">
            {(["male", "female"] as Sex[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={sex === s} onClick={() => setSex(s)} className={cn("h-12 rounded-2xl border text-sm font-medium capitalize transition", sex === s ? "border-ink bg-ink text-bg" : "border-line bg-surface")}>
                {t(s === "male" ? "Male" : "Female")}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("Age")} htmlFor="ob-age"><Input id="ob-age" type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" /></Field>
            <Field label={t("Height (cm)")} htmlFor="ob-h"><Input id="ob-h" type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" /></Field>
            <Field label={t("Weight (kg)")} htmlFor="ob-w"><Input id="ob-w" type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="74" /></Field>
          </div>
          <p className="text-xs text-ink-3">{t("The BMR formula (Mifflin–St Jeor) uses biological sex. Choose whichever is closer for metabolic purposes.")}</p>
        </div>
      ),
    },
    {
      title: t("What's your goal?"),
      valid: true,
      body: (
        <div className="space-y-2">
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <button key={g} type="button" onClick={() => setGoal(g)} aria-pressed={goal === g} className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition", goal === g ? "border-ink bg-surface ring-1 ring-ink" : "border-line bg-surface")}>
              <span className="text-xl" aria-hidden>{GOAL_EMOJI[g]}</span>
              <span className="font-medium">{t(GOAL_LABELS[g])}</span>
            </button>
          ))}
          {(goal === "lose_weight" || goal === "gain_weight") && (
            <Field label={t("Target weight (optional, kg)")} htmlFor="ob-tw" className="pt-2">
              <Input id="ob-tw" type="number" inputMode="decimal" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
            </Field>
          )}
        </div>
      ),
    },
    {
      title: t("How active are you?"),
      subtitle: t("On a typical week, not counting today."),
      valid: true,
      body: (
        <div className="space-y-2">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
            <button key={a} type="button" onClick={() => setActivity(a)} aria-pressed={activity === a} className={cn("w-full rounded-2xl border px-4 py-3 text-left transition", activity === a ? "border-ink ring-1 ring-ink" : "border-line")}>
              <p className="font-medium">{t(ACTIVITY_LABELS[a])}</p>
              <p className="text-xs text-ink-3">{t(ACTIVITY_HINTS[a])}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: t("Your starting targets"),
      subtitle: t("Estimates to start from — you can change them any time."),
      valid: !!tg,
      body: tg && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-surface p-5 shadow-card">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">BMR</dt><dd className="num font-medium">{fmt(tg.bmr)} kcal</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">{t("Activity")}</dt><dd>{t(ACTIVITY_LABELS[activity])}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">{t("Estimated TDEE")}</dt><dd className="num font-medium">{fmt(tg.tdee)} kcal</dd></div>
              {tg.adjustment !== 0 && (
                <div className="flex justify-between"><dt className="text-ink-2">{t("Goal adjustment")}</dt><dd className="num font-medium">{tg.adjustment > 0 ? "+" : ""}{fmt(tg.adjustment)} kcal</dd></div>
              )}
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["calories", t("Calories (kcal)"), tg.calories],
              ["protein", t("Protein (g)"), tg.protein_g],
              ["water", t("Water (L)"), tg.water_ml / 1000],
              ["steps", t("Steps"), tg.steps],
            ] as const).map(([key, label, value]) => (
              <label key={key} htmlFor={`ob-${key}`} className="rounded-2xl bg-surface p-4 shadow-card">
                <span className="text-xs text-ink-3">{label}</span>
                <input id={`ob-${key}`} type="number" inputMode="decimal" step="any" value={override[key] ?? String(value)} onChange={(e) => setOverride({ ...override, [key]: e.target.value })} className="num mt-1 block w-full bg-transparent text-2xl font-semibold outline-none" />
              </label>
            ))}
          </div>
          {tg.notes.map((n) => <p key={n} className="rounded-2xl bg-warn-soft px-4 py-3 text-xs text-warn">{t(n)}</p>)}
          <p className="text-xs leading-relaxed text-ink-3">{t("These are population-based estimates, not medical advice. Real needs vary by ±10–15%. Watch your weight trend for 2–3 weeks and adjust.")}</p>
        </div>
      ),
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
      <div className="flex items-center gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="-ml-2 rounded-full p-2 hover:bg-surface-2" aria-label={t("Back")}><ArrowLeft className="h-5 w-5" /></button>
        ) : (
          <Logo />
        )}
        <div className="flex flex-1 gap-1.5" aria-label={t("Step {n} of {total}", { n: step + 1, total: steps.length })}>
          {steps.map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-full transition", i <= step ? "bg-ink" : "bg-line")} />)}
        </div>
      </div>

      <div key={step} className="flex-1 pt-10 animate-fade-up">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{s.title}</h1>
        {s.subtitle && <p className="mt-2 text-sm text-ink-3">{s.subtitle}</p>}
        <div className="mt-8">{s.body}</div>
      </div>

      {error && <p className="mb-3 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">{error}</p>}
      <Button size="lg" className="mt-6 w-full" disabled={!s.valid || saving} onClick={() => (last ? submit() : setStep(step + 1))}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {t(last ? "Start tracking" : "Continue")}
      </Button>
    </main>
  );
}
