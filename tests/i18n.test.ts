import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { VI } from "@/lib/i18n/vi";
import { translate } from "@/lib/i18n";

const ROOTS = ["app", "components", "lib", "types"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(f) ? [p] : [];
  });
}

/** String literals inside the first argument of every t(...) / msg(...) call. */
export function extractKeys(src: string): string[] {
  const keys: string[] = [];
  const call = /(?<![\w.])(t|msg)\(/g;
  let m: RegExpExecArray | null;
  while ((m = call.exec(src))) {
    let i = m.index + m[0].length;
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '"' || c === "'" || c === "`") {
        let j = i + 1;
        while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
        const lit = src.slice(i + 1, j);
        const compared = /[=!]==?\s*$/.test(src.slice(Math.max(0, i - 6), i));
        if (depth === 0 && !compared && !(c === "`" && lit.includes("${"))) keys.push(lit.replace(/\\(.)/g, "$1"));
        i = j + 1;
        continue;
      }
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") {
        if (depth === 0) break;
        depth--;
      } else if (c === "," && depth === 0) break;
      i++;
    }
  }
  return keys;
}

const used = [...new Set(ROOTS.flatMap(files).flatMap((f) => extractKeys(readFileSync(f, "utf8"))))].filter((k) => /[a-z]/i.test(k));

describe("Vietnamese translations", () => {
  it("cover every string passed to t() or msg()", () => {
    const missing = used.filter((k) => VI[k] === undefined);
    expect(missing).toEqual([]);
  });

  it("keep the same {placeholders} as the English source", () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    const mismatched = Object.entries(VI).filter(([en, vi]) => vars(en) !== vars(vi)).map(([en]) => en);
    expect(mismatched).toEqual([]);
  });

  it("fills placeholders and falls back to English", () => {
    expect(translate("vi", "{n} kcal left", { n: 120 })).toBe(VI["{n} kcal left"].replace("{n}", "120"));
    expect(translate("en", "{n} kcal left", { n: 120 })).toBe("120 kcal left");
    expect(translate("vi", "Some string nobody translated")).toBe("Some string nobody translated");
  });
});
