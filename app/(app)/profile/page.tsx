import Link from "next/link";
import { requireProfilePage } from "@/lib/data/session";
import { aiAvailable } from "@/lib/ai/provider";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/progress";
import { ProfileForm } from "@/components/profile/profile-form";
import { AccountActions, LanguageSwitch, ThemeSwitch } from "@/components/profile/settings";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("Profile") };
}

export default async function ProfilePage() {
  const { repo, profile } = await requireProfilePage();
  const email = await repo.userEmail();
  const demo = repo.mode === "demo";
  const ai = aiAvailable();
  const t = await getT();

  return (
    <div className="space-y-4">
      <header className="px-1 pt-2">
        <h1 className="text-[28px] font-semibold tracking-tight">{t("Profile")}</h1>
        <p className="text-sm text-ink-3">{email}</p>
      </header>

      <Card>
        <CardHeader title={t("About you & targets")} action={<Link href="/onboarding" className="text-xs text-ink-3 hover:text-ink">{t("Redo onboarding")}</Link>} />
        <ProfileForm profile={profile} />
      </Card>

      <Card className="space-y-4">
        <CardHeader title={t("Settings")} className="mb-0" />
        <LanguageSwitch />
        <ThemeSwitch />
        <div className="flex items-center justify-between text-sm">
          <span>{t("AI estimates")}</span>
          {ai ? <Badge tone="ai">{t("AI connected")}</Badge> : <Badge tone="warn">{t("Offline estimator")}</Badge>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>{t("Storage")}</span>
          {demo ? <Badge tone="warn">{t("Demo — in memory")}</Badge> : <Badge tone="good">{t("Supabase · private (RLS)")}</Badge>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>{t("Wearables (Apple Health, Garmin…)")}</span>
          <Badge>{t("Coming later")}</Badge>
        </div>
        <div className="pt-2"><AccountActions demo={demo} /></div>
      </Card>

      <p className="px-2 text-center text-xs leading-relaxed text-ink-3">
        {t("Health gives estimates for self-tracking, not medical advice. If you have a medical condition, are pregnant, or have a history of disordered eating, talk to a professional before changing how you eat.")}
      </p>
    </div>
  );
}
