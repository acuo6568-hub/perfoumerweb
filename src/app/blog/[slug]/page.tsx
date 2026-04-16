import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import {
  BLOG_ARTICLES,
  CORE_CLUSTER_PAGES,
  getBlogArticleBySlug,
} from "@/lib/seo-growth";
import { absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";
import { getCurrentLocale } from "@/lib/i18n.server";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return BLOG_ARTICLES.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    return {
      title: "Məqalə tapılmadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: article.title,
    description: article.description,
    keywords: buildAzeriPageKeywords([article.intent, article.title]),
    alternates: buildLocaleAlternates(`/blog/${article.slug}`, locale),
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: absoluteUrlForLocale(`/blog/${article.slug}`, locale),
    },
  };
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

type EnhancedSection = {
  heading: string;
  content: string;
  bullets?: string[];
};

function buildEnhancedSections(
  sections: Array<{ heading: string; content: string }>,
  clusterLabels: string[],
): EnhancedSection[] {
  return [
    ...sections,
    {
      heading: "Praktik seçim checklist-i",
      content:
        "Aşağıdakı qısa checklist sizə məqalədəki tövsiyələri daha sürətli tətbiq etməyə kömək edir.",
      bullets: [
        "İstifadə ssenarisini dəqiqləşdirin: gündəlik, ofis, axşam və ya tədbir.",
        "2-3 dominant notu müəyyən edin və yalnız həmin istiqamətdə seçim edin.",
        "Mövsüm və hava şəraitinə görə yayılım intensivliyini uyğunlaşdırın.",
        "Qalıcılıq üçün baza notu güclü alternativi ayrıca müqayisə edin.",
      ],
    },
    {
      heading: "Növbəti addım",
      content: clusterLabels.length
        ? `${clusterLabels.join(", ")} kolleksiyalarından birinə keçib məhsul kartlarında not və qiymət müqayisəsi edin, sonra uyğun variantı səbətə əlavə edin.`
        : "İndi uyğun kolleksiyaya keçib məhsul kartlarında not və qiymət müqayisəsi edin, sonra uyğun variantı səbətə əlavə edin.",
    },
  ];
}

