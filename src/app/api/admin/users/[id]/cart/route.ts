import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { getPerfumes } from "@/lib/catalog";
import { createClient } from "@supabase/supabase-js";

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Admin login is not configured. Set ADMIN_PASSWORD in env." },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!validateAdminSessionToken(token)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: "Missing user id." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: cartRows } = await supabase
      .from("cart_items")
      .select("perfume_slug, size_ml, quantity, unit_price, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(200);

    const perfumes = await getPerfumes();
    const perfumeMap = new Map(
      perfumes.map((perfume) => [perfume.slug, perfume]),
    );

    const items = (cartRows ?? []).map((row) => {
      const perfume = perfumeMap.get(row.perfume_slug);
      return {
        slug: row.perfume_slug,
        name: perfume?.name || row.perfume_slug,
        brand: perfume?.brand || "",
        image: perfume?.image || "",
        size_ml: Number(row.size_ml ?? 0),
        quantity: Number(row.quantity ?? 1),
        unit_price: Number(row.unit_price ?? 0),
        created_at: row.created_at,
      };
    });

    return Response.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch cart.";
    console.error("Admin user cart API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
