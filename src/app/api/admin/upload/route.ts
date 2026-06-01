import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { appendAdminAuditLog, getAdminAuditContext } from "@/lib/admin-audit";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set(["perfumes", "notes"]);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const SUPABASE_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "admin-images").trim();

function safeBaseName(fileName: string) {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return base || "image";
}

function getFileExtension(fileName: string, mimeType: string) {
  const fromName = path.extname(fileName).toLowerCase();
  if (fromName && fromName.length <= 8) {
    return fromName;
  }

  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "image/jpg" || mimeType === "image/jpeg") return ".jpg";

  return ".png";
}

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

  const file = formData.get("file");
  const folderRaw = String(formData.get("folder") || "perfumes").toLowerCase();
  const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "perfumes";

  if (!(file instanceof File)) {
    return Response.json({ error: "File is required." }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return Response.json({ error: "Only PNG, JPG, and WebP images are allowed." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "Image is too large. Max size is 8MB." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = getFileExtension(file.name, file.type);
  const base = safeBaseName(file.name);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${base}-${unique}${ext}`;

  const publicDir = path.join(process.cwd(), "public", "uploads", "admin", folder);
  const absolutePath = path.join(publicDir, fileName);

  try {
    await mkdir(publicDir, { recursive: true });
    await writeFile(absolutePath, buffer);

    const auditContext = await getAdminAuditContext(request);
    await appendAdminAuditLog({
      action: "admin_image_upload",
      section: folder,
      targetType: "image",
      targetId: fileName,
      targetLabel: file.name,
      summary: `Uploaded image "${file.name}" to ${folder}.`,
      changes: [{ path: "url", before: "(empty)", after: `/api/uploads/admin/${folder}/${fileName}` }],
      metadata: {
        size: file.size,
        storage: "local",
      },
      ...auditContext,
    });

    return Response.json({
      ok: true,
      url: `/api/uploads/admin/${folder}/${fileName}`,
      storage: "local",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isReadOnly =
      message.includes("EROFS") ||
      message.includes("read-only file system") ||
      message.includes("EACCES") ||
      message.includes("EPERM");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceRoleKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        const key = `uploads/admin/${folder}/${fileName}`;

        const uploadResult = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(key, buffer, {
          contentType: file.type || "image/png",
          upsert: false,
        });

        if (uploadResult.error) {
          throw uploadResult.error;
        }

        const auditContext = await getAdminAuditContext(request);
        await appendAdminAuditLog({
          action: "admin_image_upload",
          section: folder,
          targetType: "image",
          targetId: fileName,
          targetLabel: file.name,
          summary: `Uploaded image "${file.name}" to ${folder}.`,
          changes: [{ path: "url", before: "(empty)", after: `/api/uploads/admin/${folder}/${fileName}` }],
          metadata: {
            size: file.size,
            storage: "supabase",
            bucket: SUPABASE_STORAGE_BUCKET,
          },
          ...auditContext,
        });

        return Response.json({
          ok: true,
          url: `/api/uploads/admin/${folder}/${fileName}`,
          storage: "supabase",
          storageKey: key,
          bucket: SUPABASE_STORAGE_BUCKET,
        });
      } catch (supabaseError) {
        const supabaseMessage = supabaseError instanceof Error ? supabaseError.message : String(supabaseError);
        return Response.json(
          {
            error: `Upload failed: ${supabaseMessage}`,
            hint: `Local storage failed${isReadOnly ? " because the filesystem is read-only" : ""}. Set SUPABASE_STORAGE_BUCKET and make sure SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL are configured.`,
          },
          { status: 500 },
        );
      }
    }

    return Response.json(
      {
        error: `Upload failed: ${message}`,
        hint:
          "This runtime cannot write to public/uploads. Configure Supabase Storage (SUPABASE_STORAGE_BUCKET + SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL) or run the app on a host with a writable uploads directory.",
      },
      { status: 500 },
    );
  }
}
