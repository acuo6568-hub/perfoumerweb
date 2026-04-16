import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { BLOG_ARTICLES, CORE_CLUSTER_PAGES, TRUST_PAGES } from "@/lib/seo-growth";
import { absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates, slugifyPathSegment } from "@/lib/seo";

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

function hasBrandNote(perfume: Awaited<ReturnType<typeof getPerfumes>>[number], terms: string[]) {
  const pool = [...perfume.noteSlugs.top, ...perfume.noteSlugs.heart, ...perfume.noteSlugs.base].join(" ").toLowerCase();
  return terms.some((term) => pool.includes(term));
}

function pickCuratedRows(brandPerfumes: Awaited<ReturnType<typeof getPerfumes>>) {
  const sorted = [...brandPerfumes].sort((a, b) => {
    if (a.inStock !== b.inStock) {
      return a.inStock ? -1 : 1;
    }

    return minPrice(a) - minPrice(b);
  });

  const signature = sorted.slice(0, 6);
  const longLasting = sorted.filter((item) => hasBrandNote(item, ["oud", "amber", "musk", "patchouli", "vanilla", "tonka"]))
    .slice(0, 6);
  const giftReady = sorted.filter((item) => item.inStock && item.sizes.length > 0).slice(0, 6);

  return {
    signature,
    longLasting: longLasting.length ? longLasting : signature,
    giftReady: giftReady.length ? giftReady : signature,
  };
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
    description: descriptionByLocale[locale],
    keywords: buildAzeriPageKeywords([
      `${brandLabel} ətirləri`,
      `${brandLabel} parfum`,
      `brend ${brandLabel}`,
      `${brandLabel} qiymətləri`,
    ]),
    alternates: buildLocaleAlternates(canonicalPath, locale),
    openGraph: {
      title: titleByLocale[locale],
      description: descriptionByLocale[locale],
      url: absoluteUrlForLocale(canonicalPath, locale),
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
  const curated = pickCuratedRows(brandPerfumes);
  const stats = formatBrandStats(brandPerfumes);
  const relatedArticles = BLOG_ARTICLES.filter((item) =>
    item.relatedClusterHrefs.some((href) => ["/kisi-etirleri", "/qadin-etirleri", "/uniseks-etirler", "/hediyye-etirler"].includes(href)),
  ).slice(0, 6);

  const faqItems = [
    {
      question: `${brandLabel} ətirləri kimlər üçün daha uyğundur?`,
      answer: `${brandLabel} kolleksiyasında gündəlik istifadə, ofis və axşam üçün fərqli profillər var. Seçim istifadə məqsədi və not üstünlüyünə görə dəyişir.`,
    },
    {
      question: `${brandLabel} üçün hədiyyə seçəndə hansı istiqamət risksizdir?`,
      answer: "Daha universal və balanslı not ailələrinə üstünlük vermək, xüsusilə çiçəkli-sitrus və ya yüngül odunsu istiqamət seçmək daha təhlükəsizdir.",
    },
    {
      question: `${brandLabel} ətirlərində qalıcılıq necə dəyişir?`,
      answer: "Qalıcılıq baza notları, dəri tipi və tətbiq texnikasından asılıdır. Amber, müşk və oud kimi baza notları daha uzun performans verir.",
    },
  ];

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${brandLabel} perfumes`,
    itemListElement: curated.signature.map((perfume, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrlForLocale(`/perfumes/${perfume.slug}`, locale),
      name: `${perfume.brand} ${perfume.name}`,
    })),
  };

  return (
    <div className="bg-[#f3f3f2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
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

        <section className="mt-7 rounded-[1.8rem] border border-zinc-200/80 bg-white/84 p-5 shadow-[0_12px_30px_rgba(22,22,24,0.05)] sm:p-6">
          <h2 className="text-2xl leading-tight text-zinc-900 md:text-3xl">{brandLabel} üçün faydalı keçidlər</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {CORE_CLUSTER_PAGES.slice(0, 8).map((cluster) => (
              <Link
                key={cluster.href}
                href={cluster.href}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400"
              >
                {cluster.title}
              </Link>
            ))}
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {relatedArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="rounded-xl border border-zinc-200/80 bg-white px-3 py-3 text-sm text-zinc-700 transition hover:border-zinc-300"
              >
                {article.title}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3 border-b border-zinc-200/80 pb-4">
            <h2 className="text-3xl leading-tight text-zinc-900 md:text-4xl">Signature seçimlər</h2>
            <Link href="/catalog" className="text-sm text-zinc-500 transition hover:text-zinc-900">
              Kataloqda davam et
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {curated.signature.map((perfume) => (
              <ProductCard key={perfume.id} perfume={perfume} locale={locale} sourceUrlOverride={`/brands/${slug}`} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article>
            <h2 className="text-3xl leading-tight text-zinc-900 md:text-4xl">Uzunömürlü {brandLabel} seçimləri</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {curated.longLasting.map((perfume) => (
                <ProductCard key={perfume.id} perfume={perfume} locale={locale} sourceUrlOverride={`/brands/${slug}`} />
              ))}
            </div>
          </article>

          <article>
            <h2 className="text-3xl leading-tight text-zinc-900 md:text-4xl">Hədiyyə üçün uyğun {brandLabel}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {curated.giftReady.map((perfume) => (
                <ProductCard key={perfume.id} perfume={perfume} locale={locale} sourceUrlOverride={`/brands/${slug}`} />
              ))}
            </div>
          </article>
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-200/75 bg-[linear-gradient(138deg,#1f2127_0%,#2f333d_100%)] p-6 text-white shadow-[0_22px_42px_rgba(8,8,12,0.24)] md:p-8">
          <h2 className="text-3xl leading-tight md:text-4xl">{brandLabel} haqqında tez-tez verilən suallar</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <h3 className="text-base font-semibold text-zinc-100">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.answer}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {TRUST_PAGES.slice(0, 4).map((page) => (
              <Link key={page.href} href={page.href} className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-sm text-zinc-100 transition hover:bg-white/12">
                {page.label}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
