import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogHeroParallax } from "@/components/blog/BlogHeroParallax";
import { Footer } from "@/components/Footer";
import { getPerfumes } from "@/lib/catalog";
import {
  BLOG_ARTICLES,
  getClusterByPath,
  getBlogArticleBySlug,
  pickClusterPerfumes,
} from "@/lib/seo-growth";
import { absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";
import { toLocalePath, type Locale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getSiteSettings } from "@/lib/site-settings";
import type { Perfume } from "@/types/catalog";

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

function formatDate(value: string, locale: Locale) {
  const date = new Date(`${value}T12:00:00Z`);
  const formatterLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-GB" : "az-AZ";
  return new Intl.DateTimeFormat(formatterLocale, { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

const BLOG_DETAIL_COPY: Record<Locale, {
  eyebrow: string;
  introTitle: string;
  introLead: string;
  finalThoughtTitle: string;
  finalThoughtBody: string;
  backToBlog: string;
  recommendedProducts: string;
  otherUsefulArticles: string;
  sectionPracticalPrefix: string;
  sectionPracticalBody: string;
  checklistTitle: string;
  checklistItems: string[];
}> = {
  az: {
    eyebrow: "Blog",
    introTitle: "Giriş",
    introLead: "Məqaləyə başlamazdan əvvəl məqsədinizi müəyyən edin: gündəlik istifadə, tədbir, hədiyyə və ya mövsümi yenilənmə. Dəqiq məqsəd doğru seçimi daha sürətli edir.",
    finalThoughtTitle: "Yekun fikir",
    finalThoughtBody: "Bu məqalədəki yanaşma sizi daha balanslı ətir seçiminə yaxınlaşdırır. Əsas məqsəd mükəmməl seçim yox, sizə uyğun və davamlı istifadə ediləcək seçimdir.",
    backToBlog: "Bloga qayıt",
    recommendedProducts: "Tövsiyə olunan məhsullar",
    otherUsefulArticles: "Digər faydalı məqalələr",
    sectionPracticalPrefix: "Praktik yanaşma",
    sectionPracticalBody: "Qərar verərkən məqsəd, mövsüm və istifadə tezliyi birlikdə qiymətləndirildikdə nəticə daha stabil və funksional olur.",
    checklistTitle: "Qısa tətbiq checklist-i",
    checklistItems: [
      "İstifadə mühitini (ofis, gündəlik, axşam) əvvəlcədən seçin.",
      "Not ailəsini daraldın və ən az 2 alternativ müqayisə edin.",
      "Dozajı azdan başlayın, ehtiyac olduqda mərhələli artırın.",
    ],
  },
  en: {
    eyebrow: "Blog",
    introTitle: "Introduction",
    introLead: "Before diving in, define your exact use case: daily wear, event, gifting, or seasonal refresh. A clear goal leads to better scent decisions faster.",
    finalThoughtTitle: "Final Thought",
    finalThoughtBody: "This framework helps you make more balanced fragrance decisions. The goal is not perfection, but a scent profile you can confidently wear and return to.",
    backToBlog: "Back to blog",
    recommendedProducts: "Recommended Products",
    otherUsefulArticles: "Other Useful Articles",
    sectionPracticalPrefix: "Practical takeaway",
    sectionPracticalBody: "Results are more reliable when intent, seasonality, and usage frequency are evaluated together before the final selection.",
    checklistTitle: "Quick implementation checklist",
    checklistItems: [
      "Define context first: office, daily, evening, or occasion.",
      "Narrow to one note family and compare at least two options.",
      "Start with lower dosage and scale up only when needed.",
    ],
  },
  ru: {
    eyebrow: "Блог",
    introTitle: "Введение",
    introLead: "Перед выбором определите задачу: на каждый день, для офиса, на вечер или в подарок. Четкая цель ускоряет и упрощает решение.",
    finalThoughtTitle: "Финальная мысль",
    finalThoughtBody: "Этот подход помогает принимать более сбалансированные решения по аромату. Важна не идеальность, а аромат, который действительно подходит и используется регулярно.",
    backToBlog: "Назад в блог",
    recommendedProducts: "Рекомендуемые продукты",
    otherUsefulArticles: "Другие полезные статьи",
    sectionPracticalPrefix: "Практический вывод",
    sectionPracticalBody: "Решение получается заметно точнее, когда цель, сезонность и частота использования оцениваются вместе.",
    checklistTitle: "Короткий чеклист",
    checklistItems: [
      "Сначала определите сценарий: офис, день, вечер, событие.",
      "Сузьте выбор до одной семьи нот и сравните минимум 2 варианта.",
      "Начинайте с небольшой дозировки и повышайте постепенно.",
    ],
  },
};

const articleImagePool = [
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1600&q=80",
] as const;

function resolveArticleImage(slug: string) {
  const index = BLOG_ARTICLES.findIndex((item) => item.slug === slug);
  if (index < 0) {
    return articleImagePool[0];
  }
  return articleImagePool[index % articleImagePool.length];
}

function getStartingPrice(perfume: Perfume) {
  const minPrice = perfume.sizes.reduce((acc, size) => Math.min(acc, size.price), Number.POSITIVE_INFINITY);
  return Number.isFinite(minPrice) ? minPrice : 0;
}

function formatAznPrice(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const { siteName } = await getSiteSettings();
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const copy = BLOG_DETAIL_COPY[locale];

  const relatedArticles = BLOG_ARTICLES.filter((item) => item.slug !== article.slug)
    .filter((item) => item.relatedClusterHrefs.some((href) => article.relatedClusterHrefs.includes(href)))
    .slice(0, 2);
  const heroImage = resolveArticleImage(article.slug);
  const perfumes = await getPerfumes();

  const recommendedPerfumes: Perfume[] = [];
  const selectedPerfumeIds = new Set<string>();

  for (const href of article.relatedClusterHrefs) {
    const cluster = getClusterByPath(href);
    if (!cluster) {
      continue;
    }

    const clusterCandidates = pickClusterPerfumes(cluster.key, perfumes, 8).filter((item) => item.inStock);
    for (const perfume of clusterCandidates) {
      if (selectedPerfumeIds.has(perfume.id)) {
        continue;
      }

      recommendedPerfumes.push(perfume);
      selectedPerfumeIds.add(perfume.id);

      if (recommendedPerfumes.length >= 4) {
        break;
      }
    }

    if (recommendedPerfumes.length >= 4) {
      break;
    }
  }

  if (recommendedPerfumes.length < 4) {
    const fallbackPool = perfumes
      .filter((item) => item.inStock && !selectedPerfumeIds.has(item.id))
      .sort((a, b) => getStartingPrice(a) - getStartingPrice(b));

    for (const perfume of fallbackPool) {
      recommendedPerfumes.push(perfume);
      if (recommendedPerfumes.length >= 4) {
        break;
      }
    }
  }

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
      name: siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
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
    mainEntity: article.faq.map((item) => ({
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

      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-8 md:pt-8">
        <BlogHeroParallax
          imageSrc={heroImage}
          imageAlt={article.title}
          eyebrow={copy.eyebrow}
          title={article.title}
          description={article.description}
        />

        <article className="mt-4 rounded-[2.2rem] border border-zinc-200/70 bg-white/90 p-3 shadow-[0_16px_36px_rgba(22,22,24,0.06)] md:p-4">

          <section className="grid gap-10 px-3 pt-8 pb-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 lg:px-8 lg:pt-10">
            <div>
              <div className="text-sm leading-8 text-zinc-600">
                <h2 className="text-[2rem] leading-[1.05] tracking-[-0.02em] text-zinc-900">{copy.introTitle}</h2>
                <p className="mt-4">{article.description}</p>
                <p className="mt-3 text-base leading-8 text-zinc-600">{copy.introLead}</p>
              </div>

              <div className="mt-8 space-y-8">
                {article.sections.map((section, index) => (
                  <section key={section.heading}>
                    <h3 className="text-[2rem] leading-[1.05] tracking-[-0.02em] text-zinc-900">
                      {index + 1}. {section.heading}
                    </h3>
                    <p className="mt-3 text-base leading-8 text-zinc-600">{section.content}</p>
                    <p className="mt-3 text-base leading-8 text-zinc-600">
                      {copy.sectionPracticalPrefix}: {copy.sectionPracticalBody}
                    </p>
                    <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/75 px-4 py-4">
                      <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">{copy.checklistTitle}</p>
                      <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-600">
                        {copy.checklistItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                ))}
              </div>

              <section className="mt-10">
                <h3 className="text-[2rem] leading-[1.05] tracking-[-0.02em] text-zinc-900">{copy.finalThoughtTitle}</h3>
                <p className="mt-3 text-base leading-8 text-zinc-600">
                  {copy.finalThoughtBody}
                </p>
              </section>

              <p className="mt-8 text-xs tracking-[0.12em] text-zinc-400 uppercase">{formatDate(article.publishedAt, locale)}</p>
              <Link href={toLocalePath("/blog", locale)} className="mt-2 inline-flex text-sm text-zinc-500 transition hover:text-zinc-900">
                {copy.backToBlog}
              </Link>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-[2.2rem] leading-[1.02] tracking-[-0.02em] text-zinc-900">{copy.recommendedProducts}</h2>
              <div className="mt-5 space-y-3">
                {recommendedPerfumes.map((product) => (
                  <Link
                    key={product.id}
                    href={`/perfumes/${product.slug}`}
                    className="grid grid-cols-[84px_1fr_auto] items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/85 p-2.5 transition-colors hover:border-zinc-300"
                  >
                    <div className="relative h-[84px] w-[84px] overflow-hidden rounded-xl bg-zinc-100">
                      <Image src={product.image} alt={product.imageAlt || product.name} fill sizes="84px" className="object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-5 text-zinc-800">{product.brand} {product.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-500">{formatAznPrice(getStartingPrice(product))}</p>
                      <span className="mt-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-[0.8rem] text-zinc-600">↘</span>
                    </div>
                  </Link>
                ))}
              </div>
            </aside>
          </section>
        </article>

        <section className="mt-12 pb-4">
          <h2 className="text-[2rem] leading-[1.06] tracking-[-0.02em] text-zinc-900 md:text-[2.25rem]">{copy.otherUsefulArticles}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 md:gap-6">
            {relatedArticles.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="grid items-center gap-5 rounded-[1.7rem] border border-zinc-200/80 bg-white/92 p-4 shadow-[0_10px_24px_rgba(18,18,18,0.04)] transition-all duration-300 hover:-translate-y-[1px] hover:border-zinc-300 hover:shadow-[0_16px_32px_rgba(18,18,18,0.07)] md:grid-cols-[190px_1fr]"
              >
                <div className="relative h-[128px] overflow-hidden rounded-[1.1rem] bg-zinc-100 md:h-[148px]">
                  <Image src={resolveArticleImage(item.slug)} alt={item.title} fill sizes="(max-width: 768px) 100vw, 190px" className="object-cover" />
                </div>
                <div className="pr-1">
                  <p className="text-[1.28rem] leading-[1.12] tracking-[-0.01em] text-zinc-900 md:text-[1.5rem]">{item.title}</p>
                  <p className="mt-2.5 text-sm leading-6 text-zinc-500">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
