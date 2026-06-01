"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CaretDown,
  Coins,
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
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import {
  getDictionary,
  locales,
  stripLocalePrefix,
  toLocalePath,
  type Locale,
} from "@/lib/i18n";
import {
  CURRENCY_META,
  SUPPORTED_CURRENCIES,
  formatCurrencyFromAzn,
  getCurrencyShortLabel,
  type SupportedCurrency,
} from "@/lib/currency";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CartItemRow } from "@/types/cart";

type HeaderProps = {
  floating?: boolean;
  locale: Locale;
  topOffsetStyle?: CSSProperties;
};

type HeaderSearchTab = "all" | "women" | "men" | "unisex" | "brands" | "home";

type HeaderSearchResult = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number | null;
  originalPrice: number | null;
  discountedPrice: number | null;
  discountPercent: number | null;
  gender: string;
  inStock: boolean;
  variantCount?: number;
};

type HeaderSearchBrandResult = {
  brand: string;
  count: number;
};

const BRAND_LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

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

function getOrCreateStorageId(key: string, storage: Storage): string {
  const existing = storage.getItem(key);
  if (existing && existing.trim().startsWith("v2_")) {
    return existing;
  }

  const next = `v2_${crypto.randomUUID()}`;
  storage.setItem(key, next);
  return next;
}

async function trackHeaderSearch(params: {
  query: string;
  tab: HeaderSearchTab;
  resultCount: number;
  session: Session | null;
}) {
  if (typeof window === "undefined") return;

  const anonymousId = getOrCreateStorageId("perfoumer.analytics.v2.anonymous-id", window.localStorage);
  const sessionId = getOrCreateStorageId("perfoumer.analytics.v2.session-id", window.localStorage);
  const path = `/search?q=${encodeURIComponent(params.query)}&tab=${encodeURIComponent(params.tab)}&limit=16&result_count=${params.resultCount}`;

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      anonymousId,
      eventType: "v2_page_view",
      userId: params.session?.user?.id ?? null,
      isLoggedIn: Boolean(params.session?.user),
      locale: document.documentElement.lang || "az",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      path,
      referrer: window.location.href,
      deviceType: "desktop",
      os: "",
      browser: "",
    }),
    keepalive: true,
  });
}

function HoverMorphIcon({ icon: Icon }: { icon: any }) {
  return (
    <span className="relative grid h-5 w-5 shrink-0 place-items-center motion-safe:group-hover:animate-header-icon-bounce" aria-hidden="true">
      <Icon
        size={16}
        weight="regular"
        className="absolute inset-0 m-auto text-white/90 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-90 group-hover:opacity-0"
      />
      <Icon
        size={16}
        weight="fill"
        className="absolute inset-0 m-auto scale-75 text-white opacity-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-hover:opacity-100"
      />
      <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 blur-[1px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:opacity-100" />
    </span>
  );
}

function ChevronMorphIcon({ open, size = 14 }: { open: boolean; size?: number }) {
  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center align-middle leading-none" aria-hidden="true">
      <CaretDown
        size={size}
        className={[
          "absolute inset-0 m-auto text-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "rotate-180 scale-95 opacity-0" : "rotate-0 scale-100 opacity-100",
        ].join(" ")}
      />
      <CaretDown
        size={size}
        className={[
          "absolute inset-0 m-auto text-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "rotate-180 scale-100 opacity-100" : "rotate-0 scale-95 opacity-0",
        ].join(" ")}
      />
    </span>
  );
}

