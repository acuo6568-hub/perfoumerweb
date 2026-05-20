"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "@phosphor-icons/react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { formatCurrencyFromAzn } from "@/lib/currency";
import { getDictionary, type Locale } from "@/lib/i18n";

type VariantItem = {
  id: string;
  slug: string;
  price: number;
};

type PerfumeVariantStripProps = {
  locale: Locale;
  variants: VariantItem[];
  currentVariantId: string;
  variantsLabel: string;
  variantsAvailableLabel: string;
  currentLabel: string;
};

export function PerfumeVariantStrip({
  locale,
  variants,
  currentVariantId,
  variantsLabel,
  variantsAvailableLabel,
  currentLabel,
}: PerfumeVariantStripProps) {
  const siteSettings = useSiteSettings();
  const t = getDictionary(locale, siteSettings);
  const { selectedCurrency } = useCurrency();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  if (variants.length <= 1) {
    return null;
  }

  const openModal = () => {
    setIsMounted(true);
    window.setTimeout(() => {
      setIsVisible(true);
    }, 10);
  };

  const closeModal = () => {
    setIsVisible(false);
    window.setTimeout(() => {
      setIsMounted(false);
    }, 220);
  };

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMounted]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-[0.62rem] font-medium tracking-[0.18em] text-zinc-500 uppercase">
          {variantsLabel}
        </span>
        <span className="text-sm text-zinc-500">{variantsAvailableLabel}</span>
        <button
          type="button"
          onClick={openModal}
          onTouchStart={openModal}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[0.62rem] font-medium tracking-[0.14em] text-zinc-600 uppercase transition-colors duration-300 hover:border-zinc-300 hover:text-zinc-900"
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
        >
          <Info size={12} weight="fill" />
          {t.detail.variantInfoButton}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {variants.map((variant) => {
          const isActive = variant.id === currentVariantId;

          return (
            <Link
              key={variant.id}
              href={{
                pathname: `/perfumes/${variant.slug}`,
                query: { v: variant.id },
              }}
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex min-w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-300",
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_10px_22px_rgba(24,24,24,0.14)]"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900",
              ].join(" ")}
            >
              <span className="whitespace-nowrap">
                {formatCurrencyFromAzn(variant.price, selectedCurrency, locale)}
              </span>
              {isActive ? (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.62rem] font-semibold tracking-[0.12em] uppercase">
                  {currentLabel}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {isMounted && typeof document !== "undefined"
        ? createPortal(
            <div
              className={[
                "fixed inset-0 z-[130] flex items-end justify-center bg-zinc-900/35 px-0 backdrop-blur-[2px] transition-all duration-200 sm:items-center sm:px-4",
                isVisible ? "opacity-100" : "opacity-0",
              ].join(" ")}
              role="dialog"
              aria-modal="true"
              onClick={closeModal}
            >
              <div
                className={[
                  "w-full rounded-t-3xl border border-zinc-200 bg-white p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_28px_64px_rgba(18,18,18,0.24)] transition-all duration-220 sm:max-w-md sm:rounded-3xl sm:pb-6",
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 sm:translate-y-2",
                ].join(" ")}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.78rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
                      {t.detail.variantInfoEyebrow}
                    </p>
                    <h3 className="mt-2 text-[1.65rem] leading-[1.02] tracking-[-0.03em] text-zinc-900 sm:text-[1.9rem]">
                      {t.detail.variantInfoTitle}
                    </h3>
                  </div>

                  <button
                    type="button"
                    aria-label={t.detail.close}
                    onClick={closeModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors duration-300 hover:text-zinc-900"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-5 py-4">
                  <p className="text-sm leading-7 text-zinc-600 sm:text-base">{t.detail.variantInfoBody}</p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}