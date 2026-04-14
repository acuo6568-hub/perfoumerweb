"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { generateOrderNumber } from "@/lib/order-number";

export type CreateOrderForCheckoutInput = {
  userId: string;
  items: Array<{
    perfume_slug: string;
    perfume_name: string;
    size_ml: number;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  total_amount: number;
  selectedAddressId?: string;
};

export async function createOrderForCheckout(input: CreateOrderForCheckoutInput): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return { success: false, error: "Server configuration missing" };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get delivery address if provided
    let deliveryAddress;
    if (input.selectedAddressId) {
      const { data } = await supabase
        .from("checkout_addresses")
        .select("*")
        .eq("id", input.selectedAddressId)
        .eq("user_id", input.userId)
        .single();

      if (data) {
        deliveryAddress = {
          fullName: data.full_name,
          phone: data.phone,
          line1: data.line1,
          line2: data.line2,
          city: data.city,
          postalCode: data.postal_code,
          country: data.country,
        };
      }
    }

    const orderNumber = generateOrderNumber();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          user_id: input.userId,
          order_number: orderNumber,
          status: "new",
          payment_status: "pending",
          total_amount: input.total_amount,
          currency: "AZN",
          items_json: input.items,
          delivery_address_json: deliveryAddress,
        },
      ])
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return { success: false, error: "Failed to create order" };
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    };
  } catch (error) {
    console.error("Server error creating order:", error);
    return { success: false, error: "Server error" };
  }
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: "pending" | "completed" | "failed" | "refunded",
  kapitalPaymentId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return { success: false, error: "Server configuration missing" };
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
      console.error("Error updating order:", error);
      return { success: false, error: "Failed to update order" };
    }

    return { success: true };
  } catch (error) {
    console.error("Server error updating order:", error);
    return { success: false, error: "Server error" };
  }
}
