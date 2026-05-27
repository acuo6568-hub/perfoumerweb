"use client";

import { ArrowRight, Sparkle, X } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { stripLocalePrefix, toLocaleHref, type Locale } from "@/lib/i18n";

type ScentJourneyOnboardingProps = {
  locale: Locale;
  onVisibilityChange?: (visible: boolean) => void;
};

type JourneyCopy = {
  launcher: string;
  badge: string;
  title: string;
  body: string;
  quizLabel: string;
  quizBody: string;
  skip: string;
  close: string;
};

type JourneyOption = {
  id: string;
  title: string;
  description: string;
  chips: string[];
  href: string;
};

const COMPLETED_KEY = "perfoumer:scent-journey:completed";
const SNOOZE_KEY = "perfoumer:scent-journey:snoozed-at";
const SHOWN_SESSION_KEY = "perfoumer:scent-journey:shown";
const SNOOZE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const FORCE_SHOW_FOR_TESTING = true;

const copyByLocale: Record<Locale, JourneyCopy> = {
  az: {
    launcher: "Qoxunu tap",
    badge: "Scent Journey",
    title: "Bu gün necə qoxumaq istəyirsən?",
    body: "Bir istiqamət seç, uyğun məhsulları sakit və sürətli şəkildə açaq.",
    quizLabel: "Qoxunu Tap ilə seç",
    quizBody: "Əmin deyilsənsə, qısa test daha dəqiq yönləndirsin.",
    skip: "İndilik keç",
    close: "Bağla",
  },
  en: {
    launcher: "Find your scent",
    badge: "Scent Journey",
    title: "How do you want to smell today?",
    body: "Pick a direction and open a calmer, better-matched catalog right away.",
    quizLabel: "Let the quiz choose",
    quizBody: "If you are unsure, the short quiz can narrow it down better.",
    skip: "Skip for now",
    close: "Close",
  },
  ru: {
    launcher: "Подобрать аромат",
    badge: "Scent Journey",
    title: "Как вы хотите пахнуть сегодня?",
    body: "Выберите направление, и мы сразу откроем более точную подборку.",
    quizLabel: "Подобрать с помощью теста",
    quizBody: "Если не уверены, короткий тест подберет точнее.",
    skip: "Пока пропустить",
    close: "Закрыть",
  },
};

const optionsByLocale: Record<Locale, JourneyOption[]> = {
  az: [
    {
      id: "fresh-clean",
      title: "Təmiz və fresh",
      description: "Sitruslu, yüngül və rahat gündəlik istiqamət.",
      chips: ["citrus", "clean", "marine"],
      href: "/catalog?q=citrus+clean+marine",
    },
    {
      id: "warm-sweet",
      title: "İsti və şirin",
      description: "Vanilli, yumşaq və daha yaxın hiss olunan qoxular.",
      chips: ["vanilla", "amber", "sweet"],
      href: "/catalog?q=vanilla+amber+sweet",
    },
    {
      id: "woody-bold",
      title: "Odunsu və güclü",
      description: "Oud, musk və daha dərin xarakterli seçimlər.",
      chips: ["oud", "woody", "musk"],
      href: "/catalog?q=oud+woody+musk",
    },
    {
      id: "soft-floral",
      title: "Yumşaq və floral",
      description: "Qızılgül, yasəmən və havalı çiçək yönü.",
      chips: ["rose", "jasmine", "floral"],
      href: "/catalog?q=rose+jasmine+floral",
    },
  ],
  en: [
    {
      id: "fresh-clean",
      title: "Fresh and clean",
      description: "Citrus-led, light and easy for everyday wear.",
      chips: ["citrus", "clean", "marine"],
      href: "/catalog?q=citrus+clean+marine",
    },
    {
      id: "warm-sweet",
      title: "Warm and sweet",
      description: "Softer vanilla-amber scents with cozy warmth.",
      chips: ["vanilla", "amber", "sweet"],
      href: "/catalog?q=vanilla+amber+sweet",
    },
    {
      id: "woody-bold",
      title: "Woody and bold",
      description: "Oud, musk and deeper scents with more presence.",
      chips: ["oud", "woody", "musk"],
      href: "/catalog?q=oud+woody+musk",
    },
    {
      id: "soft-floral",
      title: "Soft and floral",
      description: "Rose, jasmine and airy floral directions.",
      chips: ["rose", "jasmine", "floral"],
      href: "/catalog?q=rose+jasmine+floral",
    },
  ],
  ru: [
    {
      id: "fresh-clean",
      title: "Свежо и чисто",
      description: "Цитрус, чистота и легкое повседневное звучание.",
      chips: ["citrus", "clean", "marine"],
      href: "/catalog?q=citrus+clean+marine",
    },
    {
      id: "warm-sweet",
      title: "Тепло и сладко",
      description: "Мягкие ароматы с ванилью, амброй и теплом.",
      chips: ["vanilla", "amber", "sweet"],
      href: "/catalog?q=vanilla+amber+sweet",
    },
    {
      id: "woody-bold",
      title: "Древесно и смело",
      description: "Oud, musk и более глубокий, заметный характер.",
      chips: ["oud", "woody", "musk"],
      href: "/catalog?q=oud+woody+musk",
    },
    {
      id: "soft-floral",
      title: "Мягко и цветочно",
      description: "Rose, jasmine и легкое воздушное цветочное направление.",
      chips: ["rose", "jasmine", "floral"],
      href: "/catalog?q=rose+jasmine+floral",
    },
  ],
};

