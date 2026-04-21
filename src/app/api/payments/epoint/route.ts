import { NextResponse } from "next/server";

import {
  createEpointOrderId,
  encodeEpointData,
  getEpointConfig,
  normalizeEpointAmount,
  normalizeEpointLocale,
  signEpointData,
} from "@/lib/epoint";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";

type InitPaymentRequest = {
  locale?: Locale;
  perfumeSlug?: string;
  perfumeName?: string;
  amount?: number | string;
  returnPath?: string;
};

function cleanText(input: unknown, fallback: string, maxLength: number): string {
  if (typeof input !== "string") return fallback;
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
}

function resolveReturnPath(returnPath: unknown, fallback: string) {
  if (typeof returnPath === "string" && returnPath.startsWith("/") && !returnPath.startsWith("//")) {
    return returnPath;
  }

  return fallback;
}

function buildRedirectUrl(request: Request, path: string, orderId: string, redirectStatus: "success" | "failed") {
  const url = new URL(path, request.url);
  url.searchParams.set("epoint_order_id", orderId);
  url.searchParams.set("epoint_redirect", redirectStatus);
  return url.toString();
}

function escapeHtmlAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildFormHtml(actionUrl: string, data: string, signature: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to payment...</title>
  </head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
    <p>Redirecting to secure payment...</p>
    <form id="epoint-pay-form" method="POST" action="${escapeHtmlAttr(actionUrl)}" accept-charset="utf-8">
      <input type="hidden" name="data" value="${escapeHtmlAttr(data)}" />
      <input type="hidden" name="signature" value="${escapeHtmlAttr(signature)}" />
      <noscript><button type="submit">Continue to payment</button></noscript>
    </form>
    <script>document.getElementById('epoint-pay-form')?.submit();</script>
  </body>
</html>`;
}

async function createPaymentPayload(request: Request, body: InitPaymentRequest) {
  const { publicKey, privateKey, apiBaseUrl } = getEpointConfig();
  if (!publicKey || !privateKey) {
    return { error: "Epoint credentials are missing. Set EPOINT_PUBLIC_KEY and EPOINT_PRIVATE_KEY." } as const;
  }

  const locale = normalizeEpointLocale(body.locale);
  const perfumeSlug = cleanText(body.perfumeSlug, "checkout", 120);
  const perfumeName = cleanText(body.perfumeName, "Perfoumer order", 120);
  const amount = normalizeEpointAmount(body.amount);
  const orderId = createEpointOrderId(perfumeSlug.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 24) || "perf");
  const returnPath = resolveReturnPath(body.returnPath, "/payment/epoint/callback");

  const successRedirectUrl = buildRedirectUrl(request, returnPath, orderId, "success");
  const errorRedirectUrl = buildRedirectUrl(request, returnPath, orderId, "failed");

  const data = encodeEpointData({
    public_key: publicKey,
    amount,
    currency: "AZN",
    language: locale,
    order_id: orderId,
    description: perfumeName,
    success_redirect_url: successRedirectUrl,
    error_redirect_url: errorRedirectUrl,
  });

  const signature = signEpointData(data, privateKey);

  return {
    apiBaseUrl,
    actionUrl: `${apiBaseUrl}/checkout`,
    requestUrl: `${apiBaseUrl}/request`,
    data,
    signature,
    orderId,
    amount,
    successRedirectUrl,
    errorRedirectUrl,
  } as const;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as InitPaymentRequest;
  const payload = await createPaymentPayload(request, body);

  if ("error" in payload) {
    return NextResponse.json(payload, { status: 500 });
  }

  return NextResponse.json(payload);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payload = await createPaymentPayload(request, {
    locale: normalizeEpointLocale(searchParams.get("locale")),
    perfumeSlug: searchParams.get("perfumeSlug") || undefined,
    perfumeName: searchParams.get("perfumeName") || undefined,
    amount: searchParams.get("amount") || undefined,
    returnPath: searchParams.get("returnPath") || undefined,
  });

  if ("error" in payload) {
    const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Payment Error</title></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
    <h2>Payment initialization failed</h2>
    <p>${escapeHtmlAttr(payload.error)}</p>
    <p><a href="/">Back to site</a></p>
  </body>
</html>`;

    return new Response(html, {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }

  return new Response(buildFormHtml(payload.actionUrl, payload.data, payload.signature), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
