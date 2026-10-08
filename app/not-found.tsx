import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto max-w-sm py-24 text-center">
      <p className="text-4xl" aria-hidden>🧭</p>
      <h1 className="mt-4 text-xl font-semibold">{t("Page not found")}</h1>
      <Link href="/dashboard" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg">{t("Back to today")}</Link>
    </main>
  );
}
