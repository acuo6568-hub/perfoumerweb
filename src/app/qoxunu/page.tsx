import type { Metadata } from "next";

import { ScentQuizClient } from "@/components/ScentQuizClient";
import { getNotes, getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { absoluteUrl, buildAzeriPageKeywords } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Qoxunu Testi",
  description:
    "Qısa qoxu testini keçin və zövqünüzə uyğun ətirləri AI əsaslı tövsiyə ilə tapın.",
  keywords: buildAzeriPageKeywords([
    "qoxu testi",
    "ətir testi",
    "ai ətir tövsiyəsi",
    "mənə uyğun ətir",
    "notlara görə ətir tap",
    "parfum test",
  ]),
  alternates: {
    canonical: "/qoxunu",
  },
  openGraph: {
    title: "Qoxunu Testi",
    description: "Qısa qoxu testini keçin və zövqünüzə uyğun ətirləri AI əsaslı tövsiyə ilə tapın.",
    url: absoluteUrl("/qoxunu"),
    type: "website",
  },
};

export default async function QoxunuPage() {
  const locale = await getCurrentLocale();
  const [perfumes, notes] = await Promise.all([getPerfumes(), getNotes()]);

  return (
    <div className="qoxunu-gold-page relative overflow-hidden">
      <div aria-hidden="true" className="qoxunu-gold-aura" />
      <main className="qoxunu-page-enter relative z-[1] mx-auto min-h-dvh max-w-[1540px] px-4 pt-[4.3rem] pb-0.5 sm:px-6 sm:pt-[5.85rem] sm:pb-1.5 md:px-10 md:pt-[6.1rem] md:pb-2.5">
        <ScentQuizClient perfumes={perfumes} notes={notes} locale={locale} />
      </main>
    </div>
  );
}
