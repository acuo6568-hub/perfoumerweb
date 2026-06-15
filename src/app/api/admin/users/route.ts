import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

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

async function listAllUsers(supabase: SupabaseClient) {
  const perPage = 1000;
  let page = 1;
  let users: Array<{
    id: string;
    email: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    user_metadata?: { is_deleted?: boolean } | null;
  }> = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn("Admin users listUsers failed, returning partial results:", error);
      return [];
    }

    users = users.concat(
      (data.users as typeof users).map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
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

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get("query") || "").trim().toLowerCase();
    const perPage = Math.min(1000, Math.max(1, Number(url.searchParams.get("perPage") || 60)));
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let users = await listAllUsers(supabase);
    if (query) {
      users = users.filter((user) => (user.email || "").toLowerCase().includes(query));
    }

    const userIds = users.map((user) => user.id);
    const lastSeenMap = new Map<string, string>();
    const locationMap = new Map<string, { country: string; countryCode: string }>();

    if (userIds.length) {
      const { data: sessions } = await supabase
        .from("website_live_sessions")
        .select("user_id, last_seen, country, country_code")
        .in("user_id", userIds)
        .like("session_id", "v2_%")
        .order("last_seen", { ascending: false });

      (sessions ?? []).forEach((session) => {
        if (session.user_id && session.last_seen && !lastSeenMap.has(session.user_id)) {
          lastSeenMap.set(session.user_id, session.last_seen);
          locationMap.set(session.user_id, {
            country: String(session.country || "").trim(),
            countryCode: String(session.country_code || "").trim().toUpperCase(),
          });
        }
      });
    }

    const onlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();
    const { data: onlineSessions } = await supabase
      .from("website_live_sessions")
      .select("user_id, last_seen")
      .not("user_id", "is", null)
      .like("session_id", "v2_%")
      .gte("last_seen", onlineThreshold);

    const onlineUserIds = new Set(
      (onlineSessions ?? [])
        .map((session) => session.user_id)
        .filter((id): id is string => Boolean(id)),
    );

    const summary = users.map((user) => {
      const lastSeen = lastSeenMap.get(user.id) ?? null;
      const isOnline =
        lastSeen !== null && Date.now() - new Date(lastSeen).getTime() <= ONLINE_THRESHOLD_MS;

      return {
        id: user.id,
        email: user.email || "N/A",
        created_at: user.created_at || "",
        last_sign_in_at: user.last_sign_in_at ?? null,
        email_confirmed_at: user.email_confirmed_at ?? null,
        last_seen_at: lastSeen,
        country: locationMap.get(user.id)?.country || "",
        countryCode: locationMap.get(user.id)?.countryCode || "",
        is_online: isOnline,
        is_deleted: Boolean(user.user_metadata?.is_deleted),
      };
    });

    return Response.json({
      users: summary,
      totalUsers: users.length,
      onlineUsers: onlineUserIds.size,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users.";
    console.error("Admin users API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
