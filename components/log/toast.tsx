"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Toast = { id: number; text: string; tone: "good" | "bad" };
const Ctx = createContext<(text: string, tone?: "good" | "bad") => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: "good" | "bad" = "good") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "bad" ? 5000 : 2600);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={cn("flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg animate-fade-up", t.tone === "good" ? "bg-ink text-bg" : "bg-bad text-white")}>
            {t.tone === "good" ? (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-good text-white animate-pop">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
