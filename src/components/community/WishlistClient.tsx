"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Check, CopySimple, ShareNetwork } from "@phosphor-icons/react";

import { ProductCard } from "@/components/ProductCard";
import type { Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";
import type { Perfume } from "@/types/catalog";
import type { WishlistRow } from "@/types/community";

type WishlistClientProps = {
  perfumes: Perfume[];
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  title: string;
  subtitle: string;
  configMissing: string;
  signInTitle: string;
  signInBody: string;
  signInCta: string;
  loading: string;
  noItems: string;
  remove: string;
  confirmRemoveTitle: string;
  confirmRemoveBody: string;
  cancel: string;
  confirm: string;
  removing: string;
  signedInAs: string;
  shareTitle: string;
  shareDescription: string;
  sharePrimary: string;
  shareCopyAria: string;
  shareCopied: string;
  shareCreating: string;
  shareSaving: string;
  shareError: string;
  shareAllowAdditions: string;
  shareShared: string;
  shareAutoSaved: string;
  shareLinkLabel: string;
  shareLinkPlaceholder: string;
  shareNoLinkBody: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    title: "Mənim Wishlist",
    subtitle: "Yalnız sənə aid saxladığın ətirlər.",
    configMissing:
      "Supabase konfiqurasiyası yoxdur. .env faylında NEXT_PUBLIC_SUPABASE_URL və NEXT_PUBLIC_SUPABASE_ANON_KEY əlavə edin.",
    signInTitle: "Wishlist üçün giriş et",
    signInBody: "Ayrı login səhifəsindən daxil olub şəxsi wishlist-i gör.",
    signInCta: "Giriş / Qeydiyyat",
    loading: "Yüklənir...",
    noItems: "Wishlist boşdur. Məhsul səhifəsindən əlavə edə bilərsən.",
    remove: "Sil",
    confirmRemoveTitle: "Wishlist-dən silinsin?",
    confirmRemoveBody: "{name} məhsulu seçilmişlərdən silinəcək.",
    cancel: "Ləğv et",
    confirm: "Bəli, sil",
    removing: "Silinir...",
    signedInAs: "Hesab",
    shareTitle: "Wishlist paylaş",
    shareDescription: "Link vasitəsilə istəklərinizi paylaşın.",
    sharePrimary: "Paylaş",
    shareCopyAria: "Linki kopyala",
    shareCopied: "Kopyalandı",
    shareCreating: "Yaradılır...",
    shareSaving: "Yadda saxlanılır...",
    shareError: "Paylaşım linki yaradılmadı.",
    shareAllowAdditions: "Digərləri əlavə edə bilsin",
    shareShared: "Paylaşıldı",
    shareAutoSaved: "Dəyişikliklər avtomatik yadda saxlandı",
    shareLinkLabel: "Paylaşım linki",
    shareLinkPlaceholder: "Hələ aktiv link yoxdur",
    shareNoLinkBody: "Paylaş düyməsinə klikləyin və şəxsi link yaradın.",
  },
  en: {
    title: "My Wishlist",
    subtitle: "Your saved perfumes, just for your account.",
    configMissing:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file.",
    signInTitle: "Sign in to view wishlist",
    signInBody: "Use the dedicated login screen and come back to your personal list.",
    signInCta: "Login / Sign up",
    loading: "Loading...",
    noItems: "Your wishlist is empty. Add perfumes from product pages.",
    remove: "Remove",
    confirmRemoveTitle: "Remove from wishlist?",
    confirmRemoveBody: "{name} will be removed from your wishlist.",
    cancel: "Cancel",
    confirm: "Yes, remove",
    removing: "Removing...",
    signedInAs: "Account",
    shareTitle: "Share wishlist",
    shareDescription: "Share your wishlist with one private link.",
    sharePrimary: "Share",
    shareCopyAria: "Copy link",
    shareCopied: "Copied",
    shareCreating: "Creating...",
    shareSaving: "Saving...",
    shareError: "Could not create share link.",
    shareAllowAdditions: "Allow additions from shared link",
    shareShared: "Shared",
    shareAutoSaved: "Changes are saved automatically",
    shareLinkLabel: "Share link",
    shareLinkPlaceholder: "No active link yet",
    shareNoLinkBody: "Press Share to generate your private link.",
  },
  ru: {
    title: "Мой Wishlist",
    subtitle: "Сохраненные ароматы только для вашего аккаунта.",
    configMissing:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.",
    signInTitle: "Войдите, чтобы увидеть wishlist",
    signInBody: "Используйте отдельный экран входа и вернитесь к личному списку.",
    signInCta: "Вход / Регистрация",
    loading: "Загрузка...",
    noItems: "Wishlist пока пуст. Добавляйте ароматы со страницы товара.",
    remove: "Удалить",
    confirmRemoveTitle: "Удалить из wishlist?",
    confirmRemoveBody: "{name} будет удален из вашего wishlist.",
    cancel: "Отмена",
    confirm: "Да, удалить",
    removing: "Удаление...",
    signedInAs: "Аккаунт",
    shareTitle: "Поделиться wishlist",
    shareDescription: "Поделитесь списком по одной приватной ссылке.",
    sharePrimary: "Поделиться",
    shareCopyAria: "Скопировать ссылку",
    shareCopied: "Скопировано",
    shareCreating: "Создание...",
    shareSaving: "Сохранение...",
    shareError: "Не удалось создать ссылку.",
    shareAllowAdditions: "Разрешить добавление по ссылке",
    shareShared: "Поделились",
    shareAutoSaved: "Изменения сохраняются автоматически",
    shareLinkLabel: "Ссылка для доступа",
    shareLinkPlaceholder: "Активной ссылки пока нет",
    shareNoLinkBody: "Нажмите Поделиться, чтобы создать приватную ссылку.",
  },
};

