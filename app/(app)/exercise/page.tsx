import { requireProfilePage } from "@/lib/data/session";
import { loadDay, loadRange } from "@/lib/data/queries";
import { addDays, dateKey, formatDayShort, formatTime } from "@/lib/utils/dates";
import { fmt } from "@/lib/utils/cn";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { BarsTarget } from "@/components/charts/lazy";
import { ExerciseLogger } from "@/components/log/exercise-logger";
import { DeleteButton } from "@/components/entries/entry-rows";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("Exercise") };
}

export default async function ExercisePage() {
  const { repo, profile, tz } = await requireProfilePage();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [day, range] = await Promise.all([loadDay(repo, profile, tz), loadRange(repo, profile, tz, 56)]);

  // Minutes per week (last 8 weeks, ending today)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const slice = range.series.slice(i * 7, i * 7 + 7);
    return { label: formatDayShort(slice[0].key, lang), value: slice.reduce((s, d) => s + d.exerciseMin, 0) };
  });
  const recent = [...range.bundle.exercise].reverse().filter((e) => dateKey(e.logged_at, tz) !== day.key && dateKey(e.logged_at, tz) >= addDays(day.key, -14)).slice(0, 10);
  const thisWeek = weeks[weeks.length - 1].value;

  return (
    <div className="space-y-4">
      <header className="px-1 pt-2">
        <h1 className="text-[28px] font-semibold tracking-tight">{t("Exercise")}</h1>
        <p className="num text-sm text-ink-3">{t("{m} min · {k} kcal today", { m: day.metrics.exerciseMin, k: fmt(day.metrics.exerciseKcal) })}</p>
      </header>

      <Card className="ai-glow">
        <CardHeader title={`✨ ${t("What did you do?")}`} />
        <ExerciseLogger weightKg={profile.weight_kg} />
      </Card>

      {day.bundle.exercise.length > 0 && (
        <Card>
          <CardHeader title={t("Today")} />
          <ul className="-my-2 divide-y divide-line">
            {day.bundle.exercise.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(e.activity)}</p>
                  <p className="num text-xs text-ink-3">{formatTime(e.logged_at, tz)} · {e.duration_minutes} {t("min")} · {t(e.intensity)}{e.distance_km ? ` · ${e.distance_km} km` : ""} · {t(e.ai_estimated ? "estimated" : "measured")}</p>
                </div>
                <span className="num text-sm font-semibold text-good">−{fmt(e.calories_burned)}</span>
                <DeleteButton kind="exercise" id={e.id} label={t(e.activity)} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title={t("Minutes per week")} action={<span className="num text-xs text-ink-3">{t("{n} / 150 min this week", { n: thisWeek })}</span>} />
        <BarsTarget data={weeks} unit={t("min")} target={150} color="var(--good)" />
        <p className="mt-2 text-xs text-ink-3">{t("Dashed line: WHO guideline of 150 min moderate activity per week.")}</p>
      </Card>

      {recent.length > 0 && (
        <>
          <SectionTitle className="pt-2">{t("Last two weeks")}</SectionTitle>
          <Card>
            <ul className="-my-2 divide-y divide-line">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t(e.activity)}</p>
                    <p className="num text-xs text-ink-3">{formatDayShort(dateKey(e.logged_at, tz), lang)} · {e.duration_minutes} {t("min")}</p>
                  </div>
                  <span className="num text-sm text-ink-2">{fmt(e.calories_burned)} kcal</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
