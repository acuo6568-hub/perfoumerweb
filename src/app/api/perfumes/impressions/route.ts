import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getPerfumeBySlug } from "@/lib/catalog";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

export const runtime = "nodejs";

type SupportedLocale = "az" | "en" | "ru";

type ImpressionDimensionKey = "longevity" | "sillage" | "season" | "timeOfDay" | "age";

type ImpressionCacheEntry = {
  slug: string;
  locale: SupportedLocale;
  updatedAt: string;
  data: ImpressionResult;
};

type ImpressionCacheStore = Record<string, ImpressionCacheEntry>;

type ImpressionResult = {
  summary: string;
  matrix: Record<ImpressionDimensionKey, Record<string, number>>;
};

type ImpressionRequest = {
  slug?: string;
  locale?: SupportedLocale;
};

const CACHE_VERSION = "v1";
const CACHE_FILE_PATH = path.join(process.cwd(), "data", "admin", "perfume-impressions-cache.json");
const DB_CACHE_TABLE = "perfume_impression_cache";

function normalizeLocale(input: unknown): SupportedLocale {
  return input === "en" || input === "ru" ? input : "az";
}

function normalizeSlug(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

function parseEnvFile(raw: string) {
  const result: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (!key) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

async function getEnvValue(key: string): Promise<string> {
  const direct = process.env[key];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const root = process.cwd();
  const envFilePath = path.join(root, ".env");
  const envLocalPath = path.join(root, ".env.local");

  let env: Record<string, string> = {};
  let envLocal: Record<string, string> = {};

  try {
    env = parseEnvFile(await readFile(envFilePath, "utf-8"));
  } catch {
    env = {};
  }

  try {
    envLocal = parseEnvFile(await readFile(envLocalPath, "utf-8"));
  } catch {
    envLocal = {};
  }

  return (envLocal[key] || env[key] || "").trim();
}

async function readCache(): Promise<ImpressionCacheStore> {
  try {
    const raw = await readFile(CACHE_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ImpressionCacheStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCache(store: ImpressionCacheStore) {
  await mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true });
  await writeFile(CACHE_FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function getSupabaseAdminClient() {
  const config = getSupabaseServiceConfigFromServer();
  if (!config) {
    return null;
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readCacheFromDatabase(key: string): Promise<ImpressionCacheEntry | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(DB_CACHE_TABLE)
    .select("slug, locale, updated_at, data")
    .eq("cache_key", key)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsed = safeParseImpression(JSON.stringify(data.data ?? {}));
  if (!parsed) {
    return null;
  }

  const locale = normalizeLocale(data.locale);

  return {
    slug: typeof data.slug === "string" ? data.slug : "",
    locale,
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : new Date().toISOString(),
    data: parsed,
  };
}

async function writeCacheToDatabase(options: {
  key: string;
  slug: string;
  locale: SupportedLocale;
  fingerprint: string;
  entry: ImpressionCacheEntry;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  await supabase.from(DB_CACHE_TABLE).upsert(
    {
      cache_key: options.key,
      slug: options.slug,
      locale: options.locale,
      fingerprint: options.fingerprint,
      data: options.entry.data,
      updated_at: options.entry.updatedAt,
    },
    { onConflict: "cache_key" },
  );
}

function safeParseImpression(raw: string): ImpressionResult | null {
  const fallbackMatrix: ImpressionResult["matrix"] = {
    longevity: {
      weak: 0,
      unstable: 0,
      moderate: 0,
      long: 0,
      very_long: 0,
    },
    sillage: {
      none: 0,
      low: 0,
      moderate: 0,
      high: 0,
      very_high: 0,
    },
    season: {
      autumn: 0,
      winter: 0,
      spring: 0,
      summer: 0,
    },
    timeOfDay: {
      morning: 0,
      evening: 0,
    },
    age: {
      under_18: 0,
      age_18_25: 0,
      age_26_35: 0,
      age_35_45: 0,
      age_45_plus: 0,
    },
  };

  try {
    const parsed = JSON.parse(raw) as Partial<ImpressionResult>;
    if (!parsed || typeof parsed !== "object") return null;

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const matrixInputRecord =
      parsed.matrix && typeof parsed.matrix === "object"
        ? (parsed.matrix as Record<string, unknown>)
        : {};

    const matrix = { ...fallbackMatrix };

    for (const dimension of Object.keys(fallbackMatrix) as ImpressionDimensionKey[]) {
      const source = matrixInputRecord[dimension] && typeof matrixInputRecord[dimension] === "object"
        ? (matrixInputRecord[dimension] as Record<string, unknown>)
        : {};

      for (const key of Object.keys(fallbackMatrix[dimension])) {
        const numeric = Number(source[key]);
        matrix[dimension][key] = Number.isFinite(numeric) ? Math.max(0, Math.min(5, Math.round(numeric))) : 0;
      }
    }

    return {
      summary,
      matrix,
    };
  } catch {
    return null;
  }
}

function getCacheKey(slug: string, locale: SupportedLocale, fingerprint: string) {
  return `${CACHE_VERSION}::${slug}::${locale}::${fingerprint}`;
}

function perfumeFingerprint(input: {
  name: string;
  brand: string;
  gender: string;
  stockStatus: string;
  top: string[];
  heart: string[];
  base: string[];
  sizes: Array<{ ml: number; price: number }>;
}) {
  return [
    input.name,
    input.brand,
    input.gender,
    input.stockStatus,
    input.top.join(","),
    input.heart.join(","),
    input.base.join(","),
    input.sizes.map((size) => `${size.ml}-${size.price}`).join("|"),
  ].join("::");
}

async function validateUserFromBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1]?.trim();
  if (!accessToken) return false;

  const supabaseUrl = await getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = await getEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return false;
  return true;
}

async function generateImpressionWithAI(options: {
  locale: SupportedLocale;
  slug: string;
  name: string;
  brand: string;
  gender: string;
  top: string[];
  heart: string[];
  base: string[];
  sizes: Array<{ ml: number; price: number }>;
}) {
  const apiKey = (await getEnvValue("QOXUNU_OPENAI_API_KEY")) || (await getEnvValue("OPENAI_API_KEY"));
  if (!apiKey) {
    throw new Error("provider_unavailable");
  }

  const model = (await getEnvValue("OPENAI_MODEL")) || "gpt-4.1-mini";
  const language = options.locale === "en" ? "English" : options.locale === "ru" ? "Russian" : "Azerbaijani";

  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You are a perfume evaluator. Return strict JSON only with keys: summary (string, 1-2 short sentences in ${language}) and matrix (object).\n` +
            "matrix must include exact dimensions and option keys with integer scores 0-5:\n" +
            "longevity: weak, unstable, moderate, long, very_long\n" +
            "sillage: none, low, moderate, high, very_high\n" +
            "season: autumn, winter, spring, summer\n" +
            "timeOfDay: morning, evening\n" +
            "age: under_18, age_18_25, age_26_35, age_35_45, age_45_plus\n" +
            "At least one option per dimension should have score >= 3.",
        },
        {
          role: "user",
          content: JSON.stringify({
            slug: options.slug,
            name: options.name,
            brand: options.brand,
            gender: options.gender,
            notes: {
              top: options.top,
              heart: options.heart,
              base: options.base,
            },
            sizes: options.sizes,
          }),
        },
      ],
    }),
  });

  if (!completion.ok) {
    throw new Error("provider_unavailable");
  }

  const json = (await completion.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = safeParseImpression(raw);
  if (!parsed) {
    throw new Error("invalid_provider_payload");
  }

  return parsed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get("slug"));
  const locale = normalizeLocale(url.searchParams.get("locale"));

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const perfume = await getPerfumeBySlug(slug);
  if (!perfume) {
    return NextResponse.json({ error: "perfume not found" }, { status: 404 });
  }

  const fingerprint = perfumeFingerprint({
    name: perfume.name,
    brand: perfume.brand,
    gender: perfume.gender,
    stockStatus: perfume.stockStatus,
    top: perfume.noteSlugs.top,
    heart: perfume.noteSlugs.heart,
    base: perfume.noteSlugs.base,
    sizes: perfume.sizes,
  });

  const key = getCacheKey(slug, locale, fingerprint);
  let cached = await readCacheFromDatabase(key);

  if (!cached) {
    const cache = await readCache();
    const fileCached = cache[key];

    if (fileCached) {
      cached = fileCached;
      await writeCacheToDatabase({
        key,
        slug,
        locale,
        fingerprint,
        entry: fileCached,
      });
    }
  }

  if (!cached) {
    return NextResponse.json({ error: "cache_miss" }, { status: 404 });
  }

  return NextResponse.json({
    cached: true,
    slug,
    locale,
    data: cached.data,
    updatedAt: cached.updatedAt,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ImpressionRequest;
  const slug = normalizeSlug(body.slug);
  const locale = normalizeLocale(body.locale);

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const perfume = await getPerfumeBySlug(slug);
  if (!perfume) {
    return NextResponse.json({ error: "perfume not found" }, { status: 404 });
  }

  const fingerprint = perfumeFingerprint({
    name: perfume.name,
    brand: perfume.brand,
    gender: perfume.gender,
    stockStatus: perfume.stockStatus,
    top: perfume.noteSlugs.top,
    heart: perfume.noteSlugs.heart,
    base: perfume.noteSlugs.base,
    sizes: perfume.sizes,
  });

  const key = getCacheKey(slug, locale, fingerprint);
  const cache = await readCache();
  let cached = await readCacheFromDatabase(key);

  if (!cached) {
    const fileCached = cache[key];
    if (fileCached) {
      cached = fileCached;
      await writeCacheToDatabase({
        key,
        slug,
        locale,
        fingerprint,
        entry: fileCached,
      });
    }
  }

  if (cached) {
    return NextResponse.json({
      cached: true,
      slug,
      locale,
      data: cached.data,
      updatedAt: cached.updatedAt,
    });
  }

  const isAuthenticated = await validateUserFromBearerToken(request);
  if (!isAuthenticated) {
    return NextResponse.json(
      {
        error: "login_required_for_generation",
      },
      { status: 401 },
    );
  }

  try {
    const generated = await generateImpressionWithAI({
      locale,
      slug,
      name: perfume.name,
      brand: perfume.brand,
      gender: perfume.gender,
      top: perfume.noteSlugs.top,
      heart: perfume.noteSlugs.heart,
      base: perfume.noteSlugs.base,
      sizes: perfume.sizes,
    });

    cache[key] = {
      slug,
      locale,
      updatedAt: new Date().toISOString(),
      data: generated,
    };

    await writeCache(cache);
    await writeCacheToDatabase({
      key,
      slug,
      locale,
      fingerprint,
      entry: cache[key],
    });

    return NextResponse.json({
      cached: false,
      slug,
      locale,
      data: generated,
      updatedAt: cache[key].updatedAt,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "provider_error";
    return NextResponse.json({ error: code }, { status: 503 });
  }
}
