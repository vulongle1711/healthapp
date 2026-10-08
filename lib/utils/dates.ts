import { DEFAULT_LANG, locale, makeT, type Lang } from "@/lib/i18n";

export const DEFAULT_TZ = "Asia/Ho_Chi_Minh";

/** Offset (ms) between UTC and the given zone at a given instant. */
function tzOffsetMs(instant: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(instant)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

export function isValidTz(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "YYYY-MM-DD" for an instant in the given zone. */
export function dateKey(input: Date | string | number, tz: string = DEFAULT_TZ): string {
  const d = new Date(input);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** UTC instant of local midnight for a "YYYY-MM-DD" key in a zone. */
export function startOfDayUtc(key: string, tz: string = DEFAULT_TZ): Date {
  const [y, m, d] = key.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - tzOffsetMs(guess, tz);
  t = guess - tzOffsetMs(t, tz);
  return new Date(t);
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** [start, end) instants covering `days` local days ending with `endKey` inclusive. */
export function rangeUtc(endKey: string, days: number, tz: string = DEFAULT_TZ) {
  const startKey = addDays(endKey, -(days - 1));
  return {
    startKey,
    endKey,
    start: startOfDayUtc(startKey, tz).toISOString(),
    end: startOfDayUtc(addDays(endKey, 1), tz).toISOString(),
  };
}

export function listKeys(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  for (let k = startKey; k <= endKey; k = addDays(k, 1)) out.push(k);
  return out;
}

export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatTime(iso: string, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDayLong(key: string, lang: Lang = DEFAULT_LANG): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(lang), { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function formatDayShort(key: string, lang: Lang = DEFAULT_LANG): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(lang), { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function weekdayShort(key: string, lang: Lang = DEFAULT_LANG): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(lang), { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function greeting(now: Date = new Date(), tz: string = DEFAULT_TZ, lang: Lang = DEFAULT_LANG): string {
  const t = makeT(lang);
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(now));
  if (h < 5) return t("Good evening");
  if (h < 12) return t("Good morning");
  if (h < 18) return t("Good afternoon");
  return t("Good evening");
}

/** Combine a local date key + "HH:MM" into an ISO instant. */
export function localToIso(key: string, hhmm: string, tz: string = DEFAULT_TZ): string {
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(startOfDayUtc(key, tz).getTime() + (h * 60 + mi) * 60_000).toISOString();
}
