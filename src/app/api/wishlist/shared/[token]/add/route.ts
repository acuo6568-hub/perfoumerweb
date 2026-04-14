import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getPerfumes } from "@/lib/catalog";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const config = getSupabaseServiceConfigFromServer();

  if (!config) {
    return NextResponse.json({ error: "service_config_missing" }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const perfumeSlug =
    typeof payload === "object" && payload !== null && "perfumeSlug" in payload
      ? String((payload as { perfumeSlug: unknown }).perfumeSlug || "").trim().toLowerCase()
      : "";

  if (!perfumeSlug) {
    return NextResponse.json({ error: "perfume_slug_required" }, { status: 400 });
  }

  const perfumes = await getPerfumes();
  const validSlugSet = new Set(perfumes.map((item) => item.slug));
  if (!validSlugSet.has(perfumeSlug)) {
    return NextResponse.json({ error: "invalid_perfume_slug" }, { status: 400 });
  }

  const supabase = createClient(config.url, config.serviceRoleKey);

  const { data: shareRow, error: shareError } = await supabase
    .from("wishlist_shares")
    .select("user_id,allow_additions")
    .eq("token", token)
    .maybeSingle();

  if (shareError || !shareRow?.user_id) {
    return NextResponse.json({ error: "share_not_found" }, { status: 404 });
  }

  if (!shareRow.allow_additions) {
    return NextResponse.json({ error: "additions_not_allowed" }, { status: 403 });
  }

  const { error: insertError } = await supabase
    .from("wishlists")
    .upsert(
      {
        user_id: shareRow.user_id,
        perfume_slug: perfumeSlug,
      },
      { onConflict: "user_id,perfume_slug", ignoreDuplicates: true },
    );

  if (insertError) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
