import path from "node:path";
import os from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupportStatus = "new" | "waiting" | "active" | "closed";
type SupportSenderType = "user" | "admin" | "system" | "ai";

export type SupportAttachment = {
  id: string;
  conversation_id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  conversation_id: string;
  sender_type: SupportSenderType;
  sender_id: string | null;
  message: string;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
  read_at: string | null;
};

export type SupportConversation = {
  id: string;
  user_id: string | null;
  guest_id: string | null;
  status: SupportStatus;
  assigned_admin_id: string | null;
  source_page: string;
  user_name: string | null;
  user_email: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  closed_at: string | null;
};

export type SupportThread = SupportConversation & {
  messages: SupportMessage[];
  attachments: SupportAttachment[];
  latestMessage: SupportMessage | null;
  unreadCount: number;
};

type LocalSupportData = {
  conversations: SupportConversation[];
  messages: SupportMessage[];
  attachments: SupportAttachment[];
};

type CreateConversationInput = {
  userId?: string | null;
  guestId?: string | null;
  sourcePage?: string;
  userName?: string | null;
  userEmail?: string | null;
  userAgent?: string | null;
  device?: string | null;
  browser?: string | null;
  recentMessages?: Array<{ role?: string; text?: string; createdAt?: number | string }>;
};

type AddMessageInput = {
  conversationId: string;
  senderType: SupportSenderType;
  senderId?: string | null;
  message: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
};

const SUPPORT_DATA_PATH = path.join(process.cwd(), "data", "admin", "support-inbox.json");

