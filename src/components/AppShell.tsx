"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";

import { Header } from "@/components/Header";
import { PromotionsBanner } from "@/components/PromotionsBanner";
import { ScentFinderPrompt } from "@/components/ScentFinderPrompt";
import { AIChatButton } from "@/components/AIChat/AIChatButton";
import { ScrollRestoreOnNavigation } from "@/components/ScrollRestoreOnNavigation";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { SiteSettingsProvider } from "@/components/site-settings/SiteSettingsProvider";
import { stripLocalePrefix, type Locale } from "@/lib/i18n";
import { getPromotionTextForLocale } from "@/lib/site-branding";
import type { SiteSettings } from "@/lib/site-branding";

type AppShellProps = {
  children: React.ReactNode;
  locale: Locale;
  settings: SiteSettings;
};

const MAX_SCROLL_RESTORE_AGE_MS = 30_000;

export function AppShell({ children, locale: _locale, settings }: AppShellProps) {
  const pathname = usePathname() || "/";
  const { pathname: basePathname } = stripLocalePrefix(pathname);
  const [loadedPathname, setLoadedPathname] = useState(pathname);
  const [isPromoBannerDismissed, setIsPromoBannerDismissed] = useState(false);
  const isRouteLoading = loadedPathname !== pathname;
  const hideNavigationChrome = basePathname.startsWith("/staff") || basePathname.startsWith("/admin");
  const shouldOffsetForHeader = !hideNavigationChrome && basePathname !== "/";
  const promoBannerText = getPromotionTextForLocale(settings.promotions, _locale);
  const hasPromoBanner = settings.promotions.enabled && Boolean(promoBannerText.trim());
  const isPromoBannerVisible = hasPromoBanner && !isPromoBannerDismissed;
  const bannerOffsetStyle = {
    "--promo-banner-height": isPromoBannerVisible ? "3rem" : "0px",
  } as CSSProperties;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoadedPathname(pathname);
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const pendingRestore = sessionStorage.getItem("perfoumer:restore-scroll");
    if (pendingRestore) {
      try {
        const parsed = JSON.parse(pendingRestore) as {
          source?: string;
          targetUrl?: string;
          timestamp?: number;
        };

        const isValidSource = parsed?.source === "detail-back";
        const isFresh =
          typeof parsed?.timestamp === "number" && Date.now() - parsed.timestamp <= MAX_SCROLL_RESTORE_AGE_MS;
        if (!isValidSource || !isFresh) {
          sessionStorage.removeItem("perfoumer:restore-scroll");
        } else if (parsed?.targetUrl?.startsWith(pathname)) {
          return;
        }
      } catch {
        sessionStorage.removeItem("perfoumer:restore-scroll");
      }
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  const handleDismissPromoBanner = () => {
    setIsPromoBannerDismissed(true);
  };

  return (
    <SiteSettingsProvider settings={settings}>
      <CurrencyProvider>
        <div style={bannerOffsetStyle}>
          <div
            aria-hidden="true"
            className="route-preloader"
            data-visible={isRouteLoading ? "true" : "false"}
          >
            <div className="route-preloader-bar" />
          </div>
          <ScrollRestoreOnNavigation />
          {hideNavigationChrome ? null : (
            <>
              <PromotionsBanner
                locale={_locale}
                visible={isPromoBannerVisible}
                onClose={handleDismissPromoBanner}
              />
              <Header floating locale={_locale} topOffsetStyle={{ top: "var(--promo-banner-height)" }} />
            </>
          )}
          <div
            key={pathname}
            className={[
              "route-page-enter",
              shouldOffsetForHeader
                ? "pt-[calc(5.5rem+var(--promo-banner-height))] sm:pt-[calc(6rem+var(--promo-banner-height))]"
                : "",
            ].join(" ")}
          >
            {children}
          </div>
          {hideNavigationChrome ? null : <ScentFinderPrompt locale={_locale} />}
          <AIChatButton locale={_locale} />
        </div>
      </CurrencyProvider>
    </SiteSettingsProvider>
  );
}
