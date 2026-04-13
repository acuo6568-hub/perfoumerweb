import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";

export const runtime = "nodejs";

function groupCount(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function normalizeCountryLabel(country: unknown, countryCode: unknown): string {
  const direct = String(country || "").trim();
  if (direct) return direct;

  const code = String(countryCode || "").trim().toUpperCase();
  if (!code) return "Unknown";
  return code;
}

export async function GET() {
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

  const supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey || supabaseAnonKey || "",
  );

  const [{ data: sessions }, { count: totalEvents }] = await Promise.all([
    supabase
      .from("website_live_sessions")
      .select("session_id,anonymous_id,user_id,is_logged_in,device_type,browser,os,path,last_seen,first_seen,page_views,country_code,country,region,city,timezone,is_suspected_bot,traffic_reason"),
    supabase
      .from("website_analytics_events")
      .select("id", { count: "exact", head: true }),
  ]);

  const rows = sessions ?? [];
  const now = Date.now();
  const onlineThresholdMs = 2 * 60 * 1000;

  const currentRows = rows.filter((row) => {
    const lastSeen = new Date(String(row.last_seen ?? "")).getTime();
    return Number.isFinite(lastSeen) && now - lastSeen <= onlineThresholdMs;
  });

  const uniqueVisitors = new Set(rows.map((row) => String(row.anonymous_id || "")).filter(Boolean));
  const uniqueRegistered = new Set(
    rows
      .map((row) => (row.user_id ? String(row.user_id) : ""))
      .filter(Boolean),
  );

  const currentLoggedIn = currentRows.filter((row) => Boolean(row.user_id) || Boolean(row.is_logged_in));
  const currentGuests = currentRows.filter((row) => !row.user_id && !row.is_logged_in);
  const currentSuspectedBots = currentRows.filter((row) => Boolean((row as { is_suspected_bot?: boolean }).is_suspected_bot));
  const currentLikelyHumans = currentRows.filter((row) => !Boolean((row as { is_suspected_bot?: boolean }).is_suspected_bot));

  const nowDate = new Date();
  const dayStart = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate())).getTime();
  const todaysUniqueVisitors = new Set(
    rows
      .filter((row) => {
        const firstSeen = new Date(String(row.first_seen ?? "")).getTime();
        return Number.isFinite(firstSeen) && firstSeen >= dayStart;
      })
      .map((row) => String(row.anonymous_id || ""))
      .filter(Boolean),
  );

  const deviceBreakdownCurrent = groupCount(
    currentRows.map((row) => String(row.device_type || "unknown")),
  );

  const topPathsCurrent = Object.entries(
    groupCount(currentRows.map((row) => String(row.path || "/"))),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }));

  const visitorsPerCountry = new Map<string, Set<string>>();
  for (const row of rows) {
    const countryLabel = normalizeCountryLabel((row as { country?: unknown }).country, (row as { country_code?: unknown }).country_code);
    const anon = String(row.anonymous_id || "").trim();
    if (!anon) continue;

    const existing = visitorsPerCountry.get(countryLabel) || new Set<string>();
    existing.add(anon);
    visitorsPerCountry.set(countryLabel, existing);
  }

  const topCountries = Array.from(visitorsPerCountry.entries())
    .map(([country, ids]) => ({ country, visitors: ids.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 12);

  const liveCountries = Object.entries(
    groupCount(
      currentRows.map((row) =>
        normalizeCountryLabel((row as { country?: unknown }).country, (row as { country_code?: unknown }).country_code),
      ),
    ),
  )
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const deviceLocationBreakdown = Object.entries(
    groupCount(
      currentRows.map((row) => {
        const countryLabel = normalizeCountryLabel((row as { country?: unknown }).country, (row as { country_code?: unknown }).country_code);
        const cityLabel = String((row as { city?: unknown }).city || "").trim() || "-";
        const device = String(row.device_type || "unknown");
        return `${device}|||${countryLabel}|||${cityLabel}`;
      }),
    ),
  )
    .map(([composite, count]) => {
      const [deviceType, country, city] = composite.split("|||");
      return { deviceType, country, city, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      visitors: {
        totalUnique: uniqueVisitors.size,
        todayUnique: todaysUniqueVisitors.size,
        totalRegisteredSeen: uniqueRegistered.size,
      },
      live: {
        currentOnline: currentRows.length,
        currentLikelyHumans: currentLikelyHumans.length,
        currentSuspectedBots: currentSuspectedBots.length,
        currentLoggedIn: currentLoggedIn.length,
        currentGuests: currentGuests.length,
      },
      engagement: {
        totalSessions: rows.length,
        totalEvents: totalEvents ?? 0,
        totalPageViews: rows.reduce((sum, row) => sum + Number(row.page_views || 0), 0),
      },
      topCountries,
      liveCountries,
      deviceLocationBreakdown,
      currentDeviceBreakdown: deviceBreakdownCurrent,
      currentTopPaths: topPathsCurrent,
      currentUsers: currentRows.slice(0, 120).map((row) => ({
        sessionId: row.session_id,
        anonymousId: row.anonymous_id,
        userId: row.user_id,
        isLoggedIn: Boolean(row.user_id) || Boolean(row.is_logged_in),
        deviceType: row.device_type,
        browser: row.browser,
        os: row.os,
        countryCode: (row as { country_code?: string }).country_code || "",
        country: (row as { country?: string }).country || "",
        region: (row as { region?: string }).region || "",
        city: (row as { city?: string }).city || "",
        timezone: (row as { timezone?: string }).timezone || "",
        isSuspectedBot: Boolean((row as { is_suspected_bot?: boolean }).is_suspected_bot),
        trafficReason: (row as { traffic_reason?: string }).traffic_reason || "",
        path: row.path,
        lastSeen: row.last_seen,
      })),
    },
    { status: 200 },
  );
}
