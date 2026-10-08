"use client";

import { useOptimistic, useTransition } from "react";
import { Droplet } from "lucide-react";
import { addWaterAction } from "@/app/actions";
import { ProgressBar } from "@/components/ui/progress";
import { useToast } from "@/components/log/toast";
import { useOpenLog } from "@/components/log/log-provider";
import { useT } from "@/components/i18n-provider";

export function WaterCard({ ml, target }: { ml: number; target: number }) {
  const toast = useToast();
  const t = useT();
  const openLog = useOpenLog();
  const [optimistic, add] = useOptimistic(ml, (cur, delta: number) => cur + delta);
  const [, start] = useTransition();

  const log = (amount: number) =>
    start(async () => {
      add(amount);
      const r = await addWaterAction(amount);
      if (!r.ok) toast(t(r.error), "bad");
    });

  const done = optimistic >= target;
  return (
    <div className="rounded-3xl bg-surface p-5 shadow-card animate-fade-up">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[15px] font-semibold"><Droplet className="h-4 w-4 text-water" /> {t("Water")}</p>
        <p className="num text-sm">
          <span className="text-lg font-semibold">{(optimistic / 1000).toFixed(1)}</span>
          <span className="text-ink-3"> / {(target / 1000).toFixed(1)} L</span>
        </p>
      </div>
      <ProgressBar className="mt-3" value={optimistic} max={target} color={done ? "var(--good)" : "var(--water)"} label={t("Water progress")} />
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[250, 500, 750].map((a) => (
          <button key={a} type="button" onClick={() => log(a)} className="num h-10 rounded-full bg-surface-2 text-sm font-medium transition active:scale-95 hover:bg-line">
            +{a}
          </button>
        ))}
        <button type="button" onClick={() => openLog("water")} className="h-10 rounded-full border border-line text-sm font-medium text-ink-2 hover:bg-surface-2">
          {t("Custom")}
        </button>
      </div>
    </div>
  );
}
