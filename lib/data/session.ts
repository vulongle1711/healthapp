import "server-only";
import { redirect } from "next/navigation";
import { getRepo, getTz } from "./index";

/** For pages: require a signed-in user with a profile, otherwise redirect. */
export async function requireProfilePage() {
  const repo = await getRepo();
  if (!repo) redirect("/login");
  let profile;
  try {
    profile = await repo.getProfile();
  } catch {
    // Database unreachable — surface a friendly error boundary rather than a stack trace.
    throw new Error("We couldn't load your data right now. Please try again in a moment.");
  }
  if (!profile) redirect("/onboarding");
  const tz = await getTz();
  return { repo, profile, tz };
}
