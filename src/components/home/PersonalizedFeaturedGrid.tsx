"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { ProductCard } from "@/components/ProductCard";
import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, type SupabasePublicConfig } from "@/lib/supabase/client";
import type { Perfume } from "@/types/catalog";

type PersonalizedFeaturedGridProps = {
  featured: Perfume[];
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

function buildPreferenceMaps(
  catalogBySlug: Map<string, Perfume>,
  wishlistSlugs: string[],
  cartItems: Array<{ perfume_slug?: unknown; quantity?: unknown }>,
  comments: Array<{ perfume_slug?: unknown; rating?: unknown }>,
) {
  const brandWeight = new Map<string, number>();
  const noteWeight = new Map<string, number>();
  const genderWeight = new Map<string, number>();

  const addPerfumeSignal = (slug: string, weight: number) => {
    const perfume = catalogBySlug.get(slug);
    if (!perfume) return;

    const brand = perfume.brand.trim();
    if (brand) brandWeight.set(brand, (brandWeight.get(brand) ?? 0) + weight);

    const gender = perfume.gender.trim();
    if (gender) genderWeight.set(gender, (genderWeight.get(gender) ?? 0) + weight);

    const notes = [...perfume.noteSlugs.top, ...perfume.noteSlugs.heart, ...perfume.noteSlugs.base];
    for (const note of notes) {
      if (!note) continue;
      noteWeight.set(note, (noteWeight.get(note) ?? 0) + weight);
    }
  };

  for (const slug of wishlistSlugs) {
    addPerfumeSignal(slug, 4);
  }

  for (const item of cartItems) {
    const slug = typeof item.perfume_slug === "string" ? item.perfume_slug.trim().toLowerCase() : "";
    if (!slug) continue;
    const quantity = Number.isFinite(Number(item.quantity)) ? Math.max(1, Number(item.quantity)) : 1;
    addPerfumeSignal(slug, Math.max(2, quantity));
  }

  for (const entry of comments) {
    const slug = typeof entry.perfume_slug === "string" ? entry.perfume_slug.trim().toLowerCase() : "";
    if (!slug) continue;
    const rating = Number.isFinite(Number(entry.rating)) ? Number(entry.rating) : 0;
    if (rating >= 4) addPerfumeSignal(slug, 3);
  }

  return { brandWeight, noteWeight, genderWeight };
}

function reorderFeatured(
  featured: Perfume[],
  maps: ReturnType<typeof buildPreferenceMaps>,
) {
  const { brandWeight, noteWeight, genderWeight } = maps;

  const hasSignal =
    Array.from(brandWeight.values()).some((value) => value > 0) ||
    Array.from(noteWeight.values()).some((value) => value > 0) ||
    Array.from(genderWeight.values()).some((value) => value > 0);

  if (!hasSignal) return featured;

  return featured
    .map((perfume, index) => {
      let score = 0;
      score += (brandWeight.get(perfume.brand.trim()) ?? 0) * 8;
      score += (genderWeight.get(perfume.gender.trim()) ?? 0) * 4;

      for (const note of [...perfume.noteSlugs.top, ...perfume.noteSlugs.heart, ...perfume.noteSlugs.base]) {
        score += (noteWeight.get(note) ?? 0) * 2;
      }

      if (perfume.inStock) score += 2;

      return { perfume, index, score };
    })
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return left.index - right.index;
    })
    .map((entry) => entry.perfume);
}

export function PersonalizedFeaturedGrid({
  featured,
  locale,
  supabase: supabaseConfig,
}: PersonalizedFeaturedGridProps) {
  const [orderedFeatured, setOrderedFeatured] = useState<Perfume[]>(featured);
  const catalogBySlug = useMemo(
    () => new Map(featured.map((perfume) => [perfume.slug, perfume])),
    [featured],
  );

  useEffect(() => {
    setOrderedFeatured(featured);
  }, [featured]);

  useEffect(() => {
    let isMounted = true;
    let idleCallbackId: number | null = null;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const hydrateForSession = async (session: Session | null) => {
      if (!isMounted) return;
      if (!session?.user) {
        setOrderedFeatured(featured);
        return;
      }

      const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
      if (!supabase) {
        setOrderedFeatured(featured);
        return;
      }

      const [wishlistRes, cartRes, commentsRes] = await Promise.all([
        supabase
          .from("wishlists")
          .select("perfume_slug")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("cart_items")
          .select("perfume_slug,quantity")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("comments")
          .select("perfume_slug,rating")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);

      if (!isMounted) return;

      const wishlistSlugs = ((wishlistRes.data ?? []) as Array<{ perfume_slug?: unknown }>)
        .map((entry) => (typeof entry.perfume_slug === "string" ? entry.perfume_slug.trim().toLowerCase() : ""))
        .filter(Boolean);

      const maps = buildPreferenceMaps(
        catalogBySlug,
        wishlistSlugs,
        (cartRes.data ?? []) as Array<{ perfume_slug?: unknown; quantity?: unknown }>,
        (commentsRes.data ?? []) as Array<{ perfume_slug?: unknown; rating?: unknown }>,
      );

      setOrderedFeatured(reorderFeatured(featured, maps));
    };

    if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
      setOrderedFeatured(featured);
      return () => {
        isMounted = false;
      };
    }

    const startPersonalization = () => {
      const supabase = getSupabaseBrowserClient(supabaseConfig);
      if (!supabase) {
        setOrderedFeatured(featured);
        return;
      }

      void supabase.auth.getSession().then(({ data }) => {
        void hydrateForSession(data.session ?? null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void hydrateForSession(nextSession);
      });

      authSubscription = subscription;
    };

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(
        () => {
          startPersonalization();
        },
        { timeout: 1500 },
      );
    } else {
      fallbackTimeoutId = globalThis.setTimeout(() => {
        startPersonalization();
      }, 700);
    }

    return () => {
      isMounted = false;
      if (idleCallbackId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (fallbackTimeoutId !== null) {
        window.clearTimeout(fallbackTimeoutId);
      }
      authSubscription?.unsubscribe();
    };
  }, [catalogBySlug, featured, supabaseConfig]);

  return (
    <section className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
      {orderedFeatured.map((perfume) => (
        <ProductCard key={perfume.id} perfume={perfume} locale={locale} />
      ))}
    </section>
  );
}
