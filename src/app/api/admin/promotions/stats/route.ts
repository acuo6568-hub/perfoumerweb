import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE, isAdminConfigured, validateAdminSessionToken } from "@/lib/admin-auth";

type PromoClickEvent = {
  session_id: string;
  anonymous_id: string;
  user_id: string | null;
  promo_key: string;
  promo_label: string;
  promo_target: string;
  device_type: string;
  browser: string;
  os: string;
  locale: string;
  country: string;
  city: string;
  created_at: string;
};

type PromoUser = {
  id: string;
  email: string | null;
};

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Admin login is not configured. Set ADMIN_PASSWORD in env." },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!validateAdminSessionToken(token)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

async function listAllUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return [] as PromoUser[];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const users: PromoUser[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      break;
    }

    users.push(...(data.users as PromoUser[]));
    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

export async function GET() {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: "Supabase credentials not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const [users, eventsResponse] = await Promise.all([
    listAllUsers(),
    supabase
      .from("website_analytics_events")
      .select("session_id, anonymous_id, user_id, promo_key, promo_label, promo_target, device_type, browser, os, locale, country, city, created_at")
      .eq("event_type", "promo_click")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (eventsResponse.error) {
    return Response.json({ error: eventsResponse.error.message }, { status: 500 });
  }

  const userById = new Map(users.map((user) => [user.id, user.email || ""]));
  const events = (eventsResponse.data || []) as PromoClickEvent[];

  const promoBuckets = new Map<
    string,
    {
      promoKey: string;
      promoLabel: string;
      promoTarget: string;
      clicks: number;
      uniqueUsers: Set<string>;
      uniqueSessions: Set<string>;
      lastClickedAt: string | null;
    }
  >();

  const recentClicks = events.slice(0, 30).map((event) => ({
    createdAt: event.created_at,
    promoKey: event.promo_key,
    promoLabel: event.promo_label,
    promoTarget: event.promo_target,
    userId: event.user_id,
    userEmail: event.user_id ? userById.get(event.user_id) || null : null,
    anonymousId: event.anonymous_id,
    sessionId: event.session_id,
    country: event.country,
    city: event.city,
    deviceType: event.device_type,
    browser: event.browser,
    os: event.os,
    locale: event.locale,
  }));

  for (const event of events) {
    const bucket = promoBuckets.get(event.promo_key) || {
      promoKey: event.promo_key,
      promoLabel: event.promo_label,
      promoTarget: event.promo_target,
      clicks: 0,
      uniqueUsers: new Set<string>(),
      uniqueSessions: new Set<string>(),
      lastClickedAt: null as string | null,
    };

    bucket.clicks += 1;
    bucket.uniqueUsers.add(event.user_id || event.anonymous_id);
    bucket.uniqueSessions.add(event.session_id);
    bucket.lastClickedAt = bucket.lastClickedAt && bucket.lastClickedAt > event.created_at ? bucket.lastClickedAt : event.created_at;
    promoBuckets.set(event.promo_key, bucket);
  }

  const topPromos = Array.from(promoBuckets.values())
    .sort((left, right) => right.clicks - left.clicks)
    .slice(0, 10)
    .map((bucket) => ({
      promoKey: bucket.promoKey,
      promoLabel: bucket.promoLabel,
      promoTarget: bucket.promoTarget,
      clicks: bucket.clicks,
      uniqueUsers: bucket.uniqueUsers.size,
      uniqueSessions: bucket.uniqueSessions.size,
      lastClickedAt: bucket.lastClickedAt,
    }));

  return Response.json({
    totalClicks: events.length,
    uniqueClickers: new Set(events.map((event) => event.user_id || event.anonymous_id)).size,
    topPromos,
    recentClicks,
  });
}
