import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import path from "node:path";
import { readFileSync } from "node:fs";

import { getPerfumes } from "@/lib/catalog";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";
import type { Perfume } from "@/types/catalog";

type QuizAnswers = {
  gender?: string;
  vibe?: string;
  occasion?: string;
  intensity?: string;
  projection?: string;
  sweetness?: string;
  profile?: string;
  budget?: string;
  season?: string;
  longevity?: string;
};

type RecommendRequest = {
  locale?: "az" | "en" | "ru";
  timezone?: string;
  userId?: string;
  email?: string;
  username?: string;
  isSignedIn?: boolean;
  isGuest?: boolean;
  answers?: QuizAnswers;
  freeText?: string;
  fallbackSlugs?: string[];
};

type QoxunuRecommendation = {
  slug: string;
  name: string;
  brand: string;
  gender: string;
  top: string[];
  heart: string[];
  base: string[];
  minPrice: number;
};

const SUMMARY_LANGUAGE: Record<NonNullable<RecommendRequest["locale"]>, string> = {
  az: "Azerbaijani",
  en: "English",
  ru: "Russian",
};

function enforceSecondPersonVoice(summary: string, locale: NonNullable<RecommendRequest["locale"]>) {
  let result = summary.trim();

  if (!result) {
    return "";
  }

  if (locale === "az") {
    result = result
      .replace(/\bİstifadəçi\b/g, "Siz")
      .replace(/\bistifadəçi\b/g, "siz")
      .replace(/\bİstifadəçinin\b/g, "Sizin")
      .replace(/\bistifadəçinin\b/g, "sizin")
      .replace(/\bİstifadəçiyə\b/g, "Sizə")
      .replace(/\bistifadəçiyə\b/g, "sizə");
  }

  if (locale === "en") {
    result = result
      .replace(/\b[Tt]he user\b/g, "You")
      .replace(/\b[Uu]ser's\b/g, "your")
      .replace(/\b[Uu]ser\b/g, "you");
  }

  if (locale === "ru") {
    result = result
      .replace(/\bПользователь\b/g, "Вы")
      .replace(/\bпользователь\b/g, "вы")
      .replace(/\bпользователя\b/g, "вас")
      .replace(/\bпользователю\b/g, "вам")
      .replace(/\bпользовательский\b/g, "ваш");
  }

  return result;
}

const KEYWORDS = {
  vibe: {
    fresh: ["citrus", "bergamot", "lemon", "grapefruit", "marine", "aquatic", "green", "tea", "neroli"],
    warm: ["vanilla", "amber", "tonka", "benzoin", "cinnamon", "caramel", "resin"],
    floral: ["rose", "jasmine", "peony", "iris", "violet", "orange", "floral"],
    bold: ["oud", "leather", "tobacco", "smoke", "spice", "incense", "musk", "patchouli"],
  },
  occasion: {
    daily: ["citrus", "green", "musk", "floral", "tea"],
    office: ["bergamot", "citrus", "neroli", "green", "lavender", "tea"],
    date: ["rose", "vanilla", "amber", "musk", "jasmine", "tonka"],
    evening: ["oud", "amber", "leather", "tobacco", "patchouli", "spice"],
  },
  intensity: {
    soft: ["citrus", "green", "tea", "floral", "neroli"],
    balanced: ["musk", "floral", "woody", "amber"],
    strong: ["oud", "leather", "tobacco", "amber", "patchouli", "incense"],
  },
  projection: {
    skin: ["musk", "tea", "iris", "cashmere", "soft"],
    close: ["floral", "green", "woody", "musk", "smooth"],
    moderate: ["amber", "citrus", "woody", "floral", "musk"],
    bold: ["oud", "leather", "tobacco", "incense", "patchouli"],
  },
  sweetness: {
    dry: ["citrus", "green", "tea", "iris", "woody"],
    balanced: ["musk", "floral", "amber", "woody", "vanilla"],
    sweet: ["vanilla", "tonka", "caramel", "amber", "jasmine"],
    rich: ["vanilla", "amber", "tonka", "resin", "benzoin", "caramel"],
  },
  profile: {
    citrus: ["citrus", "bergamot", "lemon", "mandarin", "grapefruit", "neroli"],
    floral: ["floral", "rose", "jasmine", "iris", "violet", "peony", "ylang"],
    woody: ["woody", "sandalwood", "cedar", "vetiver", "patchouli"],
    amber: ["amber", "vanilla", "tonka", "benzoin", "resin", "sweet"],
    oud: ["oud", "smoke", "leather", "incense", "tobacco"],
  },
} as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getStartingPrice(perfume: Perfume) {
  if (!perfume.sizes.length) {
    return Number.POSITIVE_INFINITY;
  }

  return perfume.sizes.reduce((min, item) => (item.price < min ? item.price : min), perfume.sizes[0].price);
}

function collectPerfumeTokens(perfume: Perfume) {
  return [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
    normalize(perfume.name),
    normalize(perfume.brand),
  ].map(normalize);
}

function recommendationIdentity(perfume: Perfume) {
  return `${normalize(perfume.name)}::${normalize(perfume.brand)}`;
}

function dedupeRecommendationPerfumes(perfumes: Perfume[]) {
  const byIdentity = new Map<string, Perfume>();

  for (const perfume of perfumes) {
    const identity = recommendationIdentity(perfume);
    if (!byIdentity.has(identity)) {
      byIdentity.set(identity, perfume);
      continue;
    }

    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, perfume);
      continue;
    }

    const existingInStock = existing.inStock ? 1 : 0;
    const incomingInStock = perfume.inStock ? 1 : 0;
    if (incomingInStock > existingInStock) {
      byIdentity.set(identity, perfume);
      continue;
    }

    const existingPrice = getStartingPrice(existing);
    const incomingPrice = getStartingPrice(perfume);
    if (incomingPrice < existingPrice) {
      byIdentity.set(identity, perfume);
    }
  }

  return Array.from(byIdentity.values());
}

