import { requireProfilePage } from "@/lib/data/session";
import { BottomNav, MobileHeader, Sidebar } from "@/components/layout/nav";
import { LogProvider } from "@/components/log/log-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { repo, profile } = await requireProfilePage();
  const userFoods = await repo.listUserFoods().catch(() => []);
  const demo = repo.mode === "demo";

  return (
    <LogProvider userFoods={userFoods} weightKg={profile.weight_kg}>
      <div className="flex min-h-dvh">
        <Sidebar name={profile.name} demo={demo} />
        <div className="min-w-0 flex-1">
          <MobileHeader name={profile.name} demo={demo} />
          <main className="mx-auto w-full max-w-3xl px-4 pb-36 pt-2 md:px-8 md:pb-16 md:pt-10">{children}</main>
        </div>
      </div>
      <BottomNav />
    </LogProvider>
  );
}
