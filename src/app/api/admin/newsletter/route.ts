import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { appendAdminAuditLog, getAdminAuditContext } from "@/lib/admin-audit";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";
import { absoluteUrl } from "@/lib/seo";
import { generateUnsubscribeToken } from "@/lib/newsletter-email";

export const runtime = "nodejs";

type NewsletterSubscriber = {
  email: string;
  locale: "az" | "en" | "ru";
  source: string;
  status: "subscribed" | "unsubscribed";
  createdAt: string;
  unsubscribedAt: string;
};

type SendRequest = {
  subject?: string;
  title?: string;
  body?: string;
  customHtml?: string;
  templateMode?: "preset" | "custom";
  deliveryMode?: "newsletter" | "direct";
  recipients?: "subscribed" | "all" | "selected";
  selectedEmails?: string[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function normalizeText(value: unknown, fallback = "", maxLength = 4000) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, maxLength);
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeLocale(value: unknown): "az" | "en" | "ru" {
  return value === "en" || value === "ru" ? value : "az";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || "",
    from:
      process.env.NEWSLETTER_EMAIL_FROM?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.ORDER_EMAIL_FROM?.trim() ||
      "",
  };
}

function buildPresetHtml(input: { title: string; body: string; unsubscribeUrl?: string; deliveryMode: "newsletter" | "direct" }) {
  const footer = input.unsubscribeUrl
    ? `
      <div style="border-top:1px solid #ebe8e2;margin-top:26px;padding-top:18px;">
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b7280;">Bu məktubu Perfoumer newsletter abunəliyinizə görə aldınız.</p>
        <a href="${escapeHtml(input.unsubscribeUrl)}" style="display:inline-block;padding:10px 16px;border:1px solid #d6d3ce;border-radius:999px;color:#111827;text-decoration:none;font-size:13px;">Unsubscribe</a>
      </div>
    `
    : "";

  return `
    <div style="font-family:Arial,sans-serif;background:#f4f4f2;padding:24px;">
      <div style="max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e8e5df;border-radius:18px;padding:30px;">
        <p style="margin:0 0 14px;font-size:12px;letter-spacing:0.16em;color:#6b7280;text-transform:uppercase;">Perfoumer ${input.deliveryMode === "newsletter" ? "Newsletter" : "Message"}</p>
        <h1 style="margin:0 0 14px;font-size:30px;line-height:1.14;color:#111827;">${escapeHtml(input.title)}</h1>
        <div style="font-size:16px;line-height:1.75;color:#374151;white-space:pre-line;">${escapeHtml(input.body)}</div>
        ${footer}
      </div>
    </div>
  `;
}

async function getNewsletterContacts() {
  const config = getSupabaseServiceConfigFromServer();
  if (!config) {
    throw new Error("Supabase credentials not configured");
  }

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: subscribers, error: subscribersError }, { data: usedTokens, error: tokensError }] = await Promise.all([
    supabase
      .from("newsletter_subscribers")
      .select("email, locale, source, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("newsletter_unsubscribe_tokens")
      .select("subscriber_email, used_at")
      .not("used_at", "is", null)
      .order("used_at", { ascending: false }),
  ]);

  if (subscribersError) {
    throw new Error("Failed to fetch newsletter subscribers");
  }

  if (tokensError) {
    throw new Error("Failed to fetch unsubscribed contacts");
  }

  const unsubscribedMap = new Map<string, string>();
  for (const token of usedTokens ?? []) {
    const email = normalizeEmail(token.subscriber_email);
    if (email && !unsubscribedMap.has(email)) {
      unsubscribedMap.set(email, typeof token.used_at === "string" ? token.used_at : "");
    }
  }

  const contactMap = new Map<string, NewsletterSubscriber>();
  for (const row of subscribers ?? []) {
    const email = normalizeEmail(row.email);
    if (!email) continue;

    const tokenUnsubscribedAt = unsubscribedMap.get(email) || "";
    const rowStatus = row.status === "unsubscribed" || tokenUnsubscribedAt ? "unsubscribed" : "subscribed";
    contactMap.set(email, {
      email,
      locale: normalizeLocale(row.locale),
      source: typeof row.source === "string" ? row.source : "",
      status: rowStatus,
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
      unsubscribedAt: tokenUnsubscribedAt,
    });
  }

  for (const [email, usedAt] of unsubscribedMap) {
    if (contactMap.has(email)) continue;
    contactMap.set(email, {
      email,
      locale: "az",
      source: "unsubscribe_history",
      status: "unsubscribed",
      createdAt: "",
      unsubscribedAt: usedAt,
    });
  }

  return Array.from(contactMap.values()).sort((left, right) => {
    const leftDate = left.createdAt || left.unsubscribedAt || "";
    const rightDate = right.createdAt || right.unsubscribedAt || "";
    return rightDate.localeCompare(leftDate);
  });
}

