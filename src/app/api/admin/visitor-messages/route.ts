import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionIdentity,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

type MessagePayload = {
  sessionId?: string;
  anonymousId?: string;
  locale?: string;
  path?: string;
  title?: string;
  body?: string;
  ttlMinutes?: number;
};

function sanitizeText(value: unknown, fallback = "", maxLength = 500) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, maxLength);
}

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return { error: NextResponse.json({ error: "Admin login is not configured." }, { status: 500 }) };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!validateAdminSessionToken(token)) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return { identity: getAdminSessionIdentity(token) };
}

export async function POST(request: Request) {
  const auth = await ensureAuthorized();
  if (auth.error) {
    return auth.error;
  }

  let body: MessagePayload;
  try {
    body = (await request.json()) as MessagePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const sessionId = sanitizeText(body.sessionId, "", 96);
  const anonymousId = sanitizeText(body.anonymousId, "", 96);
  const targetLocale = sanitizeText(body.locale, "all", 10).toLowerCase();
  const title = sanitizeText(body.title, "", 90);
  const messageBody = sanitizeText(body.body, "", 700);
  const ttlMinutes = Number.isFinite(body.ttlMinutes)
    ? Math.min(120, Math.max(2, Math.trunc(Number(body.ttlMinutes))))
    : 20;

  if (!sessionId && !anonymousId) {
    return NextResponse.json({ error: "A target session or visitor id is required." }, { status: 400 });
  }
  if (!title || !messageBody) {
    return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase service role config missing." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("website_visitor_messages")
    .insert([
      {
        target_session_id: sessionId,
        target_anonymous_id: anonymousId,
        target_locale: targetLocale || "all",
        target_path: sanitizeText(body.path, "", 180),
        title,
        body: messageBody,
        created_by: auth.identity?.username || "admin",
        expires_at: expiresAt,
      },
    ])
    .select("id,expires_at")
    .single();

  if (error) {
    console.error("Admin visitor message insert error:", error);
    return NextResponse.json({ error: "Popup message could not be sent." }, { status: 500 });
  }

  return NextResponse.json({ message: data }, { status: 201 });
}
