import { NextResponse } from "next/server";

import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";

type InitPaymentRequest = {
  locale?: Locale;
  perfumeSlug?: string;
  perfumeName?: string;
  amount?: number | string;
  returnPath?: string;
};

type JsonRecord = Record<string, unknown>;

const TEST_API_BASE_URL = "https://txpgtst.kapitalbank.az/api";
const TEST_USERNAME = "TerminalSys/kapital";
const TEST_PASSWORD = "kapital123";
const TEST_WORKING_HPP_HOST = "txpgtst.kapitalbank.az";

function normalizeLocale(locale: unknown): Locale {
  if (locale === "en" || locale === "ru") return locale;
  return "az";
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" ? (value as JsonRecord) : null;
}

function getString(source: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getScalar(source: JsonRecord, keys: string[]): string | number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return null;
}

function parseAmount(value: unknown): string {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) return "1";

  const rounded = Math.round(parsed * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function cleanText(input: unknown, fallback: string, maxLength: number): string {
  if (typeof input !== "string") return fallback;
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
}

function buildReturnUrl(request: Request, returnPath: unknown) {
  const forced = (process.env.KAPITAL_BANK_RETURN_URL || "").trim();
  if (forced) {
    return forced;
  }

  const hasSafeRelativePath =
    typeof returnPath === "string" && returnPath.startsWith("/") && !returnPath.startsWith("//");
  const path = hasSafeRelativePath ? returnPath : "/payment/kapital/callback";
  return new URL(path, request.url).toString();
}

function extractProviderError(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) return payload.trim();

  const root = asRecord(payload);
  if (!root) return null;

  const rootError = asRecord(root.error);
  const candidates = [
    root.error,
    root.message,
    root.description,
    root.status,
    rootError?.message,
    rootError?.description,
    rootError?.status,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildHostedPaymentUrl(order: JsonRecord): string | null {
  const actionUrl = buildPaymentFormAction(order);
  if (!actionUrl) return null;

  const url = new URL(actionUrl);
  const id = getScalar(order, ["id", "ID"]);
  const password = getString(order, ["password", "Password"]);

  if (id !== null) url.searchParams.set("id", String(id));
  if (password) url.searchParams.set("password", password);

  return url.toString();
}

function buildPaymentFormAction(order: JsonRecord): string | null {
  const hppUrl = getString(order, ["hppUrl", "url", "URL"]);
  if (!hppUrl) return null;

  let url: URL;
  try {
    url = new URL(hppUrl);
  } catch {
    return null;
  }

  if (!url.pathname.toLowerCase().includes("flex")) {
    const cleanPath = url.pathname.replace(/\/+$/, "");
    url.pathname = cleanPath ? `${cleanPath}/flex` : "/flex";
  }

  // In test environment, txpgtst.birbank.az can stall with a gray loader.
  // Prefer txpgtst.kapitalbank.az which is known to work for this merchant.
  if (url.hostname === "txpgtst.birbank.az") {
    url.hostname = TEST_WORKING_HPP_HOST;
  }

  const forcedHppHost = (process.env.KAPITAL_BANK_HPP_HOST || "").trim();
  if (forcedHppHost) {
    url.hostname = forcedHppHost;
  }

  // For form-post handoff, keep only clean action URL.
  url.search = "";
  return url.toString();
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type CreateOrderOutput = {
  redirectUrl: string;
  orderId: string | number | null;
  actionUrl: string | null;
  formFields: Record<string, string> | null;
  status: string | null;
};

async function createPaymentOrder(
  request: Request,
  body: InitPaymentRequest,
): Promise<CreateOrderOutput | { error: string; providerStatus?: number }> {
  const locale = normalizeLocale(body.locale);
  const perfumeSlug = cleanText(body.perfumeSlug, "test-product", 120);
  const perfumeName = cleanText(body.perfumeName, "Perfoumer Test Payment", 120);
  const amount = parseAmount(body.amount);
  const returnUrl = buildReturnUrl(request, body.returnPath);

  const baseUrl = (process.env.KAPITAL_BANK_API_BASE_URL || TEST_API_BASE_URL).trim().replace(/\/+$/, "");
  // This route is test-only; always use docs BasicAuth credentials.
  const username = TEST_USERNAME;
  const password = TEST_PASSWORD;

  const providerRequest = {
    order: {
      typeRid: "Order_SMS",
      amount,
      currency: "AZN",
      language: locale,
      title: perfumeName,
      description: `Perfoumer test payment for ${perfumeSlug}`.slice(0, 250),
      initiationEnvKind: "Browser",
      hppRedirectUrl: returnUrl,
    },
  };

  const authToken = Buffer.from(`${username}:${password}`).toString("base64");

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${baseUrl}/order`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify(providerRequest),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { error: "Kapital Bank test API reached timeout or network error." };
  }

  const raw = await upstreamResponse.text();
  let payload: unknown = raw;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = raw;
    }
  }

  if (!upstreamResponse.ok) {
    const upstreamError =
      extractProviderError(payload) || `Kapital Bank API returned HTTP ${upstreamResponse.status}.`;
    return {
      error: upstreamError,
      providerStatus: upstreamResponse.status,
    };
  }

  const payloadRecord = asRecord(payload);
  const order = payloadRecord ? asRecord(payloadRecord.order) : null;
  if (!order) {
    return { error: "Payment order was created, but provider response was missing order details." };
  }

  const redirectUrl = buildHostedPaymentUrl(order);
  if (!redirectUrl) {
    return { error: "Provider response did not include a usable payment URL." };
  }

  const orderId = getScalar(order, ["id", "ID"]);
  const orderPassword = getString(order, ["password", "Password"]);
  const actionUrl = buildPaymentFormAction(order);

  const formFields =
    actionUrl && orderId !== null && orderPassword
      ? {
          id: String(orderId),
          password: orderPassword,
          OrderID: String(orderId),
          Password: orderPassword,
        }
      : null;

  return {
    redirectUrl,
    orderId,
    actionUrl,
    formFields,
    status: getString(order, ["status", "Status"]),
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as InitPaymentRequest;
  const result = await createPaymentOrder(request, body);

  if ("error" in result) {
    return NextResponse.json(
      {
        error: result.error,
        providerStatus: result.providerStatus,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const body: InitPaymentRequest = {
    locale: normalizeLocale(searchParams.get("locale")),
    perfumeSlug: searchParams.get("perfumeSlug") || undefined,
    perfumeName: searchParams.get("perfumeName") || undefined,
    amount: searchParams.get("amount") || undefined,
    returnPath: searchParams.get("returnPath") || undefined,
  };

  const result = await createPaymentOrder(request, body);
  if ("error" in result) {
    const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Payment Error</title></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px;">
    <h2>Payment initialization failed</h2>
    <p>${result.error}</p>
    <p><a href="/">Back to site</a></p>
  </body>
</html>`;
    return new Response(html, {
      status: 502,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }

  // Kapital hosted payment is more stable when credentials are handed off via form POST.
  if (result.actionUrl && result.formFields) {
    const hiddenInputs = Object.entries(result.formFields)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escapeHtmlAttr(name)}" value="${escapeHtmlAttr(value)}" />`,
      )
      .join("\n");

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to payment...</title>
  </head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
    <p>Redirecting to secure payment...</p>
    <form id="kapital-pay-form" method="POST" action="${escapeHtmlAttr(result.actionUrl)}">
      ${hiddenInputs}
      <noscript><button type="submit">Continue to payment</button></noscript>
    </form>
    <script>document.getElementById('kapital-pay-form')?.submit();</script>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.redirect(result.redirectUrl, { status: 302 });
}
