import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: "Missing user id." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: sessions } = await supabase
      .from("website_live_sessions")
      .select("session_id, first_seen, last_seen, page_views, device_type, browser, os, path, country, country_code, city")
      .eq("user_id", id)
      .like("session_id", "v2_%")
      .order("last_seen", { ascending: false })
      .limit(50);

    return Response.json({ sessions: sessions ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sessions.";
    console.error("Admin user sessions API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
