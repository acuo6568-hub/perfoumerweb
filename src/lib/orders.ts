import { createClient } from "@supabase/supabase-js";

import { generateOrderNumber } from "@/lib/order-number";

export type OrderItemInput = {
  perfume_slug: string;
  perfume_name: string;
  size_ml: number;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type CreateOrderInput = {
  user_id: string;
  items: OrderItemInput[];
  total_amount: number;
  currency?: string;
  payment_method?: string;
  payment_status?: string;
  kapital_order_id?: string;
  kapital_payment_id?: string;
  delivery_address?: Record<string, unknown>;
};

export async function createOrder(input: CreateOrderInput) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase credentials missing");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const orderNumber = generateOrderNumber();

  const { data, error } = await supabase
    .from("orders")
    .insert([
      {
        user_id: input.user_id,
        order_number: orderNumber,
        status: input.payment_status === "completed" ? "confirmed" : "new",
        payment_method: input.payment_method || "epoint",
        payment_status: input.payment_status || "pending",
        total_amount: input.total_amount,
        currency: input.currency || "AZN",
        items_json: input.items,
        delivery_address_json: input.delivery_address,
        kapital_order_id: input.kapital_order_id,
        kapital_payment_id: input.kapital_payment_id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    throw error;
  }

  return {
    id: data.id,
    order_number: data.order_number,
    created_at: data.created_at,
  };
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: "pending" | "completed" | "failed" | "refunded",
  kapitalPaymentId?: string
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase credentials missing");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const updateData: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };

  if (paymentStatus === "completed") {
    updateData.status = "confirmed";
  }

  if (kapitalPaymentId) {
    updateData.kapital_payment_id = kapitalPaymentId;
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) {
    console.error("Error updating order payment status:", error);
    throw error;
  }
}
