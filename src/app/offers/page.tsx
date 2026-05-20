import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { getPerfumes } from "@/lib/catalog";
import { resolvePerfumeCardPrice } from "@/lib/discounts";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { absoluteUrlForLocale, buildLocaleAlternates } from "@/lib/seo";
import { applySiteBranding } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const t = getDictionary(locale, settings);

  return {
    title: t.offersPage.title,
    description: applySiteBranding(t.offersPage.description, settings),
    alternates: buildLocaleAlternates("/offers", locale),
    openGraph: {
      title: t.offersPage.title,
      description: applySiteBranding(t.offersPage.description, settings),
      url: absoluteUrlForLocale("/offers", locale),
      type: "website",
    },
  };
}

export default async function OffersPage() {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const t = getDictionary(locale, settings);
  const perfumes = await getPerfumes();
  const variantCountBySlug = perfumes.reduce((map, perfume) => {
    map.set(perfume.slug, (map.get(perfume.slug) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const offers = perfumes
    .map((perfume) => {
      const pricing = resolvePerfumeCardPrice(perfume);
      return { perfume, pricing };
    })
    .filter(({ pricing }) => pricing.hasActiveDiscount)
    .sort((left, right) => {
      const leftSavings = left.pricing.bestSavingsPercent ?? 0;
      const rightSavings = right.pricing.bestSavingsPercent ?? 0;
      if (rightSavings !== leftSavings) {
        return rightSavings - leftSavings;
      }

      const leftPrice = left.pricing.finalPrice ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.pricing.finalPrice ?? Number.POSITIVE_INFINITY;
      return leftPrice - rightPrice;
    });

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto flex min-h-screen w-full max-w-[1540px] flex-col px-6 pb-16 pt-6 md:px-10">
        <section className="rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),rgba(248,250,252,0.84)_42%,rgba(244,244,245,0.92))] p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] md:p-10">
          <p className="text-[0.74rem] font-semibold tracking-[0.24em] text-rose-500 uppercase">{t.offersPage.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-[3rem] leading-[0.94] tracking-[-0.05em] text-zinc-900 md:text-[4.6rem]">
            {t.offersPage.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600 md:text-lg">{t.offersPage.description}</p>
        </section>

        {offers.length ? (
          <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {offers.map(({ perfume }) => (
              <ProductCard
                key={perfume.id}
                perfume={perfume}
                locale={locale}
                variantCount={variantCountBySlug.get(perfume.slug) ?? 1}
              />
            ))}
          </section>
        ) : (
          <section className="mt-8 rounded-[1.6rem] border border-zinc-200 bg-white/90 p-8 text-center text-zinc-600 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
            {t.offersPage.empty}
          </section>
        )}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