function buildEnhancedFaq(
  baseFaq: Array<{ question: string; answer: string }>,
  clusterLabels: string[],
) {
  const additionalFaq = [
    {
      question: "Bu məqaləni oxuduqdan sonra ən doğru növbəti addım nədir?",
      answer:
        "Ən yaxşı addım uyğun kolleksiya səhifəsinə keçib məhsulları not, istifadə məqsədi və qiymətə görə daraltmaqdır. Sonra 2-3 alternativi məhsul səhifəsində müqayisə edin.",
    },
    {
      question: "Məqalədəki tövsiyələr şəxsi dəri tipinə görə dəyişə bilərmi?",
      answer:
        "Bəli. Eyni qoxu fərqli dəri tipində fərqli açılır. Buna görə ilkin seçimi not ailəsinə görə edin və tətbiq dozajını şəxsi komforta görə tənzimləyin.",
    },
  ];

  if (clusterLabels.length) {
    additionalFaq.push({
      question: "Bu mövzu üçün hansı kolleksiya səhifələrinə baxmaq lazımdır?",
      answer: `${clusterLabels.join(", ")} səhifələri bu məqalənin niyyətinə ən yaxın kommersiya kolleksiyalarıdır və qərarı sürətləndirir.`,
    });
  }

  const merged = [...baseFaq, ...additionalFaq];
  return merged.slice(0, 6);
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = BLOG_ARTICLES.filter((item) => item.slug !== article.slug)
    .filter((item) => item.relatedClusterHrefs.some((href) => article.relatedClusterHrefs.includes(href)))
    .slice(0, 8);
  const relatedClusters = CORE_CLUSTER_PAGES.filter((item) => article.relatedClusterHrefs.includes(item.href));
  const relatedClusterLabels = relatedClusters.map((item) => item.title);
  const enhancedSections = buildEnhancedSections(article.sections, relatedClusterLabels);
  const enhancedFaq = buildEnhancedFaq(article.faq, relatedClusterLabels);
  const primaryConversionHref = relatedClusters[0]?.href ?? "/catalog";
  const primaryConversionLabel = relatedClusters[0]?.title ?? "Kataloq";

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: `${article.publishedAt}T09:00:00+04:00`,
    dateModified: `${article.publishedAt}T09:00:00+04:00`,
    inLanguage: locale,
    mainEntityOfPage: absoluteUrlForLocale(`/blog/${article.slug}`, locale),
    author: {
      "@type": "Organization",
      name: "Perfoumer",
    },
    publisher: {
      "@type": "Organization",
      name: "Perfoumer",
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
        name: "Blog",
        item: absoluteUrlForLocale("/blog", locale),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: absoluteUrlForLocale(`/blog/${article.slug}`, locale),
      },
    ],
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: enhancedFaq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="bg-[#f3f3f2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }} />

      <main className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 md:px-8 md:pt-10">
        <article className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_16px_36px_rgba(22,22,24,0.06)] md:p-10">
          <Link href="/blog" className="text-sm text-zinc-500 transition hover:text-zinc-800">
            Bloga qayıt
          </Link>
          <p className="mt-4 text-xs tracking-[0.16em] text-zinc-400 uppercase">{article.intent}</p>
          <h1 className="mt-2 text-[2.2rem] leading-[1] tracking-[-0.02em] text-zinc-900 md:text-5xl">{article.title}</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600 md:text-base">{article.description}</p>
          <p className="mt-4 text-xs text-zinc-400">{formatDate(article.publishedAt)}</p>

          <div className="mt-8 space-y-6">
            {enhancedSections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl leading-tight text-zinc-900 md:text-3xl">{section.heading}</h2>
                <p className="mt-2 text-base leading-8 text-zinc-700">{section.content}</p>
                {section.bullets?.length ? (
                  <ul className="mt-3 space-y-1.5 text-sm leading-6 text-zinc-600">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="rounded-lg border border-zinc-200/70 bg-zinc-50/70 px-3 py-2">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-10 rounded-2xl border border-zinc-200/80 bg-[linear-gradient(138deg,#1f2127_0%,#2f333d_100%)] p-5 text-white">
            <h2 className="text-xl text-zinc-100 md:text-2xl">Nəticəni praktikiya çevirin</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Bu məqaləni oxuduqdan sonra ən yaxşı addım uyğun kolleksiyaya keçib real məhsullar arasında seçim etməkdir.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={primaryConversionHref}
                className="inline-flex items-center rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/18"
              >
                {primaryConversionLabel} kolleksiyasına keç
              </Link>
              <Link
                href="/catalog"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/7 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/12"
              >
                Kataloqda məhsullara bax
              </Link>
              <Link
                href="/qoxunu"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/7 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/12"
              >
                Qoxunu testinə başla
              </Link>
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-5">
            <h2 className="text-xl text-zinc-900 md:text-2xl">Tez-tez verilən suallar</h2>
            <div className="mt-4 space-y-3">
              {enhancedFaq.map((item) => (
                <article key={item.question} className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3">
                  <h3 className="text-sm font-semibold text-zinc-900">{item.question}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </article>

        <section className="mt-8 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 md:p-8">
          <h2 className="text-2xl text-zinc-900 md:text-3xl">Bu məqalə ilə bağlı kolleksiyalar</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedClusters.map((cluster) => (
              <Link key={cluster.href} href={cluster.href} className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
                {cluster.title}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 md:p-8">
          <div className="flex items-end justify-between gap-3 border-b border-zinc-200/80 pb-4">
            <h2 className="text-2xl text-zinc-900 md:text-3xl">Oxşar yazılar</h2>
            <Link href="/blog" className="text-sm text-zinc-500 transition hover:text-zinc-900">
              Hamısına bax
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {relatedArticles.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 transition hover:border-zinc-300"
              >
                <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
