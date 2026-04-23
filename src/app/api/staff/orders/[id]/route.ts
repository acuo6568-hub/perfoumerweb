import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  getAdminSessionIdentity,
  getStaffSessionIdentity,
  isAdminConfigured,
  isStaffConfigured,
} from "@/lib/admin-auth";
import { CASH_PICKUP_PAYMENT_METHOD } from "@/lib/checkout-settings";
import { encodeEpointData, getEpointConfig, signEpointData } from "@/lib/epoint";
import { sendOrderUpdateEmail } from "@/lib/order-notifications";
import { getSupabaseServiceConfigFromServerResult } from "@/lib/supabase/env.server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type OrderAction = "status_change" | "price_change" | "address_change" | "refund" | "cancel";
type RefundKind = "full" | "partial";

type UpdatePayload = {
  action?: OrderAction;
  reason?: string;
  status?: string;
  total_amount?: number;
  delivery_address_json?: Record<string, unknown>;
  details?: string;
  refund_kind?: RefundKind;
  refund_amount?: number;
};

const TEST_API_BASE_URL = "https://txpgtst.kapitalbank.az/api";
const DEFAULT_KAPITAL_USERNAME = "TerminalSys/kapital";
const DEFAULT_KAPITAL_PASSWORD = "kapital123";

function shouldUseDocsTestCredentials(baseUrl: string) {
  return /txpgtst\./i.test(baseUrl);
}

function normalizeKapitalBaseUrl() {
  return (process.env.KAPITAL_BANK_API_BASE_URL || TEST_API_BASE_URL).trim().replace(/\/+$/, "");
}

function normalizeKapitalCredentials() {
  const baseUrl = normalizeKapitalBaseUrl();

  if (shouldUseDocsTestCredentials(baseUrl)) {
    return {
      username: DEFAULT_KAPITAL_USERNAME,
      password: DEFAULT_KAPITAL_PASSWORD,
    };
  }

  return {
    username: (process.env.KAPITAL_BANK_USERNAME || DEFAULT_KAPITAL_USERNAME).trim(),
    password: (process.env.KAPITAL_BANK_PASSWORD || DEFAULT_KAPITAL_PASSWORD).trim(),
  };
}

function safeKapitalOrderId(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed : null;
}

