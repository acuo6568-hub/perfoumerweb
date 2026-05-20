import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";
import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";

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

export async function GET() {
  console.log("[DEBUG] GET /api/admin/debug/supabase-data");

  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    console.log("[DEBUG] Checking Supabase config...");
    const config = getSupabaseServiceConfigFromServer();

    if (!config) {
      console.log("[DEBUG] No Supabase config found");
      return Response.json(
        {
          ok: false,
          error: "No Supabase config",
          config: null,
        },
        { status: 500 },
      );
    }

    const { url, serviceRoleKey } = config;
    console.log("[DEBUG] Config found. URL:", url.substring(0, 30) + "...");

    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log("[DEBUG] Querying admin_data table...");
    const { data, error } = await supabase
      .from("admin_data")
      .select("*")
      .eq("id", "admin_data")
      .single();

    if (error) {
      console.log("[DEBUG] Query error:", error);
      return Response.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 500 },
      );
    }

    if (!data) {
      console.log("[DEBUG] No data found in admin_data table");
      return Response.json({
        ok: true,
        found: false,
        message: "admin_data table is empty (no record with id='admin_data')",
      });
    }

    console.log("[DEBUG] Data found. Keys:", Object.keys(data));
    const adminData = (data as { data: unknown }).data;

    if (!adminData || typeof adminData !== "object") {
      console.log("[DEBUG] adminData is not an object");
      return Response.json({
        ok: true,
        found: true,
        message: "admin_data table has record but data field is empty",
        record: data,
      });
    }

    const adminObj = adminData as {
      perfumes?: unknown;
      notes?: unknown;
      settings?: unknown;
    };

    console.log("[DEBUG] Returning data with:", {
      perfumesCount: Array.isArray(adminObj.perfumes)
        ? (adminObj.perfumes as unknown[]).length
        : "not array",
      notesCount: Array.isArray(adminObj.notes)
        ? (adminObj.notes as unknown[]).length
        : "not array",
      hasSettings: !!adminObj.settings,
    });

    return Response.json({
      ok: true,
      found: true,
      message: "Data found in Supabase admin_data table",
      timestamp: (data as { updated_at?: string }).updated_at,
      counts: {
        perfumesCount: Array.isArray(adminObj.perfumes)
          ? (adminObj.perfumes as unknown[]).length
          : 0,
        notesCount: Array.isArray(adminObj.notes)
          ? (adminObj.notes as unknown[]).length
          : 0,
        hasSettings: !!adminObj.settings,
      },
      // Return first perfume as sample
      firstPerfume: Array.isArray(adminObj.perfumes)
        ? (adminObj.perfumes as unknown[])[0]
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("[DEBUG] Exception:", message);
    console.log("[DEBUG] Stack:", err instanceof Error ? err.stack : "no stack");
    return Response.json(
      {
        ok: false,
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
