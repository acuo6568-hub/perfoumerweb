import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { WishlistClient } from "@/components/community/WishlistClient";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import type { Locale } from "@/lib/i18n";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

export const metadata: Metadata = {
  title: "İstək siyahısı",
  robots: {
    index: false,
    follow: false,
  },
};

const pageCopy: Record<Locale, { title: string; subtitle: string }> = {
  az: {
    title: "İstək siyahısı",
    subtitle: "Sonra müqayisə etmək və saxlamaq istədiyin ətirlərin şəxsi siyahısı.",
  },
  en: {
    title: "Wishlist",
    subtitle: "Your personal list of perfumes you want to keep and compare later.",
  },
  ru: {
    title: "Список желаний",
    subtitle: "Ваш личный список ароматов, которые хотите сохранить и сравнить позже.",
  },
};

export default async function WishlistPage() {
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const locale = await getCurrentLocale();
  const perfumes = await getPerfumes();
  const copy = pageCopy[locale];

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-6 pb-14 md:px-10">
        <section className="pt-6 pb-8 md:pt-8">
          <h1 className="text-[3rem] leading-[0.95] tracking-[-0.04em] text-zinc-900 md:text-[4.4rem]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-500">
            {copy.subtitle}
          </p>
        </section>

        <WishlistClient perfumes={perfumes} locale={locale} supabase={supabaseConfig} />
      </div>

      <Footer locale={locale} />
    </div>
  );
}
