import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { getPerfumes } from "@/lib/catalog";

const SITE_HOST = "perfoumer.az";

type AuthUserRow = {
  id: string;
  created_at: string | null;
  email: string | null;
  user_metadata?: {
    username?: string;
  } | null;
};

type ActivityItem = {
  id: string;
  kind: "search" | "wishlist" | "quiz" | "visit" | "signup";
  subject: string;
  detail: string;
  timestamp: string;
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

async function listAllUsers(supabase: SupabaseClient) {
  const perPage = 1000;
  let page = 1;
  const users: AuthUserRow[] = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error("Failed to fetch auth users");
    }

    users.push(
      ...((data.users as Array<{
        id: string;
        created_at: string | null;
        email: string | null;
        user_metadata?: { username?: string } | null;
      }>) ?? []).map((user) => ({
        id: user.id,
        created_at: user.created_at ?? null,
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

function normalizeTrackedPath(rawPath: string | null | undefined) {
  const value = String(rawPath || "").trim();
  if (!value) {
    return { pathname: "/", query: new URLSearchParams() };
  }

  try {
    const normalized = value.startsWith("http")
      ? value
      : `https://${SITE_HOST}${value.startsWith("/") ? value : `/${value}`}`;
    const url = new URL(normalized);
    return { pathname: url.pathname || "/", query: url.searchParams };
  } catch {
    return { pathname: "/", query: new URLSearchParams() };
  }
}

function isPerfumePath(pathname: string) {
  return pathname.startsWith("/perfumes/");
}

function stripPerfumeSlug(pathname: string) {
  return pathname.replace(/^\/perfumes\//, "").split("?")[0];
}

function formatSearchQuery(rawPath: string | null | undefined) {
  const { query } = normalizeTrackedPath(rawPath);
  return query.get("q")?.trim() || "";
}

function formatTrackedPage(rawPath: string | null | undefined, perfumeNameBySlug: Map<string, string>) {
  const { pathname } = normalizeTrackedPath(rawPath);
  if (!isPerfumePath(pathname)) {
    return pathname || "/";
  }

  const slug = stripPerfumeSlug(pathname);
  return perfumeNameBySlug.get(slug) || slug || pathname;
}

function toTimeLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const daysParam = Number(url.searchParams.get("days") || 1);
    const days = Number.isFinite(daysParam) ? Math.min(30, Math.max(1, Math.trunc(daysParam))) : 1;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const perfumes = await getPerfumes();
    const perfumeNameBySlug = new Map(perfumes.map((perfume) => [perfume.slug, perfume.name]));

    const [users, searchRows, wishlistRows, quizRows] = await Promise.all([
      listAllUsers(supabase),
      supabase
        .from("website_analytics_events")
        .select("id,path,created_at")
        .eq("event_type", "v2_page_view")
        .like("session_id", "v2_%")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(1200),
      supabase
        .from("wishlists")
        .select("id,perfume_slug,created_at,user_id")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(400),
      supabase
        .from("qoxunu_quiz_logs")
        .select("id,created_at,free_text,page_path,email,username,user_id")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const searchEventsError = searchRows.error;
    const wishlistError = wishlistRows.error;
    const quizError = quizRows.error;

    if (searchEventsError) {
      throw new Error("Failed to load activity feed");
    }
    if (wishlistError) {
      throw new Error("Failed to load activity feed");
    }
    if (quizError) {
      throw new Error("Failed to load activity feed");
    }

    const items: ActivityItem[] = [];

    (searchRows.data ?? []).forEach((row) => {
      const id = `search:${(row as { id?: string | null }).id || `${row.created_at || ""}:${row.path || ""}`}`;
      const timestamp = String((row as { created_at?: string | null }).created_at || "");
      const query = formatSearchQuery((row as { path?: string | null }).path);
      if (!query || !timestamp) return;

      items.push({
        id,
        kind: "search",
        subject: query,
        detail: formatTrackedPage((row as { path?: string | null }).path, perfumeNameBySlug),
        timestamp,
      });
    });

    (wishlistRows.data ?? []).forEach((row) => {
      const slug = String((row as { perfume_slug?: string | null }).perfume_slug || "").trim();
      const timestamp = String((row as { created_at?: string | null }).created_at || "");
      if (!slug || !timestamp) return;

      items.push({
        id: `wishlist:${(row as { id?: string | null }).id || `${timestamp}:${slug}`}`,
        kind: "wishlist",
        subject: perfumeNameBySlug.get(slug) || slug,
        detail: "Wishlist add",
        timestamp,
      });
    });

    (quizRows.data ?? []).forEach((row) => {
      const timestamp = String((row as { created_at?: string | null }).created_at || "");
      if (!timestamp) return;

      items.push({
        id: `quiz:${(row as { id?: string | null }).id || timestamp}`,
        kind: "quiz",
        subject: String((row as { free_text?: string | null }).free_text || "").trim(),
        detail: String((row as { page_path?: string | null }).page_path || "").trim() || "Qoxunu",
        timestamp,
      });
    });

    users.forEach((user) => {
      const timestamp = String(user.created_at || "");
      if (!timestamp) return;

      items.push({
        id: `signup:${user.id}`,
        kind: "signup",
        subject: user.email || user.user_metadata?.username || user.id,
        detail: "Account registration",
        timestamp,
      });
    });

    const recentItems = items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
      .map((item) => ({
        ...item,
        time: toTimeLabel(item.timestamp),
      }));

    return Response.json({
      generatedAt: new Date().toISOString(),
      items: recentItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch activity feed.";
    console.error("Admin activity feed API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