export function Header({ floating = false, locale, topOffsetStyle }: HeaderProps) {
  const siteSettings = useSiteSettings();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTab, setSearchTab] = useState<HeaderSearchTab>("all");
  const [searchResults, setSearchResults] = useState<HeaderSearchResult[]>([]);
  const [searchBrandResults, setSearchBrandResults] = useState<HeaderSearchBrandResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [brokenSearchImages, setBrokenSearchImages] = useState<Record<string, true>>({});
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  const [isMobileLocaleMenuOpen, setIsMobileLocaleMenuOpen] = useState(false);
  const [isMobileCurrencyMenuOpen, setIsMobileCurrencyMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [currencyAnimationKey, setCurrencyAnimationKey] = useState(0);
  const [isBrandsMenuOpen, setIsBrandsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const morePanelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const localeMenuRef = useRef<HTMLDivElement | null>(null);
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
  const searchRequestRef = useRef(0);
  const currencyMenuRef = useRef<HTMLDivElement | null>(null);
  const brandsMenuRef = useRef<HTMLDivElement | null>(null);
  const brandsMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const menuCloseTimerRef = useRef<number | null>(null);
  const currencyPanelCloseTimerRef = useRef<number | null>(null);
  const pulseCurrency = useCallback(() => {
    setCurrencyAnimationKey((value) => value + 1);
  }, []);
  // Per-letter magnetic hover: toggles 'brand-active' class on nearest letter for a snappy iPad-like feel
  useEffect(() => {
    const panel = brandsMenuPanelRef.current;
    if (!panel) return;
    const container = panel.querySelector('.brand-letters-container') as HTMLElement | null;
    if (!container) return;

    const letters = Array.from(container.querySelectorAll<HTMLElement>('.brand-letter'));
    if (!letters.length) return;

    let last = -1;
    const TH = 48; // snap threshold px (smaller -> snappier)

    function onMove(e: PointerEvent) {
      const px = e.clientX;
      const py = e.clientY;
      let best = Infinity;
      let bestIdx = -1;
      for (let i = 0; i < letters.length; i += 1) {
        const r = letters[i].getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(px - cx, py - cy);
        if (d < best) { best = d; bestIdx = i; }
      }

      if (bestIdx !== last) {
        // clear previous active
        if (last >= 0) {
          letters[last].classList.remove('brand-active');
        }
        if (best <= TH) {
          // set only the active class on the nearest letter
          letters[bestIdx].classList.add('brand-active');
          last = bestIdx;
        } else {
          last = -1;
        }
      }
    }

    function onLeave() {
      if (last >= 0) { letters[last].classList.remove('brand-active'); last = -1; }
    }

    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerleave', onLeave);

    return () => {
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
    };
  }, [isBrandsMenuOpen]);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const brandsMenuCloseTimerRef = useRef<number | null>(null);
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const { pathname: basePathname } = stripLocalePrefix(pathname);
  const t = getDictionary(locale, siteSettings);
  const supabase = getSupabaseBrowserClient();
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const copy = {
    az: {
      login: "Giriş",
      account: "Hesabım",
      wishlist: "Seçilmişlər",
      blog: "Blog",
      aboutPage: "Haqqımızda",
      navTitle: "Naviqasiya",
      menuTag: "Menyu",
      accountTag: "Hesab",
      languageTag: "Dil",
      currencyTag: "Valyuta",
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
      offersTab: "Təkliflər",
      womenTab: "Qadın",
      menTab: "Kişi",
      unisexTab: "Uniseks",
      brandsTab: "Brendlər",
      compareTab: "Müqayisə",
      homeTab: "Ana səhifə",
      quickActions: "Sürətli keçidlər",
      searchPlaceholder: "Ətir, brend və ya not axtar...",
      searchProductsTitle: "Məhsullar",
      searchBrandsTitle: "Brendlər",
      searchCategoriesTitle: "Kateqoriyalar",
      searchEmpty: "Axtarışa uyğun nəticə tapılmadı.",
      searchVariantCount: "{count} versiya",
      searchStartHint: "Ətir və ya kateqoriya tapmaq üçün axtarışa yazın.",
      searchTabs: {
        all: "Hamısı",
        women: "Qadın",
        men: "Kişi",
        unisex: "Uniseks",
        brands: "Brendlər",
        home: "Ana səhifə",
      },
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
      currencyTag: "Currency",
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
      offersTab: "Offers",
      womenTab: "Women",
      menTab: "Men",
      unisexTab: "Unisex",
      brandsTab: "Brands",
      compareTab: "Compare",
      homeTab: "Home",
      quickActions: "Quick actions",
      searchPlaceholder: "Search perfume, brand, or notes...",
      searchProductsTitle: "Products",
      searchBrandsTitle: "Brands",
      searchCategoriesTitle: "Categories",
      searchEmpty: "No matching results found.",
      searchVariantCount: "{count} variants",
      searchStartHint: "Type to find perfumes or categories.",
      searchTabs: {
        all: "All",
        women: "Women",
        men: "Men",
        unisex: "Unisex",
        brands: "Brands",
        home: "Home",
      },
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
      currencyTag: "Валюта",
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
      offersTab: "Предложения",
      womenTab: "Женщины",
      menTab: "Мужчины",
      unisexTab: "Унисекс",
      brandsTab: "Бренды",
      compareTab: "Сравнение",
      homeTab: "Главная",
      quickActions: "Быстрые действия",
      searchPlaceholder: "Поиск по аромату, бренду или нотам...",
      searchProductsTitle: "Товары",
      searchBrandsTitle: "Бренды",
      searchCategoriesTitle: "Категории",
      searchEmpty: "Ничего не найдено по вашему запросу.",
      searchVariantCount: "{count} вариантов",
      searchStartHint: "Введите запрос, чтобы найти ароматы или категории.",
      searchTabs: {
        all: "Все",
        women: "Женские",
        men: "Мужские",
        unisex: "Унисекс",
        brands: "Бренды",
        home: "Главная",
      },
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
  const localeFlagSrc: Record<Locale, string> = {
    az: "/flags/az.svg",
    en: "/flags/en.svg",
    ru: "/flags/ru.svg",
  };
  const primaryMenuItems = [
    { href: "/", label: t.header.home },
    { href: "/catalog", label: t.header.products },
    { href: "/compare", label: t.header.compare },
    { href: "/qoxunu", label: t.header.scentQuiz },
  ];
  const primaryNav = [
    { href: "/catalog", label: t.header.products, icon: ShoppingBag },
    { href: "/brands", label: t.header.brands, icon: Buildings },
    { href: "/offers", label: copy[locale].offersTab, icon: Gift },
    { href: "/qoxunu", label: t.header.scentQuiz, icon: Sparkle },
  ];
  const secondaryNav = [
    { href: "/blog", label: copy[locale].blog, icon: NewspaperClipping },
    { href: "/haqqimizda", label: copy[locale].aboutPage, icon: Info },
    { href: "/compare", label: t.header.compare, icon: Scales },
    { href: "/catalog?special=gift-ideas", label: copy[locale].giftIdeas, icon: Gift },
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
    { href: "/offers", label: copy[locale].offersTab },
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
  // Useful additional links to show in the compact desktop popover if they
  // aren't already present in the main navigation. Labels are translated.
  const usefulCandidates = [
    { href: accountHref, label: accountLabel, icon: UserCircle },
    { href: toLocalePath("/wishlist", locale), label: copy[locale].wishlist, icon: HeartStraight },
    { href: toLocalePath("/elaqe", locale), label: t.header.contact, icon: Phone },
    { href: toLocalePath("/blog", locale), label: copy[locale].blog, icon: NewspaperClipping },
    { href: toLocalePath("/catalog?special=gift-ideas", locale), label: copy[locale].giftIdeas, icon: Gift },
    { href: toLocalePath("/offers", locale), label: copy[locale].offersTab, icon: Gift },
    { href: toLocalePath("/compare", locale), label: t.header.compare, icon: Scales },
    { href: toLocalePath("/qoxunu", locale), label: t.header.scentQuiz, icon: Sparkle },
  ];

  const normalizeHref = (href: string) => {
    try {
      const { pathname: p } = stripLocalePrefix(href);
      return p || href;
    } catch {
      return href;
    }
  };

  const existingHrefs = new Set([
    ...primaryNav.map((n) => normalizeHref(n.href)),
    ...secondaryNav.map((n) => normalizeHref(n.href)),
    ...desktopMenuItems.map((n) => normalizeHref(n.href)),
  ]);

  const extraPopoverItems = usefulCandidates.filter((c) => !existingHrefs.has(normalizeHref(c.href)));
  // Show only items that are not already present in the main navbar (desktopMenuItems)
  const popoverList = extraPopoverItems;
  const mobileCategories = [
    {
      id: "shop",
      label: copy[locale].shopCategory,
      items: [
        { href: toLocalePath("/catalog", locale), label: copy[locale].allProducts },
        { href: `${toLocalePath("/catalog", locale)}?gender=male`, label: copy[locale].menCategory },
        { href: `${toLocalePath("/catalog", locale)}?gender=female`, label: copy[locale].womenCategory },
        { href: `${toLocalePath("/catalog", locale)}?gender=unisex`, label: copy[locale].unisexCategory },
        { href: toLocalePath("/offers", locale), label: copy[locale].offersTab },
        { href: toLocalePath("/brands", locale), label: t.header.brands },
      ],
    },
    {
      id: "gifts",
      label: copy[locale].giftCard,
      items: [
        { href: toLocalePath("/catalog", locale), label: copy[locale].giftCard },
        { href: `${toLocalePath("/catalog", locale)}?special=gift-ideas`, label: copy[locale].giftIdeas },
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

  useEffect(() => {
    const panel = menuPanelRef.current;
    if (!panel) return;
    const activePanel = panel;

    let raf = 0;

    function onPointerMove(e: Event) {
      const pe = e as PointerEvent;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
      const items = Array.from(activePanel.querySelectorAll<HTMLElement>(".menu-item"));
        for (const it of items) {
          const r = it.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = pe.clientX - cx;
          const dy = pe.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const max = 140;
          const strength = Math.max(0, 1 - dist / max);
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : 0;
          const tx = nx * strength * 3; // softer translation
          const ty = ny * strength * 3;
          it.style.transform = `translate(${tx}px, ${ty}px) scale(${1 + strength * 0.01})`;
          it.style.willChange = "transform";
          const _z = Math.round(strength * 100);
          it.style.zIndex = _z > 0 ? String(50 + _z) : "";
        }
      });
    }

    function onLeave() {
      const items = Array.from(activePanel.querySelectorAll<HTMLElement>(".menu-item"));
      for (const it of items) {
        it.style.transform = "";
        it.style.willChange = "auto";
        it.style.zIndex = "";
        it.style.transition = "transform 420ms cubic-bezier(0.22,0.9,0.36,1)";
      }
    }

    activePanel.addEventListener("pointermove", onPointerMove as EventListener);
    activePanel.addEventListener("pointerleave", onLeave as EventListener);

    return () => {
      activePanel.removeEventListener("pointermove", onPointerMove as EventListener);
      activePanel.removeEventListener("pointerleave", onLeave as EventListener);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Brands alphabet magnet removed — feature disabled

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
    // Intentionally do not lock body scroll when overlays open.
    // This keeps the page scrollable while the menu/panels are visible.
    return;
  }, [isCartDrawerOpen, isMenuOpen, isSearchDrawerOpen]);

  useEffect(() => {
    const isOverlayOpen = isMenuOpen || isCartDrawerOpen || isSearchDrawerOpen;
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
  }, [isCartDrawerOpen, isMenuOpen, isSearchDrawerOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsCartDrawerOpen(false);
    setIsSearchDrawerOpen(false);
    setIsCurrencyMenuOpen(false);
    setIsMobileCurrencyMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      setOpenMobileCategory(null);
      setIsMobileLocaleMenuOpen(false);
      setIsMobileCurrencyMenuOpen(false);
      setIsCurrencyMenuOpen(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isCurrencyMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!currencyMenuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !currencyMenuRef.current.contains(target)) {
        setIsCurrencyMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isCurrencyMenuOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!moreMenuRef.current) return;

      const target = event.target;
      if (target instanceof Node && !moreMenuRef.current.contains(target)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMoreOpen]);

  useEffect(() => {
    const panel = morePanelRef.current;
    if (!panel) return;

    let raf = 0;

    function onPointerMove(e: Event) {
      const pe = e as PointerEvent;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = panel;
        if (!p) return;
        const items = Array.from(p.querySelectorAll<HTMLElement>(".more-item"));
        for (const it of items) {
          const r = it.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = pe.clientX - cx;
          const dy = pe.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const max = 180;
          const strength = Math.max(0, 1 - dist / max);
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : 0;
          const tx = nx * strength * 4;
          const ty = ny * strength * 4;
          it.style.transform = `translate(${tx}px, ${ty}px) scale(${1 + strength * 0.01})`;
          it.style.willChange = "transform";
        }
      });
    }

    function onPanelLeave() {
      const p = panel;
      if (!p) return;
      const items = Array.from(p.querySelectorAll<HTMLElement>(".more-item"));
      for (const it of items) {
        it.style.transform = "";
        it.style.willChange = "auto";
        it.style.zIndex = "";
        it.style.transition = "transform 420ms cubic-bezier(0.22,0.9,0.36,1)";
      }
    }

    panel.addEventListener("pointermove", onPointerMove as EventListener);
    panel.addEventListener("pointerleave", onPanelLeave as EventListener);

    return () => {
      panel.removeEventListener("pointermove", onPointerMove as EventListener);
      panel.removeEventListener("pointerleave", onPanelLeave as EventListener);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMoreOpen]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let raf = 0;

    function onPointerMove(e: Event) {
      const pe = e as PointerEvent;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = header;
        if (!h) return;
        const items = Array.from(h.querySelectorAll<HTMLElement>(".menu-item, .more-item, .currency-item, .locale-item"));
        for (const it of items) {
          const r = it.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = pe.clientX - cx;
          const dy = pe.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const max = 140;
          const strength = Math.max(0, 1 - dist / max);
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : 0;
          const tx = nx * strength * 3;
          const ty = ny * strength * 3;
          it.style.transform = `translate(${tx}px, ${ty}px) scale(${1 + strength * 0.01})`;
          it.style.willChange = "transform";
        }
      });
    }

    function onLeave() {
      const h = header;
      if (!h) return;
      const items = Array.from(h.querySelectorAll<HTMLElement>(".menu-item, .more-item, .currency-item, .locale-item"));
      for (const it of items) {
        it.style.transform = "";
        it.style.willChange = "auto";
        it.style.zIndex = "";
        it.style.transition = "transform 420ms cubic-bezier(0.22,0.9,0.36,1)";
      }
    }

    header.addEventListener("pointermove", onPointerMove as EventListener);
    header.addEventListener("pointerleave", onLeave as EventListener);

    return () => {
      header.removeEventListener("pointermove", onPointerMove as EventListener);
      header.removeEventListener("pointerleave", onLeave as EventListener);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!localeMenuRef.current) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!localeMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !localeMenuRef.current.contains(target)) {
        setIsLocaleMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isLocaleMenuOpen]);

  useEffect(() => {
    const panel = localeMenuRef.current?.querySelector('[role="listbox"]');
    if (!panel) return;

    let raf = 0;

    function onPointerMove(e: Event) {
      const pe = e as PointerEvent;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = panel;
        if (!p) return;
        const items = Array.from(p.querySelectorAll<HTMLElement>(".locale-item"));
        for (const it of items) {
          const r = it.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = pe.clientX - cx;
          const dy = pe.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const max = 140;
          const strength = Math.max(0, 1 - dist / max);
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : 0;
          const tx = nx * strength * 10;
          const ty = ny * strength * 6;
          it.style.transform = `translate(${tx}px, ${ty}px) scale(${1 + strength * 0.02})`;
          it.style.willChange = "transform";
          const _z = Math.round(strength * 100);
          it.style.zIndex = _z > 0 ? String(50 + _z) : "";
          it.style.transition = "transform 90ms ease-out";
        }
      });
    }

    function onLeave() {
      const p = panel;
      if (!p) return;
      const items = Array.from(p.querySelectorAll<HTMLElement>(".locale-item"));
      for (const it of items) {
        it.style.transform = "";
        it.style.willChange = "auto";
        it.style.zIndex = "";
        it.style.transition = "transform 220ms cubic-bezier(0.22,1,0.36,1)";
      }
    }

    panel.addEventListener("pointermove", onPointerMove as EventListener);
    panel.addEventListener("pointerleave", onLeave as EventListener);

    return () => {
      panel.removeEventListener("pointermove", onPointerMove as EventListener);
      panel.removeEventListener("pointerleave", onLeave as EventListener);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isLocaleMenuOpen]);

  useEffect(() => {
    const panel = currencyMenuRef.current?.querySelector('[role="listbox"]') || currencyMenuRef.current;
    if (!panel) return;

    let raf = 0;

    function onPointerMove(e: Event) {
      const pe = e as PointerEvent;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = panel;
        if (!p) return;
        const items = Array.from(p.querySelectorAll<HTMLElement>(".currency-item"));
        for (const it of items) {
          const r = it.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = pe.clientX - cx;
          const dy = pe.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const max = 120;
          const strength = Math.max(0, 1 - dist / max);
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : 0;
          const tx = nx * strength * 12;
          const ty = ny * strength * 8;
          it.style.transform = `translate(${tx}px, ${ty}px) scale(${1 + strength * 0.035})`;
          it.style.willChange = "transform";
          const _z = Math.round(strength * 100);
          it.style.zIndex = _z > 0 ? String(50 + _z) : "";
          it.style.transition = "transform 140ms cubic-bezier(0.22,1,0.36,1)";
        }
      });
    }

    function onLeave() {
      const p = panel;
      if (!p) return;
      const items = Array.from(p.querySelectorAll<HTMLElement>(".currency-item"));
      for (const it of items) {
        it.style.transform = "";
        it.style.willChange = "auto";
        it.style.zIndex = "";
        it.style.transition = "transform 220ms cubic-bezier(0.22,1,0.36,1)";
      }
    }

    panel.addEventListener("pointermove", onPointerMove as EventListener);
    panel.addEventListener("pointerleave", onLeave as EventListener);

    return () => {
      panel.removeEventListener("pointermove", onPointerMove as EventListener);
      panel.removeEventListener("pointerleave", onLeave as EventListener);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isCurrencyMenuOpen]);

  useEffect(() => {
    if (!isBrandsMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const triggerElement = brandsMenuRef.current;
      const panelElement = brandsMenuPanelRef.current;

      if (!triggerElement && !panelElement) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Node &&
        !triggerElement?.contains(target) &&
        !panelElement?.contains(target)
      ) {
        setIsBrandsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isBrandsMenuOpen]);

  useEffect(() => {
    return () => {
      if (brandsMenuCloseTimerRef.current) {
        window.clearTimeout(brandsMenuCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isCartDrawerOpen) return;
    if (!session?.user?.id) return;
    void loadCartRows();
  }, [isCartDrawerOpen, loadCartRows, session?.user?.id]);

  useEffect(() => {
    if (!isSearchDrawerOpen) {
      return;
    }

    const query = searchQuery.trim();

    if (!query) {
      setIsSearchLoading(false);
      setSearchResults([]);
      setSearchBrandResults([]);
      return;
    }

    const requestId = ++searchRequestRef.current;
    const controller = new AbortController();
    setIsSearchLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/perfumes/search?q=${encodeURIComponent(query)}&tab=${searchTab}&limit=16`,
          { signal: controller.signal, cache: "no-store" },
        );

        if (!response.ok) {
          if (requestId === searchRequestRef.current) {
            setSearchResults([]);
            setSearchBrandResults([]);
          }
          return;
        }

        const data = (await response.json()) as {
          items?: HeaderSearchResult[];
          brands?: HeaderSearchBrandResult[];
        };

        if (requestId !== searchRequestRef.current) {
          return;
        }

        const items = Array.isArray(data.items) ? data.items : [];
        setSearchResults(items);
        setSearchBrandResults(Array.isArray(data.brands) ? data.brands : []);
        void trackHeaderSearch({
          query,
          tab: searchTab,
          resultCount: items.length,
          session,
        });
      } catch {
        if (requestId === searchRequestRef.current) {
          setSearchResults([]);
          setSearchBrandResults([]);
        }
      } finally {
        if (requestId === searchRequestRef.current) {
          setIsSearchLoading(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isSearchDrawerOpen, searchQuery, searchTab, session]);

  useEffect(() => {
    if (!Object.keys(brokenSearchImages).length) {
      return;
    }

    const visibleSlugs = new Set(searchResults.map((item) => item.slug));
    setBrokenSearchImages((prev) => {
      const nextEntries = Object.entries(prev).filter(([slug]) => visibleSlugs.has(slug));
      if (nextEntries.length === Object.keys(prev).length) {
        return prev;
      }

      return Object.fromEntries(nextEntries) as Record<string, true>;
    });
  }, [brokenSearchImages, searchResults]);

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

  // Helper to extract a friendly username from Supabase user metadata or email.
  const getUsernameFromMetadata = (metadata: unknown) => {
    if (!metadata || typeof metadata !== "object") return "";
    const meta = metadata as Record<string, unknown>;
    const candidates = [meta.username, meta.full_name, meta.name]
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
    return candidates[0] ?? "";
  };

  const getUsernameFromEmail = (email: string | null | undefined) => {
    const local = (email ?? "").split("@")[0]?.trim() ?? "";
    return local.slice(0, 40);
  };

  const displayName = session?.user
    ? getUsernameFromMetadata(session.user.user_metadata) || getUsernameFromEmail(session.user.email)
    : "";

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
    "absolute left-1/2 top-1/2 block h-0.5 -translate-x-1/2 rounded-full bg-current opacity-100 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]";

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

  const getBrandLetterHref = useCallback(
    (letter: string) => `${toLocalePath("/brands", locale)}#brands-letter-${letter.toLowerCase()}`,
    [locale],
  );

  const closeCompetingUi = useCallback(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
    setIsSearchDrawerOpen(false);
    setIsCartDrawerOpen(false);
    setIsLocaleMenuOpen(false);
    setIsCurrencyMenuOpen(false);
    setIsMobileLocaleMenuOpen(false);
    setIsMobileCurrencyMenuOpen(false);
    setOpenMobileCategory(null);
  }, []);

  const openBrandsMenu = useCallback(() => {
    if (brandsMenuCloseTimerRef.current) {
      window.clearTimeout(brandsMenuCloseTimerRef.current);
      brandsMenuCloseTimerRef.current = null;
    }
    closeCompetingUi();
    setIsBrandsMenuOpen(true);
  }, [closeCompetingUi]);

  const closeBrandsMenu = useCallback((delay = 0) => {
    if (brandsMenuCloseTimerRef.current) {
      window.clearTimeout(brandsMenuCloseTimerRef.current);
      brandsMenuCloseTimerRef.current = null;
    }

    if (delay > 0) {
      brandsMenuCloseTimerRef.current = window.setTimeout(() => {
        setIsBrandsMenuOpen(false);
        brandsMenuCloseTimerRef.current = null;
      }, delay) as any;
      return;
    }

    setIsBrandsMenuOpen(false);
  }, []);

  const toggleBrandsMenu = useCallback(() => {
    if (isBrandsMenuOpen) {
      closeBrandsMenu();
      return;
    }

    openBrandsMenu();
  }, [closeBrandsMenu, isBrandsMenuOpen, openBrandsMenu]);

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
    setIsSearchDrawerOpen(false);
    setIsCartDrawerOpen(true);
  }, []);

  const toggleMenuDrawer = useCallback(() => {
    setIsSearchDrawerOpen(false);
    setIsCartDrawerOpen(false);
    setIsCurrencyMenuOpen(false);
    setIsMenuOpen((prev) => !prev);
  }, []);

  const openMenuDrawer = useCallback(() => {
    if (menuCloseTimerRef.current) {
      window.clearTimeout(menuCloseTimerRef.current);
      menuCloseTimerRef.current = null;
    }
    setIsCurrencyMenuOpen(false);
    setIsMenuOpen(true);
  }, []);

  const closeMenuDrawer = useCallback((delay = 0) => {
    if (menuCloseTimerRef.current) {
      window.clearTimeout(menuCloseTimerRef.current);
      menuCloseTimerRef.current = null;
    }

    if (delay > 0) {
      menuCloseTimerRef.current = window.setTimeout(() => {
        setIsMenuOpen(false);
        menuCloseTimerRef.current = null;
      }, delay);
      return;
    }

    setIsMenuOpen(false);
  }, []);

  const searchTabs = useMemo(
    () => ["all", "women", "men", "unisex"] as HeaderSearchTab[],
    [],
  );

  const closeSearchDrawer = useCallback(() => {
    setIsSearchDrawerOpen(false);
  }, []);

  const openSearchDrawer = useCallback(() => {
    setIsMenuOpen(false);
    setIsCartDrawerOpen(false);
    setSearchTab("all");
    setIsSearchDrawerOpen(true);
  }, []);

  const openSearchProduct = useCallback(
    (slug: string, variantId?: string) => {
      const variantQuery = variantId ? `?v=${encodeURIComponent(variantId)}` : "";
      router.push(toLocalePath(`/perfumes/${slug}${variantQuery}`, locale));
      closeSearchDrawer();
    },
    [closeSearchDrawer, locale, router],
  );

  const searchCategoryItems = useMemo(
    () => [
      { key: "catalog-all", label: copy[locale].searchTabs.all, href: toLocalePath("/catalog", locale), tab: "all" as const },
      { key: "catalog-women", label: copy[locale].searchTabs.women, href: `${toLocalePath("/catalog", locale)}?gender=female`, tab: "women" as const },
      { key: "catalog-men", label: copy[locale].searchTabs.men, href: `${toLocalePath("/catalog", locale)}?gender=male`, tab: "men" as const },
      { key: "catalog-unisex", label: copy[locale].searchTabs.unisex, href: `${toLocalePath("/catalog", locale)}?gender=unisex`, tab: "unisex" as const },
      { key: "brands", label: copy[locale].searchTabs.brands, href: toLocalePath("/brands", locale), tab: "brands" as const },
      { key: "home", label: copy[locale].searchTabs.home, href: toLocalePath("/", locale), tab: "home" as const },
      { key: "gift-ideas", label: copy[locale].giftIdeas, href: `${toLocalePath("/catalog", locale)}?special=gift-ideas`, tab: "all" as const },
      { key: "offers", label: copy[locale].offersTab, href: toLocalePath("/offers", locale), tab: "all" as const },
      { key: "compare", label: copy[locale].compareTab, href: toLocalePath("/compare", locale), tab: "all" as const },
      { key: "quiz", label: t.header.scentQuiz, href: toLocalePath("/qoxunu", locale), tab: "all" as const },
    ],
    [copy, locale, t.header.scentQuiz],
  );

  const filteredSearchCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return searchCategoryItems.filter((item) => {
      if (searchTab !== "all" && item.tab !== searchTab && item.tab !== "all") {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return item.label.toLowerCase().includes(normalizedQuery);
    });
  }, [searchCategoryItems, searchQuery, searchTab]);

  const hasActiveSearchQuery = searchQuery.trim().length > 0;
  const currentCurrencyLabel = getCurrencyShortLabel(selectedCurrency);

  const cartItems = useMemo(
    () =>
      cartRows.map((row) => {
        const meta = cartMetaBySlug[row.perfume_slug];
        const unitPrice = parsePrice(row.unit_price);
        const quantity = Number.isFinite(row.quantity) ? row.quantity : 1;

        return {
          row,
          name: meta?.name || slugToName(row.perfume_slug),
          brand: meta?.brand || siteSettings.siteName,
          image: meta?.image || "/perfoumerlogo.png",
          quantity,
          unitPrice,
          lineTotal: Math.round(unitPrice * quantity * 100) / 100,
        };
      }),
    [cartMetaBySlug, cartRows, siteSettings.siteName],
  );

  const cartSubtotal = useMemo(
    () => Math.round(cartItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100,
    [cartItems],
  );

  const updateLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale || nextLocale === pendingLocale) {
      return;
    }

    setPendingLocale(nextLocale);
    setIsMenuOpen(false);
    setIsMobileLocaleMenuOpen(false);

    const nextSearch = searchParams.toString();
    const nextHash = typeof window === "undefined" ? "" : window.location.hash;
    const nextPath = `${toLocalePath(basePathname, nextLocale)}${nextSearch ? `?${nextSearch}` : ""}${nextHash}`;

    // Persist the locale in the browser immediately so the very next
    // navigation/reload cannot race against a stale cookie value.
    document.cookie = `perfoumer-locale=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;

    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
        keepalive: true,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Locale persistence failed.");
      }
    } catch {
      // Keep the client cookie and continue even if the route handler fails.
    }

    // Force a fresh request after persisting locale so the App Router
    // doesn't reuse a stale prefetched payload from the previous language.
    startLocaleTransition(() => {
      window.location.assign(nextPath);
    });
  };

  return (
    <>
      <header
        className={[
          "z-[90] w-full opacity-100",
          floating ? "fixed inset-x-0 top-0" : "relative",
        ].join(" ")}
        style={floating ? topOffsetStyle : undefined}
      >
        <div className="bg-[#f3f3f2] px-3 py-3 lg:hidden">
          <div className="relative mx-auto flex h-12 max-w-[1540px] items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={isMenuOpen ? t.header.closeMenu : t.header.openMenu}
                aria-expanded={isMenuOpen}
                onClick={toggleMenuDrawer}
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
              <button
                type="button"
                onClick={openSearchDrawer}
                aria-label={t.header.products}
                className="grid h-10 w-10 place-items-center text-zinc-900"
              >
                <MagnifyingGlass size={23} weight="regular" />
              </button>
            </div>

            <Link
              href={toLocalePath("/", locale)}
              className="absolute left-1/2 top-1/2 flex w-full max-w-[calc(100%-10.5rem)] -translate-x-1/2 -translate-y-1/2 justify-center px-1"
              onClick={() => setIsMenuOpen(false)}
            >
              <Image
                src="/perfmmob.png"
                alt={siteSettings.siteName}
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

        <div className="hidden w-full px-0 pt-0 sm:px-0 sm:pt-0 md:px-0 lg:block">
          <div
            className="header-load-in relative isolate overflow-visible bg-[#f3f3f2] text-zinc-900 shadow-none ring-0 backdrop-blur-0 transition-[background-color,border-color] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0"
            />
            <div
              aria-hidden="true"
              className="hero-grain pointer-events-none absolute inset-0 opacity-0"
            />
            

            <div ref={headerRef} className="mx-auto grid w-full max-w-[1540px] grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 xl:gap-4 xl:px-8">

            <Link
              href={toLocalePath("/", locale)}
              className="header-load-in header-load-in--logo relative z-10 inline-flex shrink-0 items-center gap-2 rounded-[1.2rem] px-1 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              <span
                className="header-logo-orb grid h-10 w-10 place-items-center overflow-hidden rounded-[0.8rem] border border-zinc-300/35 bg-[#f3f3f2] shadow-none transition-[background-color,border-color,box-shadow] duration-500 sm:h-12 sm:w-12"
              >
                <Image
                  src="/perfoumer_black.png"
                  alt={siteSettings.siteName}
                  width={28}
                  height={28}
                  unoptimized
                  className="header-logo-image h-8 w-8 object-contain sm:h-10 sm:w-10"
                  priority
                />
              </span>
              <span className="brand-wordmark text-[1.42rem] tracking-[-0.055em] text-zinc-900 sm:text-[1.72rem]">
                {siteSettings.siteName}
              </span>
            </Link>

            <nav className="header-load-in relative z-10 justify-self-center hidden w-full max-w-[780px] items-center justify-center gap-1 lg:flex">
              {primaryNav.map((item) => {
                if (item.href === "/brands") {
                  const isActive = isItemActive(item.href);
                  const BrandIcon = item.icon as any;

                  return (
                    <div key={item.href} ref={brandsMenuRef} className="relative">
                      <button
                        type="button"
                        aria-expanded={isBrandsMenuOpen}
                        aria-controls="brands-menu-panel"
                        onClick={toggleBrandsMenu}
                        className={[
                          "group relative inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-medium transition-colors duration-200",
                          isBrandsMenuOpen || isActive ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800",
                        ].join(" ")}
                      >
                        <BrandIcon size={16} weight={isBrandsMenuOpen || isActive ? "fill" : "regular"} />
                        <span className="hidden md:inline">{item.label}</span>
                        <span className="ml-0 inline-flex translate-y-px">
                          <ChevronMorphIcon open={isBrandsMenuOpen} size={12} />
                        </span>
                      </button>
                    </div>
                  );
                }

                const Icon = (item as any).icon as any;
                const localizedHref = toLocalePath(item.href, locale);
                const isActive = isItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={localizedHref}
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm transition-colors duration-200",
                      isActive ? "text-zinc-900" : "text-zinc-700 hover:text-zinc-900",
                    ].join(" ")}
                  >
                    {Icon ? <Icon size={16} weight={isActive ? "fill" : "regular"} /> : null}
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}

              {/* More dropdown */}
              <div ref={moreMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCurrencyMenuOpen(false);
                    setIsMoreOpen((c) => !c);
                  }}
                  aria-expanded={isMoreOpen}
                  className={[
                    "inline-flex items-center gap-0.5 rounded-full px-3 py-1 text-sm transition-colors duration-200",
                    isMoreOpen ? "text-zinc-900" : "text-zinc-700 hover:text-zinc-900",
                  ].join(" ")}
                >
                  <span className="hidden md:inline">{t.detail.more ?? "More"}</span>
                  <span className="md:ml-0 inline-flex translate-y-px">
                    <ChevronMorphIcon open={isMoreOpen} size={14} />
                  </span>
                </button>

                <div
                  ref={morePanelRef}
                  className={
                    isMoreOpen
                      ? "absolute right-0 mt-3 w-72 rounded-3xl border border-white/6 bg-[linear-gradient(180deg,#0b0b0b_0%,#050505_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.42)] z-50 transform opacity-100 translate-y-0 scale-100 transition-all duration-220 ease-out origin-top-right"
                      : "pointer-events-none absolute right-0 mt-3 w-72 rounded-3xl border border-white/6 bg-[linear-gradient(180deg,#0b0b0b_0%,#050505_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.22)] z-50 transform opacity-0 -translate-y-1 scale-95 transition-all duration-180 ease-in origin-top-right"
                  }
                >
                  <div className="px-4 py-4">
                    <div className="grid gap-2">
                      {secondaryNav.map((s) => {
                        const Icon = (s as any).icon as any;
                        return (
                          <Link
                            key={s.href}
                            href={toLocalePath(s.href, locale)}
                            onClick={() => setIsMoreOpen(false)}
                            className="more-item flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/92 transition-colors duration-200 hover:bg-white/6"
                          >
                            {Icon ? <Icon size={18} className="text-white/72" /> : null}
                            <span className="truncate">{s.label}</span>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Language selector intentionally removed from More menu; language & currency are available in the mobile menu only */}
                  </div>
                </div>
              </div>
            </nav>

            <div
              id="brands-menu-panel"
              ref={brandsMenuPanelRef}
              className={[
                "absolute inset-x-0 top-full z-[90] origin-top overflow-hidden border-y border-zinc-900/10 bg-[linear-gradient(180deg,#0b0b0b_0%,#050505_100%)] text-white shadow-[0_28px_70px_rgba(0,0,0,0.34)] transform-gpu transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity,filter]",
                isBrandsMenuOpen
                  ? "pointer-events-auto translate-y-0 scale-y-100 opacity-100 blur-0"
                  : "pointer-events-none translate-y-0 scale-y-[0.93] opacity-0 blur-[2px]",
              ].join(" ")}
              style={{
                transformOrigin: "top center",
              }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="absolute inset-x-0 top-0 h-14 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_50%)]" />
              <div className="mx-auto w-full max-w-[1540px] px-5 xl:px-8">
                <div className="relative">
                  {/* brand magnet removed */}
                  <div className="brand-letters-container flex flex-nowrap items-center justify-between gap-1 overflow-x-auto whitespace-nowrap py-2.5 sm:gap-1.5 xl:gap-2 xl:py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {BRAND_LETTERS.map((letter, index) => (
                      <Link
                        key={letter}
                        href={getBrandLetterHref(letter)}
                        style={{
                          animationDelay: `${index * 28}ms`,
                          transitionDelay: isBrandsMenuOpen ? `${index * 10}ms` : `${(BRAND_LETTERS.length - index) * 8}ms`,
                        }}
                        className={[
                          "brand-letter group relative inline-flex h-8 min-w-[0.88rem] items-center justify-center rounded-full px-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/74",
                          isBrandsMenuOpen ? "brand-letter--appear" : "translate-y-2 scale-95 opacity-0",
                        ].join(" ")}
                      >
                        <span className="absolute inset-x-1.5 bottom-1 h-px origin-left scale-x-0 bg-white/80 transition-transform duration-200 group-hover:scale-x-100" />
                        {letter}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="header-load-in header-load-in--controls relative z-10 flex items-center gap-2 sm:gap-3 xl:gap-3.5 justify-self-end">
              <div className="hidden items-center rounded-full border border-zinc-300/55 bg-zinc-100/70 p-1 lg:flex">
                <div ref={localeMenuRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isLocaleMenuOpen}
                    onClick={() => setIsLocaleMenuOpen((c) => !c)}
                    className={[
                      "locale-switcher-button group relative inline-flex h-10 min-w-[5.25rem] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-900 shadow-[0_10px_26px_rgba(0,0,0,0.08)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-zinc-300 hover:shadow-[0_16px_36px_rgba(0,0,0,0.12)]",
                      isLocaleMenuOpen ? "locale-switcher-button--open border-zinc-300 shadow-[0_18px_42px_rgba(0,0,0,0.10)]" : "",
                    ].join(" ")}
                  >
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                      <span className="absolute -inset-x-8 top-[-55%] h-[210%] bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.22)_44%,rgba(255,255,255,0.65)_50%,rgba(255,255,255,0.18)_56%,transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 locale-switcher-button-sheen" />
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.55),transparent_26%),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.12),transparent_34%)] opacity-70" />
                    </span>
                    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200 transition-all duration-500 group-hover:scale-105 group-hover:ring-zinc-300 locale-switcher-orb">
                      <Image
                        src={localeFlagSrc[pendingLocale ?? locale]}
                        alt={t.languages[pendingLocale ?? locale]}
                        width={20}
                        height={20}
                        className="relative z-[1] h-5 w-5 rounded-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      />
                    </span>
                    <span className="relative flex min-w-0 flex-col items-start overflow-hidden leading-none">
                      <span className="block text-[0.54rem] font-semibold tracking-[0.30em] text-zinc-700 transition-all duration-500 group-hover:text-zinc-900 locale-switcher-code">
                        {(pendingLocale ?? locale).toUpperCase()}
                      </span>
                    </span>
                    <span className="relative ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center">
                      <CaretDown
                        size={12}
                        className={[
                          "absolute inset-0 m-auto text-zinc-700/70 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                          isLocaleMenuOpen ? "rotate-180 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 group-hover:text-zinc-900",
                        ].join(" ")}
                      />
                      <CaretDown
                        size={12}
                        className={[
                          "absolute inset-0 m-auto text-zinc-900 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                          isLocaleMenuOpen ? "rotate-180 scale-100 opacity-100" : "rotate-0 scale-0 opacity-0",
                        ].join(" ")}
                      />
                    </span>
                  </button>

                  <div
                    className={[
                      "locale-switcher-panel absolute right-0 top-[calc(100%+0.4rem)] z-[80] w-44 overflow-visible rounded-[1.05rem] border border-zinc-200 bg-white p-1.5 text-zinc-900 shadow-[0_20px_48px_rgba(0,0,0,0.10)] backdrop-blur-2xl transition-all duration-250",
                      isLocaleMenuOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0",
                    ].join(" ")}
                    role="listbox"
                  >
                    <div className="px-2 pb-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[0.58rem] font-semibold tracking-[0.30em] text-zinc-500 uppercase">
                          {copy[locale].languageTag}
                        </p>
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 shadow-[0_0_14px_rgba(0,0,0,0.35)] locale-switcher-pulse" />
                      </div>
                    </div>
                    <div className="space-y-0.5 pb-0.5">
                      {locales.map((it) => (
                        <button
                          key={it}
                          type="button"
                          onClick={() => { setIsLocaleMenuOpen(false); void updateLocale(it); }}
                          disabled={isLocalePending}
                          className={[
                            "locale-item locale-switcher-item group flex w-full items-center gap-2.5 rounded-[0.9rem] px-2.5 py-2 text-left transition-all duration-300 transform-gpu",
                            (pendingLocale ?? locale) === it
                              ? "bg-zinc-50 text-zinc-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05),0_8px_18px_rgba(0,0,0,0.06)]"
                              : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
                          ].join(" ")}
                        >
                          <span className={[
                            "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[0.8rem] transition-all duration-300 group-hover:scale-[1.03]",
                            (pendingLocale ?? locale) === it ? "bg-white ring-1 ring-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]" : "bg-zinc-100 ring-1 ring-zinc-200 group-hover:ring-zinc-300",
                          ].join(" ")}
                          >
                            <Image src={localeFlagSrc[it]} alt={t.languages[it]} width={18} height={18} className="h-5 w-5 rounded-full object-cover" />
                            <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.2),transparent_40%)] opacity-80" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={[
                              "block text-[0.58rem] font-semibold uppercase tracking-[0.24em] transition-colors duration-300",
                              (pendingLocale ?? locale) === it ? "text-zinc-700" : "text-zinc-500",
                            ].join(" ")}>
                              {it.toUpperCase()}
                            </span>
                          </span>
                          <span aria-hidden="true" className={(pendingLocale ?? locale) === it ? "h-2.5 w-2.5 rounded-full bg-zinc-900 shadow-[0_0_10px_rgba(0,0,0,0.18)]" : "h-2.5 w-2.5 rounded-full border border-zinc-300"} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              
              <button
                type="button"
                onClick={isSearchDrawerOpen ? closeSearchDrawer : openSearchDrawer}
                aria-label={isSearchDrawerOpen ? t.header.closeMenu : t.header.products}
                className="group relative grid h-10 w-10 place-items-center rounded-full border border-zinc-300/35 bg-transparent text-zinc-700 shadow-none transition-[transform,box-shadow,background-color,border-color] duration-300 hover:-translate-y-px hover:shadow-none active:translate-y-0 sm:h-11 sm:w-11"
              >
                <span className="relative z-[1] block h-[19px] w-[19px]">
                  <MagnifyingGlass
                    size={18}
                    weight="regular"
                    className={[
                      "absolute inset-0 transition-all duration-300",
                      isSearchDrawerOpen
                        ? "rotate-90 scale-75 opacity-0"
                        : "rotate-0 scale-100 opacity-100 group-hover:-translate-y-0.5 group-hover:scale-[1.04]",
                    ].join(" ")}
                  />
                  <X
                    size={18}
                    weight="regular"
                    className={[
                      "absolute inset-0 transition-all duration-300",
                      isSearchDrawerOpen
                        ? "rotate-0 scale-100 opacity-100"
                        : "-rotate-90 scale-75 opacity-0",
                    ].join(" ")}
                  />
                </span>
              </button>

              <Link
                href={toLocalePath("/wishlist", locale)}
                aria-label={copy[locale].wishlist}
                className="group relative grid h-10 w-10 place-items-center rounded-full border border-zinc-300/35 bg-transparent text-zinc-700 shadow-none transition-[transform,box-shadow,background-color,border-color] duration-300 hover:-translate-y-px hover:shadow-none active:translate-y-0 sm:h-11 sm:w-11"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full opacity-0"
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
                className="group relative grid h-10 w-10 place-items-center rounded-full border border-zinc-300/35 bg-transparent text-zinc-700 shadow-none transition-[transform,box-shadow,background-color,border-color] duration-300 hover:-translate-y-px hover:shadow-none active:translate-y-0 sm:h-11 sm:w-11"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full opacity-0"
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

              <div
                ref={currencyMenuRef}
                className="relative z-[70] hidden lg:block mr-2"
                onMouseEnter={() => {
                  if (typeof window !== "undefined") {
                    if (menuCloseTimerRef.current) { window.clearTimeout(menuCloseTimerRef.current); menuCloseTimerRef.current = null; }
                    if (currencyPanelCloseTimerRef.current) { window.clearTimeout(currencyPanelCloseTimerRef.current); currencyPanelCloseTimerRef.current = null; }
                  }
                  setIsMenuOpen(false);
                  setIsCurrencyMenuOpen(true);
                }}
                onMouseLeave={() => {
                  if (currencyPanelCloseTimerRef.current) { window.clearTimeout(currencyPanelCloseTimerRef.current); currencyPanelCloseTimerRef.current = null; }
                  currencyPanelCloseTimerRef.current = window.setTimeout(() => {
                    setIsCurrencyMenuOpen(false);
                    currencyPanelCloseTimerRef.current = null;
                  }, 120) as any;
                }}
              >
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isCurrencyMenuOpen}
                  className="group relative grid h-10 w-10 place-items-center rounded-full bg-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:-translate-y-px sm:h-11 sm:w-11"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsCurrencyMenuOpen((s) => !s);
                  }}
                >
                  <span
                    key={`currency-symbol-${currencyAnimationKey}`}
                    className="relative z-[1] block h-[18px] w-[18px] text-[0.95rem] font-semibold leading-none animate-currency-pop"
                  >
                    {CURRENCY_META[selectedCurrency].symbol}
                  </span>
                </button>

                <div
                  className={[
                    "absolute right-0 top-[calc(100%+0.45rem)] z-[80] w-56 overflow-visible rounded-2xl bg-[#050505] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-220",
                    isCurrencyMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
                  ].join(" ")}
                  role="listbox"
                  onMouseEnter={() => {
                    if (currencyPanelCloseTimerRef.current) { window.clearTimeout(currencyPanelCloseTimerRef.current); currencyPanelCloseTimerRef.current = null; }
                    setIsCurrencyMenuOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (currencyPanelCloseTimerRef.current) { window.clearTimeout(currencyPanelCloseTimerRef.current); }
                    currencyPanelCloseTimerRef.current = window.setTimeout(() => {
                      setIsCurrencyMenuOpen(false);
                      currencyPanelCloseTimerRef.current = null;
                    }, 120) as any;
                  }}
                >
                  <div className="px-3 py-2">
                    <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-white/80 uppercase">
                      {copy[locale].currencyTag}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {SUPPORTED_CURRENCIES.map((currency) => {
                      const active = selectedCurrency === currency;

                      return (
                        <button
                          key={currency}
                          type="button"
                          onClick={() => {
                            pulseCurrency();
                            setSelectedCurrency(currency);
                            setIsCurrencyMenuOpen(false);
                          }}
                          className={[
                            "currency-item flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-200 transform-gpu",
                            active
                              ? "bg-white/6 text-white"
                              : "text-white/80 hover:bg-white/6",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={[
                                "inline-flex h-6 w-6 items-center justify-center text-sm font-semibold transition-colors duration-200",
                                active ? "text-white" : "text-white/90",
                              ].join(" ")}
                            >
                              {CURRENCY_META[currency].symbol}
                            </span>
                            <span>
                              <span className="block text-sm font-medium text-white">{getCurrencyShortLabel(currency)}</span>
                              <span className={["block text-xs", active ? "text-white/70" : "text-white/60"].join(" ")}> 
                                {CURRENCY_META[currency].label}
                              </span>
                            </span>
                          </span>
                          <span aria-hidden="true" className={active ? "h-2.5 w-2.5 rounded-full bg-white" : "h-2.5 w-2.5 rounded-full border border-white/10"} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className="relative"
                onMouseEnter={openMenuDrawer}
                onMouseLeave={() => closeMenuDrawer(180)}
              >
                <button
                  type="button"
                  aria-label={isMenuOpen ? t.header.closeMenu : t.header.openMenu}
                  aria-expanded={isMenuOpen}
                  onClick={toggleMenuDrawer}
                  className="group relative grid h-10 w-10 place-items-center rounded-full border border-transparent bg-black text-white shadow-none transition-[background-color,box-shadow,border-color,color,transform] duration-300 hover:-translate-y-px sm:h-11 sm:w-11"
                >
                  <span
                    className={[
                      stickTransition,
                      "w-4",
                      isMenuOpen ? "-translate-y-0 rotate-45" : "-translate-y-2 rotate-0 group-hover:-translate-y-3",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      stickTransition,
                      "w-6",
                      isMenuOpen ? "opacity-0 scale-x-0" : "translate-y-0 opacity-100",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      stickTransition,
                      "w-3",
                      isMenuOpen ? "translate-y-0 -rotate-45" : "translate-y-2 rotate-0 group-hover:translate-y-3",
                    ].join(" ")}
                  />
                </button>

                {/* Desktop compact popover anchored to this button */}
                <div
                  ref={menuPanelRef}
                  onMouseEnter={openMenuDrawer}
                  onMouseLeave={() => closeMenuDrawer(180)}
                  className={[
                    "absolute right-0 top-full z-[80] mt-3 hidden w-72 rounded-3xl bg-[#050505] border border-white/6 text-white shadow-[0_18px_60px_rgba(2,6,23,0.6)] transition-all duration-220 lg:block origin-top-right",
                    isMenuOpen ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1",
                  ].join(" ")}
                  aria-hidden={!isMenuOpen}
                >
                    <div className="px-3 py-3">
                    {session?.user ? (
                      <div className="px-2 pb-2">
                        <div className="text-sm font-semibold text-white/95">{`${t.header.hello}, ${displayName || ""}`}</div>
                      </div>
                    ) : null}
                    <div className="grid gap-1">
                      {popoverList.map((item) => {
                        const Icon = (item as any).icon as any;

                        return (
                          <Link
                            key={item.href}
                            href={toLocalePath(item.href, locale)}
                            onClick={() => setIsMenuOpen(false)}
                            className="menu-item magnetic group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5"
                          >
                            {Icon ? <HoverMorphIcon icon={Icon} /> : null}
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            "absolute right-0 top-0 h-full w-[min(91vw,23.5rem)] rounded-l-[1.8rem] bg-[#f6f6f5] transition-transform duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isCartDrawerOpen
              ? "translate-x-0 border-l border-zinc-300 shadow-[-24px_0_48px_rgba(12,12,14,0.22)]"
              : "translate-x-full border-l border-transparent shadow-none",
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
                          <span>{formatCurrencyFromAzn(item.lineTotal, selectedCurrency, locale)}</span>
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
                  <span className="font-medium">{formatCurrencyFromAzn(cartSubtotal, selectedCurrency, locale)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{copy[locale].shipping}</span>
                  <span className="font-medium">{copy[locale].shippingFree}</span>
                </div>
                <div className="flex items-center justify-between text-[1.05rem] font-semibold tracking-[-0.01em] text-zinc-900">
                  <span>{copy[locale].total}</span>
                  <span>{formatCurrencyFromAzn(cartSubtotal, selectedCurrency, locale)}</span>
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
          "fixed inset-x-0 bottom-0 top-[4.5rem] z-[45] overflow-hidden lg:top-[4.5rem] lg:bottom-auto lg:h-[52vh]",
          isSearchDrawerOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!isSearchDrawerOpen}
      >
        <button
          type="button"
          aria-label={t.header.closeMenu}
          onClick={closeSearchDrawer}
          className={[
            "absolute inset-0 bg-black/25 transition-opacity duration-300 lg:bg-[linear-gradient(180deg,rgba(20,20,24,0.1)_0%,rgba(20,20,24,0.06)_30%,rgba(20,20,24,0.02)_55%,rgba(20,20,24,0)_72%)]",
            isSearchDrawerOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        <aside
          className={[
            "absolute left-0 top-0 flex h-full w-full flex-col bg-[#f5f5f4] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[min(92vw,38rem)] lg:left-0 lg:w-full lg:origin-top lg:rounded-none lg:bg-[#f3f3f2]",
            isSearchDrawerOpen
              ? "translate-x-0 opacity-100 lg:translate-x-0 lg:scale-y-100 lg:border-b lg:border-zinc-200/85 lg:shadow-[0_14px_36px_rgba(16,16,20,0.08)]"
              : "-translate-x-full opacity-0 lg:translate-x-0 lg:scale-y-0 lg:border-transparent lg:shadow-none",
          ].join(" ")}
        >
          <div className="mx-auto flex h-full w-full max-w-[1540px] flex-col">
            <div className="px-4 pb-3 pt-2 sm:px-6 sm:pt-2.5 lg:px-8 lg:pb-2.5 lg:pt-3.5">
              <div className="flex items-center gap-2">
                <label className="flex min-h-12 flex-1 items-center gap-2 border-b border-zinc-300 px-0.5">
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={copy[locale].searchPlaceholder}
                    className="w-full bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                  <MagnifyingGlass size={22} weight="regular" className="text-zinc-800" />
                </label>
                <button
                  type="button"
                  onClick={closeSearchDrawer}
                  aria-label={t.header.closeMenu}
                  className="grid h-11 w-11 place-items-center text-zinc-900 lg:hidden"
                >
                  <X size={24} weight="regular" />
                </button>

                <div
                  aria-hidden={!hasActiveSearchQuery}
                  className={[
                    "hidden overflow-hidden transition-[width,opacity,margin] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
                    hasActiveSearchQuery
                      ? "ml-1 w-11 opacity-100"
                      : "ml-0 w-0 opacity-0 pointer-events-none",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    tabIndex={hasActiveSearchQuery ? 0 : -1}
                    className="grid h-11 w-11 place-items-center text-zinc-900"
                  >
                    <X size={24} weight="regular" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 lg:mt-2.5">
                {searchTabs.map((tab) => {
                  const active = searchTab === tab;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSearchTab(tab)}
                      className={[
                        "group relative shrink-0 px-1 py-1.5 text-[0.98rem] leading-none transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        active
                          ? "text-zinc-900"
                          : "text-zinc-600 hover:-translate-y-[1px] hover:text-zinc-900",
                      ].join(" ")}
                    >
                      <span className="relative z-[1]">{copy[locale].searchTabs[tab]}</span>
                      <span
                        aria-hidden="true"
                        className={[
                          "pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left transition-transform duration-300",
                          active
                            ? "scale-x-100 bg-zinc-900"
                            : "scale-x-0 bg-zinc-500 group-hover:scale-x-100",
                        ].join(" ")}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-6 lg:px-8">
            {isSearchLoading ? (
              <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4 pb-8 pt-2 lg:min-h-0 lg:pt-14">
                <svg viewBox="0 0 120 120" className="h-16 w-16 text-zinc-900" aria-hidden="true">
                  <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(24,24,27,0.12)" strokeWidth="2" />
                  <g>
                    <circle cx="60" cy="18" r="5.5" fill="currentColor">
                      <animate attributeName="opacity" values="0.25;1;0.25" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                    <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="1.3s" repeatCount="indefinite" />
                  </g>
                  <g>
                    <circle cx="60" cy="30" r="3.2" fill="currentColor" opacity="0.55" />
                    <circle cx="60" cy="90" r="3.2" fill="currentColor" opacity="0.2" />
                    <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="2.1s" repeatCount="indefinite" />
                  </g>
                </svg>
                <p className="text-sm text-zinc-500">{copy[locale].searchProductsTitle}...</p>
              </div>
            ) : null}

            {!isSearchLoading && !hasActiveSearchQuery ? (
              <div className="flex min-h-[45vh] items-center justify-center pb-8 pt-3 text-center lg:min-h-0 lg:justify-start lg:pt-16">
                <div className="flex max-w-[31ch] flex-col items-center gap-3 lg:items-start lg:text-left">
                  <span className="relative inline-flex h-10 w-10 items-center justify-center text-zinc-500" aria-hidden="true">
                    <Sparkle
                      size={18}
                      weight="fill"
                      className="animate-pulse"
                      style={{ animationDuration: "2s" }}
                    />
                    <Sparkle
                      size={11}
                      weight="fill"
                      className="absolute -right-0.5 -top-0.5 animate-pulse text-zinc-400"
                      style={{ animationDuration: "2.4s", animationDelay: "0.35s" }}
                    />
                  </span>
                  <p className="text-[0.98rem] leading-7 tracking-[0.01em] text-zinc-500">
                    {copy[locale].searchStartHint}
                  </p>
                </div>
              </div>
            ) : null}

            {!isSearchLoading && hasActiveSearchQuery && filteredSearchCategories.length > 0 ? (
              <div className="pb-8">
                <p className="mb-1 text-[0.68rem] font-medium tracking-[0.2em] text-zinc-500 uppercase">
                  {copy[locale].searchCategoriesTitle}
                </p>
                <div className="divide-y divide-zinc-200/75">
                  {filteredSearchCategories.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        router.push(item.href);
                        closeSearchDrawer();
                      }}
                      className="flex min-h-12 items-center justify-between py-1 text-left"
                    >
                      <span className="text-[1.03rem] font-medium text-zinc-900">{item.label}</span>
                      <ArrowRight size={14} weight="regular" className="text-zinc-500" />
                    </button>
                  ))}

                  {searchTab === "brands" && searchBrandResults.map((item) => (
                    <button
                      key={`brand-row-${item.brand}`}
                      type="button"
                      onClick={() => {
                        router.push(`${toLocalePath("/catalog", locale)}?brand=${encodeURIComponent(item.brand)}`);
                        closeSearchDrawer();
                      }}
                      className="flex min-h-12 items-center justify-between py-1 text-left"
                    >
                      <span className="text-[1.03rem] font-medium text-zinc-900">{item.brand}</span>
                      <span className="text-[0.92rem] text-zinc-500">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!isSearchLoading && hasActiveSearchQuery && searchTab !== "home" ? (
              <div className="pb-8">
                <p className="mb-2 text-[0.68rem] font-medium tracking-[0.2em] text-zinc-500 uppercase">
                  {copy[locale].searchProductsTitle}
                </p>
                <div className="space-y-0">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openSearchProduct(item.slug, item.id)}
                      className="flex w-full items-center gap-3 border-b border-zinc-200/80 py-3 text-left transition-colors duration-200 lg:rounded-md lg:px-2 lg:hover:border-zinc-300/80 lg:hover:bg-zinc-200/70"
                    >
                      {item.image.trim() && !brokenSearchImages[item.slug] ? (
                        <span className="relative h-20 w-[4.3rem] shrink-0 overflow-hidden rounded-md bg-zinc-100">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="68px"
                            unoptimized
                            className="object-contain"
                            onError={() => {
                              setBrokenSearchImages((prev) => {
                                if (prev[item.slug]) {
                                  return prev;
                                }

                                return {
                                  ...prev,
                                  [item.slug]: true,
                                };
                              });
                            }}
                          />
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium text-zinc-900">{item.name}</span>
                        <span className="mt-0.5 block truncate text-[0.95rem] text-zinc-600">{item.brand}</span>
                        {item.variantCount && item.variantCount > 1 ? (
                          <span className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.14em] text-zinc-500 uppercase">
                            {copy[locale].searchVariantCount.replace("{count}", String(item.variantCount))}
                          </span>
                        ) : null}
                        {item.discountedPrice !== null && item.originalPrice !== null && item.discountedPrice < item.originalPrice ? (
                          <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-[0.82rem] text-zinc-400 line-through">
                              {formatCurrencyFromAzn(item.originalPrice, selectedCurrency, locale)}
                            </span>
                            <span className="text-[0.95rem] font-semibold text-zinc-900">
                              {formatCurrencyFromAzn(item.discountedPrice, selectedCurrency, locale)}
                            </span>
                            {item.discountPercent !== null ? (
                              <span className="discount-badge inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.12em] text-white uppercase shadow-[0_10px_24px_rgba(225,29,72,0.24)]">
                                {item.discountPercent}%
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.95rem] font-semibold text-zinc-900">
                            <span>{item.price !== null ? formatCurrencyFromAzn(item.price, selectedCurrency, locale) : "-"}</span>
                            {item.discountPercent !== null ? (
                              <span className="discount-badge inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.12em] text-white uppercase shadow-[0_10px_24px_rgba(225,29,72,0.24)]">
                                {item.discountPercent}%
                              </span>
                            ) : null}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}

                  {!searchResults.length ? (
                    <div className="py-4 text-sm text-zinc-600">
                      {copy[locale].searchEmpty}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            </div>
          </div>
        </aside>
      </div>

      <div
        className={[
          "fixed inset-0 z-40 origin-top transform-gpu overflow-y-auto bg-[#f4f4f4] lg:hidden",
          menuTransition,
          isMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0",
        ].join(" ")}
        aria-hidden={!isMenuOpen}
      >
        <div className="mx-auto max-w-[1540px] px-4 pb-[calc(env(safe-area-inset-bottom)+2.75rem)] pt-[4.65rem] sm:px-6">
          <nav className="relative z-10 w-full overflow-x-hidden">
            <div className="relative z-30 grid grid-cols-2 gap-3">
              <div
                style={{ transitionDelay: isMenuOpen ? "35ms" : "0ms" }}
                className={[
                  "relative",
                  menuTransition,
                  isMobileLocaleMenuOpen ? "z-50" : "z-20",
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setIsMobileLocaleMenuOpen((current) => !current)}
                  aria-haspopup="listbox"
                  aria-expanded={isMobileLocaleMenuOpen}
                  disabled={isLocalePending}
                  className="inline-flex min-h-13 w-full items-center justify-between border border-zinc-300 bg-[#f6f6f6] px-3.5 py-2 text-sm font-medium text-zinc-900 disabled:cursor-wait disabled:opacity-70"
                >
                  <span className="flex items-center gap-2">
                    <Image
                      src={localeFlagSrc[pendingLocale ?? locale]}
                      alt={t.languages[pendingLocale ?? locale]}
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] rounded-full object-cover"
                    />
                    <span>Dil: {t.languages[pendingLocale ?? locale]}</span>
                  </span>
                  <CaretDown
                    size={14}
                    weight="bold"
                    className={[
                      "text-zinc-700 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isMobileLocaleMenuOpen ? "rotate-180" : "rotate-0",
                    ].join(" ")}
                  />
                </button>

                <div
                  className={[
                    "absolute inset-x-0 top-[calc(100%+0.35rem)] z-[70] overflow-hidden border border-zinc-300 bg-white shadow-[0_16px_28px_rgba(20,20,24,0.12)] transition-all duration-250",
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
                      <span className="inline-flex items-center gap-2">
                        <Image
                          src={localeFlagSrc[item]}
                          alt={t.languages[item]}
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] rounded-full object-cover"
                        />
                        <span>{t.languages[item]}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Link
                href={accountHref}
                onClick={() => setIsMenuOpen(false)}
                style={{ transitionDelay: isMenuOpen ? "70ms" : "0ms" }}
                className={[
                  "inline-flex min-h-13 items-center gap-2.5 border border-zinc-300 bg-[#f6f6f6] px-3.5 py-2 text-sm font-medium text-zinc-900",
                  menuTransition,
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                <UserCircle size={22} weight="regular" aria-hidden="true" />
                <span>{accountLabel}</span>
              </Link>
            </div>

            <div
              style={{ transitionDelay: isMenuOpen ? "95ms" : "0ms" }}
              className={[
                "relative z-20 mt-3",
                menuTransition,
                isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setIsMobileCurrencyMenuOpen((current) => !current)}
                aria-haspopup="listbox"
                aria-expanded={isMobileCurrencyMenuOpen}
                className="inline-flex min-h-13 w-full items-center justify-between border border-zinc-300 bg-[#f6f6f6] px-3.5 py-2 text-sm font-medium text-zinc-900"
              >
                <span className="flex items-center gap-2">
                  <Coins size={18} weight="duotone" className="text-zinc-700" />
                  <span>
                    {copy[locale].currencyTag}:&nbsp;
                    <span
                      key={`mobile-currency-${currencyAnimationKey}`}
                      className="inline-flex animate-currency-pop"
                    >
                      {currentCurrencyLabel}
                    </span>
                  </span>
                </span>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={[
                    "text-zinc-700 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isMobileCurrencyMenuOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </button>

              <div
                className={[
                  "absolute inset-x-0 top-[calc(100%+0.35rem)] z-[70] overflow-hidden border border-zinc-300 bg-white shadow-[0_16px_28px_rgba(20,20,24,0.12)] transition-all duration-250",
                  isMobileCurrencyMenuOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0",
                ].join(" ")}
                role="listbox"
              >
                {SUPPORTED_CURRENCIES.map((currency) => {
                  const active = selectedCurrency === currency;

                  return (
                    <button
                      key={`mobile-currency-${currency}`}
                      type="button"
                      onClick={() => {
                        pulseCurrency();
                        setSelectedCurrency(currency);
                        setIsMobileCurrencyMenuOpen(false);
                      }}
                      className={[
                        "flex min-h-11 w-full items-center justify-between border-b border-zinc-200 px-3.5 text-left text-sm font-medium transition-colors duration-200 last:border-b-0",
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-700 hover:bg-zinc-100",
                      ].join(" ")}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{CURRENCY_META[currency].symbol}</span>
                        <span>{getCurrencyShortLabel(currency)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 border-t border-zinc-200/75 pt-2">
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <Link
                  href={toLocalePath("/compare", locale)}
                  onClick={() => setIsMenuOpen(false)}
                  className="group relative inline-flex min-h-10 flex-col items-center justify-center gap-1 rounded-lg border border-zinc-300 bg-white/70 px-1.5 py-2 text-[0.7rem] font-semibold text-zinc-800 transition-all duration-300 hover:bg-white hover:border-zinc-400 active:scale-95 overflow-hidden"
                >
                  <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-zinc-100/0 via-white/40 to-zinc-100/0 animate-shimmer" />
                  <Scales size={14} weight="regular" aria-hidden="true" className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <span className="relative z-10 truncate text-center leading-tight">{copy[locale].compareTab}</span>
                </Link>
                <Link
                  href={toLocalePath("/qoxunu", locale)}
                  onClick={() => setIsMenuOpen(false)}
                  className="group relative inline-flex min-h-10 flex-col items-center justify-center gap-1 rounded-lg border border-zinc-900/80 bg-zinc-900/95 px-1.5 py-2 text-[0.7rem] font-semibold text-white transition-all duration-300 hover:bg-zinc-800 active:scale-95 overflow-hidden"
                >
                  <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                  <Sparkle size={14} weight="fill" className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <span className="relative z-10 truncate text-center leading-tight">{t.header.scentQuiz}</span>
                </Link>
              </div>

              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[0.75rem] font-medium text-zinc-700">
                <Link href={`${toLocalePath("/catalog", locale)}?gender=female`} onClick={() => setIsMenuOpen(false)} className="shrink-0 rounded-full border border-zinc-300 bg-white px-2.5 py-1">{copy[locale].womenTab}</Link>
                <Link href={`${toLocalePath("/catalog", locale)}?gender=male`} onClick={() => setIsMenuOpen(false)} className="shrink-0 rounded-full border border-zinc-900 bg-zinc-900 px-2.5 py-1 text-white">{copy[locale].menTab}</Link>
                <Link href={`${toLocalePath("/catalog", locale)}?gender=unisex`} onClick={() => setIsMenuOpen(false)} className="shrink-0 rounded-full border border-zinc-300 bg-white px-2.5 py-1">{copy[locale].unisexTab}</Link>
                <Link href={toLocalePath("/brands", locale)} onClick={() => setIsMenuOpen(false)} className="shrink-0 rounded-full border border-zinc-300 bg-white px-2.5 py-1">{copy[locale].brandsTab}</Link>
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

      {/* Desktop full-page menu removed — compact dropdown used instead */}

    </>
  );
}