function getProviderErrorMessage(payload: unknown, status: number) {
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

async function executeKapitalRefund(params: {
  kapitalOrderId: string;
  refundKind: RefundKind;
  amount?: number;
}) {
  const { username, password } = normalizeKapitalCredentials();
  const authToken = Buffer.from(`${username}:${password}`).toString("base64");
  const url = `${normalizeKapitalBaseUrl()}/order/${encodeURIComponent(params.kapitalOrderId)}/exec-tran`;

  const body =
    params.refundKind === "partial"
      ? {
          tran: {
            phase: "Single",
            amount: Number(params.amount || 0).toFixed(2),
            voidKind: "Partial",
          },
        }
      : {
          tran: {
            phase: "Single",
            voidKind: "Full",
          },
        };

  let response: Response;
  try {
    response = await fetch(url, {
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
    return { error: "Kapital Bank refund request timed out or failed." } as const;
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
    return {
      error: getProviderErrorMessage(payload, response.status),
      providerStatus: response.status,
      providerPayload: payload,
    } as const;
  }

  return { ok: true as const, providerPayload: payload };
}

async function executeEpointRefund(params: {
  transaction: string;
  refundKind: RefundKind;
  amount?: number;
}) {
  const { publicKey, privateKey, apiBaseUrl } = getEpointConfig();
  if (!publicKey || !privateKey) {
    return { error: "Epoint credentials are missing. Set EPOINT_PUBLIC_KEY and EPOINT_PRIVATE_KEY." } as const;
  }

  const payload: Record<string, string> = {
    public_key: publicKey,
    language: "az",
    transaction: params.transaction,
    currency: "AZN",
  };

  if (params.refundKind === "partial") {
    payload.amount = Number(params.amount || 0).toFixed(2);
  }

  const data = encodeEpointData(payload);
  const signature = signEpointData(data, privateKey);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/reverse`, {
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
    return { error: "Epoint refund request timed out or failed." } as const;
  }

  const raw = await response.text();
  let providerPayload: unknown = raw;
  if (raw) {
    try {
      providerPayload = JSON.parse(raw) as unknown;
    } catch {
      providerPayload = raw;
    }
  }

  if (!response.ok) {
    return {
      error: `Epoint reverse API returned HTTP ${response.status}.`,
      providerStatus: response.status,
      providerPayload,
    } as const;
  }

  return { ok: true as const, providerPayload };
}

function mapStatusForLegacyConstraint(status: string) {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case "new":
    case "confirmed":
      return "pending";
    case "preparing":
    case "ready_for_pickup":
      return "processing";
    case "ready_for_dispatch":
    case "out_for_delivery":
      return "shipped";
    case "handed_over":
      return "completed";
    case "delivered":
    case "completed":
    case "cancelled":
    case "refunded":
    case "pending":
    case "processing":
    case "shipped":
      return normalized;
    default:
      return normalized;
  }
}

async function ensureAuthorized() {
  if (!isStaffConfigured() && !isAdminConfigured()) {
    return {
      error: Response.json({ error: "Staff panel is not configured." }, { status: 500 }),
      actor: null,
    } as const;
  }

  const cookieStore = await cookies();
  const staffToken = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  const staffIdentity = getStaffSessionIdentity(staffToken);
  if (staffIdentity) {
    return { error: null, actor: { role: "staff", username: staffIdentity.username } } as const;
  }

  const adminIdentity = getAdminSessionIdentity(adminToken);
  if (adminIdentity) {
    return { error: null, actor: { role: "admin", username: adminIdentity.username } } as const;
  }

  return {
    error: Response.json({ error: "Unauthorized." }, { status: 401 }),
    actor: null,
  } as const;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCashPaymentMethod(value: unknown) {
  const paymentMethod = String(value || "").trim().toLowerCase();
  return (
    paymentMethod === CASH_PICKUP_PAYMENT_METHOD ||
    paymentMethod.includes("cod") ||
    paymentMethod.includes("cash") ||
    paymentMethod.includes("nagd") ||
    paymentMethod.includes("nağd")
  );
}

type AuthLookupClient = {
  auth: {
    admin: {
      getUserById: (userId: string) => Promise<{
        data?: { user?: { email?: string | null } | null } | null;
      }>;
    };
  };
};

async function getCustomerEmail(supabase: AuthLookupClient, userId: string) {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    const email = data?.user?.email || "";
    return typeof email === "string" ? email : "";
  } catch {
    return "";
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await ensureAuthorized();
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const orderId = id?.trim();

  if (!orderId) {
    return Response.json({ error: "Order id is required." }, { status: 400 });
  }

  const { config: supabaseConfig, missingKeys } = getSupabaseServiceConfigFromServerResult();
  if (!supabaseConfig) {
    return Response.json(
      { error: `Supabase credentials missing: ${missingKeys.join(", ")}` },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return Response.json({ error: orderError.message }, { status: 400 });
  }

  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: logs, error: logsError } = await supabase
    .from("order_logs")
    .select("id,order_id,actor_role,actor_username,action,reason,details,old_value,new_value,created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (logsError && logsError.code !== "42P01") {
    return Response.json({ error: logsError.message }, { status: 400 });
  }

  return Response.json({
    order,
    logs: logsError?.code === "42P01" ? [] : logs || [],
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await ensureAuthorized();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  const { id } = await context.params;
  const orderId = id?.trim();

  if (!orderId) {
    return Response.json({ error: "Order id is required." }, { status: 400 });
  }

  const { config: supabaseConfig, missingKeys } = getSupabaseServiceConfigFromServerResult();
  if (!supabaseConfig) {
    return Response.json(
      { error: `Supabase credentials missing: ${missingKeys.join(", ")}` },
      { status: 500 },
    );
  }

  let payload: UpdatePayload;

  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const action = payload.action;
  if (!action) {
    return Response.json({ error: "Action is required." }, { status: 400 });
  }

  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  const { data: existingOrder, error: existingError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 400 });
  }

  if (!existingOrder) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (action === "status_change") {
    const status = typeof payload.status === "string" ? payload.status.trim().toLowerCase() : "";
    if (!status) {
      return Response.json({ error: "Status is required." }, { status: 400 });
    }

    updateData.status = status;
    if (
      isCashPaymentMethod((existingOrder as Record<string, unknown>).payment_method) &&
      (status === "handed_over" || status === "delivered" || status === "completed")
    ) {
      updateData.payment_status = "completed";
    }
    if (status === "completed" || status === "delivered") {
      updateData.completed_at = new Date().toISOString();
    }
  }

  if (action === "price_change") {
    const total = Number(payload.total_amount);
    if (!Number.isFinite(total) || total < 0) {
      return Response.json({ error: "Valid total_amount is required." }, { status: 400 });
    }

    updateData.total_amount = total;
  }

  if (action === "address_change") {
    if (!isObject(payload.delivery_address_json)) {
      return Response.json({ error: "Valid delivery_address_json is required." }, { status: 400 });
    }

    updateData.delivery_address_json = payload.delivery_address_json;
  }

  if (action === "cancel") {
    updateData.status = "cancelled";
    if (isCashPaymentMethod((existingOrder as Record<string, unknown>).payment_method)) {
      updateData.payment_status = "failed";
    }
  }

  if (action === "refund") {
    const refundKind = payload.refund_kind === "partial" ? "partial" : "full";
    const refundAmount = Number(payload.refund_amount);
    const kapitalOrderId = safeKapitalOrderId((existingOrder as Record<string, unknown>).kapital_order_id as string | undefined);
    const paymentTransactionId = safeKapitalOrderId((existingOrder as Record<string, unknown>).kapital_payment_id as string | undefined);
    const paymentMethod = String((existingOrder as Record<string, unknown>).payment_method || "").trim().toLowerCase();

    if (paymentMethod.includes("kapital_bank") && !kapitalOrderId) {
      return Response.json({ error: "Kapital order id is required for refunds." }, { status: 400 });
    }

    if (paymentMethod.includes("epoint")) {
      if (!paymentTransactionId) {
        return Response.json({ error: "Epoint transaction id is required for refunds." }, { status: 400 });
      }

      const refundResult = await executeEpointRefund({
        transaction: paymentTransactionId,
        refundKind,
        amount: refundKind === "partial" ? refundAmount : Number(existingOrder.total_amount || 0),
      });

      if ("error" in refundResult) {
        return Response.json(
          {
            error: refundResult.error,
            providerStatus: refundResult.providerStatus,
            providerPayload: refundResult.providerPayload,
          },
          { status: 502 },
        );
      }
    } else if (kapitalOrderId) {
      const refundResult = await executeKapitalRefund({
        kapitalOrderId,
        refundKind,
        amount: refundKind === "partial" ? refundAmount : Number(existingOrder.total_amount || 0),
      });

      if ("error" in refundResult) {
        return Response.json(
          {
            error: refundResult.error,
            providerStatus: refundResult.providerStatus,
            providerPayload: refundResult.providerPayload,
          },
          { status: 502 },
        );
      }
    }

    if (refundKind === "partial") {
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        return Response.json({ error: "Valid refund_amount is required for partial refunds." }, { status: 400 });
      }

      updateData.payment_status = "partially_refunded";
    } else {
      updateData.status = "refunded";
      updateData.payment_status = "refunded";
    }
  }

  let { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
    .select("*")
    .single();

  if (
    updateError?.code === "23514" &&
    action === "status_change" &&
    typeof updateData.status === "string"
  ) {
    const legacySafeStatus = mapStatusForLegacyConstraint(updateData.status);
    const legacyUpdate = { ...updateData, status: legacySafeStatus };

    const retry = await supabase
      .from("orders")
      .update(legacyUpdate)
      .eq("id", orderId)
      .select("*")
      .single();

    updatedOrder = retry.data;
    updateError = retry.error;
  }

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 400 });
  }

  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  const details = typeof payload.details === "string" ? payload.details.trim() : "";
  const refundKind = action === "refund" ? (payload.refund_kind === "partial" ? "partial" : "full") : null;
  const refundAmount = action === "refund" && payload.refund_kind === "partial" ? Number(payload.refund_amount) : null;
  const actionDetails =
    action === "refund" && refundKind === "partial" && refundAmount !== null && Number.isFinite(refundAmount)
      ? [details, `Partial refund amount: ${refundAmount.toFixed(2)} ${String(existingOrder.currency || "AZN")}.`]
          .filter(Boolean)
          .join(" ")
      : details;

  const { error: logError } = await supabase
    .from("order_logs")
    .insert([
      {
        order_id: orderId,
        actor_role: auth.actor.role,
        actor_username: auth.actor.username,
        action,
        reason: reason || null,
        details: actionDetails || null,
        old_value: existingOrder,
        new_value: updatedOrder,
      },
    ]);

  if (logError && logError.code !== "42P01") {
    return Response.json({ error: logError.message }, { status: 400 });
  }

  const customerEmail = await getCustomerEmail(supabase, String(updatedOrder.user_id || ""));
  if (customerEmail) {
    if (action === "status_change") {
      await sendOrderUpdateEmail({
        to: customerEmail,
        locale: "az",
        orderNumber: updatedOrder.order_number,
        type: "status_changed",
        details,
      });
    }

    if (action === "price_change") {
      await sendOrderUpdateEmail({
        to: customerEmail,
        locale: "az",
        orderNumber: updatedOrder.order_number,
        type: "price_changed",
        details,
      });
    }

    if (action === "address_change") {
      await sendOrderUpdateEmail({
        to: customerEmail,
        locale: "az",
        orderNumber: updatedOrder.order_number,
        type: "address_changed",
        details,
      });
    }

    if (action === "cancel") {
      await sendOrderUpdateEmail({
        to: customerEmail,
        locale: "az",
        orderNumber: updatedOrder.order_number,
        type: "order_cancelled",
        details: reason || details,
      });
    }

    if (action === "refund") {
      await sendOrderUpdateEmail({
        to: customerEmail,
        locale: "az",
        orderNumber: updatedOrder.order_number,
        type: "order_refunded",
        details: reason || actionDetails,
      });
    }
  }

  const { data: logs, error: logsError } = await supabase
    .from("order_logs")
    .select("id,order_id,actor_role,actor_username,action,reason,details,old_value,new_value,created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (logsError && logsError.code !== "42P01") {
    return Response.json({ error: logsError.message }, { status: 400 });
  }

  return Response.json({
    ok: true,
    order: updatedOrder,
    logs: logsError?.code === "42P01" ? [] : logs || [],
  });
}
