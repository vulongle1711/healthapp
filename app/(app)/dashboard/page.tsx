import Link from "next/link";
import { ChevronRight, Flame, Footprints, Moon, Activity } from "lucide-react";
import { requireProfilePage } from "@/lib/data/session";
import { loadDay } from "@/lib/data/queries";
import { calorieStatus } from "@/lib/calculations/calories";
import { buildTimeline } from "@/lib/calculations/timeline";
import { formatDayLong, greeting } from "@/lib/utils/dates";
import { fmt } from "@/lib/utils/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { CalorieRing } from "@/components/dashboard/calorie-ring";
import { WaterCard } from "@/components/dashboard/water-card";
import { Timeline } from "@/components/dashboard/timeline";
import { DailySummary } from "@/components/dashboard/daily-summary";
import { FoodLogger } from "@/components/log/food-logger";
import { OpenLogButton } from "@/components/log/log-provider";
import { DayLogger } from "@/components/log/day-logger";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("Today") };
}

export default async function DashboardPage() {
  const { repo, profile, tz } = await requireProfilePage();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [day, userFoods] = await Promise.all([loadDay(repo, profile, tz), repo.listUserFoods().catch(() => [])]);
  const { metrics: m, balance } = day;
  const status = calorieStatus(m.nutrition.calories, profile.daily_calorie_target);
  const timeline = buildTimeline(day.bundle, t);
  const empty = !m.logged && !m.exerciseMin && !m.waterMl;
  const refreshKey = `${m.foodCount}-${m.nutrition.calories}-${m.exerciseKcal}-${m.waterMl}`;

  const macros = [
    { label: t("Protein"), protein: true, value: m.nutrition.protein_g, target: profile.daily_protein_target, color: "var(--protein)" },
    { label: t("Carbs"), protein: false, value: m.nutrition.carbs_g, target: profile.daily_carbs_target, color: "var(--carbs)" },
    { label: t("Fat"), protein: false, value: m.nutrition.fat_g, target: profile.daily_fat_target, color: "var(--fat)" },
  ];

  return (
    <div className="space-y-4">
      <header className="px-1 pb-2 pt-2 animate-fade-up">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">
          {greeting(new Date(), tz, lang)}, {profile.name} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-3">{formatDayLong(day.key, lang)}</p>
      </header>

      {empty && (
        <Card className="ai-glow">
          <p className="text-lg font-semibold">{t("Let's get started 👋")}</p>
          <p className="mt-1 text-sm text-ink-2">{t("You haven't logged anything today. Tell me about your day — or just one meal.")}</p>
          <div className="mt-4">
            <DayLogger compact />
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">{t("Today's progress")}</h2>
          <span className="text-xs text-ink-3">{t("Calories")}</span>
        </div>
        <CalorieRing consumed={m.nutrition.calories} target={profile.daily_calorie_target} status={status} />
        <div className="-mt-2 grid grid-cols-3 divide-x divide-line rounded-2xl bg-surface-2 py-3 text-center">
          <div>
            <p className="text-[11px] text-ink-3">{t("Food")}</p>
            <p className="num font-semibold">{fmt(balance.consumed)}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-3">{t("Exercise")}</p>
            <p className="num font-semibold text-good">{balance.exercise ? `−${fmt(balance.exercise)}` : "0"}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-3">{t("Net")}</p>
            <p className="num font-semibold">{fmt(balance.net)}</p>
          </div>
        </div>
        <details className="group mt-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-1 py-1 text-ink-3 hover:text-ink">
            {t("How this is calculated")}
            <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
          </summary>
          <dl className="mt-2 space-y-1.5 rounded-2xl border border-line p-4 text-[13px]">
            {[
              [t("BMR (Mifflin–St Jeor)"), `${fmt(day.bmr)} kcal`],
              [t("Estimated TDEE (BMR × activity)"), `${fmt(day.tdee)} kcal`],
              [t("Your daily target"), `${fmt(profile.daily_calorie_target)} kcal`],
              [t("Food & drinks today"), `${fmt(balance.consumed)} kcal`],
              [t("Logged exercise (active)"), `${fmt(balance.exercise)} kcal`],
              [t("Net (food − exercise)"), `${fmt(balance.net)} kcal`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-2">{k}</dt>
                <dd className="num font-medium">{v}</dd>
              </div>
            ))}
            <p className="pt-2 text-xs leading-relaxed text-ink-3">
              {t("Remaining = target − food. Exercise is shown separately and isn't automatically “earned back”, because your activity level already includes typical exercise and burn estimates run high. All numbers are estimates.")}
            </p>
          </dl>
        </details>
      </Card>

      <Card>
        <CardHeader title={t("Macros")} action={<Link href="/nutrition" className="text-xs text-ink-3 hover:text-ink">{t("Details")}</Link>} />
        <div className="space-y-3.5">
          {macros.map((x) => (
            <div key={x.label}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: x.color }} aria-hidden />
                  {x.label}
                </span>
                <span className="num">
                  <span className="font-semibold">{fmt(x.value)}</span>
                  <span className="text-ink-3"> / {fmt(x.target)} g</span>
                </span>
              </div>
              <ProgressBar value={x.value} max={x.target} color={x.value > x.target * 1.15 && !x.protein ? "var(--warn)" : x.color} label={t("{label} progress", { label: x.label })} />
            </div>
          ))}
        </div>
      </Card>

      <WaterCard ml={m.waterMl} target={profile.daily_water_target_ml} />

      <div className="grid grid-cols-3 gap-3">
        <OpenLogButton kind="exercise" className="rounded-3xl bg-surface p-4 text-left shadow-card transition active:scale-[0.98] animate-fade-up">
          <Activity className="h-4 w-4 text-good" />
          <p className="num mt-2 text-xl font-semibold">{m.exerciseMin}<span className="text-xs font-normal text-ink-3"> {t("min")}</span></p>
          <p className="text-[11px] text-ink-3">{m.exerciseKcal ? `${fmt(m.exerciseKcal)} kcal` : t("Exercise")}</p>
        </OpenLogButton>
        <OpenLogButton kind="steps" className="rounded-3xl bg-surface p-4 text-left shadow-card transition active:scale-[0.98] animate-fade-up">
          <Footprints className="h-4 w-4 text-info" />
          <p className="num mt-2 text-xl font-semibold">{m.steps !== null ? fmt(m.steps) : "—"}</p>
          <p className="num text-[11px] text-ink-3">/ {fmt(profile.daily_step_goal)} {t("steps")}</p>
        </OpenLogButton>
        <OpenLogButton kind="sleep" className="rounded-3xl bg-surface p-4 text-left shadow-card transition active:scale-[0.98] animate-fade-up">
          <Moon className="h-4 w-4 text-ai" />
          <p className="num mt-2 text-xl font-semibold">{m.sleepMin !== null ? `${Math.floor(m.sleepMin / 60)}h${m.sleepMin % 60 ? ` ${m.sleepMin % 60}m` : ""}` : "—"}</p>
          <p className="text-[11px] text-ink-3">{t("Sleep")}</p>
        </OpenLogButton>
      </div>

      {!empty && <FoodLogger variant="inline" userFoods={userFoods} />}

      <Card>
        <CardHeader title={t("Timeline")} icon={<Flame className="h-4 w-4 text-warn" />} action={<Link href="/log" className="text-xs text-ink-3 hover:text-ink">{t("Edit entries")}</Link>} />
        <Timeline entries={timeline} tz={tz} />
      </Card>

      <DailySummary refreshKey={refreshKey} />
    </div>
  );
}
