import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Storefront, User } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@supabase/supabase-js";

import { DetailAccordion } from "@/components/DetailAccordion";
import { DetailBackButton } from "@/components/DetailBackButton";
import { Footer } from "@/components/Footer";
import { NoteGroup } from "@/components/NoteGroup";
import { ProductInfoModalButton } from "@/components/ProductInfoModalButton";
import { ProductCard } from "@/components/ProductCard";
import { ScrollToTopOnMount } from "@/components/ScrollToTopOnMount";
import { PerfumeCommentsSection } from "@/components/community/PerfumeCommentsSection";
import { PerfumeImpressionPanel } from "@/components/community/PerfumeImpressionPanel";
import { PerfumeScentSummaryPanel } from "@/components/community/PerfumeScentSummaryPanel";
import { PerfumeWishlistButton } from "@/components/community/PerfumeWishlistButton";
import { PerfumeHeroCover } from "@/components/perfume/PerfumeHeroCover";
import { PerfumePurchasePanel } from "@/components/perfume/PerfumePurchasePanel";
import { PerfumeShareButton } from "@/components/perfume/PerfumeShareButton";
import { PerfumeVariantStrip } from "@/components/perfume/PerfumeVariantStrip";
import { getPerfumeBySlug, getPerfumes, getRelatedPerfumes, getSimilarPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { toLocalePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import {
  formatDiscountDeadlineLabel,
  resolveDiscountedSizePrice,
  resolvePerfumeCardPrice,
} from "@/lib/discounts";
import { BLOG_ARTICLES, CORE_CLUSTER_PAGES, TRUST_PAGES } from "@/lib/seo-growth";
import {
  SITE_URL,
  absoluteUrl,
  absoluteUrlForLocale,
  buildAzeriPageKeywords,
  buildLocaleAlternates,
} from "@/lib/seo";
import { slugifyPathSegment } from "@/lib/seo";
import { applySiteBranding } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

type PerfumeDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ v?: string | string[] }>;
};

type ProductCommentRow = {
  rating?: number | null;
  comment?: string | null;
  created_at?: string | null;
};

export const dynamic = "force-dynamic";

const getVariantId = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function getVariantStartingPrice(perfume: { sizes: { price: number }[] }) {
  return perfume.sizes[0]?.price ?? Number.POSITIVE_INFINITY;
}

