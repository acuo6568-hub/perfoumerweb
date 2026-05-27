import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";

type AuthUserRow = {
  id: string;
  email: string | null;
  user_metadata?: {
    username?: string;
  } | null;
};

type ChatSessionRow = {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  locale: string | null;
  title: string | null;
  preview: string | null;
  messages_json: unknown;
  page_path: string | null;
  current_perfume_slug: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  user_agent: string | null;
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_message_at: string | null;
  expires_at: string | null;
};

type ChatMessageRow = {
  role: "user" | "assistant";
  text: string;
  followUp?: unknown;
  actionSuggestions?: unknown;
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

async function listAllUsers(supabase: ReturnType<typeof createClient>) {
  const perPage = 1000;
  let page = 1;
  let users: AuthUserRow[] = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error("Failed to fetch auth users");
    }

    users = users.concat(
      (data.users as Array<{
        id: string;
        email: string | null;
        user_metadata?: { username?: string } | null;
      }>).map((user) => ({
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata ?? null,
      })),
    );

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function sanitizeMessages(value: unknown): ChatMessageRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Record<string, unknown>;
      const role = raw.role === "assistant" ? "assistant" : raw.role === "user" ? "user" : null;
      const text = typeof raw.text === "string" ? raw.text.trim() : "";
      if (!role || !text) return null;

      return {
        role,
        text,
        followUp: raw.followUp,
        actionSuggestions: raw.actionSuggestions,
      } satisfies ChatMessageRow;
    })
    .filter((entry): entry is ChatMessageRow => entry !== null);
}

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit") || 60);
    const limit = Number.isFinite(limitParam) ? Math.min(200, Math.max(10, Math.trunc(limitParam))) : 60;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const users = await listAllUsers(supabase);
    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );

    const { data: sessions } = await supabase
      .from("ai_chat_sessions")
      .select(
        "id,user_id,anonymous_id,locale,title,preview,messages_json,page_path,current_perfume_slug,device_type,browser,os,user_agent,country_code,country,region,city,timezone,created_at,updated_at,last_message_at,expires_at",
      )
      .order("last_message_at", { ascending: false })
      .limit(limit);

    const rows = ((sessions ?? []) as ChatSessionRow[]).map((row) => {
      const user = row.user_id ? userMap.get(row.user_id) : null;
      const messages = sanitizeMessages(row.messages_json);
      return {
        id: row.id,
        userId: row.user_id,
        anonymousId: row.anonymous_id ?? row.id,
        isSignedIn: Boolean(row.user_id),
        isGuest: !row.user_id,
        email: user?.email ?? "",
        username: user?.user_metadata?.username ?? "",
        locale: row.locale ?? "",
        title: row.title ?? "",
        preview: row.preview ?? "",
        pagePath: row.page_path ?? "",
        currentPerfumeSlug: row.current_perfume_slug ?? "",
        deviceType: row.device_type ?? "",
        browser: row.browser ?? "",
        os: row.os ?? "",
        userAgent: row.user_agent ?? "",
        countryCode: row.country_code ?? "",
        country: row.country ?? "",
        region: row.region ?? "",
        city: row.city ?? "",
        timezone: row.timezone ?? "",
        createdAt: row.created_at ?? "",
        updatedAt: row.updated_at ?? "",
        lastMessageAt: row.last_message_at ?? "",
        expiresAt: row.expires_at ?? "",
        messageCount: messages.length,
        messages,
      };
    });

    const guestSessions = rows.filter((row) => row.isGuest).length;
    const signedInSessions = rows.filter((row) => row.isSignedIn).length;
    const uniqueCountries = new Map<string, number>();

    rows.forEach((row) => {
      const country = row.country || row.countryCode || "Unknown";
      uniqueCountries.set(country, (uniqueCountries.get(country) || 0) + 1);
    });

    const topCountries = Array.from(uniqueCountries.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([country, count]) => ({ country, count }));

    return Response.json({
      generatedAt: new Date().toISOString(),
      totalSessions: rows.length,
      guestSessions,
      signedInSessions,
      topCountries,
      sessions: rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch AI chat sessions.";
    console.error("Admin AI chat sessions API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}