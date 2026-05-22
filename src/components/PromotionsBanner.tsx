"use client";

import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { useMemo } from "react";

import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { getDictionary, toLocalePath, type Locale } from "@/lib/i18n";
import { getPromotionLinkLabelForLocale, getPromotionTextForLocale } from "@/lib/site-branding";

type PromotionsBannerProps = {
  locale: Locale;
  visible: boolean;
  onClose: () => void;
};

function getTrackItems(text: string, linkLabel: string) {
  const baseLabel = linkLabel.trim();
  return Array.from({ length: 5 }, (_, index) => (
    <span key={`${index}-${text}`} className="inline-flex items-center gap-3 whitespace-nowrap">
      <span className="font-semibold tracking-[0.22em] uppercase">{text}</span>
      {baseLabel ? (
        <span className="rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[0.64rem] font-semibold tracking-[0.18em] uppercase text-inherit">
          {baseLabel}
        </span>
      ) : null}
      <span className="opacity-60">•</span>
    </span>
  ));
}

export function PromotionsBanner({ locale, visible, onClose }: PromotionsBannerProps) {
  const siteSettings = useSiteSettings();
  const t = getDictionary(locale, siteSettings);
  const promotion = siteSettings.promotions;

  const bannerHref = promotion.linkHref.trim() ? toLocalePath(promotion.linkHref, locale) : "";
  const content = getPromotionTextForLocale(promotion, locale).trim();
  const linkLabel = getPromotionLinkLabelForLocale(promotion, locale).trim() || t.promoBanner.viewOffer;
  const trackItems = useMemo(() => getTrackItems(content, bannerHref ? linkLabel : ""), [bannerHref, content, linkLabel]);

  if (!visible || !promotion.enabled || !content) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[75] overflow-hidden border-b border-black/15 shadow-[0_10px_28px_rgba(0,0,0,0.12)]"
      style={{
        backgroundColor: promotion.backgroundColor,
        color: promotion.textColor,
      }}
    >
      {bannerHref ? (
        <Link
          href={bannerHref}
          className="absolute inset-0 z-[1]"
          aria-label={linkLabel || content}
        />
      ) : null}

      <div className="relative flex h-12 items-center gap-4 px-4 sm:px-5">
        <div className="brand-marquee-mask min-w-0 flex-1">
          <div
            className="brand-marquee-track text-[0.72rem] sm:text-[0.76rem]"
            style={{
              animationDuration: `${promotion.speed}s`,
            }}
          >
            <div className="flex items-center gap-6 pr-6">
              {trackItems}
            </div>
            <div className="flex items-center gap-6 pr-6" aria-hidden="true">
              {trackItems}
            </div>
          </div>
        </div>

        {promotion.closable ? (
          <button
            type="button"
            onClick={onClose}
            className="relative z-[2] inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-current transition hover:bg-white/18"
            aria-label={t.promoBanner.close}
          >
            <X size={16} weight="bold" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
