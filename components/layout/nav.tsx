"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, Home, ListChecks, Salad, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { msg } from "@/lib/i18n";
import { useT } from "@/components/i18n-provider";

const ITEMS = [
  { href: "/dashboard", label: msg("Dashboard"), short: msg("Today"), icon: Home, mobile: true },
  { href: "/log", label: msg("Log"), short: msg("Log"), icon: ListChecks, mobile: false },
  { href: "/nutrition", label: msg("Nutrition"), short: msg("Food"), icon: Salad, mobile: true },
  { href: "/exercise", label: msg("Exercise"), short: msg("Move"), icon: Activity, mobile: true },
  { href: "/progress", label: msg("Progress"), short: msg("Progress"), icon: BarChart3, mobile: true },
  { href: "/insights", label: msg("Insights"), short: msg("Insights"), icon: Sparkles, mobile: true },
  { href: "/profile", label: msg("Profile"), short: msg("Profile"), icon: UserRound, mobile: false },
];

export function Sidebar({ name, demo }: { name: string; demo: boolean }) {
  const path = usePathname();
  const t = useT();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-6 backdrop-blur md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
        <Logo />
        <span className="text-lg font-semibold tracking-tight">Health</span>
        {demo && <span className="ml-auto rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-medium text-warn">Demo</span>}
      </Link>
      <nav aria-label={t("Main")} className="flex flex-1 flex-col gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}
            >
              <Icon className="h-[18px] w-[18px]" />
              {t(label)}
            </Link>
          );
        })}
      </nav>
      <Link href="/profile" className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
        <Avatar name={name} />
        <span className="truncate text-sm font-medium">{name}</span>
      </Link>
    </aside>
  );
}

export function MobileHeader({ name, demo }: { name: string; demo: boolean }) {
  const t = useT();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-bg/80 px-4 pb-2 pt-3 backdrop-blur-md md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-semibold tracking-tight">Health</span>
        {demo && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-medium text-warn">Demo</span>}
      </Link>
      <div className="flex items-center gap-1">
        <Link href="/log" className="rounded-full p-2 text-ink-2 hover:bg-surface-2" aria-label={t("Today's log")}>
          <ListChecks className="h-5 w-5" />
        </Link>
        <Link href="/profile" aria-label={t("Profile")}>
          <Avatar name={name} />
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const t = useT();
  return (
    <nav aria-label={t("Main")} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/85 pb-safe backdrop-blur-xl md:hidden">
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.filter((i) => i.mobile).map(({ href, short, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition", active ? "text-ink" : "text-ink-3")}>
                <Icon className={cn("h-[22px] w-[22px]", active && "stroke-[2.4]")} />
                {t(short)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ai to-info text-sm font-semibold text-white" aria-hidden>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--ink)" />
      <path d="M6 17h5l2.5-6 4 11 3-8 1.5 3H26" fill="none" stroke="var(--bg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
