"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Logo } from "@/components/layout/nav";
import { useT } from "@/components/i18n-provider";

function friendly(msg: string) {
  if (/invalid login/i.test(msg)) return "Email or password is incorrect.";
  if (/already registered/i.test(msg)) return "An account with this email already exists — sign in instead.";
  if (/password should be/i.test(msg)) return "Password must be at least 6 characters.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox.";
  return "Something went wrong. Please try again.";
}

export function LoginForm() {
  const router = useRouter();
  const t = useT();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
        if (error) throw error;
        if (!data.session) {
          setInfo(t("Check your email to confirm your account, then sign in."));
          return;
        }
        router.push("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(t(friendly((err as Error).message ?? "")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-10 animate-fade-up">
        <Logo />
        <h1 className="mt-6 text-[30px] font-semibold leading-tight tracking-tight">{t("Track your health by just talking about your day.")}</h1>
        <p className="mt-2 text-sm text-ink-3">{t("“Ăn 1 tô phở bò, uống cà phê sữa đá” — that's a logged meal.")}</p>
      </div>
      <form onSubmit={submit} className="space-y-4 animate-fade-up">
        <Segmented label={t("Mode")} value={mode} onChange={setMode} options={[{ value: "signin", label: t("Sign in") }, { value: "signup", label: t("Create account") }]} className="w-full [&>button]:flex-1" />
        <Field label={t("Email")} htmlFor="email"><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t("Password")} htmlFor="password"><Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">{error}</p>}
        {info && <p className="rounded-2xl bg-good-soft px-4 py-3 text-sm text-good" role="status">{info}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t(mode === "signin" ? "Sign in" : "Create account")}
        </Button>
      </form>
    </main>
  );
}
