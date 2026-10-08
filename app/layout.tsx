import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/log/toast";
import { TzSync } from "@/components/layout/tz-sync";
import { I18nProvider } from "@/components/i18n-provider";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t("Health — health & fitness"), template: "%s · Health" },
    description: t("Track food, drinks, exercise and progress by just describing your day."),
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1d21" },
  ],
};

// Dark by default; light mode is opt-in from the profile page (or "system").
const themeScript = `try{var t=localStorage.getItem('theme');if(!t||t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <I18nProvider lang={lang}>
          <ToastProvider>
            <TzSync />
            {children}
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
