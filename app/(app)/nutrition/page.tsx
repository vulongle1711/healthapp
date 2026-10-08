import { requireProfilePage } from "@/lib/data/session";
import { loadDay, loadRange } from "@/lib/data/queries";
import { formatDayShort, weekdayShort } from "@/lib/utils/dates";
import { fmt } from "@/lib/utils/cn";
import { MEAL_LABELS } from "@/types/nutrition";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { BarsTarget } from "@/components/charts/lazy";
import { DeleteButton, FoodRow } from "@/components/entries/entry-rows";
import { OpenLogButton } from "@/components/log/log-provider";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("Nutrition") };
}

export default async function NutritionPage() {
  const { repo, profile, tz } = await requireProfilePage();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [day, week, userFoods] = await Promise.all([loadDay(repo, profile, tz), loadRange(repo, profile, tz, 7), repo.listUserFoods().catch(() => [])]);
  const n = day.metrics.nutrition;
  const kcalFromMacros = n.protein_g * 4 + n.carbs_g * 4 + n.fat_g * 9 || 1;
  const split = [
    { label: t("Protein"), g: n.protein_g, pct: Math.round(((n.protein_g * 4) / kcalFromMacros) * 100), color: "var(--protein)" },
    { label: t("Carbs"), g: n.carbs_g, pct: Math.round(((n.carbs_g * 4) / kcalFromMacros) * 100), color: "var(--carbs)" },
    { label: t("Fat"), g: n.fat_g, pct: Math.round(((n.fat_g * 9) / kcalFromMacros) * 100), color: "var(--fat)" },
  ];
  const calSeries = week.series.map((d) => ({ label: weekdayShort(d.key, lang), value: d.logged ? d.nutrition.calories : null }));
  const proSeries = week.series.map((d) => ({ label: weekdayShort(d.key, lang), value: d.logged ? d.nutrition.protein_g : null }));

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between px-1 pt-2">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{t("Nutrition")}</h1>
          <p className="num text-sm text-ink-3">{t("{a} / {b} kcal today", { a: fmt(n.calories), b: fmt(profile.daily_calorie_target) })}</p>
        </div>
        <OpenLogButton kind="food" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg">+ {t("Food")}</OpenLogButton>
      </header>

      <Card>
        <CardHeader title={t("Macro split today")} />
        {day.metrics.logged ? (
          <>
            <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={split.map((s) => `${s.label} ${s.pct}%`).join(", ")}>
              {split.map((s) => <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }} />)}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {split.map((s) => (
                <div key={s.label} className="rounded-2xl bg-surface-2 py-3">
                  <p className="text-[11px] text-ink-3">{s.label}</p>
                  <p className="num text-lg font-semibold">{fmt(s.g)}g</p>
                  <p className="num text-[11px] text-ink-3">{t("{n}% of kcal", { n: s.pct })}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-4 text-center text-sm text-ink-3">{t("Log a meal to see your macro split.")}</p>
        )}
      </Card>

      <SectionTitle className="pt-2">{t("Today's meals")}</SectionTitle>
      {day.meals.length === 0 && (
        <Card>
          <p className="py-2 text-center text-sm text-ink-3">{t("No meals yet.")}</p>
          <OpenLogButton kind="food" className="mx-auto mt-2 block rounded-full bg-ai px-5 py-2.5 text-sm font-medium text-white">✨ {t("Log your first meal")}</OpenLogButton>
        </Card>
      )}
      {day.meals.map((m) => (
        <Card key={m.meal_type}>
          <CardHeader title={t(MEAL_LABELS[m.meal_type])} action={<span className="num text-sm font-semibold">{fmt(m.totals.calories)} kcal</span>} />
          <ul className="-my-2 divide-y divide-line">{m.items.map((i) => <FoodRow key={i.id} item={i} />)}</ul>
          <p className="num mt-3 text-xs text-ink-3">{t("P")} {fmt(m.totals.protein_g)} g · {t("C")} {fmt(m.totals.carbs_g)} g · {t("F")} {fmt(m.totals.fat_g)} g</p>
        </Card>
      ))}

      <Card>
        <CardHeader title={t("Calories · last 7 days")} action={<span className="num text-xs text-ink-3">{t("avg {n} kcal", { n: fmt(week.stats.avgCalories) })}</span>} />
        <BarsTarget data={calSeries} unit="kcal" target={profile.daily_calorie_target} color="var(--ink)" overIsBad />
      </Card>
      <Card>
        <CardHeader title={t("Protein · last 7 days")} action={<span className="num text-xs text-ink-3">{t("avg {n} g", { n: fmt(week.stats.avgProtein) })}</span>} />
        <BarsTarget data={proSeries} unit="g" target={profile.daily_protein_target} color="var(--protein)" />
      </Card>

      <Card>
        <CardHeader title={`⭐ ${t("My Foods")}`} />
        {userFoods.length === 0 ? (
          <p className="text-sm text-ink-3">{t("When you correct an AI estimate (e.g. your cà phê sữa đá is 150 kcal, not 180), it's saved here and used automatically next time.")}</p>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {userFoods.map((u) => (
              <li key={u.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="num text-xs text-ink-3">{t("per {unit}", { unit: t(u.unit) })} · {t("P")} {fmt(u.protein_g)} · {t("C")} {fmt(u.carbs_g)} · {t("F")} {fmt(u.fat_g)} · {t("used {n}×", { n: u.times_logged })} · {formatDayShort(u.updated_at.slice(0, 10), lang)}</p>
                </div>
                <span className="num text-sm font-semibold">{fmt(u.calories)}</span>
                <DeleteButton kind="userFood" id={u.id} label={u.name} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
