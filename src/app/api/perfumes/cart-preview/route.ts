import { NextResponse } from "next/server";

import { getPerfumes } from "@/lib/catalog";

type CartPreviewRequest = {
  slugs?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CartPreviewRequest;
  const slugs = Array.isArray(body.slugs)
    ? body.slugs
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 40)
    : [];

  if (!slugs.length) {
    return NextResponse.json({ items: [] as Array<{ slug: string; name: string; brand: string; image: string }> });
  }

  const perfumes = await getPerfumes();
  const bySlug = new Map(perfumes.map((perfume) => [perfume.slug, perfume]));

  const items = slugs
    .map((slug) => {
      const perfume = bySlug.get(slug);
      if (!perfume) return null;
      return {
        slug,
        name: perfume.name,
        brand: perfume.brand,
        image: perfume.image || "/perfoumerlogo.png",
      };
    })
    .filter((item): item is { slug: string; name: string; brand: string; image: string } => Boolean(item));

  return NextResponse.json({ items });
}
