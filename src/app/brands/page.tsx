import Link from "next/link";
import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { buildAzeriPageKeywords, buildLocaleAlternates, slugifyPathSegment } from "@/lib/seo";

const brandsMetadata: Metadata = {
  title: "Ətir Brendləri",
  description:
    "Perfoumer-də təqdim olunan ətir brendlərini əlifba sırası ilə kəşf edin və seçdiyiniz brend üzrə bütün məhsullara keçid edin.",
  keywords: buildAzeriPageKeywords([
    "ətir brendləri",
    "məşhur ətir markaları",
    "dizayner ətir markaları",
    "niş ətir brendləri",
    "brendə görə ətir seç",
  ]),
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();

  return {
    ...brandsMetadata,
    alternates: buildLocaleAlternates("/brands", locale),
  };
}

function groupBrands(brands: string[]) {
  const grouped = new Map<string, string[]>();

  for (const brand of brands) {
    const letter = brand.charAt(0).toUpperCase();
    const current = grouped.get(letter) ?? [];
    current.push(brand);
    grouped.set(letter, current);
  }

  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default async function BrandsPage() {
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const perfumes = await getPerfumes();
  const brands = Array.from(
    new Set(
      perfumes
        .map((perfume) => perfume.brand.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const groupedBrands = groupBrands(brands);

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-zinc-500">{t.brandsPage.eyebrow}</p>
              <h1 className="max-w-[12ch] text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:max-w-[16ch] md:text-7xl">
                {t.brandsPage.title}
              </h1>
            </div>
            <p className="max-w-sm text-sm leading-6 text-zinc-500 sm:text-base md:text-lg">
              {t.brandsPage.description}
            </p>
          </div>
        </section>

        <section className="mt-8 space-y-6">
          {groupedBrands.map(([letter, items]) => (
            <div
              key={letter}
              className="rounded-[2rem] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(250,250,249,0.78)_100%)] p-5 shadow-[0_18px_50px_rgba(26,26,26,0.06)] md:p-6"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-zinc-900 text-[2rem] font-medium text-white shadow-[0_12px_24px_rgba(24,24,24,0.16)] md:h-20 md:w-20 md:text-[2.4rem]">
                  {letter}
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((brand) => (
                    <Link
                      key={brand}
                      href={`/brands/${slugifyPathSegment(brand)}`}
                      className="group rounded-[1.35rem] border border-zinc-200/80 bg-white/92 px-4 py-4 text-zinc-700 shadow-[0_10px_24px_rgba(24,24,24,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_16px_30px_rgba(24,24,24,0.08)]"
                    >
                      <span className="block text-lg font-medium text-zinc-900 transition-colors duration-300 group-hover:text-zinc-800">
                        {brand}
                      </span>
                      <span className="mt-1 block text-sm text-zinc-500">
                        {t.brandsPage.cardHint}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
