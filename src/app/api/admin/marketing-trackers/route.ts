import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_SESSION_COOKIE, isAdminConfigured, validateAdminSessionToken } from "@/lib/admin-auth";
import {
  buildTrackerUrl,
  normalizeTrackerSlug,
  readMarketingTrackerLinks,
  saveMarketingTrackerLinks,
  type MarketingTrackerLink,
} from "@/lib/marketing-trackers";

const SITE_HOST = "perfoumer.az";
const TRACKER_ORIGIN = "https://perfoumer.az";
const EARLY_EXIT_PAGE_VIEWS = 1;

type EventRow = {
  session_id: string;
  anonymous_id: string;
  user_id: string | null;
  path: string | null;
  referrer: string | null;
  created_at: string | null;
  is_suspected_bot: boolean | null;
};

type SessionRow = {
  session_id: string;
  anonymous_id: string;
  user_id: string | null;
  page_views: number | null;
  first_seen: string | null;
  last_seen: string | null;
  is_suspected_bot: boolean | null;
};

type AuthUserRow = {
  id: string;
  created_at: string | null;
};

type TrackerSignal = {
  slug: string;
  source: string;
  medium: string;
  campaign: string;
  label: string;
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

function sanitizeText(value: unknown, fallback = "", maxLength = 120) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function safeTimestamp(value: unknown) {
  const timestamp = new Date(String(value || "")).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function parseTrackedUrl(rawPath: string | null | undefined) {
  const fallback = new URL(`https://${SITE_HOST}/`);
  const value = String(rawPath || "").trim();
  if (!value) return fallback;

  try {
    return new URL(value.startsWith("http") ? value : `https://${SITE_HOST}${value.startsWith("/") ? value : `/${value}`}`);
  } catch {
    return fallback;
  }
}

function getReferrerHost(referrer: string | null | undefined) {
  const value = String(referrer || "").trim();
  if (!value) return "";

  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function sourceFromHost(host: string) {
  if (!host) return "Direct";
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("google")) return "Google";
  if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
  if (host.includes("tiktok")) return "TikTok";
  if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
  if (host.includes("bing")) return "Bing";
  if (host.includes("yandex")) return "Yandex";
  if (host.includes(SITE_HOST) || host.includes("localhost")) return "Internal";
  return host;
}

function getCustomSlug(url: URL) {
  const direct =
    url.searchParams.get("perf_track") ||
    url.searchParams.get("track") ||
    url.searchParams.get("tracker") ||
    url.searchParams.get("campaign") ||
    url.searchParams.get("ref") ||
    "";
  const emptyKeyValue = url.searchParams.get("") || "";
  const value = direct || (emptyKeyValue.startsWith("@") ? emptyKeyValue : "");
  return normalizeTrackerSlug(value);
}

function resolveTrackerSignal(event: EventRow): TrackerSignal {
  const url = parseTrackedUrl(event.path);
  const slug = getCustomSlug(url);
  const utmSource = sanitizeText(url.searchParams.get("utm_source"), "", 80);
  const utmMedium = sanitizeText(url.searchParams.get("utm_medium"), "", 80);
  const utmCampaign = sanitizeText(url.searchParams.get("utm_campaign"), "", 80);
  const source = utmSource || sourceFromHost(getReferrerHost(event.referrer));
  const campaign = slug || utmCampaign;
  const label = campaign || source;

  return {
    slug,
    source,
    medium: utmMedium || (source === "Direct" ? "direct" : "referral"),
    campaign,
    label,
  };
}

async function listAllUsers(supabase: SupabaseClient) {
  const users: AuthUserRow[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn("Admin marketing trackers listUsers failed, continuing without auth users:", error);
      return [];
    }

    users.push(
      ...((data.users as Array<{ id: string; created_at?: string | null }>) || []).map((user) => ({
        id: user.id,
        created_at: user.created_at ?? null,
      })),
    );

    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

function createBucket(key: string, label: string, source: string, medium: string, campaign: string) {
  return {
    key,
    label,
    source,
    medium,
    campaign,
    clicks: 0,
    visitors: new Set<string>(),
    sessions: new Set<string>(),
    signups: new Set<string>(),
    earlyExits: new Set<string>(),
    lastClickedAt: "",
  };
}

async function loadStats(request: Request, links: MarketingTrackerLink[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials not configured");
  }

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days") || 30);
  const days = Number.isFinite(daysParam) ? Math.min(180, Math.max(1, Math.trunc(daysParam))) : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: eventsData, error: eventsError }, { data: sessionsData, error: sessionsError }, users] = await Promise.all([
    supabase
      .from("website_analytics_events")
      .select("session_id,anonymous_id,user_id,path,referrer,created_at,is_suspected_bot")
      .eq("event_type", "v2_page_view")
      .like("session_id", "v2_%")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(12000),
    supabase
      .from("website_live_sessions")
      .select("session_id,anonymous_id,user_id,page_views,first_seen,last_seen,is_suspected_bot")
      .like("session_id", "v2_%"),
    listAllUsers(supabase),
  ]);

  if (eventsError) {
    console.warn("Failed to load tracker events, returning empty results:", eventsError);
  }
  if (sessionsError) {
    console.warn("Failed to load tracker sessions, returning empty results:", sessionsError);
  }

  const events = ((eventsData || []) as EventRow[]).filter((event) => !event.is_suspected_bot);
  const sessions = ((sessionsData || []) as SessionRow[]).filter((session) => !session.is_suspected_bot);
  const sessionById = new Map(sessions.map((session) => [session.session_id, session]));
  const createdAtByUser = new Map(users.map((user) => [user.id, safeTimestamp(user.created_at)]));
  const linkBySlug = new Map(links.map((link) => [link.slug, link]));
  const origin = TRACKER_ORIGIN;

  const userIdsBySession = new Map<string, Set<string>>();
  for (const event of events) {
    if (!event.user_id) continue;
    const ids = userIdsBySession.get(event.session_id) || new Set<string>();
    ids.add(event.user_id);
    userIdsBySession.set(event.session_id, ids);
  }
  for (const session of sessions) {
    if (!session.user_id) continue;
    const ids = userIdsBySession.get(session.session_id) || new Set<string>();
    ids.add(session.user_id);
    userIdsBySession.set(session.session_id, ids);
  }

  const customBuckets = new Map<string, ReturnType<typeof createBucket>>();
  const sourceBuckets = new Map<string, ReturnType<typeof createBucket>>();

  for (const event of events) {
    const signal = resolveTrackerSignal(event);
    const timestamp = String(event.created_at || "");
    const eventTime = safeTimestamp(timestamp);
    const session = sessionById.get(event.session_id);
    const pageViews = Number(session?.page_views || 0);
    const linkedUsers = userIdsBySession.get(event.session_id) || new Set<string>();

    const sourceKey = signal.source || "Direct";
    const sourceBucket = sourceBuckets.get(sourceKey) || createBucket(sourceKey, sourceKey, sourceKey, signal.medium, "");
    sourceBucket.clicks += 1;
    sourceBucket.visitors.add(event.anonymous_id);
    sourceBucket.sessions.add(event.session_id);
    sourceBucket.lastClickedAt = sourceBucket.lastClickedAt && sourceBucket.lastClickedAt > timestamp ? sourceBucket.lastClickedAt : timestamp;
    if (pageViews <= EARLY_EXIT_PAGE_VIEWS) sourceBucket.earlyExits.add(event.session_id);
    for (const userId of linkedUsers) {
      const createdAt = createdAtByUser.get(userId) || 0;
      if (!createdAt || createdAt >= eventTime) sourceBucket.signups.add(userId);
    }
    sourceBuckets.set(sourceKey, sourceBucket);

    if (!signal.slug && !linkBySlug.has(signal.campaign)) continue;
    const slug = signal.slug || signal.campaign;
    const link = linkBySlug.get(slug);
    const label = link?.name || signal.label || slug;
    const customBucket = customBuckets.get(slug) || createBucket(slug, label, signal.source, signal.medium, slug);
    customBucket.clicks += 1;
    customBucket.visitors.add(event.anonymous_id);
    customBucket.sessions.add(event.session_id);
    customBucket.lastClickedAt = customBucket.lastClickedAt && customBucket.lastClickedAt > timestamp ? customBucket.lastClickedAt : timestamp;
    if (pageViews <= EARLY_EXIT_PAGE_VIEWS) customBucket.earlyExits.add(event.session_id);
    for (const userId of linkedUsers) {
      const createdAt = createdAtByUser.get(userId) || 0;
      if (!createdAt || createdAt >= eventTime) customBucket.signups.add(userId);
    }
    customBuckets.set(slug, customBucket);
  }

  const customTrackers = links.map((link) => {
    const bucket = customBuckets.get(link.slug) || createBucket(link.slug, link.name, "Direct", "custom", link.slug);
    const sessionsCount = bucket.sessions.size;
    const visitors = bucket.visitors.size;
    return {
      ...link,
      url: buildTrackerUrl(origin, link),
      clicks: bucket.clicks,
      visitors,
      sessions: sessionsCount,
      signups: bucket.signups.size,
      earlyExits: bucket.earlyExits.size,
      conversionRate: visitors ? bucket.signups.size / visitors : 0,
      earlyExitRate: sessionsCount ? bucket.earlyExits.size / sessionsCount : 0,
      lastClickedAt: bucket.lastClickedAt || null,
    };
  });

  const topSources = Array.from(sourceBuckets.values())
    .map((bucket) => {
      const visitors = bucket.visitors.size;
      const sessionsCount = bucket.sessions.size;
      return {
        source: bucket.source,
        clicks: bucket.clicks,
        visitors,
        sessions: sessionsCount,
        signups: bucket.signups.size,
        earlyExits: bucket.earlyExits.size,
        conversionRate: visitors ? bucket.signups.size / visitors : 0,
        earlyExitRate: sessionsCount ? bucket.earlyExits.size / sessionsCount : 0,
        lastClickedAt: bucket.lastClickedAt || null,
      };
    })
    .sort((left, right) => right.visitors - left.visitors)
    .slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    days,
    customTrackers,
    topSources,
  };
}

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) return authError;

  try {
    const links = await readMarketingTrackerLinks();
    const stats = await loadStats(request, links);
    return Response.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load marketing trackers.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) return authError;

  let body: { name?: unknown; slug?: unknown; targetPath?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; slug?: unknown; targetPath?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const name = sanitizeText(body.name, "", 80);
  const slug = normalizeTrackerSlug(body.slug || name);
  const targetPath = sanitizeText(body.targetPath, "/", 180);

  if (!name || !slug) {
    return Response.json({ error: "Tracker name is required." }, { status: 400 });
  }

  const links = await readMarketingTrackerLinks();
  if (links.some((link) => link.slug === slug)) {
    return Response.json({ error: "A tracker with this slug already exists." }, { status: 409 });
  }

  const nextLink: MarketingTrackerLink = {
    id: `${slug}-${Date.now().toString(36)}`,
    slug,
    name,
    targetPath: targetPath.startsWith("/") ? targetPath : "/",
    createdAt: new Date().toISOString(),
  };

  await saveMarketingTrackerLinks([nextLink, ...links]);
  return Response.json({ ok: true, link: nextLink }, { status: 201 });
}
