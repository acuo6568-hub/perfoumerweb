"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type RestorePayload = {
  source?: string;
  targetUrl: string;
  scrollY: number;
  timestamp: number;
};

const MAX_SCROLL_RESTORE_AGE_MS = 30_000;

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url, "http://local");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export function ScrollRestoreOnNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = sessionStorage.getItem("perfoumer:restore-scroll");
    if (!raw) {
      return;
    }

    let payload: RestorePayload | null = null;
    try {
      payload = JSON.parse(raw) as RestorePayload;
    } catch {
      sessionStorage.removeItem("perfoumer:restore-scroll");
      return;
    }

    if (!payload?.targetUrl || typeof payload.scrollY !== "number") {
      sessionStorage.removeItem("perfoumer:restore-scroll");
      return;
    }

    const isValidSource = payload.source === "detail-back";
    const isFresh = typeof payload.timestamp === "number" && Date.now() - payload.timestamp <= MAX_SCROLL_RESTORE_AGE_MS;
    if (!isValidSource || !isFresh) {
      sessionStorage.removeItem("perfoumer:restore-scroll");
      return;
    }

    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const normalizedTarget = normalizeUrl(payload.targetUrl).split("#")[0];

    if (normalizedTarget !== currentUrl) {
      if (Date.now() - payload.timestamp > MAX_SCROLL_RESTORE_AGE_MS / 2) {
        sessionStorage.removeItem("perfoumer:restore-scroll");
      }
      return;
    }

    sessionStorage.removeItem("perfoumer:restore-scroll");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: payload.scrollY, left: 0, behavior: "auto" });
      });
    });
  }, [pathname, searchParams]);

  return null;
}