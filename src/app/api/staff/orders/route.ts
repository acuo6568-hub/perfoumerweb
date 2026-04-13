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

type RawOrder = {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  items_json: unknown;
  delivery_address_json: unknown;
  created_at: string;
  updated_at: string;
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

export async function GET(request: Request) {
  const auth = await ensureAuthorized();
  if (auth.error) {
    return auth.error;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Supabase credentials missing." }, { status: 500 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const statusFilter = (url.searchParams.get("status") || "all").trim().toLowerCase();

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let query = supabase
    .from("orders")
    .select("id,user_id,order_number,status,payment_status,total_amount,currency,items_json,delivery_address_json,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  let orders = (data || []) as RawOrder[];

  if (q) {
    orders = orders.filter((order) => {
      const delivery = order.delivery_address_json && typeof order.delivery_address_json === "object"
        ? JSON.stringify(order.delivery_address_json).toLowerCase()
        : "";
      const items = Array.isArray(order.items_json) ? JSON.stringify(order.items_json).toLowerCase() : "";

      return (
        order.order_number.toLowerCase().includes(q) ||
        order.status.toLowerCase().includes(q) ||
        order.payment_status.toLowerCase().includes(q) ||
        delivery.includes(q) ||
        items.includes(q)
      );
    });
  }

  return Response.json({
    actor: auth.actor,
    orders,
    count: orders.length,
  });
}
