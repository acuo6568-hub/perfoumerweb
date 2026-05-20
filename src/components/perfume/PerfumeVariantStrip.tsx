"use client";

import Link from "next/link";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatCurrencyFromAzn } from "@/lib/currency";
import type { Locale } from "@/lib/i18n";

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
  const { selectedCurrency } = useCurrency();

  if (variants.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-[0.62rem] font-medium tracking-[0.18em] text-zinc-500 uppercase">
          {variantsLabel}
        </span>
        <span className="text-sm text-zinc-500">{variantsAvailableLabel}</span>
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
                {formatCurrencyFromAzn(variant.price, selectedCurrency, locale, { maximumFractionDigits: 0 })}
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
    </div>
  );
}