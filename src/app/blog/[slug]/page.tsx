import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import {
  BLOG_ARTICLES,
  CORE_CLUSTER_PAGES,
  getBlogArticleBySlug,
} from "@/lib/seo-growth";
import { absoluteUrl, buildAzeriPageKeywords } from "@/lib/seo";
import { getCurrentLocale } from "@/lib/i18n.server";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return BLOG_ARTICLES.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
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
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: absoluteUrl(`/blog/${article.slug}`),
    },
  };
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "long", year: "numeric" }).format(date);
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

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: `${article.publishedAt}T09:00:00+04:00`,
    dateModified: `${article.publishedAt}T09:00:00+04:00`,
    inLanguage: "az",
    mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`),
    author: {
      "@type": "Organization",
      name: "Perfoumer",
    },
    publisher: {
      "@type": "Organization",
      name: "Perfoumer",
    },
  };

  return (
    <div className="bg-[#f3f3f2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }} />

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
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl leading-tight text-zinc-900 md:text-3xl">{section.heading}</h2>
                <p className="mt-2 text-base leading-8 text-zinc-700">{section.content}</p>
              </section>
            ))}
          </div>

          <section className="mt-10 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-5">
            <h2 className="text-xl text-zinc-900 md:text-2xl">Tez-tez verilən suallar</h2>
            <div className="mt-4 space-y-3">
              {article.faq.map((item) => (
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
