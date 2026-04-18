import path from "node:path";
import { readFileSync } from "node:fs";
import { unstable_cache } from "next/cache";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getPerfumeBySlug } from "@/lib/catalog";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

type SummaryRequest = {
  slug?: string;
  locale?: "az" | "en" | "ru";
};

const SUMMARY_LANGUAGE: Record<NonNullable<SummaryRequest["locale"]>, string> = {
  az: "Azerbaijani",
  en: "English",
  ru: "Russian",
};

function parseEnvFile(filePath: string) {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const result: Record<string, string> = {};

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key) {
        continue;
      }

      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  } catch {
    return {};
  }
}

function getEnvValue(key: string) {
  const direct = process.env[key];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const root = process.cwd();
  const fromEnv = parseEnvFile(path.join(root, ".env"));
  const fromEnvLocal = parseEnvFile(path.join(root, ".env.local"));

  return (fromEnvLocal[key] || fromEnv[key] || "").trim();
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw) as { summary?: string; highlights?: string[] };
  } catch {
    return {};
  }
}

type PerfumeSummaryInput = {
  name: string;
  brand: string;
  gender: string;
  stockStatus: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  sizes: Array<{ label: string; ml: number; price: number }>;
};

type CachedSummaryResult = {
  summary: string;
  highlights: string[];
};

const SUMMARY_CACHE_TABLE = "perfume_summary_cache";

function normalizeLocale(input: unknown): NonNullable<SummaryRequest["locale"]> {
  return input === "en" || input === "ru" ? input : "az";
}

function normalizeSlug(input: unknown) {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
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

async function readSummaryFromDatabase(cacheKey: string): Promise<CachedSummaryResult | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(SUMMARY_CACHE_TABLE)
    .select("summary, highlights")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    summary: typeof data.summary === "string" ? data.summary : "",
    highlights: Array.isArray(data.highlights)
      ? data.highlights.filter((item): item is string => typeof item === "string")
      : [],
  };
}

async function writeSummaryToDatabase(options: {
  cacheKey: string;
  slug: string;
  locale: NonNullable<SummaryRequest["locale"]>;
  fingerprint: string;
  result: CachedSummaryResult;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  await supabase.from(SUMMARY_CACHE_TABLE).upsert(
    {
      cache_key: options.cacheKey,
      slug: options.slug,
      locale: options.locale,
      fingerprint: options.fingerprint,
      summary: options.result.summary,
      highlights: options.result.highlights,
    },
    { onConflict: "cache_key" },
  );
}

const getCachedPerfumeSummary = unstable_cache(
  async (
    cacheKey: string,
    locale: NonNullable<SummaryRequest["locale"]>,
    perfume: PerfumeSummaryInput,
  ): Promise<CachedSummaryResult> => {
    const apiKey = getEnvValue("QOXUNU_OPENAI_API_KEY") || getEnvValue("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("provider_unavailable");
    }

    const summaryLanguage = SUMMARY_LANGUAGE[locale];
    const model = getEnvValue("OPENAI_MODEL") || "gpt-4.1-mini";

    const payload = {
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You are a fragrance expert. Write a concise and useful scent summary in ${summaryLanguage}. Use second-person tone. Return strict JSON with keys: summary (string, 2-4 short sentences), highlights (array of 3-5 concise bullet-like strings). Blend factual perfume data and interpretive guidance. Keep perfume and note names as-is.`,
        },
        {
          role: "user",
          content: JSON.stringify({ locale, perfume, cacheKey }),
        },
      ],
    };

    const completionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!completionResponse.ok) {
      throw new Error("provider_unavailable");
    }

    const completionJson = (await completionResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const parsed = safeJsonParse(completionJson.choices?.[0]?.message?.content ?? "{}");

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter((item): item is string => typeof item === "string").slice(0, 5)
        : [],
    };
  },
  ["perfume-summary-v1"],
  {
    revalidate: 60 * 60 * 24 * 30,
    tags: ["perfume-summary"],
  },
);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SummaryRequest;
  const slug = normalizeSlug(body.slug);
  const locale = normalizeLocale(body.locale);

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const perfume = await getPerfumeBySlug(slug);
  if (!perfume) {
    return NextResponse.json({ error: "perfume not found" }, { status: 404 });
  }

  const perfumeInput: PerfumeSummaryInput = {
    name: perfume.name,
    brand: perfume.brand,
    gender: perfume.gender,
    stockStatus: perfume.stockStatus,
    topNotes: perfume.notes.top.map((item) => item.name),
    heartNotes: perfume.notes.heart.map((item) => item.name),
    baseNotes: perfume.notes.base.map((item) => item.name),
    sizes: perfume.sizes,
  };

  const cacheKey = [
    slug,
    locale,
    perfumeInput.name,
    perfumeInput.brand,
    perfumeInput.gender,
    perfumeInput.topNotes.join(","),
    perfumeInput.heartNotes.join(","),
    perfumeInput.baseNotes.join(","),
    perfumeInput.sizes.map((size) => `${size.ml}-${size.price}`).join("|"),
  ].join("::");

  const existing = await readSummaryFromDatabase(cacheKey);
  if (existing) {
    return NextResponse.json({
      summary: existing.summary,
      highlights: existing.highlights,
      cached: true,
    });
  }

  let cachedResult: CachedSummaryResult;
  try {
    cachedResult = await getCachedPerfumeSummary(cacheKey, locale, perfumeInput);
  } catch {
    return NextResponse.json(
      {
        summary: "",
        highlights: [],
        warning: "provider_unavailable",
      },
      { status: 200 },
    );
  }

  await writeSummaryToDatabase({
    cacheKey,
    slug,
    locale,
    fingerprint: cacheKey,
    result: cachedResult,
  });

  return NextResponse.json({
    summary: cachedResult.summary,
    highlights: cachedResult.highlights,
    cached: true,
  });
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

  const perfumeInput: PerfumeSummaryInput = {
    name: perfume.name,
    brand: perfume.brand,
    gender: perfume.gender,
    stockStatus: perfume.stockStatus,
    topNotes: perfume.notes.top.map((item) => item.name),
    heartNotes: perfume.notes.heart.map((item) => item.name),
    baseNotes: perfume.notes.base.map((item) => item.name),
    sizes: perfume.sizes,
  };

  const cacheKey = [
    slug,
    locale,
    perfumeInput.name,
    perfumeInput.brand,
    perfumeInput.gender,
    perfumeInput.topNotes.join(","),
    perfumeInput.heartNotes.join(","),
    perfumeInput.baseNotes.join(","),
    perfumeInput.sizes.map((size) => `${size.ml}-${size.price}`).join("|"),
  ].join("::");

  const existing = await readSummaryFromDatabase(cacheKey);
  if (!existing) {
    return NextResponse.json({ error: "cache_miss" }, { status: 404 });
  }

  return NextResponse.json({
    summary: existing.summary,
    highlights: existing.highlights,
    cached: true,
  });
}
