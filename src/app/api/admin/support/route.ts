import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionIdentity,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import {
  addSupportMessage,
  listSupportThreads,
  patchSupportConversation,
  summarizeSupportThreads,
} from "@/lib/support-inbox";

type AdminSupportBody = {
  action?: "reply" | "assign" | "close" | "reopen" | "note";
  conversationId?: string;
  message?: string;
  attachmentDataUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const SUPABASE_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "admin-images").trim();

function sanitizeText(value: unknown, maxLength = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeFileName(fileName: string, mimeType: string) {
  const extFromName = path.extname(fileName).toLowerCase();
  const ext =
    extFromName && [".png", ".jpg", ".jpeg", ".webp"].includes(extFromName)
      ? extFromName
      : mimeType === "image/webp"
        ? ".webp"
        : mimeType === "image/png"
          ? ".png"
          : ".jpg";
  const base =
    fileName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "admin-support-image";
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

function parseDataUrl(value: string, fallbackMimeType: string) {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1] || fallbackMimeType;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.byteLength > MAX_UPLOAD_BYTES) return null;
  return { buffer, mimeType };
}

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return { response: Response.json({ error: "Admin login is not configured." }, { status: 500 }), username: "" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!validateAdminSessionToken(token)) {
    return { response: Response.json({ error: "Unauthorized." }, { status: 401 }), username: "" };
  }

  return { response: null, username: getAdminSessionIdentity(token)?.username || "admin" };
}

async function saveAttachment(body: AdminSupportBody) {
  const dataUrl = sanitizeText(body.attachmentDataUrl, 8_000_000);
  if (!dataUrl) return null;
  const parsed = parseDataUrl(dataUrl, sanitizeText(body.attachmentMimeType, 80));
  if (!parsed) {
    throw new Error("Only JPG, PNG, and WebP images up to 5MB are allowed.");
  }

  const fileName = safeFileName(sanitizeText(body.attachmentName, 180) || "support-image", parsed.mimeType);
  const buffer = parsed.buffer;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const publicDir = path.join(process.cwd(), "public", "uploads", "support");
    await mkdir(publicDir, { recursive: true });
    await writeFile(path.join(publicDir, fileName), buffer);
    return {
      url: `/api/uploads/support/${fileName}`,
      fileName,
      mimeType: parsed.mimeType,
      size: buffer.byteLength,
    };
  } catch {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Upload failed.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const key = `uploads/support/${fileName}`;
    const result = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(key, buffer, {
      contentType: parsed.mimeType,
      upsert: false,
    });
    if (result.error) throw result.error;
    return {
      url: `/api/uploads/support/${fileName}`,
      fileName,
      mimeType: parsed.mimeType,
      size: buffer.byteLength,
    };
  }
}

export async function GET() {
  const auth = await ensureAuthorized();
  if (auth.response) return auth.response;

  const threads = await listSupportThreads(120);
  return Response.json({
    generatedAt: new Date().toISOString(),
    summary: summarizeSupportThreads(threads),
    conversations: threads,
  });
}

export async function POST(request: Request) {
  const auth = await ensureAuthorized();
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as AdminSupportBody;
    const conversationId = sanitizeText(body.conversationId, 120);
    if (!conversationId) {
      return Response.json({ error: "Conversation ID is required." }, { status: 400 });
    }

    if (body.action === "assign") {
      const thread = await patchSupportConversation(conversationId, {
        assigned_admin_id: auth.username,
        status: "active",
      });
      return Response.json({ thread });
    }

    if (body.action === "close") {
      const thread = await patchSupportConversation(conversationId, { status: "closed" });
      return Response.json({ thread });
    }

    if (body.action === "reopen") {
      const thread = await patchSupportConversation(conversationId, { status: "active", closed_at: null });
      return Response.json({ thread });
    }

    const message = sanitizeText(body.message, 4000);
    if (body.action === "note") {
      if (!message) {
        return Response.json({ error: "Note is required." }, { status: 400 });
      }

      const thread = await addSupportMessage({
        conversationId,
        senderType: "system",
        senderId: "__internal_note",
        message,
      });

      return Response.json({ thread });
    }

    const attachment = await saveAttachment(body);
    if (!message && !attachment) {
      return Response.json({ error: "Message or attachment is required." }, { status: 400 });
    }

    const thread = await addSupportMessage({
      conversationId,
      senderType: "admin",
      senderId: auth.username,
      message: message || "Şəkil əlavə edildi",
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.mimeType,
      attachmentName: attachment?.fileName,
      attachmentSize: attachment?.size,
    });

    return Response.json({ thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Support action failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
