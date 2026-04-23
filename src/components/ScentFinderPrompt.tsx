"use client";

import Link from "next/link";
import { ArrowRight, Sparkle, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { stripLocalePrefix, toLocalePath, type Locale } from "@/lib/i18n";

type ScentFinderPromptProps = {
  locale: Locale;
};

const DISMISS_TTL_MS = 18 * 60 * 60 * 1000;
const SEEN_SESSION_KEY = "perfoumer:scent-finder-prompt:seen";
const DISMISS_KEY = "perfoumer:scent-finder-prompt:dismissed-at";
const LAST_PATH_SESSION_KEY = "perfoumer:scent-finder-prompt:last-path";
const BROWSE_COUNT_SESSION_KEY = "perfoumer:scent-finder-prompt:browse-count";
const QUIZ_VISITED_SESSION_KEY = "perfoumer:scent-finder-prompt:quiz-visited";

type PromptRouteKind = "blocked" | "home" | "product" | "browse" | "passive";

const promptCopy = {
  az: {
    eyebrow: "Qoxunu Tap",
    title: "Öz qoxunu tapmaq üçün qısa test keç.",
    body: "1 dəqiqəlik testlə zövqünə uyğun notları daraldıb daha rahat seçim et.",
    primary: "Testə başla",
    secondary: "Çox satılanlara bax",
    bullets: ["1 dəqiqə", "AI tövsiyəsi", "Zövqə görə seçim"],
    close: "Bağla",
  },
  en: {
    eyebrow: "Find Your Scent",
    title: "Take a short quiz to find the right perfume.",
    body: "Use a 1-minute quiz to narrow notes and discover better-fit picks faster.",
    primary: "Start quiz",
    secondary: "View bestsellers",
    bullets: ["1 minute", "AI picks", "Taste-based"],
    close: "Close",
  },
  ru: {
    eyebrow: "Подберите аромат",
    title: "Пройдите короткий тест и найдите свой аромат.",
    body: "Тест за 1 минуту поможет сузить ноты и быстрее выбрать подходящий аромат.",
    primary: "Начать тест",
    secondary: "Смотреть хиты",
    bullets: ["1 минута", "AI-подбор", "По вашему вкусу"],
    close: "Закрыть",
  },
} as const;

const PASSIVE_STATIC_ROUTES = new Set([
  "/blog",
  "/elaqe",
  "/haqqimizda",
  "/privacy-policy",
  "/refund-policy",
  "/terms-and-conditions",
  "/wishlist",
]);

const RESERVED_SINGLE_SEGMENT_ROUTES = new Set([
  "account",
  "admin",
  "auth",
  "blog",
  "brands",
  "cart",
  "catalog",
  "checkout",
  "compare",
  "elaqe",
  "haqqimizda",
  "login",
  "notes",
  "payment",
  "privacy-policy",
  "qoxunu",
  "refund-policy",
  "staff",
  "stats",
  "terms-and-conditions",
  "wishlist",
]);

function getPromptRouteKind(pathname: string): PromptRouteKind {
  if (
    pathname === "/qoxunu" ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/payment")
  ) {
    return "blocked";
  }

  if (pathname === "/") {
    return "home";
  }

  if (pathname.startsWith("/perfumes/")) {
    return "product";
  }

  if (
    pathname === "/catalog" ||
    pathname === "/brands" ||
    pathname === "/compare" ||
    pathname.startsWith("/brands/") ||
    pathname.startsWith("/notes/")
  ) {
    return "browse";
  }

  if (PASSIVE_STATIC_ROUTES.has(pathname)) {
    return "passive";
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1 && !RESERVED_SINGLE_SEGMENT_ROUTES.has(segments[0])) {
    return "browse";
  }

  return "passive";
}

function getScrollThreshold(viewportHeight: number, ratio: number, minPixels: number) {
  return Math.max(minPixels, Math.round(viewportHeight * ratio));
}

export function ScentFinderPrompt({ locale }: ScentFinderPromptProps) {
  const pathname = usePathname() || "/";
  const { pathname: basePathname } = stripLocalePrefix(pathname);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const copy = promptCopy[locale];
  const routeKind = useMemo(() => getPromptRouteKind(basePathname), [basePathname]);
  const isAllowedRoute = routeKind === "home" || routeKind === "product" || routeKind === "browse";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsVisible(false);
  }, [pathname]);

  useEffect(() => {
    const onOverlay = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen?: boolean }>;
      setIsOverlayOpen(Boolean(customEvent.detail?.isOpen));
    };

    window.addEventListener("perfoumer:ui-overlay", onOverlay as EventListener);

    return () => {
      window.removeEventListener("perfoumer:ui-overlay", onOverlay as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    if (basePathname === "/qoxunu") {
      window.sessionStorage.setItem(QUIZ_VISITED_SESSION_KEY, "1");
      return;
    }

    const previousPath = window.sessionStorage.getItem(LAST_PATH_SESSION_KEY);
    if (previousPath !== pathname) {
      window.sessionStorage.setItem(LAST_PATH_SESSION_KEY, pathname);
      if (routeKind === "browse" || routeKind === "product") {
        const browseCount = Number(window.sessionStorage.getItem(BROWSE_COUNT_SESSION_KEY) || "0");
        window.sessionStorage.setItem(BROWSE_COUNT_SESSION_KEY, String(browseCount + 1));
      }
    }
  }, [basePathname, isMounted, pathname, routeKind]);

  useEffect(() => {
    if (!isMounted || !isAllowedRoute) {
      setIsVisible(false);
      return;
    }

    const dismissedRaw = window.localStorage.getItem(DISMISS_KEY);
    const seenThisSession = window.sessionStorage.getItem(SEEN_SESSION_KEY) === "1";
    const alreadyTriedQuiz = window.sessionStorage.getItem(QUIZ_VISITED_SESSION_KEY) === "1";
    if (dismissedRaw) {
      const dismissedAt = Number(dismissedRaw);
      if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_TTL_MS) {
        return;
      }
      window.localStorage.removeItem(DISMISS_KEY);
    }
    if (seenThisSession || alreadyTriedQuiz) {
      return;
    }

    const isDesktopPointer = window.matchMedia("(pointer: fine)").matches;
    const browseCount = Number(window.sessionStorage.getItem(BROWSE_COUNT_SESSION_KEY) || "0");
    const hasBrowseIntent = browseCount >= 2;

    const strategy =
      routeKind === "home"
        ? {
            timerMs: isDesktopPointer ? 6500 : 9000,
            idleMs: isDesktopPointer ? 9000 : 14000,
            scrollRatio: isDesktopPointer ? 0.32 : 0.46,
            minScrollPx: isDesktopPointer ? 220 : 300,
            allowExitIntent: isDesktopPointer,
          }
        : routeKind === "product"
          ? {
              timerMs: hasBrowseIntent ? (isDesktopPointer ? 4200 : 6200) : isDesktopPointer ? 7200 : 9800,
              idleMs: hasBrowseIntent ? (isDesktopPointer ? 7200 : 9800) : isDesktopPointer ? 10400 : 14500,
              scrollRatio: isDesktopPointer ? 0.35 : 0.48,
              minScrollPx: isDesktopPointer ? 260 : 340,
              allowExitIntent: isDesktopPointer,
            }
          : {
              timerMs: hasBrowseIntent ? (isDesktopPointer ? 3200 : 5200) : isDesktopPointer ? 8200 : 11200,
              idleMs: hasBrowseIntent ? (isDesktopPointer ? 6000 : 8800) : isDesktopPointer ? 12000 : 16500,
              scrollRatio: hasBrowseIntent ? 0.24 : isDesktopPointer ? 0.42 : 0.56,
              minScrollPx: hasBrowseIntent ? 180 : isDesktopPointer ? 320 : 420,
              allowExitIntent: isDesktopPointer,
            };

    let triggered = false;
    const reveal = () => {
      if (triggered) return;
      triggered = true;
      window.sessionStorage.setItem(SEEN_SESSION_KEY, "1");
      setIsVisible(true);
    };

    const revealTimer = window.setTimeout(reveal, strategy.timerMs);
    const idleTimer = window.setTimeout(reveal, strategy.idleMs);
    const scrollThreshold = getScrollThreshold(window.innerHeight, strategy.scrollRatio, strategy.minScrollPx);

    const onScroll = () => {
      if (window.scrollY > scrollThreshold) {
        reveal();
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (strategy.allowExitIntent && event.clientY < 72 && event.movementY < 0) {
        reveal();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    if (strategy.allowExitIntent) {
      window.addEventListener("mousemove", onMouseMove);
    }

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(idleTimer);
      window.removeEventListener("scroll", onScroll);
      if (strategy.allowExitIntent) {
        window.removeEventListener("mousemove", onMouseMove);
      }
    };
  }, [isAllowedRoute, isMounted, pathname, routeKind]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setIsVisible(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isVisible]);

  if (!isMounted || !isAllowedRoute) {
    return null;
  }

  const dismissPrompt = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsVisible(false);
  };

  const hiddenState = !isVisible || isOverlayOpen;

  return (
    <>
      <aside
        className={[
          "fixed right-5 bottom-5 z-[72] hidden w-[21rem] rounded-[1.7rem] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,247,245,0.95))] p-4 shadow-[0_24px_60px_rgba(18,18,20,0.16)] backdrop-blur-xl transition-all duration-300 lg:block",
          hiddenState ? "pointer-events-none translate-x-5 opacity-0" : "pointer-events-auto translate-x-0 opacity-100",
        ].join(" ")}
        aria-hidden={hiddenState}
      >
        <button
          type="button"
          aria-label={copy.close}
          onClick={dismissPrompt}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <X size={16} weight="bold" />
        </button>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-[0_12px_28px_rgba(24,24,24,0.18)]">
            <Sparkle size={18} weight="fill" />
          </span>
          <div className="pr-8">
            <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase">{copy.eyebrow}</p>
            <h3 className="mt-2 text-[1.45rem] leading-[1.02] tracking-[-0.03em] text-zinc-950">{copy.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.body}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {copy.bullets.map((item) => (
            <span
              key={item}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[0.76rem] font-medium text-zinc-700"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <Link
            href={toLocalePath("/qoxunu", locale)}
            onClick={() => window.sessionStorage.setItem(QUIZ_VISITED_SESSION_KEY, "1")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <span>{copy.primary}</span>
            <ArrowRight size={15} weight="bold" />
          </Link>
          <Link
            href={toLocalePath("/catalog", locale)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50"
          >
            {copy.secondary}
          </Link>
        </div>
      </aside>

      <aside
        className={[
          "fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[72] rounded-[1.6rem] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,245,0.96))] px-4 py-4 shadow-[0_22px_54px_rgba(18,18,20,0.18)] backdrop-blur-xl transition-all duration-300 lg:hidden",
          hiddenState ? "pointer-events-none translate-y-6 opacity-0" : "pointer-events-auto translate-y-0 opacity-100",
        ].join(" ")}
        aria-hidden={hiddenState}
      >
        <button
          type="button"
          aria-label={copy.close}
          onClick={dismissPrompt}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <X size={16} weight="bold" />
        </button>
        <div className="pr-8">
          <p className="text-[0.64rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{copy.eyebrow}</p>
          <h3 className="mt-2 text-[1.15rem] leading-[1.04] tracking-[-0.03em] text-zinc-950">{copy.title}</h3>
          <p className="mt-2 text-[0.9rem] leading-5 text-zinc-600">{copy.body}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {copy.bullets.slice(0, 2).map((item) => (
            <span
              key={item}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[0.72rem] font-medium text-zinc-700"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          <Link
            href={toLocalePath("/qoxunu", locale)}
            onClick={() => window.sessionStorage.setItem(QUIZ_VISITED_SESSION_KEY, "1")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <span>{copy.primary}</span>
            <ArrowRight size={15} weight="bold" />
          </Link>
          <Link
            href={toLocalePath("/catalog", locale)}
            className="inline-flex min-h-10 items-center justify-center text-sm font-medium text-zinc-700"
          >
            {copy.secondary}
          </Link>
        </div>
      </aside>
    </>
  );
}