type WishlistShareRow = {
  token: string;
  allow_additions: boolean;
};

function createShareToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function WishlistClient({ perfumes, locale, supabase: supabaseConfig }: WishlistClientProps) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(() => Boolean(supabase));
  const [isListLoading, setIsListLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [wishlists, setWishlists] = useState<WishlistRow[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Perfume | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [isShareSaving, setIsShareSaving] = useState(false);
  const [isShareCopying, setIsShareCopying] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isShareShared, setIsShareShared] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [allowAdditions, setAllowAdditions] = useState(false);
  const [isShareHydrated, setIsShareHydrated] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session ?? null);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      if (!nextSession) {
        setWishlists([]);
        setIsListLoading(false);
      }
      router.refresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  useEffect(() => {
    if (!supabase || !session?.user) {
      return;
    }

    let isMounted = true;

    const loadWishlists = async () => {
      setIsListLoading(true);

      const { data, error } = await supabase
        .from("wishlists")
        .select("user_id,perfume_slug,created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
        setWishlists([]);
      } else {
        setWishlists((data as WishlistRow[] | null) ?? []);
      }

      setIsListLoading(false);
    };

    void loadWishlists();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setShareToken(null);
      return;
    }

    let isMounted = true;

    const loadShareToken = async () => {
      setIsShareLoading(true);
      const { data, error } = await supabase
        .from("wishlist_shares")
        .select("token,allow_additions")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
        setShareToken(null);
      } else {
        const row = data as WishlistShareRow | null;
        setShareToken(row?.token ?? null);
        setAllowAdditions(Boolean(row?.allow_additions));
      }

      setIsShareHydrated(true);
      setIsShareLoading(false);
    };

    void loadShareToken();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || typeof window === "undefined") {
      return;
    }

    let isMounted = true;

    const reloadWishlistFromEvent = async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("user_id,perfume_slug,created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
        return;
      }

      setWishlists((data as WishlistRow[] | null) ?? []);
    };

    const onWishlistUpdated = () => {
      void reloadWishlistFromEvent();
    };

    window.addEventListener("perfoumer:wishlist-updated", onWishlistUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("perfoumer:wishlist-updated", onWishlistUpdated);
    };
  }, [supabase, session?.user?.id]);

  const perfumesBySlug = useMemo(
    () => new Map(perfumes.map((perfume) => [perfume.slug, perfume])),
    [perfumes],
  );

  const wishedPerfumes = useMemo(
    () =>
      wishlists
        .map((item) => perfumesBySlug.get(item.perfume_slug))
        .filter((item): item is Perfume => Boolean(item)),
    [wishlists, perfumesBySlug],
  );

  const shareUrl = useMemo(() => {
    if (!shareToken) {
      return "";
    }

    return `${SITE_URL}/wishlist/shared/${shareToken}`;
  }, [shareToken]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || !shareToken || !isShareHydrated) {
      return;
    }

    let isActive = true;
    setIsShareSaving(true);

    const persistAdditions = async () => {
      const { error } = await supabase
        .from("wishlist_shares")
        .upsert(
          {
            user_id: session.user.id,
            token: shareToken,
            allow_additions: allowAdditions,
          },
          { onConflict: "user_id" },
        );

      if (!isActive) {
        return;
      }

      if (error) {
        setMessage(error.message);
      } else {
        setShareNote(copy.shareAutoSaved);
        window.setTimeout(() => {
          setShareNote((prev) => (prev === copy.shareAutoSaved ? "" : prev));
        }, 1500);
      }

      setIsShareSaving(false);
    };

    void persistAdditions();

    return () => {
      isActive = false;
    };
  }, [allowAdditions, copy.shareAutoSaved, isShareHydrated, session?.user?.id, shareToken, supabase]);

  const removeFromWishlist = async (perfumeSlug: string) => {
    if (!supabase || !session?.user) {
      return;
    }

    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", session.user.id)
      .eq("perfume_slug", perfumeSlug);

    if (error) {
      setMessage(error.message);
      return;
    }

    setWishlists((prev) => prev.filter((item) => item.perfume_slug !== perfumeSlug));
  };

  const confirmRemove = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsRemoving(true);
    await removeFromWishlist(pendingDelete.slug);
    setIsRemoving(false);
    setPendingDelete(null);
  };

  const createOrRefreshShareLink = async (): Promise<string | null> => {
    if (!supabase || !session?.user?.id) {
      return null;
    }

    setIsShareLoading(true);
    setIsShareCopied(false);
    const token = createShareToken();

    const { error } = await supabase
      .from("wishlist_shares")
      .upsert(
        {
          user_id: session.user.id,
          token,
          allow_additions: allowAdditions,
        },
        { onConflict: "user_id" },
      );

    if (error) {
      setMessage(copy.shareError);
      setIsShareLoading(false);
      return null;
    }

    setShareToken(token);
    setIsShareLoading(false);
    return token;
  };

  const copyShareLink = async () => {
    if (!shareUrl || isShareCopying) {
      return;
    }

    try {
      setIsShareCopying(true);
      await navigator.clipboard.writeText(shareUrl);
      setIsShareCopied(true);
      setShareNote(copy.shareCopied);
      window.setTimeout(() => {
        setIsShareCopied(false);
        setShareNote((prev) => (prev === copy.shareCopied ? "" : prev));
      }, 1800);
    } catch {
      setMessage(copy.shareError);
    } finally {
      setIsShareCopying(false);
    }
  };

  const onPrimaryShare = async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }

    let url = shareUrl;
    if (!url) {
      const createdToken = await createOrRefreshShareLink();
      if (!createdToken) {
        return;
      }
      url = `${SITE_URL}/wishlist/shared/${createdToken}`;
    }

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: copy.shareTitle, text: copy.shareDescription, url });
        setIsShareShared(true);
        setShareNote(copy.shareShared);
        window.setTimeout(() => {
          setIsShareShared(false);
          setShareNote((prev) => (prev === copy.shareShared ? "" : prev));
        }, 1400);
        return;
      } catch {
        // Fallback to clipboard if user cancels or share is unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setIsShareCopied(true);
      setShareNote(copy.shareCopied);
      window.setTimeout(() => {
        setIsShareCopied(false);
        setShareNote((prev) => (prev === copy.shareCopied ? "" : prev));
      }, 1600);
    } catch {
      setMessage(copy.shareError);
    }
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">{copy.configMissing}</p>;
  }

  if (isSessionLoading) {
    return <p className="text-sm text-zinc-500">{copy.loading}</p>;
  }

  if (!session) {
    return (
      <div className="max-w-xl rounded-[1.8rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f3f3f2_70%)] p-6 shadow-sm">
        <h2 className="text-2xl leading-tight text-zinc-900">{copy.signInTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{copy.signInBody}</p>
        <Link
          href="/login?next=%2Fwishlist"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white"
        >
          {copy.signInCta}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.4rem] border border-zinc-200 bg-white px-4 py-3">
        <p className="text-sm text-zinc-600">
          {copy.signedInAs}: <span className="font-medium text-zinc-900">{session.user.email}</span>
        </p>
      </div>

      <div className="rounded-[1.15rem] border border-zinc-200/80 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{copy.shareTitle}</p>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-600">{copy.shareDescription}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/65 px-3 py-2.5">
          <span className="text-sm font-medium text-zinc-700">{copy.shareAllowAdditions}</span>
          <button
            type="button"
            role="switch"
            aria-checked={allowAdditions}
            onClick={() => setAllowAdditions((prev) => !prev)}
            className={[
              "relative inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors duration-300",
              allowAdditions ? "bg-zinc-900" : "bg-zinc-300",
            ].join(" ")}
          >
            <span
              className={[
                "h-5 w-5 rounded-full bg-white shadow transition-transform duration-300",
                allowAdditions ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{copy.shareLinkLabel}</p>
          <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2.5">
            <p className={`flex-1 text-sm ${shareUrl ? "break-all text-zinc-700" : "text-zinc-400"}`}>
              {shareUrl || copy.shareLinkPlaceholder}
            </p>
            <button
              type="button"
              onClick={copyShareLink}
              disabled={!shareUrl || isShareCopying}
              aria-label={copy.shareCopyAria}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isShareCopied ? <Check size={16} weight="bold" /> : <CopySimple size={16} weight="bold" />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">{shareToken ? (isShareSaving ? copy.shareSaving : shareNote) : copy.shareNoLinkBody}</p>
          <button
            type="button"
            onClick={onPrimaryShare}
            disabled={isShareLoading || isShareSaving}
            className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(20,20,20,0.15)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-zinc-800 disabled:opacity-60"
          >
            {isShareShared ? <Check size={15} weight="bold" /> : <ShareNetwork size={15} weight="bold" className="transition-transform duration-300 group-hover:rotate-12" />}
            {isShareLoading ? copy.shareCreating : copy.sharePrimary}
          </button>
        </div>
      </div>

      {isListLoading ? <p className="text-sm text-zinc-500">{copy.loading}</p> : null}

      {!isListLoading && wishedPerfumes.length === 0 ? (
        <p className="text-sm text-zinc-600">{copy.noItems}</p>
      ) : null}

      {wishedPerfumes.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {wishedPerfumes.map((perfume) => (
            <div key={perfume.id} className="space-y-2">
              <ProductCard perfume={perfume} locale={locale} />
              <button
                type="button"
                onClick={() => setPendingDelete(perfume)}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                {copy.remove}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => {
            if (!isRemoving) {
              setPendingDelete(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-[1.4rem] bg-white p-5 shadow-[0_24px_60px_rgba(15,15,15,0.24)] ring-1 ring-zinc-200 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-2xl tracking-[-0.02em] text-zinc-900">{copy.confirmRemoveTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {copy.confirmRemoveBody.replace("{name}", pendingDelete.name)}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => setPendingDelete(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                disabled={isRemoving}
                onClick={confirmRemove}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white shadow-[0_10px_20px_rgba(20,20,20,0.24)] transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {isRemoving ? copy.removing : copy.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
