import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("Sign in") };
}

export default function LoginPage() {
  if (!isSupabaseConfigured) redirect("/dashboard");
  return <LoginForm />;
}
