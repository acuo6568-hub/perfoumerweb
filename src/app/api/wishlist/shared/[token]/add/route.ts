import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getPerfumes } from "@/lib/catalog";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const serviceConfig = getSupabaseServiceConfigFromServer();
  const publicConfig = getSupabasePublicConfigFromServer();

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

  const readShareRow = async () => {
    if (serviceConfig) {
      const supabase = createClient(serviceConfig.url, serviceConfig.serviceRoleKey);
      const { data, error } = await supabase
        .from("wishlist_shares")
        .select("user_id,allow_additions")
        .eq("token", token)
        .maybeSingle();

      if (!error && data?.user_id) {
        return { userId: data.user_id, allowAdditions: Boolean(data.allow_additions) };
      }
    }

    if (publicConfig) {
      const supabase = createClient(publicConfig.url, publicConfig.anonKey);
      const { data, error } = (await supabase.rpc("get_shared_wishlist", { p_token: token })) as {
        data: Array<{ user_id: string; allow_additions: boolean }> | null;
        error: { message: string } | null;
      };

      if (!error && data?.length && data[0]?.user_id) {
        return { userId: data[0].user_id, allowAdditions: Boolean(data[0].allow_additions) };
      }
    }

    return null;
  };

  const shareRow = await readShareRow();

  if (!shareRow) {
    return NextResponse.json({ error: "share_not_found" }, { status: 404 });
  }

  if (!shareRow.allowAdditions) {
    return NextResponse.json({ error: "additions_not_allowed" }, { status: 403 });
  }

  const insertViaService = async () => {
    if (!serviceConfig) return null;
    const supabase = createClient(serviceConfig.url, serviceConfig.serviceRoleKey);

    const { error } = await supabase
      .from("wishlists")
      .upsert(
        {
          user_id: shareRow.userId,
          perfume_slug: perfumeSlug,
        },
        { onConflict: "user_id,perfume_slug", ignoreDuplicates: true },
      );

    return error ?? null;
  };

  const insertViaRpc = async () => {
    if (!publicConfig) return null;
    const supabase = createClient(publicConfig.url, publicConfig.anonKey);

    const { error } = await supabase.rpc("add_to_shared_wishlist", {
      p_token: token,
      p_perfume_slug: perfumeSlug,
    });

    return error ?? null;
  };

  const insertError = (await insertViaService()) ?? (await insertViaRpc());

  if (insertError) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
