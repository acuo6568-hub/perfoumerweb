import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";

const SITE_HOST = "perfoumer.az";

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

function normalizeSearchQuery(rawPath: string | null | undefined) {
  const value = String(rawPath || "").trim();
  if (!value) return "";

  try {
    const normalized = value.startsWith("http")
      ? value
      : `https://${SITE_HOST}${value.startsWith("/") ? value : `/${value}`}`;
    const url = new URL(normalized);
    const q = url.searchParams.get("q")?.trim() || "";
    return q;
  } catch {
    return "";
  }
}

function parseResultCount(rawPath: string | null | undefined) {
  const value = String(rawPath || "").trim();
  if (!value) return null;

  try {
    const normalized = value.startsWith("http")
      ? value
      : `https://${SITE_HOST}${value.startsWith("/") ? value : `/${value}`}`;
    const url = new URL(normalized);
    const count = Number(url.searchParams.get("result_count"));
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const daysParam = Number(url.searchParams.get("days") || 30);
    const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(1, Math.trunc(daysParam))) : 30;

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

    const { data, error } = await supabase
      .from("website_analytics_events")
      .select("path,created_at")
      .eq("event_type", "v2_page_view")
      .like("session_id", "v2_%")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) {
      throw new Error("Failed to load search analytics");
    }

    const counts = new Map<string, number>();
    const noResultsCounts = new Map<string, number>();
    (data ?? []).forEach((row) => {
      const path = (row as { path?: string | null }).path;
      const q = normalizeSearchQuery(path);
      if (!q) return;
      counts.set(q, (counts.get(q) || 0) + 1);
      const resultCount = parseResultCount(path);
      if (resultCount === 0) {
        noResultsCounts.set(q, (noResultsCounts.get(q) || 0) + 1);
      }
    });

    const topSearches = Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([query, count]) => ({ query, count }));

    const noResults = Array.from(noResultsCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([query, count]) => ({ query, count }));

    return Response.json({
      generatedAt: new Date().toISOString(),
      topSearches,
      noResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch search analytics.";
    console.error("Admin search analytics API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
