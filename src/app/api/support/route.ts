import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import {
  addSupportMessage,
  createSupportConversation,
  findOpenSupportThread,
  getSupportThread,
  patchSupportConversation,
} from "@/lib/support-inbox";

type SupportBody = {
  action?: "request" | "message" | "close" | "ping";
  conversationId?: string;
  guestId?: string;
  message?: string;
  sourcePage?: string;
  userName?: string;
  userEmail?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  recentMessages?: Array<{ role?: string; text?: string; createdAt?: number | string }>;
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

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
      .replace(/-+/g, "-") || "support-image";
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

async function saveAttachment(body: SupportBody) {
  const dataUrl = sanitizeText(body.attachmentDataUrl, 8_000_000);
  if (!dataUrl) return null;
  const parsed = parseDataUrl(dataUrl, sanitizeText(body.attachmentMimeType, 80));
  if (!parsed) {
    throw new Error("Yalnız JPG, PNG və WebP şəkilləri, maksimum 5MB.");
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
      throw new Error("Şəkil yükləməsi hazırda mümkün olmadı.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const key = `uploads/support/${fileName}`;
    const result = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(key, buffer, {
      contentType: parsed.mimeType,
      upsert: false,
    });
    if (result.error) {
      throw result.error;
    }
    return {
      url: `/api/uploads/support/${fileName}`,
      fileName,
      mimeType: parsed.mimeType,
      size: buffer.byteLength,
    };
  }
}

async function resolveUserId(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const conversationId = sanitizeText(url.searchParams.get("conversationId"), 120);
  const guestId = sanitizeText(url.searchParams.get("guestId"), 120);
  const userId = await resolveUserId(request);

  const thread = conversationId
    ? await getSupportThread(conversationId)
    : await findOpenSupportThread(userId, guestId);

  return Response.json({ thread: thread ?? null });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SupportBody;
    const action = body.action || "message";
    const userId = await resolveUserId(request);
    const guestId = sanitizeText(body.guestId, 120) || (userId ? null : createId("guest"));

    if (action === "request") {
      const thread = await createSupportConversation({
        userId,
        guestId,
        sourcePage: sanitizeText(body.sourcePage, 400),
        userName: sanitizeText(body.userName, 180) || null,
        userEmail: sanitizeText(body.userEmail, 220) || null,
        userAgent: sanitizeText(body.userAgent, 600) || request.headers.get("user-agent") || "",
        device: sanitizeText(body.device, 140),
        browser: sanitizeText(body.browser, 140),
        recentMessages: Array.isArray(body.recentMessages) ? body.recentMessages : [],
      });
      return Response.json({ thread, guestId });
    }

    const conversationId = sanitizeText(body.conversationId, 120);
    if (!conversationId) {
      return Response.json({ error: "Conversation ID is required." }, { status: 400 });
    }

    if (action === "close") {
      const thread = await patchSupportConversation(conversationId, { status: "closed", is_online: false });
      return Response.json({ thread });
    }

    if (action === "ping") {
      const thread = await patchSupportConversation(conversationId, { is_online: true });
      return Response.json({ thread });
    }

    const message = sanitizeText(body.message, 4000);
    const attachment = await saveAttachment(body);
    if (!message && !attachment) {
      return Response.json({ error: "Message or attachment is required." }, { status: 400 });
    }

    const thread = await addSupportMessage({
      conversationId,
      senderType: "user",
      senderId: userId || guestId,
      message: message || "Şəkil əlavə edildi",
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.mimeType,
      attachmentName: attachment?.fileName,
      attachmentSize: attachment?.size,
    });

    return Response.json({ thread, guestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Support request failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
