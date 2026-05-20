"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { resolveDiscountedSizePrice } from "@/lib/discounts";
import { formatCurrencyFromAzn } from "@/lib/currency";
import { getDictionary, toLocalePath, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";
import type { PerfumeDiscount, PerfumeSize } from "@/types/catalog";

type PerfumePurchasePanelProps = {
  locale: Locale;
  perfumeSlug: string;
  perfumeName: string;
  variantId?: string | null;
  sizes: PerfumeSize[];
  discount?: PerfumeDiscount | null;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  selectedSize: string;
  bestValue: string;
  perMl: string;
  addToCart: string;
  inquiry: string;
  adding: string;
  added: string;
  addFailed: string;
  cart: string;
  signInToSave: string;
  configMissing: string;
  inquiryNoPrice: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    selectedSize: "Seçilən ölçü",
    bestValue: "Sərfəli",
    perMl: "1ml qiymət",
    addToCart: "Səbətə əlavə et",
    inquiry: "Bizə mesaj göndər",
    adding: "Əlavə olunur...",
    added: "Məhsul seçilən ölçü ilə səbətə əlavə olundu.",
    addFailed: "Səbətə əlavə etmək alınmadı. Yenidən cəhd et.",
    cart: "Səbətə keç",
    signInToSave: "Səbət üçün giriş et",
    configMissing: "Səbəti saxlamaq üçün Supabase konfiqurasiyası tələb olunur.",
    inquiryNoPrice: "Salam! Bu məhsul haqqında məlumat paylaşa bilərsiniz?",
  },
  en: {
    selectedSize: "Selected size",
    bestValue: "Best value",
    perMl: "Price per 1ml",
    addToCart: "Add to cart",
    inquiry: "Send inquiry",
    adding: "Adding...",
    added: "Added to cart with selected size.",
    addFailed: "Could not add to cart. Please try again.",
    cart: "Go to cart",
    signInToSave: "Sign in to save cart",
    configMissing: "Supabase configuration is required for cart storage.",
    inquiryNoPrice: "Hi! Could you share more information about this product?",
  },
  ru: {
    selectedSize: "Выбранный объем",
    bestValue: "Выгодно",
    perMl: "Цена за 1мл",
    addToCart: "Добавить в корзину",
    inquiry: "Отправить запрос",
    adding: "Добавляем...",
    added: "Товар добавлен в корзину с выбранным объемом.",
    addFailed: "Не удалось добавить в корзину. Попробуйте снова.",
    cart: "Перейти в корзину",
    signInToSave: "Войдите для сохранения корзины",
    configMissing: "Для сохранения корзины нужна настройка Supabase.",
    inquiryNoPrice: "Здравствуйте! Можете поделиться дополнительной информацией об этом товаре?",
  },
};

