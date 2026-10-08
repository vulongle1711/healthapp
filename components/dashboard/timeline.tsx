import type { TimelineEntry } from "@/lib/calculations/timeline";
import { formatTime } from "@/lib/utils/dates";
import { cn, fmt } from "@/lib/utils/cn";
import { getT } from "@/lib/i18n/server";

export async function Timeline({ entries, tz }: { entries: TimelineEntry[]; tz: string }) {
  const t = await getT();
  if (!entries.length) return <p className="py-6 text-center text-sm text-ink-3">{t("Nothing logged yet today.")}</p>;
  return (
    <ol className="relative">
      {entries.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < entries.length - 1 && <span className="absolute left-[54px] top-9 bottom-0 w-px bg-line" aria-hidden />}
          <time className="num w-11 shrink-0 pt-2 text-right text-xs text-ink-3" dateTime={e.at}>
            {formatTime(e.at, tz)}
          </time>
          <span className={cn("z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full text-base", e.kind === "exercise" ? "bg-good-soft" : "bg-surface-2")} aria-hidden>
            {e.emoji}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{e.title}</p>
              {e.kcal !== null && (
                <p className={cn("num shrink-0 text-sm font-semibold", e.kcal < 0 ? "text-good" : "text-ink")}>
                  {e.kcal < 0 ? "−" : ""}
                  {fmt(Math.abs(e.kcal))} <span className="text-xs font-normal text-ink-3">kcal</span>
                </p>
              )}
            </div>
            <p className="truncate text-xs text-ink-3">{e.subtitle}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
