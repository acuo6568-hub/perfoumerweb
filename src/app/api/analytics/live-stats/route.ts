import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";

export const runtime = "nodejs";

type SessionRow = {
  session_id: string;
  anonymous_id: string;
  user_id: string | null;
  is_logged_in: boolean | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  path: string | null;
  referrer: string | null;
  last_seen: string | null;
  first_seen: string | null;
  page_views: number | null;
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  is_suspected_bot: boolean | null;
  traffic_reason: string | null;
};

type EventRow = {
  session_id: string;
  anonymous_id: string;
  user_id: string | null;
  is_logged_in: boolean | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  path: string | null;
  referrer: string | null;
  created_at: string | null;
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  is_suspected_bot: boolean | null;
};

type OrderRow = {
  user_id: string;
  total_amount: number | string | null;
  status: string | null;
  created_at: string | null;
};

type CountableRow = {
  user_id: string;
};

type IdentitySummary = {
  email: string;
  username: string;
  fullName: string;
};

type UserSignalSummary = {
  ordersCount: number;
  completedOrders: number;
  totalRevenue: number;
  wishlistItems: number;
  cartItems: number;
  commentsCount: number;
  lastOrderAt: string;
};

type RecentSessionSummary = {
  sessionId: string;
  anonymousId: string;
  userId: string | null;
  isLoggedIn: boolean;
  landingPath: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  country: string;
  city: string;
  timezone: string;
  deviceType: string;
  browser: string;
  os: string;
};

const SITE_HOST = "perfoumer.az";

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function incrementCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function incrementUnique(map: Map<string, Set<string>>, key: string, uniqueValue: string) {
  if (!uniqueValue) return;
  const current = map.get(key) || new Set<string>();
  current.add(uniqueValue);
  map.set(key, current);
}

function normalizeCountryLabel(country: unknown, countryCode: unknown): string {
  const direct = String(country || "").trim();
  if (direct) return direct;

  const code = String(countryCode || "").trim().toUpperCase();
  return code || "Unknown";
}

