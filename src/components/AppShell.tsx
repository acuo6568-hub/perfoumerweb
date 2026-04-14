"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ScrollRestoreOnNavigation } from "@/components/ScrollRestoreOnNavigation";
import type { Locale } from "@/lib/i18n";

type AppShellProps = {
  children: React.ReactNode;
  locale: Locale;
};

export function AppShell({ children, locale: _locale }: AppShellProps) {
  const pathname = usePathname();
  const [loadedPathname, setLoadedPathname] = useState(pathname);
  const isRouteLoading = loadedPathname !== pathname;
  const hideNavigationChrome = pathname.startsWith("/staff") || pathname.startsWith("/admin");

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
        const parsed = JSON.parse(pendingRestore) as { targetUrl?: string };
        if (parsed?.targetUrl?.startsWith(pathname)) {
          return;
        }
      } catch {
        sessionStorage.removeItem("perfoumer:restore-scroll");
      }
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
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
        className="route-page-enter"
      >
        {children}
      </div>
      {hideNavigationChrome ? null : <Footer locale={_locale} />}
    </>
  );
}
