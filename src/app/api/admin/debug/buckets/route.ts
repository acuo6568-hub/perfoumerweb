import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

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
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketEnvVar = process.env.SUPABASE_STORAGE_BUCKET || "admin-images";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return Response.json(
      {
        error: "Supabase env vars not configured",
        env: {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "✓ set" : "✗ missing",
          SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey ? "✓ set" : "✗ missing",
          SUPABASE_STORAGE_BUCKET: `${bucketEnvVar} (used as fallback or explicit)`,
        },
      },
      { status: 500 },
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      return Response.json(
        {
          error: `Failed to list buckets: ${error.message}`,
          env: {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.replace(/https?:\/\//, "").split(".")[0] + "...",
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey.slice(0, 20) + "...",
            SUPABASE_STORAGE_BUCKET: bucketEnvVar,
          },
        },
        { status: 500 },
      );
    }

    const bucketNames = (buckets || []).map((b) => b.name);
    const adminImagesBucketExists = bucketNames.includes("admin-images");

    return Response.json({
      success: true,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.replace(/https?:\/\//, "").split(".")[0] + "...",
        SUPABASE_STORAGE_BUCKET: bucketEnvVar,
      },
      buckets: bucketNames,
      adminImagesBucketExists,
      note: adminImagesBucketExists
        ? "✓ admin-images bucket is available"
        : "✗ admin-images bucket NOT found in this project",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        error: `Exception: ${message}`,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "set" : "missing",
          SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey ? "set" : "missing",
        },
      },
      { status: 500 },
    );
  }
}
