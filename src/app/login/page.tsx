import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { LoginClient } from "@/components/login/LoginClient";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

export const metadata: Metadata = {
  title: "Giriş",
  robots: {
    index: false,
    follow: false,
  },
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    mode?: "login" | "signup";
    email?: string;
    reason?: "account_exists" | "invalid_credentials" | "email_unverified" | "weak_password";
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const locale = await getCurrentLocale();
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.trim() ? params.next.trim() : "/wishlist";
  const mode = params.mode === "signup" ? "signup" : "login";
  const email = params.email || "";
  const reason = params.reason;

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-3 sm:px-6 md:px-10">
        <section className="pt-8 pb-12 md:pt-10 md:pb-14">
          <LoginClient
            locale={locale}
            nextPath={next}
            supabase={supabaseConfig}
            initialMode={mode}
            initialEmail={email}
            initialReason={reason}
          />
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
