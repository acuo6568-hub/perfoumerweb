import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { toLocalePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates, slugifyPathSegment } from "@/lib/seo";
import { applySiteBranding } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";

type BrandPageProps = {
  params: Promise<{ slug: string }>;
};

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function findBrandPerfumes(perfumes: Awaited<ReturnType<typeof getPerfumes>>, slug: string) {
  return perfumes.filter((perfume) => slugifyPathSegment(perfume.brand) === slug);
}

function getBrandLabel(perfumes: Awaited<ReturnType<typeof getPerfumes>>, slug: string) {
  const match = perfumes.find((perfume) => slugifyPathSegment(perfume.brand) === slug);
  return match?.brand ?? titleCase(slug.replace(/-/g, " "));
}

function minPrice(perfume: Awaited<ReturnType<typeof getPerfumes>>[number]) {
  const min = perfume.sizes.reduce((acc, size) => Math.min(acc, size.price), Number.POSITIVE_INFINITY);
  return Number.isFinite(min) ? min : Number.POSITIVE_INFINITY;
}

function formatBrandStats(brandPerfumes: Awaited<ReturnType<typeof getPerfumes>>) {
  const inStockCount = brandPerfumes.filter((item) => item.inStock).length;
  const withPrice = brandPerfumes.map((item) => minPrice(item)).filter((value) => Number.isFinite(value));
  const low = withPrice.length ? Math.min(...withPrice) : 0;
  const high = withPrice.length ? Math.max(...withPrice) : 0;

  return {
    inStockCount,
    low,
    high,
  };
}

export async function generateStaticParams() {
  const perfumes = await getPerfumes();
  const brandSlugs = new Set(perfumes.map((perfume) => slugifyPathSegment(perfume.brand)).filter(Boolean));

  return Array.from(brandSlugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const perfumes = await getPerfumes();
  const brandPerfumes = findBrandPerfumes(perfumes, slug);

  if (!brandPerfumes.length) {
    return {
      title: "Brend tapılmadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const brandLabel = getBrandLabel(perfumes, slug);
  const canonicalPath = `/brands/${slug}`;
  const titleByLocale = {
    az: `${brandLabel} ətirləri`,
    en: `${brandLabel} perfumes`,
    ru: `Ароматы ${brandLabel}`,
  } as const;

  const descriptionByLocale = {
    az: `Perfoumer-də ${brandLabel} ətirlərini kəşf edin və bu brendin ən uyğun seçimlərini bir yerdə görün.`,
    en: `Discover ${brandLabel} perfumes on Perfoumer and browse the brand's best matching scents in one place.`,
    ru: `Ознакомьтесь с ароматами ${brandLabel} на Perfoumer и посмотрите лучшие варианты бренда в одном месте.`,
  } as const;

  return {
    title: titleByLocale[locale],
    description: applySiteBranding(descriptionByLocale[locale], settings),
    keywords: buildAzeriPageKeywords([
      `${brandLabel} ətirləri`,
      `${brandLabel} parfum`,
      `brend ${brandLabel}`,
      `${brandLabel} qiymətləri`,
    ]),
    alternates: buildLocaleAlternates(canonicalPath, locale),
    openGraph: {
      title: titleByLocale[locale],
      description: applySiteBranding(descriptionByLocale[locale], settings),
      url: absoluteUrlForLocale(canonicalPath, locale),
      type: "website",
    },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const t = getDictionary(locale, settings);
  const perfumes = await getPerfumes();
  const brandPerfumes = findBrandPerfumes(perfumes, slug);

  if (!brandPerfumes.length) {
    notFound();
  }

  const brandLabel = getBrandLabel(perfumes, slug);
  const allBrandPerfumes = [...brandPerfumes].sort((a, b) => {
    if (a.inStock !== b.inStock) {
      return a.inStock ? -1 : 1;
    }

    return minPrice(a) - minPrice(b);
  });
  const stats = formatBrandStats(brandPerfumes);

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: applySiteBranding(`${brandLabel} perfumes`, settings),
    itemListElement: allBrandPerfumes.map((perfume, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrlForLocale(`/perfumes/${perfume.slug}`, locale),
      name: `${perfume.brand} ${perfume.name}`,
    })),
  };

  return (
    <div className="bg-[#f3f3f2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }} />

      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-zinc-500">{t.brandsPage.eyebrow}</p>
              <h1 className="max-w-[14ch] text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:max-w-[16ch] md:text-7xl">
                {brandLabel} {locale === "ru" ? "ароматы" : locale === "en" ? "perfumes" : "ətirləri"}
              </h1>
            </div>
            <div className="max-w-md space-y-2 text-sm leading-6 text-zinc-500 sm:text-base md:text-lg">
              <p>
                {locale === "az"
                  ? `${brandLabel} üçün topladığımız bu səhifə not, istifadə mühiti və performans baxımından daha doğru seçim etməyiniz üçün hazırlanıb.`
                  : locale === "ru"
                    ? `Эта страница собрана для более точного выбора ароматов ${brandLabel} по нотам, сценарию использования и стойкости.`
                    : `This page is built to help you choose the right ${brandLabel} scents by notes, usage context, and performance.`}
              </p>
              <p className="text-sm text-zinc-400">
                {brandPerfumes.length} məhsul • stokda {stats.inStockCount} • {stats.low ? `${stats.low} ₼` : "-"} - {stats.high ? `${stats.high} ₼` : "-"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3 border-b border-zinc-200/80 pb-4">
            <h2 className="text-3xl leading-tight text-zinc-900 md:text-4xl">
              {locale === "az"
                ? `${brandLabel} məhsullarının tam siyahısı`
                : locale === "ru"
                  ? `Полный список ароматов ${brandLabel}`
                  : `Full ${brandLabel} product list`}
            </h2>
            <Link href={toLocalePath("/catalog", locale)} className="text-sm text-zinc-500 transition hover:text-zinc-900">
              Kataloqda davam et
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {allBrandPerfumes.map((perfume) => (
              <ProductCard key={perfume.id} perfume={perfume} locale={locale} sourceUrlOverride={`/brands/${slug}`} />
            ))}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
