"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, ShoppingBag } from "@phosphor-icons/react";
import type { Session } from "@supabase/supabase-js";
import { getDictionary, locales, type Locale } from "@/lib/i18n";
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
  const pathname = usePathname();
  const t = getDictionary(locale);
  const supabase = getSupabaseBrowserClient();
  const copy = {
    az: {
      login: "Giriş",
      account: "Hesabım",
      wishlist: "İstək siyahısı",
    },
    en: {
      login: "Login",
      account: "My Account",
      wishlist: "Wishlist",
    },
    ru: {
      login: "Вход",
      account: "Мой аккаунт",
      wishlist: "Wishlist",
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
    { href: "/#about", label: t.header.about },
    { href: "/#contact", label: t.header.contact },
  ];
  const desktopMenuItems = [
    { href: "/catalog", label: t.header.products },
    { href: "/compare", label: t.header.compare },
    { href: "/qoxunu", label: t.header.scentQuiz },
    { href: "/brands", label: t.header.brands },
  ];
  const mobileDrawerMenuItems = [...primaryMenuItems, ...secondaryMenuItems];
  const desktopDrawerMenuItems = [
    ...primaryMenuItems.filter((item) => !desktopMenuItems.some((desktopItem) => desktopItem.href === item.href)),
    ...secondaryMenuItems.filter((item) => !desktopMenuItems.some((desktopItem) => desktopItem.href === item.href)),
  ];
  const loginHref = useMemo(() => {
    const nextPath = pathname || "/";
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }, [pathname]);
  const accountHref = session ? "/account" : loginHref;
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
        return pathname === "/";
      }

      return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
    },
    [pathname],
  );

  const updateLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale || isLocalePending) {
      return;
    }

    setPendingLocale(nextLocale);
    setIsMenuOpen(false);

    startLocaleTransition(async () => {
      try {
        await fetch("/api/locale", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: nextLocale }),
          keepalive: true,
        });
      } finally {
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
            className="header-load-in header-shell-glow relative isolate flex items-center gap-3 overflow-hidden rounded-[1.7rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.88)_0%,rgba(247,246,243,0.95)_52%,rgba(240,239,236,0.92)_100%)] px-3 py-3 text-zinc-900 shadow-[0_20px_48px_rgba(17,17,19,0.1)] ring-1 ring-black/[0.04] backdrop-blur-xl transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4 sm:py-3.5 lg:gap-4 lg:px-5"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0)_44%),linear-gradient(120deg,rgba(255,255,255,0.62)_0%,rgba(255,255,255,0.12)_48%,rgba(231,229,225,0.36)_100%)] opacity-100 transition-opacity duration-500"
            />
            <div
              aria-hidden="true"
              className="hero-grain pointer-events-none absolute inset-0 opacity-[0.07] transition-opacity duration-500"
            />

            <Link
              href="/"
              className="header-load-in header-load-in--logo relative z-10 inline-flex shrink-0 items-center gap-2 rounded-[1.2rem] px-1 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              <span
                className="header-logo-orb grid h-10 w-10 place-items-center overflow-hidden rounded-[1rem] border border-white/80 bg-[radial-gradient(circle_at_30%_28%,#ffffff_0%,#f3f2ef_72%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(15,15,18,0.08)] transition-[background-color,border-color,box-shadow] duration-500 sm:h-12 sm:w-12"
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
              <span className="brand-wordmark text-[1.44rem] tracking-[-0.04em] text-zinc-900 sm:text-[1.78rem]">
                Perfoumer
              </span>
            </Link>

            <nav className="header-load-in relative z-10 ml-2 hidden flex-1 items-center justify-center gap-1 lg:flex">
              {desktopMenuItems.map((item) => {
                const isActive = isItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group relative rounded-full px-4 py-2 text-[0.7rem] font-medium tracking-[0.2em] uppercase transition-colors duration-300 xl:px-5",
                      isActive ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900",
                    ].join(" ")}
                  >
                    <span>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={[
                        "absolute inset-x-4 bottom-[7px] h-px origin-center transition-transform duration-300 xl:inset-x-5",
                        "bg-zinc-800/55",
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      ].join(" ")}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="header-load-in header-load-in--controls relative z-10 ml-auto flex items-center gap-2 sm:gap-3">
              <div
                className="hidden items-center rounded-full border border-white/75 bg-white/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:flex"
              >
                {locales.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateLocale(item)}
                    disabled={isLocalePending}
                    className={[
                      "rounded-full px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.18em] uppercase transition-colors duration-200 disabled:cursor-wait disabled:opacity-70",
                      (pendingLocale ?? locale) === item
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:text-zinc-800",
                    ].join(" ")}
                  >
                    {t.languages[item]}
                  </button>
                ))}
              </div>

              <Link
                href="/cart"
                aria-label={t.header.cart}
                className="group relative grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-[linear-gradient(155deg,#ffffff_0%,#f4f4f2_100%)] text-zinc-700 shadow-[0_10px_20px_rgba(24,24,24,0.12)] transition-[transform,box-shadow,background-color,border-color] duration-300 hover:-translate-y-px hover:shadow-[0_16px_28px_rgba(24,24,24,0.17)] active:translate-y-0 sm:h-11 sm:w-11"
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
                className="group relative grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/90 text-zinc-700 shadow-sm transition-[background-color,box-shadow,border-color,color] duration-300 hover:-translate-y-px hover:bg-white hover:shadow-md sm:h-11 sm:w-11"
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
          "fixed inset-0 z-40 origin-top transform-gpu overflow-hidden bg-[linear-gradient(138deg,#101114_0%,#17181d_34%,#23201f_68%,#2b2523_100%)] text-white shadow-[0_30px_80px_rgba(12,12,14,0.38)]",
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
            <nav className="flex w-full flex-col self-start lg:hidden">
              {mobileDrawerMenuItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
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

              <div
                className={[
                  "mt-6 flex lg:hidden",
                  menuTransition,
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                ].join(" ")}
                style={{
                  transitionDelay: isMenuOpen
                    ? `${160 + (primaryMenuItems.length + secondaryMenuItems.length) * 50}ms`
                    : "0ms",
                }}
              >
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {locales.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => updateLocale(item)}
                      disabled={isLocalePending}
                      className={[
                        "rounded-full px-2.5 py-1 text-[0.72rem] font-medium tracking-[0.2em] transition-all duration-200 disabled:cursor-wait disabled:opacity-70",
                        (pendingLocale ?? locale) === item
                          ? "bg-white text-zinc-950 shadow-[0_8px_18px_rgba(24,24,24,0.16)]"
                          : "border border-transparent text-white/62 hover:text-white",
                      ].join(" ")}
                    >
                      {t.languages[item]}
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            <nav className="hidden w-full flex-col self-start lg:flex">
              {desktopDrawerMenuItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
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
                    ? `${110 + desktopDrawerMenuItems.length * 50}ms`
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
