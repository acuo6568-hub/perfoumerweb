import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";

type QoxunuLogRow = {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  is_signed_in: boolean | null;
  is_guest: boolean | null;
  email: string | null;
  username: string | null;
  locale: string | null;
  page_path: string | null;
  free_text: string | null;
  answers_json: unknown;
  recommendations_json: unknown;
  summary: string | null;
  used_fallback: boolean | null;
  warning: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  user_agent: string | null;
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  created_at: string | null;
};

type AdminUserRow = {
  id: string;
  email: string | null;
  user_metadata?: {
    username?: string;
  } | null;
};

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return Response.json({ error: "Admin login is not configured. Set ADMIN_PASSWORD in env." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!validateAdminSessionToken(token)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

async function listAllUsers(supabase: SupabaseClient) {
  const perPage = 1000;
  let page = 1;
  let users: AdminUserRow[] = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn("Admin qoxunu logs listUsers failed, continuing without auth users:", error);
      return [];
    }

    users = users.concat(
      (data.users as Array<{
        id: string;
        email: string | null;
        user_metadata?: { username?: string } | null;
      }>).map((user) => ({
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata ?? null,
      })),
    );

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function sanitizeAnswers(value: unknown) {
  if (!value || typeof value !== "object") {
    return {} as Record<string, string>;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return entries.reduce<Record<string, string>>((accumulator, [key, entry]) => {
    if (typeof entry !== "string") return accumulator;
    const trimmed = entry.trim();
    if (!trimmed) return accumulator;
    accumulator[key] = trimmed;
    return accumulator;
  }, {});
}

function sanitizeRecommendations(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ slug: string; name: string; brand: string; minPrice: number }>;
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const slug = typeof item.slug === "string" ? item.slug.trim() : "";
      if (!slug) return null;
      return {
        slug,
        name: typeof item.name === "string" ? item.name.trim() : slug,
        brand: typeof item.brand === "string" ? item.brand.trim() : "",
        minPrice: Number(item.minPrice) || 0,
      };
    })
    .filter((entry): entry is { slug: string; name: string; brand: string; minPrice: number } => entry !== null);
}

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit") || 60);
    const limit = Number.isFinite(limitParam) ? Math.min(200, Math.max(10, Math.trunc(limitParam))) : 60;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const users = await listAllUsers(supabase);
    const userMap = new Map(users.map((user) => [user.id, user]));

    const { data: logs } = await supabase
      .from("qoxunu_quiz_logs")
      .select("id,user_id,anonymous_id,is_signed_in,is_guest,email,username,locale,page_path,free_text,answers_json,recommendations_json,summary,used_fallback,warning,device_type,browser,os,user_agent,country_code,country,region,city,timezone,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    const rows = ((logs ?? []) as QoxunuLogRow[]).map((row) => {
      const user = row.user_id ? userMap.get(row.user_id) : null;
      return {
        id: row.id,
        userId: row.user_id,
        anonymousId: row.anonymous_id ?? row.id,
        isSignedIn: Boolean(row.is_signed_in ?? row.user_id),
        isGuest: Boolean(row.is_guest ?? !row.user_id),
        email: row.email ?? user?.email ?? "",
        username: row.username ?? user?.user_metadata?.username ?? "",
        locale: row.locale ?? "",
        pagePath: row.page_path ?? "",
        freeText: row.free_text ?? "",
        answers: sanitizeAnswers(row.answers_json),
        recommendations: sanitizeRecommendations(row.recommendations_json),
        summary: row.summary ?? "",
        usedFallback: Boolean(row.used_fallback),
        warning: row.warning ?? "",
        deviceType: row.device_type ?? "",
        browser: row.browser ?? "",
        os: row.os ?? "",
        userAgent: row.user_agent ?? "",
        countryCode: row.country_code ?? "",
        country: row.country ?? "",
        region: row.region ?? "",
        city: row.city ?? "",
        timezone: row.timezone ?? "",
        createdAt: row.created_at ?? "",
      };
    });

    const guestLogs = rows.filter((row) => row.isGuest).length;
    const signedInLogs = rows.filter((row) => row.isSignedIn).length;
    const uniqueCountries = new Map<string, number>();

    rows.forEach((row) => {
      const country = row.country || row.countryCode || "Unknown";
      uniqueCountries.set(country, (uniqueCountries.get(country) || 0) + 1);
    });

    const topCountries = Array.from(uniqueCountries.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([country, count]) => ({ country, count }));

    return Response.json({
      generatedAt: new Date().toISOString(),
      totalLogs: rows.length,
      guestLogs,
      signedInLogs,
      topCountries,
      logs: rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Qoxunu logs.";
    console.error("Admin Qoxunu logs API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}