function getWritableSupportDataPath() {
  const writableDir = process.env.WRITABLE_DATA_DIR || os.tmpdir();
  return path.join(writableDir, "support-inbox.json");
}

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supportStorageError(action: string, cause?: unknown) {
  const detail = cause instanceof Error ? ` ${cause.message}` : "";
  return new Error(
    `Support inbox ${action} failed. Configure Supabase support tables and SUPABASE_SERVICE_ROLE_KEY for production.${detail}`,
  );
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeText(value: unknown, maxLength = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readLocalData(): Promise<LocalSupportData> {
  const writablePath = getWritableSupportDataPath();
  try {
    const raw = await readFile(writablePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalSupportData>;
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
    };
  } catch {
    try {
      const raw = await readFile(SUPPORT_DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Partial<LocalSupportData>;
      return {
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      };
    } catch {
      return { conversations: [], messages: [], attachments: [] };
    }
  }
}

async function writeLocalData(data: LocalSupportData) {
  const writablePath = getWritableSupportDataPath();
  await mkdir(path.dirname(writablePath), { recursive: true });
  await writeFile(writablePath, JSON.stringify(data, null, 2), "utf-8");
}

function buildThreads(data: LocalSupportData): SupportThread[] {
  return data.conversations
    .map((conversation) => {
      const messages = data.messages
        .filter((message) => message.conversation_id === conversation.id)
        .sort((left, right) => left.created_at.localeCompare(right.created_at));
      const attachments = data.attachments.filter((attachment) => attachment.conversation_id === conversation.id);
      const latestMessage = messages[messages.length - 1] ?? null;
      const unreadCount = messages.filter((message) => message.sender_type === "user" && !message.read_at).length;
      return { ...conversation, messages, attachments, latestMessage, unreadCount };
    })
    .sort((left, right) => right.last_message_at.localeCompare(left.last_message_at));
}

function normalizeConversation(row: Partial<SupportConversation>): SupportConversation {
  const timestamp = nowIso();
  return {
    id: sanitizeText(row.id, 120) || createId("support"),
    user_id: sanitizeText(row.user_id, 120) || null,
    guest_id: sanitizeText(row.guest_id, 120) || null,
    status: row.status === "new" || row.status === "active" || row.status === "closed" ? row.status : "waiting",
    assigned_admin_id: sanitizeText(row.assigned_admin_id, 120) || null,
    source_page: sanitizeText(row.source_page, 400),
    user_name: sanitizeText(row.user_name, 180) || null,
    user_email: sanitizeText(row.user_email, 220) || null,
    user_agent: sanitizeText(row.user_agent, 600) || null,
    device: sanitizeText(row.device, 140) || null,
    browser: sanitizeText(row.browser, 140) || null,
    is_online: Boolean(row.is_online),
    created_at: sanitizeText(row.created_at, 80) || timestamp,
    updated_at: sanitizeText(row.updated_at, 80) || timestamp,
    last_message_at: sanitizeText(row.last_message_at, 80) || timestamp,
    closed_at: sanitizeText(row.closed_at, 80) || null,
  };
}

function normalizeMessage(row: Partial<SupportMessage>): SupportMessage {
  return {
    id: sanitizeText(row.id, 120) || createId("msg"),
    conversation_id: sanitizeText(row.conversation_id, 120),
    sender_type:
      row.sender_type === "admin" || row.sender_type === "system" || row.sender_type === "ai"
        ? row.sender_type
        : "user",
    sender_id: sanitizeText(row.sender_id, 120) || null,
    message: sanitizeText(row.message, 4000),
    attachment_url: sanitizeText(row.attachment_url, 700) || null,
    attachment_type: sanitizeText(row.attachment_type, 120) || null,
    created_at: sanitizeText(row.created_at, 80) || nowIso(),
    read_at: sanitizeText(row.read_at, 80) || null,
  };
}

function normalizeAttachment(row: Partial<SupportAttachment>): SupportAttachment {
  return {
    id: sanitizeText(row.id, 120) || createId("att"),
    conversation_id: sanitizeText(row.conversation_id, 120),
    message_id: sanitizeText(row.message_id, 120),
    file_url: sanitizeText(row.file_url, 700),
    file_name: sanitizeText(row.file_name, 260),
    file_type: sanitizeText(row.file_type, 120),
    file_size: Number.isFinite(Number(row.file_size)) ? Number(row.file_size) : 0,
    created_at: sanitizeText(row.created_at, 80) || nowIso(),
  };
}

async function tryListSupabaseThreads(limit = 80): Promise<SupportThread[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: conversations, error } = await supabase
    .from("support_conversations")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("Support inbox read failed from Supabase, falling back to local data:", error);
    return null;
  }

  const ids = ((conversations ?? []) as SupportConversation[]).map((row) => row.id);
  if (!ids.length) return [];

  const [{ data: messages, error: messagesError }, { data: attachments, error: attachmentsError }] = await Promise.all([
    supabase.from("support_messages").select("*").in("conversation_id", ids).order("created_at", { ascending: true }),
    supabase.from("support_attachments").select("*").in("conversation_id", ids).order("created_at", { ascending: true }),
  ]);
  if (messagesError || attachmentsError) {
    console.warn("Support inbox thread hydration failed from Supabase, falling back to local data:", messagesError || attachmentsError);
    return null;
  }

  return buildThreads({
    conversations: ((conversations ?? []) as Partial<SupportConversation>[]).map(normalizeConversation),
    messages: ((messages ?? []) as Partial<SupportMessage>[]).map(normalizeMessage),
    attachments: ((attachments ?? []) as Partial<SupportAttachment>[]).map(normalizeAttachment),
  });
}

async function tryUpsertSupabaseConversation(conversation: SupportConversation) {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("support_conversations").upsert(conversation, { onConflict: "id" });
  if (error) {
    console.warn("Support inbox conversation save failed in Supabase, falling back to local data:", error);
  }
  return !error;
}

async function tryInsertSupabaseMessage(message: SupportMessage, attachment?: SupportAttachment | null) {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("support_messages").insert(message);
  if (error) {
    console.warn("Support inbox message save failed in Supabase, falling back to local data:", error);
    return false;
  }
  if (attachment) {
    const { error: attachmentError } = await supabase.from("support_attachments").insert(attachment);
    if (attachmentError) {
      console.warn("Support inbox attachment save failed in Supabase, falling back to local data:", attachmentError);
      return false;
    }
  }
  const { error: conversationError } = await supabase
    .from("support_conversations")
    .update({
      status: message.sender_type === "admin" ? "active" : "waiting",
      updated_at: message.created_at,
      last_message_at: message.created_at,
      closed_at: null,
    })
    .eq("id", message.conversation_id);
  if (conversationError) {
    console.warn("Support inbox conversation update failed in Supabase, falling back to local data:", conversationError);
  }
  return true;
}

async function tryPatchSupabaseConversation(id: string, patch: Partial<SupportConversation>) {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("support_conversations").update(patch).eq("id", id);
  if (error) {
    console.warn("Support inbox conversation patch failed in Supabase, falling back to local data:", error);
  }
  return !error;
}

async function markUserMessagesRead(conversationId: string, readAt = nowIso()) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("support_messages")
      .update({ read_at: readAt })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "user")
      .is("read_at", null);

    if (!error) return;
    console.warn("Support inbox read update failed in Supabase, falling back to local data:", error);
  }

  const local = await readLocalData();
  let changed = false;
  local.messages = local.messages.map((message) => {
    if (message.conversation_id !== conversationId || message.sender_type !== "user" || message.read_at) {
      return message;
    }

    changed = true;
    return { ...message, read_at: readAt };
  });

  if (changed) {
    await writeLocalData(local);
  }
}

export async function listSupportThreads(limit = 80): Promise<SupportThread[]> {
  const fromSupabase = await tryListSupabaseThreads(limit);
  if (fromSupabase) return fromSupabase;
  const local = await readLocalData();
  return buildThreads(local).slice(0, limit);
}

export async function getSupportThread(id: string): Promise<SupportThread | null> {
  return (await listSupportThreads(200)).find((thread) => thread.id === id) ?? null;
}

export async function findOpenSupportThread(userId?: string | null, guestId?: string | null) {
  const threads = await listSupportThreads(200);
  return (
    threads.find((thread) =>
      thread.status !== "closed" &&
      ((userId && thread.user_id === userId) || (guestId && thread.guest_id === guestId))
    ) ?? null
  );
}

