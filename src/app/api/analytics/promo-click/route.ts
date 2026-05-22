import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PromoClickPayload = {
  sessionId?: string;
  anonymousId?: string;
  userId?: string | null;
  isLoggedIn?: boolean;
  deviceType?: string;
  os?: string;
  browser?: string;
  locale?: string;
  path?: string;
  referrer?: string;
  timezone?: string;
  countryCode?: string;
  country?: string;
  region?: string;
  city?: string;
  promoKey?: string;
  promoLabel?: string;
  promoTarget?: string;
};

function sanitizeText(value: unknown, fallback: string, maxLength = 180): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function toBool(value: unknown): boolean {
  return value === true;
}

function readHeader(headers: Headers, keys: string[]): string {
  for (const key of keys) {
    const value = headers.get(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function decodeHeaderValue(value: string): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value.replace(/\+/g, "%20"));
  } catch {
    return value;
  }
}

export async function POST(request: Request) {
  let body: PromoClickPayload;
  try {
    body = (await request.json()) as PromoClickPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const sessionId = sanitizeText(body.sessionId, "", 96);
  const anonymousId = sanitizeText(body.anonymousId, "", 96);
  const promoKey = sanitizeText(body.promoKey, "", 250);
  const promoLabel = sanitizeText(body.promoLabel, "", 250);
  const promoTarget = sanitizeText(body.promoTarget, "", 250);

  if (!sessionId || !anonymousId || !promoKey) {
    return NextResponse.json({ error: "Missing promo click identifiers." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return NextResponse.json({ error: "Supabase config missing." }, { status: 500 });
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey || supabaseAnonKey || "",
  );

  const countryCodeFromHeaders = readHeader(request.headers, [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "x-country-code",
  ]).toUpperCase();
  const countryFromHeaders = readHeader(request.headers, [
    "x-vercel-ip-country-name",
    "cf-country-name",
  ]);
  const regionFromHeaders = readHeader(request.headers, [
    "x-vercel-ip-country-region",
    "x-vercel-ip-region",
    "cf-region",
  ]);
  const cityFromHeaders = readHeader(request.headers, [
    "x-vercel-ip-city",
    "cf-ipcity",
    "x-city",
  ]);
  const userAgent = sanitizeText(request.headers.get("user-agent") || "", "", 320);

  const payload = {
    session_id: sessionId,
    anonymous_id: anonymousId,
    user_id: sanitizeText(body.userId ?? "", "", 64) || null,
    event_type: "promo_click",
    is_logged_in: toBool(body.isLoggedIn),
    device_type: sanitizeText(body.deviceType, "unknown", 24),
    os: sanitizeText(body.os, "", 48),
    browser: sanitizeText(body.browser, "", 48),
    locale: sanitizeText(body.locale, "az", 10),
    timezone: sanitizeText(body.timezone, "", 64),
    country_code: sanitizeText(body.countryCode || countryCodeFromHeaders, "", 4).toUpperCase(),
    country: sanitizeText(decodeHeaderValue(body.country || countryFromHeaders), "", 120),
    region: sanitizeText(decodeHeaderValue(body.region || regionFromHeaders), "", 120),
    city: sanitizeText(decodeHeaderValue(body.city || cityFromHeaders), "", 120),
    user_agent: userAgent,
    is_suspected_bot: false,
    traffic_reason: "",
    path: sanitizeText(body.path, "/", 180),
    referrer: sanitizeText(body.referrer, "", 500),
    promo_key: promoKey,
    promo_label: promoLabel,
    promo_target: promoTarget,
  };

  const { error } = await supabase.from("website_analytics_events").insert([payload]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
