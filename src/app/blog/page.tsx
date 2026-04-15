import Link from "next/link";
import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { BLOG_ARTICLES, CORE_CLUSTER_PAGES, WEEKLY_GSC_CALENDAR } from "@/lib/seo-growth";
import { buildAzeriPageKeywords } from "@/lib/seo";
import { getCurrentLocale } from "@/lib/i18n.server";

export const metadata: Metadata = {
  title: "Blog və Kampaniyalar",
  description:
    "Ətir seçimi, not analizi, mövsümi kampaniyalar və alış bələdçiləri üzrə Azərbaycan dilində faydalı məqalələr.",
  keywords: buildAzeriPageKeywords([
    "ətir blogu",
    "ətir kampaniyaları",
    "ətir seçimi bələdçisi",
    "ətir məqalələri azərbaycan",
    "ətir müqayisəsi",
  ]),
  alternates: {
    canonical: "/blog",
  },
};

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export default async function BlogHubPage() {
  const locale = await getCurrentLocale();
  const featured = BLOG_ARTICLES.slice(0, 8);
  const campaigns = BLOG_ARTICLES.filter((item) => item.category === "campaign").slice(0, 8);
  const guides = BLOG_ARTICLES.filter((item) => item.category !== "campaign").slice(0, 18);
  const calendarPreview = WEEKLY_GSC_CALENDAR.slice(0, 12);

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <p className="text-sm text-zinc-500">Content Hub</p>
          <h1 className="mt-2 max-w-[14ch] text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:text-7xl">
            Blog və kampaniya mərkəzi
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500 md:text-base">
            Axtarış niyyətinə uyğun hazırlanmış bələdçilər, müqayisələr və mövsümi kampaniyalarla doğru ətiri daha tez tapın.
          </p>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200/80 bg-white/85 p-6 md:p-8">
          <div className="flex items-end justify-between gap-4 border-b border-zinc-200/80 pb-4">
            <h2 className="text-3xl leading-tight text-zinc-900 md:text-4xl">Önə çıxan məqalələr</h2>
            <span className="text-xs tracking-[0.15em] text-zinc-400 uppercase">{BLOG_ARTICLES.length} məqalə</span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {featured.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="rounded-2xl border border-zinc-200/75 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(22,22,24,0.04)] transition hover:-translate-y-0.5 hover:border-zinc-300"
              >
                <p className="text-xs tracking-[0.12em] text-zinc-400 uppercase">{article.intent}</p>
                <h3 className="mt-1 text-lg leading-snug text-zinc-900">{article.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{article.description}</p>
                <p className="mt-3 text-xs text-zinc-400">{formatDate(article.publishedAt)}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 md:p-8">
            <h2 className="text-2xl text-zinc-900 md:text-3xl">Bələdçi və müqayisə yazıları</h2>
            <div className="mt-5 space-y-3">
              {guides.map((article) => (
                <Link key={article.slug} href={`/blog/${article.slug}`} className="block rounded-xl border border-zinc-200/75 bg-white px-4 py-3 transition hover:border-zinc-300">
                  <p className="text-sm font-medium text-zinc-900">{article.title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{article.description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 md:p-8">
            <h2 className="text-2xl text-zinc-900 md:text-3xl">Mövsümi kampaniya yazıları</h2>
            <div className="mt-5 space-y-3">
              {campaigns.map((article) => (
                <Link key={article.slug} href={`/blog/${article.slug}`} className="block rounded-xl border border-zinc-200/75 bg-white px-4 py-3 transition hover:border-zinc-300">
                  <p className="text-sm font-medium text-zinc-900">{article.title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{article.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200/80 bg-[linear-gradient(132deg,rgba(255,255,255,0.93)_0%,rgba(245,247,250,0.9)_100%)] p-6 md:p-8">
          <h2 className="text-2xl text-zinc-900 md:text-3xl">Core landing səhifələrə keçid</h2>
          <div className="mt-4 flex flex-wrap gap-2">
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
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200/80 pb-4">
            <div>
              <h2 className="text-2xl text-zinc-900 md:text-3xl">Həftəlik GSC query-cluster publishing planı</h2>
              <p className="mt-2 text-sm text-zinc-500">Məqalələr həftə-həftə axtarış niyyəti klasterlərinə uyğun sıraya salınıb.</p>
            </div>
            <span className="text-xs tracking-[0.14em] text-zinc-400 uppercase">{WEEKLY_GSC_CALENDAR.length} həftə</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {calendarPreview.map((slot) => (
              <article key={`${slot.week}-${slot.articleSlug}`} className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3">
                <p className="text-xs tracking-[0.12em] text-zinc-400 uppercase">{slot.week} • {slot.gscQueryCluster}</p>
                <Link href={`/blog/${slot.articleSlug}`} className="mt-1 block text-sm font-medium text-zinc-900 transition hover:text-zinc-700">
                  {slot.articleTitle}
                </Link>
                <p className="mt-1 text-xs text-zinc-500">Keyword: {slot.primaryKeyword}</p>
              </article>
            ))}
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Tam operational plan repoda saxlanır: docs/seo/editorial-calendar-gsc-clusters.md
          </p>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
