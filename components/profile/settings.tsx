"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, LogOut, Moon, RotateCcw, Sun, Monitor } from "lucide-react";
import { resetDemoAction, signOutAction } from "@/app/actions";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/log/toast";
import { useLang, useT } from "@/components/i18n-provider";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

type Theme = "light" | "dark" | "system";

export function LanguageSwitch() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const apply = (l: Lang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm"><Languages className="h-4 w-4" /> {t("Language")}</span>
      <Segmented label={t("Language")} value={lang} onChange={apply} options={[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "English" }]} />
    </div>
  );
}

export function ThemeSwitch() {
  const t = useT();
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    try {
      setTheme((localStorage.getItem("theme") as Theme) || "dark");
    } catch {}
  }, []);
  const apply = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem("theme", t);
    } catch {}
    const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm">{theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "system" ? <Monitor className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {t("Appearance")}</span>
      <Segmented label={t("Appearance")} value={theme} onChange={apply} options={[{ value: "light", label: t("Light") }, { value: "dark", label: t("Dark") }, { value: "system", label: t("Auto") }]} />
    </div>
  );
}

export function AccountActions({ demo }: { demo: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [pending, start] = useTransition();
  if (demo)
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await resetDemoAction(false); toast(r.ok ? t("Demo data reset") : t(r.error), r.ok ? "good" : "bad"); router.refresh(); })}>
          <RotateCcw className="h-3.5 w-3.5" /> {t("Reset demo data")}
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await resetDemoAction(true); if (r.ok) router.push("/onboarding"); })}>
          {t("Start empty (new user)")}
        </Button>
      </div>
    );
  return (
    <form action={signOutAction}>
      <Button variant="danger" size="sm" type="submit"><LogOut className="h-3.5 w-3.5" /> {t("Sign out")}</Button>
    </form>
  );
}