function isJourneyRouteAllowed(pathname: string) {
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
    return false;
  }

  return true;
}

export function ScentJourneyOnboarding({
  locale,
  onVisibilityChange,
}: ScentJourneyOnboardingProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { pathname: basePathname } = stripLocalePrefix(pathname);
  const [isMounted, setIsMounted] = useState(false);
  const [isLauncherVisible, setIsLauncherVisible] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isUiOverlayOpen, setIsUiOverlayOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const copy = copyByLocale[locale];
  const options = optionsByLocale[locale];
  const isAllowedRoute = useMemo(() => isJourneyRouteAllowed(basePathname), [basePathname]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    onVisibilityChange?.(isPanelVisible);
  }, [isPanelVisible, onVisibilityChange]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onOverlay = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen?: boolean }>;
      const nextIsOpen = Boolean(customEvent.detail?.isOpen);
      setIsUiOverlayOpen(nextIsOpen);
      if (nextIsOpen) {
        setIsPanelMounted(false);
        setIsPanelVisible(false);
      }
    };

    window.addEventListener("perfoumer:ui-overlay", onOverlay as EventListener);

    return () => {
      window.removeEventListener("perfoumer:ui-overlay", onOverlay as EventListener);
    };
  }, []);

  useEffect(() => {
    setIsPanelMounted(false);
    setIsPanelVisible(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMounted || !isAllowedRoute || isUiOverlayOpen) {
      setIsLauncherVisible(false);
      return;
    }

    if (!FORCE_SHOW_FOR_TESTING) {
      if (window.localStorage.getItem(COMPLETED_KEY) === "1") {
        return;
      }

      const snoozedRaw = window.localStorage.getItem(SNOOZE_KEY);
      if (snoozedRaw) {
        const snoozedAt = Number(snoozedRaw);
        if (Number.isFinite(snoozedAt) && Date.now() - snoozedAt < SNOOZE_TTL_MS) {
          return;
        }
        window.localStorage.removeItem(SNOOZE_KEY);
      }

      if (window.sessionStorage.getItem(SHOWN_SESSION_KEY) === "1") {
        return;
      }
    }

    const timer = window.setTimeout(() => {
      if (!FORCE_SHOW_FOR_TESTING) {
        window.sessionStorage.setItem(SHOWN_SESSION_KEY, "1");
      }
      setIsLauncherVisible(true);
    }, basePathname === "/" ? 260 : 420);

    return () => {
      window.clearTimeout(timer);
    };
  }, [basePathname, isAllowedRoute, isMounted, isUiOverlayOpen]);

  useEffect(() => {
    if (!isPanelMounted) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPanelVisible(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPanelMounted]);

  useEffect(() => {
    if (isPanelVisible) {
      return;
    }

    if (!isPanelMounted) {
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsPanelMounted(false);
      closeTimerRef.current = null;
    }, 360);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isPanelMounted, isPanelVisible]);

  if (!isMounted || !isAllowedRoute || isUiOverlayOpen) {
    return null;
  }

  const dismissLauncher = () => {
    if (!FORCE_SHOW_FOR_TESTING) {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    }
    setIsLauncherVisible(false);
    setIsPanelMounted(false);
    setIsPanelVisible(false);
  };

  const openPanel = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPanelMounted(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsPanelVisible(true);
      });
    });
  };

  const closePanel = () => {
    setIsPanelVisible(false);
  };

  const completeJourney = (href: string) => {
    if (!FORCE_SHOW_FOR_TESTING) {
      window.localStorage.setItem(COMPLETED_KEY, "1");
      window.localStorage.removeItem(SNOOZE_KEY);
    }
    setIsPanelVisible(false);
    router.push(toLocaleHref(href, locale));
  };

  return (
    <>
      <div
        className={[
          "fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] z-[74] transition-all duration-300 sm:right-5 sm:bottom-24",
          isLauncherVisible && !isPanelVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        ].join(" ")}
      >
        <div className="scent-journey-launcher flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/96 p-1 pr-2 shadow-[0_18px_42px_rgba(15,15,18,0.12)] backdrop-blur-xl">
          <button
            type="button"
            onClick={openPanel}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-left text-[0.88rem] font-medium text-zinc-900"
            aria-haspopup="dialog"
            aria-expanded={isPanelVisible}
          >
            <span className="scent-journey-launcher-dot inline-flex h-2.5 w-2.5 rounded-full bg-zinc-900" />
            <span>{copy.launcher}</span>
            <ArrowRight size={14} weight="bold" className="text-zinc-500" />
          </button>
          <button
            type="button"
            aria-label={copy.close}
            onClick={dismissLauncher}
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>

      {isPanelMounted ? (
        <div
          className={[
            "fixed inset-0 z-[76] px-3 py-3 transition-all duration-300 sm:px-5 sm:py-5",
            isPanelVisible ? "pointer-events-auto bg-[rgba(18,18,20,0.08)]" : "pointer-events-none bg-[rgba(18,18,20,0)]",
          ].join(" ")}
        >
          <button
            type="button"
            aria-label={copy.close}
            className="absolute inset-0 cursor-default"
            onClick={closePanel}
          />
          <section
            className={[
              "scent-journey-panel-shell absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] w-[min(27rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.7rem] border border-zinc-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,248,249,0.98))] p-4 shadow-[0_26px_100px_rgba(10,10,12,0.18)] backdrop-blur-xl transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:right-5 sm:bottom-24 sm:w-[27rem] sm:p-5",
              isPanelVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-5 scale-[0.94] opacity-0",
            ].join(" ")}
            role="dialog"
            aria-modal="true"
            aria-label={copy.badge}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(255,255,255,0.1)_72%)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.96),transparent)]"
            />
            <button
              type="button"
              aria-label={copy.close}
              onClick={closePanel}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-zinc-200/90 bg-white/88 text-zinc-500 transition hover:bg-white hover:text-zinc-900"
            >
              <X size={15} weight="bold" />
            </button>

            <div
              className={[
                "relative transition-all duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                isPanelVisible ? "translate-y-0 opacity-100 delay-100" : "translate-y-2 opacity-0",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[0.66rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
                <Sparkle size={11} weight="fill" />
                {copy.badge}
              </span>
              <h2 className="mt-4 max-w-[11ch] text-[1.8rem] leading-[0.94] tracking-[-0.05em] text-zinc-950 sm:text-[2.1rem]">
                {copy.title}
              </h2>
              <p className="mt-3 max-w-[25rem] text-[0.95rem] leading-7 text-zinc-600">{copy.body}</p>
            </div>

            <div
              className={[
                "relative mt-5 space-y-2.5 transition-all duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                isPanelVisible ? "translate-y-0 opacity-100 delay-150" : "translate-y-3 opacity-0",
              ].join(" ")}
            >
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => completeJourney(option.href)}
                  className="group block w-full rounded-[1.35rem] border border-zinc-200/90 bg-white/88 px-4 py-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-[0_16px_34px_rgba(15,15,18,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[1rem] font-semibold leading-[1.18] tracking-[-0.03em] text-zinc-950">
                        {option.title}
                      </h3>
                      <p className="mt-1.5 max-w-[24ch] text-[0.9rem] leading-6 text-zinc-600">
                        {option.description}
                      </p>
                      <p className="mt-3 text-[0.63rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
                        {option.chips.join(" · ")}
                      </p>
                    </div>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 transition group-hover:border-zinc-300 group-hover:bg-white group-hover:text-zinc-950">
                      <ArrowRight size={15} weight="bold" />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div
              className={[
                "relative mt-3 rounded-[1.35rem] border border-zinc-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,247,248,0.98))] px-4 py-4 transition-all duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                isPanelVisible ? "translate-y-0 opacity-100 delay-200" : "translate-y-3 opacity-0",
              ].join(" ")}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.98rem] font-semibold tracking-[-0.03em] text-zinc-950">{copy.quizLabel}</p>
                <p className="mt-1 max-w-[18rem] text-[0.9rem] leading-6 text-zinc-600">{copy.quizBody}</p>
              </div>
              <button
                type="button"
                onClick={() => completeJourney("/qoxunu")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <span>{copy.quizLabel}</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
            </div>

            <button
              type="button"
              onClick={closePanel}
              className={[
                "relative mt-3 inline-flex min-h-10 items-center justify-center text-sm font-medium text-zinc-500 transition-all duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-zinc-900",
                isPanelVisible ? "translate-y-0 opacity-100 delay-200" : "translate-y-2 opacity-0",
              ].join(" ")}
            >
              {copy.skip}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
