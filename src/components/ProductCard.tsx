"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { formatDiscountBadgePercent, resolvePerfumeCardPrice } from "@/lib/discounts";
import { formatCurrencyFromAzn } from "@/lib/currency";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { Perfume } from "@/types/catalog";

type ProductCardProps = {
  perfume: Perfume;
  locale?: Locale;
  sourceUrlOverride?: string;
  variantCount?: number;
};

type ShadowProfile = {
  width: number;
  bottom: number;
  blur: number;
  opacity: number;
};

const DEFAULT_SHADOW_PROFILE: ShadowProfile = {
  width: 34,
  bottom: 11,
  blur: 0.8,
  opacity: 1,
};

const SHADOW_OVERRIDES: Record<string, Partial<ShadowProfile>> = {
  "qafiya-2": { width: 22, bottom: 8.6, blur: 0.7, opacity: 0.9 },
  shadow: { width: 24, bottom: 9.2, blur: 0.7, opacity: 0.92 },
  "first-instinct": { width: 26, bottom: 9.2, blur: 0.75, opacity: 0.93 },
  "peonia-nobile": { width: 24, bottom: 8.8, blur: 0.75, opacity: 0.9 },
  "blu-mediterraneo-fico-di-amalfi": { width: 26, bottom: 9, blur: 0.75, opacity: 0.92 },
  "escada-collection": { width: 27, bottom: 13.8, blur: 0.7, opacity: 0.95 },
};

function getShadowProfile(slug: string): ShadowProfile {
  return {
    ...DEFAULT_SHADOW_PROFILE,
    ...(SHADOW_OVERRIDES[slug] ?? {}),
  };
}

