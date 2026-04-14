import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getPerfumes } from "@/lib/catalog";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const config = getSupabasePublicConfigFromServer();

  if (!config) {
    return NextResponse.json({ error: "public_config_missing" }, { status: 500 });
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

  const supabase = createClient(config.url, config.anonKey);

  const { error: insertError } = await supabase.rpc("add_to_shared_wishlist", {
    p_token: token,
    p_perfume_slug: perfumeSlug,
  });

  if (insertError) {
    if (insertError.message.includes("share_not_found")) {
      return NextResponse.json({ error: "share_not_found" }, { status: 404 });
    }

    if (insertError.message.includes("additions_not_allowed")) {
      return NextResponse.json({ error: "additions_not_allowed" }, { status: 403 });
    }

    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
