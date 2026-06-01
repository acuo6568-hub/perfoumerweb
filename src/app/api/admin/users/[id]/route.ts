import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionIdentity,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { appendAdminAuditLog, getAdminAuditContext } from "@/lib/admin-audit";
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

export async function DELETE(
  request: Request,
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
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(id);

    if (userError || !userData.user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    const adminIdentity = getAdminSessionIdentity(token);

    const existingMetadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
    const nextMetadata = {
      ...existingMetadata,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: adminIdentity?.username ?? "admin",
    };

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: nextMetadata,
    });

    if (updateError) {
      throw new Error("Failed to delete user");
    }

    const auditContext = await getAdminAuditContext(request);
    await appendAdminAuditLog({
      action: "admin_user_delete",
      section: "users",
      targetType: "user",
      targetId: id,
      targetLabel: userData.user.email || id,
      summary: `Marked user "${userData.user.email || id}" as deleted.`,
      changes: [
        { path: "user_metadata.is_deleted", before: stringifyBoolean(existingMetadata.is_deleted), after: "true" },
        { path: "user_metadata.deleted_at", before: stringifyBoolean(existingMetadata.deleted_at), after: String(nextMetadata.deleted_at) },
      ],
      ...auditContext,
    });

    return Response.json({
      ok: true,
      user: {
        id,
        user_metadata: updatedUser.user?.user_metadata ?? nextMetadata,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    console.error("Admin delete user API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}

function stringifyBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") return "(empty)";
  return String(value);
}
