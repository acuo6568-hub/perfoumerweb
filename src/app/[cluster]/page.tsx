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
import { absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";

type ClusterRouteProps = {
  params: Promise<{ cluster: string }>;
};

export const dynamicParams = false;

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
        name: page.title,
        item: absoluteUrlForLocale(page.href, locale),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <ClusterLandingPage locale={locale} cluster={page} perfumes={curatedPerfumes} articles={relatedArticles} />
    </>
  );
}
