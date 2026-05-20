import path from "node:path";
import { readFile } from "node:fs/promises";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { parseCsv } from "@/lib/csv";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";
import { normalizePerfumeDiscount } from "@/lib/discounts";
import type { Note, Perfume, PerfumeSize, PerfumeWithNotes } from "@/types/catalog";

type NoteCsvRow = {
  Slug: string;
  Title: string;
  Image: string;
  "Image:alt": string;
  Content: string;
};

type PerfumeCsvRow = {
  id?: string;
  slug: string;
  title: string;
  image: string;
  image_alt: string;
  gender: string;
  price_15ml: string;
  price_30ml: string;
  price_50ml: string;
  brand: string;
  top_notes: string;
  heart_notes: string;
  base_notes: string;
  link: string;
  stock_status: string;
};

type MissingPerfumePngCsvRow = {
  slug: string;
  png_url: string;
  status: string;
};

const splitByComma = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const normalizeNoteLookupKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

export const parsePrice = (value: string): number | null => {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStockStatus = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return {
    stockStatus: value.trim() || "Naməlum",
    inStock: normalized.includes("var"),
  };
};

const fallbackNote = (slug: string): Note => ({
  slug,
  name: slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" "),
  image: "",
  imageAlt: "",
  content: "",
});

const NOTES_CSV_PATH = path.join(process.cwd(), "data", "Notes.csv");
const NOTES_CSV_FALLBACK_PATH = path.join(process.cwd(), "data", "notes.csv");
const PERFUMES_CSV_PATH = path.join(process.cwd(), "data", "perfm77.csv");
const ADMIN_NOTES_JSON_PATH = path.join(process.cwd(), "data", "admin", "notes.json");
const ADMIN_PERFUMES_JSON_PATH = path.join(process.cwd(), "data", "admin", "perfumes.json");
const MISSING_PERFUME_PNG_CSV_PATH = path.join(process.cwd(), "data", "admin", "missing-perfume-png-variants.csv");

const PERFUME_CDN_BASE_URL = "https://perfoumer-cdn.vercel.app/perfumes";

const getPerfumeImageUrl = (slug: string) =>
  `${PERFUME_CDN_BASE_URL}/${encodeURIComponent(slug)}.png`;