function countMatches(tokens: string[], keywords: readonly string[]) {
  let score = 0;
  for (const keyword of keywords) {
    if (tokens.some((token) => token.includes(keyword))) {
      score += 1;
    }
  }
  return score;
}

function scorePerfume(perfume: Perfume, answers: QuizAnswers) {
  const tokens = collectPerfumeTokens(perfume);
  let score = 0;

  const gender = normalize(perfume.gender);
  if (answers.gender && answers.gender !== "all") {
    if (gender.includes(answers.gender)) {
      score += 6;
    } else if (gender.includes("unisex")) {
      score += 3;
    } else {
      score -= 2;
    }
  }

  if (answers.vibe && answers.vibe in KEYWORDS.vibe) {
    score += countMatches(tokens, KEYWORDS.vibe[answers.vibe as keyof typeof KEYWORDS.vibe]) * 2.2;
  }

  if (answers.occasion && answers.occasion in KEYWORDS.occasion) {
    score += countMatches(tokens, KEYWORDS.occasion[answers.occasion as keyof typeof KEYWORDS.occasion]) * 1.8;
  }

  if (answers.intensity && answers.intensity in KEYWORDS.intensity) {
    score += countMatches(tokens, KEYWORDS.intensity[answers.intensity as keyof typeof KEYWORDS.intensity]) * 1.5;
  }

  if (answers.projection && answers.projection in KEYWORDS.projection) {
    score += countMatches(tokens, KEYWORDS.projection[answers.projection as keyof typeof KEYWORDS.projection]) * 1.4;
  }

  if (answers.sweetness && answers.sweetness in KEYWORDS.sweetness) {
    score += countMatches(tokens, KEYWORDS.sweetness[answers.sweetness as keyof typeof KEYWORDS.sweetness]) * 1.6;
  }

  if (answers.profile && answers.profile in KEYWORDS.profile) {
    score += countMatches(tokens, KEYWORDS.profile[answers.profile as keyof typeof KEYWORDS.profile]) * 2.8;
  }

  const price = getStartingPrice(perfume);
  if (answers.budget === "under80") {
    score += price <= 80 ? 3 : -1;
  } else if (answers.budget === "80to140") {
    score += price >= 80 && price <= 140 ? 3 : -1;
  } else if (answers.budget === "140plus") {
    score += price >= 140 ? 3 : -1;
  }

  if (perfume.inStock) {
    score += 1.2;
  }

  return score;
}

