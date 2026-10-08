"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { PeriodStats } from "@/lib/calculations/summary";
import { Badge } from "@/components/ui/progress";
import { fmt } from "@/lib/utils/cn";
import { useT } from "@/components/i18n-provider";

interface Weekly {
  headline: string;
  went_well: string[];
  to_improve: string[];
  focus: string[];
  source: "ai" | "offline";
  stats: PeriodStats;
}

export function WeeklyReport() {
  const t = useT();
  const [data, setData] = useState<Weekly | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/ai/insights?kind=weekly")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return <div className="rounded-3xl bg-surface p-5 text-sm text-ink-3 shadow-card">{t("We couldn't generate your weekly report right now.")}</div>;
  if (!data)
    return (
      <div className="space-y-3 rounded-3xl bg-surface p-5 shadow-card" aria-busy>
        <div className="skeleton h-5 w-40 rounded" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    );

  const s = data.stats;
  const tiles = [
    [t("Avg calories"), `${fmt(s.avgCalories)} kcal`],
    [t("Avg protein"), `${fmt(s.avgProtein)} g`],
    [t("Exercise"), `${fmt(s.exerciseMin)} ${t("min")}`],
    [t("Avg weight"), s.avgWeight !== null ? `${fmt(s.avgWeight, 1)} kg` : "—"],
    [t("Weight change"), s.weightChange !== null ? `${s.weightChange > 0 ? "+" : ""}${fmt(s.weightChange, 1)} kg` : "—"],
    [t("Avg water"), `${(s.avgWaterMl / 1000).toFixed(1)} L`],
    [t("Days logged"), `${s.daysLogged} / ${s.days}`],
    [t("Avg sleep"), s.avgSleepMin !== null ? `${Math.floor(s.avgSleepMin / 60)}h ${s.avgSleepMin % 60}m` : "—"],
  ];

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="rounded-3xl bg-surface p-5 shadow-card">
        <p className="text-[15px] font-semibold">{t("Your week")} <span className="text-xs font-normal text-ink-3">· {t("last 7 full days")}</span></p>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm min-[480px]:grid-cols-2">
          {tiles.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-line pb-2">
              <dt className="text-ink-3">{k}</dt>
              <dd className="num font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-3xl p-5 shadow-card ai-glow">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-ai"><Sparkles className="h-3.5 w-3.5" /> {t("Weekly report")}</p>
        <p className="mt-1.5 text-lg font-semibold tracking-tight">{data.headline}</p>

        {data.went_well.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold">{t("What went well")}</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
              {data.went_well.map((x) => <li key={x} className="flex gap-2"><span className="text-good">✓</span>{x}</li>)}
            </ul>
          </section>
        )}
        {data.to_improve.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold">{t("What to improve")}</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
              {data.to_improve.map((x) => <li key={x} className="flex gap-2"><span className="text-warn">→</span>{x}</li>)}
            </ul>
          </section>
        )}
        <section className="mt-4 rounded-2xl bg-surface/70 p-4">
          <h3 className="text-sm font-semibold">{t("Focus for next week")}</h3>
          <ol className="mt-2 space-y-1.5 text-sm text-ink-2">
            {data.focus.map((x, i) => <li key={x} className="flex gap-2"><span className="num font-semibold text-ink">{i + 1}.</span>{x}</li>)}
          </ol>
        </section>
        {data.source === "offline" && <Badge className="mt-3">{t("Offline coach")}</Badge>}
      </div>
    </div>
  );
}
