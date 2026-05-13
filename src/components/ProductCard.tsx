"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { formatCurrencyFromAzn } from "@/lib/currency";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { Perfume } from "@/types/catalog";

type ProductCardProps = {
  perfume: Perfume;
  locale?: Locale;
  sourceUrlOverride?: string;
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

export function ProductCard({ perfume, locale = "az", sourceUrlOverride }: ProductCardProps) {
  const siteSettings = useSiteSettings();
  const startingPrice = perfume.sizes[0]?.price;
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
      className="product-card group relative block rounded-[1.65rem] bg-white p-2.5 shadow-sm ring-1 ring-zinc-200 sm:rounded-3xl sm:p-4"
    >
      <div className="product-media relative overflow-hidden rounded-[1.2rem] sm:rounded-2xl">
        <div className="product-stage-gradient pointer-events-none absolute inset-x-0 bottom-0 h-16 sm:h-20" />
        <div
          className={[
            "absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.15)_10%,rgba(255,255,255,0.6)_35%,rgba(255,255,255,0.15)_60%)] bg-[length:220%_100%] transition-opacity duration-500",
            isImageLoaded ? "pointer-events-none opacity-0" : "animate-[catalogImageShimmer_1.3s_ease-in-out_infinite] opacity-100",
          ].join(" ")}
        />
        <div className="relative mx-auto h-40 w-full sm:h-56 lg:h-72">
          <div
            className="product-ground-shadow pointer-events-none absolute left-1/2 h-3 -translate-x-1/2 rounded-full sm:h-4"
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
      <div className="px-1 pt-3 transition-transform duration-300 md:group-hover:-translate-y-0.5 sm:pt-4">
        <h3 className="line-clamp-2 text-base leading-tight font-medium text-zinc-900 transition-colors duration-300 md:group-hover:text-zinc-800 sm:text-xl">
          {perfume.name}
        </h3>
        <p className="mt-1 text-xs text-zinc-500 transition-colors duration-300 md:group-hover:text-zinc-500 sm:text-sm">
          {startingPrice
            ? `${formatCurrencyFromAzn(startingPrice, selectedCurrency, locale)} / ${t.productCard.starting}`
            : t.productCard.quote}
        </p>
      </div>
    </Link>
  );
}
