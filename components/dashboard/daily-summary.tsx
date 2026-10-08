"use client";

import { useEffect, useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import type { ScoreComponent } from "@/lib/calculations/summary";
import { Badge } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/components/i18n-provider";

interface DailyResponse {
  headline: string;
  summary: string;
  improvement: string;
  source: "ai" | "offline";
  score: { score: number; components: ScoreComponent[] } | null;
}

export function DailySummary({ refreshKey }: { refreshKey: string }) {
  const t = useT();
  const [data, setData] = useState<DailyResponse | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetch("/api/ai/insights?kind=daily")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) return <div className="rounded-3xl bg-surface p-5 text-sm text-ink-3 shadow-card">{t("The AI coach is unavailable right now.")}</div>;
  if (!data)
    return (
      <div className="rounded-3xl bg-surface p-5 shadow-card" aria-busy>
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton mt-3 h-12 rounded-xl" />
      </div>
    );

  const s = data.score;
  return (
    <div className="rounded-3xl p-5 shadow-card ai-glow animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-ai">
            <Sparkles className="h-3.5 w-3.5" /> {t("AI coach")}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight">{data.headline}</p>
        </div>
        {s && (
          <button type="button" onClick={() => setOpen(!open)} className="text-right" aria-expanded={open} aria-label={t("How the day score works")}>
            <span className="num text-3xl font-semibold">{s.score.toFixed(1)}</span>
            <span className="text-sm text-ink-3">/10</span>
            <span className="flex items-center justify-end gap-0.5 text-[11px] text-ink-3">
              {t("Score so far")} <ChevronDown className={cn("h-3 w-3 transition", open && "rotate-180")} />
            </span>
          </button>
        )}
      </div>
      {open && s && (
        <ul className="mt-3 space-y-1.5 rounded-2xl bg-surface-2 p-3 text-xs">
          {s.components.map((c) => (
            <li key={c.label} className="flex justify-between gap-2">
              <span className="text-ink-2">{t(c.label)} <span className="text-ink-3">— {t(c.detail, c.vars)}</span></span>
              <span className="num font-medium">{c.points}/{c.max}</span>
            </li>
          ))}
          <li className="pt-1 text-[11px] text-ink-3">{t("A simple score for hitting your own targets — not a medical or scientific measure.")}</li>
        </ul>
      )}
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{data.summary}</p>
      <div className="mt-3 rounded-2xl bg-surface/70 px-4 py-3 text-sm">
        <span className="font-medium">{t("One improvement:")} </span>
        <span className="text-ink-2">{data.improvement}</span>
      </div>
      {data.source === "offline" && <Badge className="mt-3">{t("Offline coach")}</Badge>}
    </div>
  );
}
