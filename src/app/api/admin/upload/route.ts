import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { cookies } from "next/headers";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set(["perfumes", "notes"]);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

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

    const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || process.env.S3_REGION;

    if (bucket) {
      try {
        const s3Client = new S3Client({ region });
        const key = `uploads/admin/${folder}/${fileName}`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type || "image/png",
          }),
        );

        const publicBase = process.env.S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`;
        return Response.json({
          ok: true,
          url: `/api/uploads/admin/${folder}/${fileName}`,
          storage: "s3",
          storageUrl: `${publicBase}/${key}`,
        });
      } catch (s3Error) {
        const s3Message = s3Error instanceof Error ? s3Error.message : String(s3Error);
        return Response.json(
          {
            error: `Upload failed: ${s3Message}`,
            hint: `Local storage failed${isReadOnly ? " because the filesystem is read-only" : ""}. Configure S3_BUCKET/AWS_REGION/AWS credentials or mount a writable volume for public/uploads.`,
          },
          { status: 500 },
        );
      }
    }

    return Response.json(
      {
        error: `Upload failed: ${message}`,
        hint:
          "This runtime cannot write to public/uploads. Set S3_BUCKET/AWS_REGION and AWS credentials, or run the app on a host with a writable uploads directory.",
      },
      { status: 500 },
    );
  }
}
