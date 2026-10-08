import { requireProfilePage } from "@/lib/data/session";
import { loadDay } from "@/lib/data/queries";
import { SectionTitle } from "@/components/ui/card";
import { DailySummary } from "@/components/dashboard/daily-summary";
import { WeeklyReport } from "@/components/insights/weekly-report";
import { CoachChat } from "@/components/insights/coach-chat";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("Insights") };
}

export default async function InsightsPage() {
  const { repo, profile, tz } = await requireProfilePage();
  const t = await getT();
  const day = await loadDay(repo, profile, tz);
  const m = day.metrics;
  return (
    <div className="space-y-4">
      <header className="px-1 pt-2">
        <h1 className="text-[28px] font-semibold tracking-tight">{t("Insights")}</h1>
        <p className="text-sm text-ink-3">{t("Patterns from your logs. Estimates, not diagnoses.")}</p>
      </header>
      <CoachChat />
      <SectionTitle className="pt-2">{t("Today's summary")}</SectionTitle>
      <DailySummary refreshKey={`${m.foodCount}-${m.nutrition.calories}-${m.waterMl}-${m.exerciseKcal}`} />
      <SectionTitle className="pt-2">{t("This week")}</SectionTitle>
      <WeeklyReport />
    </div>
  );
}
