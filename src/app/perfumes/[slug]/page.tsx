import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront, User } from "@phosphor-icons/react/dist/ssr";

import { DetailAccordion } from "@/components/DetailAccordion";
import { DetailBackButton } from "@/components/DetailBackButton";
import { Footer } from "@/components/Footer";
import { NoteGroup } from "@/components/NoteGroup";
import { ProductInfoModalButton } from "@/components/ProductInfoModalButton";
import { ProductCard } from "@/components/ProductCard";
import { ScrollToTopOnMount } from "@/components/ScrollToTopOnMount";
import { PerfumeCommentsSection } from "@/components/community/PerfumeCommentsSection";
import { PerfumeScentSummaryPanel } from "@/components/community/PerfumeScentSummaryPanel";
import { PerfumeWishlistButton } from "@/components/community/PerfumeWishlistButton";
import { PerfumeHeroCover } from "@/components/perfume/PerfumeHeroCover";
import { PerfumePurchasePanel } from "@/components/perfume/PerfumePurchasePanel";
import { PerfumeShareButton } from "@/components/perfume/PerfumeShareButton";
import { getPerfumeBySlug, getPerfumes, getRelatedPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { absoluteUrl, buildAzeriPageKeywords } from "@/lib/seo";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

type PerfumeDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ v?: string | string[] }>;
};

