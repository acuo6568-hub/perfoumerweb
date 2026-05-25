import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE, isAdminConfigured, validateAdminSessionToken } from "@/lib/admin-auth";

type TranslateRequest = {
  sourceLocale?: "az" | "en" | "ru";
  videoTitle?: string;
  videoDescription?: string;
  videoCtaLabel?: string;
};

type TranslationPayload = {
  titleByLocale?: Record<string, string>;
  descriptionByLocale?: Record<string, string>;
  ctaLabelByLocale?: Record<string, string>;
};

const OPENAI_TIMEOUT_MS = 20_000;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as TranslationPayload;
  } catch {
    return null;
  }
}

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin login is not configured. Set ADMIN_PASSWORD in env." },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!validateAdminSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  let payload: TranslateRequest;

  try {
    payload = (await request.json()) as TranslateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const videoTitle = normalizeText(payload.videoTitle);
  const videoDescription = normalizeText(payload.videoDescription);
  const videoCtaLabel = normalizeText(payload.videoCtaLabel);
  const sourceLocale = payload.sourceLocale === "en" || payload.sourceLocale === "ru" ? payload.sourceLocale : "az";

  if (!videoTitle && !videoDescription && !videoCtaLabel) {
    return NextResponse.json({ error: "Missing header text." }, { status: 400 });
  }

  const apiKey = process.env.QOXUNU_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "openai_api_key_missing" }, { status: 503 });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const promptData = {
    sourceLocale,
    videoTitle,
    videoDescription,
    videoCtaLabel,
    targetLocales: ["az", "en", "ru"],
  };

  const systemMessage =
    "You are a professional Azerbaijani, English, and Russian localization copywriter for a perfume e-commerce homepage hero. Translate the given video title, description, and CTA label naturally and elegantly. Keep brand names, perfume names, and CTA intent unchanged. Return strict JSON with keys titleByLocale, descriptionByLocale, and ctaLabelByLocale, each containing az, en, and ru strings. Avoid literal machine-translation phrasing.";

  const completionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: JSON.stringify(promptData) },
      ],
    }),
  }).catch(() => null);

  if (!completionResponse || !completionResponse.ok) {
    return NextResponse.json({ error: "translation_provider_unavailable" }, { status: 503 });
  }

  const completionJson = (await completionResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const parsed = safeJsonParse(completionJson.choices?.[0]?.message?.content ?? "{}");

  if (!parsed) {
    return NextResponse.json({ error: "translation_parse_failed" }, { status: 502 });
  }

  const titleByLocale = {
    az: normalizeText(parsed.titleByLocale?.az) || videoTitle,
    en: normalizeText(parsed.titleByLocale?.en) || videoTitle,
    ru: normalizeText(parsed.titleByLocale?.ru) || videoTitle,
  };
  const descriptionByLocale = {
    az: normalizeText(parsed.descriptionByLocale?.az) || videoDescription,
    en: normalizeText(parsed.descriptionByLocale?.en) || videoDescription,
    ru: normalizeText(parsed.descriptionByLocale?.ru) || videoDescription,
  };
  const ctaLabelByLocale = {
    az: normalizeText(parsed.ctaLabelByLocale?.az) || videoCtaLabel,
    en: normalizeText(parsed.ctaLabelByLocale?.en) || videoCtaLabel,
    ru: normalizeText(parsed.ctaLabelByLocale?.ru) || videoCtaLabel,
  };

  return NextResponse.json({
    titleByLocale,
    descriptionByLocale,
    ctaLabelByLocale,
  });
}