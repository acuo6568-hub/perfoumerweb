import { NextResponse } from "next/server";

import { getPerfumes } from "@/lib/catalog";
import { normalizeSearchText, tokenizeSearch } from "@/lib/search-normalize";

type SearchTab = "all" | "women" | "men" | "unisex" | "brands" | "home";

type SearchProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number | null;
  gender: string;
  inStock: boolean;
  variantCount: number;
};

type SearchBrand = {
  brand: string;
  count: number;
};

function parseTab(value: string | null): SearchTab {
  if (value === "women" || value === "men" || value === "unisex" || value === "brands" || value === "home") {
    return value;
  }

  return "all";
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 16;
  return Math.max(4, Math.min(30, Math.floor(parsed)));
}

function getStartingPrice(sizes: Array<{ price: number }>): number | null {
  if (!sizes.length) {
    return null;
  }

  const first = sizes[0]?.price;
  return Number.isFinite(first) ? first : null;
}

function matchesTabGender(genderRaw: string, tab: SearchTab): boolean {
  if (tab === "all" || tab === "brands" || tab === "home") {
    return true;
  }

  const gender = normalizeSearchText(genderRaw);
  if (tab === "women") {
    return /(women|female|qadin|qadın|lady|жен)/iu.test(gender);
  }

  if (tab === "men") {
    return /(men|male|kisi|kişi|man|муж)/iu.test(gender);
  }

  return /unisex/iu.test(gender);
}

function toSearchPool(perfume: {
  brand: string;
  name: string;
  slug: string;
  noteSlugs?: { top?: string[]; heart?: string[]; base?: string[] };
}) {
  return normalizeSearchText(
    [
      perfume.brand,
      perfume.name,
      perfume.slug,
      ...(perfume.noteSlugs?.top ?? []),
      ...(perfume.noteSlugs?.heart ?? []),
      ...(perfume.noteSlugs?.base ?? []),
    ].join(" "),
  );
}

function scoreMatch(query: string, pool: string, name: string, brand: string, inStock: boolean): number {
  if (!query) {
    return inStock ? 12 : 4;
  }

  let score = 0;
  const normalizedName = normalizeSearchText(name);
  const normalizedBrand = normalizeSearchText(brand);
  const brandThenName = `${normalizedBrand} ${normalizedName}`.trim();
  const nameThenBrand = `${normalizedName} ${normalizedBrand}`.trim();

  if (pool === query || normalizedName === query || brandThenName === query || nameThenBrand === query) score += 800;
  else if (pool.startsWith(query) || normalizedName.startsWith(query) || normalizedBrand.startsWith(query)) score += 520;
  else if (pool.includes(query) || normalizedName.includes(query) || normalizedBrand.includes(query)) score += 260;

  const tokens = tokenizeSearch(query);
  const tokenScore = tokens.reduce((sum, token) => (pool.includes(token) ? sum + 90 : sum), 0);
  score += tokenScore;

  if (inStock) {
    score += 20;
  }

  return score;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = normalizeSearchText(url.searchParams.get("q") || "");
  const tab = parseTab(url.searchParams.get("tab"));
  const limit = parseLimit(url.searchParams.get("limit"));

  const perfumes = await getPerfumes();
  const variantCountBySlug = perfumes.reduce((map, perfume) => {
    map.set(perfume.slug, (map.get(perfume.slug) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const ranked = perfumes
    .filter((perfume) => matchesTabGender(perfume.gender, tab))
    .map((perfume) => {
      const pool = toSearchPool(perfume);
      return {
        perfume,
        pool,
        score: scoreMatch(q, pool, perfume.name, perfume.brand, perfume.inStock),
      };
    })
    .filter((item) => {
      if (!q) {
        return true;
      }

      const tokens = tokenizeSearch(q);
      return item.pool.includes(q) || tokens.every((token) => item.pool.includes(token));
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.perfume.inStock !== right.perfume.inStock) {
        return Number(right.perfume.inStock) - Number(left.perfume.inStock);
      }

      return left.perfume.name.localeCompare(right.perfume.name);
    });

  const items: SearchProduct[] = ranked.slice(0, limit).map(({ perfume }) => ({
    id: perfume.id,
    slug: perfume.slug,
    name: perfume.name,
    brand: perfume.brand,
    image: perfume.image,
    price: getStartingPrice(perfume.sizes),
    gender: perfume.gender,
    inStock: perfume.inStock,
    variantCount: variantCountBySlug.get(perfume.slug) ?? 1,
  }));

  const brandCountMap = new Map<string, number>();
  for (const { perfume } of ranked.slice(0, 120)) {
    brandCountMap.set(perfume.brand, (brandCountMap.get(perfume.brand) ?? 0) + 1);
  }

  const brands: SearchBrand[] = Array.from(brandCountMap.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.brand.localeCompare(right.brand);
    })
    .slice(0, 8);

  return NextResponse.json({ items, brands });
}
