import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { getAdminAuditLog } from "@/lib/admin-audit";

export const runtime = "nodejs";

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

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) return authError;

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 250, 1), 500);
  const entries = await getAdminAuditLog(limit);

  return Response.json({
    entries,
    total: entries.length,
    generatedAt: new Date().toISOString(),
  });
}
