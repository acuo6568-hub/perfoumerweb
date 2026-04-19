import type { Metadata } from "next";

import { CatalogClient } from "@/components/CatalogClient";
import { Footer } from "@/components/Footer";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";
import type { CatalogSpecialPreset } from "@/lib/special-items";

const catalogMetadata = {
  title: "Ətir Kataloqu",
  description:
    "Perfoumer kataloqunda premium, niş və dizayner ətirlərini brendə, nota və üsluba görə filtr edin və sizin üçün uyğun qoxunu seçin.",
  keywords: buildAzeriPageKeywords([
    "ətir kataloqu",
    "ətir filter",
    "brendə görə ətir",
    "nota görə ətir",
    "ətir qiymətləri",
    "ətir seçimi",
  ]),
} as const;

type CatalogPageProps = {
  searchParams: Promise<{
    brand?: string;
    gender?: string;
    q?: string;
    note?: string;
    min?: string;
    max?: string;
    special?: string;
  }>;
};

function parseSpecialPreset(value: string | undefined): CatalogSpecialPreset | undefined {
  if (value === "gift-ideas") {
    return "gift-ideas";
  }

  return undefined;
}

export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  const { brand, gender, q, note, min, max, special } = await searchParams;
  const specialPreset = parseSpecialPreset(special);
  const hasFilters = Boolean(brand || gender || q || note || min || max || specialPreset);
  const locale = await getCurrentLocale();

  const specialTitle =
    specialPreset === "gift-ideas"
      ? locale === "az"
        ? "Hədiyyə İdeyaları"
        : locale === "ru"
          ? "Идеи подарков"
          : "Gift Ideas"
      : null;
  const specialDescription =
    specialPreset === "gift-ideas"
      ? locale === "az"
        ? "Hədiyyə üçün risksiz və bəyənilmə ehtimalı yüksək ətir seçimləri."
        : locale === "ru"
          ? "Подборка ароматов, которые легче дарить и приятно носить каждый день."
          : "Curated fragrances that are safer gifting picks and easy to wear daily."
      : null;

  const metadataTitle = specialTitle ?? catalogMetadata.title;
  const metadataDescription = specialDescription ?? catalogMetadata.description;

  return {
    title: metadataTitle,
    description: metadataDescription,
    keywords: catalogMetadata.keywords,
    alternates: buildLocaleAlternates("/catalog", locale),
    robots: hasFilters ? { index: false, follow: true } : undefined,
    openGraph: {
      title: metadataTitle,
      description: metadataDescription,
      url: absoluteUrlForLocale("/catalog", locale),
      type: "website",
    },
  };
}

function parsePriceParam(value: string | undefined): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed);
}

function noteLabelFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const perfumes = await getPerfumes();
  const { brand, gender, q, note, min, max, special } = await searchParams;
  const specialPreset = parseSpecialPreset(special);
  const normalizedBrand = brand?.trim().toLowerCase();
  const initialGender = typeof gender === "string" ? gender.trim() : "";
  const initialQuery = typeof q === "string" ? q.trim() : "";
  const normalizedNote = typeof note === "string" ? note.trim().toLowerCase() : "";
  const initialMinPrice = parsePriceParam(min);
  const initialMaxPrice = parsePriceParam(max);
  const initialBrand =
    perfumes.find((perfume) => perfume.brand.toLowerCase() === normalizedBrand)?.brand ??
    "all";

  const noteType: "top" | "heart" | "base" | null = normalizedNote
    ? perfumes.some((perfume) => perfume.noteSlugs.top.includes(normalizedNote))
      ? "top"
      : perfumes.some((perfume) => perfume.noteSlugs.heart.includes(normalizedNote))
        ? "heart"
        : perfumes.some((perfume) => perfume.noteSlugs.base.includes(normalizedNote))
          ? "base"
          : null
    : null;

  const lockedNoteFilter =
    noteType && normalizedNote
      ? {
          slug: normalizedNote,
          type: noteType,
          label: noteLabelFromSlug(normalizedNote),
        }
      : undefined;

  const headingTitle =
    specialPreset === "gift-ideas"
      ? locale === "az"
        ? "Hədiyyə ideyaları"
        : locale === "ru"
          ? "Идеи подарков"
          : "Gift ideas"
      : t.catalogPage.title;

  const headingDescription =
    specialPreset === "gift-ideas"
      ? locale === "az"
        ? "Hədiyyə üçün seçilməsi daha rahat, balanslı və bəyənilmə ehtimalı yüksək qoxular."
        : locale === "ru"
          ? "Подборка ароматов с более универсальным характером для подарка."
          : "A curated selection of more universal fragrances that are easier to gift."
      : t.catalogPage.description;

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="max-w-[12ch] text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:max-w-[16ch] md:text-7xl">
                {headingTitle}
              </h1>
            </div>
            <p className="max-w-sm text-sm leading-6 text-zinc-500 sm:text-base md:text-lg">
              {headingDescription}
            </p>
          </div>
        </section>

        <CatalogClient
          perfumes={perfumes}
          lockedNoteFilter={lockedNoteFilter}
          initialBrand={initialBrand}
          initialGender={initialGender}
          initialQuery={initialQuery}
          initialMinPrice={initialMinPrice}
          initialMaxPrice={initialMaxPrice}
          specialPreset={specialPreset}
          locale={locale}
        />
      </main>

      <Footer locale={locale} />
    </div>
  );
}
