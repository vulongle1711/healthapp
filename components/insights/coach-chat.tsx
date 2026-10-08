"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { askCoach, FriendlyError } from "@/lib/client/api";
import { cn } from "@/lib/utils/cn";
import { useLang, useT } from "@/components/i18n-provider";

const SUGGESTIONS = {
  vi: ["Hôm nay ăn hơi nhiều?", "Tối nay ăn pizza được không?", "Sao mình không giảm cân?", "Mình còn cần bao nhiêu đạm?"],
  en: ["Hôm nay ăn hơi nhiều?", "Can I eat pizza tonight?", "Why am I not losing weight?", "How much protein do I still need?"],
};

type Msg = { role: "user" | "ai"; text: string };

export function CoachChat() {
  const t = useT();
  const lang = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    const text = question.trim();
    if (text.length < 2 || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setQ("");
    setBusy(true);
    try {
      const r = await askCoach(text);
      setMsgs((m) => [...m, { role: "ai", text: r.answer }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "ai", text: t(e instanceof FriendlyError ? e.message : "The coach is unavailable right now.") }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };

  return (
    <div className="rounded-3xl bg-surface p-5 shadow-card">
      <p className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles className="h-4 w-4 text-ai" /> {t("Ask your coach")}</p>
      <p className="mt-0.5 text-xs text-ink-3">{t("Answers use your logged data. Not medical advice.")}</p>

      {msgs.length > 0 && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={cn("max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed animate-fade-up", m.role === "user" ? "ml-auto bg-ink text-bg" : "bg-ai-soft text-ink")}>
              {m.text}
            </div>
          ))}
          {busy && <div className="skeleton h-10 w-2/3 rounded-2xl" aria-label={t("Thinking")} />}
          <div ref={endRef} />
        </div>
      )}

      {msgs.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS[lang].map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-ink-2 hover:text-ink">{s}</button>
          ))}
        </div>
      )}

      <form className="mt-4 flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-4 pr-1 focus-within:border-ai" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <label htmlFor="coach-q" className="sr-only">{t("Your question")}</label>
        <input id="coach-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Ask anything about today…")} className="h-10 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3" />
        <button type="submit" disabled={busy || q.trim().length < 2} className="grid h-9 w-9 place-items-center rounded-full bg-ai text-white disabled:opacity-40" aria-label={t("Send")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
