import type { Metadata } from "next";

import { CartClient } from "../../components/cart/CartClient";
import { Footer } from "@/components/Footer";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import type { Locale } from "@/lib/i18n";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

type PageCopy = {
  title: string;
  subtitle: string;
};

const pageCopyByLocale: Record<Locale, PageCopy> = {
  az: {
    title: "Səbət",
    subtitle: "Ölçü seçimini burada idarə et və ödənişə keç.",
  },
  en: {
    title: "Cart",
    subtitle: "Manage selected sizes and continue to payment.",
  },
  ru: {
    title: "Корзина",
    subtitle: "Управляйте выбранными объемами и переходите к оплате.",
  },
};

export const metadata: Metadata = {
  title: "Səbət",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CartPage() {
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const locale = await getCurrentLocale();
  const perfumes = await getPerfumes();
  const copy = pageCopyByLocale[locale];

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-6 pb-4 md:px-10 md:pb-14">
        <section className="pt-6 pb-8 md:pt-8">
          <h1 className="text-[3rem] leading-[0.95] tracking-[-0.04em] text-zinc-900 md:text-[4.4rem]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-500">{copy.subtitle}</p>
        </section>

        <CartClient perfumes={perfumes} locale={locale} supabase={supabaseConfig} />
      </div>

      <div className="hidden md:block">
        <Footer locale={locale} />
      </div>
    </div>
  );
}