function parseJsonObject(raw: string) {
  try {
    return JSON.parse(raw) as { slugs?: string[]; summary?: string };
  } catch {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      return {};
    }

    try {
      return JSON.parse(raw.slice(first, last + 1)) as { slugs?: string[]; summary?: string };
    } catch {
      return {};
    }
  }
}

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
  const fromFiles = fromEnvLocal[key] || fromEnv[key] || "";

  return fromFiles.trim();
}

function sanitizeText(value: unknown, fallback = "", maxLength = 120) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function readHeader(headers: Headers, keys: string[]) {
  for (const key of keys) {
    const value = headers.get(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function decodeHeaderValue(value: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value.replace(/\+/g, "%20"));
  } catch {
    return value;
  }
}

async function logQoxunuResult(request: Request, payload: {
  locale: string;
  timezone: string;
  userId: string | null;
  email: string;
  username: string;
  isSignedIn: boolean;
  isGuest: boolean;
  answers: QuizAnswers;
  freeText: string;
  recommendations: QoxunuRecommendation[];
  summary: string;
  usedFallback: boolean;
  warning: string;
}) {
  const config = getSupabaseServiceConfigFromServer();
  if (!config) {
    return;
  }

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const countryCodeFromHeaders = readHeader(request.headers, ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"]).toUpperCase();
  const countryFromHeaders = readHeader(request.headers, ["x-vercel-ip-country-name", "cf-country-name"]);
  const regionFromHeaders = readHeader(request.headers, ["x-vercel-ip-country-region", "x-vercel-ip-region", "cf-region"]);
  const cityFromHeaders = readHeader(request.headers, ["x-vercel-ip-city", "cf-ipcity", "x-city"]);
  const userAgent = sanitizeText(request.headers.get("user-agent") || "", "", 320);

  const body = payload;

  await supabase.from("qoxunu_quiz_logs").insert([
    {
      user_id: body.userId,
      anonymous_id: body.userId || `guest-${Date.now().toString(36)}`,
      is_signed_in: body.isSignedIn,
      is_guest: body.isGuest,
      email: sanitizeText(body.email, "", 255),
      username: sanitizeText(body.username, "", 120),
      locale: sanitizeText(body.locale, "az", 10),
      page_path: "/qoxunu",
      free_text: sanitizeText(body.freeText, "", 1200),
      answers_json: body.answers,
      recommendations_json: body.recommendations,
      summary: sanitizeText(body.summary, "", 1200),
      used_fallback: body.usedFallback,
      warning: sanitizeText(body.warning, "", 180),
      device_type: "",
      browser: "",
      os: "",
      user_agent: userAgent,
      country_code: sanitizeText(countryCodeFromHeaders, "", 4),
      country: sanitizeText(decodeHeaderValue(countryFromHeaders), "", 120),
      region: sanitizeText(decodeHeaderValue(regionFromHeaders), "", 120),
      city: sanitizeText(decodeHeaderValue(cityFromHeaders), "", 120),
      timezone: sanitizeText(body.timezone || request.headers.get("x-timezone") || "", "", 80),
    },
  ]);
}

export async function POST(request: Request) {
  const apiKey = getEnvValue("QOXUNU_OPENAI_API_KEY") || getEnvValue("OPENAI_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "QOXUNU_OPENAI_API_KEY is missing." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as RecommendRequest;
  const locale: NonNullable<RecommendRequest["locale"]> = body.locale === "en" || body.locale === "ru" ? body.locale : "az";
  const summaryLanguage = SUMMARY_LANGUAGE[locale];
  const answers = body.answers ?? {};
  const freeText = (body.freeText ?? "").trim();
  const timezone = sanitizeText(body.timezone, "", 80);
  const userId = typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : null;
  const email = sanitizeText(body.email, "", 255);
  const username = sanitizeText(body.username, "", 120);
  const isSignedIn = Boolean(body.isSignedIn || userId);
  const isGuest = typeof body.isGuest === "boolean" ? body.isGuest : !isSignedIn;

  const perfumes = dedupeRecommendationPerfumes(await getPerfumes());
  const candidates = [...perfumes]
    .map((perfume) => ({ perfume, score: scorePerfume(perfume, answers) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ perfume }) => ({
      slug: perfume.slug,
      name: perfume.name,
      brand: perfume.brand,
      gender: perfume.gender,
      top: perfume.noteSlugs.top,
      heart: perfume.noteSlugs.heart,
      base: perfume.noteSlugs.base,
      minPrice: getStartingPrice(perfume),
    }));

  const model = getEnvValue("OPENAI_MODEL") || "gpt-4.1-mini";

  const completionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You are a perfume recommendation expert. Choose exactly 3 candidates by slug based on structured quiz answers and free-text preference. Return strict JSON with keys: slugs (string[]), summary (string, 1-3 short sentences explaining taste and why these picks fit). The summary language MUST be ${summaryLanguage} only. Do not switch language. Do not output English unless locale is en. Keep brand and perfume names unchanged. Address the customer directly in second person (Azerbaijani: siz, English: you, Russian: вы). Never call them "user" or equivalent third-person wording.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            locale,
            summaryLanguage,
            answers,
            freeText,
            candidates,
            fallbackSlugs: body.fallbackSlugs ?? [],
          }),
        },
      ],
    }),
  });

  if (!completionResponse.ok) {
    const fallback = (body.fallbackSlugs ?? []).slice(0, 3);
    return NextResponse.json({
      slugs: fallback,
      summary: "",
      usedFallback: true,
      warning: "provider_unavailable",
    });
  }

  const completionJson = (await completionResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = completionJson.choices?.[0]?.message?.content ?? "{}";
  const parsed = parseJsonObject(content);

  const allowedSlugs = new Set(candidates.map((item) => item.slug));
  const selected = (parsed.slugs ?? [])
    .filter((slug) => allowedSlugs.has(slug))
    .slice(0, 3);

  const uniqueSelected = Array.from(new Set(selected));
  const fallback = (body.fallbackSlugs ?? []).filter((slug) => allowedSlugs.has(slug));

  const finalSlugs = [...uniqueSelected, ...fallback].slice(0, 3);
  const usedFallback = uniqueSelected.length === 0;

  const responsePayload = {
    slugs: finalSlugs,
    summary: typeof parsed.summary === "string" ? enforceSecondPersonVoice(parsed.summary, locale) : "",
    usedFallback,
    warning: usedFallback ? "no_ai_selection" : null,
  };

  void logQoxunuResult(request, {
    locale,
    timezone,
    userId,
    email,
    username,
    isSignedIn,
    isGuest,
    answers,
    freeText,
    recommendations: finalSlugs.map((slug) => {
      const perfume = candidates.find((item) => item.slug === slug);
      return perfume
        ? perfume
        : { slug, name: slug, brand: "", gender: "", top: [], heart: [], base: [], minPrice: 0 };
    }),
    summary: typeof parsed.summary === "string" ? enforceSecondPersonVoice(parsed.summary, locale) : "",
    usedFallback,
    warning: usedFallback ? "no_ai_selection" : "",
  }).catch((error) => {
    console.error("Failed to store Qoxunu log:", error);
  });

  return NextResponse.json(responsePayload);
}
