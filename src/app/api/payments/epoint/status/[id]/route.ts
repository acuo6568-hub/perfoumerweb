import { NextResponse } from "next/server";

import { encodeEpointData, getEpointConfig, signEpointData } from "@/lib/epoint";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isSafeOrderId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isSafeOrderId(id)) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  const { publicKey, privateKey, apiBaseUrl } = getEpointConfig();
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: "Epoint credentials are missing. Set EPOINT_PUBLIC_KEY and EPOINT_PRIVATE_KEY." },
      { status: 500 },
    );
  }

  const data = encodeEpointData({
    public_key: publicKey,
    order_id: id,
  });
  const signature = signEpointData(data, privateKey);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/get-status`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        accept: "application/json,text/plain,*/*",
      },
      body: new URLSearchParams({ data, signature }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json({ error: "Epoint status request timed out or failed." }, { status: 502 });
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
        error: `Epoint status API returned HTTP ${response.status}.`,
        providerStatus: response.status,
        providerPayload: payload,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      orderId: id,
      payment: payload,
    },
    { status: 200 },
  );
}
