import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

function parseDateInput(value: string | null, endOfDay = false) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;

  return new Date(
    Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0),
  );
}

function resolveDateRange(dateFilter: string, startDate: string | null, endDate: string | null) {
  const now = new Date();
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = now;

  if (dateFilter === "custom") {
    rangeStart = parseDateInput(startDate);
    rangeEnd = parseDateInput(endDate, true) || now;
  } else if (dateFilter === "today") {
    rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else if (dateFilter === "thisMonth") {
    rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else if (dateFilter === "thisYear") {
    rangeStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }

  return { rangeStart, rangeEnd, now };
}

async function listAllUsers(supabase: SupabaseClient) {
  const perPage = 1000;
  let page = 1;
  let users: Array<{
    id: string;
    email: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
  }> = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error("Failed to fetch users");
    }

    users = users.concat(data.users as typeof users);
    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

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

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const dateFilter = url.searchParams.get("dateFilter") || "allTime";
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { rangeStart, rangeEnd, now } = resolveDateRange(dateFilter, startDateParam, endDateParam);
    const users = await listAllUsers(supabase);
    const totalUsers = users.length;

    const { data: comments } = await supabase
      .from("comments")
      .select("user_id")
      .order("created_at", { ascending: false });

    const { data: wishlists } = await supabase
      .from("wishlists")
      .select("user_id")
      .order("created_at", { ascending: false });

    const { data: cartItems } = await supabase
      .from("cart_items")
      .select("user_id")
      .order("created_at", { ascending: false });

    const { data: chatSessions } = await supabase
      .from("ai_chat_sessions")
      .select("user_id")
      .order("last_message_at", { ascending: false });

    const userComments = new Set((comments ?? []).map((c) => c.user_id).filter(Boolean));
    const userWishlists = new Set((wishlists ?? []).map((w) => w.user_id).filter(Boolean));
    const userCarts = new Set((cartItems ?? []).map((c) => c.user_id).filter(Boolean));
    const userChats = new Set((chatSessions ?? []).map((c) => c.user_id).filter(Boolean));

    const sessionsQuery = supabase
      .from("website_live_sessions")
      .select("session_id, anonymous_id, user_id, first_seen, last_seen, page_views, country, city");

    if (rangeStart) {
      sessionsQuery.gte("last_seen", rangeStart.toISOString());
    }

    if (rangeEnd) {
      sessionsQuery.lte("last_seen", rangeEnd.toISOString());
    }

    const { data: liveSessions } = await sessionsQuery;
    const sessions = liveSessions ?? [];
    const uniqueVisitors = new Set(
      sessions
        .map((session) => session.user_id || session.anonymous_id || session.session_id)
        .filter(Boolean),
    ).size;
    const totalSessions = sessions.length;
    const totalPageViewsFromSessions = sessions.reduce(
      (sum, session) => sum + Math.max(0, Number(session.page_views ?? 0)),
      0,
    );

    const countryMap = new Map<string, number>();
    sessions.forEach((session) => {
      if (session.country) {
        countryMap.set(session.country, (countryMap.get(session.country) || 0) + 1);
      }
    });
    const topCountries = Array.from(countryMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));

    const totalDurationSeconds = sessions.reduce((sum, session) => {
      const start = new Date(session.first_seen).getTime();
      const end = new Date(session.last_seen).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return sum;
      }
      return sum + Math.max(0, Math.round((end - start) / 1000));
    }, 0);
    const avgSessionDuration = totalSessions ? Math.round(totalDurationSeconds / totalSessions) : 0;
    const singlePageSessions = sessions.filter((session) => Number(session.page_views) <= 1).length;
    const bounceRate = totalSessions ? Math.round((singlePageSessions / totalSessions) * 100) : 0;

    const eventsQuery = supabase
      .from("website_analytics_events")
      .select("id", { count: "exact", head: true });

    if (rangeStart) {
      eventsQuery.gte("created_at", rangeStart.toISOString());
    }

    if (rangeEnd) {
      eventsQuery.lte("created_at", rangeEnd.toISOString());
    }

    const { count: pageViews } = await eventsQuery;

    const ordersQuery = supabase
      .from("orders")
      .select("id", { count: "exact", head: true });

    if (rangeStart) {
      ordersQuery.gte("created_at", rangeStart.toISOString());
    }

    if (rangeEnd) {
      ordersQuery.lte("created_at", rangeEnd.toISOString());
    }

    const { count: ordersCount } = await ordersQuery;

    const newsletterTotalQuery = supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "subscribed");

    const newsletterRangeQuery = supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "subscribed");

    if (rangeStart) {
      newsletterRangeQuery.gte("created_at", rangeStart.toISOString());
    }

    if (rangeEnd) {
      newsletterRangeQuery.lte("created_at", rangeEnd.toISOString());
    }

    const [{ count: newsletterSubscribed }, { count: newsletterSubscribedInRange }] = await Promise.all([
      newsletterTotalQuery,
      newsletterRangeQuery,
    ]);

    const onlineThreshold = new Date(now.getTime() - ONLINE_THRESHOLD_MS).toISOString();
    const { data: onlineSessions } = await supabase
      .from("website_live_sessions")
      .select("user_id, last_seen")
      .not("user_id", "is", null)
      .gte("last_seen", onlineThreshold);
    const onlineUserIds = new Set(
      (onlineSessions ?? [])
        .map((session) => session.user_id)
        .filter((id): id is string => Boolean(id)),
    );

    const activeUserIds = new Set([
      ...Array.from(userComments),
      ...Array.from(userWishlists),
      ...Array.from(userCarts),
      ...Array.from(userChats),
    ]);
    const withActivity = totalUsers ? Math.round((activeUserIds.size / totalUsers) * 100) : 0;
    const conversionRate = totalUsers ? ((ordersCount ?? 0) / totalUsers) * 100 : 0;

    const stats = {
      totalUsers,
      onlineUsers: onlineUserIds.size,
      newsletterSubscribed: newsletterSubscribed ?? 0,
      newsletterSubscribedInRange: newsletterSubscribedInRange ?? 0,
      pageViews: pageViews ?? totalPageViewsFromSessions,
      pageViewsInRange: pageViews ?? totalPageViewsFromSessions,
      uniqueVisitors,
      uniqueVisitorsInRange: uniqueVisitors,
      avgSessionDuration,
      bounceRate,
      conversionRate: Math.round(conversionRate * 100) / 100,
      dateFilter,
      dateRange: rangeStart ? { start: rangeStart.toISOString(), end: (rangeEnd ?? now).toISOString() } : null,
      userEngagement: withActivity,
      usersWithComments: userComments.size,
      usersWithWishlists: userWishlists.size,
      usersWithCart: userCarts.size,
      usersWithChats: userChats.size,
      topCountries,
      generatedAt: now.toISOString(),
    };

    return Response.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch stats.";
    console.error("Stats API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