export function ProductCard({ perfume, locale = "az", sourceUrlOverride, variantCount }: ProductCardProps) {
  const siteSettings = useSiteSettings();
  const { selectedCurrency } = useCurrency();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageCandidates = useMemo(() => {
    const encoded = encodeURIComponent(perfume.slug);
    const candidates = [
      `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.png`,
      `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.jpg`,
      `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.webp`,
      perfume.image,
      "/perfoumerlogo.png",
    ];

    return Array.from(new Set(candidates.map((item) => item?.trim()).filter(Boolean)));
  }, [perfume.slug, perfume.image]);
  const [imageCandidateIndex, setImageCandidateIndex] = useState(0);
  const t = getDictionary(locale, siteSettings);
  const shadowProfile = getShadowProfile(perfume.slug);
  const imageSrc = imageCandidates[imageCandidateIndex] || "/perfoumerlogo.png";
  const pricing = useMemo(() => resolvePerfumeCardPrice(perfume), [perfume]);
  const discountBadge = pricing.bestSavingsPercent !== null ? formatDiscountBadgePercent(pricing.bestSavingsPercent) : null;

  useEffect(() => {
    setImageCandidateIndex(0);
    setIsImageLoaded(false);
  }, [imageCandidates]);

  const shadowStyle = {
    "--shadow-width": `${shadowProfile.width}%`,
    "--shadow-bottom": `${shadowProfile.bottom}%`,
    "--shadow-blur": `${shadowProfile.blur}px`,
    "--shadow-opacity": `${shadowProfile.opacity}`,
  } as CSSProperties;

  const imageTransformStyle: CSSProperties = {
    transform: `scale(${(perfume as any).mediaScale ?? 1})`,
    transformOrigin: "center bottom",
  };

  const handleCardClick = () => {
    if (typeof window === "undefined") {
      return;
    }

    const sourceUrl =
      sourceUrlOverride ||
      `${window.location.pathname}${window.location.search}${window.location.hash}`;
    sessionStorage.setItem(
      "perfoumer:last-list-context",
      JSON.stringify({
        sourceUrl,
        scrollY: window.scrollY,
        timestamp: Date.now(),
      }),
    );
  };

  return (
    <Link
      href={{
        pathname: `/perfumes/${perfume.slug}`,
        query: { v: perfume.id },
      }}
      onClick={handleCardClick}
      className="product-card group relative block rounded-[1.45rem] bg-white p-2 shadow-sm ring-1 ring-zinc-200 sm:rounded-[1.9rem] sm:p-3 md:p-3.5 xl:p-4"
    >
      <div className="product-media relative overflow-hidden rounded-[1.05rem] sm:rounded-[1.5rem]">
        <div className="absolute left-2 top-2 z-20 flex flex-col gap-1.5">
          {variantCount && variantCount > 1 ? (
            <div className="w-fit rounded-full bg-white/92 px-2 py-0.5 text-[0.58rem] font-medium tracking-[0.14em] text-zinc-700 uppercase shadow-sm backdrop-blur">
              {t.productCard.variantBadge.replace("{count}", String(variantCount))}
            </div>
          ) : null}
          {discountBadge ? (
            <div className="discount-badge w-fit rounded-full bg-rose-500 px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.14em] text-white uppercase shadow-[0_10px_24px_rgba(225,29,72,0.28)]">
              {t.productCard.discountBadge.replace("{percent}", discountBadge)}
            </div>
          ) : null}
        </div>
        <div className="product-stage-gradient pointer-events-none absolute inset-x-0 bottom-0 h-14 sm:h-16 md:h-18" />
        <div
          className={[
            "absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.15)_10%,rgba(255,255,255,0.6)_35%,rgba(255,255,255,0.15)_60%)] bg-[length:220%_100%] transition-opacity duration-500",
            isImageLoaded ? "pointer-events-none opacity-0" : "animate-[catalogImageShimmer_1.3s_ease-in-out_infinite] opacity-100",
          ].join(" ")}
        />
        <div className="relative mx-auto h-36 w-full sm:h-48 md:h-48 lg:h-72">
          <div
            className="product-ground-shadow pointer-events-none absolute left-1/2 h-3 -translate-x-1/2 rounded-full sm:h-3.5 md:h-4"
            style={shadowStyle}
          />
          <Image
            src={imageSrc}
            alt={perfume.imageAlt || `${perfume.brand} ${perfume.name} ətiri`}
            fill
            sizes="(max-width: 639px) 44vw, (max-width: 1023px) 42vw, (max-width: 1279px) 28vw, 22vw"
            quality={70}
            className={[
              "product-image object-contain object-bottom transition-opacity duration-500",
              isImageLoaded ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={imageTransformStyle}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              if (imageCandidateIndex < imageCandidates.length - 1) {
                setImageCandidateIndex((prev) => prev + 1);
                setIsImageLoaded(false);
              } else {
                setIsImageLoaded(true);
              }
            }}
          />
        </div>
      </div>
      <div className="px-1 pt-2.5 transition-transform duration-300 md:group-hover:-translate-y-0.5 sm:pt-3 md:pt-3.5">
        <h3 className="line-clamp-2 text-sm leading-tight font-medium text-zinc-900 transition-colors duration-300 md:group-hover:text-zinc-800 sm:text-lg md:text-[1.05rem] xl:text-xl">
          {perfume.name}
        </h3>
        {pricing.hasVisibleSavings && pricing.originalPrice !== null && pricing.finalPrice !== null ? (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[0.72rem] text-zinc-500 transition-colors duration-300 md:group-hover:text-zinc-500 sm:text-sm md:text-[0.78rem]">
            <span className="text-zinc-400 line-through">
              {formatCurrencyFromAzn(pricing.originalPrice, selectedCurrency, locale)}
            </span>
            <span className="font-semibold text-zinc-900">
              {formatCurrencyFromAzn(pricing.finalPrice, selectedCurrency, locale)}
            </span>
            <span>/ {t.productCard.starting}</span>
          </div>
        ) : pricing.finalPrice !== null ? (
          <p className="mt-1 text-[0.72rem] text-zinc-500 transition-colors duration-300 md:group-hover:text-zinc-500 sm:text-sm md:text-[0.78rem]">
            {`${formatCurrencyFromAzn(pricing.finalPrice, selectedCurrency, locale)} / ${t.productCard.starting}`}
          </p>
        ) : (
          <p className="mt-1 text-[0.72rem] text-zinc-500 transition-colors duration-300 md:group-hover:text-zinc-500 sm:text-sm md:text-[0.78rem]">
            {t.productCard.quote}
          </p>
        )}
      </div>
    </Link>
  );
}