const getVariantId = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function toAbsoluteImageUrl(input: string) {
  if (!input) return absoluteUrl("/perfoumerlogo.png");
  if (/^https?:\/\//i.test(input)) return input;
  return absoluteUrl(input.startsWith("/") ? input : `/${input}`);
}

export async function generateStaticParams() {
  const perfumes = await getPerfumes();
  return Array.from(new Set(perfumes.map((perfume) => perfume.slug))).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: PerfumeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const perfume = await getPerfumeBySlug(slug, getVariantId(resolvedSearchParams?.v));

  if (!perfume) {
    return {
      title: "Məhsul tapılmadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalPath = `/perfumes/${perfume.slug}`;
  const perfumePreviewImage = perfume.image || absoluteUrl("/perfoumerlogo.png");
  return {
    title: `${perfume.name} - ${perfume.brand}`,
    description: `${perfume.brand} ${perfume.name} ətiri: ${perfume.gender} üçün notlar, ölçülər və qiymətlər.`,
    keywords: buildAzeriPageKeywords([
      `${perfume.name} ətri`,
      `${perfume.brand} ətri`,
      `${perfume.brand} parfum`,
      `${perfume.gender} ətri`,
      `${perfume.name} qiyməti`,
      `${perfume.name} notları`,
      "ətir ölçüləri",
      "ətir sifarişi",
    ]),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${perfume.name} - ${perfume.brand}`,
      description: `${perfume.brand} ${perfume.name} ətiri üçün notlar, ölçülər və qiymətlər.`,
      url: absoluteUrl(canonicalPath),
      images: [
        {
          url: perfumePreviewImage,
          alt: perfume.imageAlt || perfume.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${perfume.name} - ${perfume.brand}`,
      description: `${perfume.brand} ${perfume.name} ətiri üçün notlar, ölçülər və qiymətlər.`,
      images: [perfumePreviewImage],
    },
  };
}

export default async function PerfumeDetailPage({
  params,
  searchParams,
}: PerfumeDetailPageProps) {
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const variantId = getVariantId(resolvedSearchParams?.v);
  const [perfume, relatedPerfumes] = await Promise.all([
    getPerfumeBySlug(slug, variantId),
    getRelatedPerfumes(slug),
  ]);

  if (!perfume) notFound();

  const shareUrl = absoluteUrl(`/perfumes/${perfume.slug}${variantId ? `?v=${encodeURIComponent(variantId)}` : ""}`);
  const canonicalUrl = absoluteUrl(`/perfumes/${perfume.slug}`);
  const lowestPrice = perfume.sizes.length ? Math.min(...perfume.sizes.map((size) => size.price)) : undefined;
  const highestPrice = perfume.sizes.length ? Math.max(...perfume.sizes.map((size) => size.price)) : undefined;
  const primaryImage = toAbsoluteImageUrl(perfume.image);
  const noteSummary = [
    perfume.notes.top.map((note) => note.name).join(", "),
    perfume.notes.heart.map((note) => note.name).join(", "),
    perfume.notes.base.map((note) => note.name).join(", "),
  ]
    .filter(Boolean)
    .join(". ");

  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${perfume.brand} ${perfume.name}`,
    image: [primaryImage],
    description: noteSummary || `${perfume.brand} ${perfume.name} perfume details and available sizes.`,
    brand: {
      "@type": "Brand",
      name: perfume.brand,
    },
    sku: perfume.id,
    category: "Perfume",
    url: canonicalUrl,
    offers: {
      "@type": "AggregateOffer",
      url: canonicalUrl,
      priceCurrency: "AZN",
      lowPrice: lowestPrice,
      highPrice: highestPrice,
      offerCount: perfume.sizes.length,
      availability: perfume.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana səhifə",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Kataloq",
        item: absoluteUrl("/catalog"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${perfume.brand} ${perfume.name}`,
        item: canonicalUrl,
      },
    ],
  };

  const detailSections = [
    {
      title: t.detail.about,
      content: t.detail.aboutText,
    },
    {
      title: t.detail.delivery,
      content: t.detail.deliveryText,
    },
    {
      title: t.detail.returns,
      content: t.detail.returnsText,
    },
  ];

  return (
    <div className="detail-page-enter bg-[#f3f3f2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <ScrollToTopOnMount />
      <div className="mx-auto max-w-[1540px] px-6 pt-2 sm:pt-4 md:px-10">
        <div className="hidden xl:flex xl:pb-5">
          <DetailBackButton locale={locale} />
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.98fr_1fr] xl:gap-12 xl:items-start">
          <div className="self-start xl:sticky xl:top-32">
            <PerfumeHeroCover src={perfume.image} alt={perfume.imageAlt || perfume.name} />
          </div>

          <div className="space-y-6">
            <div className="xl:hidden">
              <DetailBackButton locale={locale} />
            </div>

            <p className="flex flex-wrap items-center gap-2 text-[1.05rem] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Storefront size={16} weight="fill" className="text-zinc-500" />
                {t.detail.store}
              </span>
              <span>|</span>
              <Link
                href={`/catalog?brand=${encodeURIComponent(perfume.brand)}`}
                className="transition-colors duration-300 md:hover:text-zinc-800"
              >
                {perfume.brand}
              </Link>
            </p>

            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
              <h1 className="max-w-3xl text-[3.8rem] leading-[0.94] tracking-[-0.04em] text-zinc-800 md:text-[5.15rem]">
                {perfume.name}
              </h1>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
                <PerfumeWishlistButton
                  perfumeSlug={perfume.slug}
                  locale={locale}
                  supabase={supabaseConfig}
                />
                <PerfumeShareButton
                  locale={locale}
                  title={`${perfume.brand} ${perfume.name}`}
                  url={shareUrl}
                />
              </div>
            </div>

            <p className="mt-3 flex items-center gap-2 text-lg text-zinc-500">
              <User size={18} weight="fill" className="text-zinc-500" />
              <span>
                {perfume.gender} <span className="text-zinc-400">{t.detail.perfume}</span>
              </span>
            </p>

            <PerfumePurchasePanel
              locale={locale}
              perfumeSlug={perfume.slug}
              perfumeName={`${perfume.brand} ${perfume.name}`}
              variantId={variantId}
              sizes={perfume.sizes}
              supabase={supabaseConfig}
            />

            <div className="rounded-[1.95rem] bg-white/96 p-6 shadow-[0_20px_54px_rgba(24,24,24,0.05)] ring-1 ring-zinc-200/80 md:p-8">
              <div className="space-y-8">
                <NoteGroup title={t.detail.topNotes} notes={perfume.notes.top} locale={locale} />
                <NoteGroup title={t.detail.heartNotes} notes={perfume.notes.heart} locale={locale} />
                <NoteGroup title={t.detail.baseNotes} notes={perfume.notes.base} locale={locale} />
              </div>
            </div>

            <div className="space-y-6 pb-2">
              <ProductInfoModalButton locale={locale} />

              <div id="detail-sections">
                <DetailAccordion items={detailSections} />
              </div>
            </div>
          </div>
        </div>

        <PerfumeScentSummaryPanel
          perfumeSlug={perfume.slug}
          locale={locale}
          supabase={supabaseConfig}
        />

        <PerfumeCommentsSection perfumeSlug={perfume.slug} locale={locale} supabase={supabaseConfig} />

        <section className="mt-24">
          <h2 className="text-5xl leading-[0.98] text-zinc-800 md:text-6xl">
            {t.detail.moreProducts}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500 md:text-base">
            {t.detail.moreProductsHint}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {relatedPerfumes.map((item) => (
              <ProductCard key={item.id} perfume={item} locale={locale} />
            ))}
          </div>

          <div className="mt-9 flex justify-center">
            <Link
              href="/catalog"
              className="inline-flex min-h-13 items-center justify-center rounded-full border border-zinc-400 bg-transparent px-9 text-lg font-medium text-zinc-700 transition md:hover:bg-white/70"
            >
              {t.detail.otherProducts}
            </Link>
          </div>
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
