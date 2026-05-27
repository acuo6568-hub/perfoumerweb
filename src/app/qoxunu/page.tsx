import type { Metadata } from "next";

import { ScentQuizClient } from "@/components/ScentQuizClient";
import { getNotes, getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";

const qoxunuMetadataByLocale = {
  az: {
    title: "Qoxunu Testi",
    description: "Qısa qoxu testini keçin və zövqünüzə uyğun ətirləri AI əsaslı tövsiyə ilə tapın.",
    keywords: buildAzeriPageKeywords([
      "qoxu testi",
      "ətir testi",
      "ai ətir tövsiyəsi",
      "mənə uyğun ətir",
      "notlara görə ətir tap",
      "parfum test",
    ]),
  },
  en: {
    title: "Find Your Scent",
    description: "Take a short scent quiz and find perfumes that match your taste with AI suggestions.",
    keywords: buildAzeriPageKeywords([
      "perfume quiz",
      "find my scent",
      "ai perfume recommendation",
      "best perfume for me",
      "scent finder",
    ]),
  },
  ru: {
    title: "Подбор аромата",
    description: "Пройдите короткий тест и найдите ароматы по своему вкусу с помощью AI-рекомендаций.",
    keywords: buildAzeriPageKeywords([
      "тест на аромат",
      "подбор парфюма",
      "ai рекомендация парфюма",
      "какой парфюм мне подходит",
      "подбор аромата",
    ]),
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const metadata = qoxunuMetadataByLocale[locale];

  return {
    ...metadata,
    alternates: buildLocaleAlternates("/qoxunu", locale),
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: absoluteUrlForLocale("/qoxunu", locale),
      type: "website",
    },
  };
}

export default async function QoxunuPage() {
  const locale = await getCurrentLocale();
  const [perfumes, notes] = await Promise.all([getPerfumes(), getNotes()]);

  return (
    <div className="qoxunu-gold-page relative overflow-hidden">
      <div aria-hidden="true" className="qoxunu-gold-aura" />
      <main className="qoxunu-page-enter relative z-[1] mx-auto min-h-dvh max-w-[1540px] px-4 pt-[1.5rem] pb-0.5 sm:px-6 sm:pt-[2rem] sm:pb-1.5 md:px-10 md:pt-[2.4rem] md:pb-2.5">
        <ScentQuizClient perfumes={perfumes} notes={notes} locale={locale} />
      </main>
    </div>
  );
}
