"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt } from "@/lib/utils/cn";
import { useT } from "@/components/i18n-provider";

export interface Point {
  label: string;
  value: number | null;
}

const axis = { fontSize: 11, fill: "var(--ink-3)" };
const compact = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 10) / 10));

function TooltipBox({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length || payload[0].value === null || payload[0].value === undefined) return null;
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-xs text-bg shadow-lg">
      <p className="opacity-70">{label}</p>
      <p className="num text-sm font-semibold">
        {fmt(payload[0].value, 1)} {unit}
      </p>
    </div>
  );
}

export function LineTrend({ data, unit, color = "var(--ink)", height = 200, goal }: { data: Point[]; unit: string; color?: string; height?: number; goal?: number | null }) {
  const t = useT();
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  if (vals.length < 2) return <p className="grid place-items-center text-sm text-ink-3" style={{ height }}>{t("Log at least two entries to see a trend.")}</p>;
  const all = goal ? [...vals, goal] : vals;
  const min = Math.floor(Math.min(...all) - 0.5);
  const max = Math.ceil(Math.max(...all) + 0.5);
  return (
    <div style={{ height }} role="img" aria-label={t("Trend chart, latest {v} {unit}", { v: fmt(vals[vals.length - 1], 1), unit })}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[min, max]} tick={axis} tickLine={false} axisLine={false} width={40} tickFormatter={compact} />
          {goal ? <ReferenceLine y={goal} stroke="var(--good)" strokeDasharray="4 4" label={{ value: t("Goal"), position: "insideTopRight", fontSize: 10, fill: "var(--good)" }} /> : null}
          <Tooltip content={<TooltipBox unit={unit} />} cursor={{ stroke: "var(--line)" }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} connectNulls activeDot={{ r: 4 }} animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsTarget({ data, unit, target, color = "var(--ink)", height = 180, overIsBad = false }: { data: Point[]; unit: string; target?: number; color?: string; height?: number; overIsBad?: boolean }) {
  const t = useT();
  if (!data.some((d) => (d.value ?? 0) > 0)) return <p className="grid place-items-center text-sm text-ink-3" style={{ height }}>{t("No data for this period yet.")}</p>;
  return (
    <div style={{ height }} role="img" aria-label={target ? t("Bar chart in {unit}, target {n}", { unit, n: fmt(target) }) : t("Bar chart in {unit}", { unit })}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={40} tickFormatter={compact} />
          <Tooltip content={<TooltipBox unit={unit} />} cursor={{ fill: "var(--surface-2)" }} />
          {target ? <ReferenceLine y={target} stroke="var(--ink-3)" strokeDasharray="4 4" /> : null}
          <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={28} animationDuration={600}>
            {data.map((d, i) => (
              <Cell key={i} fill={overIsBad && target && (d.value ?? 0) > target * 1.1 ? "var(--warn)" : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
