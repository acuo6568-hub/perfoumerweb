import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { CASH_PICKUP_PAYMENT_METHOD } from "@/lib/checkout-settings";
import { sendOrderUpdateEmail } from "@/lib/order-notifications";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isCashPickupOrder(paymentMethod: unknown) {
  return String(paymentMethod || "").trim().toLowerCase() === CASH_PICKUP_PAYMENT_METHOD;
}

function isCancellableOrder(status: string, paymentStatus: string, paymentMethod: unknown) {
  if (!isCashPickupOrder(paymentMethod)) {
    return false;
  }

  if (paymentStatus.trim().toLowerCase() !== "pending") {
    return false;
  }

  return ["new", "confirmed", "preparing", "ready_for_pickup", "pending", "processing"].includes(
    status.trim().toLowerCase(),
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { id } = await context.params;
    const orderId = id?.trim();

    if (!orderId) {
      return NextResponse.json({ error: "Order id is required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase config missing" }, { status: 500 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    const ordersClient = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : authClient;

    const { data: existingOrder, error: orderError } = await ordersClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 400 });
    }

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (
      !isCancellableOrder(
        String(existingOrder.status || ""),
        String(existingOrder.payment_status || ""),
        existingOrder.payment_method,
      )
    ) {
      return NextResponse.json({ error: "This order can no longer be cancelled." }, { status: 400 });
    }

    const { data: updatedOrder, error: updateError } = await ordersClient
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    if (typeof user.email === "string" && user.email.trim()) {
      await sendOrderUpdateEmail({
        to: user.email.trim(),
        locale: "az",
        orderNumber: String(updatedOrder.order_number || ""),
        type: "order_cancelled",
        details: "Customer cancelled this cash pickup order from the account page.",
      });
    }

    return NextResponse.json({
      ok: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Profile order update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
