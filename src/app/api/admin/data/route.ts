import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { getAdminData, saveAdminData } from "@/lib/admin-data";

type SavePayload = {
  perfumes?: unknown;
  notes?: unknown;
  settings?: unknown;
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

export async function GET() {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  const data = await getAdminData();
  return Response.json(data);
}

export async function PUT(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  let payload: SavePayload;

  try {
    payload = (await request.json()) as SavePayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const data = await saveAdminData({
      perfumes: payload.perfumes,
      notes: payload.notes,
      settings: payload.settings,
    });

    revalidatePath("/", "layout");

    return Response.json({ ok: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save admin data.";
    return Response.json({ error: message }, { status: 400 });
  }
}
