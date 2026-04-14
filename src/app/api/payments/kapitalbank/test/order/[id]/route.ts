import { NextResponse } from "next/server";

export const runtime = "nodejs";

type UpstreamAction = "exec-tran" | "set-src-token" | "set-dst-token";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const TEST_API_BASE_URL = "https://txpgtst.kapitalbank.az/api";
const TEST_USERNAME = "TerminalSys/kapital";
const TEST_PASSWORD = "kapital123";

function normalizeBaseUrl() {
  return (process.env.KAPITAL_BANK_API_BASE_URL || TEST_API_BASE_URL).trim().replace(/\/+$/, "");
}

function normalizeCredentials() {
  // This route is test-only; always use docs BasicAuth credentials.
  return {
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
  };
}

function safeOrderId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

function providerErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const source = payload as Record<string, unknown>;
    if (typeof source.errorDescription === "string" && source.errorDescription.trim()) {
      return source.errorDescription.trim();
    }
    if (typeof source.errorCode === "string" && source.errorCode.trim()) {
      return source.errorCode.trim();
    }
    if (typeof source.message === "string" && source.message.trim()) {
      return source.message.trim();
    }
  }

  return `Kapital Bank API returned HTTP ${status}.`;
}

function parseAction(value: string | null): UpstreamAction | null {
  if (value === "exec-tran" || value === "set-src-token" || value === "set-dst-token") {
    return value;
  }

  return null;
}

function buildActionPath(orderId: string, action: UpstreamAction, password: string | null) {
  const encodedOrderId = encodeURIComponent(orderId);

  if (action === "set-src-token" || action === "set-dst-token") {
    if (!password) {
      return null;
    }

    const query = new URLSearchParams({ password });
    return `/order/${encodedOrderId}/${action}?${query.toString()}`;
  }

  return `/order/${encodedOrderId}/${action}`;
}

async function parseJsonBody(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const orderId = safeOrderId(id);

  if (!orderId) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  const { username, password } = normalizeCredentials();
  const authToken = Buffer.from(`${username}:${password}`).toString("base64");
  const url = `${normalizeBaseUrl()}/order/${encodeURIComponent(orderId)}?tranDetailLevel=2&tokenDetailLevel=2&orderDetailLevel=2`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        authorization: `Basic ${authToken}`,
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Kapital Bank order details request timed out or failed." },
      { status: 502 },
    );
  }

  const raw = await response.text();
  let payload: unknown = raw;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: providerErrorMessage(payload, response.status),
        providerStatus: response.status,
        providerPayload: payload,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      orderId,
      detailLevel: {
        tranDetailLevel: 2,
        tokenDetailLevel: 2,
        orderDetailLevel: 2,
      },
      providerPayload: payload,
    },
    { status: 200 },
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const orderId = safeOrderId(id);

  if (!orderId) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  const url = new URL(request.url);
  const action = parseAction(url.searchParams.get("action"));
  if (!action) {
    return NextResponse.json(
      {
        error:
          "Invalid action. Use one of: exec-tran, set-src-token, set-dst-token (query param `action`).",
      },
      { status: 400 },
    );
  }

  const rawPassword = url.searchParams.get("password");
  const password = rawPassword?.trim() ? rawPassword.trim() : null;
  const actionPath = buildActionPath(orderId, action, password);

  if (!actionPath) {
    return NextResponse.json(
      {
        error:
          "`password` query param is required for set-src-token and set-dst-token operations.",
      },
      { status: 400 },
    );
  }

  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be valid JSON object." }, { status: 400 });
  }

  const { username, password: merchantPassword } = normalizeCredentials();
  const authToken = Buffer.from(`${username}:${merchantPassword}`).toString("base64");
  const upstreamUrl = `${normalizeBaseUrl()}${actionPath}`;

  let response: Response;
  try {
    response = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        authorization: `Basic ${authToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Kapital Bank request timed out or failed." },
      { status: 502 },
    );
  }

  const raw = await response.text();
  let payload: unknown = raw;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: providerErrorMessage(payload, response.status),
        providerStatus: response.status,
        providerPayload: payload,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      orderId,
      action,
      providerPayload: payload,
    },
    { status: 200 },
  );
}
