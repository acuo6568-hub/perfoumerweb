import type { Metadata } from "next";

import { CompareClient } from "@/components/CompareClient";
import { Footer } from "@/components/Footer";
import { getNotes, getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import type { Locale } from "@/lib/i18n";
import { absoluteUrl, buildAzeriPageKeywords } from "@/lib/seo";

const copyByLocale: Record<Locale, { title: string; description: string }> = {
  az: {
    title: "Ətir Müqayisə",
    description: "Ətirləri yan-yana müqayisə edin və sizə ən uyğun qoxunu seçin.",
  },
  en: {
    title: "Perfume Compare",
    description: "Compare perfumes side by side and pick the scent that fits you best.",
  },
  ru: {
    title: "Сравнение ароматов",
    description: "Сравнивайте ароматы бок о бок и выбирайте лучший вариант для себя.",
  },
};

export const metadata: Metadata = {
  title: "Ətir Müqayisə",
  description: "Perfoumer-də ətirləri yan-yana müqayisə edin.",
  keywords: buildAzeriPageKeywords([
    "ətir müqayisəsi",
    "ətir qarşılaşdırma",
    "hansı ətir daha yaxşıdır",
    "qoxu müqayisəsi",
  ]),
  alternates: {
    canonical: "/compare",
  },
  openGraph: {
    title: "Ətir Müqayisə",
    description: "Perfoumer-də ətirləri yan-yana müqayisə edin.",
    url: absoluteUrl("/compare"),
    type: "website",
  },
};

export default async function ComparePage() {
  const locale = await getCurrentLocale();
  const [perfumes, notes] = await Promise.all([getPerfumes(), getNotes()]);
  const copy = copyByLocale[locale];

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-8">
        <section className="border-b border-zinc-200/80 pb-8">
          <h1 className="text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:text-7xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base md:text-lg">
            {copy.description}
          </p>
        </section>

        <div className="pt-8">
          <CompareClient perfumes={perfumes} notes={notes} locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
