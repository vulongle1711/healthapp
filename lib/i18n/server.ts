import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, makeT, type Lang } from "./index";

/** The viewer's language from the cookie set by the language switch; Vietnamese by default. */
export const getLang = cache(async (): Promise<Lang> => {
  try {
    const v = (await cookies()).get(LANG_COOKIE)?.value;
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    // Outside a request (e.g. tests) there are no cookies.
    return DEFAULT_LANG;
  }
});

export async function getT() {
  return makeT(await getLang());
}
