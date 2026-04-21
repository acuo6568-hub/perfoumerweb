import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  decodeEpointData,
  getEpointConfig,
  resolveEpointPaymentResult,
  verifyEpointSignature,
  type EpointCallbackPayload,
} from "@/lib/epoint";

export const runtime = "nodejs";

async function parseCallbackBody(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      data: typeof payload.data === "string" ? payload.data : "",
      signature: typeof payload.signature === "string" ? payload.signature : "",
    };
  }

  const formData = await request.formData().catch(() => null);
  if (formData) {
    return {
      data: String(formData.get("data") || ""),
      signature: String(formData.get("signature") || ""),
    };
  }

  const raw = await request.text().catch(() => "");
  const params = new URLSearchParams(raw);
  return {
    data: params.get("data") || "",
    signature: params.get("signature") || "",
  };
}

async function syncKnownOrder(result: EpointCallbackPayload) {
  const orderId = typeof result.order_id === "string" ? result.order_id.trim() : "";
  if (!orderId) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) return;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const paymentStatus = resolveEpointPaymentResult(result.status);

  const updateData: Record<string, unknown> = {
    payment_method: "epoint",
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };

  if (paymentStatus === "completed") {
    updateData.status = "confirmed";
  } else if (paymentStatus === "failed") {
    updateData.status = "cancelled";
  }

  if (typeof result.transaction === "string" && result.transaction.trim()) {
    updateData.kapital_payment_id = result.transaction.trim();
  }

  await supabase.from("orders").update(updateData).eq("kapital_order_id", orderId);
}

export async function POST(request: Request) {
  const { privateKey } = getEpointConfig();
  if (!privateKey) {
    return NextResponse.json({ error: "Epoint private key missing." }, { status: 500 });
  }

  const { data, signature } = await parseCallbackBody(request);
  if (!data || !signature) {
    return NextResponse.json({ error: "Missing callback payload." }, { status: 400 });
  }

  if (!verifyEpointSignature(data, signature, privateKey)) {
    return NextResponse.json({ error: "Invalid Epoint callback signature." }, { status: 401 });
  }

  let result: EpointCallbackPayload;
  try {
    result = decodeEpointData<EpointCallbackPayload>(data);
  } catch {
    return NextResponse.json({ error: "Invalid Epoint callback data." }, { status: 400 });
  }

  await syncKnownOrder(result);

  return NextResponse.json({ ok: true, result });
}
