"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";

import { Header } from "@/components/Header";
import { ScentFinderPrompt } from "@/components/ScentFinderPrompt";
import { AIChatButton } from "@/components/AIChat/AIChatButton";
import { ScrollRestoreOnNavigation } from "@/components/ScrollRestoreOnNavigation";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { SiteSettingsProvider } from "@/components/site-settings/SiteSettingsProvider";
import { stripLocalePrefix, type Locale } from "@/lib/i18n";
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
  const isRouteLoading = loadedPathname !== pathname;
  const hideNavigationChrome = basePathname.startsWith("/staff") || basePathname.startsWith("/admin");
  const shouldOffsetForHeader = !hideNavigationChrome && basePathname !== "/";

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
        const isFresh = typeof parsed?.timestamp === "number" && Date.now() - parsed.timestamp <= MAX_SCROLL_RESTORE_AGE_MS;
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

  return (
    <SiteSettingsProvider settings={settings}>
      <CurrencyProvider>
        <div
          aria-hidden="true"
          className="route-preloader"
          data-visible={isRouteLoading ? "true" : "false"}
        >
          <div className="route-preloader-bar" />
        </div>
        <ScrollRestoreOnNavigation />
        {hideNavigationChrome ? null : <Header floating locale={_locale} />}
        <div
          key={pathname}
          className={[
            "route-page-enter",
            shouldOffsetForHeader ? "pt-22 sm:pt-24" : "",
          ].join(" ")}
        >
          {children}
        </div>
        {hideNavigationChrome ? null : <ScentFinderPrompt locale={_locale} />}
        <AIChatButton locale={_locale} />
      </CurrencyProvider>
    </SiteSettingsProvider>
  );
}
