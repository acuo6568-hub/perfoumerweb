import type { Metadata } from "next";

import { BrandsDirectory } from "@/components/brands/BrandsDirectory";
import { Footer } from "@/components/Footer";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { buildAzeriPageKeywords, buildLocaleAlternates, slugifyPathSegment } from "@/lib/seo";

const brandsMetadata: Metadata = {
  title: "Ətir Brendləri",
  description:
    "Perfoumer-də təqdim olunan ətir brendlərini əlifba sırası ilə kəşf edin və seçdiyiniz brend üzrə bütün məhsullara keçid edin.",
  keywords: buildAzeriPageKeywords([
    "ətir brendləri",
    "məşhur ətir markaları",
    "dizayner ətir markaları",
    "niş ətir brendləri",
    "brendə görə ətir seç",
  ]),
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();

  return {
    ...brandsMetadata,
    alternates: buildLocaleAlternates("/brands", locale),
  };
}

function groupBrands(brands: string[]) {
  const grouped = new Map<string, string[]>();

  for (const brand of brands) {
    const letter = brand.charAt(0).toUpperCase();
    const current = grouped.get(letter) ?? [];
    current.push(brand);
    grouped.set(letter, current);
  }

  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function normalizeGenderTag(raw: string) {
  const value = raw.trim().toLowerCase();

  if (!value) return "unisex";
  if (value.includes("qad") || value.includes("female") || value.includes("women") || value.includes("woman")) {
    return "women";
  }
  if (value.includes("ki") || value.includes("male") || value.includes("men") || value.includes("man")) {
    return "men";
  }
  if (value.includes("unisex") || value.includes("uni")) {
    return "unisex";
  }

  return "unisex";
}

function getCategoryOptions(locale: "az" | "en" | "ru") {
  if (locale === "en") {
    return [
      { id: "all", label: "ALL" },
      { id: "women", label: "WOMEN" },
      { id: "men", label: "MEN" },
      { id: "unisex", label: "UNISEX" },
    ];
  }

  if (locale === "ru") {
    return [
      { id: "all", label: "ВСЕ" },
      { id: "women", label: "ЖЕНЩИНЫ" },
      { id: "men", label: "МУЖЧИНЫ" },
      { id: "unisex", label: "УНИСЕКС" },
    ];
  }

  return [
    { id: "all", label: "HAMISI" },
    { id: "women", label: "QADIN" },
    { id: "men", label: "KİŞİ" },
    { id: "unisex", label: "UNISEKS" },
  ];
}

export default async function BrandsPage() {
  const locale = await getCurrentLocale();
  const perfumes = await getPerfumes();
  const t = getDictionary(locale);

  const brandCategoryMap = new Map<string, Set<string>>();
  for (const perfume of perfumes) {
    const brand = perfume.brand.trim();
    if (!brand) continue;

    const current = brandCategoryMap.get(brand) ?? new Set<string>();
    current.add(normalizeGenderTag(perfume.gender));
    brandCategoryMap.set(brand, current);
  }

  const brands = Array.from(
    new Set(
      perfumes
        .map((perfume) => perfume.brand.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const groupedBrands = groupBrands(brands).map(([letter, items]) => ({
    letter,
    items: items.map((brand) => ({
      name: brand,
      href: `/brands/${slugifyPathSegment(brand)}`,
      categories: Array.from(brandCategoryMap.get(brand) ?? []),
    })),
  }));

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-8">
        <BrandsDirectory
          groupedBrands={groupedBrands}
          categoryOptions={getCategoryOptions(locale)}
          dropdownAriaLabel={t.brandsPage.eyebrow}
        />
      </main>

      <Footer locale={locale} />
    </div>
  );
}
