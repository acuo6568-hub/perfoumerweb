import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

type SignupFallbackRequest = {
  email?: string;
  password?: string;
  redirectTo?: string;
  data?: Record<string, unknown>;
};

export const runtime = "nodejs";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getFallbackFromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "welcome@perfoumer.az";
}

function getSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) {
    return url.replace(/\/$/, "");
  }
  return "https://perfoumer.az";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  let body: SignupFallbackRequest;
  try {
    body = (await request.json()) as SignupFallbackRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const redirectTo = typeof body.redirectTo === "string" && body.redirectTo.trim() ? body.redirectTo.trim() : `${getSiteUrl()}/login`;
  const metadata = typeof body.data === "object" && body.data !== null ? body.data : undefined;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = getFallbackFromEmail();
  if (!apiKey || !from) {
    return NextResponse.json({ error: "Resend is not configured." }, { status: 503 });
  }

  const config = getSupabaseServiceConfigFromServer();
  if (!config) {
    return NextResponse.json({ error: "Supabase service config is not configured." }, { status: 500 });
  }

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const generateLinkResponse = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: metadata,
      redirectTo,
    },
  });

  if (generateLinkResponse.error) {
    return NextResponse.json({ error: generateLinkResponse.error.message || "Failed to generate signup link." }, { status: 400 });
  }

  const actionLink = generateLinkResponse.data?.properties?.action_link;
  const emailOtp = generateLinkResponse.data?.properties?.email_otp;
  if (!actionLink || !emailOtp) {
    return NextResponse.json({ error: "Failed to generate signup verification details." }, { status: 500 });
  }

  const subject = "Confirm your Perfoumer account";
  const text = `Welcome to Perfoumer! Your verification code is ${emailOtp}.\n\n` +
    `Open this link to complete signup: ${actionLink}`;
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f4f4f2;padding:24px;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e8e5df;border-radius:16px;padding:28px;">
        <p style="margin:0 0 16px;font-size:12px;letter-spacing:0.14em;color:#6b7280;text-transform:uppercase;">Perfoumer</p>
        <h1 style="margin:0 0 20px;font-size:28px;line-height:1.14;color:#111827;">Confirm your account</h1>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#374151;">Thanks for signing up. Use the code below to verify your email and finish creating your account.</p>
        <p style="margin:0 0 8px;font-size:22px;letter-spacing:0.12em;color:#111827;font-weight:700;">${escapeHtml(emailOtp)}</p>
        <p style="margin:24px 0 20px;font-size:16px;line-height:1.7;color:#374151;">If clicking is easier, open the link below to complete signup:</p>
        <a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-size:15px;">Confirm my account</a>
        <p style="margin:26px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">If you did not request this email, you can ignore it.</p>
      </div>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to send signup email." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
