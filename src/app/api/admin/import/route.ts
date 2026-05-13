import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { getAdminData, saveAdminData } from "@/lib/admin-data";
import { parseNotesCsv, parsePerfumesCsv } from "@/lib/admin-csv";

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

export async function POST(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const type = String(formData.get("type") || "perfumes").toLowerCase();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "CSV file is required." }, { status: 400 });
  }

  const raw = await file.text();
  const current = await getAdminData();

  try {
    if (type === "notes") {
      const importedNotes = parseNotesCsv(raw);

      const saved = await saveAdminData({
        perfumes: current.perfumes,
        notes: importedNotes,
        settings: current.settings,
      });

      revalidatePath("/", "layout");
      return Response.json({ ok: true, ...saved });
    }

    const importedPerfumes = parsePerfumesCsv(raw);

    const saved = await saveAdminData({
      perfumes: importedPerfumes,
      notes: current.notes,
      settings: current.settings,
    });

    revalidatePath("/", "layout");
    return Response.json({ ok: true, ...saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV import failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
