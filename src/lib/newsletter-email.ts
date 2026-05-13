import { createHash, randomBytes } from "node:crypto";

import { applySiteBranding, normalizeSiteSettings, type SiteSettings } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";

type SupportedLocale = "az" | "en" | "ru";

type NewsletterEmailInput = {
  to: string;
  locale: SupportedLocale;
  unsubscribeUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCopy(locale: SupportedLocale, settings?: SiteSettings) {
  const copy = {
    az: {
      subject: "Perfoumer abunəliyi təsdiqləndi",
      title: "Perfoumer ailəsinə xoş gəldiniz",
      body:
        "Abunəliyiniz aktivdir. Sizə yalnız seçilmiş təkliflər, yeni ətirlər və vacib yeniliklər göndərəcəyik.",
      unsubscribeLabel: "Bu siz deyilsinizsə, bir kliklə abunəliyi ləğv edin",
      footer: "Perfoumer.az",
    },
    en: {
      subject: "Perfoumer subscription confirmed",
      title: "Welcome to Perfoumer",
      body:
        "Your subscription is active. We will only send selected offers, new scents, and important updates.",
      unsubscribeLabel: "If this was not you, unsubscribe instantly",
      footer: "Perfoumer.az",
    },
    ru: {
      subject: "Подписка Perfoumer подтверждена",
      title: "Добро пожаловать в Perfoumer",
      body:
        "Подписка активирована. Мы отправляем только избранные предложения, новинки ароматов и важные обновления.",
      unsubscribeLabel: "Если это не вы, отмените подписку одним нажатием",
      footer: "Perfoumer.az",
    },
  } as const;

  return applySiteBranding(copy[locale], normalizeSiteSettings(settings));
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const from =
    process.env.NEWSLETTER_EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.ORDER_EMAIL_FROM?.trim() ||
    "";

  return { apiKey, from };
}

export function generateUnsubscribeToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  return { token, tokenHash };
}

export function hashUnsubscribeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendNewsletterWelcomeEmail(input: NewsletterEmailInput) {
  const { apiKey, from } = getResendConfig();
  if (!apiKey || !from) {
    throw new Error("email_service_unavailable");
  }

  const siteSettings = await getSiteSettings();
  const copy = getCopy(input.locale, siteSettings);

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f4f4f2;padding:24px;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e8e5df;border-radius:16px;padding:28px;">
        <p style="margin:0 0 14px;font-size:12px;letter-spacing:0.14em;color:#6b7280;text-transform:uppercase;">${escapeHtml(copy.footer)}</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.14;color:#111827;">${escapeHtml(copy.title)}</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#374151;">${escapeHtml(copy.body)}</p>

        <div style="border-top:1px solid #ebe8e2;padding-top:18px;">
          <p style="margin:0 0 10px;font-size:14px;color:#4b5563;">${escapeHtml(copy.unsubscribeLabel)}</p>
          <a href="${escapeHtml(input.unsubscribeUrl)}" style="display:inline-block;padding:10px 16px;border:1px solid #d6d3ce;border-radius:999px;color:#111827;text-decoration:none;font-size:14px;">Unsubscribe</a>
        </div>
      </div>
    </div>
  `;

  const text = `${copy.title}\n\n${copy.body}\n\n${copy.unsubscribeLabel}: ${input.unsubscribeUrl}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: copy.subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error("email_send_failed");
  }
}
