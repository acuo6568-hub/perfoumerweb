import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { LoginSuccessClient } from "@/components/login/LoginSuccessClient";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

export const metadata: Metadata = {
  title: "Giriş uğurlu",
  robots: {
    index: false,
    follow: false,
  },
};

type LoginSuccessPageProps = {
  searchParams: Promise<{ next?: string; email?: string; pending?: string; flow?: "signup" | "email_change" }>;
};

export default async function LoginSuccessPage({ searchParams }: LoginSuccessPageProps) {
  const locale = await getCurrentLocale();
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const params = await searchParams;

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-3 sm:px-6 md:px-10">
        <section className="py-20 md:py-24">
          <LoginSuccessClient
            locale={locale}
            nextPath={params.next || "/wishlist"}
            email={params.email || ""}
            pending={params.pending === "1"}
            flow={params.flow === "email_change" ? "email_change" : "signup"}
            supabase={supabaseConfig}
          />
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
