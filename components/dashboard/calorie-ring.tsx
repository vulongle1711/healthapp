"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/utils/cn";
import type { TargetStatus } from "@/lib/calculations/calories";
import { useT } from "@/components/i18n-provider";

const STATUS_COLOR: Record<TargetStatus, string> = {
  under: "var(--good)",
  on_track: "var(--good)",
  near: "var(--warn)",
  over: "var(--bad)",
};

function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** 270° arc gauge for calories consumed vs target. */
export function CalorieRing({ consumed, target, status }: { consumed: number; target: number; status: TargetStatus }) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shown = useCountUp(consumed);
  const remaining = target - consumed;

  const size = 220;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const color = STATUS_COLOR[status];

  return (
    <div className="relative mx-auto" style={{ width: size, height: size * 0.86 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[135deg]" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          strokeDashoffset={mounted ? arc * (1 - pct) : arc}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1), stroke 300ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-4 text-center" role="img" aria-label={t(remaining >= 0 ? "{eaten} of {target} calories eaten, {left} remaining" : "{eaten} of {target} calories eaten, {left} over", { eaten: fmt(consumed), target: fmt(target), left: fmt(Math.abs(remaining)) })}>
        <span className="num text-[40px] font-semibold leading-none tracking-tight">{fmt(shown)}</span>
        <span className="mt-1 text-sm text-ink-3">{t("of {n} kcal", { n: fmt(target) })}</span>
        <span className="mt-3 rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: `color-mix(in oklab, ${color} 12%, transparent)`, color }}>
          {remaining >= 0 ? t("{n} kcal left", { n: fmt(remaining) }) : t("{n} kcal over", { n: fmt(-remaining) })}
        </span>
      </div>
    </div>
  );
}
