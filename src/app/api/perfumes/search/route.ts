import { NextResponse } from "next/server";

import { getPerfumes } from "@/lib/catalog";

type SearchTab = "all" | "women" | "men" | "unisex" | "brands" | "home";

type SearchProduct = {
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number | null;
  gender: string;
  inStock: boolean;
};

type SearchBrand = {
  brand: string;
  count: number;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

  const gender = normalize(genderRaw);
  if (tab === "women") {
    return /(women|female|qadin|qadın|lady|жен)/iu.test(gender);
  }

  if (tab === "men") {
    return /(men|male|kisi|kişi|man|муж)/iu.test(gender);
  }

  return /unisex/iu.test(gender);
}

function scoreMatch(query: string, pool: string, inStock: boolean): number {
  if (!query) {
    return inStock ? 12 : 4;
  }

  let score = 0;
  if (pool === query) score += 800;
  if (pool.startsWith(query)) score += 520;
  if (pool.includes(query)) score += 260;

  const tokens = query.split(" ").filter(Boolean);
  const tokenScore = tokens.reduce((sum, token) => (pool.includes(token) ? sum + 90 : sum), 0);
  score += tokenScore;

  if (inStock) {
    score += 20;
  }

  return score;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = normalize(url.searchParams.get("q") || "");
  const tab = parseTab(url.searchParams.get("tab"));
  const limit = parseLimit(url.searchParams.get("limit"));

  const perfumes = await getPerfumes();

  const ranked = perfumes
    .filter((perfume) => matchesTabGender(perfume.gender, tab))
    .map((perfume) => {
      const pool = normalize(`${perfume.brand} ${perfume.name} ${perfume.slug}`);
      return {
        perfume,
        pool,
        score: scoreMatch(q, pool, perfume.inStock),
      };
    })
    .filter((item) => (q ? item.score >= 180 : true))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.perfume.inStock !== right.perfume.inStock) {
        return Number(right.perfume.inStock) - Number(left.perfume.inStock);
      }

      return left.perfume.name.localeCompare(right.perfume.name);
    });

  const dedupedBySlug = Array.from(
    ranked
      .reduce((map, entry) => {
        const existing = map.get(entry.perfume.slug);
        if (!existing) {
          map.set(entry.perfume.slug, entry);
          return map;
        }

        if (entry.score > existing.score) {
          map.set(entry.perfume.slug, entry);
          return map;
        }

        if (entry.score === existing.score) {
          const existingPrice = getStartingPrice(existing.perfume.sizes) ?? Number.POSITIVE_INFINITY;
          const nextPrice = getStartingPrice(entry.perfume.sizes) ?? Number.POSITIVE_INFINITY;
          if (nextPrice < existingPrice) {
            map.set(entry.perfume.slug, entry);
          }
        }

        return map;
      }, new Map<string, (typeof ranked)[number]>())
      .values(),
  );

  const items: SearchProduct[] = dedupedBySlug.slice(0, limit).map(({ perfume }) => ({
    slug: perfume.slug,
    name: perfume.name,
    brand: perfume.brand,
    image: perfume.image,
    price: getStartingPrice(perfume.sizes),
    gender: perfume.gender,
    inStock: perfume.inStock,
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
