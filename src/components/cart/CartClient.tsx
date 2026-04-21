"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatCurrencyFromAzn } from "@/lib/currency";
import { toLocalePath, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CartItemRow } from "@/types/cart";

function parsePrice(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type CartClientProps = {
  perfumes: any[];
  locale: Locale;
  supabase?: any;
};

type CartCopy = {
  loading: string;
  signInTitle: string;
  signInBody: string;
  signInAction: string;
  emptyTitle: string;
  emptyBody: string;
  browseCatalog: string;
  each: string;
  subtotal: string;
  shipping: string;
  shippingFree: string;
  total: string;
  checkout: string;
  continueShopping: string;
  remove: string;
  items: string;
  ml: string;
  orderSummary: string;
};

const copyByLocale: Record<Locale, CartCopy> = {
  az: {
    loading: "Yüklənir...",
    signInTitle: "Səbətə baxmaq üçün giriş et",
    signInBody: "Seçdiyin ətirləri saxlamaq və sifarişi tamamlamaq üçün hesabına daxil ol.",
    signInAction: "Giriş et",
    emptyTitle: "Səbətin hələ boşdur",
    emptyBody: "Kataloqdan seçim et və burada sifarişini formalaşdır.",
    browseCatalog: "Kataloqa keç",
    each: "hər biri",
    subtotal: "Ara cəmi",
    shipping: "Çatdırılma",
    shippingFree: "Pulsuz",
    total: "Ümumi",
    checkout: "Ödənişə keç",
    continueShopping: "Alışverişə davam et",
    remove: "Sil",
    items: "məhsul",
    ml: "ml",
    orderSummary: "Sifariş xülasəsi",
  },
  en: {
    loading: "Loading...",
    signInTitle: "Sign in to view your cart",
    signInBody: "Log in to keep your selections and continue checkout.",
    signInAction: "Sign in",
    emptyTitle: "Your cart is still empty",
    emptyBody: "Pick your fragrances from the catalog and build your order here.",
    browseCatalog: "Browse catalog",
    each: "each",
    subtotal: "Subtotal",
    shipping: "Shipping",
    shippingFree: "Free",
    total: "Total",
    checkout: "Checkout",
    continueShopping: "Continue shopping",
    remove: "Remove",
    items: "items",
    ml: "ml",
    orderSummary: "Order summary",
  },
  ru: {
    loading: "Zagruzka...",
    signInTitle: "Voidite, chtoby uvidet korzinu",
    signInBody: "Voidite v akkaunt, chtoby sohranyat vybory i prodolzhit oplatu.",
    signInAction: "Voiti",
    emptyTitle: "Korzina poka pustaya",
    emptyBody: "Vyberite aromaty v kataloge i soberite zakaz zdes.",
    browseCatalog: "Pereiti v katalog",
    each: "za shtuku",
    subtotal: "Poditog",
    shipping: "Dostavka",
    shippingFree: "Besplatno",
    total: "Itogo",
    checkout: "Pereiti k oplate",
    continueShopping: "Prodolzhit pokupki",
    remove: "Udalit",
    items: "poziciy",
    ml: "ml",
    orderSummary: "Svodka zakaza",
  },
};

export function CartClient({ perfumes, locale, supabase: supabaseConfig }: CartClientProps) {
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const copy = copyByLocale[locale];
  const { selectedCurrency } = useCurrency();

  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(() => Boolean(supabase));
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [cartRows, setCartRows] = useState<CartItemRow[]>([]);
  const [message, setMessage] = useState("");
  const [busyItemId, setBusyItemId] = useState("");

  const emitCartUpdated = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("perfoumer:cart-updated"));
  };

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    supabase.auth.getSession().then(({ data }: { data: any }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (!nextSession) {
        setCartRows([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user) return;

    let isMounted = true;

    const loadCart = async () => {
      setIsCartLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("cart_items")
        .select("id,user_id,perfume_slug,size_ml,quantity,unit_price,created_at,updated_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setMessage(error.message || "An error occurred.");
        setCartRows([]);
      } else {
        setCartRows((data as CartItemRow[] | null) ?? []);
      }

      setIsCartLoading(false);
    };

    void loadCart();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || typeof window === "undefined") return;

    let isMounted = true;

    const reloadCartFromEvent = async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id,user_id,perfume_slug,size_ml,quantity,unit_price,created_at,updated_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setMessage(error.message || "An error occurred.");
        return;
      }

      setCartRows((data as CartItemRow[] | null) ?? []);
    };

    const onCartUpdated = () => {
      void reloadCartFromEvent();
    };

    window.addEventListener("perfoumer:cart-updated", onCartUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("perfoumer:cart-updated", onCartUpdated);
    };
  }, [supabase, session?.user?.id]);

  const perfumesBySlug = useMemo(() => new Map(perfumes.map((perfume) => [perfume.slug, perfume])), [perfumes]);

  const items = useMemo(
    () =>
      cartRows.map((row) => {
        const perfume = perfumesBySlug.get(row.perfume_slug) ?? null;
        const catalogPrice = perfume?.sizes?.find((size: any) => size.ml === row.size_ml)?.price ?? 0;
        const unitPrice = parsePrice(String(row.unit_price)) || catalogPrice;
        const quantity = Number.isFinite(row.quantity) ? row.quantity : 1;

        return {
          row,
          perfume,
          unitPrice,
          quantity,
          lineTotal: Math.round(unitPrice * quantity * 100) / 100,
        };
      }),
    [cartRows, perfumesBySlug],
  );

  const subtotal = useMemo(
    () => Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100,
    [items],
  );

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  useEffect(() => {
    if (!session?.access_token || !session?.user?.id) return;
    if (!session?.user?.email) return;
    if (!items.length) return;

    const payload = {
      locale,
      source: "cart",
      recoveryChannel: "email",
      email: session.user.email || "",
      phone: "",
      subtotal,
      items: items.map((item) => ({
        perfume_slug: item.row.perfume_slug,
        perfume_name: item.perfume?.name || item.row.perfume_slug,
        size_ml: item.row.size_ml,
        quantity: item.quantity,
        line_total: item.lineTotal,
      })),
    };

    const signature = JSON.stringify(payload);
    const dedupeKey = `perfoumer.abandoned-recovery.${session.user.id}`;
    if (typeof window !== "undefined") {
      const prev = window.localStorage.getItem(dedupeKey);
      if (prev === signature) {
        return;
      }
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/checkout/abandoned-recovery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          return;
        }

        if (typeof window !== "undefined") {
          window.localStorage.setItem(dedupeKey, signature);
        }
      } catch {
        // Ignore transient recovery queue errors in cart UI.
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [items, locale, session?.access_token, session?.user?.email, session?.user?.id, subtotal]);

  const updateQuantity = async (row: CartItemRow, nextQuantity: number) => {
    if (!supabase || !session?.user || busyItemId) return;

    setBusyItemId(row.id);

    if (nextQuantity <= 0) {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", row.id)
        .eq("user_id", session.user.id);

      if (error) {
        setMessage(error.message || "An error occurred.");
      } else {
        setCartRows((prev) => prev.filter((item) => item.id !== row.id));
        emitCartUpdated();
      }

      setBusyItemId("");
      return;
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: nextQuantity })
      .eq("id", row.id)
      .eq("user_id", session.user.id);

    if (error) {
      setMessage(error.message || "An error occurred.");
    } else {
      setCartRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, quantity: nextQuantity } : item)));
      emitCartUpdated();
    }

    setBusyItemId("");
  };

  if (isSessionLoading) {
    return (
      <div className="rounded-[2rem] border border-zinc-200/80 bg-white/85 p-8 text-zinc-500 shadow-[0_18px_42px_rgba(24,24,24,0.06)]">
        {copy.loading}
      </div>
    );
  }

  if (!session) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/85 bg-[linear-gradient(155deg,#ffffff_0%,#f8f8f7_56%,#f0f0ee_100%)] p-7 shadow-[0_24px_56px_rgba(24,24,24,0.08)] md:p-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,#e9e9e7_0%,rgba(233,233,231,0)_70%)]" />
        <div className="pointer-events-none absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,#efefed_0%,rgba(239,239,237,0)_72%)]" />

        <div className="relative max-w-xl">
          <p className="text-[0.72rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Perfoumer</p>
          <h2 className="mt-2 text-[2rem] leading-[0.95] tracking-[-0.035em] text-zinc-900 md:text-[2.5rem]">
            {copy.signInTitle}
          </h2>
          <p className="mt-3 text-zinc-600">{copy.signInBody}</p>

          <Link
            href={`${toLocalePath("/login", locale)}?next=${encodeURIComponent(toLocalePath("/cart", locale))}`}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-6 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
          >
            {copy.signInAction}
          </Link>
        </div>
      </section>
    );
  }

  if (!isCartLoading && items.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/85 bg-[linear-gradient(160deg,#ffffff_0%,#f8f8f7_52%,#f1f1ef_100%)] p-7 shadow-[0_24px_58px_rgba(24,24,24,0.07)] md:p-10">
        <div className="pointer-events-none absolute -left-12 top-6 h-36 w-36 rounded-full bg-[radial-gradient(circle,#ededeb_0%,rgba(237,237,235,0)_72%)]" />
        <div className="relative">
          <p className="text-[0.72rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Cart</p>
          <h2 className="mt-2 text-[2rem] leading-[0.95] tracking-[-0.035em] text-zinc-900 md:text-[2.6rem]">{copy.emptyTitle}</h2>
          <p className="mt-3 max-w-2xl text-zinc-600">{copy.emptyBody}</p>

          <Link
            href={toLocalePath("/catalog", locale)}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-800 transition hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-100"
          >
            {copy.browseCatalog}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 md:space-y-6">
      {isCartLoading ? (
        <div className="rounded-[1.7rem] border border-zinc-200/80 bg-white/80 p-6 text-zinc-500 shadow-[0_14px_34px_rgba(24,24,24,0.05)]">
          {copy.loading}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-3">
          {items.map(({ row, perfume, unitPrice, quantity, lineTotal }) => {
            const isBusy = busyItemId === row.id;

            return (
              <article
                key={row.id}
                className="group relative overflow-hidden rounded-[1.6rem] border border-zinc-200/85 bg-[linear-gradient(155deg,#ffffff_0%,#fbfbfa_56%,#f3f3f1_100%)] p-3 shadow-[0_14px_34px_rgba(24,24,24,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(24,24,24,0.1)] md:p-4"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,#efefee_0%,rgba(239,239,238,0)_74%)]" />

                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100/60">
                      {perfume?.image ? (
                        <Image
                          src={perfume.image}
                          alt={perfume.name ?? row.perfume_slug}
                          fill
                          sizes="96px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs font-medium text-zinc-400 uppercase">
                          Perfoumer
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[1.05rem] font-medium tracking-[-0.01em] text-zinc-900 md:text-[1.2rem]">
                        {perfume?.name || row.perfume_slug}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {row.size_ml} {copy.ml} • {formatCurrencyFromAzn(unitPrice, selectedCurrency, locale)} {copy.each}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/85 bg-white/90 p-2.5 sm:min-w-[214px] sm:justify-end sm:gap-4">
                    <div className="flex items-center gap-1 rounded-full border border-zinc-300/80 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(row, quantity - 1)}
                        disabled={isBusy}
                        className="h-8 w-8 rounded-full text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <span className="grid h-full w-full place-items-center">-</span>
                      </button>
                      <span className="inline-flex min-w-8 justify-center text-sm font-medium tabular-nums text-zinc-800">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(row, quantity + 1)}
                        disabled={isBusy}
                        className="h-8 w-8 rounded-full text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Increase quantity"
                      >
                        <span className="grid h-full w-full place-items-center">+</span>
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-[1.08rem] font-semibold tracking-[-0.02em] tabular-nums text-zinc-900">
                        {formatCurrencyFromAzn(lineTotal, selectedCurrency, locale)}
                      </p>
                      <button
                        type="button"
                        onClick={() => updateQuantity(row, 0)}
                        disabled={isBusy}
                        className="mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.remove}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="h-fit rounded-[1.7rem] border border-zinc-200/85 bg-[linear-gradient(160deg,#ffffff_0%,#f8f8f7_52%,#f1f1ef_100%)] p-5 shadow-[0_20px_44px_rgba(24,24,24,0.08)] xl:sticky xl:top-24">
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{copy.orderSummary}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {totalCount} {copy.items}
          </p>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center justify-between text-zinc-600">
              <span>{copy.subtotal}</span>
              <span>{formatCurrencyFromAzn(subtotal, selectedCurrency, locale)}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-600">
              <span>{copy.shipping}</span>
              <span>{copy.shippingFree}</span>
            </div>
            <div className="mt-3 h-px bg-zinc-200" />
            <div className="flex items-center justify-between text-base font-semibold tracking-[-0.01em] text-zinc-900">
              <span>{copy.total}</span>
              <span>{formatCurrencyFromAzn(subtotal, selectedCurrency, locale)}</span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <Link
              href={toLocalePath("/checkout", locale)}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-6 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
            >
              {copy.checkout}
            </Link>

            <Link
              href={toLocalePath("/catalog", locale)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100"
            >
              {copy.continueShopping}
            </Link>
          </div>
        </aside>
      </div>

      {message ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}
    </section>
  );
}
