"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CaretDown,
  Gift,
  GridFour,
  HeartStraight,
  House,
  Info,
  InstagramLogo,
  MapPin,
  MagnifyingGlass,
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
import type { CartItemRow } from "@/types/cart";

type HeaderProps = {
  floating?: boolean;
  locale: Locale;
};

function parsePrice(value: number | string): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function Header({ floating = false, locale }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  const [isMobileLocaleMenuOpen, setIsMobileLocaleMenuOpen] = useState(false);
  const [isMobileUtilityExpanded, setIsMobileUtilityExpanded] = useState(false);
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [isLocalePending, startLocaleTransition] = useTransition();
  const [session, setSession] = useState<Session | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [wishlistItemCount, setWishlistItemCount] = useState(0);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [cartRows, setCartRows] = useState<CartItemRow[]>([]);
  const [cartBusyId, setCartBusyId] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [cartMetaBySlug, setCartMetaBySlug] = useState<Record<string, { name: string; brand: string; image: string }>>({});
  const cartCountRequestRef = useRef(0);
  const wishlistCountRequestRef = useRef(0);
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
      giftCard: "Hədiyyə Kartı",
      giftIdeas: "Hədiyyə ideaları",
      womenTab: "Qadın",
      menTab: "Kişi",
      unisexTab: "Uniseks",
      brandsTab: "Brendlər",
      compareTab: "Müqayisə",
      homeTab: "Ana səhifə",
      quickActions: "Sürətli keçidlər",
      cartTitle: "Səbət",
      subtotal: "Cəmi",
      shipping: "Çatdırılma",
      shippingFree: "Ödənişsiz",
      total: "Yekun",
      checkout: "Səbətə keç",
      continueShopping: "Alış-verişə davam et",
      emptyCart: "Səbətiniz boşdur",
      signInToCart: "Səbət üçün giriş et",
      remove: "Sil",
      size: "Ölçü",
      qty: "Say",
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
      giftCard: "Gift Card",
      giftIdeas: "Gift ideas",
      womenTab: "Women",
      menTab: "Men",
      unisexTab: "Unisex",
      brandsTab: "Brands",
      compareTab: "Compare",
      homeTab: "Home",
      quickActions: "Quick actions",
      cartTitle: "Cart",
      subtotal: "Subtotal",
      shipping: "Shipping",
      shippingFree: "Free",
      total: "Total",
      checkout: "Go to cart",
      continueShopping: "Continue shopping",
      emptyCart: "Your cart is empty",
      signInToCart: "Sign in for cart",
      remove: "Remove",
      size: "Size",
      qty: "Qty",
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
      giftCard: "Подарочная карта",
      giftIdeas: "Идеи подарков",
      womenTab: "Женщины",
      menTab: "Мужчины",
      unisexTab: "Унисекс",
      brandsTab: "Бренды",
      compareTab: "Сравнение",
      homeTab: "Главная",
      quickActions: "Быстрые действия",
      cartTitle: "Корзина",
      subtotal: "Сумма",
      shipping: "Доставка",
      shippingFree: "Бесплатно",
      total: "Итого",
      checkout: "Перейти в корзину",
      continueShopping: "Продолжить покупки",
      emptyCart: "Корзина пуста",
      signInToCart: "Войдите для корзины",
      remove: "Удалить",
      size: "Размер",
      qty: "Кол-во",
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
  const cartLoginHref = `${toLocalePath("/login", locale)}?next=${encodeURIComponent(toLocalePath("/cart", locale))}`;
  const accountHref = session ? toLocalePath("/account", locale) : loginHref;
  const accountLabel = session ? copy[locale].account : copy[locale].login;
  const mobileCategories = [
    {
      id: "shop",
      label: copy[locale].shopCategory,
      items: [
        { href: toLocalePath("/catalog", locale), label: copy[locale].allProducts },
        { href: `${toLocalePath("/catalog", locale)}?gender=male`, label: copy[locale].menCategory },
        { href: `${toLocalePath("/catalog", locale)}?gender=female`, label: copy[locale].womenCategory },
        { href: `${toLocalePath("/catalog", locale)}?gender=unisex`, label: copy[locale].unisexCategory },
        { href: toLocalePath("/brands", locale), label: t.header.brands },
      ],
    },
    {
      id: "discover",
      label: copy[locale].discoverCategory,
      items: [
        { href: toLocalePath("/qoxunu", locale), label: t.header.scentQuiz },
        { href: toLocalePath("/compare", locale), label: t.header.compare },
        { href: toLocalePath("/blog", locale), label: copy[locale].blog },
      ],
    },
    {
      id: "info",
      label: copy[locale].infoCategory,
      items: [
        { href: toLocalePath("/haqqimizda", locale), label: copy[locale].aboutPage },
        { href: toLocalePath("/elaqe", locale), label: t.header.contact },
        ...(session ? [{ href: toLocalePath("/wishlist", locale), label: copy[locale].wishlist }] : []),
      ],
    },
  ];
  const activeMobileCategory = mobileCategories.find((category) => category.id === openMobileCategory) ?? null;

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

  const loadWishlistItemCount = useCallback(
    async (userId: string) => {
      const requestId = ++wishlistCountRequestRef.current;
      if (!supabase || !isSupabaseConfigured()) {
        if (requestId === wishlistCountRequestRef.current) {
          setWishlistItemCount(0);
        }
        return;
      }

      let count = 0;

      const primary = await supabase
        .from("wishlists")
        .select("perfume_slug", { count: "exact", head: true })
        .eq("user_id", userId);

      if (primary.error) {
        const fallback = await supabase
          .from("wishlist_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (fallback.error) {
          if (requestId === wishlistCountRequestRef.current) {
            setWishlistItemCount(0);
          }
          return;
        }

        count = fallback.count ?? 0;
      } else {
        count = primary.count ?? 0;
      }

      if (requestId === wishlistCountRequestRef.current) {
        setWishlistItemCount(Number.isFinite(count) ? count : 0);
      }
    },
    [supabase],
  );

  const emitCartUpdated = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("perfoumer:cart-updated"));
  }, []);

  const loadCartRows = useCallback(async () => {
    if (!supabase || !session?.user?.id || !isSupabaseConfigured()) {
      setCartRows([]);
      return;
    }

    setIsCartLoading(true);
    setCartMessage("");

    const { data, error } = await supabase
      .from("cart_items")
      .select("id,user_id,perfume_slug,size_ml,quantity,unit_price,created_at,updated_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setCartMessage(error.message || "Cart loading failed.");
      setCartRows([]);
      setIsCartLoading(false);
      return;
    }

    const rows = (data as CartItemRow[] | null) ?? [];
    setCartRows(rows);

    const slugs = [...new Set(rows.map((row) => row.perfume_slug).filter(Boolean))];
    if (slugs.length) {
      try {
        const response = await fetch("/api/perfumes/cart-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slugs }),
        });

        if (response.ok) {
          const json = (await response.json()) as {
            items?: Array<{ slug: string; name: string; brand: string; image: string }>;
          };
          const mapped: Record<string, { name: string; brand: string; image: string }> = {};
          for (const item of json.items ?? []) {
            mapped[item.slug] = {
              name: item.name,
              brand: item.brand,
              image: item.image,
            };
          }
          setCartMetaBySlug(mapped);
        }
      } catch {
        // Keep drawer usable even if metadata fetch fails.
      }
    } else {
      setCartMetaBySlug({});
    }

    setIsCartLoading(false);
  }, [session?.user?.id, supabase]);

  const removeCartRow = useCallback(
    async (rowId: string) => {
      if (!supabase || !session?.user?.id || cartBusyId) return;

      setCartBusyId(rowId);
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", rowId)
        .eq("user_id", session.user.id);

      if (error) {
        setCartMessage(error.message || "Remove failed.");
      } else {
        setCartRows((prev) => prev.filter((row) => row.id !== rowId));
        emitCartUpdated();
      }

      setCartBusyId("");
    },
    [cartBusyId, emitCartUpdated, session?.user?.id, supabase],
  );

  useEffect(() => {
    if (isMenuOpen || isCartDrawerOpen) {
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartDrawerOpen, isMenuOpen]);

  useEffect(() => {
    const isOverlayOpen = isMenuOpen || isCartDrawerOpen;
    window.dispatchEvent(
      new CustomEvent("perfoumer:ui-overlay", {
        detail: { isOpen: isOverlayOpen },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("perfoumer:ui-overlay", {
          detail: { isOpen: false },
        }),
      );
    };
  }, [isCartDrawerOpen, isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsCartDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      setOpenMobileCategory(null);
      setIsMobileLocaleMenuOpen(false);
      setIsMobileUtilityExpanded(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isCartDrawerOpen) return;
    if (!session?.user?.id) return;
    void loadCartRows();
  }, [isCartDrawerOpen, loadCartRows, session?.user?.id]);

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
        void loadWishlistItemCount(currentSession.user.id);
      } else {
        setCartItemCount(0);
        setWishlistItemCount(0);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        void loadCartItemCount(nextSession.user.id);
        void loadWishlistItemCount(nextSession.user.id);
      } else {
        setCartItemCount(0);
        setWishlistItemCount(0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadCartItemCount, loadWishlistItemCount]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || typeof window === "undefined") {
      return;
    }

    const onCartUpdated = () => {
      void loadCartItemCount(userId);
    };

    const onWishlistUpdated = () => {
      void loadWishlistItemCount(userId);
    };

    window.addEventListener("perfoumer:cart-updated", onCartUpdated);
    window.addEventListener("perfoumer:wishlist-updated", onWishlistUpdated);

    return () => {
      window.removeEventListener("perfoumer:cart-updated", onCartUpdated);
      window.removeEventListener("perfoumer:wishlist-updated", onWishlistUpdated);
    };
  }, [session?.user?.id, loadCartItemCount, loadWishlistItemCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onCartUpdated = () => {
      if (isCartDrawerOpen && session?.user?.id) {
        void loadCartRows();
      }
    };

    window.addEventListener("perfoumer:cart-updated", onCartUpdated);

    return () => {
      window.removeEventListener("perfoumer:cart-updated", onCartUpdated);
    };
  }, [isCartDrawerOpen, loadCartRows, session?.user?.id]);

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

  const openCartDrawer = useCallback(() => {
    setIsMenuOpen(false);
    setIsCartDrawerOpen(true);
  }, []);

  const cartItems = useMemo(
    () =>
      cartRows.map((row) => {
        const meta = cartMetaBySlug[row.perfume_slug];
        const unitPrice = parsePrice(row.unit_price);
        const quantity = Number.isFinite(row.quantity) ? row.quantity : 1;

        return {
          row,
          name: meta?.name || slugToName(row.perfume_slug),
          brand: meta?.brand || "Perfoumer",
          image: meta?.image || "/perfoumerlogo.png",
          quantity,
          unitPrice,
          lineTotal: Math.round(unitPrice * quantity * 100) / 100,
        };
      }),
    [cartMetaBySlug, cartRows],
  );

  const cartSubtotal = useMemo(
    () => Math.round(cartItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100,
    [cartItems],
  );

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
        <div className="border-b border-zinc-300 bg-[#f4f4f4] px-3 py-3 lg:hidden">
          <div className="relative mx-auto flex h-12 max-w-[1540px] items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={isMenuOpen ? t.header.closeMenu : t.header.openMenu}
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="group relative grid h-10 w-10 place-items-center text-zinc-900"
              >
                <span
                  className={[
                    "absolute block h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isMenuOpen ? "translate-y-0 rotate-45" : "-translate-y-[5px] rotate-0 group-hover:-translate-y-[6px]",
                  ].join(" ")}
                />
                <span
                  className={[
                    "absolute block h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isMenuOpen ? "translate-y-0 -rotate-45" : "translate-y-[5px] rotate-0 group-hover:translate-y-[6px]",
                  ].join(" ")}
                />
              </button>
              <Link
                href={toLocalePath("/catalog", locale)}
                aria-label={t.header.products}
                className="grid h-10 w-10 place-items-center text-zinc-900"
              >
                <MagnifyingGlass size={23} weight="regular" />
              </Link>
            </div>

            <Link
              href={toLocalePath("/", locale)}
              className="absolute left-1/2 top-1/2 flex w-full max-w-[calc(100%-10.5rem)] -translate-x-1/2 -translate-y-1/2 justify-center px-1"
              onClick={() => setIsMenuOpen(false)}
            >
              <Image
                src="/perfmmob.png"
                alt="Perfoumer"
                width={174}
                height={35}
                priority
                className="h-[28px] w-[min(46vw,174px)] object-contain"
              />
            </Link>

            <div className="flex items-center gap-1">
              <Link
                href={toLocalePath("/wishlist", locale)}
                aria-label={copy[locale].wishlist}
                className="relative grid h-10 w-10 place-items-center text-zinc-900"
              >
                <HeartStraight size={22} weight="regular" />
                {wishlistItemCount > 0 ? (
                  <span className="absolute right-[2px] top-[3px] inline-flex min-w-[0.95rem] items-center justify-center rounded-full bg-zinc-900 px-1 py-0.5 text-[9px] font-semibold leading-none text-white">
                    {wishlistItemCount > 99 ? "99+" : wishlistItemCount}
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                aria-label={t.header.cart}
                onClick={openCartDrawer}
                className="relative grid h-10 w-10 place-items-center text-zinc-900"
              >
                <ShoppingBag size={22} weight="regular" />
                {cartItemCount > 0 ? (
                  <span className="absolute right-[2px] top-[3px] inline-flex min-w-[0.95rem] items-center justify-center rounded-full bg-zinc-900 px-1 py-0.5 text-[9px] font-semibold leading-none text-white">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto hidden max-w-[1540px] px-3 pt-3 sm:px-6 sm:pt-5 md:px-10 lg:block">
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
                href={toLocalePath("/wishlist", locale)}
                aria-label={copy[locale].wishlist}
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
                <HeartStraight
                  size={18}
                  weight="regular"
                  className="relative z-[1] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.04] group-active:translate-y-0 group-active:scale-95 sm:size-[19px]"
                />
                {wishlistItemCount > 0 ? (
                  <span className="absolute -right-1 -top-1 z-[2] inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-zinc-900 px-1 py-0.5 text-[10px] font-semibold leading-none text-white shadow-[0_6px_14px_rgba(24,24,24,0.28)] ring-1 ring-white transition-transform duration-300 group-hover:scale-105 group-active:scale-95 sm:min-w-[1.2rem]">
                    {wishlistItemCount > 99 ? "99+" : wishlistItemCount}
                  </span>
                ) : null}
              </Link>

              <button
                type="button"
                onClick={openCartDrawer}
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
              </button>

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
          "fixed inset-0 z-[55] overflow-hidden",
          isCartDrawerOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!isCartDrawerOpen}
      >
        <div
          onClick={() => setIsCartDrawerOpen(false)}
          className={[
            "absolute inset-0 bg-black/35 transition-opacity duration-300",
            isCartDrawerOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        <aside
          className={[
            "absolute right-0 top-0 h-full w-[min(91vw,23.5rem)] rounded-l-[1.8rem] border-l border-zinc-300 bg-[#f6f6f5] shadow-[-24px_0_48px_rgba(12,12,14,0.22)] transition-transform duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isCartDrawerOpen ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-zinc-300 px-5 py-4.5">
              <h3 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-zinc-900">{copy[locale].cartTitle}</h3>
              <button
                type="button"
                aria-label={t.header.closeMenu}
                onClick={() => setIsCartDrawerOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-800 transition-colors hover:bg-zinc-200/70"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3.5">
              {!session ? (
                <div className="rounded-2xl border border-zinc-300 bg-white/90 p-4">
                  <p className="text-sm text-zinc-700">{copy[locale].signInToCart}</p>
                  <Link
                    href={cartLoginHref}
                    onClick={() => setIsCartDrawerOpen(false)}
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-4 text-sm font-medium text-white"
                  >
                    {accountLabel}
                  </Link>
                </div>
              ) : isCartLoading ? (
                <div className="flex items-center justify-center py-10" role="status" aria-label="Loading cart">
                  <svg viewBox="0 0 60 60" className="h-12 w-12" aria-hidden="true">
                    <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(24,24,27,0.16)" strokeWidth="1.8" />
                    <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(24,24,27,0.85)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="14 124">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 30 30"
                        to="360 30 30"
                        dur="1.15s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle cx="30" cy="30" r="16" fill="none" stroke="rgba(24,24,27,0.5)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="10 90">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="360 30 30"
                        to="0 30 30"
                        dur="1.65s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <path d="M30 16C30.8 19.8 34.5 22.4 34.5 27C34.5 30.1 32 32.6 29 32.6C26 32.6 23.5 30.1 23.5 27C23.5 22.4 27.2 19.8 28 16Z" fill="rgba(24,24,27,0.9)">
                      <animate
                        attributeName="opacity"
                        values="0.55;1;0.55"
                        dur="1.1s"
                        repeatCount="indefinite"
                      />
                    </path>
                    <circle cx="30" cy="39" r="2.4" fill="rgba(24,24,27,0.78)">
                      <animate
                        attributeName="r"
                        values="2;2.8;2"
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="rounded-2xl border border-zinc-300 bg-white/90 p-4 text-sm text-zinc-700">
                  {copy[locale].emptyCart}
                </div>
              ) : (
                <div className="divide-y divide-zinc-200/70">
                  {cartItems.map((item) => (
                    <article key={item.row.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex gap-3">
                      <div className="relative h-[4.9rem] w-[4.15rem] shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-[linear-gradient(160deg,#ffffff_0%,#f4f4f3_100%)]">
                        <Image src={item.image} alt={item.name} fill sizes="64px" unoptimized className="object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[0.64rem] leading-none font-semibold tracking-[0.08em] uppercase text-zinc-700">{item.brand}</p>
                            <p className="mt-0.5 line-clamp-1 text-[1.02rem] leading-tight tracking-[-0.01em] text-zinc-900">{item.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeCartRow(item.row.id)}
                            disabled={cartBusyId === item.row.id}
                            className="grid h-6 w-6 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
                            aria-label={copy[locale].remove}
                          >
                            <X size={14} weight="bold" />
                          </button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.69rem] font-medium text-zinc-600">
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5">
                            {copy[locale].size}: {item.row.size_ml}ml
                          </span>
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5">
                            {copy[locale].qty}: {item.quantity}
                          </span>
                        </div>
                        <p className="mt-1.5 flex items-end gap-1 text-[1.34rem] leading-none font-semibold tracking-[-0.02em] text-zinc-900">
                          <span>{item.lineTotal.toFixed(2)}</span>
                          <span className="text-[0.42rem] font-semibold tracking-[0.08em] text-zinc-700">AZN</span>
                        </p>
                      </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {cartMessage ? <p className="mt-3 text-xs text-red-600">{cartMessage}</p> : null}
            </div>

            <div className="border-t border-zinc-300 px-5 py-3.5">
              <div className="space-y-1.5 text-sm text-zinc-800">
                <div className="flex items-center justify-between">
                  <span>{copy[locale].subtotal}</span>
                  <span className="font-medium">{cartSubtotal.toFixed(2)} AZN</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{copy[locale].shipping}</span>
                  <span className="font-medium">{copy[locale].shippingFree}</span>
                </div>
                <div className="flex items-center justify-between text-[1.05rem] font-semibold tracking-[-0.01em] text-zinc-900">
                  <span>{copy[locale].total}</span>
                  <span>{cartSubtotal.toFixed(2)} AZN</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <Link
                  href={toLocalePath("/cart", locale)}
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="group relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(16,16,20,0.22)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-[0_16px_30px_rgba(16,16,20,0.3)] active:translate-y-0 active:scale-[0.995]"
                >
                  <span aria-hidden="true" className="pointer-events-none absolute -left-1/4 top-0 h-full w-1/2 -skew-x-12 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.34)_50%,rgba(255,255,255,0)_100%)] opacity-0 transition-[transform,opacity] duration-700 group-hover:translate-x-[250%] group-hover:opacity-100" />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_140%,rgba(115,138,255,0.28)_0%,rgba(115,138,255,0)_55%)] opacity-0 transition-opacity duration-400 group-hover:opacity-100" />
                  <span className="relative z-[1] transition-transform duration-300 group-hover:tracking-[0.012em]">{copy[locale].checkout}</span>
                </Link>
                <Link
                  href={toLocalePath("/catalog", locale)}
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="group relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 shadow-[0_8px_18px_rgba(16,16,20,0.06)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-[0_14px_24px_rgba(16,16,20,0.14)] active:translate-y-0 active:scale-[0.995]"
                >
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.98)_0%,rgba(243,246,255,0.95)_45%,rgba(236,240,250,0.96)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span aria-hidden="true" className="pointer-events-none absolute -left-1/4 top-0 h-full w-1/2 -skew-x-12 bg-[linear-gradient(90deg,rgba(126,143,255,0)_0%,rgba(126,143,255,0.3)_50%,rgba(126,143,255,0)_100%)] opacity-0 transition-[transform,opacity] duration-700 group-hover:translate-x-[250%] group-hover:opacity-100" />
                  <span className="relative z-[1] transition-transform duration-300 group-hover:tracking-[0.012em]">{copy[locale].continueShopping}</span>
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div
        className={[
          "fixed inset-0 z-40 origin-top transform-gpu overflow-y-auto border-t border-zinc-300 bg-[#f4f4f4] lg:hidden",
          menuTransition,
          isMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0",
        ].join(" ")}
        aria-hidden={!isMenuOpen}
      >
        <div className="mx-auto max-w-[1540px] px-4 pb-[calc(env(safe-area-inset-bottom)+2.75rem)] pt-[4.65rem] sm:px-6">
          <nav className="relative z-10 w-full overflow-x-hidden">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMobileLocaleMenuOpen((current) => !current)}
                  aria-haspopup="listbox"
                  aria-expanded={isMobileLocaleMenuOpen}
                  disabled={isLocalePending}
                  className="inline-flex min-h-13 w-full items-center justify-between border border-zinc-300 bg-[#f6f6f6] px-3.5 py-2 text-sm font-medium text-zinc-900 disabled:cursor-wait disabled:opacity-70"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-base">🇦🇿</span>
                    <span>Dil: {t.languages[pendingLocale ?? locale]}</span>
                  </span>
                  <CaretDown size={14} weight="bold" className="text-zinc-700" />
                </button>

                <div
                  className={[
                    "absolute inset-x-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden border border-zinc-300 bg-white shadow-[0_16px_28px_rgba(20,20,24,0.12)] transition-all duration-250",
                    isMobileLocaleMenuOpen
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-1 opacity-0",
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
                        "flex min-h-11 w-full items-center justify-between border-b border-zinc-200 px-3.5 text-left text-sm font-medium transition-colors duration-200 last:border-b-0 disabled:cursor-wait disabled:opacity-70",
                        (pendingLocale ?? locale) === item
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-700 hover:bg-zinc-100",
                      ].join(" ")}
                    >
                      <span>{t.languages[item]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Link
                href={accountHref}
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex min-h-13 items-center gap-2.5 border border-zinc-300 bg-[#f6f6f6] px-3.5 py-2 text-sm font-medium text-zinc-900"
              >
                <UserCircle size={22} weight="regular" aria-hidden="true" />
                <span>{accountLabel}</span>
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-300/75 bg-white/60 p-2">
              <button
                type="button"
                onClick={() => setIsMobileUtilityExpanded((current) => !current)}
                className="inline-flex min-h-10 w-full items-center justify-between rounded-xl px-2.5 text-sm font-semibold text-zinc-900"
              >
                <span>{copy[locale].quickActions}</span>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={[
                    "text-zinc-600 transition-transform duration-300",
                    isMobileUtilityExpanded ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </button>

              <div
                className={[
                  "grid overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isMobileUtilityExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                ].join(" ")}
              >
                <div className="min-h-0">
                  <div className="mt-2 space-y-2 border-t border-zinc-200/75 pt-2">
                    <Link
                      href={toLocalePath("/catalog", locale)}
                      onClick={() => setIsMenuOpen(false)}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-600 bg-white px-3 text-sm font-semibold text-rose-600"
                    >
                      <Gift size={17} weight="regular" aria-hidden="true" />
                      <span>{copy[locale].giftCard}</span>
                    </Link>
                    <Link
                      href={toLocalePath("/blog", locale)}
                      onClick={() => setIsMenuOpen(false)}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-zinc-900 bg-transparent px-3 text-sm font-semibold text-zinc-900"
                    >
                      <span>{copy[locale].giftIdeas}</span>
                    </Link>
                  </div>

                  <div className="mt-3 flex items-center gap-2.5 overflow-x-auto pb-1 text-[0.92rem] text-zinc-900">
                    <Link href={`${toLocalePath("/catalog", locale)}?gender=female`} onClick={() => setIsMenuOpen(false)} className="shrink-0">{copy[locale].womenTab}</Link>
                    <Link href={`${toLocalePath("/catalog", locale)}?gender=male`} onClick={() => setIsMenuOpen(false)} className="shrink-0 rounded bg-zinc-200 px-2 py-0.5">{copy[locale].menTab}</Link>
                    <Link href={`${toLocalePath("/catalog", locale)}?gender=unisex`} onClick={() => setIsMenuOpen(false)} className="shrink-0">{copy[locale].unisexTab}</Link>
                    <Link href={toLocalePath("/brands", locale)} onClick={() => setIsMenuOpen(false)} className="shrink-0">{copy[locale].brandsTab}</Link>
                    <Link href={toLocalePath("/compare", locale)} onClick={() => setIsMenuOpen(false)} className="shrink-0">{copy[locale].compareTab}</Link>
                    <Link href={toLocalePath("/", locale)} onClick={() => setIsMenuOpen(false)} className="shrink-0">{copy[locale].homeTab}</Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden">
              <div
                className={[
                  "grid grid-cols-[100%_100%] transition-transform duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  openMobileCategory ? "-translate-x-full" : "translate-x-0",
                ].join(" ")}
              >
                <div
                  className={[
                    "min-w-0 divide-y divide-zinc-300/75 border-y border-zinc-300/75 transition-opacity duration-250",
                    openMobileCategory ? "pointer-events-none opacity-50" : "opacity-100",
                  ].join(" ")}
                >
                <Link
                  href={toLocalePath("/", locale)}
                  onClick={() => setIsMenuOpen(false)}
                  style={{ transitionDelay: isMenuOpen ? "65ms" : "0ms" }}
                  className={[
                    "group flex min-h-10 items-center justify-between py-2.5 text-[1.25rem] leading-none font-medium text-zinc-900 transition-colors duration-200 hover:text-zinc-700",
                    menuTransition,
                    isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  ].join(" ")}
                >
                  <span className="truncate">{t.header.home}</span>
                  <ArrowRight size={14} weight="regular" className="shrink-0 text-zinc-500" />
                </Link>

                {mobileCategories.map((category, index) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setOpenMobileCategory(category.id)}
                    style={{ transitionDelay: isMenuOpen ? `${96 + index * 35}ms` : "0ms" }}
                    className={[
                      "group flex w-full min-h-10 items-center justify-between py-2.5 text-left text-[1.25rem] leading-none font-medium text-zinc-900 transition-colors duration-200 hover:text-zinc-700",
                      menuTransition,
                      isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                    ].join(" ")}
                  >
                    <span className="truncate">{category.label}</span>
                    <ArrowRight size={14} weight="regular" className="shrink-0 text-zinc-500" />
                  </button>
                ))}
                </div>

                <div className="min-w-0 pl-2">
                  <div
                    className={[
                      "border-t border-zinc-300/75 pt-2 transition-opacity duration-300",
                      openMobileCategory ? "opacity-100" : "pointer-events-none opacity-0",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMobileCategory(null)}
                      className="inline-flex min-h-10 items-center gap-2 text-[1.15rem] font-semibold text-zinc-900"
                    >
                      <ArrowLeft size={18} weight="regular" aria-hidden="true" />
                      <span>{activeMobileCategory?.label}</span>
                    </button>

                    <div className="mt-3 space-y-0.5">
                      {activeMobileCategory?.items.map((item) => (
                        <Link
                          key={`mobile-sub-${item.href}`}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex min-h-10 items-center justify-between rounded-lg py-1 text-[0.95rem] font-medium text-zinc-800 transition-colors hover:bg-white/60 hover:text-zinc-950"
                        >
                          <span className="truncate">{item.label}</span>
                          <ArrowRight size={14} weight="regular" className="text-zinc-500" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

              <div
                className={[
                  "mt-5 border-t border-zinc-300/75 pt-2",
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
                    className="inline-flex min-h-10 items-center gap-2.5 py-1 text-[0.9rem] font-medium text-zinc-700 transition-colors hover:text-zinc-900"
                  >
                    <InstagramLogo size={15} weight="regular" className="text-zinc-600" aria-hidden="true" />
                    <span>{copy[locale].instagramTag}</span>
                  </Link>
                  <Link
                    href="https://share.google/ZMRu8MvbSGL6FjuKy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex min-h-10 items-center gap-2.5 py-1 text-[0.9rem] font-medium text-zinc-700 transition-colors hover:text-zinc-900"
                  >
                    <MapPin size={15} weight="regular" className="text-zinc-600" aria-hidden="true" />
                    <span>{copy[locale].tiktokTag}</span>
                  </Link>
                </div>
              </div>
          </nav>
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
