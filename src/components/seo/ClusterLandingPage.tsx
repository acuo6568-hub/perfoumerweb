import Link from "next/link";

import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import type { Locale } from "@/lib/i18n";
import type { ClusterDefinition, ArticleEntry } from "@/lib/seo-growth";
import type { Perfume } from "@/types/catalog";

type ClusterLandingPageProps = {
  locale: Locale;
  cluster: ClusterDefinition;
  perfumes: Perfume[];
  articles: ArticleEntry[];
};

export function ClusterLandingPage({ locale, cluster, perfumes, articles }: ClusterLandingPageProps) {
  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="rounded-[2rem] border border-zinc-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(247,247,244,0.92)_100%)] p-6 shadow-[0_18px_46px_rgba(22,22,24,0.06)] md:p-10">
          <p className="text-[0.72rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{cluster.eyebrow}</p>
          <h1 className="mt-3 max-w-[16ch] text-[2.5rem] leading-[0.95] tracking-[-0.02em] text-zinc-900 sm:text-5xl md:text-7xl">
            {cluster.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600">{cluster.description}</p>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {cluster.bullets.map((bullet) => (
              <article
                key={bullet}
                className="rounded-2xl border border-zinc-200/85 bg-white/90 px-4 py-4 text-sm leading-relaxed text-zinc-600 shadow-[0_10px_24px_rgba(18,18,20,0.04)]"
              >
                {bullet}
              </article>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              href="/catalog"
              className="inline-flex items-center rounded-full border border-zinc-900 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Kataloqa keç
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
            >
              Bələdçi məqalələr
            </Link>
            <Link
              href="/brands"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
            >
              Brendlərə bax
            </Link>
          </div>
        </section>

        <section className="mt-8 border-b border-zinc-200/80 pb-6">
          <h2 className="text-4xl leading-tight tracking-[-0.02em] text-zinc-900 sm:text-5xl">Seçilmiş məhsullar</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500 md:text-base">{cluster.intro}</p>
        </section>

        <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {perfumes.map((perfume) => (
            <ProductCard key={perfume.id} perfume={perfume} locale={locale} sourceUrlOverride={cluster.href} />
          ))}
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-200/75 bg-white/85 p-6 shadow-[0_14px_36px_rgba(22,22,24,0.05)] md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200/70 pb-5">
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Search Intent Hub</p>
              <h2 className="mt-2 text-3xl leading-tight text-zinc-900 md:text-4xl">{cluster.title} üçün bələdçi məqalələr</h2>
            </div>
            <Link href="/blog" className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900">
              Bütün məqalələr
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="rounded-2xl border border-zinc-200/75 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(22,22,24,0.04)] transition hover:-translate-y-0.5 hover:border-zinc-300"
              >
                <p className="text-xs tracking-[0.12em] text-zinc-400 uppercase">{article.category}</p>
                <h3 className="mt-1 text-lg leading-snug text-zinc-900">{article.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{article.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-200/75 bg-[linear-gradient(138deg,#1f2127_0%,#2f333d_100%)] p-6 text-white shadow-[0_22px_42px_rgba(8,8,12,0.24)] md:p-8">
          <h2 className="text-3xl leading-tight md:text-4xl">Tez-tez verilən suallar</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {cluster.faq.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <h3 className="text-base font-semibold text-zinc-100">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-200/80 bg-white/85 p-6 md:p-8">
          <h2 className="text-2xl text-zinc-900 md:text-3xl">Etibar və servis səhifələri</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/haqqimizda" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Haqqımızda
            </Link>
            <Link href="/elaqe" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Əlaqə və ünvan
            </Link>
            <Link href="/refund-policy" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Qaytarılma siyasəti
            </Link>
            <Link href="/terms-and-conditions" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Şərtlər və qaydalar
            </Link>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
