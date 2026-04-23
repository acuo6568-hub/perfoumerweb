import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClusterLandingPage } from "@/components/seo/ClusterLandingPage";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import {
  BLOG_ARTICLES,
  CORE_CLUSTER_PAGES,
  getClusterByPath,
  pickClusterPerfumes,
} from "@/lib/seo-growth";
import { absoluteUrl, absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";

type ClusterRouteProps = {
  params: Promise<{ cluster: string }>;
};

export const dynamicParams = false;

function toAbsoluteImageUrl(input: string) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return absoluteUrl(input.startsWith("/") ? input : `/${input}`);
}

export async function generateStaticParams() {
  return CORE_CLUSTER_PAGES.map((item) => ({
    cluster: item.href.replace(/^\//, ""),
  }));
}

export async function generateMetadata({ params }: ClusterRouteProps): Promise<Metadata> {
  const { cluster } = await params;
  const locale = await getCurrentLocale();
  const page = getClusterByPath(`/${cluster}`);

  if (!page) {
    return {
      title: "Səhifə tapılmadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: page.metaTitle,
    description: page.description,
    keywords: buildAzeriPageKeywords(page.keywords),
    alternates: buildLocaleAlternates(page.href, locale),
    openGraph: {
      title: page.metaTitle,
      description: page.description,
      type: "website",
      url: absoluteUrlForLocale(page.href, locale),
    },
  };
}

export default async function ClusterRoutePage({ params }: ClusterRouteProps) {
  const { cluster } = await params;
  const locale = await getCurrentLocale();
  const page = getClusterByPath(`/${cluster}`);

  if (!page) {
    notFound();
  }

  const perfumes = await getPerfumes();
  const curatedPerfumes = pickClusterPerfumes(page.key, perfumes, 18);
  const relatedArticles = BLOG_ARTICLES.filter((item) => item.relatedClusterHrefs.includes(page.href)).slice(0, 9);

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
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
        name: page.title,
        item: absoluteUrlForLocale(page.href, locale),
      },
    ],
  };

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: curatedPerfumes.length,
    itemListElement: curatedPerfumes.slice(0, 12).map((perfume, index) => {
      const lowestPrice = perfume.sizes.length ? Math.min(...perfume.sizes.map((size) => size.price)) : undefined;
      const highestPrice = perfume.sizes.length ? Math.max(...perfume.sizes.map((size) => size.price)) : undefined;

      return {
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrlForLocale(`/perfumes/${perfume.slug}`, locale),
        item: {
          "@type": "Product",
          name: `${perfume.brand} ${perfume.name}`,
          image: perfume.image ? [toAbsoluteImageUrl(perfume.image)] : undefined,
          brand: {
            "@type": "Brand",
            name: perfume.brand,
          },
          offers: lowestPrice !== undefined
            ? {
                "@type": "AggregateOffer",
                priceCurrency: "AZN",
                lowPrice: lowestPrice,
                highPrice: highestPrice,
                offerCount: perfume.sizes.length,
                availability: perfume.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              }
            : undefined,
        },
      };
    }),
  };

  const collectionPageStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.metaTitle,
    description: page.description,
    url: absoluteUrlForLocale(page.href, locale),
    inLanguage: locale,
    about: {
      "@type": "Thing",
      name: page.title,
    },
    mainEntity: {
      "@id": `${absoluteUrlForLocale(page.href, locale)}#itemlist`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...itemListStructuredData,
            "@id": `${absoluteUrlForLocale(page.href, locale)}#itemlist`,
          }),
        }}
      />
      <ClusterLandingPage locale={locale} cluster={page} perfumes={curatedPerfumes} articles={relatedArticles} />
    </>
  );
}
