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
import { sendOrderUpdateEmail } from "@/lib/order-notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type OrderAction = "status_change" | "price_change" | "address_change" | "refund" | "cancel";

type UpdatePayload = {
  action?: OrderAction;
  reason?: string;
  status?: string;
  total_amount?: number;
  delivery_address_json?: Record<string, unknown>;
  details?: string;
};

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

async function getCustomerEmail(supabase: ReturnType<typeof createClient>, userId: string) {
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Supabase credentials missing." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Supabase credentials missing." }, { status: 500 });
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

  const supabase = createClient(supabaseUrl, serviceRoleKey);

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
  }

  if (action === "refund") {
    updateData.status = "refunded";
    updateData.payment_status = "refunded";
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
    .select("*")
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 400 });
  }

  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  const details = typeof payload.details === "string" ? payload.details.trim() : "";

  const { error: logError } = await supabase
    .from("order_logs")
    .insert([
      {
        order_id: orderId,
        actor_role: auth.actor.role,
        actor_username: auth.actor.username,
        action,
        reason: reason || null,
        details: details || null,
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
        details: reason || details,
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
