"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Plus } from "lucide-react";
import type { UserFood } from "@/types/nutrition";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { msg } from "@/lib/i18n";
import { useT } from "@/components/i18n-provider";
import { FoodLogger } from "./food-logger";
import { ExerciseLogger } from "./exercise-logger";
import { NoteLogger, SleepLogger, StepsLogger, WaterLogger, WeightLogger } from "./simple-loggers";
import { DayLogger } from "./day-logger";

export type LogKind = "menu" | "food" | "exercise" | "water" | "weight" | "sleep" | "steps" | "note" | "day";

const Ctx = createContext<(k: LogKind) => void>(() => {});
export const useOpenLog = () => useContext(Ctx);

const MENU: { kind: Exclude<LogKind, "menu">; emoji: string; label: string }[] = [
  { kind: "food", emoji: "🍽", label: msg("Food") },
  { kind: "exercise", emoji: "🏋️", label: msg("Exercise") },
  { kind: "water", emoji: "💧", label: msg("Water") },
  { kind: "weight", emoji: "⚖️", label: msg("Weight") },
  { kind: "sleep", emoji: "😴", label: msg("Sleep") },
  { kind: "steps", emoji: "👟", label: msg("Steps") },
  { kind: "note", emoji: "📝", label: msg("Note") },
  { kind: "day", emoji: "✨", label: msg("Whole day") },
];

const TITLES: Record<Exclude<LogKind, "menu">, [string, string?]> = {
  food: [msg("Log food"), msg("Describe it in English or Vietnamese — AI does the math.")],
  exercise: [msg("Log exercise"), msg("We estimate active calories; your watch's number wins if you have one.")],
  water: [msg("Log water")],
  weight: [msg("Log weight")],
  sleep: [msg("Log sleep"), msg("Manual for now — wearable sync can come later.")],
  steps: [msg("Log steps")],
  note: [msg("Daily note")],
  day: [msg("How was your day?"), msg("Describe everything at once. You'll confirm before anything is saved.")],
};

export function LogProvider({ children, userFoods, weightKg }: { children: React.ReactNode; userFoods: UserFood[]; weightKg: number }) {
  const t = useT();
  const [kind, setKind] = useState<LogKind | null>(null);
  const open = useCallback((k: LogKind) => setKind(k), []);
  const close = () => setKind(null);

  return (
    <Ctx.Provider value={open}>
      {children}

      <button
        type="button"
        onClick={() => setKind("menu")}
        className="fixed bottom-[84px] right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-bg shadow-[0_10px_30px_-8px_rgb(0_0_0/0.45)] transition active:scale-95 md:bottom-8 md:right-8"
        aria-label={t("Quick log")}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        <span className="font-semibold">{t("Log|verb")}</span>
      </button>

      <Sheet open={kind === "menu"} onOpenChange={(o) => !o && close()} title={t("Quick log")} description={t("What do you want to log?")}>
        <div className="grid grid-cols-4 gap-2 pt-1">
          {MENU.map((m) => (
            <button
              key={m.kind}
              type="button"
              onClick={() => setKind(m.kind)}
              className={cn("flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface-2 transition active:scale-95 hover:bg-line", m.kind === "day" && "bg-ai-soft text-ai")}
            >
              <span className="text-2xl" aria-hidden>{m.emoji}</span>
              <span className="text-xs font-medium">{t(m.label)}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {kind && kind !== "menu" && (
        <Sheet open onOpenChange={(o) => !o && close()} title={t(TITLES[kind][0])} description={TITLES[kind][1] && t(TITLES[kind][1])}>
          {kind === "food" && <FoodLogger userFoods={userFoods} onDone={close} autoFocus />}
          {kind === "exercise" && <ExerciseLogger weightKg={weightKg} onDone={close} />}
          {kind === "water" && <WaterLogger onDone={close} />}
          {kind === "weight" && <WeightLogger onDone={close} current={weightKg} />}
          {kind === "sleep" && <SleepLogger onDone={close} />}
          {kind === "steps" && <StepsLogger onDone={close} />}
          {kind === "note" && <NoteLogger onDone={close} />}
          {kind === "day" && <DayLogger onDone={close} />}
        </Sheet>
      )}
    </Ctx.Provider>
  );
}

/** A button anywhere in the app that opens a specific logger. */
export function OpenLogButton({ kind, children, className }: { kind: LogKind; children: React.ReactNode; className?: string }) {
  const open = useOpenLog();
  return (
    <button type="button" onClick={() => open(kind)} className={className}>
      {children}
    </button>
  );
}
