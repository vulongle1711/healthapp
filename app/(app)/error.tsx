"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-sm py-20 text-center">
      <p className="text-4xl" aria-hidden>🫠</p>
      <h1 className="mt-4 text-xl font-semibold">{t("Something didn't load")}</h1>
      <p className="mt-2 text-sm text-ink-3">{t("We couldn't reach your data right now. Your logs are safe — please try again.")}</p>
      <Button className="mt-6" onClick={reset}>{t("Try again")}</Button>
    </div>
  );
}
