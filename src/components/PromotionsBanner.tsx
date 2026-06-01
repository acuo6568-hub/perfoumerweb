"use client";

import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from "react";

import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { getDictionary, toLocalePath, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildPromotionStorageKey } from "@/lib/promotions";
import {
  getPromotionCountdownTarget,
  getPromotionLinkLabelForLocale,
  getPromotionTextForLocale,
  isPromotionActiveAt,
} from "@/lib/site-branding";

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

function getOrCreateStorageId(key: string, storage: Storage) {
  const existing = storage.getItem(key);
  if (existing && existing.trim().startsWith("v2_")) {
    return existing;
  }

  const next = `v2_${crypto.randomUUID()}`;
  storage.setItem(key, next);
  return next;
}

function formatCountdown(remainingMs: number) {
  if (remainingMs <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const displayHours = hours % 24;
    return `${days}d ${String(displayHours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PromotionsBanner({ locale, visible, onClose }: PromotionsBannerProps) {
  const siteSettings = useSiteSettings();
  const t = getDictionary(locale, siteSettings);
  const promotion = siteSettings.promotions;
  const [isHovered, setIsHovered] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const bannerHref = promotion.linkHref.trim() ? toLocalePath(promotion.linkHref, locale) : "";
  const content = getPromotionTextForLocale(promotion, locale).trim();
  const linkLabel = getPromotionLinkLabelForLocale(promotion, locale).trim() || t.promoBanner.viewOffer;
  const countdownTarget = getPromotionCountdownTarget(promotion);
  const isActive = isPromotionActiveAt(promotion, new Date(now));
  const isCountdownVisible = Boolean(promotion.countdownEnabled && countdownTarget && isActive);
  const countdownRemaining = countdownTarget ? Math.max(0, countdownTarget.getTime() - now) : 0;
  const trackItems = useMemo(() => getTrackItems(content, bannerHref ? linkLabel : ""), [bannerHref, content, linkLabel]);
  const promoKey = useMemo(() => buildPromotionStorageKey(promotion), [promotion]);

  useEffect(() => {
    if (!isCountdownVisible) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isCountdownVisible]);

  if (!visible || !isActive || !content) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  const bannerStyle = promotion.backgroundMode === "gradient"
    ? {
        backgroundColor: promotion.backgroundColor,
        backgroundImage: `linear-gradient(${promotion.gradientAngle}deg, ${promotion.gradientFrom}, ${promotion.gradientTo})`,
        color: promotion.textColor,
        ["--promo-banner-mobile-height" as string]: `${promotion.mobileHeight}px`,
        ["--promo-banner-mobile-text-scale" as string]: String(promotion.mobileTextScale),
        ["--promo-banner-mobile-padding-x" as string]: `${promotion.mobilePaddingX}px`,
      }
    : {
        backgroundColor: promotion.backgroundColor,
        color: promotion.textColor,
        ["--promo-banner-mobile-height" as string]: `${promotion.mobileHeight}px`,
        ["--promo-banner-mobile-text-scale" as string]: String(promotion.mobileTextScale),
        ["--promo-banner-mobile-padding-x" as string]: `${promotion.mobilePaddingX}px`,
      };

  const handlePromoClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!bannerHref) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();

    try {
      const anonymousId = typeof window !== "undefined" ? getOrCreateStorageId("perfoumer.analytics.v2.anonymous-id", window.localStorage) : "";
      const sessionId = typeof window !== "undefined" ? getOrCreateStorageId("perfoumer.analytics.v2.session-id", window.localStorage) : "";
      const session = await supabase?.auth.getSession();
      const user = session?.data?.session?.user ?? null;

      const payload = {
        sessionId,
        anonymousId,
        userId: user?.id ?? null,
        isLoggedIn: Boolean(user),
        locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || "",
        promoKey,
        promoLabel: content,
        promoTarget: bannerHref,
      };

      void fetch("/api/analytics/promo-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } finally {
      window.location.href = bannerHref;
    }
  };

  return (
    <div
      className="promo-banner-shell fixed inset-x-0 top-0 z-[75] overflow-hidden border-b border-black/15 shadow-[0_10px_28px_rgba(0,0,0,0.12)]"
      style={bannerStyle as CSSProperties}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {bannerHref ? (
        <Link
          href={bannerHref}
          className="absolute inset-0 z-[1]"
          aria-label={linkLabel || content}
          onClick={handlePromoClick}
        />
      ) : null}

      <div className="promo-banner-inner relative flex h-12 items-center gap-4 px-4 sm:px-5">
        <div className="brand-marquee-mask min-w-0 flex-1">
          <div
            className="promo-banner-track brand-marquee-track text-[0.72rem] sm:text-[0.76rem]"
            style={{
              animationDuration: `${promotion.speed}s`,
              animationPlayState: isHovered ? "paused" : "running",
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

        {isCountdownVisible ? (
          <div className="relative z-[2] inline-flex shrink-0 items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.14em] uppercase">
            {formatCountdown(countdownRemaining)}
          </div>
        ) : null}

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