function toAbsoluteImageUrl(input: string) {
  if (!input) return absoluteUrl("/perfoumerlogo.png");
  if (/^https?:\/\//i.test(input)) return input;
  return absoluteUrl(input.startsWith("/") ? input : `/${input}`);
}

function pickProductClusterLinks(gender: string, notePool: string) {
  const normalizedGender = gender.toLowerCase();
  const normalizedNotes = notePool.toLowerCase();
  const candidates = new Set<string>();

  if (/men|male|kis|kişi|man|муж/u.test(normalizedGender)) {
    candidates.add("/kisi-etirleri");
  }

  if (/women|female|qad|жен|lady/u.test(normalizedGender)) {
    candidates.add("/qadin-etirleri");
  }

  if (/unisex|uni/u.test(normalizedGender)) {
    candidates.add("/uniseks-etirler");
  }

  if (["oud", "agar", "ud"].some((token) => normalizedNotes.includes(token))) {
    candidates.add("/oud-etirler");
    candidates.add("/qis-etirleri");
  }

  if (["citrus", "bergamot", "lemon", "marine", "aquatic"].some((token) => normalizedNotes.includes(token))) {
    candidates.add("/yay-etirleri");
  }

  if (["vanilla", "amber", "musk", "patchouli", "tonka", "leather"].some((token) => normalizedNotes.includes(token))) {
    candidates.add("/uzunomurlu-etirler");
  }

  candidates.add("/hediyye-etirler");

  return Array.from(candidates).slice(0, 4);
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
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
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
      description: applySiteBranding(
        `${perfume.brand} ${perfume.name} ətiri: ${perfume.gender} üçün notlar, ölçülər və qiymətlər.`,
        settings,
      ),
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
    alternates: buildLocaleAlternates(canonicalPath, locale),
    openGraph: {
      title: `${perfume.name} - ${perfume.brand}`,
      description: applySiteBranding(
        `${perfume.brand} ${perfume.name} ətiri üçün notlar, ölçülər və qiymətlər.`,
        settings,
      ),
      url: absoluteUrlForLocale(canonicalPath, locale),
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
      description: applySiteBranding(
        `${perfume.brand} ${perfume.name} ətiri üçün notlar, ölçülər və qiymətlər.`,
        settings,
      ),
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
  const settings = await getSiteSettings();
  const t = getDictionary(locale, settings);
  const requestHeaders = await headers();
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const variantId = getVariantId(resolvedSearchParams?.v);
  const allPerfumes = await getPerfumes();
  const [perfume, similarPerfumes] = await Promise.all([
    getPerfumeBySlug(slug, variantId),
    getSimilarPerfumes(slug, variantId, 3),
  ]);

  if (!perfume) notFound();

  const userSeed = [
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    requestHeaders.get("user-agent") ?? "",
    requestHeaders.get("accept-language") ?? "",
    locale,
    slug,
  ].join("|");

  const relatedPerfumes = await getRelatedPerfumes(slug, 3, {
    excludeSlugs: similarPerfumes.map((item) => item.slug),
    seed: userSeed,
    diversify: true,
  });

  const shareUrl = absoluteUrlForLocale(
    `/perfumes/${perfume.slug}${variantId ? `?v=${encodeURIComponent(variantId)}` : ""}`,
    locale,
  );
  const canonicalUrl = absoluteUrlForLocale(`/perfumes/${perfume.slug}`, locale);
  const discountedPrices = perfume.sizes.map((size) => resolveDiscountedSizePrice(size, perfume.discount).finalPrice);
  const lowestPrice = discountedPrices.length ? Math.min(...discountedPrices) : undefined;
  const highestPrice = discountedPrices.length ? Math.max(...discountedPrices) : undefined;
  const perfumeOfferPricing = resolvePerfumeCardPrice(perfume);
  const detailDiscountPercent = perfumeOfferPricing.bestSavingsPercent !== null
    ? Math.round(perfumeOfferPricing.bestSavingsPercent)
    : null;
  const detailDiscountDeadlineLabel = formatDiscountDeadlineLabel(perfume.discount, locale);
  const primaryImage = toAbsoluteImageUrl(perfume.image);
  const variants = allPerfumes
    .filter((item) => item.slug === perfume.slug)
    .sort((left, right) => {
      const priceDiff = getVariantStartingPrice(left) - getVariantStartingPrice(right);
      if (priceDiff !== 0) {
        return priceDiff;
      }

      return left.id.localeCompare(right.id);
    });
  const variantCount = variants.length;
  const noteSummary = [
    perfume.notes.top.map((note) => note.name).join(", "),
    perfume.notes.heart.map((note) => note.name).join(", "),
    perfume.notes.base.map((note) => note.name).join(", "),
  ]
    .filter(Boolean)
    .join(". ");
  const productClusterLinks = pickProductClusterLinks(
    perfume.gender,
    [...perfume.noteSlugs.top, ...perfume.noteSlugs.heart, ...perfume.noteSlugs.base].join(" "),
  );
  const relatedClusters = CORE_CLUSTER_PAGES.filter((item) => productClusterLinks.includes(item.href));
  const relatedArticles = BLOG_ARTICLES.filter((item) =>
    item.relatedClusterHrefs.some((href) => productClusterLinks.includes(href)),
  ).slice(0, 6);
  let reviewRows: ProductCommentRow[] = [];

  if (supabaseConfig) {
    const { data } = await createClient(supabaseConfig.url, supabaseConfig.anonKey)
      .from("comments")
      .select("rating,comment,created_at")
      .eq("perfume_slug", perfume.slug)
      .order("created_at", { ascending: false })
      .limit(20);

    reviewRows = Array.isArray(data) ? (data as ProductCommentRow[]) : [];
  }

  const normalizedReviews = reviewRows
    .map((entry) => ({
      rating: Number.isFinite(Number(entry.rating)) ? Math.max(1, Math.min(5, Number(entry.rating))) : 0,
      comment: typeof entry.comment === "string" ? entry.comment.trim() : "",
      createdAt: typeof entry.created_at === "string" ? entry.created_at : "",
    }))
    .filter((entry) => entry.rating > 0);
  const averageRating = normalizedReviews.length
    ? Number(
        (
          normalizedReviews.reduce((total, entry) => total + entry.rating, 0) / normalizedReviews.length
        ).toFixed(1),
      )
    : null;
  const reviewStructuredData = normalizedReviews
    .filter((entry) => entry.comment)
    .slice(0, 3)
    .map((entry) => ({
      "@type": "Review",
      reviewBody: entry.comment,
      datePublished: entry.createdAt || undefined,
      author: {
        "@type": "Person",
        name: `${settings.siteName} customer`,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: entry.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));

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
    seller: {
      "@id": `${SITE_URL}/#store`,
    },
    aggregateRating: averageRating
      ? {
          "@type": "AggregateRating",
          ratingValue: averageRating,
          reviewCount: normalizedReviews.length,
        }
      : undefined,
    review: reviewStructuredData.length ? reviewStructuredData : undefined,
    offers: {
      "@type": "AggregateOffer",
      url: canonicalUrl,
      priceCurrency: "AZN",
      lowPrice: lowestPrice,
      highPrice: highestPrice,
      offerCount: perfume.sizes.length,
      availability: perfume.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
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
        item: absoluteUrlForLocale("/", locale),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Kataloq",
        item: absoluteUrlForLocale("/catalog", locale),
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
            <PerfumeHeroCover
              src={perfume.image}
              alt={perfume.imageAlt || perfume.name}
              mediaScale={(perfume as any).mediaScale}
              mediaScaleByDevice={(perfume as any).mediaScaleByDevice}
            />
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
                href={`/brands/${slugifyPathSegment(perfume.brand)}`}
                className="transition-colors duration-300 md:hover:text-zinc-800"
              >
                {perfume.brand}
              </Link>
            </p>

            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl space-y-3">
                <h1 className="text-[3.8rem] leading-[0.94] tracking-[-0.04em] text-zinc-800 md:text-[5.15rem]">
                  {perfume.name}
                </h1>
                {detailDiscountPercent ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="discount-badge inline-flex items-center rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-white uppercase shadow-[0_14px_30px_rgba(225,29,72,0.28)]">
                      {t.productCard.discountBadge.replace("{percent}", String(detailDiscountPercent))}
                    </div>
                    {detailDiscountDeadlineLabel ? (
                      <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                        {detailDiscountDeadlineLabel}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <PerfumeVariantStrip
                  locale={locale}
                  variants={variants.map((variant) => ({
                    id: variant.id,
                    slug: variant.slug,
                    price: resolvePerfumeCardPrice(variant).finalPrice ?? getVariantStartingPrice(variant),
                  }))}
                  currentVariantId={perfume.id}
                  variantsLabel={t.detail.variants}
                  variantsAvailableLabel={t.detail.variantsAvailable.replace("{count}", String(variantCount))}
                  currentLabel={t.detail.currentVariant}
                />
              </div>

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
              discount={perfume.discount}
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

        <PerfumeImpressionPanel
          perfumeSlug={perfume.slug}
          locale={locale}
          supabase={supabaseConfig}
        />

        <PerfumeCommentsSection perfumeSlug={perfume.slug} locale={locale} supabase={supabaseConfig} />

        {similarPerfumes.length > 0 ? (
          <section className="mt-24">
            <h2 className="text-5xl leading-[0.98] text-zinc-800 md:text-6xl">
              {t.detail.similarProducts}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500 md:text-base">
              {t.detail.similarProductsHint}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
              {similarPerfumes.map((item) => (
                <ProductCard key={item.id} perfume={item} locale={locale} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-24">
          <h2 className="text-5xl leading-[0.98] text-zinc-800 md:text-6xl">
            {t.detail.moreProducts}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500 md:text-base">
            {t.detail.moreProductsHint}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
            {relatedPerfumes.map((item) => (
              <ProductCard key={item.id} perfume={item} locale={locale} />
            ))}
          </div>

          <div className="mt-9 flex justify-center">
            <Link
              href={toLocalePath("/catalog", locale)}
              className="inline-flex min-h-13 items-center justify-center rounded-full border border-zinc-400 bg-transparent px-9 text-lg font-medium text-zinc-700 transition md:hover:bg-white/70"
            >
              {t.detail.otherProducts}
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-200/80 bg-white/78 p-4 shadow-[0_10px_24px_rgba(22,22,24,0.04)] md:p-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Sürətli keçidlər</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {relatedClusters.slice(0, 3).map((cluster) => (
              <Link
                key={cluster.href}
                href={cluster.href}
                className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs text-zinc-700 transition hover:border-zinc-400"
              >
                {cluster.title}
              </Link>
            ))}

            {relatedArticles.slice(0, 3).map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs text-zinc-700 transition hover:border-zinc-400"
              >
                {article.title}
              </Link>
            ))}

            {TRUST_PAGES.slice(0, 2).map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs text-zinc-700 transition hover:border-zinc-400"
              >
                {page.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
