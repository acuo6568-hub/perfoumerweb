import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { NoteTypeCatalogSection } from "@/components/NoteTypeCatalogSection";
import { getNotes, getPerfumes } from "@/lib/catalog";
import { formatMessage, getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n.server";
import { localizeNoteLabel } from "@/lib/note-label";
import { BLOG_ARTICLES, CORE_CLUSTER_PAGES } from "@/lib/seo-growth";
import { absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";

type NoteFilterType = "top" | "heart" | "base";

type NotePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
};

const NOTE_TYPE_LABELS: Record<NoteFilterType, string> = {
  top: "Üst notları",
  heart: "Ürək notları",
  base: "Baza notları",
};

function normalizeType(value?: string): NoteFilterType {
  if (value === "heart" || value === "base") {
    return value;
  }

  return "top";
}

function decodeSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateStaticParams() {
  const notes = await getNotes();
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const normalizedSlug = decodeSlug(slug).toLowerCase();
  const notes = await getNotes();
  const noteRaw =
    notes.find((item) => item.slug === normalizedSlug) ?? {
      slug: normalizedSlug,
      name: fallbackNoteName(normalizedSlug),
    };
  const noteName = localizeNoteLabel(noteRaw, locale);
  const canonicalPath = `/notes/${normalizedSlug}`;

  return {
    title: `${noteName} notu olan ətirlər`,
    description: `${noteName} notu ilə seçilmiş premium ətirləri kəşf edin və top, ürək, baza notlarına görə filtr edin.`,
    keywords: buildAzeriPageKeywords([
      `${noteName} notu`,
      `${noteName} qoxusu olan ətirlər`,
      `${noteName} ətir notları`,
      `${noteName} ətir tövsiyəsi`,
      "top not ətirlər",
      "ürək not ətirlər",
      "baza not ətirlər",
      "nota görə ətir seçimi",
    ]),
    alternates: buildLocaleAlternates(canonicalPath, locale),
    openGraph: {
      title: `${noteName} notu olan ətirlər`,
      description: `${noteName} notuna uyğun ətir seçimi və not tipinə görə çeşidlənmiş məhsullar.`,
      url: absoluteUrlForLocale(canonicalPath, locale),
      type: "website",
    },
  };
}

function fallbackNoteName(slug: string) {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function pickRelatedClusterHrefs(noteSlug: string) {
  if (["oud", "agar", "ud"].some((token) => noteSlug.includes(token))) {
    return ["/oud-etirler", "/qis-etirleri", "/uzunomurlu-etirler"];
  }

  if (["citrus", "bergamot", "lemon", "grapefruit", "marine", "aquatic"].some((token) => noteSlug.includes(token))) {
    return ["/yay-etirleri", "/uniseks-etirler", "/kisi-etirleri"];
  }

  if (["rose", "jasmine", "floral", "peony", "lily"].some((token) => noteSlug.includes(token))) {
    return ["/qadin-etirleri", "/hediyye-etirler", "/yay-etirleri"];
  }

  if (["vanilla", "amber", "musk", "patchouli", "tobacco", "leather"].some((token) => noteSlug.includes(token))) {
    return ["/uzunomurlu-etirler", "/qis-etirleri", "/hediyye-etirler"];
  }

  return ["/uniseks-etirler", "/kisi-etirleri", "/qadin-etirleri"];
}

export default async function NotePage({
  params,
  searchParams,
}: NotePageProps) {
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const [{ slug }, { type }] = await Promise.all([params, searchParams]);
  const noteType = normalizeType(type);
  const [notes, perfumes] = await Promise.all([getNotes(), getPerfumes()]);

  const normalizedSlug = decodeSlug(slug).toLowerCase();
  const note =
    notes.find((item) => item.slug === normalizedSlug) ?? {
      slug: normalizedSlug,
      name: fallbackNoteName(normalizedSlug),
      image: "",
      imageAlt: "",
      content: "",
    };
  const localizedNoteName = localizeNoteLabel(note, locale);
  const relatedClusterHrefs = pickRelatedClusterHrefs(note.slug);
  const relatedClusters = CORE_CLUSTER_PAGES.filter((item) => relatedClusterHrefs.includes(item.href));
  const relatedArticles = BLOG_ARTICLES.filter((item) =>
    item.relatedClusterHrefs.some((href) => relatedClusterHrefs.includes(href)),
  ).slice(0, 6);

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-zinc-500">{t.notePage.eyebrow}</p>
              <h1 className="mt-2 max-w-[12ch] text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:text-7xl">
                {formatMessage(t.notePage.title, { note: localizedNoteName })}
              </h1>
            </div>

            <div className="w-full max-w-xl">
              <p className="text-sm leading-6 text-zinc-500 md:text-base">
                {formatMessage(t.notePage.description, { note: localizedNoteName.toLowerCase() })}
              </p>
            </div>
          </div>
        </section>

        <NoteTypeCatalogSection
          perfumes={perfumes}
          locale={locale}
          noteSlug={note.slug}
          noteName={localizedNoteName}
          initialType={noteType}
          labels={{
            top: t.notePage.top,
            heart: t.notePage.heart,
            base: t.notePage.base,
          }}
        />

        <section className="mt-8 rounded-[1.8rem] border border-zinc-200/80 bg-white/84 p-5 shadow-[0_12px_30px_rgba(22,22,24,0.05)] sm:p-6">
          <h2 className="text-2xl text-zinc-900 md:text-3xl">{localizedNoteName} notu üçün əlavə keçidlər</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {relatedClusters.map((cluster) => (
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
      </main>

      <Footer locale={locale} />
    </div>
  );
}
