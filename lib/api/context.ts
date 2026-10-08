import "server-only";
import { NextResponse } from "next/server";
import { getRepo, getTz } from "@/lib/data";
import { mealForHour } from "@/lib/ai/parser";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Resolve the signed-in user's repo + profile for an AI route. */
export async function aiContext() {
  const repo = await getRepo();
  if (!repo) return { error: jsonError("Please sign in again.", 401) } as const;
  const profile = await repo.getProfile().catch(() => null);
  const tz = await getTz();
  const now = new Date();
  const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const [h, m] = localTime.split(":").map(Number);
  return { repo, profile, tz, localTime, defaultMeal: mealForHour(h + m / 60) } as const;
}