function normalizeText(value: unknown, fallback = "Unknown"): string {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function safeTimestamp(value: unknown): number {
  const time = new Date(String(value || "")).getTime();
  return Number.isFinite(time) ? time : 0;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function buildDayRange(days: number) {
  const now = new Date();
  const todayUtc = startOfUtcDay(now);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(todayUtc);
    date.setUTCDate(todayUtc.getUTCDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return { key, label, date };
  });
}

function parseTrackedPath(rawPath: string | null | undefined) {
  const fallback = {
    pathname: "/",
    search: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  };

  const value = String(rawPath || "").trim();
  if (!value) return fallback;

  try {
    const normalized = value.startsWith("http")
      ? value
      : `https://${SITE_HOST}${value.startsWith("/") ? value : `/${value}`}`;
    const url = new URL(normalized);
    return {
      pathname: `${url.pathname || "/"}`,
      search: url.search,
      utmSource: url.searchParams.get("utm_source")?.trim() || "",
      utmMedium: url.searchParams.get("utm_medium")?.trim() || "",
      utmCampaign: url.searchParams.get("utm_campaign")?.trim() || "",
      utmContent: url.searchParams.get("utm_content")?.trim() || "",
      utmTerm: url.searchParams.get("utm_term")?.trim() || "",
    };
  } catch {
    return fallback;
  }
}

function getReferrerHost(referrer: string | null | undefined): string {
  const value = String(referrer || "").trim();
  if (!value) return "Direct";

  try {
    return new URL(value).hostname.replace(/^www\./, "") || "Direct";
  } catch {
    return "Direct";
  }
}

function isInternalReferrer(referrerHost: string) {
  const normalized = referrerHost.toLowerCase();
  return normalized.includes(SITE_HOST) || normalized.includes("localhost");
}

function shortId(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.length <= 12 ? normalized : `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function topEntries(counter: Map<string, number>, limit: number, label = "label") {
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ [label]: name, count }));
}

function topUniqueEntries(counter: Map<string, Set<string>>, limit: number, label = "label") {
  return Array.from(counter.entries())
    .map(([name, ids]) => ({ [label]: name, count: ids.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function createSignalSummary() {
  return {
    ordersCount: 0,
    completedOrders: 0,
    totalRevenue: 0,
    wishlistItems: 0,
    cartItems: 0,
    commentsCount: 0,
    lastOrderAt: "",
  } satisfies UserSignalSummary;
}

async function loadIdentitySummaries(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userIds: string[];
}) {
  const client = createClient(params.supabaseUrl, params.serviceRoleKey);
  const userIds = Array.from(new Set(params.userIds.filter(Boolean)));
  const signals = new Map<string, UserSignalSummary>();

  for (const userId of userIds) {
    signals.set(userId, createSignalSummary());
  }

  const [
    { data: ordersData, error: ordersError },
    { data: wishlistData, error: wishlistError },
    { data: cartData, error: cartError },
    { data: commentsData, error: commentsError },
    authResults,
  ] = await Promise.all([
    client.from("orders").select("user_id,total_amount,status,created_at").in("user_id", userIds),
    client.from("wishlists").select("user_id").in("user_id", userIds),
    client.from("cart_items").select("user_id").in("user_id", userIds),
    client.from("comments").select("user_id").in("user_id", userIds),
    Promise.all(userIds.map((userId) => client.auth.admin.getUserById(userId))),
  ]);

  if (!ordersError) {
    for (const row of (ordersData || []) as OrderRow[]) {
      const current = signals.get(row.user_id) || createSignalSummary();
      current.ordersCount += 1;
      if (row.status === "completed" || row.status === "delivered") {
        current.completedOrders += 1;
      }

      const revenue = Number(row.total_amount || 0);
      current.totalRevenue += Number.isFinite(revenue) ? revenue : 0;

      const createdAt = String(row.created_at || "");
      if (createdAt && safeTimestamp(createdAt) > safeTimestamp(current.lastOrderAt)) {
        current.lastOrderAt = createdAt;
      }

      signals.set(row.user_id, current);
    }
  }

  if (!wishlistError) {
    for (const row of (wishlistData || []) as CountableRow[]) {
      const current = signals.get(row.user_id) || createSignalSummary();
      current.wishlistItems += 1;
      signals.set(row.user_id, current);
    }
  }

  if (!cartError) {
    for (const row of (cartData || []) as CountableRow[]) {
      const current = signals.get(row.user_id) || createSignalSummary();
      current.cartItems += 1;
      signals.set(row.user_id, current);
    }
  }

  if (!commentsError) {
    for (const row of (commentsData || []) as CountableRow[]) {
      const current = signals.get(row.user_id) || createSignalSummary();
      current.commentsCount += 1;
      signals.set(row.user_id, current);
    }
  }

  const identities = new Map<string, IdentitySummary>();

  for (let index = 0; index < authResults.length; index += 1) {
    const result = authResults[index];
    const userId = userIds[index];
    const user = result.data.user;
    const metadata = user?.user_metadata || {};
    const username =
      (typeof metadata.username === "string" && metadata.username.trim()) ||
      (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
      (typeof metadata.name === "string" && metadata.name.trim()) ||
      "";
    const fullName =
      (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
      (typeof metadata.name === "string" && metadata.name.trim()) ||
      "";

    identities.set(userId, {
      email: user?.email?.trim() || "",
      username,
      fullName,
    });
  }

  return { identities, signals };
}

export async function GET(request: Request) {
  const isProd = process.env.NODE_ENV === "production";
  const configured = isAdminConfigured();
  const authenticated = configured ? await isAdminAuthenticated() : false;
  if ((isProd && !configured) || (configured && !authenticated)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return NextResponse.json({ error: "Supabase config missing." }, { status: 500 });
  }

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 7);
  const recentDays = buildDayRange(Number.isFinite(requestedDays) ? Math.min(90, Math.max(1, Math.trunc(requestedDays))) : 7);
  const recentStart = recentDays[0]?.date.toISOString() || new Date(0).toISOString();
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey || "");

  const [{ data: sessions }, { data: recentEvents }, { count: totalEvents }] = await Promise.all([
    supabase
      .from("website_live_sessions")
      .select(
        "session_id,anonymous_id,user_id,is_logged_in,device_type,browser,os,path,referrer,last_seen,first_seen,page_views,country_code,country,region,city,timezone,is_suspected_bot,traffic_reason",
      )
      .like("session_id", "v2_%"),
    supabase
      .from("website_analytics_events")
      .select(
        "session_id,anonymous_id,user_id,is_logged_in,device_type,browser,os,path,referrer,created_at,country_code,country,region,city,timezone,is_suspected_bot",
      )
      .eq("event_type", "v2_page_view")
      .like("session_id", "v2_%")
      .gte("created_at", recentStart)
      .order("created_at", { ascending: true }),
    supabase
      .from("website_analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "v2_page_view")
      .like("session_id", "v2_%"),
  ]);

  const sessionRows = (sessions || []) as SessionRow[];
  const eventRows = (recentEvents || []) as EventRow[];

  const now = Date.now();
  const onlineThresholdMs = 2 * 60 * 1000;
  const currentRows = sessionRows.filter((row) => {
    const lastSeen = safeTimestamp(row.last_seen);
    return lastSeen > 0 && now - lastSeen <= onlineThresholdMs;
  });

  const currentHumanRows = currentRows.filter((row) => !Boolean(row.is_suspected_bot));
  const currentLoggedIn = currentHumanRows.filter((row) => Boolean(row.user_id) || Boolean(row.is_logged_in));
  const currentGuests = currentHumanRows.filter((row) => !row.user_id && !row.is_logged_in);
  const humanSessionRows = sessionRows.filter((row) => !Boolean(row.is_suspected_bot));

  const uniqueVisitors = new Set(humanSessionRows.map((row) => row.anonymous_id).filter(Boolean));
  const uniqueRegistered = new Set(humanSessionRows.map((row) => row.user_id || "").filter(Boolean));
  const sessionsByAnonymous = countBy(humanSessionRows.map((row) => row.anonymous_id).filter(Boolean));
  const returningVisitors = Object.values(sessionsByAnonymous).filter((count) => count > 1).length;

  const dayStart = startOfUtcDay(new Date()).getTime();
  const todaysUniqueVisitors = new Set(
    humanSessionRows
      .filter((row) => {
        const firstSeen = safeTimestamp(row.first_seen);
        return firstSeen > 0 && firstSeen >= dayStart;
      })
      .map((row) => row.anonymous_id)
      .filter(Boolean),
  );

  const totalPageViews = humanSessionRows.reduce((sum, row) => sum + Number(row.page_views || 0), 0);
  const singlePageSessions = humanSessionRows.filter((row) => Number(row.page_views || 0) <= 1).length;
  const avgPageViewsPerSession = humanSessionRows.length ? totalPageViews / humanSessionRows.length : 0;
  const loggedInRate = uniqueVisitors.size ? uniqueRegistered.size / uniqueVisitors.size : 0;

  const currentDeviceBreakdown = countBy(
    currentHumanRows.map((row) => normalizeText(row.device_type, "unknown").toLowerCase()),
  );

  const currentTopPaths = Object.entries(
    countBy(currentHumanRows.map((row) => parseTrackedPath(row.path).pathname)),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }));

  const visitorsPerCountry = new Map<string, Set<string>>();
  for (const row of humanSessionRows) {
    const country = normalizeCountryLabel(row.country, row.country_code);
    incrementUnique(visitorsPerCountry, country, row.anonymous_id);
  }

  const liveCountries = Object.entries(
    countBy(
      currentHumanRows.map((row) => normalizeCountryLabel(row.country, row.country_code)),
    ),
  )
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const deviceLocationBreakdown = Object.entries(
    countBy(
      currentHumanRows.map((row) => {
        const device = normalizeText(row.device_type, "unknown").toLowerCase();
        const country = normalizeCountryLabel(row.country, row.country_code);
        const city = normalizeText(row.city, "-");
        return `${device}|||${country}|||${city}`;
      }),
    ),
  )
    .map(([value, count]) => {
      const [deviceType, country, city] = value.split("|||");
      return { deviceType, country, city, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const dailyAccumulator = new Map<
    string,
    {
      pageViews: number;
      botEvents: number;
      visitors: Set<string>;
      sessions: Set<string>;
      loggedInSessions: Set<string>;
    }
  >();
  for (const day of recentDays) {
    dailyAccumulator.set(day.key, {
      pageViews: 0,
      botEvents: 0,
      visitors: new Set<string>(),
      sessions: new Set<string>(),
      loggedInSessions: new Set<string>(),
    });
  }

  const recentHumanPagePaths = new Map<string, number>();
  const recentSessionFirsts = new Map<string, RecentSessionSummary>();
  const recentPageVisitors = new Map<string, Set<string>>();
  const recentCountrySessions = new Map<string, number>();
  const recentCitySessions = new Map<string, number>();
  const recentTimezoneSessions = new Map<string, number>();
  const recentDeviceSessions = new Map<string, number>();
  const recentBrowserSessions = new Map<string, number>();
  const recentOsSessions = new Map<string, number>();
  const topReferrerSessions = new Map<string, number>();
  const topReferrerVisitors = new Map<string, Set<string>>();
  const topLandingSessions = new Map<string, number>();
  const topLandingVisitors = new Map<string, Set<string>>();
  const topCampaignSessions = new Map<string, number>();
  const topCampaignPageViews = new Map<string, number>();

  for (const row of eventRows) {
    const createdAt = String(row.created_at || "");
    const dayKey = createdAt.slice(0, 10);
    const dayBucket = dailyAccumulator.get(dayKey);
    const parsedPath = parseTrackedPath(row.path);
    const isBot = Boolean(row.is_suspected_bot);
    const isLoggedIn = Boolean(row.user_id) || Boolean(row.is_logged_in);

    if (dayBucket) {
      dayBucket.pageViews += 1;
      dayBucket.sessions.add(row.session_id);
      if (row.anonymous_id) {
        dayBucket.visitors.add(row.anonymous_id);
      }
      if (isLoggedIn) {
        dayBucket.loggedInSessions.add(row.session_id);
      }
      if (isBot) {
        dayBucket.botEvents += 1;
      }
    }

    if (isBot) {
      continue;
    }

    incrementCount(recentHumanPagePaths, parsedPath.pathname);
    incrementUnique(recentPageVisitors, parsedPath.pathname, row.anonymous_id);

    if (!recentSessionFirsts.has(row.session_id)) {
      const referrerHost = getReferrerHost(row.referrer);
      recentSessionFirsts.set(row.session_id, {
        sessionId: row.session_id,
        anonymousId: row.anonymous_id,
        userId: row.user_id,
        isLoggedIn,
        landingPath: parsedPath.pathname,
        referrerHost,
        utmSource: parsedPath.utmSource,
        utmMedium: parsedPath.utmMedium,
        utmCampaign: parsedPath.utmCampaign,
        utmContent: parsedPath.utmContent,
        utmTerm: parsedPath.utmTerm,
        country: normalizeCountryLabel(row.country, row.country_code),
        city: normalizeText(row.city, "Unknown"),
        timezone: normalizeText(row.timezone, "Unknown"),
        deviceType: normalizeText(row.device_type, "unknown"),
        browser: normalizeText(row.browser, "Unknown"),
        os: normalizeText(row.os, "Unknown"),
      });
    }
  }

  for (const summary of recentSessionFirsts.values()) {
    incrementCount(recentCountrySessions, summary.country);
    incrementCount(recentCitySessions, `${summary.city}, ${summary.country}`);
    incrementCount(recentTimezoneSessions, summary.timezone);
    incrementCount(recentDeviceSessions, summary.deviceType);
    incrementCount(recentBrowserSessions, summary.browser);
    incrementCount(recentOsSessions, summary.os);
    incrementCount(topLandingSessions, summary.landingPath);
    incrementUnique(topLandingVisitors, summary.landingPath, summary.anonymousId);

    const referrerLabel =
      summary.referrerHost === "Direct"
        ? "Direct"
        : isInternalReferrer(summary.referrerHost)
          ? "Internal"
          : summary.referrerHost;
    incrementCount(topReferrerSessions, referrerLabel);
    incrementUnique(topReferrerVisitors, referrerLabel, summary.anonymousId);

    if (summary.utmCampaign) {
      const campaignLabel = [
        summary.utmCampaign,
        summary.utmSource || "unknown-source",
        summary.utmMedium || "unknown-medium",
      ].join("|||");
      incrementCount(topCampaignSessions, campaignLabel);
    }
  }

  for (const row of eventRows) {
    if (Boolean(row.is_suspected_bot)) continue;
    const parsedPath = parseTrackedPath(row.path);
    if (!parsedPath.utmCampaign) continue;

    const campaignLabel = [
      parsedPath.utmCampaign,
      parsedPath.utmSource || "unknown-source",
      parsedPath.utmMedium || "unknown-medium",
    ].join("|||");
    incrementCount(topCampaignPageViews, campaignLabel);
  }

  const currentUserIds = Array.from(
    new Set(currentLoggedIn.map((row) => row.user_id || "").filter(Boolean)),
  );

  let identities = new Map<string, IdentitySummary>();
  let userSignals = new Map<string, UserSignalSummary>();
  const accountResolution = {
    available: false,
    source: supabaseServiceRoleKey ? "service_role" : "anon_only",
  };

  if (supabaseServiceRoleKey && currentUserIds.length) {
    const enriched = await loadIdentitySummaries({
      supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
      userIds: currentUserIds,
    });
    identities = enriched.identities;
    userSignals = enriched.signals;
    accountResolution.available = true;
  }

  const currentUsers = currentRows
    .slice()
    .sort((a, b) => safeTimestamp(b.last_seen) - safeTimestamp(a.last_seen))
    .slice(0, 120)
    .map((row) => {
      const parsedPath = parseTrackedPath(row.path);
      const referrerHost = getReferrerHost(row.referrer);
      const identity = row.user_id ? identities.get(row.user_id) : undefined;
      const signals = row.user_id ? userSignals.get(row.user_id) || createSignalSummary() : createSignalSummary();
      const username = identity?.username || identity?.fullName || "";
      const email = identity?.email || "";
      const label = username || email || (row.user_id ? `User ${shortId(row.user_id)}` : `Guest ${shortId(row.anonymous_id)}`);

      return {
        sessionId: row.session_id,
        anonymousId: row.anonymous_id,
        userId: row.user_id,
        isLoggedIn: Boolean(row.user_id) || Boolean(row.is_logged_in),
        label,
        username,
        email,
        deviceType: normalizeText(row.device_type, "unknown"),
        browser: normalizeText(row.browser, "Unknown"),
        os: normalizeText(row.os, "Unknown"),
        countryCode: String(row.country_code || "").trim(),
        country: normalizeCountryLabel(row.country, row.country_code),
        region: normalizeText(row.region, "-"),
        city: normalizeText(row.city, "-"),
        timezone: normalizeText(row.timezone, "-"),
        isSuspectedBot: Boolean(row.is_suspected_bot),
        trafficReason: String(row.traffic_reason || "").trim(),
        path: parsedPath.pathname,
        pathWithQuery: `${parsedPath.pathname}${parsedPath.search}`,
        referrerHost,
        referrer: String(row.referrer || "").trim(),
        utmSource: parsedPath.utmSource,
        utmMedium: parsedPath.utmMedium,
        utmCampaign: parsedPath.utmCampaign,
        utmContent: parsedPath.utmContent,
        utmTerm: parsedPath.utmTerm,
        pageViews: Number(row.page_views || 0),
        firstSeen: String(row.first_seen || ""),
        lastSeen: String(row.last_seen || ""),
        signals,
      };
    });

  const humanCurrentUsers = currentUsers.filter((row) => !row.isSuspectedBot);
  const retargetableNow = humanCurrentUsers.filter((row) => {
    const highIntentPath =
      row.path.startsWith("/cart") ||
      row.path.startsWith("/checkout") ||
      row.path.startsWith("/wishlist") ||
      row.path.startsWith("/account");
    return row.isLoggedIn || highIntentPath || row.pageViews >= 3 || row.signals.cartItems > 0 || row.signals.wishlistItems > 0;
  }).length;

  const trends = recentDays.map((day) => {
    const bucket = dailyAccumulator.get(day.key);
    return {
      date: day.key,
      label: day.label,
      pageViews: bucket?.pageViews || 0,
      visitors: bucket?.visitors.size || 0,
      sessions: bucket?.sessions.size || 0,
      loggedInSessions: bucket?.loggedInSessions.size || 0,
      botEvents: bucket?.botEvents || 0,
    };
  });

  const topPages = Array.from(recentHumanPagePaths.entries())
    .map(([path, pageViews]) => ({
      path,
      pageViews,
      visitors: recentPageVisitors.get(path)?.size || 0,
    }))
    .sort((a, b) => b.pageViews - a.pageViews)
    .slice(0, 10);

  const topReferrers = Array.from(topReferrerSessions.entries())
    .map(([source, sessionsCount]) => ({
      source,
      sessions: sessionsCount,
      visitors: topReferrerVisitors.get(source)?.size || 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const topLandingPages = Array.from(topLandingSessions.entries())
    .map(([path, sessionsCount]) => ({
      path,
      sessions: sessionsCount,
      visitors: topLandingVisitors.get(path)?.size || 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const topCampaigns = Array.from(topCampaignSessions.entries())
    .map(([composite, sessionsCount]) => {
      const [campaign, source, medium] = composite.split("|||");
      return {
        campaign,
        source,
        medium,
        sessions: sessionsCount,
        pageViews: topCampaignPageViews.get(composite) || 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      accountResolution,
      visitors: {
        totalUnique: uniqueVisitors.size,
        todayUnique: todaysUniqueVisitors.size,
        returningUnique: returningVisitors,
        totalRegisteredSeen: uniqueRegistered.size,
      },
      live: {
        currentOnline: currentHumanRows.length,
        currentLikelyHumans: currentHumanRows.length,
        currentSuspectedBots: currentRows.filter((row) => Boolean(row.is_suspected_bot)).length,
        currentLoggedIn: currentLoggedIn.length,
        currentGuests: currentGuests.length,
        retargetableNow,
      },
      engagement: {
        totalSessions: humanSessionRows.length,
        totalEvents: totalEvents ?? 0,
        totalPageViews,
        avgPageViewsPerSession,
        singlePageSessionRate: humanSessionRows.length ? singlePageSessions / humanSessionRows.length : 0,
        loggedInRate,
      },
      trends,
      acquisition: {
        topReferrers,
        topCampaigns,
        topLandingPages,
      },
      audience: {
        topCountries: topUniqueEntries(visitorsPerCountry, 10, "country"),
        recentCountries: topEntries(recentCountrySessions, 10, "country"),
        recentCities: topEntries(recentCitySessions, 10, "city"),
        topDevices: topEntries(recentDeviceSessions, 10, "device"),
        topBrowsers: topEntries(recentBrowserSessions, 10, "browser"),
        topOs: topEntries(recentOsSessions, 10, "os"),
        topTimezones: topEntries(recentTimezoneSessions, 10, "timezone"),
      },
      topPages,
      liveCountries,
      deviceLocationBreakdown,
      currentDeviceBreakdown,
      currentTopPaths,
      currentUsers,
      marketing: {
        strongestMarket: topEntries(recentCountrySessions, 1, "country")[0]?.country || "No traffic yet",
        topSource: topReferrers[0]?.source || "Direct",
        topCampaign: topCampaigns[0]?.campaign || "No tagged campaigns",
      },
    },
    { status: 200 },
  );
}
