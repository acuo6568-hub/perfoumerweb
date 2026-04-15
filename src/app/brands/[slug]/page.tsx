import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { absoluteUrl, buildAzeriPageKeywords, slugifyPathSegment } from "@/lib/seo";

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

export async function generateStaticParams() {
  const perfumes = await getPerfumes();
  const brandSlugs = new Set(perfumes.map((perfume) => slugifyPathSegment(perfume.brand)).filter(Boolean));

  return Array.from(brandSlugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
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
    description: descriptionByLocale[locale],
    keywords: buildAzeriPageKeywords([
      `${brandLabel} ətirləri`,
      `${brandLabel} parfum`,
      `brend ${brandLabel}`,
      `${brandLabel} qiymətləri`,
    ]),
    alternates: {
      canonical: `/brands/${slug}`,
    },
    openGraph: {
      title: titleByLocale[locale],
      description: descriptionByLocale[locale],
      url: absoluteUrl(`/brands/${slug}`),
      type: "website",
    },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const perfumes = await getPerfumes();
  const brandPerfumes = findBrandPerfumes(perfumes, slug);

  if (!brandPerfumes.length) {
    notFound();
  }

  const brandLabel = getBrandLabel(perfumes, slug);

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-zinc-500">{t.brandsPage.eyebrow}</p>
              <h1 className="max-w-[14ch] text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:max-w-[16ch] md:text-7xl">
                {brandLabel} {locale === "ru" ? "ароматы" : locale === "en" ? "perfumes" : "ətirləri"}
              </h1>
            </div>
            <p className="max-w-sm text-sm leading-6 text-zinc-500 sm:text-base md:text-lg">
              {locale === "az"
                ? `${brandLabel} brendinin seçilmiş ətirlərini görün, notlarını müqayisə edin və kataloqda daha dar seçimə keçin.`
                : locale === "ru"
                  ? `Посмотрите отобранные ароматы бренда ${brandLabel}, сравните ноты и перейдите к более точному выбору в каталоге.`
                  : `Browse selected ${brandLabel} perfumes, compare notes, and move into a more focused catalog search.`}
            </p>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {brandPerfumes.map((perfume) => (
            <ProductCard key={perfume.id} perfume={perfume} locale={locale} />
          ))}
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
