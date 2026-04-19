"use client";

import { Heart } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type PerfumeWishlistButtonProps = {
  perfumeSlug: string;
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

const copy = {
  az: {
    save: "Seçilmişlərə əlavə et",
    saved: "Saxlanılıb",
  },
  en: {
    save: "Add to wishlist",
    saved: "Saved",
  },
  ru: {
    save: "Добавить в wishlist",
    saved: "Сохранено",
  },
} as const;

export function PerfumeWishlistButton({ perfumeSlug, locale, supabase: supabaseConfig }: PerfumeWishlistButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [session, setSession] = useState<Session | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonFx, setButtonFx] = useState<"save" | "remove" | null>(null);

  const loginHref = useMemo(() => {
    const nextPath = pathname || `/perfumes/${perfumeSlug}`;
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }, [pathname, perfumeSlug]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (!nextSession) {
        setIsInWishlist(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user) {
      return;
    }

    let isMounted = true;

    const loadWishlistState = async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("perfume_slug")
        .eq("user_id", session.user.id)
        .eq("perfume_slug", perfumeSlug)
        .maybeSingle();

      if (!isMounted) return;
      setIsInWishlist(Boolean(data));
    };

    void loadWishlistState();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user, perfumeSlug]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || typeof window === "undefined") {
      return;
    }

    let isMounted = true;

    const reloadWishlistState = async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("perfume_slug")
        .eq("user_id", session.user.id)
        .eq("perfume_slug", perfumeSlug)
        .maybeSingle();

      if (!isMounted) return;
      setIsInWishlist(Boolean(data));
    };

    const onWishlistUpdated = () => {
      void reloadWishlistState();
    };

    window.addEventListener("perfoumer:wishlist-updated", onWishlistUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("perfoumer:wishlist-updated", onWishlistUpdated);
    };
  }, [supabase, session?.user?.id, perfumeSlug]);

  useEffect(() => {
    if (!buttonFx) {
      return;
    }

    const timer = window.setTimeout(() => {
      setButtonFx(null);
    }, 620);

    return () => {
      window.clearTimeout(timer);
    };
  }, [buttonFx]);

  const toggleWishlist = async () => {
    if (!isSupabaseConfigured(supabaseConfig ?? undefined) || !supabase) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    if (!session?.user) {
      router.push(loginHref);
      return;
    }

    const nextState = !isInWishlist;
    setIsInWishlist(nextState);
    setButtonFx(nextState ? "save" : "remove");
    setIsSubmitting(true);

    if (!nextState) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", session.user.id)
        .eq("perfume_slug", perfumeSlug);

      if (error) {
        setIsInWishlist(true);
      }

      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("wishlists").insert({
      user_id: session.user.id,
      perfume_slug: perfumeSlug,
    });

    if (error) {
      setIsInWishlist(false);
    }

    setIsSubmitting(false);
  };

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      className={[
        "wishlist-pill inline-flex h-12 min-w-[11.5rem] items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium",
        isInWishlist
          ? "wishlist-pill--saved border-zinc-900 bg-zinc-900 text-white"
          : "wishlist-pill--idle border-zinc-300 bg-white text-zinc-700",
        buttonFx === "save" ? "wishlist-pill--save-burst" : "",
        buttonFx === "remove" ? "wishlist-pill--remove-swipe" : "",
        isSubmitting ? "wishlist-pill--busy" : "",
      ].join(" ")}
      aria-label={isInWishlist ? copy[locale].saved : copy[locale].save}
      aria-busy={isSubmitting}
    >
      <span
        className={[
          "wishlist-pill-icon",
          buttonFx === "save" ? "wishlist-pill-icon--pop" : "",
          buttonFx === "remove" ? "wishlist-pill-icon--fall" : "",
        ].join(" ")}
      >
        <Heart size={18} weight={isInWishlist ? "fill" : "regular"} />
      </span>
      {isInWishlist ? copy[locale].saved : copy[locale].save}
    </button>
  );
}