const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const rotateBySeed = <T,>(items: T[], seed: string) => {
  if (!items.length) {
    return items;
  }

  const offset = hashString(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
};

const getDailySeed = () => new Date().toISOString().slice(0, 10);

const normalizeNameKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const variantIdentityKey = (perfume: Perfume) => {
  const sizeKey = perfume.sizes
    .map((size) => `${size.ml}:${size.price}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");

  return [perfume.slug, sizeKey, perfume.externalLink].join("::");
};

const ensureUniquePerfumeIds = (perfumes: Perfume[]) => {
  const seen = new Map<string, number>();

  return perfumes.map((perfume, index) => {
    const fallbackId = `${perfume.slug}__variant_${index + 1}`;
    const baseId = (perfume.id || fallbackId).trim() || fallbackId;
    const nextCount = (seen.get(baseId) ?? 0) + 1;
    seen.set(baseId, nextCount);

    if (nextCount === 1) {
      return {
        ...perfume,
        id: baseId,
      };
    }

    return {
      ...perfume,
      id: `${baseId}__${nextCount}`,
    };
  });
};

async function readJsonSafely<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const note = value as {
    slug?: unknown;
    name?: unknown;
    image?: unknown;
    imageAlt?: unknown;
    content?: unknown;
  };

  const slug = typeof note.slug === "string" ? note.slug.trim().toLowerCase() : "";
  if (!slug) {
    return null;
  }

  return {
    slug,
    name: typeof note.name === "string" ? note.name.trim() : "",
    image: typeof note.image === "string" ? note.image.trim() : "",
    imageAlt: typeof note.imageAlt === "string" ? note.imageAlt.trim() : "",
    content: typeof note.content === "string" ? note.content.trim() : "",
  };
}

function normalizePerfume(value: unknown): Perfume | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const perfume = value as {
    id?: unknown;
    slug?: unknown;
    name?: unknown;
    brand?: unknown;
    gender?: unknown;
    image?: unknown;
    imageAlt?: unknown;
    stockStatus?: unknown;
    inStock?: unknown;
    externalLink?: unknown;
    sizes?: unknown;
    discount?: unknown;
    noteSlugs?: {
      top?: unknown;
      heart?: unknown;
      base?: unknown;
    };
  };

  const slug = typeof perfume.slug === "string" ? perfume.slug.trim().toLowerCase() : "";
  if (!slug) {
    return null;
  }

  const sizes = Array.isArray(perfume.sizes)
    ? perfume.sizes
        .map((size) => {
          if (!size || typeof size !== "object") {
            return null;
          }

          const parsed = size as { ml?: unknown; price?: unknown; label?: unknown };
          const ml = Number(parsed.ml);
          const price = Number(parsed.price);

          if (!Number.isFinite(ml) || !Number.isFinite(price)) {
            return null;
          }

          return {
            ml,
            price,
            label: typeof parsed.label === "string" && parsed.label.trim() ? parsed.label.trim() : `${ml}ML`,
          };
        })
        .filter((item): item is PerfumeSize => item !== null)
        .sort((a, b) => a.ml - b.ml)
    : [];

  const normalizeSlugArray = (input: unknown) =>
    Array.isArray(input)
      ? input
          .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
          .filter(Boolean)
      : [];

  const image = typeof perfume.image === "string" && perfume.image.trim()
    ? perfume.image.trim()
    : getPerfumeImageUrl(slug);

  return {
    id: typeof perfume.id === "string" && perfume.id.trim() ? perfume.id.trim() : slug,
    slug,
    name: typeof perfume.name === "string" ? perfume.name.trim() : "",
    brand: typeof perfume.brand === "string" ? perfume.brand.trim() : "",
    gender: typeof perfume.gender === "string" && perfume.gender.trim() ? perfume.gender.trim() : "Unisex",
    image,
    imageAlt: typeof perfume.imageAlt === "string" ? perfume.imageAlt.trim() : "",
    stockStatus:
      typeof perfume.stockStatus === "string" && perfume.stockStatus.trim()
        ? perfume.stockStatus.trim()
        : "Naməlum",
    inStock: Boolean(perfume.inStock),
    externalLink: typeof perfume.externalLink === "string" ? perfume.externalLink.trim() : "",
    sizes,
    discount: normalizePerfumeDiscount(perfume.discount) ?? undefined,
    noteSlugs: {
      top: normalizeSlugArray(perfume.noteSlugs?.top),
      heart: normalizeSlugArray(perfume.noteSlugs?.heart),
      base: normalizeSlugArray(perfume.noteSlugs?.base),
    },
  };
}

async function getSupabaseAdminData(): Promise<{
  perfumes?: unknown;
  notes?: unknown;
  settings?: unknown;
} | null> {
  try {
    const config = getSupabaseServiceConfigFromServer();
    if (!config) {
      return null;
    }

    const { url, serviceRoleKey } = config;
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("admin_data")
      .select("data")
      .eq("id", "admin_data")
      .single();

    if (error || !data) {
      return null;
    }

    return (data as { data: unknown }).data as {
      perfumes?: unknown;
      notes?: unknown;
      settings?: unknown;
    } | null;
  } catch {
    return null;
  }
}

async function getNotesSource(): Promise<Note[]> {
  // Try Supabase first (production)
  const supabaseData = await getSupabaseAdminData();
  if (supabaseData && Array.isArray(supabaseData.notes)) {
    const parsed = (supabaseData.notes as unknown[])
      .map(normalizeNote)
      .filter((item): item is Note => item !== null);

    if (parsed.length) {
      console.log("[Catalog] Using", parsed.length, "notes from Supabase");
      return parsed;
    }
  }

  // Fallback to local files
  const adminNotes = await readJsonSafely<unknown[]>(ADMIN_NOTES_JSON_PATH);
  if (Array.isArray(adminNotes)) {
    const parsed = adminNotes
      .map(normalizeNote)
      .filter((item): item is Note => item !== null);

    if (parsed.length) {
      console.log("[Catalog] Using", parsed.length, "notes from local files");
      return parsed;
    }
  }

  const raw = await readFile(NOTES_CSV_PATH, "utf-8").catch(() =>
    readFile(NOTES_CSV_FALLBACK_PATH, "utf-8"),
  );
  const rows = parseCsv<NoteCsvRow>(raw);

  return rows.map((row) => ({
    slug: row.Slug.trim().toLowerCase(),
    name: row.Title.trim(),
    image: row.Image.trim(),
    imageAlt: row["Image:alt"].trim(),
    content: stripHtml(row.Content),
  }));
}

const getNotesCached = unstable_cache(getNotesSource, ["catalog-notes-v1"], {
  revalidate: 30,
  tags: ["catalog", "notes"],
});

export async function getNotes(): Promise<Note[]> {
  return getNotesCached();
}

async function getMissingPerfumePngSlugs() {
  try {
    const raw = await readFile(MISSING_PERFUME_PNG_CSV_PATH, "utf-8");
    const rows = parseCsv<MissingPerfumePngCsvRow>(raw);

    return new Set(
      rows
        .filter((row) => row.status?.trim() === "404")
        .map((row) => row.slug?.trim().toLowerCase())
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
}

async function getCsvPerfumesSource(referencePerfumes: Perfume[] = []): Promise<Perfume[]> {
  const raw = await readFile(PERFUMES_CSV_PATH, "utf-8");
  const rows = parseCsv<PerfumeCsvRow>(raw);
  const missingPerfumePngSlugs = await getMissingPerfumePngSlugs();

  const referenceImageBySlug = new Map<string, string>();
  const referenceImageByName = new Map<string, string>();

  for (const perfume of referencePerfumes) {
    if (perfume.image.trim()) {
      referenceImageBySlug.set(perfume.slug, perfume.image.trim());
    }

    const normalizedName = normalizeNameKey(perfume.name);
    if (normalizedName && perfume.image.trim() && !referenceImageByName.has(normalizedName)) {
      referenceImageByName.set(normalizedName, perfume.image.trim());
    }
  }

  const variantCounterBySlug = new Map<string, number>();
  const perfumes: Perfume[] = [];

  for (const row of rows) {
    const slug = row.slug.trim().toLowerCase();
    if (!slug) continue;

    const nextVariantIndex = (variantCounterBySlug.get(slug) ?? 0) + 1;
    variantCounterBySlug.set(slug, nextVariantIndex);

    const externalLink = row.link.trim();
    const externalId = externalLink.match(/\/(\d+)(?:\D*)$/)?.[1] ?? "";
    const id = row.id?.trim() || externalId || `${slug}__variant_${nextVariantIndex}`;

    const sizes = [
      { ml: 15, price: parsePrice(row.price_15ml) },
      { ml: 30, price: parsePrice(row.price_30ml) },
      { ml: 50, price: parsePrice(row.price_50ml) },
    ]
      .filter((item): item is { ml: number; price: number } => item.price !== null)
      .map((item) => ({
        ml: item.ml,
        price: item.price,
        label: `${item.ml}ML`,
      }));

    const stock = parseStockStatus(row.stock_status);
    const normalizedName = normalizeNameKey(row.title || "");
    const csvImage = row.image.trim();
    const matchedImage =
      (normalizedName ? referenceImageByName.get(normalizedName) : undefined) ||
      referenceImageBySlug.get(slug);
    // Prefer canonical CDN image paths for consistent product visuals across the app.
    const canonicalImage = getPerfumeImageUrl(slug);
    const image =
      matchedImage ||
      (missingPerfumePngSlugs.has(slug) ? csvImage || canonicalImage : canonicalImage || csvImage);

    const parsed: Perfume = {
      id,
      slug,
      name: row.title.trim(),
      brand: row.brand.trim(),
      gender: row.gender.trim() || "Unisex",
      image,
      imageAlt: row.image_alt.trim(),
      stockStatus: stock.stockStatus,
      inStock: stock.inStock,
      externalLink,
      sizes,
      noteSlugs: {
        top: splitByComma(row.top_notes || ""),
        heart: splitByComma(row.heart_notes || ""),
        base: splitByComma(row.base_notes || ""),
      },
    };

    perfumes.push(parsed);
  }

  return ensureUniquePerfumeIds(perfumes);
}

async function getPerfumesSource(): Promise<Perfume[]> {
  // Try Supabase first (production)
  const supabaseData = await getSupabaseAdminData();
  if (supabaseData && Array.isArray(supabaseData.perfumes)) {
    const parsed = (supabaseData.perfumes as unknown[])
      .map((perfume: unknown) => normalizePerfume(perfume))
      .filter((item): item is Perfume => item !== null);

    if (parsed.length) {
      console.log("[Catalog] Using", parsed.length, "perfumes from Supabase");
      return parsed;
    }
  }

  // Fallback to CSV
  const csvPerfumes = await getCsvPerfumesSource();
  console.log("[Catalog] Using", csvPerfumes.length, "perfumes from CSV");
  return ensureUniquePerfumeIds(csvPerfumes);
}

const getPerfumesCached = unstable_cache(getPerfumesSource, ["catalog-perfumes-v5"], {
  revalidate: 30,
  tags: ["catalog", "perfumes"],
});

export async function getPerfumes(): Promise<Perfume[]> {
  return getPerfumesCached();
}

export async function getFeaturedPerfumes(limit = 8): Promise<Perfume[]> {
  const perfumes = await getPerfumes();
  return rotateBySeed(perfumes, `home-${getDailySeed()}`).slice(0, limit);
}

export async function getRelatedPerfumes(
  currentSlug: string,
  limit = 3,
  options?: {
    excludeSlugs?: string[];
    seed?: string;
    diversify?: boolean;
  },
): Promise<Perfume[]> {
  const normalizedCurrentSlug = currentSlug.toLowerCase();
  const perfumes = await getPerfumes();
  const current = perfumes.find((item) => item.slug === normalizedCurrentSlug);
  const excludedSlugs = new Set(
    (options?.excludeSlugs ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean),
  );
  excludedSlugs.add(normalizedCurrentSlug);

  const candidates = perfumes.filter((item) => !excludedSlugs.has(item.slug));
  const seedBase = options?.seed?.trim() ? options.seed.trim() : normalizedCurrentSlug;

  if (!current) {
    return rotateBySeed(candidates, `${seedBase}-${getDailySeed()}`).slice(0, limit);
  }

  const normalizeGender = (value: string) => value.trim().toLowerCase();
  const targetGender = normalizeGender(current.gender);
  const targetNotes = {
    top: new Set(current.noteSlugs.top),
    heart: new Set(current.noteSlugs.heart),
    base: new Set(current.noteSlugs.base),
  };
  const targetMinPrice =
    current.sizes.length > 0 ? Math.min(...current.sizes.map((size) => size.price)) : null;
  const diversify = options?.diversify === true;

  const scored = candidates.map((candidate) => {
    let score = 0;

    if (candidate.inStock) {
      score += 18;
    }

    if (candidate.brand.toLowerCase() === current.brand.toLowerCase()) {
      score += 24;
      if (diversify) {
        score -= 18;
      }
    }

    const candidateGender = normalizeGender(candidate.gender);
    if (candidateGender === targetGender) {
      score += 15;
    } else if (candidateGender.includes("unisex") || targetGender.includes("unisex")) {
      score += 7;
    }

    const overlapTop = candidate.noteSlugs.top.filter((note) => targetNotes.top.has(note)).length;
    const overlapHeart = candidate.noteSlugs.heart.filter((note) => targetNotes.heart.has(note)).length;
    const overlapBase = candidate.noteSlugs.base.filter((note) => targetNotes.base.has(note)).length;
    score += overlapTop * 9 + overlapHeart * 7 + overlapBase * 5;

    if (diversify) {
      // Keep "other products" distinct from similar products by reducing very-close profiles.
      const denseOverlap = overlapTop + overlapHeart + overlapBase;
      if (denseOverlap >= 4) {
        score -= 18;
      } else if (denseOverlap >= 2) {
        score -= 8;
      }
    }

    const candidateMinPrice =
      candidate.sizes.length > 0 ? Math.min(...candidate.sizes.map((size) => size.price)) : null;
    if (targetMinPrice !== null && candidateMinPrice !== null) {
      const distance = Math.abs(candidateMinPrice - targetMinPrice);
      score += Math.max(0, 16 - Math.round(distance / 6));

      if (diversify && distance > 25) {
        score -= 6;
      }
    }

    const tieBreaker = hashString(`${seedBase}-${candidate.slug}-${getDailySeed()}`) % 1000;
    return { candidate, score, tieBreaker };
  });

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.tieBreaker - right.tieBreaker;
  });

  return scored.slice(0, limit).map((item) => item.candidate);
}

export async function getSimilarPerfumes(
  currentSlug: string,
  variantId?: string,
  limit = 3,
): Promise<Perfume[]> {
  const perfumes = await getPerfumes();
  const normalizedSlug = currentSlug.toLowerCase();
  const matchingVariants = perfumes.filter((item) => item.slug === normalizedSlug);

  if (!matchingVariants.length) {
    return [];
  }

  const normalizedVariantId = typeof variantId === "string" ? variantId.trim().toLowerCase() : "";
  const current = normalizedVariantId
    ? matchingVariants.find((item) => item.id.toLowerCase() === normalizedVariantId) ?? matchingVariants[0]
    : matchingVariants[0];

  if (!current) {
    return [];
  }

  const candidates = perfumes.filter((item) => item.slug !== normalizedSlug);
  const normalizeGender = (value: string) => value.trim().toLowerCase();
  const targetGender = normalizeGender(current.gender);
  const targetBrand = current.brand.trim().toLowerCase();

  const targetTop = new Set(current.noteSlugs.top);
  const targetHeart = new Set(current.noteSlugs.heart);
  const targetBase = new Set(current.noteSlugs.base);
  const targetAllNotes = new Set([...targetTop, ...targetHeart, ...targetBase]);

  const targetMinPrice =
    current.sizes.length > 0 ? Math.min(...current.sizes.map((size) => size.price)) : null;

  const stopWords = new Set([
    "for",
    "the",
    "edp",
    "edt",
    "parfum",
    "eau",
    "de",
    "pour",
    "intense",
    "elixir",
    "extrait",
  ]);

  const toNameTokens = (value: string) =>
    normalizeNameKey(value)
      .split(" ")
      .map((item) => item.trim())
      .filter((item) => item.length >= 3 && !stopWords.has(item));

  const targetNameTokens = new Set(toNameTokens(current.name));

  const noteFrequency = new Map<string, number>();
  for (const perfume of perfumes) {
    const uniqueNotes = new Set([
      ...perfume.noteSlugs.top,
      ...perfume.noteSlugs.heart,
      ...perfume.noteSlugs.base,
    ]);

    for (const note of uniqueNotes) {
      noteFrequency.set(note, (noteFrequency.get(note) ?? 0) + 1);
    }
  }

  const totalPerfumes = Math.max(1, perfumes.length);
  const noteRarity = (note: string) => {
    const df = noteFrequency.get(note) ?? 1;
    return 1 + Math.log((totalPerfumes + 1) / (df + 1));
  };

  const scentFamilyRules: Array<{ family: string; tokens: string[] }> = [
    { family: "citrus", tokens: ["bergamot", "lemon", "lime", "orange", "grapefruit", "mandarin", "neroli", "yuzu", "sitrus"] },
    { family: "woody", tokens: ["cedar", "sandal", "vetiver", "patchouli", "oak", "wood", "guaiac", "papyrus", "sidr"] },
    { family: "amber", tokens: ["amber", "labdanum", "benzoin", "resin", "olibanum", "myrrh", "incense", "ənbər"] },
    { family: "sweet", tokens: ["vanilla", "tonka", "caramel", "praline", "chocolate", "honey", "sugar"] },
    { family: "floral", tokens: ["rose", "jasmine", "iris", "peony", "lily", "tuberose", "violet", "osmanthus", "qızılgül"] },
    { family: "fresh", tokens: ["aquatic", "marine", "mint", "green", "tea", "ozonic", "sea", "water", "duz"] },
    { family: "spicy", tokens: ["pepper", "cardamom", "cinnamon", "ginger", "saffron", "clove", "nutmeg", "istiot"] },
    { family: "leathery", tokens: ["leather", "suede", "oud", "agar", "tobacco", "dəri", "ud"] },
  ];

  const inferFamilies = (perfume: Perfume) => {
    const source = normalizeNameKey(
      [
        perfume.name,
        ...perfume.noteSlugs.top,
        ...perfume.noteSlugs.heart,
        ...perfume.noteSlugs.base,
      ].join(" "),
    );

    const families = new Set<string>();
    for (const rule of scentFamilyRules) {
      if (rule.tokens.some((token) => source.includes(token))) {
        families.add(rule.family);
      }
    }

    return families;
  };

  const targetFamilies = inferFamilies(current);

  const sizeMlSet = (perfume: Perfume) => new Set(perfume.sizes.map((size) => size.ml));
  const targetMlSet = sizeMlSet(current);

  const averagePrice = (perfume: Perfume) => {
    if (!perfume.sizes.length) {
      return null;
    }

    const total = perfume.sizes.reduce((sum, size) => sum + size.price, 0);
    return total / perfume.sizes.length;
  };

  const targetAveragePrice = averagePrice(current);

  const positionWeight = {
    top: 1.0,
    heart: 1.65,
    base: 1.5,
  } as const;

  const crossPositionFactor = (
    note: string,
    candidateTop: Set<string>,
    candidateHeart: Set<string>,
    candidateBase: Set<string>,
    targetPosition: keyof typeof positionWeight,
  ) => {
    if (targetPosition === "top") {
      if (candidateTop.has(note)) return 1.2;
      if (candidateHeart.has(note)) return 0.88;
      if (candidateBase.has(note)) return 0.72;
    }

    if (targetPosition === "heart") {
      if (candidateHeart.has(note)) return 1.3;
      if (candidateBase.has(note)) return 0.97;
      if (candidateTop.has(note)) return 0.86;
    }

    if (targetPosition === "base") {
      if (candidateBase.has(note)) return 1.3;
      if (candidateHeart.has(note)) return 0.99;
      if (candidateTop.has(note)) return 0.8;
    }

    return 0;
  };

  const targetPositionEntries: Array<{ note: string; position: keyof typeof positionWeight }> = [
    ...current.noteSlugs.top.map((note) => ({ note, position: "top" as const })),
    ...current.noteSlugs.heart.map((note) => ({ note, position: "heart" as const })),
    ...current.noteSlugs.base.map((note) => ({ note, position: "base" as const })),
  ];

  const maxNoteSimilarity = targetPositionEntries.reduce((sum, entry) => {
    const rarity = noteRarity(entry.note);
    return sum + rarity * positionWeight[entry.position] * 1.3;
  }, 0);

  const scored = candidates.map((candidate) => {
    let score = 0;
    let noteWeightedMatch = 0;

    if (candidate.inStock) {
      score += 8;
    }

    const candidateBrand = candidate.brand.trim().toLowerCase();
    if (candidateBrand === targetBrand) {
      score += 26;
    }

    const candidateGender = normalizeGender(candidate.gender);
    if (candidateGender === targetGender) {
      score += 24;
    } else if (candidateGender.includes("unisex") || targetGender.includes("unisex")) {
      score += 8;
    } else {
      score -= 28;
    }

    const candidateTop = new Set(candidate.noteSlugs.top);
    const candidateHeart = new Set(candidate.noteSlugs.heart);
    const candidateBase = new Set(candidate.noteSlugs.base);
    const candidateAllNotes = new Set([...candidateTop, ...candidateHeart, ...candidateBase]);

    for (const entry of targetPositionEntries) {
      const factor = crossPositionFactor(
        entry.note,
        candidateTop,
        candidateHeart,
        candidateBase,
        entry.position,
      );
      if (factor <= 0) {
        continue;
      }

      noteWeightedMatch += noteRarity(entry.note) * positionWeight[entry.position] * factor;
    }

    const noteSimilarityScore =
      maxNoteSimilarity > 0 ? Math.min(100, (noteWeightedMatch / maxNoteSimilarity) * 100) : 0;
    score += noteSimilarityScore * 0.72;

    let allOverlap = 0;
    let heartBaseOverlap = 0;
    for (const note of targetAllNotes) {
      if (candidateAllNotes.has(note)) {
        allOverlap += 1;
        if (targetHeart.has(note) || targetBase.has(note)) {
          heartBaseOverlap += 1;
        }
      }
    }
    score += Math.min(38, allOverlap * 5.5);
    score += Math.min(24, heartBaseOverlap * 7);

    const candidateFamilies = inferFamilies(candidate);
    let familyIntersection = 0;
    for (const family of targetFamilies) {
      if (candidateFamilies.has(family)) {
        familyIntersection += 1;
      }
    }
    const familyUnion = new Set([...targetFamilies, ...candidateFamilies]).size;
    const familySimilarity = familyUnion > 0 ? familyIntersection / familyUnion : 0;
    score += familySimilarity * 22;
    score += familyIntersection >= 2 ? 8 : familyIntersection === 1 ? 3 : -6;

    if (targetAveragePrice !== null && targetMinPrice !== null && candidate.sizes.length > 0) {
      const candidateMinPrice = Math.min(...candidate.sizes.map((size) => size.price));
      const candidateAveragePrice = averagePrice(candidate);
      const distance = Math.abs(candidateMinPrice - targetMinPrice);
      score += Math.max(0, 20 - Math.round(distance / 4));
      if (distance <= 8) {
        score += 6;
      }

      if (candidateAveragePrice !== null) {
        const averageDistance = Math.abs(candidateAveragePrice - targetAveragePrice);
        score += Math.max(0, 16 - Math.round(averageDistance / 5));
      }

      const candidateMlSet = sizeMlSet(candidate);
      let sharedMlCount = 0;
      for (const ml of targetMlSet) {
        if (candidateMlSet.has(ml)) {
          sharedMlCount += 1;
        }
      }
      score += Math.min(8, sharedMlCount * 3);
    }

    let nameTokenOverlap = 0;
    const candidateTokens = toNameTokens(candidate.name);
    for (const token of candidateTokens) {
      if (targetNameTokens.has(token)) {
        nameTokenOverlap += 1;
      }
    }
    score += Math.min(15, nameTokenOverlap * 5);

    if (allOverlap === 0 && candidateBrand !== targetBrand) {
      score -= 30;
    }

    const hasStrongNoteAffinity = heartBaseOverlap >= 1 || allOverlap >= 3 || noteSimilarityScore >= 38;
    const hasContextAffinity =
      candidateBrand === targetBrand ||
      candidateGender === targetGender ||
      candidateGender.includes("unisex") ||
      targetGender.includes("unisex");

    if (!hasStrongNoteAffinity && candidateBrand !== targetBrand) {
      score -= 25;
    }

    if (!hasContextAffinity) {
      score -= 18;
    }

    const tieBreaker = hashString(`${currentSlug}-${candidate.slug}-${candidate.id}`);
    return {
      candidate,
      score,
      tieBreaker,
      hasStrongNoteAffinity,
      hasContextAffinity,
      noteSimilarityScore,
    };
  });

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.tieBreaker - right.tieBreaker;
  });

  const bySlug = new Map<
    string,
    {
      candidate: Perfume;
      score: number;
      tieBreaker: number;
      hasStrongNoteAffinity: boolean;
      hasContextAffinity: boolean;
      noteSimilarityScore: number;
    }
  >();
  for (const entry of scored) {
    if (!bySlug.has(entry.candidate.slug)) {
      bySlug.set(entry.candidate.slug, entry);
    }
  }

  const uniqueRanked = Array.from(bySlug.values());
  const strictMatches = uniqueRanked.filter(
    (entry) =>
      entry.score >= 60 &&
      entry.noteSimilarityScore >= 34 &&
      entry.hasStrongNoteAffinity &&
      entry.hasContextAffinity,
  );
  const fallbackMatches = uniqueRanked.filter(
    (entry) => entry.score >= 48 && entry.noteSimilarityScore >= 24,
  );

  const pool = strictMatches.length >= limit ? strictMatches : fallbackMatches;

  return pool.slice(0, limit).map((entry) => entry.candidate);
}

export async function getPerfumeBySlug(
  slug: string,
  variantId?: string,
): Promise<PerfumeWithNotes | null> {
  const [perfumes, notes] = await Promise.all([getPerfumes(), getNotes()]);

  const normalizedSlug = slug.toLowerCase();
  const candidates = perfumes.filter((item) => item.slug === normalizedSlug);
  if (!candidates.length) return null;

  const normalizedVariantId = typeof variantId === "string" ? variantId.trim().toLowerCase() : "";
  const perfume = normalizedVariantId
    ? candidates.find((item) => item.id.toLowerCase() === normalizedVariantId) ?? candidates[0]
    : candidates[0];
  if (!perfume) return null;

  const noteMap = new Map<string, Note>();

  for (const note of notes) {
    noteMap.set(note.slug, note);

    const normalizedSlug = normalizeNoteLookupKey(note.slug);
    if (normalizedSlug && !noteMap.has(normalizedSlug)) {
      noteMap.set(normalizedSlug, note);
    }

    const normalizedName = normalizeNoteLookupKey(note.name);
    if (normalizedName && !noteMap.has(normalizedName)) {
      noteMap.set(normalizedName, note);
    }
  }

  const mapSlugs = (slugs: string[]) =>
    slugs.map((item) => {
      const direct = noteMap.get(item);
      if (direct) {
        return direct;
      }

      const normalized = normalizeNoteLookupKey(item);
      return noteMap.get(normalized) ?? fallbackNote(item);
    });

  return {
    ...perfume,
    notes: {
      top: mapSlugs(perfume.noteSlugs.top),
      heart: mapSlugs(perfume.noteSlugs.heart),
      base: mapSlugs(perfume.noteSlugs.base),
    },
  };
}
