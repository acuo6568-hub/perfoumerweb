import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE, isAdminConfigured, validateAdminSessionToken } from "@/lib/admin-auth";

type TranslateRequest = {
  sourceLocale?: "az" | "en" | "ru";
  text?: string;
  linkLabel?: string;
  mode?: "manual" | "discount";
  perfumeNames?: string[];
  sourcePerfumes?: string[];
};

type TranslationPayload = {
  textByLocale?: Record<string, string>;
  linkLabelByLocale?: Record<string, string>;
  text?: string;
  linkLabel?: string;
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

  const text = normalizeText(payload.text);
  const linkLabel = normalizeText(payload.linkLabel);
  const sourceLocale = payload.sourceLocale === "en" || payload.sourceLocale === "ru" ? payload.sourceLocale : "az";
  const perfumeNames = Array.isArray(payload.perfumeNames)
    ? payload.perfumeNames.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  const sourcePerfumes = Array.isArray(payload.sourcePerfumes)
    ? payload.sourcePerfumes.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  if (!text && !linkLabel && perfumeNames.length === 0) {
    return NextResponse.json({ error: "Missing promotion text." }, { status: 400 });
  }

  const apiKey = process.env.QOXUNU_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "openai_api_key_missing" }, { status: 503 });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const promptData = {
    sourceLocale,
    mode: payload.mode === "discount" ? "discount" : "manual",
    text,
    linkLabel,
    perfumeNames,
    sourcePerfumes,
    targetLocales: ["az", "en", "ru"],
  };

  // If source text is empty but perfume names are provided, ask the model to generate
  // promotional copy (not only translate). Otherwise perform the translation flow.
  const systemMessage = text
    ? "You are a professional Azerbaijani, English, and Russian localization copywriter for a perfume e-commerce admin panel. Translate the given promotion text naturally and elegantly. Keep perfume names, slugs, colors, and button intent unchanged. Return strict JSON with keys textByLocale and linkLabelByLocale, each containing az, en, and ru strings. If the link label is generic, translate it to a concise CTA. Avoid literal machine-translation phrasing."
    : "You are a professional Azerbaijani, English, and Russian copywriter specialized in short, high-conversion e-commerce banner copy for perfume stores. Given a list of perfume names and optional contextual info, generate concise promotional banner text and a short CTA label in Azerbaijani, English and Russian. Return strict JSON with keys textByLocale and linkLabelByLocale, each containing az, en, and ru strings. Preserve perfume names exactly as provided and provide short, punchy CTAs. ";

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
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: JSON.stringify(promptData),
        },
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

  const textByLocale = {
    az: normalizeText(parsed.textByLocale?.az) || text,
    en: normalizeText(parsed.textByLocale?.en) || text,
    ru: normalizeText(parsed.textByLocale?.ru) || text,
  };
  const linkLabelByLocale = {
    az: normalizeText(parsed.linkLabelByLocale?.az) || linkLabel,
    en: normalizeText(parsed.linkLabelByLocale?.en) || linkLabel,
    ru: normalizeText(parsed.linkLabelByLocale?.ru) || linkLabel,
  };

  return NextResponse.json({
    textByLocale,
    linkLabelByLocale,
    text: textByLocale.az || textByLocale.en || textByLocale.ru || text,
    linkLabel: linkLabelByLocale.az || linkLabelByLocale.en || linkLabelByLocale.ru || linkLabel,
  });
}