export async function createSupportConversation(input: CreateConversationInput): Promise<SupportThread> {
  const existing = await findOpenSupportThread(input.userId, input.guestId);
  if (existing) return existing;

  const timestamp = nowIso();
  const conversation = normalizeConversation({
    id: createId("support"),
    user_id: input.userId || null,
    guest_id: input.guestId || null,
    status: "waiting",
    source_page: input.sourcePage || "",
    user_name: input.userName || null,
    user_email: input.userEmail || null,
    user_agent: input.userAgent || null,
    device: input.device || null,
    browser: input.browser || null,
    is_online: true,
    created_at: timestamp,
    updated_at: timestamp,
    last_message_at: timestamp,
  });

  const contextMessages = (input.recentMessages ?? [])
    .slice(-8)
    .map((entry) =>
      normalizeMessage({
        id: createId("ctx"),
        conversation_id: conversation.id,
        sender_type: entry.role === "assistant" ? "ai" : "user",
        message: sanitizeText(entry.text, 2000),
        created_at:
          typeof entry.createdAt === "number"
            ? new Date(entry.createdAt).toISOString()
            : sanitizeText(entry.createdAt, 80) || timestamp,
        read_at: timestamp,
      }),
    )
    .filter((message) => message.message);

  const systemMessage = normalizeMessage({
    id: createId("sys"),
    conversation_id: conversation.id,
    sender_type: "system",
    message: "İnsan dəstəyi istəndi. AI cavabları dayandırıldı.",
    created_at: timestamp,
    read_at: timestamp,
  });

  const supabaseSaved = await tryUpsertSupabaseConversation(conversation);
  if (supabaseSaved) {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("support_messages").insert([...contextMessages, systemMessage]);
    }
  } else {
    const local = await readLocalData();
    local.conversations.unshift(conversation);
    local.messages.push(...contextMessages, systemMessage);
    await writeLocalData(local);
  }

  return {
    ...conversation,
    messages: [...contextMessages, systemMessage],
    attachments: [],
    latestMessage: systemMessage,
    unreadCount: contextMessages.filter((message) => message.sender_type === "user").length,
  };
}

export async function addSupportMessage(input: AddMessageInput): Promise<SupportThread | null> {
  const timestamp = nowIso();
  const message = normalizeMessage({
    id: createId("msg"),
    conversation_id: input.conversationId,
    sender_type: input.senderType,
    sender_id: input.senderId || null,
    message: input.message,
    attachment_url: input.attachmentUrl || null,
    attachment_type: input.attachmentType || null,
    created_at: timestamp,
  });
  const attachment = input.attachmentUrl
    ? normalizeAttachment({
        id: createId("att"),
        conversation_id: input.conversationId,
        message_id: message.id,
        file_url: input.attachmentUrl,
        file_name: input.attachmentName || "attachment",
        file_type: input.attachmentType || "image",
        file_size: input.attachmentSize || 0,
        created_at: timestamp,
      })
    : null;

  const supabaseSaved = await tryInsertSupabaseMessage(message, attachment);
  if (!supabaseSaved) {
    const local = await readLocalData();
    const conversationIndex = local.conversations.findIndex((conversation) => conversation.id === input.conversationId);
    if (conversationIndex === -1) return null;
    local.messages.push(message);
    if (attachment) local.attachments.push(attachment);
    const current = local.conversations[conversationIndex];
    local.conversations[conversationIndex] = {
      ...current,
      status: input.senderType === "admin" ? "active" : current.status === "closed" ? "waiting" : current.status,
      updated_at: timestamp,
      last_message_at: timestamp,
      closed_at: null,
    };
    await writeLocalData(local);
  }

  return getSupportThread(input.conversationId);
}

export async function patchSupportConversation(id: string, patch: Partial<SupportConversation>) {
  const timestamp = nowIso();
  const normalizedPatch = {
    ...patch,
    updated_at: timestamp,
    ...(patch.status === "closed" ? { closed_at: timestamp } : {}),
  };

  const supabaseSaved = await tryPatchSupabaseConversation(id, normalizedPatch);
  if (!supabaseSaved) {
    const local = await readLocalData();
    const conversationIndex = local.conversations.findIndex((conversation) => conversation.id === id);
    if (conversationIndex === -1) return null;
    local.conversations[conversationIndex] = {
      ...local.conversations[conversationIndex],
      ...normalizedPatch,
    };
    await writeLocalData(local);
  }

  if (normalizedPatch.status === "active" || normalizedPatch.status === "closed") {
    await markUserMessagesRead(id, timestamp);
  }

  return getSupportThread(id);
}

export function summarizeSupportThreads(threads: SupportThread[]) {
  return {
    total: threads.length,
    unread: threads.reduce((sum, thread) => sum + thread.unreadCount, 0),
    newCount: threads.filter((thread) => thread.status === "new").length,
    waitingCount: threads.filter((thread) => thread.status === "waiting").length,
    activeCount: threads.filter((thread) => thread.status === "active").length,
    closedCount: threads.filter((thread) => thread.status === "closed").length,
  };
}
