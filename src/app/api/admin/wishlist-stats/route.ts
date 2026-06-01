import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { getPerfumes } from "@/lib/catalog";

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

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const daysParam = Number(url.searchParams.get("days") || 30);
    const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(1, Math.trunc(daysParam))) : 30;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const { data, error } = await supabase
      .from("wishlists")
      .select("perfume_slug, created_at");

    if (error) {
      throw new Error("Failed to load wishlist stats");
    }

    const counts = new Map<string, number>();
    let filteredAdds = 0;
    (data ?? []).forEach((row) => {
      const createdAt = new Date(String((row as { created_at?: string | null }).created_at || "")).getTime();
      if (Number.isFinite(createdAt) && createdAt < since.getTime()) {
        return;
      }
      const slug = String((row as { perfume_slug?: string | null }).perfume_slug || "").trim();
      if (!slug) return;
      filteredAdds += 1;
      counts.set(slug, (counts.get(slug) || 0) + 1);
    });

    const perfumes = await getPerfumes();
    const perfumeMap = new Map(perfumes.map((perfume) => [perfume.slug, perfume]));

    const topWishlistedPerfumes = Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([slug, count]) => {
        const perfume = perfumeMap.get(slug);
        return {
          slug,
          name: perfume?.name || slug,
          brand: perfume?.brand || "",
          image: perfume?.image || "",
          count,
        };
      });

    return Response.json({
      generatedAt: new Date().toISOString(),
      totalWishlistAdds: filteredAdds,
      topWishlistedPerfumes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch wishlist stats.";
    console.error("Admin wishlist stats API error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