export async function GET() {
  const authError = await ensureAuthorized();
  if (authError) return authError;

  try {
    const subscribers = await getNewsletterContacts();
    return Response.json({
      subscribers,
      totals: {
        all: subscribers.length,
        subscribed: subscribers.filter((item) => item.status === "subscribed").length,
        unsubscribed: subscribers.filter((item) => item.status === "unsubscribed").length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch newsletter subscribers.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) return authError;

  const payload = (await request.json().catch(() => ({}))) as SendRequest;
  const subject = normalizeText(payload.subject, "", 180);
  const title = normalizeText(payload.title, "", 180);
  const body = normalizeText(payload.body, "", 5000);
  const customHtml = normalizeText(payload.customHtml, "", 60_000);
  const templateMode = payload.templateMode === "custom" ? "custom" : "preset";
  const deliveryMode = payload.deliveryMode === "direct" ? "direct" : "newsletter";
  const recipients = payload.recipients === "all" || payload.recipients === "selected" ? payload.recipients : "subscribed";
  const selectedEmails = Array.isArray(payload.selectedEmails)
    ? Array.from(new Set(payload.selectedEmails.map(normalizeEmail).filter((email) => EMAIL_PATTERN.test(email))))
    : [];

  if (!subject) {
    return Response.json({ error: "Subject is required." }, { status: 400 });
  }

  if (templateMode === "custom" && !customHtml) {
    return Response.json({ error: "Custom HTML is required." }, { status: 400 });
  }

  if (templateMode === "preset" && (!title || !body)) {
    return Response.json({ error: "Title and body are required." }, { status: 400 });
  }

  const { apiKey, from } = getResendConfig();
  if (!apiKey || !from) {
    return Response.json({ error: "Resend is not configured." }, { status: 503 });
  }

  try {
    const config = getSupabaseServiceConfigFromServer();
    if (!config) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const contacts = await getNewsletterContacts();
    const contactsByEmail = new Map(contacts.map((contact) => [contact.email, contact]));
    const targetContacts =
      recipients === "selected"
        ? selectedEmails.map((email) => contactsByEmail.get(email) || {
            email,
            locale: "az" as const,
            source: "admin_selection",
            status: "subscribed" as const,
            createdAt: "",
            unsubscribedAt: "",
          })
        : contacts.filter((item) => recipients === "all" || item.status === "subscribed");
    const activeTargets = targetContacts.filter((item) =>
      recipients === "selected"
        ? EMAIL_PATTERN.test(item.email)
        : item.status === "subscribed" && EMAIL_PATTERN.test(item.email),
    );

    if (!activeTargets.length) {
      return Response.json({ error: "No subscribed recipients to send to." }, { status: 400 });
    }

    const results: Array<{ email: string; ok: boolean; error?: string }> = [];

    for (const contact of activeTargets) {
      let unsubscribeUrl = "";
      if (deliveryMode === "newsletter") {
        const { token, tokenHash } = generateUnsubscribeToken();
        const { error: tokenError } = await supabase.from("newsletter_unsubscribe_tokens").insert({
          token_hash: tokenHash,
          subscriber_email: contact.email,
        });

        if (tokenError) {
          results.push({ email: contact.email, ok: false, error: "token_create_failed" });
          continue;
        }

        unsubscribeUrl = absoluteUrl(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);
      }

      const html =
        templateMode === "custom"
          ? customHtml.replace(/\{\{\s*unsubscribeUrl\s*\}\}/gi, escapeHtml(unsubscribeUrl))
          : buildPresetHtml({ title, body, unsubscribeUrl, deliveryMode });
      const text = stripHtml(html);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: contact.email,
          subject,
          html,
          text,
          headers: unsubscribeUrl ? { "List-Unsubscribe": `<${unsubscribeUrl}>` } : undefined,
        }),
      });

      results.push({
        email: contact.email,
        ok: response.ok,
        error: response.ok ? undefined : "email_send_failed",
      });
    }

    const sent = results.filter((item) => item.ok).length;
    const failed = results.filter((item) => !item.ok).length;
    const auditContext = await getAdminAuditContext(request);
    await appendAdminAuditLog({
      action: "admin_newsletter_send",
      section: "newsletter",
      targetType: "campaign",
      targetId: subject,
      targetLabel: subject,
      summary: `Sent newsletter "${subject}" to ${sent} subscriber${sent === 1 ? "" : "s"} (${failed} failed).`,
      changes: [
        { path: "subject", before: "(empty)", after: subject },
        { path: "templateMode", before: "(empty)", after: templateMode },
        { path: "deliveryMode", before: "(empty)", after: deliveryMode },
      ],
      metadata: {
        sent,
        failed,
        skippedUnsubscribed: targetContacts.length - activeTargets.length,
      },
      ...auditContext,
    });

    return Response.json({
      ok: results.some((item) => item.ok),
      sent,
      failed,
      skippedUnsubscribed: targetContacts.length - activeTargets.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send newsletter.";
    return Response.json({ error: message }, { status: 400 });
  }
}