export function PerfumePurchasePanel({
  locale,
  perfumeSlug,
  perfumeName,
  variantId,
  sizes,
  discount,
  supabase: supabaseConfig,
}: PerfumePurchasePanelProps) {
  const siteSettings = useSiteSettings();
  const t = getDictionary(locale, siteSettings);
  const copy = copyByLocale[locale];
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const { selectedCurrency } = useCurrency();

  const [selectedMl, setSelectedMl] = useState<number | null>(() => sizes[0]?.ml ?? null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const addLockRef = useRef(false);

  const emitCartUpdated = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new Event("perfoumer:cart-updated"));
  };

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
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const normalizedSelectedMl =
    selectedMl && sizes.some((item) => item.ml === selectedMl) ? selectedMl : sizes[0]?.ml ?? null;

  const selectedSize = useMemo(
    () => sizes.find((size) => size.ml === normalizedSelectedMl) ?? null,
    [normalizedSelectedMl, sizes],
  );
  const selectedSizePricing = useMemo(
    () => (selectedSize ? resolveDiscountedSizePrice(selectedSize, discount) : null),
    [discount, selectedSize],
  );
  const maxMl = useMemo(
    () => Math.max(...sizes.map((size) => size.ml), 1),
    [sizes],
  );

  const inquiryHref = useMemo(() => {
    const phone = "994507078070";
    const variantQuery = variantId ? `?v=${encodeURIComponent(variantId)}` : "";
    const absoluteProductUrl = `https://perfoumer.az/perfumes/${perfumeSlug}${variantQuery}`;
    const hasPriceInCatalog = sizes.some((size) => Number.isFinite(size.price) && size.price > 0);
    const localizedPrompt = hasPriceInCatalog
      ? locale === "az"
        ? "Salam! Bu məhsul üçün qiymət və mövcudluq barədə məlumat almaq istəyirəm"
        : locale === "ru"
          ? "Здравствуйте! Хочу уточнить цену и наличие этого товара"
          : "Hi! I would like to ask about price and availability for this product"
      : copy.inquiryNoPrice;

    const message = `${localizedPrompt}: ${perfumeName} (${absoluteProductUrl})`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }, [copy.inquiryNoPrice, locale, perfumeName, perfumeSlug, sizes, variantId]);

  const bestValueMl = useMemo(() => {
    if (!sizes.length) {
      return null;
    }

    return sizes.reduce((best, candidate) => {
      const bestPrice = resolveDiscountedSizePrice(best, discount).finalPrice / best.ml;
      const candidatePrice = resolveDiscountedSizePrice(candidate, discount).finalPrice / candidate.ml;
      return candidatePrice < bestPrice ? candidate : best;
    }).ml;
  }, [discount, sizes]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  const addToCart = async (redirectToCart = false) => {
    if (!selectedSize) {
      return;
    }

    if (!isSupabaseConfigured(supabaseConfig ?? undefined) || !supabase) {
      setMessage({ text: copy.configMissing, tone: "error" });
      return;
    }

    if (isSubmitting || addLockRef.current) {
      return;
    }

    if (!session?.user) {
      const nextPath = pathname || `/perfumes/${perfumeSlug}`;
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    addLockRef.current = true;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const { data: existingRows, error: selectError } = await supabase
        .from("cart_items")
        .select("id,quantity,created_at")
        .eq("user_id", session.user.id)
        .eq("perfume_slug", perfumeSlug)
        .eq("size_ml", selectedSize.ml)
        .order("created_at", { ascending: true });

      if (selectError) {
        setMessage({ text: selectError.message || copy.addFailed, tone: "error" });
        return;
      }

      const rows = ((existingRows as { id?: string; quantity?: number }[] | null) ?? []).filter(
        (row) => Boolean(row.id),
      );
      const primaryRow = rows[0] ?? null;
      const existingQuantity = rows.reduce(
        (sum, row) => sum + (Number.isFinite(row.quantity) ? Number(row.quantity) : 0),
        0,
      );
      const nextQuantity = Math.max(1, existingQuantity + 1);

      const result = primaryRow?.id
        ? await supabase
            .from("cart_items")
            .update({
              quantity: nextQuantity,
              unit_price: selectedSizePricing?.finalPrice ?? selectedSize.price,
            })
            .eq("id", primaryRow.id)
            .eq("user_id", session.user.id)
        : await supabase.from("cart_items").insert({
            user_id: session.user.id,
            perfume_slug: perfumeSlug,
            size_ml: selectedSize.ml,
            quantity: 1,
            unit_price: selectedSizePricing?.finalPrice ?? selectedSize.price,
          });

      if (result.error) {
        setMessage({ text: result.error.message || copy.addFailed, tone: "error" });
        return;
      }

      if (rows.length > 1 && primaryRow?.id) {
        const duplicateIds = rows
          .slice(1)
          .map((row) => row.id)
          .filter((id): id is string => Boolean(id));

        if (duplicateIds.length > 0) {
          await supabase
            .from("cart_items")
            .delete()
            .in("id", duplicateIds)
            .eq("user_id", session.user.id);
        }
      }

      setMessage({ text: copy.added, tone: "success" });
      emitCartUpdated();

      if (redirectToCart) {
        router.push(toLocalePath("/cart", locale));
      }
    } finally {
      setIsSubmitting(false);
      addLockRef.current = false;
    }
  };

  return (
    <div className="space-y-4">
      {sizes.length ? (
        <div className="overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4 md:px-6">
            <p className="text-[0.72rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">
              {t.detail.sizePrice}
            </p>
            {selectedSize ? (
              <p className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[0.78rem] font-medium tracking-[0.02em] text-zinc-700">
                {copy.selectedSize}: {selectedSize.ml}ml
              </p>
            ) : (
              <p className="hidden text-sm text-zinc-500 md:block">{t.detail.choose}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 md:gap-3 md:p-4">
            {sizes.map((size) => {
              const isSelected = selectedSize?.ml === size.ml;
              const isBestValue = bestValueMl === size.ml;
              const fillLevel = Math.max(16, Math.round((size.ml / maxMl) * 100));
              const perMlPrice = Math.round((size.price / size.ml) * 100) / 100;
              const imageFrameClass =
                size.ml >= 50
                  ? "h-[66px] w-[48px] md:h-[108px] md:w-[82px]"
                  : size.ml >= 30
                    ? "h-[62px] w-[45px] md:h-[100px] md:w-[74px]"
                    : "h-[58px] w-[42px] md:h-[92px] md:w-[66px]";
              const sizeImage =
                size.ml === 15
                  ? "/15mlperfoumer.png"
                  : size.ml === 30 || size.ml === 50
                    ? "/30mlperfoumer.png"
                    : "/perfoumerjar.png";

              return (
                <button
                  key={size.ml}
                  type="button"
                  onClick={() => setSelectedMl(size.ml)}
                  className={[
                    "group relative overflow-hidden rounded-[0.95rem] border p-2 text-left transition-colors duration-200 md:rounded-[1.1rem] md:p-3",
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-zinc-100"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white",
                  ].join(" ")}
                  aria-pressed={isSelected}
                >
                  <div className="relative flex items-start justify-between gap-1 md:gap-2">
                    <div className="flex items-start justify-between gap-1 md:gap-2">
                      <div>
                        <p
                          className={[
                            "text-[0.96rem] leading-none tracking-[-0.03em] font-[family-name:var(--font-playfair)] md:text-[1.22rem]",
                            isSelected ? "text-zinc-100" : "text-zinc-900",
                          ].join(" ")}
                        >
                          <span className="font-semibold">{size.ml}</span>
                          <span className={isSelected ? "ml-1 text-zinc-300" : "ml-1 text-zinc-500"}>ml</span>
                        </p>
                      </div>

                      {isBestValue ? (
                        <span
                          className={[
                            "hidden rounded-full px-2 py-1 text-[0.58rem] font-medium tracking-[0.14em] uppercase md:inline-flex",
                            isSelected ? "bg-white/12 text-zinc-200" : "bg-zinc-200 text-zinc-700",
                          ].join(" ")}
                        >
                          {copy.bestValue}
                        </span>
                      ) : null}
                    </div>

                    <div className={["relative shrink-0", imageFrameClass].join(" ")}>
                      <span
                        aria-hidden="true"
                        className={[
                          "absolute left-1/2 bottom-0 h-2 w-[78%] -translate-x-1/2 rounded-full blur-[1px]",
                          isSelected ? "bg-black/50" : "bg-zinc-500/20",
                        ].join(" ")}
                      />
                      <Image
                        src={sizeImage}
                        alt={siteSettings.siteName}
                        fill
                        sizes="(max-width: 767px) 52px, 96px"
                        unoptimized
                        className={[
                          "object-contain object-bottom drop-shadow-[0_6px_10px_rgba(19,14,10,0.18)] transition-all duration-200 md:drop-shadow-[0_10px_14px_rgba(19,14,10,0.2)]",
                          isSelected ? "scale-[1.02] opacity-100" : "opacity-90 group-hover:opacity-100",
                        ].join(" ")}
                      />
                    </div>
                  </div>

                  <div className="relative mt-1.5 md:mt-2.5">
                    <p className="text-[1.18rem] leading-none tracking-[-0.05em] font-[family-name:var(--font-playfair)] md:text-[1.74rem]">
                      {(() => {
                        const pricing = resolveDiscountedSizePrice(size, discount);

                        if (pricing.finalPrice < pricing.originalPrice) {
                          return (
                            <span className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5">
                              <span className={isSelected ? "text-zinc-300 line-through" : "text-zinc-400 line-through"}>
                                {formatCurrencyFromAzn(pricing.originalPrice, selectedCurrency, locale)}
                              </span>
                              <span className={isSelected ? "text-zinc-100" : "text-zinc-900"}>
                                {formatCurrencyFromAzn(pricing.finalPrice, selectedCurrency, locale)}
                              </span>
                            </span>
                          );
                        }

                        return formatCurrencyFromAzn(size.price, selectedCurrency, locale);
                      })()}
                    </p>
                    <p className={["mt-1 hidden text-[0.68rem] md:block", isSelected ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                      {copy.perMl}: {formatCurrencyFromAzn(perMlPrice, selectedCurrency, locale)}
                    </p>

                    <div
                      className={[
                        "mt-2 h-1 overflow-hidden rounded-full md:mt-3 md:h-2",
                        isSelected ? "bg-white/20" : "bg-zinc-200",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "block h-full rounded-full transition-all duration-500",
                          isSelected ? "bg-zinc-100" : "bg-zinc-500",
                        ].join(" ")}
                        style={{ width: `${fillLevel}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-zinc-500">{t.detail.noPrice}</div>
      )}

      {selectedSize ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              void addToCart(false);
            }}
            disabled={isSubmitting}
            className="inline-flex min-h-13 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-lg font-semibold text-zinc-900 shadow-[0_8px_22px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] active:translate-y-0 active:bg-zinc-100 active:shadow-[0_7px_16px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-zinc-300 disabled:hover:bg-white disabled:hover:text-zinc-900 disabled:hover:shadow-[0_8px_22px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]"
          >
            <span className="inline-flex items-center gap-2">
              <span>{isSubmitting ? copy.adding : copy.addToCart}</span>
              {selectedSizePricing && selectedSizePricing.finalPrice < selectedSizePricing.originalPrice ? (
                <span className="discount-badge discount-badge--soft inline-flex rounded-full bg-rose-500/12 px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.12em] text-rose-600 uppercase">
                  -{Math.round(selectedSizePricing.savingsPercent)}%
                </span>
              ) : null}
            </span>
          </button>

          <a
            href={inquiryHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-full border border-black bg-black px-6 text-lg font-semibold text-white shadow-[0_8px_22px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-transparent hover:text-black hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] active:translate-y-0 active:bg-black active:text-white active:shadow-[0_7px_18px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            <WhatsappLogo size={20} weight="fill" aria-hidden="true" />
            <span>{copy.inquiry}</span>
          </a>
        </div>
      ) : (
        <a
          href={inquiryHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-full border border-black bg-black px-6 text-lg font-semibold text-white shadow-[0_8px_22px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-transparent hover:text-black hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] active:translate-y-0 active:bg-black active:text-white active:shadow-[0_7px_18px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        >
          <WhatsappLogo size={20} weight="fill" aria-hidden="true" />
          <span>{copy.inquiry}</span>
        </a>
      )}

      {message ? (
        <p className={message.tone === "success" ? "text-sm text-emerald-700" : "text-sm text-red-600"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
