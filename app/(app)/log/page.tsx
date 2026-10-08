import { requireProfilePage } from "@/lib/data/session";
import { loadDay } from "@/lib/data/queries";
import { formatDayLong, formatTime } from "@/lib/utils/dates";
import { fmt } from "@/lib/utils/cn";
import { MEAL_LABELS } from "@/types/nutrition";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { DayLogger } from "@/components/log/day-logger";
import { DeleteButton, FoodRow } from "@/components/entries/entry-rows";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("Log") };
}

export default async function LogPage() {
  const { repo, profile, tz } = await requireProfilePage();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const day = await loadDay(repo, profile, tz);
  const b = day.bundle;
  const nothing = !b.food.length && !b.exercise.length && !b.water.length && !b.weight.length && !b.sleep.length && !b.notes.length && !b.steps.length;

  return (
    <div className="space-y-4">
      <header className="px-1 pt-2">
        <h1 className="text-[28px] font-semibold tracking-tight">{t("Log")}</h1>
        <p className="text-sm text-ink-3">{formatDayLong(day.key, lang)}</p>
      </header>

      <Card className="ai-glow">
        <CardHeader title={`✨ ${t("How was your day?")}`} />
        <DayLogger />
      </Card>

      <SectionTitle className="pt-2">{t("Today's entries")}</SectionTitle>
      {nothing && <Card><p className="py-4 text-center text-sm text-ink-3">{t("No entries yet today.")}</p></Card>}

      {day.meals.map((m) => (
        <Card key={m.meal_type}>
          <CardHeader title={t(MEAL_LABELS[m.meal_type])} action={<span className="num text-sm font-semibold">{fmt(m.totals.calories)} kcal</span>} />
          <ul className="-my-2 divide-y divide-line">{m.items.map((i) => <FoodRow key={i.id} item={i} />)}</ul>
        </Card>
      ))}

      {b.exercise.length > 0 && (
        <Card>
          <CardHeader title={t("Exercise")} />
          <ul className="-my-2 divide-y divide-line">
            {b.exercise.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(e.activity)}</p>
                  <p className="num text-xs text-ink-3">{formatTime(e.logged_at, tz)} · {e.duration_minutes} {t("min")} · {t(e.intensity)}{e.notes ? ` · ${t(e.notes)}` : ""}</p>
                </div>
                <span className="num text-sm font-semibold text-good">−{fmt(e.calories_burned)}</span>
                <DeleteButton kind="exercise" id={e.id} label={t(e.activity)} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(b.water.length > 0 || b.weight.length > 0 || b.sleep.length > 0 || b.steps.length > 0) && (
        <Card>
          <CardHeader title={t("Body & hydration")} />
          <ul className="-my-2 divide-y divide-line text-sm">
            {b.water.map((w) => (
              <li key={w.id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1">💧 {t("Water")} <span className="num text-xs text-ink-3">· {formatTime(w.logged_at, tz)}</span></span>
                <span className="num font-medium">{w.amount_ml} ml</span>
                <DeleteButton kind="water" id={w.id} label={t("{n} ml water", { n: w.amount_ml })} />
              </li>
            ))}
            {b.weight.map((w) => (
              <li key={w.id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1">⚖️ {t("Weight")}{w.body_fat_percentage ? <span className="text-xs text-ink-3"> · {t("{n}% fat", { n: w.body_fat_percentage })}</span> : null}</span>
                <span className="num font-medium">{w.weight_kg} kg</span>
                <DeleteButton kind="weight" id={w.id} label={t("weight")} />
              </li>
            ))}
            {b.sleep.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1">😴 {t("Sleep")}{s.quality ? <span className="text-xs text-ink-3"> · {"★".repeat(s.quality)}</span> : null}</span>
                <span className="num font-medium">{Math.floor(s.duration_minutes / 60)}h {s.duration_minutes % 60}m</span>
                <DeleteButton kind="sleep" id={s.id} label={t("sleep")} />
              </li>
            ))}
            {b.steps.slice(-1).map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-1.5 pr-10">
                <span className="flex-1">👟 {t("Steps")}</span>
                <span className="num font-medium">{fmt(s.steps)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {b.notes.length > 0 && (
        <Card>
          <CardHeader title={t("Notes")} />
          <ul className="space-y-2">
            {b.notes.map((n) => (
              <li key={n.id} className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
                <p className="flex-1 whitespace-pre-wrap">{n.content}</p>
                <DeleteButton kind="note" id={n.id} label={t("note")} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
