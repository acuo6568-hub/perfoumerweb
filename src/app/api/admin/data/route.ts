import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

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
  console.log("[API] GET /api/admin/data - Loading admin data");
  const authError = await ensureAuthorized();
  if (authError) {
    console.log("[API] GET - Authorization failed");
    return authError;
  }

  console.log("[API] GET - Authorization passed, retrieving data");
  const data = await getAdminData();
  console.log("[API] GET - Returning data with", (data.perfumes as unknown[]).length, "perfumes and", (data.notes as unknown[]).length, "notes");
  return Response.json(data);
}

export async function PUT(request: Request) {
  console.log("[API] PUT /api/admin/data - Saving admin data");
  const authError = await ensureAuthorized();
  if (authError) {
    console.log("[API] PUT - Authorization failed");
    return authError;
  }

  let payload: SavePayload;

  try {
    payload = (await request.json()) as SavePayload;
    console.log("[API] PUT - Received payload with:", {
      perfumesCount: Array.isArray(payload.perfumes) ? (payload.perfumes as unknown[]).length : "not array",
      notesCount: Array.isArray(payload.notes) ? (payload.notes as unknown[]).length : "not array",
      hasSettings: !!payload.settings,
    });
  } catch {
    console.log("[API] PUT - Failed to parse JSON");
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    console.log("[API] PUT - Calling saveAdminData...");
    const data = await saveAdminData({
      perfumes: payload.perfumes,
      notes: payload.notes,
      settings: payload.settings,
    });

    console.log("[API] PUT - saveAdminData completed successfully");
    console.log("[API] PUT - Revalidating catalog cache...");
    revalidateTag("catalog", { expire: 0 });
    revalidateTag("perfumes", { expire: 0 });
    revalidateTag("notes", { expire: 0 });
    revalidatePath("/", "layout");
    console.log("[API] PUT - Cache revalidated");

    console.log("[API] PUT - Returning success response");
    return Response.json({ ok: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save admin data.";
    console.log("[API] PUT - Error:", message);
    console.log("[API] PUT - Full error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
