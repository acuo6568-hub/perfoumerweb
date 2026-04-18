"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  Buildings,
  GridFour,
  HeartStraight,
  House,
  Info,
  NewspaperClipping,
  Phone,
  Scales,
  ShoppingBag,
  Sparkle,
  UserCircle,
} from "@phosphor-icons/react";
import type { Session } from "@supabase/supabase-js";
import { getDictionary, locales, stripLocalePrefix, toLocalePath, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type HeaderProps = {
  floating?: boolean;
  locale: Locale;
};

export function Header({ floating = false, locale }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [isLocalePending, startLocaleTransition] = useTransition();
  const [session, setSession] = useState<Session | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const cartCountRequestRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { pathname: basePathname } = stripLocalePrefix(pathname);
  const t = getDictionary(locale);
  const supabase = getSupabaseBrowserClient();
  const copy = {
    az: {
      login: "Giriş",
      account: "Hesabım",
      wishlist: "İstək siyahısı",
      blog: "Blog",
      aboutPage: "Haqqımızda",
      navTitle: "Naviqasiya",
      menuTag: "Menyu",
      accountTag: "Hesab",
      languageTag: "Dil",
    },
    en: {
      login: "Login",
      account: "My Account",
      wishlist: "Wishlist",
      blog: "Blog",
      aboutPage: "About",
      navTitle: "Navigation",
      menuTag: "Menu",
      accountTag: "Account",
      languageTag: "Language",
    },
    ru: {
      login: "Вход",
      account: "Мой аккаунт",
      wishlist: "Wishlist",
      blog: "Блог",
      aboutPage: "О нас",
      navTitle: "Навигация",
      menuTag: "Меню",
      accountTag: "Аккаунт",
      languageTag: "Язык",
    },
  } as const;
  const primaryMenuItems = [
    { href: "/", label: t.header.home },
    { href: "/catalog", label: t.header.products },
    { href: "/compare", label: t.header.compare },
    { href: "/qoxunu", label: t.header.scentQuiz },
  ];
  const secondaryMenuItems = [
    { href: "/cart", label: t.header.cart },
    ...(session ? [{ href: "/wishlist", label: copy[locale].wishlist }] : []),
    { href: "/brands", label: t.header.brands },
    { href: "/blog", label: copy[locale].blog },
    { href: "/haqqimizda", label: copy[locale].aboutPage },
    { href: "/elaqe", label: t.header.contact },
  ];
  const desktopMenuItems = [
    { href: "/catalog", label: t.header.products },
    { href: "/compare", label: t.header.compare },
    { href: "/qoxunu", label: t.header.scentQuiz },
    { href: "/brands", label: t.header.brands },
    { href: "/blog", label: copy[locale].blog },
  ];
  const desktopDrawerMenuItems = [
    ...primaryMenuItems.filter((item) => !desktopMenuItems.some((desktopItem) => desktopItem.href === item.href)),
    ...secondaryMenuItems.filter((item) => !desktopMenuItems.some((desktopItem) => desktopItem.href === item.href)),
  ];
  const loginHref = useMemo(() => {
    const nextPath = toLocalePath(basePathname, locale);
    return `${toLocalePath("/login", locale)}?next=${encodeURIComponent(nextPath)}`;
  }, [basePathname, locale]);
  const accountHref = session ? toLocalePath("/account", locale) : loginHref;
  const accountLabel = session ? copy[locale].account : copy[locale].login;

  const loadCartItemCount = useCallback(
    async (userId: string) => {
      const requestId = ++cartCountRequestRef.current;
      if (!supabase || !isSupabaseConfigured()) {
        if (requestId === cartCountRequestRef.current) {
          setCartItemCount(0);
        }
        return;
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", userId);

      if (error) {
        if (requestId === cartCountRequestRef.current) {
          setCartItemCount(0);
        }
        return;
      }

      const rows = (data as { quantity: number }[] | null) ?? [];
      const totalItems = rows.reduce((sum, row) => sum + (Number.isFinite(row.quantity) ? row.quantity : 0), 0);
      if (requestId === cartCountRequestRef.current) {
        setCartItemCount(totalItems);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Clear transient locale highlight once route/locale settles.
    setPendingLocale(null);
  }, [locale, pathname]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) {
      return;
    }

    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const currentSession = data.session ?? null;
      setSession(currentSession);
      if (currentSession?.user?.id) {
        void loadCartItemCount(currentSession.user.id);
      } else {
        setCartItemCount(0);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        void loadCartItemCount(nextSession.user.id);
      } else {
        setCartItemCount(0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadCartItemCount]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || typeof window === "undefined") {
      return;
    }

    const onCartUpdated = () => {
      void loadCartItemCount(userId);
    };

    window.addEventListener("perfoumer:cart-updated", onCartUpdated);

    return () => {
      window.removeEventListener("perfoumer:cart-updated", onCartUpdated);
    };
  }, [session?.user?.id, loadCartItemCount]);

  const menuTransition =
    "transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const stickTransition =
    "absolute left-1/2 top-1/2 block h-0.5 w-4 -translate-x-1/2 rounded-full bg-current opacity-100 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]";

  const isItemActive = useCallback(
    (href: string) => {
      const [pathOnly] = href.split("#");
      if (!pathOnly || pathOnly === "/") {
        return basePathname === "/";
      }

      return basePathname === pathOnly || basePathname.startsWith(`${pathOnly}/`);
    },
    [basePathname],
  );

  const getMobileItemIcon = useCallback((href: string) => {
    const [pathOnly] = href.split("#");

    switch (pathOnly) {
      case "/":
        return <House size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/catalog":
        return <GridFour size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/compare":
        return <Scales size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/qoxunu":
        return <Sparkle size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/cart":
        return <ShoppingBag size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/wishlist":
        return <HeartStraight size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/brands":
        return <Buildings size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/blog":
        return <NewspaperClipping size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/haqqimizda":
        return <Info size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      case "/elaqe":
        return <Phone size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
      default:
        return <ArrowRight size={16} weight="regular" className="text-zinc-600" aria-hidden="true" />;
    }
  }, []);

  const updateLocale = async (nextLocale: Locale) => {
    if (nextLocale === (pendingLocale ?? locale) || isLocalePending) {
      return;
    }

    setPendingLocale(nextLocale);
    setIsMenuOpen(false);

    const nextPath = toLocalePath(basePathname, nextLocale);

    startLocaleTransition(async () => {
      try {
        // Update the cookie on the client immediately to avoid stale-locale race conditions.
        document.cookie = `perfoumer-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;

        await fetch("/api/locale", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: nextLocale }),
          keepalive: true,
          cache: "no-store",
        });
      } finally {
        router.push(nextPath);
        router.refresh();
      }
    });
  };

  return (
    <>
      <header
        className={[
          "z-50 w-full opacity-100",
          floating ? "fixed inset-x-0 top-0" : "relative",
        ].join(" ")}
      >
        <div className="mx-auto max-w-[1540px] px-3 pt-3 sm:px-6 sm:pt-5 md:px-10">
          <div
            className="header-load-in header-shell-glow relative isolate flex items-center gap-3 overflow-hidden rounded-[1.2rem] border border-zinc-300/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.92)_0%,rgba(249,249,248,0.96)_100%)] px-3 py-2.5 text-zinc-900 shadow-[0_8px_20px_rgba(17,17,19,0.06)] ring-1 ring-white/55 backdrop-blur-[6px] transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4 sm:py-3 lg:gap-4 lg:px-5"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0)_40%),linear-gradient(120deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.08)_48%,rgba(231,229,225,0.18)_100%)] opacity-100 transition-opacity duration-500"
            />
            <div
              aria-hidden="true"
              className="hero-grain pointer-events-none absolute inset-0 opacity-[0.04] transition-opacity duration-500"
            />

            <Link
              href={toLocalePath("/", locale)}
              className="header-load-in header-load-in--logo relative z-10 inline-flex shrink-0 items-center gap-2 rounded-[1.2rem] px-1 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              <span
                className="header-logo-orb grid h-10 w-10 place-items-center overflow-hidden rounded-[0.8rem] border border-zinc-300/45 bg-[linear-gradient(165deg,#ffffff_0%,#f4f4f2_100%)] shadow-none transition-[background-color,border-color,box-shadow] duration-500 sm:h-12 sm:w-12"
              >
                <Image
                  src="/perfoumer_black.png"
                  alt="Perfoumer"
                  width={28}
                  height={28}
                  unoptimized
                  className="header-logo-image h-8 w-8 object-contain sm:h-10 sm:w-10"
                  priority
                />
              </span>
              <span className="brand-wordmark text-[1.42rem] tracking-[-0.055em] text-zinc-900 sm:text-[1.72rem]">
                Perfoumer
              </span>
            </Link>

            <nav className="header-load-in relative z-10 ml-2 hidden flex-1 items-center justify-center gap-1 lg:flex">
              {desktopMenuItems.map((item) => {
                const isActive = isItemActive(item.href);
                const localizedHref = toLocalePath(item.href, locale);

                return (
                  <Link
                    key={item.href}
                    href={localizedHref}
                    className={[
                      "group relative rounded-full px-4 py-2 text-[0.66rem] font-medium tracking-[0.28em] uppercase transition-colors duration-300 xl:px-5",
                      isActive ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800",
                    ].join(" ")}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="header-load-in header-load-in--controls relative z-10 ml-auto flex items-center gap-2 sm:gap-3">
              <div
                className="hidden items-center rounded-full border border-zinc-300/45 bg-white/72 p-1 lg:flex"
              >
                {locales.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateLocale(item)}
                    disabled={isLocalePending}
                    className={[
                        "rounded-full px-2.5 py-1 text-[0.66rem] font-medium tracking-[0.22em] uppercase transition-colors duration-200 disabled:cursor-wait disabled:opacity-70",
                      (pendingLocale ?? locale) === item
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-500 hover:text-zinc-700",
                    ].join(" ")}
                  >
                    {t.languages[item]}
                  </button>
                ))}
              </div>

              <Link
                href={toLocalePath("/cart", locale)}
                aria-label={t.header.cart}
                  className="group relative grid h-10 w-10 place-items-center rounded-full border border-zinc-300/45 bg-[linear-gradient(155deg,#ffffff_0%,#f8f8f6_100%)] text-zinc-700 shadow-none transition-[transform,box-shadow,background-color,border-color] duration-300 hover:-translate-y-px hover:shadow-none active:translate-y-0 sm:h-11 sm:w-11"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_58%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-zinc-200/0 transition-all duration-300 group-hover:scale-[1.04] group-hover:ring-zinc-300/80 group-active:scale-100"
                />
                <ShoppingBag
                  size={18}
                  weight="regular"
                  className="relative z-[1] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.04] group-active:translate-y-0 group-active:scale-95 sm:size-[19px]"
                />
                {cartItemCount > 0 ? (
                  <span className="absolute -right-1 -top-1 z-[2] inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-zinc-900 px-1 py-0.5 text-[10px] font-semibold leading-none text-white shadow-[0_6px_14px_rgba(24,24,24,0.28)] ring-1 ring-white transition-transform duration-300 group-hover:scale-105 group-active:scale-95 sm:min-w-[1.2rem]">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                ) : null}
              </Link>

              <button
                type="button"
                aria-label={isMenuOpen ? t.header.closeMenu : t.header.openMenu}
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="group relative grid h-10 w-10 place-items-center rounded-full border border-zinc-300/50 bg-[linear-gradient(145deg,#ffffff_0%,#f4f4f2_100%)] text-zinc-700 shadow-[0_10px_20px_rgba(20,20,24,0.06)] transition-[background-color,box-shadow,border-color,color,transform] duration-300 hover:-translate-y-px hover:border-zinc-400/55 hover:bg-white sm:h-11 sm:w-11"
              >
                <span
                  className={[
                    stickTransition,
                    isMenuOpen
                      ? "translate-y-0 rotate-45"
                      : "-translate-y-1 rotate-0 group-hover:-translate-y-[5px] group-hover:w-5",
                  ].join(" ")}
                />
                <span
                  className={[
                    stickTransition,
                    isMenuOpen
                      ? "translate-y-0 -rotate-45"
                      : "translate-y-1 rotate-0 group-hover:translate-y-[5px] group-hover:w-5",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={[
          "fixed inset-0 z-40 origin-top transform-gpu overflow-hidden bg-zinc-950/18 backdrop-blur-sm lg:hidden",
          menuTransition,
          isMenuOpen
            ? "pointer-events-auto translate-y-0"
            : "pointer-events-none -translate-y-[104%]",
        ].join(" ")}
        aria-hidden={!isMenuOpen}
      >
        <div
          className={[
            "mx-auto flex h-full max-w-[1540px] flex-col px-3 pt-20 pb-6",
            menuTransition,
            isMenuOpen ? "translate-y-0" : "-translate-y-2",
          ].join(" ")}
        >
          <div className="relative flex flex-1 overflow-hidden rounded-[1.55rem] border border-zinc-300/60 bg-[linear-gradient(165deg,rgba(255,255,255,0.98)_0%,rgba(244,243,240,0.96)_100%)] p-4 shadow-[0_24px_52px_rgba(25,25,30,0.14)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0)_45%),radial-gradient(circle_at_88%_82%,rgba(210,197,174,0.2)_0%,rgba(210,197,174,0)_48%)]"
            />
            <div aria-hidden="true" className="hero-grain pointer-events-none absolute inset-0 opacity-[0.04]" />

            <nav className="relative z-10 flex w-full flex-col gap-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
                <span className="font-[family-name:var(--font-playfair)] text-lg tracking-[-0.02em] text-zinc-900">
                  {copy[locale].navTitle}
                </span>
                <span className="text-[0.58rem] font-medium tracking-[0.26em] uppercase text-zinc-500">
                  Perfoumer
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {primaryMenuItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={toLocalePath(item.href, locale)}
                    onClick={() => setIsMenuOpen(false)}
                    style={{ transitionDelay: isMenuOpen ? `${70 + index * 40}ms` : "0ms" }}
                    className={[
                      "group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 px-3.5 py-3.5 text-left transition-[transform,box-shadow,border-color,background-color] duration-300 hover:-translate-y-px hover:border-zinc-300 hover:bg-white",
                      menuTransition,
                      isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="block text-[0.52rem] font-medium tracking-[0.26em] uppercase text-zinc-500">
                          {copy[locale].menuTag}
                        </span>
                        <span className="mt-1 block font-[family-name:var(--font-playfair)] text-[1.04rem] leading-tight tracking-[-0.02em] text-zinc-900">
                          {item.label}
                        </span>
                      </div>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-zinc-200 bg-white/80">
                        {getMobileItemIcon(item.href)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="space-y-1">
                {secondaryMenuItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={toLocalePath(item.href, locale)}
                    onClick={() => setIsMenuOpen(false)}
                    style={{ transitionDelay: isMenuOpen ? `${180 + index * 35}ms` : "0ms" }}
                    className={[
                      "flex items-center justify-between rounded-xl border border-transparent px-2 py-2.5 text-sm text-zinc-700 transition-colors duration-200 hover:border-zinc-200 hover:bg-white/70 hover:text-zinc-950",
                      isItemActive(item.href) ? "border-zinc-200 bg-white/88 text-zinc-900" : "",
                      menuTransition,
                      isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-zinc-200 bg-white/70">
                        {getMobileItemIcon(item.href)}
                      </span>
                      <span>{item.label}</span>
                    </span>
                    <ArrowRight size={14} weight="regular" className="text-zinc-400" />
                  </Link>
                ))}
              </div>

              <Link
                href={accountHref}
                onClick={() => setIsMenuOpen(false)}
                style={{
                  transitionDelay: isMenuOpen
                    ? `${210 + secondaryMenuItems.length * 35}ms`
                    : "0ms",
                }}
                className={[
                  "flex items-center justify-between rounded-2xl border border-zinc-900/90 bg-zinc-900 px-4 py-3 text-white shadow-[0_16px_30px_rgba(20,20,24,0.2)] transition-transform duration-300 hover:-translate-y-px",
                  menuTransition,
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                ].join(" ")}
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10">
                    <UserCircle size={16} weight="regular" className="text-white/90" aria-hidden="true" />
                  </span>
                  <span className="text-[0.58rem] font-medium tracking-[0.24em] uppercase text-white/62">
                    {copy[locale].accountTag}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-playfair)] text-lg tracking-[-0.02em]">{accountLabel}</span>
              </Link>

              <div
                className={[
                  "flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/70 p-1.5",
                  menuTransition,
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                ].join(" ")}
                style={{
                  transitionDelay: isMenuOpen
                    ? `${250 + secondaryMenuItems.length * 35}ms`
                    : "0ms",
                }}
              >
                <span className="pl-2 text-[0.52rem] font-medium tracking-[0.24em] uppercase text-zinc-500">
                  {copy[locale].languageTag}
                </span>
                <div className="flex items-center gap-1">
                  {locales.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => updateLocale(item)}
                      disabled={isLocalePending}
                      className={[
                        "rounded-full px-2.5 py-1 text-[0.62rem] font-medium tracking-[0.2em] uppercase transition-all duration-200 disabled:cursor-wait disabled:opacity-70",
                        (pendingLocale ?? locale) === item
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-500 hover:text-zinc-700",
                      ].join(" ")}
                    >
                      {t.languages[item]}
                    </button>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <div
        className={[
          "fixed inset-0 z-40 hidden origin-top transform-gpu overflow-hidden bg-[linear-gradient(138deg,#101114_0%,#17181d_34%,#23201f_68%,#2b2523_100%)] text-white shadow-[0_30px_80px_rgba(12,12,14,0.38)] lg:block",
          menuTransition,
          isMenuOpen
            ? "pointer-events-auto translate-y-0"
            : "pointer-events-none -translate-y-[104%]",
        ].join(" ")}
        aria-hidden={!isMenuOpen}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(248,220,196,0.18),transparent_28%),radial-gradient(circle_at_78%_24%,rgba(205,218,245,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
        <div className="hero-grain pointer-events-none absolute inset-0 opacity-[0.16]" />
        <div className="pointer-events-none absolute -left-14 top-[18%] h-60 w-60 rounded-full bg-[#f6d2b5]/18 blur-3xl" />
        <div className="pointer-events-none absolute right-[-6%] top-[10%] h-72 w-72 rounded-full bg-[#d7dff3]/14 blur-3xl" />
        <div
          className={[
            "mx-auto flex h-full max-w-[1540px] flex-col px-6 pt-20 pb-10 md:px-10 md:pt-24",
            menuTransition,
            isMenuOpen ? "translate-y-0" : "-translate-y-2",
          ].join(" ")}
        >
          <div className="flex flex-1">
            <nav className="hidden w-full flex-col self-start lg:flex">
              {desktopDrawerMenuItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={toLocalePath(item.href, locale)}
                  onClick={() => setIsMenuOpen(false)}
                  style={{ transitionDelay: isMenuOpen ? `${110 + index * 50}ms` : "0ms" }}
                  className={[
                    "group flex w-full items-center gap-4 border-b border-white/10 py-3 text-[2.15rem] leading-[1.02] font-[family-name:var(--font-playfair)] font-medium tracking-[-0.04em] text-white/92 sm:text-[2.55rem] md:py-3.5 md:text-[3.3rem]",
                    menuTransition,
                    isMenuOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-4 opacity-0",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  <span className="relative h-px min-w-0 flex-1 overflow-hidden bg-white/18">
                    <span className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-white/70 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  </span>
                  <ArrowRight
                    size={28}
                    weight="light"
                    className="shrink-0 translate-x-[-6px] text-white/52 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </Link>
              ))}

              <Link
                href={accountHref}
                onClick={() => setIsMenuOpen(false)}
                style={{
                  transitionDelay: isMenuOpen
                    ? `${110 + (primaryMenuItems.length + secondaryMenuItems.length) * 50}ms`
                    : "0ms",
                }}
                className={[
                  "group flex w-full items-center gap-4 border-b border-white/10 py-3 text-[2.15rem] leading-[1.02] font-[family-name:var(--font-playfair)] font-semibold tracking-[-0.04em] text-white sm:text-[2.55rem] md:py-3.5 md:text-[3.3rem]",
                  menuTransition,
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                ].join(" ")}
              >
                <span>{accountLabel}</span>
                <span className="relative h-px min-w-0 flex-1 overflow-hidden bg-white/18">
                  <span className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-white/85 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </span>
                <ArrowRight
                  size={28}
                  weight="light"
                  className="shrink-0 translate-x-[-6px] text-white/58 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100"
                />
              </Link>
            </nav>
          </div>
        </div>
      </div>

    </>
  );
}
