import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import { Onboarding } from "./onboarding";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("Welcome") };
}

export default async function OnboardingPage() {
  const repo = await getRepo();
  if (!repo) redirect("/login");
  const profile = await repo.getProfile().catch(() => null);
  return <Onboarding existing={profile} />;
}
