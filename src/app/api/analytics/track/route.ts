import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TrackPayload = {
  eventType?: string;
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
};

type BotDetection = {
  isSuspectedBot: boolean;
  reason: string;
};

function sanitizeText(value: unknown, fallback: string, maxLength = 120): string {
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

function detectSuspiciousTraffic(params: {
  userAgent: string;
  deviceType: string;
  os: string;
  browser: string;
  countryCode: string;
  city: string;
  userId: string | null;
}): BotDetection {
  const ua = params.userAgent.toLowerCase();
  const botUaPattern = /bot|crawler|spider|headless|lighthouse|uptime|monitor|curl|wget|python-requests|node-fetch|axios|postman|ahrefs|semrush|bytespider|facebookexternalhit|preview|validator|scrapy|go-http-client|java\//;
  if (botUaPattern.test(ua)) {
    return { isSuspectedBot: true, reason: "bot-like user agent" };
  }

  if (!ua || ua.length < 18) {
    return { isSuspectedBot: true, reason: "missing or very short user agent" };
  }

  const cityLower = params.city.toLowerCase();
  const isDatacenterLikePattern =
    !params.userId &&
    params.deviceType.toLowerCase() === "desktop" &&
    params.os.toLowerCase() === "linux" &&
    params.browser.toLowerCase() === "chrome" &&
    params.countryCode.toUpperCase() === "US" &&
    cityLower.includes("san jose");

  if (isDatacenterLikePattern) {
    return { isSuspectedBot: true, reason: "datacenter-like traffic pattern" };
  }

  return { isSuspectedBot: false, reason: "" };
}

export async function POST(request: Request) {
  let body: TrackPayload;
  try {
    body = (await request.json()) as TrackPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const sessionId = sanitizeText(body.sessionId, "", 96);
  const anonymousId = sanitizeText(body.anonymousId, "", 96);
  const requestedEventType = sanitizeText(body.eventType, "v2_page_view", 32);
  const eventType = requestedEventType === "v2_heartbeat" ? "v2_heartbeat" : "v2_page_view";
  if (!sessionId || !anonymousId || !sessionId.startsWith("v2_") || !anonymousId.startsWith("v2_")) {
    return NextResponse.json({ error: "sessionId and anonymousId are required." }, { status: 400 });
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

  const countryCode = sanitizeText(body.countryCode || countryCodeFromHeaders, "", 4).toUpperCase();
  const country = sanitizeText(decodeHeaderValue(body.country || countryFromHeaders), "", 120);
  const region = sanitizeText(decodeHeaderValue(body.region || regionFromHeaders), "", 120);
  const city = sanitizeText(decodeHeaderValue(body.city || cityFromHeaders), "", 120);

  const botDetection = detectSuspiciousTraffic({
    userAgent,
    deviceType: sanitizeText(body.deviceType, "unknown", 24),
    os: sanitizeText(body.os, "", 48),
    browser: sanitizeText(body.browser, "", 48),
    countryCode,
    city,
    userId: sanitizeText(body.userId ?? "", "", 64) || null,
  });

  const payload = {
    session_id: sessionId,
    anonymous_id: anonymousId,
    user_id: sanitizeText(body.userId ?? "", "", 64) || null,
    is_logged_in: toBool(body.isLoggedIn),
    event_type: eventType,
    device_type: sanitizeText(body.deviceType, "unknown", 24),
    os: sanitizeText(body.os, "", 48),
    browser: sanitizeText(body.browser, "", 48),
    locale: sanitizeText(body.locale, "az", 10),
    path: sanitizeText(body.path, "/", 180),
    referrer: sanitizeText(body.referrer, "", 500),
    timezone: sanitizeText(body.timezone, "", 64),
    country_code: countryCode,
    country,
    region,
    city,
    user_agent: userAgent,
    is_suspected_bot: botDetection.isSuspectedBot,
    traffic_reason: botDetection.reason,
  };
  const { event_type: _eventType, ...sessionPayload } = payload;

  const { data: existing } = await supabase
    .from("website_live_sessions")
    .select("session_id,page_views")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    const nextPageViews =
      eventType === "v2_page_view"
        ? Number(existing.page_views ?? 0) + 1
        : Number(existing.page_views ?? 0);

    const { error: updateError } = await supabase
      .from("website_live_sessions")
      .update({
        anonymous_id: sessionPayload.anonymous_id,
        user_id: sessionPayload.user_id,
        is_logged_in: sessionPayload.is_logged_in,
        device_type: sessionPayload.device_type,
        os: sessionPayload.os,
        browser: sessionPayload.browser,
        locale: sessionPayload.locale,
        path: sessionPayload.path,
        referrer: sessionPayload.referrer,
        timezone: sessionPayload.timezone,
        country_code: sessionPayload.country_code,
        country: sessionPayload.country,
        region: sessionPayload.region,
        city: sessionPayload.city,
        user_agent: sessionPayload.user_agent,
        is_suspected_bot: sessionPayload.is_suspected_bot,
        traffic_reason: sessionPayload.traffic_reason,
        last_seen: new Date().toISOString(),
        page_views: nextPageViews,
      })
      .eq("session_id", sessionId);
    if (updateError) {
      return NextResponse.json({ error: "Failed to update analytics session." }, { status: 500 });
    }
  } else {
    const { error: insertSessionError } = await supabase
      .from("website_live_sessions")
      .insert([
        {
          ...sessionPayload,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          page_views: eventType === "v2_page_view" ? 1 : 0,
        },
      ]);
    if (insertSessionError) {
      return NextResponse.json({ error: "Failed to create analytics session." }, { status: 500 });
    }
  }

  const { error: insertEventError } = await supabase
    .from("website_analytics_events")
    .insert([
      {
        ...payload,
      },
    ]);
  if (insertEventError) {
    return NextResponse.json({ error: "Failed to record analytics event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
