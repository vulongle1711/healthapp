import { VI, VI_PATTERNS } from "./vi";

/**
 * Minimal i18n. Source strings are the English UI text; `vi.ts` maps them to Vietnamese.
 * A missing translation falls back to the English string, so nothing ever renders blank.
 */
export type Lang = "vi" | "en";
export const LANGS: Lang[] = ["vi", "en"];
export const DEFAULT_LANG: Lang = "vi";
export const LANG_COOKIE = "lang";

export type Vars = Record<string, string | number>;
export type T = (s: string, vars?: Vars) => string;

export function isLang(v: unknown): v is Lang {
  return v === "vi" || v === "en";
}

function fill(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/**
 * A key may carry a context after "|" (e.g. "Light|intensity" vs "Light") when one English word
 * needs different translations; the English text is the part before "|".
 */
export function translate(lang: Lang, s: string, vars?: Vars): string {
  const en = s.split("|")[0];
  if (lang === "en" || !s) return fill(en, vars);
  const hit = VI[s];
  if (hit !== undefined) return fill(hit, vars);
  // Messages built at runtime (server errors, offline-estimator notes) are matched by pattern.
  for (const [re, tpl] of VI_PATTERNS) {
    const m = s.match(re);
    if (m) return tpl.replace(/\$(\d)/g, (_, i: string) => m[Number(i)] ?? "");
  }
  return fill(en, vars);
}

/** Marks a string defined outside a component for translation later with t(); returns it unchanged. */
export const msg = (s: string) => s;

export const makeT = (lang: Lang): T => (s, vars) => translate(lang, s, vars);

/** BCP 47 locale for Intl formatting. */
export const locale = (lang: Lang) => (lang === "vi" ? "vi-VN" : "en-US");
