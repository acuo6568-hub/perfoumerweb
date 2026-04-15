import type { Metadata } from "next";
import Link from "next/link";

import { CatalogClient } from "@/components/CatalogClient";
import { Footer } from "@/components/Footer";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { BLOG_ARTICLES, CORE_CLUSTER_PAGES, TRUST_PAGES } from "@/lib/seo-growth";
import { buildAzeriPageKeywords } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Ətir Kataloqu",
  description:
    "Perfoumer kataloqunda premium, niş və dizayner ətirlərini brendə, nota və üsluba görə filtr edin və sizin üçün uyğun qoxunu seçin.",
  keywords: buildAzeriPageKeywords([
    "ətir kataloqu",
    "ətir filter",
    "brendə görə ətir",
    "nota görə ətir",
    "ətir qiymətləri",
    "ətir seçimi",
  ]),
  alternates: {
    canonical: "/catalog",
  },
};

type CatalogPageProps = {
  searchParams: Promise<{ brand?: string; q?: string; note?: string; min?: string; max?: string }>;
};

function parsePriceParam(value: string | undefined): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed);
}

function noteLabelFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const perfumes = await getPerfumes();
  const { brand, q, note, min, max } = await searchParams;
  const normalizedBrand = brand?.trim().toLowerCase();
  const initialQuery = typeof q === "string" ? q.trim() : "";
  const normalizedNote = typeof note === "string" ? note.trim().toLowerCase() : "";
  const initialMinPrice = parsePriceParam(min);
  const initialMaxPrice = parsePriceParam(max);
  const initialBrand =
    perfumes.find((perfume) => perfume.brand.toLowerCase() === normalizedBrand)?.brand ??
    "all";

  const noteType: "top" | "heart" | "base" | null = normalizedNote
    ? perfumes.some((perfume) => perfume.noteSlugs.top.includes(normalizedNote))
      ? "top"
      : perfumes.some((perfume) => perfume.noteSlugs.heart.includes(normalizedNote))
        ? "heart"
        : perfumes.some((perfume) => perfume.noteSlugs.base.includes(normalizedNote))
          ? "base"
          : null
    : null;

  const lockedNoteFilter =
    noteType && normalizedNote
      ? {
          slug: normalizedNote,
          type: noteType,
          label: noteLabelFromSlug(normalizedNote),
        }
      : undefined;

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="max-w-[12ch] text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:max-w-[16ch] md:text-7xl">
                {t.catalogPage.title}
              </h1>
            </div>
            <p className="max-w-sm text-sm leading-6 text-zinc-500 sm:text-base md:text-lg">
              {t.catalogPage.description}
            </p>
          </div>
        </section>

        <section className="mt-7 rounded-[1.8rem] border border-zinc-200/80 bg-white/84 p-5 shadow-[0_12px_30px_rgba(22,22,24,0.05)] sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Quick SEO Paths</p>
              <h2 className="mt-2 text-2xl leading-tight text-zinc-900 md:text-3xl">Niyyətə uyğun keçidlər</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {CORE_CLUSTER_PAGES.map((cluster) => (
                <Link
                  key={cluster.href}
                  href={cluster.href}
                  className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400"
                >
                  {cluster.title}
                </Link>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {BLOG_ARTICLES.slice(0, 6).map((article) => (
                <Link
                  key={article.slug}
                  href={`/blog/${article.slug}`}
                  className="rounded-xl border border-zinc-200/80 bg-white px-3 py-3 text-sm text-zinc-700 transition hover:border-zinc-300"
                >
                  {article.title}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {TRUST_PAGES.slice(0, 3).map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400"
                >
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <CatalogClient
          perfumes={perfumes}
          lockedNoteFilter={lockedNoteFilter}
          initialBrand={initialBrand}
          initialQuery={initialQuery}
          initialMinPrice={initialMinPrice}
          initialMaxPrice={initialMaxPrice}
          locale={locale}
        />
      </main>

      <Footer locale={locale} />
    </div>
  );
}
