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

function shouldIncludeVisit(pathname: string) {
  return pathname !== "/admin" && !pathname.startsWith("/admin/");
}

function formatTrackedPage(rawPath: string | null | undefined, perfumeNameBySlug: Map<string, string>) {
  const { pathname } = normalizeTrackedPath(rawPath);
  if (pathname === "/") return "Ana səhifə";
  if (pathname === "/catalog") return "Kataloq";
  if (pathname === "/cart") return "Səbət";
  if (pathname === "/checkout") return "Checkout";
  if (pathname === "/wishlist") return "İstək siyahısı";
  if (pathname === "/qoxunu") return "Qoxunu";
  if (pathname === "/offers") return "Təkliflər";
  if (pathname === "/brands") return "Brendlər";
  if (pathname === "/account") return "Hesab";

  if (isPerfumePath(pathname)) {
    const slug = stripPerfumeSlug(pathname);
    return perfumeNameBySlug.get(slug) || slug || pathname;
  }

  return pathname || "/";
}

function formatTrackedPageKind(rawPath: string | null | undefined) {
  const { pathname } = normalizeTrackedPath(rawPath);
  if (pathname === "/") return "Ana səhifə";
  if (isPerfumePath(pathname)) return "Məhsul səhifəsi";
  if (pathname.startsWith("/catalog")) return "Kataloq";
  if (pathname.startsWith("/cart")) return "Səbət";
  if (pathname.startsWith("/checkout")) return "Checkout";
  if (pathname.startsWith("/wishlist")) return "İstək siyahısı";
  if (pathname.startsWith("/qoxunu")) return "Qoxunu tap";
  if (pathname.startsWith("/account")) return "Hesab";
  if (pathname.startsWith("/brands")) return "Brendlər";
  if (pathname.startsWith("/notes")) return "Not səhifəsi";
  return pathname || "Səhifə";
}

function formatRowContext(row: {
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  device_type?: string | null;
  browser?: string | null;
}) {
  const location = [row.city, row.country || row.country_code]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
  const device = [row.device_type, row.browser]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");

  return [location, device].filter(Boolean).join(" · ");
}

function joinDetail(...parts: Array<string | null | undefined>) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(" · ");
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
    since.setUTCDate(since.getUTCDate() - days);

    const perfumes = await getPerfumes();
    const perfumeNameBySlug = new Map(perfumes.map((perfume) => [perfume.slug, perfume.name]));

    const [usersResult, pageViewRowsResult, wishlistRowsResult, quizRowsResult] = await Promise.allSettled([
      listAllUsers(supabase),
      supabase
        .from("website_analytics_events")
        .select("id,path,created_at,user_id,anonymous_id,country,country_code,city,device_type,browser,locale")
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

    const users = usersResult.status === "fulfilled" ? usersResult.value : [];
    const pageViewRows =
      pageViewRowsResult.status === "fulfilled" && !pageViewRowsResult.value.error
        ? pageViewRowsResult.value.data ?? []
        : [];
    const wishlistRows =
      wishlistRowsResult.status === "fulfilled" && !wishlistRowsResult.value.error
        ? wishlistRowsResult.value.data ?? []
        : [];
    const quizRows =
      quizRowsResult.status === "fulfilled" && !quizRowsResult.value.error
        ? quizRowsResult.value.data ?? []
        : [];

    if (usersResult.status === "rejected") {
      console.warn("Admin activity feed users unavailable:", usersResult.reason);
    }
    if (pageViewRowsResult.status === "rejected" || pageViewRowsResult.value.error) {
      console.warn(
        "Admin activity feed page views unavailable:",
        pageViewRowsResult.status === "rejected" ? pageViewRowsResult.reason : pageViewRowsResult.value.error,
      );
    }
    if (wishlistRowsResult.status === "rejected" || wishlistRowsResult.value.error) {
      console.warn(
        "Admin activity feed wishlists unavailable:",
        wishlistRowsResult.status === "rejected" ? wishlistRowsResult.reason : wishlistRowsResult.value.error,
      );
    }
    if (quizRowsResult.status === "rejected" || quizRowsResult.value.error) {
      console.warn(
        "Admin activity feed quiz logs unavailable:",
        quizRowsResult.status === "rejected" ? quizRowsResult.reason : quizRowsResult.value.error,
      );
    }

    const items: ActivityItem[] = [];
    const userLabelById = new Map(
      users.map((user) => [user.id, user.email || user.user_metadata?.username || user.id]),
    );

    pageViewRows.forEach((row) => {
      const timestamp = String((row as { created_at?: string | null }).created_at || "");
      const path = (row as { path?: string | null }).path;
      const id = (row as { id?: string | null }).id || `${timestamp}:${path || ""}`;
      const query = formatSearchQuery(path);
      if (!timestamp) return;
      const analyticsContext = formatRowContext(row as {
        city?: string | null;
        country?: string | null;
        country_code?: string | null;
        device_type?: string | null;
        browser?: string | null;
      });

      if (query) {
        items.push({
          id: `search:${id}`,
          kind: "search",
          subject: query,
          detail: joinDetail("Axtarış", formatTrackedPageKind(path), analyticsContext),
          timestamp,
        });
        return;
      }

      const { pathname } = normalizeTrackedPath(path);
      if (!shouldIncludeVisit(pathname)) return;

      items.push({
        id: `visit:${id}`,
        kind: "visit",
        subject: formatTrackedPage(path, perfumeNameBySlug),
        detail: joinDetail(formatTrackedPageKind(path), analyticsContext),
        timestamp,
      });
    });

    wishlistRows.forEach((row) => {
      const slug = String((row as { perfume_slug?: string | null }).perfume_slug || "").trim();
      const timestamp = String((row as { created_at?: string | null }).created_at || "");
      if (!slug || !timestamp) return;

      items.push({
        id: `wishlist:${(row as { id?: string | null }).id || `${timestamp}:${slug}`}`,
        kind: "wishlist",
        subject: perfumeNameBySlug.get(slug) || slug,
        detail: joinDetail("İstək siyahısı", userLabelById.get(String((row as { user_id?: string | null }).user_id || ""))),
        timestamp,
      });
    });

    quizRows.forEach((row) => {
      const timestamp = String((row as { created_at?: string | null }).created_at || "");
      if (!timestamp) return;

      items.push({
        id: `quiz:${(row as { id?: string | null }).id || timestamp}`,
        kind: "quiz",
        subject: String((row as { free_text?: string | null }).free_text || "").trim(),
        detail: joinDetail(
          "Qoxunu tap",
          formatTrackedPageKind((row as { page_path?: string | null }).page_path),
          String((row as { email?: string | null }).email || (row as { username?: string | null }).username || userLabelById.get(String((row as { user_id?: string | null }).user_id || "")) || "").trim(),
        ),
        timestamp,
      });
    });

    users.forEach((user) => {
      const timestamp = String(user.created_at || "");
      if (!timestamp) return;
      if (new Date(timestamp).getTime() < since.getTime()) return;

      items.push({
        id: `signup:${user.id}`,
        kind: "signup",
        subject: user.email || user.user_metadata?.username || user.id,
        detail: joinDetail("Qeydiyyat", user.email || user.user_metadata?.username || user.id),
        timestamp,
      });
    });

    const recentItems = items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

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
