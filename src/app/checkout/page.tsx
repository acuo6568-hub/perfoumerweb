import type { Metadata } from "next";

import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { Footer } from "@/components/Footer";
import { getPerfumes } from "@/lib/catalog";
import { getCheckoutSettingsFromServer } from "@/lib/checkout-settings";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

export const metadata: Metadata = {
  title: "Sifarişin tamamlanması",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const checkoutSettings = getCheckoutSettingsFromServer();
  const locale = await getCurrentLocale();
  const perfumes = await getPerfumes();

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-6 pb-6 md:px-10 md:pb-10">
        <section className="pt-8 pb-5">
          <h1 className="text-[2.5rem] leading-[0.95] tracking-[-0.035em] text-zinc-900 md:text-[3.5rem]">
            Sifarişi tamamla
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            {checkoutSettings.cardPaymentsEnabled
              ? "Seçilmiş ətirlərinizi bir neçə addımda təsdiqləyin, onlayn ödənişi tamamlayın və ya mağazada nağd götürməni seçin."
              : "Seçilmiş ətirlərinizi bir neçə addımda təsdiqləyin və mağazada nağd götürmə üçün sifarişinizi tamamlayın."}
          </p>
        </section>

        <CheckoutClient perfumes={perfumes} locale={locale} supabase={supabaseConfig} settings={checkoutSettings} />
      </div>

      <Footer locale={locale} />
    </div>
  );
}
