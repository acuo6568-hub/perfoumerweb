"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

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
  shareCreate: string;
  shareRegenerate: string;
  shareCopy: string;
  shareCopied: string;
  shareCreating: string;
  shareError: string;
  shareAllowAdditions: string;
  shareInactive: string;
  shareActiveReadOnly: string;
  shareActiveEditable: string;
  shareLinkLabel: string;
  shareLinkPlaceholder: string;
  shareUpdate: string;
  shareNoLinkTitle: string;
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
    confirmRemoveBody: "{name} məhsulu istək siyahısından silinəcək.",
    cancel: "Ləğv et",
    confirm: "Bəli, sil",
    removing: "Silinir...",
    signedInAs: "Hesab",
    shareTitle: "Wishlist paylaş",
    shareDescription: "Paylaşdığın linklə başqaları siyahını yalnız oxuya bilər, dəyişə bilməz.",
    shareCreate: "Paylaşım linki yarat",
    shareRegenerate: "Yeni link yarat",
    shareCopy: "Linki kopyala",
    shareCopied: "Kopyalandı",
    shareCreating: "Yaradılır...",
    shareError: "Paylaşım linki yaradılmadı.",
    shareAllowAdditions: "Linki olanlar bu siyahıya ətir əlavə edə bilsin",
    shareInactive: "Link passiv",
    shareActiveReadOnly: "Aktiv, yalnız oxu",
    shareActiveEditable: "Aktiv, əlavə etmə açıq",
    shareLinkLabel: "Paylaşım linki",
    shareLinkPlaceholder: "Hələ aktiv link yoxdur",
    shareUpdate: "Dəyişiklikləri yenilə",
    shareNoLinkTitle: "Hələ paylaşım linki yoxdur",
    shareNoLinkBody: "Təmiz və oxunaqlı bir link yaradın. İstəsəniz sonradan əlavə etməni də aça bilərsiniz.",
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
    shareDescription: "People with this link can only view your list. They cannot edit it.",
    shareCreate: "Create share link",
    shareRegenerate: "Regenerate link",
    shareCopy: "Copy link",
    shareCopied: "Copied",
    shareCreating: "Creating...",
    shareError: "Could not create share link.",
    shareAllowAdditions: "Allow people with the link to add perfumes to this list",
    shareInactive: "Link inactive",
    shareActiveReadOnly: "Active, view only",
    shareActiveEditable: "Active, additions enabled",
    shareLinkLabel: "Share link",
    shareLinkPlaceholder: "No active link yet",
    shareUpdate: "Refresh settings",
    shareNoLinkTitle: "No share link yet",
    shareNoLinkBody: "Create a clean, private share link. You can enable additions later.",
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
    shareDescription: "По ссылке список можно только просматривать. Редактирование недоступно.",
    shareCreate: "Создать ссылку",
    shareRegenerate: "Создать новую ссылку",
    shareCopy: "Копировать ссылку",
    shareCopied: "Скопировано",
    shareCreating: "Создание...",
    shareError: "Не удалось создать ссылку.",
    shareAllowAdditions: "Разрешить добавлять ароматы в этот список по ссылке",
    shareInactive: "Ссылка неактивна",
    shareActiveReadOnly: "Активна, только просмотр",
    shareActiveEditable: "Активна, добавление включено",
    shareLinkLabel: "Ссылка для доступа",
    shareLinkPlaceholder: "Активной ссылки пока нет",
    shareUpdate: "Обновить настройки",
    shareNoLinkTitle: "Ссылка ещё не создана",
    shareNoLinkBody: "Создайте чистую приватную ссылку. Добавление можно включить позже.",
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
  const [isShareCopying, setIsShareCopying] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [allowAdditions, setAllowAdditions] = useState(false);

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
    if (!shareToken || typeof window === "undefined") {
      return "";
    }

    return `${SITE_URL}/wishlist/shared/${shareToken}`;
  }, [shareToken]);

  const shareStatus = shareToken ? (allowAdditions ? copy.shareActiveEditable : copy.shareActiveReadOnly) : copy.shareInactive;
  const shareStatusTone = shareToken ? (allowAdditions ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700") : "bg-zinc-100 text-zinc-500";

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

  const createOrRefreshShareLink = async () => {
    if (!supabase || !session?.user?.id) {
      return;
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
      return;
    }

    setShareToken(token);
    setIsShareLoading(false);
  };

  const copyShareLink = async () => {
    if (!shareUrl || isShareCopying) {
      return;
    }

    try {
      setIsShareCopying(true);
      await navigator.clipboard.writeText(shareUrl);
      setIsShareCopied(true);
      window.setTimeout(() => {
        setIsShareCopied(false);
      }, 1800);
    } catch {
      setMessage(copy.shareError);
    } finally {
      setIsShareCopying(false);
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

      <div className="rounded-[1.6rem] border border-zinc-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f8f6_100%)] px-4 py-4 shadow-[0_10px_28px_rgba(24,24,24,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.72rem] font-medium tracking-[0.22em] text-zinc-400 uppercase">{copy.shareTitle}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{copy.shareDescription}</p>
          </div>

          <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase ${shareStatusTone}`}>
            {shareStatus}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-[0_8px_18px_rgba(24,24,24,0.04)]">
            <input
              type="checkbox"
              checked={allowAdditions}
              onChange={(event) => setAllowAdditions(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
            />
            <span>{copy.shareAllowAdditions}</span>
          </label>

          <button
            type="button"
            onClick={createOrRefreshShareLink}
            disabled={isShareLoading}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {isShareLoading ? copy.shareCreating : shareToken ? copy.shareUpdate : copy.shareCreate}
          </button>

          {shareToken ? (
            <button
              type="button"
              onClick={copyShareLink}
              disabled={isShareCopying}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
            >
              {isShareCopied ? copy.shareCopied : copy.shareCopy}
            </button>
          ) : null}
        </div>

        <div className="mt-4 rounded-[1.25rem] border border-dashed border-zinc-200 bg-white px-4 py-3">
          <p className="text-[0.72rem] font-medium tracking-[0.22em] text-zinc-400 uppercase">{copy.shareLinkLabel}</p>
          <p className={`mt-2 text-sm ${shareUrl ? "break-all text-zinc-700" : "text-zinc-400"}`}>
            {shareUrl || copy.shareLinkPlaceholder}
          </p>
        </div>

        {!shareToken ? (
          <p className="mt-3 text-xs leading-5 text-zinc-500">{copy.shareNoLinkBody}</p>
        ) : null}
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
