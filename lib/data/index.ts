import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_TZ, isValidTz } from "@/lib/utils/dates";
import { MemoryRepo } from "./memory-repo";
import { SupabaseRepo } from "./supabase-repo";
import type { Repo } from "./types";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not signed in");
  }
}

/**
 * Returns a repository scoped to the current user, or null when nobody is signed in.
 * The user id always comes from the verified Supabase session, never from the client.
 */
export const getRepo = cache(async (): Promise<Repo | null> => {
  if (!isSupabaseConfigured) return new MemoryRepo();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return new SupabaseRepo(supabase, user.id, user.email ?? null);
});

export async function requireRepo(): Promise<Repo> {
  const repo = await getRepo();
  if (!repo) throw new UnauthenticatedError();
  return repo;
}

/** The user's time zone, set by the browser in a cookie. */
export const getTz = cache(async (): Promise<string> => {
  const tz = (await cookies()).get("tz")?.value;
  return isValidTz(tz) ? tz : DEFAULT_TZ;
});

export type { Repo } from "./types";
