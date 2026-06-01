import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VisitorMessageRow = {
  id: string;
  target_locale: string | null;
  target_path: string | null;
  title: string | null;
  body: string | null;
  created_at: string | null;
  expires_at: string | null;
};

function sanitizeText(value: unknown, fallback = "", maxLength = 200) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, maxLength);
}

function localeMatches(targetLocale: string, locale: string) {
  const target = targetLocale.toLowerCase();
  const current = locale.toLowerCase();
  return target === "all" || target === current || current.startsWith(`${target}-`);
}

function pathMatches(targetPath: string, currentPath: string) {
  if (!targetPath) return true;
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}?`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = sanitizeText(url.searchParams.get("sessionId"), "", 96);
  const anonymousId = sanitizeText(url.searchParams.get("anonymousId"), "", 96);
  const locale = sanitizeText(url.searchParams.get("locale"), "az", 10);
  const currentPath = sanitizeText(url.searchParams.get("path"), "/", 220);

  if (!sessionId && !anonymousId) {
    return NextResponse.json({ messages: [] }, { status: 200 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ messages: [] }, { status: 200 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const filters = [];
  if (sessionId) filters.push(`target_session_id.eq.${sessionId}`);
  if (anonymousId) filters.push(`target_anonymous_id.eq.${anonymousId}`);

  const { data, error } = await supabase
    .from("website_visitor_messages")
    .select("id,target_locale,target_path,title,body,created_at,expires_at")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Visitor message fetch error:", error);
    return NextResponse.json({ messages: [] }, { status: 200 });
  }

  const messages = ((data ?? []) as VisitorMessageRow[])
    .filter((message) => localeMatches(String(message.target_locale || "all"), locale))
    .filter((message) => pathMatches(String(message.target_path || ""), currentPath))
    .map((message) => ({
      id: message.id,
      title: String(message.title || ""),
      body: String(message.body || ""),
      createdAt: String(message.created_at || ""),
      expiresAt: String(message.expires_at || ""),
    }));

  return NextResponse.json({ messages }, { status: 200 });
}
