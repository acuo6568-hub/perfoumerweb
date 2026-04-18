"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  Buildings,
  CaretDown,
  GridFour,
  HeartStraight,
  House,
  Info,
  InstagramLogo,
  MapPin,
  NewspaperClipping,
  Phone,
  Scales,
  ShoppingBag,
  Sparkle,
  UserCircle,
  X,
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
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  const [isMobileLocaleMenuOpen, setIsMobileLocaleMenuOpen] = useState(false);
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [isLocalePending, startLocaleTransition] = useTransition();
  const [session, setSession] = useState<Session | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const cartCountRequestRef = useRef(0);
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
      trendingTag: "Trenddə",
      instagramTag: "Instagram",
      tiktokTag: "Unvan",
      shopCategory: "Alış-veriş",
      discoverCategory: "Kəşf et",
      infoCategory: "Məlumat",
      allProducts: "Bütün məhsullar",
      menCategory: "Kişi ətirləri",
      womenCategory: "Qadın ətirləri",
      unisexCategory: "Uniseks ətirlər",
      categoryOpen: "Kateqoriyanı aç",
      categoryClose: "Kateqoriyanı bağla",
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
      trendingTag: "Trending",
      instagramTag: "Instagram",
      tiktokTag: "Address",
      shopCategory: "Shop",
      discoverCategory: "Discover",
      infoCategory: "Info",
      allProducts: "All products",
      menCategory: "Men",
      womenCategory: "Women",
      unisexCategory: "Unisex",
      categoryOpen: "Open category",
      categoryClose: "Close category",
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
      trendingTag: "Тренды",
      instagramTag: "Instagram",
      tiktokTag: "Адрес",
      shopCategory: "Покупки",
      discoverCategory: "Открыть",
      infoCategory: "Инфо",
      allProducts: "Все товары",
      menCategory: "Мужские",
      womenCategory: "Женские",
      unisexCategory: "Унисекс",
      categoryOpen: "Открыть категорию",
      categoryClose: "Закрыть категорию",
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
    if (!isMenuOpen) {
      setOpenMobileCategory(null);
      setIsMobileLocaleMenuOpen(false);
    }
  }, [isMenuOpen]);

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
    "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]";
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
        // Use a full navigation so all server-rendered segments resolve with the same locale.
        window.location.assign(nextPath);
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
          "fixed inset-0 z-40 origin-left transform-gpu overflow-hidden bg-[linear-gradient(160deg,rgba(40,28,68,0.48)_0%,rgba(20,18,32,0.42)_100%)] backdrop-blur-[3px] lg:hidden",
          menuTransition,
          isMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!isMenuOpen}
      >
        <div
          className={[
            "mx-auto flex h-full max-w-[1540px] flex-col px-2 py-2 sm:px-3 sm:py-3",
            menuTransition,
            isMenuOpen ? "translate-x-0" : "-translate-x-6",
          ].join(" ")}
        >
          <div
            className={[
              "relative flex h-full min-h-0 w-[min(85vw,20rem)] max-w-[20rem] flex-1 overflow-hidden rounded-[0.35rem] border border-zinc-300/70 bg-[linear-gradient(180deg,#f6f6f7_0%,#f3f3f4_100%)] p-3 shadow-[0_26px_48px_rgba(15,15,20,0.28)]",
              menuTransition,
              isMenuOpen ? "scale-100 opacity-100" : "scale-[0.985] opacity-0",
            ].join(" ")}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0)_42%),linear-gradient(180deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0)_32%)]"
            />
            <div aria-hidden="true" className="hero-grain pointer-events-none absolute inset-0 opacity-[0.035]" />

            <nav className="relative z-10 flex min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+2.75rem)]">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <span className="brand-wordmark block text-[1.95rem] leading-none tracking-[-0.045em] text-zinc-900">
                    Perfoumer
                  </span>
                  <span className="mt-1 block text-[0.5rem] font-medium tracking-[0.34em] uppercase text-zinc-500">
                    {copy[locale].navTitle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label={t.header.closeMenu}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-white/70"
                >
                  <X size={14} weight="regular" />
                </button>
              </div>

              <div className="divide-y divide-zinc-300/75 border-y border-zinc-300/75">
                <Link
                  href={toLocalePath("/", locale)}
                  onClick={() => setIsMenuOpen(false)}
                  style={{ transitionDelay: isMenuOpen ? "65ms" : "0ms" }}
                  className={[
                    "group flex min-h-10 items-center justify-between px-0.5 py-2.5 text-[0.9rem] font-medium text-zinc-900 transition-colors duration-200 hover:text-zinc-700",
                    menuTransition,
                    isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center text-zinc-600">
                      {getMobileItemIcon("/")}
                    </span>
                    <span className="truncate">{t.header.home}</span>
                  </span>
                  <ArrowRight size={12} weight="regular" className="shrink-0 text-zinc-500" />
                </Link>

                {[
                  {
                    id: "shop",
                    label: copy[locale].shopCategory,
                    iconHref: "/catalog",
                    items: [
                      { href: toLocalePath("/catalog", locale), label: copy[locale].allProducts },
                      {
                        href: `${toLocalePath("/catalog", locale)}?q=${encodeURIComponent(locale === "az" ? "kişi" : locale === "ru" ? "муж" : "men")}`,
                        label: copy[locale].menCategory,
                      },
                      {
                        href: `${toLocalePath("/catalog", locale)}?q=${encodeURIComponent(locale === "az" ? "qadın" : locale === "ru" ? "жен" : "women")}`,
                        label: copy[locale].womenCategory,
                      },
                      {
                        href: `${toLocalePath("/catalog", locale)}?q=${encodeURIComponent(locale === "ru" ? "унисекс" : "unisex")}`,
                        label: copy[locale].unisexCategory,
                      },
                      { href: toLocalePath("/brands", locale), label: t.header.brands },
                      { href: toLocalePath("/cart", locale), label: t.header.cart },
                      ...(session ? [{ href: toLocalePath("/wishlist", locale), label: copy[locale].wishlist }] : []),
                    ],
                  },
                  {
                    id: "discover",
                    label: copy[locale].discoverCategory,
                    iconHref: "/qoxunu",
                    items: [
                      { href: toLocalePath("/qoxunu", locale), label: t.header.scentQuiz },
                      { href: toLocalePath("/compare", locale), label: t.header.compare },
                      { href: toLocalePath("/blog", locale), label: copy[locale].blog },
                    ],
                  },
                  {
                    id: "info",
                    label: copy[locale].infoCategory,
                    iconHref: "/haqqimizda",
                    items: [
                      { href: toLocalePath("/haqqimizda", locale), label: copy[locale].aboutPage },
                      { href: toLocalePath("/elaqe", locale), label: t.header.contact },
                    ],
                  },
                ].map((category, index) => {
                  const isOpen = openMobileCategory === category.id;

                  return (
                    <div
                      key={category.id}
                      style={{ transitionDelay: isMenuOpen ? `${96 + index * 35}ms` : "0ms" }}
                      className={[
                        menuTransition,
                        isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMobileCategory((current) =>
                            current === category.id ? null : category.id,
                          )
                        }
                        aria-expanded={isOpen}
                        aria-label={isOpen ? copy[locale].categoryClose : copy[locale].categoryOpen}
                        className="group flex w-full min-h-10 items-center justify-between px-0.5 py-2.5 text-[0.9rem] font-medium text-zinc-900 transition-colors duration-200 hover:text-zinc-700"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="grid h-6 w-6 shrink-0 place-items-center text-zinc-600">
                            {getMobileItemIcon(category.iconHref)}
                          </span>
                          <span className="truncate">{category.label}</span>
                        </span>
                        <CaretDown
                          size={11}
                          weight="bold"
                          className={[
                            "shrink-0 text-zinc-500 transition-transform duration-300",
                            isOpen ? "rotate-180" : "rotate-0",
                          ].join(" ")}
                        />
                      </button>

                      <div
                        className={[
                          "grid overflow-hidden transition-all duration-350 ease-out",
                          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                        ].join(" ")}
                      >
                        <div className="min-h-0">
                          <div className="mb-2 ml-8 flex flex-col gap-1 rounded-xl border border-zinc-200/70 bg-white/65 p-2.5">
                            {category.items.map((childItem) => (
                              <Link
                                key={childItem.href}
                                href={childItem.href}
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[0.76rem] font-medium text-zinc-700 transition-colors hover:bg-white hover:text-zinc-900"
                              >
                                <span className="truncate">{childItem.label}</span>
                                <ArrowRight size={11} weight="regular" className="text-zinc-400" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link
                href={accountHref}
                onClick={() => setIsMenuOpen(false)}
                style={{
                  transitionDelay: isMenuOpen
                    ? `${130 + (primaryMenuItems.length + secondaryMenuItems.length) * 34}ms`
                    : "0ms",
                }}
                className={[
                  "mt-3 flex items-center justify-between rounded-[0.7rem] bg-zinc-900 px-3 py-2.5 text-white",
                  menuTransition,
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                ].join(" ")}
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10">
                    <UserCircle size={14} weight="regular" className="text-white/90" aria-hidden="true" />
                  </span>
                  <span className="text-[0.54rem] font-medium tracking-[0.26em] uppercase text-white/72">
                    {copy[locale].accountTag}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-playfair)] text-[1.45rem] tracking-[-0.02em]">{accountLabel}</span>
              </Link>

              <div
                className={[
                  "mt-3 border-t border-zinc-300/75 pt-3",
                  menuTransition,
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                ].join(" ")}
                style={{
                  transitionDelay: isMenuOpen
                    ? `${170 + (primaryMenuItems.length + secondaryMenuItems.length) * 34}ms`
                    : "0ms",
                }}
              >
                <p className="mb-2 font-[family-name:var(--font-playfair)] text-[1.95rem] leading-none tracking-[-0.035em] text-zinc-900">
                  {copy[locale].trendingTag}
                </p>
                <div className="grid grid-cols-2 gap-2 pb-1">
                  {[
                    { href: toLocalePath("/catalog", locale), title: t.header.products, image: "/perfoumerjar.png" },
                    { href: toLocalePath("/qoxunu", locale), title: t.header.scentQuiz, image: "/logo.webp" },
                  ].map((card) => (
                    <Link
                      key={`trend-${card.href}`}
                      href={card.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="group relative block h-28 overflow-hidden rounded-[0.15rem] bg-zinc-300"
                    >
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        sizes="120px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,12,0.02)_0%,rgba(10,10,12,0.62)_100%)]" />
                      <span className="absolute inset-x-2 bottom-1.5 truncate text-[0.62rem] font-medium text-white">
                        {card.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div
                className={[
                  "mt-auto border-t border-zinc-300/75 pt-2",
                  menuTransition,
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                ].join(" ")}
                style={{
                  transitionDelay: isMenuOpen
                    ? `${200 + (primaryMenuItems.length + secondaryMenuItems.length) * 34}ms`
                    : "0ms",
                }}
              >
                <div className="mb-2 flex flex-col gap-1.5">
                  <Link
                    href="https://www.instagram.com/perfoumer"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-[0.82rem] font-medium text-zinc-700 transition-colors hover:bg-white/60 hover:text-zinc-900"
                  >
                    <InstagramLogo size={15} weight="regular" className="text-zinc-600" aria-hidden="true" />
                    <span>{copy[locale].instagramTag}</span>
                  </Link>
                  <Link
                    href="https://share.google/ZMRu8MvbSGL6FjuKy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-[0.82rem] font-medium text-zinc-700 transition-colors hover:bg-white/60 hover:text-zinc-900"
                  >
                    <MapPin size={15} weight="regular" className="text-zinc-600" aria-hidden="true" />
                    <span>{copy[locale].tiktokTag}</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-2.5 min-[350px]:grid-cols-[auto_1fr] min-[350px]:items-center">
                  <span className="pl-0.5 text-[0.54rem] font-medium tracking-[0.24em] uppercase text-zinc-500">
                    {copy[locale].languageTag}
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsMobileLocaleMenuOpen((current) => !current)}
                      aria-haspopup="listbox"
                      aria-expanded={isMobileLocaleMenuOpen}
                      disabled={isLocalePending}
                      className="inline-flex min-h-11 w-full items-center justify-between rounded-2xl border border-zinc-300 bg-white/80 px-3.5 py-2 text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-zinc-800 transition-colors duration-200 hover:border-zinc-400 disabled:cursor-wait disabled:opacity-70"
                    >
                      <span>{t.languages[pendingLocale ?? locale]}</span>
                      <CaretDown
                        size={14}
                        weight="bold"
                        className={[
                          "text-zinc-500 transition-transform duration-250",
                          isMobileLocaleMenuOpen ? "rotate-180" : "rotate-0",
                        ].join(" ")}
                      />
                    </button>

                    <div
                      className={[
                        "absolute inset-x-0 bottom-[calc(100%+0.45rem)] z-20 origin-bottom overflow-hidden rounded-2xl border border-zinc-300 bg-white/95 shadow-[0_18px_30px_rgba(20,20,24,0.14)] transition-all duration-250",
                        isMobileLocaleMenuOpen
                          ? "pointer-events-auto translate-y-0 opacity-100"
                          : "pointer-events-none translate-y-1 opacity-0",
                      ].join(" ")}
                      role="listbox"
                    >
                      {locales.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setIsMobileLocaleMenuOpen(false);
                            void updateLocale(item);
                          }}
                          disabled={isLocalePending}
                          className={[
                            "flex min-h-11 w-full items-center justify-between border-b border-zinc-200 px-3.5 text-left text-[0.7rem] font-semibold tracking-[0.2em] uppercase transition-colors duration-200 last:border-b-0 disabled:cursor-wait disabled:opacity-70",
                            (pendingLocale ?? locale) === item
                              ? "bg-zinc-900 text-white"
                              : "text-zinc-700 hover:bg-zinc-100",
                          ].join(" ")}
                        >
                          <span>{t.languages[item]}</span>
                          {(pendingLocale ?? locale) === item ? (
                            <span className="text-[0.58rem] tracking-[0.14em] text-white/80">OK</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
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
