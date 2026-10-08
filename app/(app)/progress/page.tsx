import Link from "next/link";
import { requireProfilePage } from "@/lib/data/session";
import { loadRange } from "@/lib/data/queries";
import type { DayMetrics } from "@/lib/calculations/summary";
import { formatDayShort, weekdayShort } from "@/lib/utils/dates";
import { cn, fmt } from "@/lib/utils/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { BarsTarget, LineTrend } from "@/components/charts/lazy";
import { OpenLogButton } from "@/components/log/log-provider";
import { getLang, getT } from "@/lib/i18n/server";
import { msg, type Lang } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: (await getT())("Progress") };
}

const RANGES = [
  { days: 7, label: msg("7 days") },
  { days: 30, label: msg("30 days") },
  { days: 90, label: msg("90 days") },
  { days: 365, label: msg("1 year") },
];

type Pick = (d: DayMetrics) => number | null;

/** Daily points for short ranges; weekly averages for long ones so bars stay readable. */
function bucket(series: DayMetrics[], pick: Pick, days: number, lang: Lang) {
  if (days <= 31) return series.map((d) => ({ label: days <= 7 ? weekdayShort(d.key, lang) : formatDayShort(d.key, lang), value: pick(d) }));
  const out: { label: string; value: number | null }[] = [];
  for (let i = 0; i < series.length; i += 7) {
    const slice = series.slice(i, i + 7);
    const vals = slice.map(pick).filter((v): v is number => v !== null && v > 0);
    out.push({ label: formatDayShort(slice[0].key, lang), value: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null });
  }
  return out;
}

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { repo, profile, tz } = await requireProfilePage();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r.days) === sp.range)?.days ?? 30;
  const [range, first] = await Promise.all([loadRange(repo, profile, tz, days), repo.firstWeight().catch(() => null)]);
  const { series, stats } = range;

  const weightPts = series.map((d) => ({ label: days <= 7 ? weekdayShort(d.key, lang) : formatDayShort(d.key, lang), value: d.weightKg }));
  const current = [...series].reverse().find((d) => d.weightKg !== null)?.weightKg ?? profile.weight_kg;
  const starting = first?.weight_kg ?? profile.weight_kg;
  const change = Math.round((current - starting) * 10) / 10;
  const goodChange = profile.goal === "lose_weight" ? change < 0 : profile.goal === "gain_weight" || profile.goal === "build_muscle" ? change > 0 : Math.abs(change) < 1;

  const consistency = [
    { label: t("Calories within ±10%"), value: stats.caloriesMet, max: stats.daysLogged || stats.days },
    { label: t("Protein target met"), value: stats.proteinMet, max: stats.daysLogged || stats.days },
    { label: t("Exercise ≥ {n} min", { n: profile.daily_exercise_goal_min }), value: stats.exerciseMet, max: stats.days },
    { label: t("Water goal met"), value: stats.waterMet, max: stats.days },
    { label: t("Days logged"), value: stats.daysLogged, max: stats.days },
  ];

  const exerciseWeekly = (() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 0; i < series.length; i += 7) {
      const slice = series.slice(i, i + 7);
      out.push({ label: formatDayShort(slice[0].key, lang), value: slice.reduce((s, d) => s + d.exerciseMin, 0) });
    }
    return out;
  })();

  return (
    <div className="space-y-4">
      <header className="px-1 pt-2">
        <h1 className="text-[28px] font-semibold tracking-tight">{t("Progress")}</h1>
      </header>

      <nav aria-label={t("Range")} className="flex gap-1 rounded-full bg-surface-2 p-1">
        {RANGES.map((r) => (
          <Link key={r.days} href={`/progress?range=${r.days}`} aria-current={r.days === days ? "page" : undefined} className={cn("flex-1 rounded-full py-1.5 text-center text-[13px] font-medium transition", r.days === days ? "bg-surface text-ink shadow-sm" : "text-ink-3")}>
            {t(r.label)}
          </Link>
        ))}
      </nav>

      <Card>
        <CardHeader title={t("Weight")} action={<OpenLogButton kind="weight" className="text-xs text-ink-3 hover:text-ink">+ {t("Log weight")}</OpenLogButton>} />
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-surface-2 py-3"><p className="text-[11px] text-ink-3">{t("Current")}</p><p className="num text-lg font-semibold">{fmt(current, 1)} kg</p></div>
          <div className="rounded-2xl bg-surface-2 py-3"><p className="text-[11px] text-ink-3">{t("Starting")}</p><p className="num text-lg font-semibold">{fmt(starting, 1)} kg</p></div>
          <div className="rounded-2xl bg-surface-2 py-3"><p className="text-[11px] text-ink-3">{t("Change")}</p><p className={cn("num text-lg font-semibold", change !== 0 && (goodChange ? "text-good" : "text-warn"))}>{change > 0 ? "+" : ""}{fmt(change, 1)} kg</p></div>
        </div>
        <LineTrend data={weightPts} unit="kg" goal={profile.target_weight_kg} color="var(--ink)" />
        <p className="mt-2 text-xs text-ink-3">{t("Daily weight swings of ±1 kg are normal (water, salt, timing). Watch the trend, not single days.")}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {[
          [t("Avg calories"), `${fmt(stats.avgCalories)}`, t("kcal/day")],
          [t("Avg protein"), `${fmt(stats.avgProtein)}`, t("g/day")],
          [t("Avg water"), `${(stats.avgWaterMl / 1000).toFixed(1)}`, t("L/day")],
          [t("Avg steps"), stats.avgSteps !== null ? fmt(stats.avgSteps) : "—", t("per day")],
          [t("Exercise"), `${fmt(stats.exerciseMin)}`, t("min · {n} sessions", { n: stats.exerciseSessions })],
          [t("Avg sleep"), stats.avgSleepMin !== null ? `${Math.floor(stats.avgSleepMin / 60)}h ${stats.avgSleepMin % 60}m` : "—", t("{n} nights logged", { n: stats.sleepLoggedDays })],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-3xl bg-surface p-4 shadow-card animate-fade-up">
            <p className="text-xs text-ink-3">{label}</p>
            <p className="num mt-1 text-2xl font-semibold">{value}</p>
            <p className="text-[11px] text-ink-3">{sub}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title={t("Consistency")} action={<span className="text-xs text-ink-3">🔥 {t("{n}-day streak", { n: stats.streak })}</span>} />
        <ul className="space-y-3">
          {consistency.map((c) => (
            <li key={c.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-ink-2">{c.label}</span>
                <span className="num font-medium">{c.value} / {c.max}</span>
              </div>
              <ProgressBar value={c.value} max={c.max} color={c.max && c.value / c.max >= 0.7 ? "var(--good)" : "var(--warn)"} label={c.label} />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title={t(days > 31 ? "Calories · weekly average" : "Calories")} />
        <BarsTarget data={bucket(series, (d) => (d.logged ? d.nutrition.calories : null), days, lang)} unit="kcal" target={profile.daily_calorie_target} overIsBad />
      </Card>
      <Card>
        <CardHeader title={t(days > 31 ? "Protein · weekly average" : "Protein")} />
        <BarsTarget data={bucket(series, (d) => (d.logged ? d.nutrition.protein_g : null), days, lang)} unit="g" target={profile.daily_protein_target} color="var(--protein)" />
      </Card>
      <Card>
        <CardHeader title={t("Exercise minutes per week")} />
        <BarsTarget data={exerciseWeekly} unit={t("min")} target={150} color="var(--good)" />
      </Card>
      <Card>
        <CardHeader title={t(days > 31 ? "Water · weekly average" : "Water")} />
        <BarsTarget data={bucket(series, (d) => (d.waterMl ? d.waterMl / 1000 : null), days, lang)} unit="L" target={profile.daily_water_target_ml / 1000} color="var(--water)" />
      </Card>
      <Card>
        <CardHeader title={t(days > 31 ? "Steps · weekly average" : "Steps")} />
        <BarsTarget data={bucket(series, (d) => d.steps, days, lang)} unit={t("steps")} target={profile.daily_step_goal} color="var(--info)" />
      </Card>
    </div>
  );
}
