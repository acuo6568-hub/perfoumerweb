import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { generateUnsubscribeToken, sendNewsletterWelcomeEmail } from "@/lib/newsletter-email";
import { absoluteUrl } from "@/lib/seo";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

export const runtime = "nodejs";

type SubscribeRequest = {
  email?: string;
  locale?: "az" | "en" | "ru";
  source?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function normalizeLocale(value: unknown) {
  return value === "en" || value === "ru" ? value : "az";
}

function normalizeSource(value: unknown) {
  if (typeof value !== "string") {
    return "footer_style";
  }

  const normalized = value.trim().slice(0, 80);
  return normalized || "footer_style";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as SubscribeRequest;
  const email = normalizeEmail(payload.email);
  const locale = normalizeLocale(payload.locale);
  const source = normalizeSource(payload.source);

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const config = getSupabaseServiceConfigFromServer();
  if (!config) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("newsletter_subscribers").upsert(
    {
      email,
      locale,
      source,
      status: "subscribed",
    },
    { onConflict: "email" },
  );

  if (error) {
    return NextResponse.json({ error: "subscription_failed" }, { status: 500 });
  }

  const { token, tokenHash } = generateUnsubscribeToken();

  const { error: tokenError } = await supabase.from("newsletter_unsubscribe_tokens").insert({
    token_hash: tokenHash,
    subscriber_email: email,
  });

  if (tokenError) {
    return NextResponse.json({ error: "token_create_failed" }, { status: 500 });
  }

  const unsubscribeUrl = absoluteUrl(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);

  try {
    await sendNewsletterWelcomeEmail({
      to: email,
      locale,
      unsubscribeUrl,
    });
  } catch {
    return NextResponse.json({ error: "email_send_failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
