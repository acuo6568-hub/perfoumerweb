"use client";

import {
  Users,
  Eye,
  ArrowClockwise,
  ArrowRight,
  CopySimple,
  EnvelopeOpen,
  Clock,
  Code,
  FacebookLogo,
  Globe,
  GoogleLogo,
  MagnifyingGlass,
  Heart,
  InstagramLogo,
  LinkSimple,
  MetaLogo,
  CheckCircle,
  PaperPlaneRight,
  PinterestLogo,
  RedditLogo,
  SnapchatLogo,
  TiktokLogo,
  TrendUp,
  TwitterLogo,
  UserCircle,
  WhatsappLogo,
  YoutubeLogo,
  XLogo,
  Trash,
  X,
} from "@/components/admin/lucide-admin-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type DateFilter = "today" | "thisMonth" | "thisYear" | "allTime" | "custom";
type AdminLocale = "az" | "en";
type ChartMetric = "visitors" | "newVisitors" | "returningVisitors" | "pageViews" | "sessions";

type Stats = {
  totalUsers: number;
  onlineUsers: number;
  newsletterSubscribed: number;
  newsletterSubscribedInRange: number;
  pageViews: number;
  pageViewsInRange: number;
  uniqueVisitors: number;
  uniqueVisitorsInRange: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  dateFilter: DateFilter;
  dateRange: { start: string; end: string } | null;
  userEngagement?: number;
  usersWithComments?: number;
  usersWithWishlists?: number;
  usersWithCart?: number;
  usersWithChats?: number;
  topCountries?: Array<{ country: string; count: number }>;
  generatedAt?: string;
};

type AdminUserSummary = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  last_seen_at: string | null;
  country?: string;
  countryCode?: string;
  is_online: boolean;
  is_deleted: boolean;
};

type AdminUserSession = {
  session_id: string;
  first_seen: string;
  last_seen: string;
  page_views: number;
  device_type: string;
  browser: string;
  os: string;
  path: string;
  country: string;
  country_code?: string;
  city: string;
};

type AdminUserWishlistItem = {
  slug: string;
  name: string;
  brand: string;
  image: string;
  created_at: string;
};

type AdminUserCartItem = {
  slug: string;
  name: string;
  brand: string;
  image: string;
  size_ml: number;
  quantity: number;
  unit_price: number;
  created_at: string;
};

type NewsletterSubscriber = {
  email: string;
  locale: "az" | "en" | "ru";
  source: string;
  status: "subscribed" | "unsubscribed";
  createdAt: string;
  unsubscribedAt: string;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const countryNameToCode: Record<string, string> = {
  azerbaijan: "AZ",
  azərbaycan: "AZ",
  turkey: "TR",
  türkiye: "TR",
  turkiye: "TR",
  russia: "RU",
  "russian federation": "RU",
  unitedstates: "US",
  "united states": "US",
  usa: "US",
  germany: "DE",
  deutschland: "DE",
  france: "FR",
  italy: "IT",
  spain: "ES",
  "united kingdom": "GB",
  uk: "GB",
  georgia: "GE",
  iran: "IR",
  uae: "AE",
  "united arab emirates": "AE",
  "saudi arabia": "SA",
};

function normalizeCountryCode(country?: string | null, countryCode?: string | null) {
  const directCode = String(countryCode || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(directCode)) return directCode;

  const countryValue = String(country || "").trim();
  const countryAsCode = countryValue.toUpperCase();
  if (/^[A-Z]{2}$/.test(countryAsCode)) return countryAsCode;

  return countryNameToCode[countryValue.toLowerCase()] || "";
}

function countryFlagEmoji(countryCode: string) {
  if (!/^[A-Z]{2}$/.test(countryCode)) return "";
  return countryCode
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

function CountryFlag({
  country,
  countryCode,
  className,
}: {
  country?: string | null;
  countryCode?: string | null;
  className?: string;
}) {
  const code = normalizeCountryCode(country, countryCode);
  const flag = countryFlagEmoji(code);

  return (
    <span
      className={cx(
        "inline-grid h-6 w-8 shrink-0 place-items-center overflow-hidden rounded-[7px] border border-zinc-200 bg-zinc-100 text-[15px] leading-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]",
        className,
      )}
      title={country || code || "Unknown"}
    >
      {flag || <span className="h-full w-full bg-[linear-gradient(135deg,#e4e4e7,#fafafa)]" />}
    </span>
  );
}

function CountryWithFlag({
  country,
  countryCode,
  fallback = "-",
}: {
  country?: string | null;
  countryCode?: string | null;
  fallback?: string;
}) {
  const label = String(country || countryCode || fallback).trim() || fallback;

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <CountryFlag country={country} countryCode={countryCode} />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

type PerfumePreview = {
  slug: string;
  name: string;
  brand: string;
  image: string;
};

type LiveStats = {
  generatedAt: string;
  visitors: {
    totalUnique: number;
    todayUnique: number;
    returningUnique: number;
    totalRegisteredSeen: number;
  };
  live: {
    currentOnline: number;
    currentLikelyHumans: number;
    currentSuspectedBots: number;
    currentLoggedIn: number;
    currentGuests: number;
    retargetableNow: number;
  };
  engagement: {
    totalSessions: number;
    totalEvents: number;
    totalPageViews: number;
    avgPageViewsPerSession: number;
    singlePageSessionRate: number;
    loggedInRate: number;
  };
  trends: Array<{
    date: string;
    label: string;
    pageViews: number;
    visitors: number;
    newVisitors: number;
    returningVisitors: number;
    sessions: number;
    loggedInSessions: number;
    botEvents: number;
  }>;
  audience: {
    topCountries: Array<{ country: string; count: number }>;
    recentCountries?: Array<{ country: string; count: number }>;
    topDevices?: Array<{ device: string; count: number }>;
  };
  acquisition?: {
    topReferrers: Array<{ source: string; sessions: number; visitors: number }>;
    topCampaigns: Array<{ campaign: string; source: string; medium: string; sessions: number; pageViews: number }>;
    topLandingPages: Array<{ path: string; sessions: number; visitors: number }>;
  };
  topPages: Array<{
    path: string;
    pageViews: number;
    visitors: number;
  }>;
  currentUsers: Array<{
    sessionId: string;
    anonymousId: string;
    userId?: string | null;
    label: string;
    email?: string;
    locale?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    countryCode?: string;
    country: string;
    region?: string;
    city: string;
    timezone?: string;
    path: string;
    pathWithQuery: string;
    pageViews: number;
    firstSeen?: string;
    lastSeen: string;
    isLoggedIn: boolean;
    isSuspectedBot?: boolean;
  }>;
  marketing: {
    strongestMarket: string;
    topSource: string;
    topCampaign: string;
  };
};

type WishlistOverview = {
  generatedAt: string;
  totalWishlistAdds: number;
  topWishlistedPerfumes: Array<{
    slug: string;
    name: string;
    brand: string;
    image: string;
    count: number;
  }>;
};

type SearchOverview = {
  generatedAt: string;
  topSearches: Array<{
    query: string;
    count: number;
  }>;
  noResults: Array<{
    query: string;
    count: number;
  }>;
};

type ActivityOverview = {
  generatedAt: string;
  items: Array<{
    id: string;
    kind: "search" | "wishlist" | "quiz" | "visit" | "signup";
    subject: string;
    detail: string;
    timestamp: string;
    time?: string;
  }>;
};

type MarketingTrackerOverview = {
  generatedAt: string;
  days: number;
  customTrackers: Array<{
    id: string;
    slug: string;
    name: string;
    targetPath: string;
    url: string;
    clicks: number;
    visitors: number;
    sessions: number;
    signups: number;
    earlyExits: number;
    conversionRate: number;
    earlyExitRate: number;
    lastClickedAt: string | null;
  }>;
  topSources: Array<{
    source: string;
    clicks: number;
    visitors: number;
    sessions: number;
    signups: number;
    earlyExits: number;
    conversionRate: number;
    earlyExitRate: number;
    lastClickedAt: string | null;
  }>;
};

const dashboardCopy = {
  az: {
    dashboard: "İnformasiya Paneli",
    realtimeAnalytics: "Canlı analitika və istifadəçi statistikası",
    dateRange: "Tarix",
    today: "Bugün",
    thisMonth: "Bu ay",
    thisYear: "Bu il",
    allTime: "Hamısı",
    custom: "Fərdi",
    startDate: "Başlanğıc",
    endDate: "Son",
    loadingStats: "Yüklənir...",
    totalUsers: "İstifadəçilər",
    onlineUsers: "Onlayn istifadəçilər",
    newsletterSubscribers: "Abonelər",
    uniqueVisitors: "Unikal ziyarətçilər",
    newVisitors: "Yeni ziyarətçilər",
    returningVisitors: "Qayıdan ziyarətçilər",
    pageViews: "Səhifə baxışları",
    avgSessionDuration: "Sessiya",
    bounceRate: "Tərk etmə",
    conversionRate: "Dönüşüm",
    usersTitle: "İstifadəçilər",
    usersSubtitle: "Qeydiyyatdan keçənlər",
    onlineNow: "Hazırda onlayn",
    lastSignIn: "Son giriş",
    lastSeen: "Son aktivlik",
    sessionsTitle: "Sessiyalar",
    sessionsSubtitle: "Yaxın aktivlik",
    noUsers: "İstifadəçi tapılmadı.",
    noSessions: "Sessiya məlumatı yoxdur.",
    deleteUser: "İstifadəçini sil",
    deleted: "Silinib",
    loadingUsers: "İstifadəçilər yüklənir...",
    deleteConfirm: "Bu istifadəçini yumşaq silmək istəyirsiniz?",
    sessionViews: "Sessiyada {count} baxış",
    sessionViewsHelp: "Bu rəqəm tək bir sessiya daxilindəki səhifə baxışlarını göstərir.",
    viewSessions: "Sessiyalar",
    viewWishlist: "İstək siyahısı",
    viewCart: "Səbət",
    emptyWishlist: "İstək siyahısı boşdur.",
    emptyCart: "Səbət boşdur.",
    wishlistTitle: "İstək siyahısı",
    cartTitle: "Səbət",
    itemCount: "{count} məhsul",
    updated: "Yeniləndi",
    engagement: "Aktivlik",
    comments: "Şərhlər",
    wishlists: "İstək siyahıları",
    cart: "Səbət",
    topCountries: "Top ölkələr",
    noCountryData: "Ölkə məlumatı yoxdur.",
    newsletterButton: "Xəbər bülleteni",
    newsletterTitle: "Xəbər bülleteni abunələri",
    newsletterSubtitle: "Abunə olanları və çıxanları idarə edin",
    subscribed: "Abunədir",
    unsubscribed: "Çıxıb",
    sendNewsletter: "Göndər",
    emailSubject: "Email başlığı",
    emailTitle: "Məktub başlığı",
    emailBody: "Məktub mətni",
    emailHtml: "Fərdi HTML",
    presetTemplate: "Hazır şablon",
    customTemplate: "Fərdi HTML",
    newsletterMode: "Xəbər bülleteni",
    directMode: "Əsas poçt",
    loadSubscribers: "Abunələr yüklənir...",
    noSubscribers: "Xəbər bülleteni abunəsi yoxdur.",
    subscribedOnlyHint: "Göndərim yalnız aktiv abunələrə gedəcək. Çıxanlar siyahıda görünür, amma email almır.",
    emailSendSuccess: "{count} email göndərildi.",
    emailSendError: "Email göndərilmədi.",
    statsLoadError: "Statistika yüklənmədi.",
    liveLoadError: "Canlı analitika yüklənmədi.",
    usersLoadError: "İstifadəçilər yüklənmədi.",
    sessionsLoadError: "Sessiyalar yüklənmədi.",
    wishlistLoadError: "İstək siyahısı yüklənmədi.",
    cartLoadError: "Səbət yüklənmədi.",
    newsletterLoadError: "Abunələr yüklənmədi.",
    close: "Bağla",
    emailPreview: "Canlı önizləmə",
    emailPreviewHint: "HTML burada email kimi göstərilir. {{unsubscribeUrl}} göndərim zamanı real linklə əvəz olunacaq.",
    notEnoughData: "Hələ kifayət qədər məlumat toplanmayıb",
    visitorsFlow: "Seçilmiş dövrdə ziyarətçi axını",
    activeUsers: "Aktiv istifadəçilər",
    wishlistAdds: "İstək siyahısına əlavələr",
    comparedPrevious: "keçən dövrlə müqayisədə",
    trafficSources: "Trafik mənbələri",
    visitorCountries: "Ziyarətçilərin gəldiyi mənbələr",
    country: "Ölkə",
    recentCountry: "Son ölkələr",
    device: "Cihaz",
    referrer: "Yönləndirən",
    topCountryCount: "Top mənbələr",
    totalSources: "Ümumi mənbə sayı",
    liveVisitors: "Canlı ziyarətçilər",
    liveView: "Canlı baxış",
    hideLiveView: "Canlı baxışı gizlət",
    mostViewedPerfumes: "Ən çox baxılan ətirlər",
    mostAddedWishlist: "İstək siyahısına ən çox əlavə edilənlər",
    searchAnalytics: "Axtarış analitikası",
    seeAll: "Hamısını gör",
    collapse: "Yığ",
    mostSearchedTerms: "Ən çox axtarılan sözlər",
    searchGrowth: "Axtarış artımı",
    noResultSearches: "Nəticəsiz axtarışlar",
    trendingSearches: "Trend axtarışlar",
    recentActivity: "Son aktivliklər",
    liveUserActions: "Canlı istifadəçi hərəkətləri",
    visitor: "Ziyarətçi",
    searches: "axtarış",
    userSearched: "İstifadəçi \"{subject}\" axtardı",
    addedToWishlist: "{subject} istək siyahısına əlavə edildi",
    newAccountRegistered: "Yeni hesab yaradıldı",
    quizCompleted: "Qoxunu testi tamamlandı",
    pageVisited: "{subject} səhifəsinə baxıldı",
    usersPanelSubtitle: "Qeydiyyatdan keçən istifadəçilər və email siyahısı",
    liveGuests: "Canlı qonaqlar",
    liveVisitorPanelSubtitle: "Saytda olan qonaqlar və istifadəçilər",
    registeredVisitors: "Qeydiyyatlı",
    guestVisitors: "Qonaq",
    currentPage: "Cari səhifə",
    deviceInfo: "Cihaz",
    locationInfo: "Məkan",
    popupTitle: "Popup başlığı",
    popupMessage: "Popup mesajı",
    popupLanguage: "Dil",
    visitorLanguage: "Ziyarətçinin dili",
    allLanguages: "Bütün dillər",
    sendPopup: "Popup göndər",
    popupSentToast: "Popup göndərildi",
    userCount: "İstifadəçi sayı",
    totalUserCount: "Ümumi istifadəçi",
    activeUserCount: "Aktiv istifadəçi",
    newsletterSubscribersMetric: "Newsletter abunəçiləri",
    newThisMonth: "Bu ay yeni qeydiyyatlar",
    quickFilter: "Sürətli filtr",
    byLastLogin: "Son giriş tarixinə görə",
    todayShort: "Bu gün",
    days7: "7 gün",
    days30: "30 gün",
    days90: "90 gün",
    userColumn: "İstifadəçi",
    actions: "Əməliyyatlar",
    searchUsers: "İstifadəçi axtar",
    all: "Hamısı",
    active: "Aktiv",
    newsletterFilter: "Xəbər bülleteni",
    recent: "Son",
    export: "İxrac et",
    sendNewsletterCta: "Newsletter göndər",
    sendAllSubscribers: "Bütün abunələrə göndər",
    sendRegisteredUsers: "Sayt hesablarına göndər",
    recipientCount: "Alıcılar",
    selectAll: "Hamısını seç",
    selectedUsers: "Seçilmiş istifadəçilər",
    cancel: "İmtina et",
    send: "Göndər",
    sendEmail: "Email göndər",
    details: "Detallar",
    registeredAccount: "Qeydiyyatlı istifadəçi",
    newsletterOnly: "Yalnız newsletter",
    notSubscribed: "Abunə deyil",
    countryLabel: "Ölkə",
    lastLogin: "Son giriş",
    offline: "Offline",
    newsletterSendConfirm: "Newsletter göndərilsin?",
    newsletterSentToast: "Newsletter göndərildi.",
    unknown: "Naməlum",
    marketingTrackers: "Reklam linkləri",
    marketingTrackersSubtitle: "Instagram, Google və fərdi kampaniya linklərinin nəticələri",
    trackerName: "Link adı",
    trackerSlug: "Kod",
    trackerTarget: "Hədəf səhifə",
    createTracker: "Link yarat",
    copied: "Kopyalandı",
    clicks: "Kliklər",
    signups: "Qeydiyyat",
    earlyExits: "Tez çıxış",
    conversion: "Konversiya",
    topSourcesLabel: "Top mənbələr",
    customLinks: "Fərdi linklər",
    refreshAll: "Yenilə",
    refreshing: "Yenilənir",
    trackerBuilderTitle: "Yeni reklam linki",
    trackerNamePlaceholder: "Instagram yay kampaniyası",
    trackerSlugPlaceholder: "instagram-yay",
    trackerTargetPlaceholder: "/catalog",
    trackerPreview: "Hazır link",
    sourcePreview: "Mənbə",
  },
  en: {
    dashboard: "Dashboard",
    realtimeAnalytics: "Real-time analytics",
    dateRange: "Date",
    today: "Today",
    thisMonth: "This month",
    thisYear: "This year",
    allTime: "All time",
    custom: "Custom",
    startDate: "Start",
    endDate: "End",
    loadingStats: "Loading...",
    totalUsers: "Users",
    onlineUsers: "Online",
    newsletterSubscribers: "Subscribers",
    uniqueVisitors: "Unique visitors",
    newVisitors: "New visitors",
    returningVisitors: "Returning visitors",
    pageViews: "Page views",
    avgSessionDuration: "Sessions",
    bounceRate: "Bounce",
    conversionRate: "Conversion",
    usersTitle: "Users",
    usersSubtitle: "Signed-up accounts",
    onlineNow: "Online now",
    lastSignIn: "Last sign in",
    lastSeen: "Last seen",
    sessionsTitle: "Sessions",
    sessionsSubtitle: "Recent activity",
    noUsers: "No users found.",
    noSessions: "No sessions recorded yet.",
    deleteUser: "Delete user",
    deleted: "Deleted",
    loadingUsers: "Loading users...",
    deleteConfirm: "Soft delete this user?",
    sessionViews: "{count} views in this session",
    sessionViewsHelp: "Shows page views within a single session.",
    viewSessions: "Sessions",
    viewWishlist: "Wishlist",
    viewCart: "Cart",
    emptyWishlist: "Wishlist is empty.",
    emptyCart: "Cart is empty.",
    wishlistTitle: "Wishlist",
    cartTitle: "Cart",
    itemCount: "{count} items",
    updated: "Updated",
    engagement: "Engagement",
    comments: "Comments",
    wishlists: "Wishlists",
    cart: "Cart",
    topCountries: "Top countries",
    noCountryData: "No country data yet.",
    newsletterButton: "Newsletter",
    newsletterTitle: "Newsletter subscribers",
    newsletterSubtitle: "Manage subscribed and unsubscribed contacts",
    subscribed: "Subscribed",
    unsubscribed: "Unsubscribed",
    sendNewsletter: "Send",
    emailSubject: "Email subject",
    emailTitle: "Email title",
    emailBody: "Email body",
    emailHtml: "Custom HTML",
    presetTemplate: "Preset template",
    customTemplate: "Custom HTML",
    newsletterMode: "Newsletter",
    directMode: "Main inbox",
    loadSubscribers: "Loading subscribers...",
    noSubscribers: "No newsletter subscribers yet.",
    subscribedOnlyHint: "Sending goes only to active subscribers. Unsubscribed contacts stay visible but will not receive email.",
    emailSendSuccess: "{count} emails sent.",
    emailSendError: "Email could not be sent.",
    statsLoadError: "Statistics could not be loaded.",
    liveLoadError: "Live analytics could not be loaded.",
    usersLoadError: "Users could not be loaded.",
    sessionsLoadError: "Sessions could not be loaded.",
    wishlistLoadError: "Wishlist could not be loaded.",
    cartLoadError: "Cart could not be loaded.",
    newsletterLoadError: "Subscribers could not be loaded.",
    close: "Close",
    emailPreview: "Live preview",
    emailPreviewHint: "HTML renders here like an email. {{unsubscribeUrl}} is replaced with a real link when sent.",
    notEnoughData: "Not enough data has been collected yet",
    visitorsFlow: "Visitor flow in the selected range",
    activeUsers: "Active users",
    wishlistAdds: "Wishlist adds",
    comparedPrevious: "vs previous period",
    trafficSources: "Traffic sources",
    visitorCountries: "Where visitors come from",
    country: "Country",
    recentCountry: "Recent countries",
    device: "Device",
    referrer: "Referrer",
    topCountryCount: "Top sources",
    totalSources: "Total sources",
    liveVisitors: "Live visitors",
    liveView: "Live view",
    hideLiveView: "Hide live view",
    mostViewedPerfumes: "Most viewed perfumes",
    mostAddedWishlist: "Most added to wishlist",
    searchAnalytics: "Search analytics",
    seeAll: "See all",
    collapse: "Collapse",
    mostSearchedTerms: "Most searched terms",
    searchGrowth: "Search growth",
    noResultSearches: "No-result searches",
    trendingSearches: "Trending searches",
    recentActivity: "Recent activity",
    liveUserActions: "Live user actions",
    visitor: "Visitor",
    searches: "searches",
    userSearched: "User searched \"{subject}\"",
    addedToWishlist: "{subject} was added to wishlist",
    newAccountRegistered: "New account registered",
    quizCompleted: "Qoxunu quiz completed",
    pageVisited: "{subject} page visited",
    usersPanelSubtitle: "Registered users and email list",
    liveGuests: "Live guests",
    liveVisitorPanelSubtitle: "Guests and users currently on the website",
    registeredVisitors: "Registered",
    guestVisitors: "Guest",
    currentPage: "Current page",
    deviceInfo: "Device",
    locationInfo: "Location",
    popupTitle: "Popup title",
    popupMessage: "Popup message",
    popupLanguage: "Language",
    visitorLanguage: "Visitor language",
    allLanguages: "All languages",
    sendPopup: "Send popup",
    popupSentToast: "Popup sent",
    userCount: "User count",
    totalUserCount: "Total users",
    activeUserCount: "Active users",
    newsletterSubscribersMetric: "Newsletter subscribers",
    newThisMonth: "New registrations this month",
    quickFilter: "Quick filter",
    byLastLogin: "By last login date",
    todayShort: "Today",
    days7: "7 days",
    days30: "30 days",
    days90: "90 days",
    userColumn: "User",
    actions: "Actions",
    searchUsers: "Search users",
    all: "All",
    active: "Active",
    newsletterFilter: "Newsletter",
    recent: "Recent",
    export: "Export",
    sendNewsletterCta: "Send newsletter",
    sendAllSubscribers: "Send all subscribers",
    sendRegisteredUsers: "Send to registered website accounts",
    recipientCount: "Recipients",
    selectAll: "Select all",
    selectedUsers: "Selected users",
    cancel: "Cancel",
    send: "Send",
    sendEmail: "Send email",
    details: "Details",
    registeredAccount: "Registered user",
    newsletterOnly: "Newsletter only",
    notSubscribed: "Not subscribed",
    countryLabel: "Country",
    lastLogin: "Last login",
    offline: "Offline",
    newsletterSendConfirm: "Send newsletter?",
    newsletterSentToast: "Newsletter sent.",
    unknown: "Unknown",
    marketingTrackers: "Ad tracker links",
    marketingTrackersSubtitle: "Instagram, Google, and custom campaign link performance",
    trackerName: "Link name",
    trackerSlug: "Code",
    trackerTarget: "Target page",
    createTracker: "Create link",
    copied: "Copied",
    clicks: "Clicks",
    signups: "Signups",
    earlyExits: "Early exits",
    conversion: "Conversion",
    topSourcesLabel: "Top sources",
    customLinks: "Custom links",
    refreshAll: "Refresh",
    refreshing: "Refreshing",
    trackerBuilderTitle: "New ad link",
    trackerNamePlaceholder: "Instagram summer campaign",
    trackerSlugPlaceholder: "instagram-summer",
    trackerTargetPlaceholder: "/catalog",
    trackerPreview: "Ready link",
    sourcePreview: "Source",
  },
};

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;
const panelClass = "rounded-[16px] border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-300 sm:rounded-[20px] sm:p-5 sm:hover:-translate-y-0.5 sm:hover:shadow-[0_16px_40px_rgba(15,23,42,0.07)]";
const softPanelClass = "rounded-[20px] border border-zinc-100 bg-zinc-50/70 p-4";
const containedScrollClass = "overscroll-contain [-webkit-overflow-scrolling:touch]";

type MetricProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail?: string;
  tone?: "indigo" | "emerald" | "sky" | "amber" | "rose" | "zinc";
};

function MetricCard({ icon, label, value, detail, tone = "zinc" }: MetricProps) {
  const colors = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    zinc: "border-zinc-100 bg-zinc-50 text-zinc-700",
  };

  return (
    <div className={panelClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-3 text-[32px] font-bold leading-none text-zinc-950">{value}</p>
          {detail ? <p className="mt-3 text-sm font-medium leading-5 text-zinc-500">{detail}</p> : null}
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border ${colors[tone]}`}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string | number;
  tone?: "indigo" | "emerald" | "sky" | "amber" | "rose" | "zinc";
}) {
  const tones = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    sky: "border-sky-100 bg-sky-50 text-sky-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    zinc: "border-zinc-100 bg-zinc-50 text-zinc-800",
  };

  return (
    <div className={`rounded-[16px] border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function OverviewMetricCard({
  label,
  value,
  change,
  points,
  icon,
  emptyLabel,
  loading,
}: {
  label: string;
  value: string;
  change: string;
  points: number[];
  icon?: React.ReactNode;
  emptyLabel: string;
  loading?: boolean;
}) {
  const hasData = points.some((point) => point > 0);
  const path = buildSmoothPath(hasData ? points : [1, 1, 1, 1, 1], 128, 42);

  return (
    <div className={panelClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          {loading ? (
            <div className="mt-4 space-y-3">
              <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-100" />
              <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
            </div>
          ) : hasData ? (
            <>
              <p className="mt-4 text-[36px] font-bold leading-none text-zinc-950">{value}</p>
              <p className="mt-3 text-sm font-medium text-zinc-500">
                <span className="font-semibold text-emerald-600">{change.split(" ")[0]} {change.split(" ")[1]}</span>{" "}
                {change.split(" ").slice(2).join(" ")}
              </p>
            </>
          ) : (
            <p className="mt-4 max-w-[13rem] text-sm font-medium leading-5 text-zinc-500">{emptyLabel}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-4">
          {icon ? <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-zinc-200 bg-zinc-50 text-zinc-600">{icon}</span> : null}
          <svg viewBox="0 0 128 42" className="h-[42px] w-[128px] overflow-visible">
            <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" className={hasData ? "text-indigo-500" : "text-zinc-200"} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[18px] border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border border-zinc-200 bg-white text-zinc-400">
          <TrendUp size={22} weight="bold" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function formatCompactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function formatChange(value: number) {
  return `↑ ${value}%`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatRatioPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function normalizeTrackerSlugInput(value: string) {
  return value
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function getTrackerPreviewUrl(origin: string, targetPath: string, slug: string) {
  const safePath = targetPath.trim().startsWith("/") ? targetPath.trim() : "/";
  const safeSlug = normalizeTrackerSlugInput(slug);
  try {
    const url = new URL(safePath || "/", origin || "https://perfoumer.az");
    if (safeSlug) {
      url.searchParams.set("perf_track", safeSlug);
    }
    return url.toString();
  } catch {
    return `${origin || "https://perfoumer.az"}/?perf_track=${safeSlug}`;
  }
}

function getSourceMeta(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("instagram")) return { Icon: InstagramLogo, tone: "bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)] text-white", weight: "fill" as const };
  if (normalized.includes("tiktok")) return { Icon: TiktokLogo, tone: "bg-zinc-950 text-white", weight: "fill" as const };
  if (normalized.includes("facebook") || normalized.includes("fb.")) return { Icon: FacebookLogo, tone: "bg-[#1877F2] text-white", weight: "fill" as const };
  if (normalized.includes("meta")) return { Icon: MetaLogo, tone: "bg-[#0866FF] text-white", weight: "fill" as const };
  if (normalized.includes("google")) return { Icon: GoogleLogo, tone: "bg-white text-[#4285F4] ring-1 ring-zinc-200", weight: "bold" as const };
  if (normalized.includes("youtube") || normalized.includes("youtu")) return { Icon: YoutubeLogo, tone: "bg-[#FF0000] text-white", weight: "fill" as const };
  if (normalized === "x" || normalized.includes("twitter")) return { Icon: normalized === "x" ? XLogo : TwitterLogo, tone: "bg-zinc-950 text-white", weight: "fill" as const };
  if (normalized.includes("whatsapp")) return { Icon: WhatsappLogo, tone: "bg-[#25D366] text-white", weight: "fill" as const };
  if (normalized.includes("pinterest")) return { Icon: PinterestLogo, tone: "bg-[#E60023] text-white", weight: "fill" as const };
  if (normalized.includes("snapchat")) return { Icon: SnapchatLogo, tone: "bg-[#FFFC00] text-zinc-950", weight: "fill" as const };
  if (normalized.includes("reddit")) return { Icon: RedditLogo, tone: "bg-[#FF4500] text-white", weight: "fill" as const };
  if (normalized === "direct") return { Icon: LinkSimple, tone: "bg-zinc-950 text-white", weight: "bold" as const };
  return { Icon: Globe, tone: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200", weight: "bold" as const };
}

function SourceLogo({ source, className }: { source: string; className?: string }) {
  const { Icon, tone, weight } = getSourceMeta(source || "Direct");
  return (
    <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-[10px]", tone, className)}>
      <Icon size={18} weight={weight} />
    </span>
  );
}

function DeviceLogo({ device, className }: { device: string; className?: string }) {
  const normalized = device.toLowerCase();
  const isMobile = normalized.includes("mobile") || normalized.includes("phone");
  const isTablet = normalized.includes("tablet") || normalized.includes("ipad");
  if (isMobile) {
    return <span className={cx("grid h-8 w-8 place-items-center rounded-[10px] bg-zinc-950", className)}><span className="h-5 w-3 rounded-[4px] border border-white/85" /></span>;
  }
  if (isTablet) {
    return <span className={cx("grid h-8 w-8 place-items-center rounded-[10px] bg-indigo-50", className)}><span className="h-5 w-4 rounded-[4px] border border-indigo-500" /></span>;
  }
  return <span className={cx("grid h-8 w-8 place-items-center rounded-[10px] bg-blue-50", className)}><span className="h-4 w-5 rounded-[3px] border border-blue-600 after:mx-auto after:mt-[14px] after:block after:h-1 after:w-3 after:rounded-full after:bg-blue-600" /></span>;
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <SourceLogo source={source} />
      <span className="truncate">{source || "Direct"}</span>
    </span>
  );
}

function buildSparklinePath(values: number[], width = 96, height = 32) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildSmoothPath(values: number[], width = 96, height = 32) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => ({
    x: index * step,
    y: height - ((value - min) / range) * (height - 6) - 3,
  }));

  if (points.length === 1) {
    return `M 0 ${points[0]?.y.toFixed(2)} L ${width} ${points[0]?.y.toFixed(2)}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    const previous = points[index - 1];
    const controlX = previous.x + (point.x - previous.x) / 2;
    return `${path} C ${controlX.toFixed(2)} ${previous.y.toFixed(2)}, ${controlX.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");
}

function getPerfumePreview(perfumes: PerfumePreview[], slug: string) {
  return perfumes.find((item) => item.slug === slug) || null;
}

function isPerfumePath(path: string) {
  return path.startsWith("/perfumes/");
}

function stripPerfumeSlug(path: string) {
  return path.replace(/^\/perfumes\//, "").split("?")[0];
}

function getRangeBounds(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const toDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return { start: toDate(start), end: toDate(end) };
}

function escapePreviewHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNewsletterSource(value: string, locale: AdminLocale) {
  const normalized = value.trim().toLowerCase();
  const sourceLabels: Record<string, { az: string; en: string }> = {
    footer_style: { az: "Sayt footer forması", en: "Website footer form" },
    footer: { az: "Sayt footer forması", en: "Website footer form" },
    unsubscribe_history: { az: "Abunəlikdən çıxma tarixçəsi", en: "Unsubscribe history" },
    newsletter: { az: "Xəbər bülleteni", en: "Newsletter" },
  };

  if (sourceLabels[normalized]) {
    return sourceLabels[normalized][locale];
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || (locale === "az" ? "Xəbər bülleteni" : "Newsletter");
}

function createEmptyStats(): Stats {
  return {
    totalUsers: 0,
    onlineUsers: 0,
    newsletterSubscribed: 0,
    newsletterSubscribedInRange: 0,
    pageViews: 0,
    pageViewsInRange: 0,
    uniqueVisitors: 0,
    uniqueVisitorsInRange: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    conversionRate: 0,
    dateFilter: "custom",
    dateRange: null,
    usersWithWishlists: 0,
  };
}

export function AdminDashboard({
  locale = "en",
  perfumes = [],
}: {
  locale?: AdminLocale;
  perfumes?: PerfumePreview[];
}) {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [wishlistOverview, setWishlistOverview] = useState<WishlistOverview | null>(null);
  const [searchOverview, setSearchOverview] = useState<SearchOverview | null>(null);
  const [activityOverview, setActivityOverview] = useState<ActivityOverview | null>(null);
  const [marketingOverview, setMarketingOverview] = useState<MarketingTrackerOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsRefreshing, setIsStatsRefreshing] = useState(false);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("custom");
  const initialRange = getRangeBounds(30);
  const [startDate, setStartDate] = useState<string>(initialRange.start);
  const [endDate, setEndDate] = useState<string>(initialRange.end);
  const [overviewRange, setOverviewRange] = useState<"today" | "7" | "30" | "90">("30");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("visitors");
  const [trafficDimension, setTrafficDimension] = useState<"country" | "recentCountry" | "device" | "referrer">("country");
  const [activityFeedLimit, setActivityFeedLimit] = useState<5 | 10 | 25 | 50 | 100>(5);
  const [activityLimitMenuOpen, setActivityLimitMenuOpen] = useState(false);
  const [activeChartIndex, setActiveChartIndex] = useState<number | null>(null);
  const [activeTrafficIndex, setActiveTrafficIndex] = useState<number | null>(null);
  const [liveVisitorsExpanded, setLiveVisitorsExpanded] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<"perfumes" | "wishlist" | "search" | "activity" | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "active" | "newsletter" | "recent">("all");
  const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
  const [newsletterConfirmTarget, setNewsletterConfirmTarget] = useState<"selected" | "subscribed" | "registered" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [usersMeta, setUsersMeta] = useState({ total: 0, online: 0, generatedAt: "" });
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSessions, setUserSessions] = useState<AdminUserSession[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [userWishlist, setUserWishlist] = useState<AdminUserWishlistItem[]>([]);
  const [userCart, setUserCart] = useState<AdminUserCartItem[]>([]);
  const [userDetailTab, setUserDetailTab] = useState<"sessions" | "wishlist" | "cart">("sessions");
  const [isUserItemsLoading, setIsUserItemsLoading] = useState(false);
  const [userItemsError, setUserItemsError] = useState<string | null>(null);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [isNewsletterLoading, setIsNewsletterLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);
  const [isNewsletterSending, setIsNewsletterSending] = useState(false);
  const [newsletterTemplateMode, setNewsletterTemplateMode] = useState<"preset" | "custom">("preset");
  const [newsletterDeliveryMode, setNewsletterDeliveryMode] = useState<"newsletter" | "direct">("newsletter");
  const [newsletterSubject, setNewsletterSubject] = useState(locale === "az" ? "Perfoumer yenilikləri" : "Perfoumer updates");
  const [newsletterTitle, setNewsletterTitle] = useState(locale === "az" ? "Yeni təkliflər sizi gözləyir" : "New offers are waiting");
  const [newsletterBody, setNewsletterBody] = useState(
    locale === "az"
      ? "Salam! Perfoumer-də seçilmiş ətirlər və yeni kampaniyalar hazırdır."
      : "Hi! Selected perfumes and new campaigns are ready at Perfoumer.",
  );
  const [newsletterHtml, setNewsletterHtml] = useState(
    locale === "az"
      ? "<h1>Perfoumer yenilikləri</h1><p>Fərdi HTML mətninizi burada yazın.</p><p><a href=\"{{unsubscribeUrl}}\">Abunəlikdən çıx</a></p>"
      : "<h1>Perfoumer updates</h1><p>Write your custom HTML here.</p><p><a href=\"{{unsubscribeUrl}}\">Unsubscribe</a></p>",
  );
  const [trackerName, setTrackerName] = useState("");
  const [trackerSlug, setTrackerSlug] = useState("");
  const [trackerTargetPath, setTrackerTargetPath] = useState("/");
  const [isTrackerSaving, setIsTrackerSaving] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [selectedLiveSessionId, setSelectedLiveSessionId] = useState<string | null>(null);
  const [visitorPopupTitle, setVisitorPopupTitle] = useState(locale === "az" ? "Perfoumer" : "Perfoumer");
  const [visitorPopupBody, setVisitorPopupBody] = useState(
    locale === "az" ? "Salam! Sizə necə kömək edə bilərik?" : "Hi! How can we help you?",
  );
  const [visitorPopupLocaleMode, setVisitorPopupLocaleMode] = useState<"visitor" | "all">("visitor");
  const [isVisitorPopupSending, setIsVisitorPopupSending] = useState(false);
  const [visitorPopupError, setVisitorPopupError] = useState<string | null>(null);
  const siteOrigin = "https://perfoumer.az";
  const supabase = getSupabaseBrowserClient();
  const copy = dashboardCopy[locale];
  const hasLoadedStatsRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeoutId = window.setTimeout(() => setToastMessage(null), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    setActiveChartIndex(null);
  }, [chartMetric, overviewRange]);

  useEffect(() => {
    setActiveTrafficIndex(null);
  }, [trafficDimension]);

  useEffect(() => {
    if (!newsletterOpen && !newsletterConfirmTarget) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [newsletterConfirmTarget, newsletterOpen]);

  const fetchStats = useCallback(async (filter: DateFilter, start?: string, end?: string) => {
    if (hasLoadedStatsRef.current) {
      setIsStatsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({ dateFilter: filter });
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      const response = await fetch(`/api/admin/stats?${params}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(copy.statsLoadError);
      }

      const data = await response.json() as Stats;
      setStats(data);
      hasLoadedStatsRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.statsLoadError);
    } finally {
      setIsLoading(false);
      setIsStatsRefreshing(false);
    }
  }, [copy.statsLoadError]);

  const fetchLiveStats = useCallback(async (days: number) => {
    setIsLiveLoading(true);

    try {
      const response = await fetch(`/api/analytics/live-stats?days=${days}`, { cache: "no-store" });
      const data = (await response.json()) as LiveStats & { error?: string };

      if (!response.ok) {
        throw new Error(copy.liveLoadError);
      }

      setLiveStats(data);
    } catch (err) {
      setLiveStats(null);
      setError((current) => current || (err instanceof Error ? err.message : copy.liveLoadError));
    } finally {
      setIsLiveLoading(false);
    }
  }, [copy.liveLoadError]);

  const fetchWishlistOverview = useCallback(async (days: number) => {
    try {
      const response = await fetch(`/api/admin/wishlist-stats?days=${days}`, { cache: "no-store" });
      const data = (await response.json()) as WishlistOverview & { error?: string };

      if (!response.ok) {
        throw new Error("Wishlist analytics unavailable");
      }

      setWishlistOverview(data);
    } catch {
      setWishlistOverview(null);
    }
  }, []);

  const fetchSearchOverview = useCallback(async (days: number) => {
    try {
      const response = await fetch(`/api/admin/search-analytics?days=${days}`, { cache: "no-store" });
      const data = (await response.json()) as SearchOverview & { error?: string };

      if (!response.ok) {
        throw new Error("Search analytics unavailable");
      }

      setSearchOverview(data);
    } catch {
      setSearchOverview(null);
    }
  }, []);

  const fetchActivityOverview = useCallback(async (days: number) => {
    try {
      const response = await fetch(`/api/admin/activity-feed?days=${days}`, { cache: "no-store" });
      const data = (await response.json()) as ActivityOverview & { error?: string };

      if (!response.ok) {
        throw new Error("Activity feed unavailable");
      }

      setActivityOverview(data);
    } catch {
      setActivityOverview(null);
    }
  }, []);

  const fetchMarketingOverview = useCallback(async (days: number) => {
    try {
      const response = await fetch(`/api/admin/marketing-trackers?days=${days}`, { cache: "no-store" });
      const data = (await response.json()) as MarketingTrackerOverview & { error?: string };

      if (!response.ok) {
        throw new Error("Marketing trackers unavailable");
      }

      setMarketingOverview(data);
    } catch {
      setMarketingOverview(null);
    }
  }, []);

  const applyOverviewRange = useCallback((range: "today" | "7" | "30" | "90") => {
    setOverviewRange(range);

    if (range === "today") {
      setDateFilter("today");
      setStartDate("");
      setEndDate("");
      return;
    }

    const days = Number(range);
    const bounds = getRangeBounds(days);
    setDateFilter("custom");
    setStartDate(bounds.start);
    setEndDate(bounds.end);
  }, []);

  useEffect(() => {
    if (dateFilter === "custom" && (!startDate || !endDate)) {
      return;
    }
    fetchStats(dateFilter, startDate, endDate);
  }, [dateFilter, startDate, endDate, fetchStats]);

  useEffect(() => {
    const days = overviewRange === "today" ? 1 : Number(overviewRange);
    void fetchLiveStats(days);
    void fetchWishlistOverview(days);
    void fetchSearchOverview(days);
    void fetchActivityOverview(days);
    void fetchMarketingOverview(days);
  }, [fetchActivityOverview, fetchLiveStats, fetchMarketingOverview, fetchSearchOverview, fetchWishlistOverview, overviewRange]);

  const fetchUsers = useCallback(async () => {
    setIsUsersLoading(true);
    setUsersError(null);

    try {
      const response = await fetch("/api/admin/users?perPage=1000", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(copy.usersLoadError);
      }

      const data = await response.json() as {
        users: AdminUserSummary[];
        totalUsers: number;
        onlineUsers: number;
        generatedAt: string;
      };
      setUsers(data.users);
      setUsersMeta({ total: data.totalUsers, online: data.onlineUsers, generatedAt: data.generatedAt });
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : copy.usersLoadError);
    } finally {
      setIsUsersLoading(false);
    }
  }, [copy.usersLoadError]);

  const fetchNewsletterSubscribers = useCallback(async () => {
    setIsNewsletterLoading(true);
    setNewsletterError(null);

    try {
      const response = await fetch("/api/admin/newsletter", { cache: "no-store" });
      const data = await response.json() as {
        subscribers?: NewsletterSubscriber[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || copy.newsletterLoadError);
      }

      setNewsletterSubscribers(data.subscribers ?? []);
    } catch (err) {
      setNewsletterError(err instanceof Error ? err.message : copy.newsletterLoadError);
    } finally {
      setIsNewsletterLoading(false);
    }
  }, [copy.newsletterLoadError]);

  const openNewsletterPanel = useCallback(() => {
    setNewsletterOpen(true);
    setNewsletterStatus(null);
    void fetchNewsletterSubscribers();
  }, [fetchNewsletterSubscribers]);

  const handleSendNewsletter = useCallback(async (target: "selected" | "subscribed" | "registered" = "subscribed") => {
    setIsNewsletterSending(true);
    setNewsletterError(null);
    setNewsletterStatus(null);

    try {
      const selectedEmails = target === "selected" ? selectedUserEmails : [];
      const response = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newsletterSubject,
          title: newsletterTitle,
          body: newsletterBody,
          customHtml: newsletterHtml,
          templateMode: newsletterTemplateMode,
          deliveryMode: newsletterDeliveryMode,
          recipients: target,
          selectedEmails,
        }),
      });
      const data = await response.json() as { sent?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error || copy.emailSendError);
      }

      setNewsletterStatus(copy.emailSendSuccess.replace("{count}", String(data.sent ?? 0)));
      setToastMessage(copy.newsletterSentToast);
      setNewsletterConfirmTarget(null);
      void fetchNewsletterSubscribers();
    } catch (err) {
      setNewsletterError(err instanceof Error ? err.message : copy.emailSendError);
    } finally {
      setIsNewsletterSending(false);
    }
  }, [
    copy.emailSendError,
    copy.emailSendSuccess,
    copy.newsletterSentToast,
    fetchNewsletterSubscribers,
    newsletterBody,
    newsletterDeliveryMode,
    newsletterHtml,
    newsletterSubject,
    newsletterTemplateMode,
    newsletterTitle,
    selectedUserEmails,
  ]);

  const handleCreateTracker = useCallback(async () => {
    const name = trackerName.trim();
    const slug = normalizeTrackerSlugInput(trackerSlug || trackerName);
    if (!name || !slug) return;

    setIsTrackerSaving(true);
    try {
      const response = await fetch("/api/admin/marketing-trackers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          targetPath: trackerTargetPath || "/",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Tracker could not be created.");
      }

      setTrackerName("");
      setTrackerSlug("");
      setTrackerTargetPath("/");
      setToastMessage(copy.createTracker);
      const days = overviewRange === "today" ? 1 : Number(overviewRange);
      void fetchMarketingOverview(days);
    } catch (err) {
      setError((current) => current || (err instanceof Error ? err.message : "Tracker could not be created."));
    } finally {
      setIsTrackerSaving(false);
    }
  }, [copy.createTracker, fetchMarketingOverview, overviewRange, trackerName, trackerSlug, trackerTargetPath]);

  const copyTrackerUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setToastMessage(copy.copied);
    } catch {
      setToastMessage(url);
    }
  }, [copy.copied]);

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshingAll(true);
    const days = overviewRange === "today" ? 1 : Number(overviewRange);
    try {
      await Promise.allSettled([
        dateFilter === "custom" && (!startDate || !endDate)
          ? Promise.resolve()
          : fetchStats(dateFilter, startDate, endDate),
        fetchLiveStats(days),
        fetchWishlistOverview(days),
        fetchSearchOverview(days),
        fetchActivityOverview(days),
        fetchMarketingOverview(days),
        fetchUsers(),
        fetchNewsletterSubscribers(),
      ]);
    } finally {
      setIsRefreshingAll(false);
    }
  }, [
    dateFilter,
    endDate,
    fetchActivityOverview,
    fetchLiveStats,
    fetchMarketingOverview,
    fetchNewsletterSubscribers,
    fetchSearchOverview,
    fetchStats,
    fetchUsers,
    fetchWishlistOverview,
    overviewRange,
    startDate,
  ]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    void fetchNewsletterSubscribers();
  }, [fetchNewsletterSubscribers]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (dateFilter === "custom" && (!startDate || !endDate)) {
        return;
      }
      void fetchStats(dateFilter, startDate, endDate);
      void fetchUsers();
    }, 15 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [dateFilter, endDate, fetchStats, fetchUsers, startDate]);

  useEffect(() => {
    const days = overviewRange === "today" ? 1 : Number(overviewRange);
    const intervalId = window.setInterval(() => {
      void fetchLiveStats(days);
      void fetchWishlistOverview(days);
      void fetchSearchOverview(days);
      void fetchActivityOverview(days);
      void fetchMarketingOverview(days);
    }, 300000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchActivityOverview, fetchLiveStats, fetchMarketingOverview, fetchSearchOverview, fetchWishlistOverview, overviewRange]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("admin-user-presence")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "website_live_sessions" },
        (payload) => {
          const record = payload.new as { user_id?: string | null; last_seen?: string | null };
          const lastSeen = record?.last_seen;
          if (!record?.user_id || !lastSeen) {
            return;
          }

          setUsers((prev) =>
            prev.map((user) =>
              user.id === record.user_id
                ? {
                    ...user,
                    last_seen_at: lastSeen,
                    is_online: Date.now() - new Date(lastSeen).getTime() <= ONLINE_THRESHOLD_MS,
                  }
                : user,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setUsers((prev) =>
        prev.map((user) => {
          if (!user.last_seen_at) {
            return { ...user, is_online: false };
          }

          const isOnline = Date.now() - new Date(user.last_seen_at).getTime() <= ONLINE_THRESHOLD_MS;
          return user.is_online === isOnline ? user : { ...user, is_online: isOnline };
        }),
      );
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const fetchUserSessions = useCallback(async (userId: string) => {
    setIsSessionsLoading(true);
    setSessionsError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/sessions`);
      if (!response.ok) {
        throw new Error(copy.sessionsLoadError);
      }

      const data = await response.json() as { sessions: AdminUserSession[] };
      setUserSessions(data.sessions);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : copy.sessionsLoadError);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [copy.sessionsLoadError]);

  const fetchUserWishlist = useCallback(async (userId: string) => {
    setIsUserItemsLoading(true);
    setUserItemsError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/wishlist`);
      if (!response.ok) {
        throw new Error(copy.wishlistLoadError);
      }

      const data = await response.json() as { items: AdminUserWishlistItem[] };
      setUserWishlist(data.items);
    } catch (err) {
      setUserItemsError(err instanceof Error ? err.message : copy.wishlistLoadError);
    } finally {
      setIsUserItemsLoading(false);
    }
  }, [copy.wishlistLoadError]);

  const fetchUserCart = useCallback(async (userId: string) => {
    setIsUserItemsLoading(true);
    setUserItemsError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/cart`);
      if (!response.ok) {
        throw new Error(copy.cartLoadError);
      }

      const data = await response.json() as { items: AdminUserCartItem[] };
      setUserCart(data.items);
    } catch (err) {
      setUserItemsError(err instanceof Error ? err.message : copy.cartLoadError);
    } finally {
      setIsUserItemsLoading(false);
    }
  }, [copy.cartLoadError]);

  const handleSelectUser = useCallback(
    (userId: string) => {
      setSelectedUserId(userId);
      setSelectedLiveSessionId(null);
      setUserDetailTab("sessions");
      setUserWishlist([]);
      setUserCart([]);
      setUserItemsError(null);
      void fetchUserSessions(userId);
    },
    [fetchUserSessions],
  );

  const handleChangeDetailTab = useCallback(
    (tab: "sessions" | "wishlist" | "cart") => {
      setUserDetailTab(tab);
      if (!selectedUserId) {
        return;
      }
      if (tab === "sessions") {
        void fetchUserSessions(selectedUserId);
      } else if (tab === "wishlist") {
        void fetchUserWishlist(selectedUserId);
      } else {
        void fetchUserCart(selectedUserId);
      }
    },
    [fetchUserCart, fetchUserSessions, fetchUserWishlist, selectedUserId],
  );

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!window.confirm(copy.deleteConfirm)) {
      return;
    }

    const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (!response.ok) {
      setUsersError(copy.usersLoadError);
      return;
    }

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, is_deleted: true, is_online: false } : user,
      ),
    );
  }, [copy.deleteConfirm, copy.usersLoadError]);

  const handleSelectLiveVisitor = useCallback((sessionId: string) => {
    const visitor = (liveStats?.currentUsers ?? []).find((item) => item.sessionId === sessionId);
    setSelectedUserId(null);
    setSelectedLiveSessionId(sessionId);
    setVisitorPopupError(null);
    setVisitorPopupLocaleMode("visitor");
    setVisitorPopupTitle("Perfoumer");
    setVisitorPopupBody(
      (visitor?.locale || locale) === "az"
        ? "Salam! Sizə necə kömək edə bilərik?"
        : "Hi! How can we help you?",
    );
  }, [liveStats?.currentUsers, locale]);

  const handleSendVisitorPopup = useCallback(async () => {
    const visitor = (liveStats?.currentUsers ?? []).find((item) => item.sessionId === selectedLiveSessionId);
    if (!visitor) {
      return;
    }

    setIsVisitorPopupSending(true);
    setVisitorPopupError(null);

    try {
      const response = await fetch("/api/admin/visitor-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: visitor.sessionId,
          anonymousId: visitor.anonymousId,
          locale: visitorPopupLocaleMode === "visitor" ? visitor.locale || locale : "all",
          path: visitor.pathWithQuery || visitor.path || "",
          title: visitorPopupTitle,
          body: visitorPopupBody,
          ttlMinutes: 20,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || copy.sendPopup);
      }

      setToastMessage(copy.popupSentToast);
    } catch (err) {
      setVisitorPopupError(err instanceof Error ? err.message : copy.sendPopup);
    } finally {
      setIsVisitorPopupSending(false);
    }
  }, [
    copy.popupSentToast,
    copy.sendPopup,
    liveStats?.currentUsers,
    locale,
    selectedLiveSessionId,
    visitorPopupBody,
    visitorPopupLocaleMode,
    visitorPopupTitle,
  ]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString(locale === "az" ? "az-AZ" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatActivityDateLabel = (value: string) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (sameDay) return copy.todayShort;

    return date.toLocaleDateString(locale === "az" ? "az-AZ" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatActivityTimeLabel = (value: string) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";

    return date.toLocaleTimeString(locale === "az" ? "az-AZ" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSessionViews = (count: number) =>
    copy.sessionViews.replace("{count}", count.toLocaleString());

  const formatItemCount = (count: number) =>
    copy.itemCount.replace("{count}", count.toLocaleString());

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId],
  );
  const liveVisitors = useMemo(
    () => (liveStats?.currentUsers ?? []).filter((visitor) => !visitor.isSuspectedBot),
    [liveStats?.currentUsers],
  );
  const selectedLiveVisitor = useMemo(
    () => liveVisitors.find((visitor) => visitor.sessionId === selectedLiveSessionId) || null,
    [liveVisitors, selectedLiveSessionId],
  );
  const newsletterStatusByEmail = useMemo(() => {
    return new Map(newsletterSubscribers.map((subscriber) => [subscriber.email.toLowerCase(), subscriber.status]));
  }, [newsletterSubscribers]);
  const registeredUserByEmail = useMemo(() => {
    return new Map(users.map((user) => [user.email.toLowerCase(), user]));
  }, [users]);
  const activeNewsletterSubscribers = useMemo(
    () => newsletterSubscribers.filter((subscriber) => subscriber.status === "subscribed"),
    [newsletterSubscribers],
  );
  const countryByEmail = useMemo(() => {
    const map = new Map<string, { country: string; countryCode: string }>();
    users.forEach((user) => {
      if (user.email.includes("@") && (user.country || user.countryCode)) {
        map.set(user.email.toLowerCase(), {
          country: user.country || user.countryCode || "",
          countryCode: user.countryCode || normalizeCountryCode(user.country),
        });
      }
    });
    (liveStats?.currentUsers ?? []).forEach((user) => {
      const email = (user.email || user.label || "").toLowerCase();
      if (email.includes("@") && (user.country || user.countryCode)) {
        map.set(email, {
          country: user.country || user.countryCode || "",
          countryCode: user.countryCode || normalizeCountryCode(user.country),
        });
      }
    });
    return map;
  }, [liveStats?.currentUsers, users]);
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return users.filter((user) => {
      const email = user.email.toLowerCase();
      if (query && !email.includes(query)) return false;
      if (userFilter === "active") return user.is_online;
      if (userFilter === "newsletter") return newsletterStatusByEmail.get(email) === "subscribed";
      if (userFilter === "recent") {
        const createdAt = new Date(user.created_at).getTime();
        const lastSeenAt = new Date(user.last_seen_at || "").getTime();
        return (Number.isFinite(createdAt) && createdAt >= recentCutoff) || (Number.isFinite(lastSeenAt) && lastSeenAt >= recentCutoff);
      }
      return true;
    });
  }, [newsletterStatusByEmail, userFilter, userSearch, users]);
  const selectedUserSet = useMemo(() => new Set(selectedUserEmails), [selectedUserEmails]);
  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((user) => selectedUserSet.has(user.email));
  const userMetricSummary = useMemo(() => {
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const countSince = (days: number) => {
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      return users.filter((user) => {
        const lastSeen = new Date(user.last_seen_at || user.last_sign_in_at || "").getTime();
        return Number.isFinite(lastSeen) && lastSeen >= cutoff;
      }).length;
    };

    return {
      total: users.length || usersMeta.total,
      active: users.filter((user) => user.is_online).length || usersMeta.online,
      newsletter: newsletterSubscribers.filter((subscriber) => subscriber.status === "subscribed").length,
      newThisMonth: users.filter((user) => {
        const createdAt = new Date(user.created_at).getTime();
        return Number.isFinite(createdAt) && createdAt >= startOfMonth.getTime();
      }).length,
      today: countSince(1),
      week: countSince(7),
      month: countSince(30),
      quarter: countSince(90),
    };
  }, [newsletterSubscribers, users, usersMeta.online, usersMeta.total]);

  const toggleUserSelection = useCallback((email: string) => {
    setSelectedUserEmails((current) =>
      current.includes(email) ? current.filter((item) => item !== email) : [...current, email],
    );
  }, []);

  const toggleSelectAllUsers = useCallback(() => {
    setSelectedUserEmails((current) => {
      const visibleEmails = filteredUsers.map((user) => user.email);
      const visibleSet = new Set(visibleEmails);
      const allSelected = visibleEmails.length > 0 && visibleEmails.every((email) => current.includes(email));
      if (allSelected) {
        return current.filter((email) => !visibleSet.has(email));
      }

      return Array.from(new Set([...current, ...visibleEmails]));
    });
  }, [filteredUsers]);

  const toggleSelectAllNewsletterSubscribers = useCallback(() => {
    setSelectedUserEmails((current) => {
      const subscriberEmails = activeNewsletterSubscribers.map((subscriber) => subscriber.email);
      const subscriberSet = new Set(subscriberEmails);
      const allSelected = subscriberEmails.length > 0 && subscriberEmails.every((email) => current.includes(email));
      if (allSelected) {
        return current.filter((email) => !subscriberSet.has(email));
      }

      return Array.from(new Set([...current, ...subscriberEmails]));
    });
  }, [activeNewsletterSubscribers]);

  const exportFilteredUsers = useCallback(() => {
    const rows = [
      ["email", "last_login", "last_activity", "newsletter", "country"],
      ...filteredUsers.map((user) => [
        user.email,
        user.last_sign_in_at || "",
        user.last_seen_at || "",
        newsletterStatusByEmail.get(user.email.toLowerCase()) || "not_subscribed",
        countryByEmail.get(user.email.toLowerCase())?.country || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `perfoumer-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [countryByEmail, filteredUsers, newsletterStatusByEmail]);

  const onlineUsersCount = useMemo(
    () => users.filter((user) => user.is_online).length,
    [users],
  );
  const newsletterSubscribedCount = useMemo(
    () => newsletterSubscribers.filter((subscriber) => subscriber.status === "subscribed").length,
    [newsletterSubscribers],
  );
  const newsletterRegisteredSubscriberCount = useMemo(
    () => newsletterSubscribers.filter((subscriber) => subscriber.status === "subscribed" && subscriber.source === "registered").length,
    [newsletterSubscribers],
  );
  const registeredWebsiteUserCount = useMemo(
    () => users.length || usersMeta.total,
    [users, usersMeta.total],
  );
  const newsletterUnsubscribedCount = newsletterSubscribers.length - newsletterSubscribedCount;
  const newsletterPreviewHtml = useMemo(() => {
    if (newsletterTemplateMode === "custom") {
      return newsletterHtml.replace(
        /\{\{\s*unsubscribeUrl\s*\}\}/gi,
        "#unsubscribe-preview",
      );
    }

    return `
      <div style="font-family:Arial,sans-serif;background:#f4f4f2;padding:24px;">
        <div style="max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e8e5df;border-radius:18px;padding:30px;">
          <p style="margin:0 0 14px;font-size:12px;color:#6b7280;">Perfoumer ${newsletterDeliveryMode === "newsletter" ? copy.newsletterMode : copy.directMode}</p>
          <h1 style="margin:0 0 14px;font-size:30px;line-height:1.14;color:#111827;">${escapePreviewHtml(newsletterTitle)}</h1>
          <div style="font-size:16px;line-height:1.75;color:#374151;white-space:pre-line;">${escapePreviewHtml(newsletterBody)}</div>
          ${
            newsletterDeliveryMode === "newsletter"
              ? `<div style="border-top:1px solid #ebe8e2;margin-top:26px;padding-top:18px;"><p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b7280;">${locale === "az" ? "Bu məktubu Perfoumer xəbər bülleteni abunəliyinizə görə aldınız." : "You received this email because you subscribed to the Perfoumer newsletter."}</p><a href="#unsubscribe-preview" style="display:inline-block;padding:10px 16px;border:1px solid #d6d3ce;border-radius:999px;color:#111827;text-decoration:none;font-size:13px;">${locale === "az" ? "Abunəlikdən çıx" : "Unsubscribe"}</a></div>`
              : ""
          }
        </div>
      </div>
    `;
  }, [copy.directMode, copy.newsletterMode, locale, newsletterBody, newsletterDeliveryMode, newsletterHtml, newsletterTemplateMode, newsletterTitle]);

  const chartSeries = liveStats?.trends ?? [];
  const trackerPreviewSlug = normalizeTrackerSlugInput(trackerSlug || trackerName);
  const trackerPreviewUrl = getTrackerPreviewUrl(siteOrigin, trackerTargetPath, trackerPreviewSlug);
  const trackerExamples = [
    { name: "Instagram story", slug: "instagram-story", target: "/catalog", source: "Instagram" },
    { name: "TikTok bio", slug: "tiktok-bio", target: "/offers", source: "TikTok" },
    { name: "Google ads", slug: "google-ads", target: "/catalog", source: "Google" },
  ];
  const chartValues = chartSeries.map((point) => point[chartMetric] || 0);
  const chartHasData = chartValues.some((value) => value > 0);
  const chartRenderSeries = chartSeries;
  const trafficSourceOptions = {
    country: (liveStats?.audience.topCountries ?? []).map((item) => ({ label: item.country, count: item.count })),
    recentCountry: (liveStats?.audience.recentCountries ?? []).map((item) => ({ label: item.country, count: item.count })),
    device: (liveStats?.audience.topDevices ?? []).map((item) => ({ label: item.device, count: item.count })),
    referrer: (liveStats?.acquisition?.topReferrers ?? []).map((item) => ({ label: item.source, count: item.visitors || item.sessions })),
  };
  const trafficSources = trafficSourceOptions[trafficDimension]
    .slice(0, expandedPanel === "activity" ? 8 : 4)
    .map((item, index) => ({
      country: item.label || copy.unknown,
      countryCode: trafficDimension === "country" || trafficDimension === "recentCountry" ? normalizeCountryCode(item.label) : "",
      count: item.count,
      tone: index,
    }));
  const trafficTotal = trafficSources.reduce((sum, item) => sum + item.count, 0);
  const mostViewedPerfumes = useMemo(() => {
    return (liveStats?.topPages ?? [])
      .filter((page) => isPerfumePath(page.path))
      .map((page) => {
        const slug = stripPerfumeSlug(page.path);
        const perfume = getPerfumePreview(perfumes, slug);

        return {
          name: perfume?.name || slug,
          brand: perfume?.brand || "",
          image: perfume?.image || "",
          count: page.pageViews,
        };
      })
      .filter((item) => item.name)
      .slice(0, expandedPanel === "perfumes" ? 10 : 5);
  }, [expandedPanel, liveStats?.topPages, perfumes]);

  const topWishlistedPerfumes = useMemo(() => {
    return (wishlistOverview?.topWishlistedPerfumes ?? [])
      .map((entry) => {
        const perfume = getPerfumePreview(perfumes, entry.slug);

        return {
          name: entry.name,
          brand: entry.brand || perfume?.brand || "",
          image: entry.image || perfume?.image || "",
          count: entry.count,
        };
      })
      .slice(0, expandedPanel === "wishlist" ? 10 : 5);
  }, [expandedPanel, perfumes, wishlistOverview?.topWishlistedPerfumes]);

  const searchAnalytics = useMemo(() => {
    const topSearches = searchOverview?.topSearches ?? [];
    const noResults = searchOverview?.noResults ?? [];
    const totalSearches = topSearches.reduce((sum, item) => sum + item.count, 0);
    const searchGrowth = totalSearches > 0 ? Math.max(6, Math.round((topSearches[0]?.count || 0) / totalSearches * 100)) : 0;
    return {
      mostSearched: topSearches.slice(0, expandedPanel === "search" ? 8 : 4),
      noResults: noResults.slice(0, expandedPanel === "search" ? 8 : 3),
      trending: topSearches.slice(0, 3),
      totalSearches,
      searchGrowth,
    };
  }, [expandedPanel, searchOverview?.noResults, searchOverview?.topSearches]);

  const activityFeed = useMemo(() => (activityOverview?.items ?? []).slice(0, activityFeedLimit), [activityFeedLimit, activityOverview?.items]);
  const localizedActivityFeed = useMemo(() => {
    return activityFeed.map((item) => {
      const icon =
        item.kind === "search" ? MagnifyingGlass :
        item.kind === "wishlist" ? Heart :
        item.kind === "signup" ? UserCircle :
        item.kind === "quiz" ? CheckCircle :
        Eye;
      const tone =
        item.kind === "search" ? "text-sky-700 bg-sky-50 border-sky-100" :
        item.kind === "wishlist" ? "text-rose-700 bg-rose-50 border-rose-100" :
        item.kind === "signup" ? "text-emerald-700 bg-emerald-50 border-emerald-100" :
        item.kind === "quiz" ? "text-amber-700 bg-amber-50 border-amber-100" :
        "text-zinc-700 bg-zinc-50 border-zinc-200";
      const dotTone =
        item.kind === "search" ? "bg-indigo-600" :
        item.kind === "wishlist" ? "bg-rose-500" :
        item.kind === "signup" ? "bg-orange-500" :
        item.kind === "quiz" ? "bg-emerald-500" :
        "bg-blue-500";
      const tileTone =
        item.kind === "search" ? "border-indigo-100 bg-indigo-50 text-indigo-600" :
        item.kind === "wishlist" ? "border-rose-100 bg-rose-50 text-rose-600" :
        item.kind === "signup" ? "border-orange-100 bg-orange-50 text-orange-600" :
        item.kind === "quiz" ? "border-emerald-100 bg-emerald-50 text-emerald-600" :
        "border-blue-100 bg-blue-50 text-blue-600";
      const title =
        item.kind === "search" ? copy.userSearched.replace("{subject}", item.subject || copy.unknown) :
        item.kind === "wishlist" ? copy.addedToWishlist.replace("{subject}", item.subject || copy.unknown) :
        item.kind === "signup" ? copy.newAccountRegistered :
        item.kind === "quiz" ? copy.quizCompleted :
        copy.pageVisited.replace("{subject}", item.subject || item.detail || copy.unknown);

      return { ...item, icon, tone, dotTone, tileTone, title };
    });
  }, [activityFeed, copy]);

  const chartGeometry = useMemo(() => {
    const width = 760;
    const height = 260;
    const paddingX = 18;
    const paddingY = 18;
    const renderValues = chartHasData ? chartValues : [0, 1, 0, 1, 0, 1, 0];
    const maxRaw = Math.max(1, ...renderValues);
    const maxValue = Math.max(4, Math.ceil(maxRaw * 1.25));
    const minValue = 0;
    const range = Math.max(1, maxValue - minValue);
    const points = renderValues.map((value, index) => {
      const x = renderValues.length === 1
        ? width / 2
        : paddingX + (index * (width - paddingX * 2)) / (renderValues.length - 1);
      const y = height - paddingY - ((value - minValue) / range) * (height - paddingY * 2);
      return { x, y, value, isActive: value > 0 };
    });
    const linePath = points.length === 1
      ? `M ${paddingX} ${points[0].y.toFixed(2)} L ${width - paddingX} ${points[0].y.toFixed(2)}`
      : points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
        const previous = points[index - 1];
        const controlX = previous.x + (point.x - previous.x) / 2;
        return `${path} C ${controlX.toFixed(2)} ${previous.y.toFixed(2)}, ${controlX.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      }, "");
    const areaPath =
      points.length === 1
        ? `M ${paddingX} ${points[0].y.toFixed(2)} L ${width - paddingX} ${points[0].y.toFixed(2)} L ${width - paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`
        : points.length > 1
        ? `${linePath} L ${(points[points.length - 1]?.x || width - paddingX).toFixed(2)} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`
        : "";
    return { width, height, paddingX, paddingY, maxValue, minValue, points, linePath, areaPath };
  }, [chartHasData, chartValues]);
  const chartAxisLabels = useMemo(() => {
    if (overviewRange === "today") {
      return ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:00"].map((label, index, items) => ({
        key: label,
        label,
        left: `${(index / Math.max(items.length - 1, 1)) * 100}%`,
      }));
    }

    const series = chartRenderSeries;
    if (!series.length) return [];
    const step = overviewRange === "7" ? 1 : overviewRange === "30" ? 5 : 15;
    const selected = series
      .map((point, index) => ({ point, index }))
      .filter(({ index }) => index === 0 || index === series.length - 1 || index % step === 0);

    return selected.map(({ point, index }) => ({
      key: `${point.date}-${index}`,
      label: point.label,
      left: `${(index / Math.max(series.length - 1, 1)) * 100}%`,
    }));
  }, [chartRenderSeries, overviewRange]);
  const isOverviewRefreshing = isStatsRefreshing || isLiveLoading;

  const rangeButtons: Array<{ value: "today" | "7" | "30" | "90"; label: string }> = [
    { value: "today", label: "Today" },
    { value: "7", label: "7 days" },
    { value: "30", label: "30 days" },
    { value: "90", label: "90 days" },
  ];
  const trafficSegments = trafficSources.length ? trafficSources : [{ country: copy.notEnoughData, countryCode: "", count: 1, tone: 0 }];
  const trafficHasData = trafficSources.some((item) => item.count > 0);
  const activeTrafficSegment = trafficSegments[activeTrafficIndex ?? 0] ?? trafficSegments[0];
  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const dashboardStats = stats ?? createEmptyStats();
  const isInitialDashboardLoading = !stats && isLoading;
  const chartMetricOptions = [
    { value: "visitors", label: copy.uniqueVisitors, icon: TrendUp },
    { value: "newVisitors", label: copy.newVisitors, icon: Users },
    { value: "returningVisitors", label: copy.returningVisitors, icon: UserCircle },
    { value: "pageViews", label: copy.pageViews, icon: Eye },
    { value: "sessions", label: copy.sessionsTitle, icon: Clock },
  ] as const;
  const analyticsMetricTabs = [
    {
      value: "visitors",
      label: copy.uniqueVisitors,
      metric: formatCompactNumber(dashboardStats.uniqueVisitorsInRange || dashboardStats.uniqueVisitors),
      change: "+18%",
      tone: "emerald",
    },
    {
      value: "newVisitors",
      label: copy.newVisitors,
      metric: formatCompactNumber(chartSeries.reduce((sum, point) => sum + (point.newVisitors || 0), 0)),
      change: "+10%",
      tone: "emerald",
    },
    {
      value: "returningVisitors",
      label: copy.returningVisitors,
      metric: formatCompactNumber(liveStats?.visitors.returningUnique ?? chartSeries.reduce((sum, point) => sum + (point.returningVisitors || 0), 0)),
      change: "+6%",
      tone: "emerald",
    },
    {
      value: "pageViews",
      label: copy.pageViews,
      metric: formatCompactNumber(dashboardStats.pageViewsInRange || dashboardStats.pageViews),
      change: "+12%",
      tone: "emerald",
    },
    {
      value: "sessions",
      label: copy.sessionsTitle,
      metric: formatCompactNumber(chartSeries.reduce((sum, point) => sum + (point.sessions || 0), 0)),
      change: "+7%",
      tone: "emerald",
    },
  ] as const;
  const chartMetricLabel = chartMetricOptions.find((option) => option.value === chartMetric)?.label ?? copy.uniqueVisitors;
  const activeChartPoint = activeChartIndex !== null ? chartGeometry.points[activeChartIndex] : null;
  const trafficDimensionOptions = [
    { value: "country", label: copy.country },
    { value: "recentCountry", label: copy.recentCountry },
    { value: "device", label: copy.device },
    { value: "referrer", label: copy.referrer },
  ] as const;

  if (stats || isInitialDashboardLoading) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <section className={panelClass}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <h2 className="text-[26px] font-bold leading-tight text-zinc-950 sm:text-[32px]">
                {copy.dashboard}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-zinc-500">{copy.realtimeAnalytics}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={isRefreshingAll}
                className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70 sm:col-span-1 sm:h-11 sm:px-4"
              >
                <ArrowClockwise size={16} weight="bold" className={isRefreshingAll ? "animate-spin" : ""} />
                {isRefreshingAll ? copy.refreshing : copy.refreshAll}
              </button>
              {rangeButtons.map((item) => {
                const label =
                  locale === "az"
                    ? item.value === "today"
                      ? "Bugün"
                      : item.value === "7"
                        ? "7 gün"
                        : item.value === "30"
                          ? "30 gün"
                          : "90 gün"
                    : item.label;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => applyOverviewRange(item.value)}
                    className={cx(
                      "h-10 rounded-full border px-3 text-sm font-medium transition sm:h-11 sm:px-4",
                      overviewRange === item.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_0_0_4px_rgba(79,70,229,0.08)]"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewMetricCard
            label={copy.uniqueVisitors}
            value={formatCompactNumber(dashboardStats.uniqueVisitorsInRange || dashboardStats.uniqueVisitors)}
            change={`↑ 18% ${copy.comparedPrevious}`}
            points={chartSeries.map((point) => point.visitors || 0)}
            icon={<Users size={17} weight="bold" />}
            emptyLabel={copy.notEnoughData}
            loading={isOverviewRefreshing}
          />
          <OverviewMetricCard
            label={copy.activeUsers}
            value={formatCompactNumber(liveStats?.live.currentLoggedIn ?? dashboardStats.onlineUsers)}
            change={`↑ 9% ${copy.comparedPrevious}`}
            points={chartValues.map((value) => Math.max(0, Math.round(value * 0.4)))}
            icon={<UserCircle size={17} weight="bold" />}
            emptyLabel={copy.notEnoughData}
            loading={isOverviewRefreshing}
          />
          <OverviewMetricCard
            label={locale === "az" ? "Konversiya (sifariş)" : "Conversion"}
            value={formatPercent(dashboardStats.conversionRate)}
            change={`↑ 1.2% ${copy.comparedPrevious}`}
            points={chartValues.map((value) => Math.max(0, Math.round(value * 0.12)))}
            icon={<TrendUp size={17} weight="bold" />}
            emptyLabel={copy.notEnoughData}
            loading={isOverviewRefreshing}
          />
          <OverviewMetricCard
            label={copy.wishlistAdds}
            value={formatCompactNumber(wishlistOverview?.totalWishlistAdds ?? dashboardStats.usersWithWishlists ?? 0)}
            change={`↑ 22% ${copy.comparedPrevious}`}
            points={(wishlistOverview?.totalWishlistAdds ?? 0) > 0 ? chartValues.map((value) => Math.max(0, Math.round(value * 0.18))) : []}
            icon={<Heart size={17} weight="bold" />}
            emptyLabel={copy.notEnoughData}
            loading={isOverviewRefreshing}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.72fr)]">
          <div className={cx(panelClass, "overflow-hidden p-0")}>
            <div className="grid grid-cols-2 border-b border-zinc-200 bg-zinc-50/50 lg:grid-cols-5">
              {analyticsMetricTabs.map((item) => {
                const Icon = chartMetricOptions.find((option) => option.value === item.value)?.icon ?? TrendUp;
                const active = chartMetric === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setChartMetric(item.value)}
                    className={cx(
                      "group relative flex min-h-[84px] items-center justify-between gap-3 border-b border-r border-zinc-200 px-3 py-3 text-left transition even:border-r-0 lg:min-h-[102px] lg:border-b-0 lg:px-4 lg:py-4 lg:even:border-r last:lg:border-r-0",
                      active ? "bg-white" : "bg-transparent hover:bg-white/80",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-zinc-500">{item.label}</span>
                      <span className="mt-3 flex items-end gap-3">
                        <span className="text-[22px] font-bold leading-none text-zinc-950 sm:text-[28px]">{item.metric}</span>
                        <span className="mb-0.5 hidden rounded-[8px] border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
                          {item.change}
                        </span>
                      </span>
                    </span>
                    <span className={cx(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border transition sm:h-10 sm:w-10 sm:rounded-[13px]",
                      active ? "border-indigo-100 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-white text-zinc-400 group-hover:text-zinc-700",
                    )}>
                      <Icon size={17} weight="bold" />
                    </span>
                    <span className={cx("absolute inset-x-0 bottom-0 h-0.5 origin-left bg-zinc-950 transition-transform duration-500", active ? "scale-x-100" : "scale-x-0")} />
                  </button>
                );
              })}
            </div>

            <div className="px-3 pb-4 pt-4 sm:px-5 sm:pb-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950">{chartMetricLabel}</h3>
                  <p className="mt-1 text-sm font-medium text-zinc-500">{copy.visitorsFlow}</p>
                </div>
              </div>

              <div className="relative h-[260px] overflow-hidden rounded-[16px] border border-zinc-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFA_100%)] sm:h-[320px] lg:h-[360px] lg:rounded-[18px]">
                {chartHasData ? (
                <svg key={chartMetric} viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`} className={cx("absolute inset-0 h-full w-full transition-opacity duration-300", isOverviewRefreshing ? "opacity-35" : "opacity-100")}>
                  <defs>
                    <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0070F3" stopOpacity="0.18" />
                      <stop offset="74%" stopColor="#0070F3" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#0070F3" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                    const y = chartGeometry.paddingY + (chartGeometry.height - chartGeometry.paddingY * 2) * tick;
                    const value = Math.round(chartGeometry.maxValue * (1 - tick));
                    return (
                      <g key={tick}>
                        <line x1={42} y1={y} x2={chartGeometry.width - 16} y2={y} stroke="#E4E4E7" strokeWidth="1" />
                        <text x="12" y={y + 4} fill="#71717A" fontSize="11" fontWeight="500">
                          {formatCompactNumber(value)}
                        </text>
                      </g>
                    );
                  })}

                  {chartGeometry.areaPath ? (
                    <path d={chartGeometry.areaPath} fill="url(#lineFill)" opacity="0">
                      <animate attributeName="opacity" from="0" to="1" dur="520ms" fill="freeze" />
                    </path>
                  ) : null}
                  <path d={chartGeometry.linePath} fill="none" stroke="#0070F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1000" strokeDashoffset="1000">
                    <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="760ms" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" />
                  </path>

                  {chartGeometry.points.filter((point) => point.isActive).map((point) => {
                    const index = chartGeometry.points.indexOf(point);
                    return (
                    <g key={`${point.x}-${point.y}`} onMouseEnter={() => setActiveChartIndex(index)} onMouseLeave={() => setActiveChartIndex(null)}>
                      <line x1={point.x} y1={chartGeometry.paddingY} x2={point.x} y2={chartGeometry.height - chartGeometry.paddingY} stroke="#0070F3" strokeWidth="1" opacity={activeChartIndex === index ? 0.35 : 0} />
                      <circle cx={point.x} cy={point.y} r={activeChartIndex === index ? "5" : "2.5"} fill="#FFFFFF" stroke="#0070F3" strokeWidth="2" className="transition-all duration-200" />
                      <circle cx={point.x} cy={point.y} r="16" fill="transparent" className="cursor-pointer" opacity="0" />
                    </g>
                    );
                  })}
                </svg>
                ) : (
                  <EmptyState label={copy.notEnoughData} />
                )}

                {activeChartIndex !== null && activeChartPoint?.isActive && chartRenderSeries[activeChartIndex] && chartHasData ? (
                  <div
                    className="absolute top-4 rounded-[12px] border border-zinc-200 bg-white/95 px-3 py-2 text-sm font-medium text-zinc-700 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur"
                    style={{ left: `${Math.min(78, Math.max(4, (activeChartPoint.x || 0) / chartGeometry.width * 100))}%` }}
                  >
                    <span className="block text-zinc-500">{chartRenderSeries[activeChartIndex]?.label}</span>
                    <span className="text-zinc-950">{activeChartPoint.value.toLocaleString()}</span>
                  </div>
                ) : null}

                {isOverviewRefreshing ? (
                  <div className="absolute inset-x-6 bottom-11 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-zinc-200" />
                  </div>
                ) : null}

                <div className="absolute inset-x-6 bottom-2 h-6 text-sm font-medium text-zinc-400">
                  {chartAxisLabels.map((point) => (
                    <span key={point.key} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: point.left }}>{point.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={cx(panelClass, "overflow-hidden p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-950">{copy.trafficSources}</h3>
                <p className="mt-1 text-sm font-medium text-zinc-500">{copy.visitorCountries}</p>
              </div>
              {trafficHasData ? (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                  {trafficSegments.length}
                </span>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1 rounded-[12px] border border-zinc-200 bg-zinc-50 p-1">
                {trafficDimensionOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTrafficDimension(item.value)}
                    className={cx(
                      "h-8 rounded-[9px] px-1 text-xs font-semibold transition",
                      trafficDimension === item.value
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
            </div>

            {trafficHasData ? (
            <div className="mt-4 grid gap-4">
              <div className="relative mx-auto grid h-[118px] w-[118px] place-items-center">
                <svg viewBox="0 0 140 140" className="h-[118px] w-[118px] -rotate-90">
                  <circle cx="70" cy="70" r={donutRadius} fill="none" stroke="#EEF0F4" strokeWidth="13" />
                  {trafficSegments.map((item, index) => {
                    const previous = trafficSegments.slice(0, index).reduce((sum, segment) => sum + segment.count, 0);
                    const ratio = item.count / Math.max(trafficTotal, 1);
                    const dash = Math.max(0.012, ratio) * donutCircumference;
                    const offset = -(previous / Math.max(trafficTotal, 1)) * donutCircumference;
                    const colors = ["#4F46E5", "#6366F1", "#8B5CF6", "#A5B4FC", "#C4B5FD", "#CBD5E1", "#94A3B8", "#64748B"];
                    const isActive = activeTrafficIndex === null || activeTrafficIndex === index;
                    return (
                      <circle
                        key={item.country}
                        cx="70"
                        cy="70"
                        r={donutRadius}
                        fill="none"
                        stroke={colors[index % colors.length]}
                        strokeWidth={activeTrafficIndex === index ? "16" : "13"}
                        strokeLinecap="round"
                        strokeDasharray={`${Math.max(2, dash - 4)} ${donutCircumference}`}
                        strokeDashoffset={offset}
                        opacity={isActive ? 1 : 0.22}
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setActiveTrafficIndex(index)}
                        onMouseLeave={() => setActiveTrafficIndex(null)}
                      />
                    );
                  })}
                </svg>
                <div className="absolute text-center">
                  <p className="text-[26px] font-bold leading-none text-zinc-950">{activeTrafficSegment?.count?.toLocaleString() ?? trafficTotal.toLocaleString()}</p>
                  <p className="mt-1 max-w-[88px] truncate text-xs font-medium text-zinc-500">{activeTrafficSegment?.country || copy.topCountryCount}</p>
                </div>
              </div>

              <div className="space-y-2">
                {trafficSegments.map((item, index) => {
                  const percent = Math.round((item.count / Math.max(trafficTotal, 1)) * 100);
                  const isActive = activeTrafficIndex === index;
                  return (
                    <div
                      key={item.country}
                      onMouseEnter={() => setActiveTrafficIndex(index)}
                      onMouseLeave={() => setActiveTrafficIndex(null)}
                      className={cx(
                        "rounded-[12px] border p-2.5 transition-all duration-200",
                        isActive ? "border-indigo-200 bg-indigo-50/60 shadow-[0_10px_30px_rgba(79,70,229,0.12)]" : "border-zinc-100 bg-zinc-50/70 hover:border-zinc-200 hover:bg-white",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" style={{ opacity: 1 - index * 0.16 }} />
                        <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-800">
                          {trafficDimension === "country" || trafficDimension === "recentCountry" ? (
                            <CountryWithFlag country={item.country} countryCode={item.countryCode} fallback={copy.unknown} />
                          ) : trafficDimension === "device" ? (
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <DeviceLogo device={item.country} />
                              <span className="truncate capitalize">{item.country}</span>
                            </span>
                          ) : trafficDimension === "referrer" ? (
                            <SourceBadge source={item.country} />
                          ) : (
                            <span className="truncate">{item.country}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-zinc-950">{percent}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200/80">
                        <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${Math.max(percent, 4)}%`, opacity: isActive ? 1 : 1 - index * 0.12 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            ) : (
              <div className="mt-5">
                <EmptyState label={copy.notEnoughData} />
              </div>
            )}

            <div className="mt-5 border-t border-zinc-100 pt-4 text-sm font-medium text-zinc-500">
              {copy.totalSources}: {trafficHasData ? trafficSegments.length.toLocaleString() : "0"}
            </div>
          </div>
        </section>

        <section className={cx(panelClass, "p-4")}>
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)] xl:items-start">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-zinc-950">{copy.marketingTrackers}</h3>
              <p className="mt-1 text-sm font-medium text-zinc-500">{copy.marketingTrackersSubtitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trackerExamples.map((example) => (
                  <button
                    key={example.slug}
                    type="button"
                    onClick={() => {
                      setTrackerName(example.name);
                      setTrackerSlug(example.slug);
                      setTrackerTargetPath(example.target);
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-[11px] border border-zinc-200 bg-white px-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <SourceBadge source={example.source} />
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-[14px] border border-zinc-200 bg-zinc-50/60 p-3">
              <div className="grid gap-2 md:grid-cols-[minmax(160px,1fr)_minmax(140px,0.65fr)_minmax(130px,0.75fr)_auto] md:items-end">
                <input
                  value={trackerName}
                  onChange={(event) => {
                    setTrackerName(event.target.value);
                    if (!trackerSlug) {
                      setTrackerSlug(normalizeTrackerSlugInput(event.target.value));
                    }
                  }}
                  placeholder={copy.trackerNamePlaceholder}
                  className="h-10 min-w-0 rounded-[10px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                />
                <div className="flex h-10 min-w-0 overflow-hidden rounded-[10px] border border-zinc-200 bg-white focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50">
                  <span className="grid w-9 place-items-center border-r border-zinc-100 bg-zinc-50 text-sm font-bold text-zinc-400">@</span>
                  <input
                    value={trackerSlug}
                    onChange={(event) => setTrackerSlug(normalizeTrackerSlugInput(event.target.value))}
                    placeholder={copy.trackerSlugPlaceholder}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                </div>
                <input
                  value={trackerTargetPath}
                  onChange={(event) => setTrackerTargetPath(event.target.value)}
                  placeholder={copy.trackerTargetPlaceholder}
                  className="h-10 min-w-0 rounded-[10px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                />
                <button
                  type="button"
                  onClick={handleCreateTracker}
                  disabled={isTrackerSaving || !trackerName.trim() || !trackerPreviewSlug}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PaperPlaneRight size={15} weight="bold" className={isTrackerSaving ? "animate-pulse" : ""} />
                  {copy.createTracker}
                </button>
              </div>
              <button
                type="button"
                onClick={() => copyTrackerUrl(trackerPreviewUrl)}
                className="mt-2 flex w-full min-w-0 items-center gap-2 rounded-[10px] border border-zinc-200 bg-white px-3 py-2 text-left text-xs font-semibold text-zinc-500 transition hover:border-indigo-200 hover:text-indigo-700"
              >
                <CopySimple size={14} weight="bold" className="shrink-0" />
                <span className="min-w-0 truncate">{trackerPreviewUrl}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
            <div className="rounded-[14px] border border-zinc-200 bg-zinc-50/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-950">{copy.customLinks}</p>
                <span className="text-sm font-medium text-zinc-500">{marketingOverview?.days ?? (overviewRange === "today" ? 1 : Number(overviewRange))}d</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {(marketingOverview?.customTrackers ?? []).length ? (
                  (marketingOverview?.customTrackers ?? []).slice(0, 8).map((tracker) => (
                    <div key={tracker.id} className="grid gap-2 rounded-[12px] border border-zinc-200 bg-white px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div className="flex min-w-0 gap-3">
                        <SourceLogo source={`${tracker.name} ${tracker.slug}`} />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-950">{tracker.name}</p>
                            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">@{tracker.slug}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyTrackerUrl(tracker.url)}
                            className="mt-1 block max-w-full truncate text-left text-xs font-medium text-zinc-500 transition hover:text-indigo-600"
                          >
                            {tracker.url}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5 text-xs font-semibold">
                        <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{formatCompactNumber(tracker.clicks)} {copy.clicks}</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{formatCompactNumber(tracker.signups)} {copy.signups}</span>
                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">{formatRatioPercent(tracker.conversionRate)}</span>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{formatRatioPercent(tracker.earlyExitRate)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState label={copy.notEnoughData} />
                )}
              </div>
            </div>

            <div className="rounded-[14px] border border-zinc-200 bg-zinc-50/50 p-3">
              <p className="text-sm font-semibold text-zinc-950">{copy.topSourcesLabel}</p>
              <div className="mt-3 space-y-1.5">
                {(marketingOverview?.topSources ?? []).length ? (
                  (marketingOverview?.topSources ?? []).slice(0, 7).map((source) => (
                    <div key={source.source} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[12px] border border-zinc-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="min-w-0 text-sm font-semibold text-zinc-950">
                          <SourceBadge source={source.source} />
                        </p>
                        <p className="mt-1 text-xs font-medium text-zinc-500">
                          {formatCompactNumber(source.visitors)} {copy.uniqueVisitors.toLowerCase()} · {formatCompactNumber(source.clicks)} {copy.clicks.toLowerCase()}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          {source.signups} {copy.signups}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          {formatRatioPercent(source.earlyExitRate)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState label={copy.notEnoughData} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          <div className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-950">{copy.liveVisitors}</h3>
              <span className="text-sm font-medium text-zinc-500">
                {formatCompactNumber(liveStats?.live.currentOnline ?? dashboardStats.onlineUsers)} {copy.onlineUsers.toLowerCase()}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {(liveVisitorsExpanded ? liveStats?.currentUsers ?? [] : []).length ? (
                (liveStats?.currentUsers ?? []).slice(0, liveVisitorsExpanded ? 8 : 0).map((item) => (
                  <div key={item.sessionId} className="flex items-center justify-between rounded-[14px] border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
                    <span className="min-w-0 flex items-center gap-2 text-sm font-medium text-zinc-700">
                      <CountryFlag country={item.country} countryCode={item.countryCode} />
                      <span className="truncate">{item.label || copy.visitor}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-zinc-950">{item.pageViews}</span>
                  </div>
                ))
              ) : trafficHasData ? trafficSegments.slice(0, 4).map((item) => (
                <div key={item.country} className="flex items-center justify-between rounded-[16px] border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
                  <span className="min-w-0 text-sm text-zinc-700">
                    {trafficDimension === "country" || trafficDimension === "recentCountry" ? (
                      <CountryWithFlag country={item.country} countryCode={item.countryCode} fallback={copy.unknown} />
                    ) : (
                      item.country
                    )}
                  </span>
                  <span className="text-sm font-semibold text-zinc-950">{item.count}</span>
                </div>
              )) : <EmptyState label={copy.notEnoughData} />}
            </div>
            <button
              type="button"
              onClick={() => setLiveVisitorsExpanded((current) => !current)}
              className="mt-4 inline-flex h-10 w-full items-center justify-between rounded-[14px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <span>{liveVisitorsExpanded ? copy.hideLiveView : copy.liveView}</span>
              <span className="text-zinc-400">›</span>
            </button>
          </div>

          <div className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-950">{copy.mostViewedPerfumes}</h3>
            </div>
            <div className="mt-4 space-y-2">
              {mostViewedPerfumes.length ? mostViewedPerfumes.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3 rounded-[16px] border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
                  <span className="w-4 text-[11px] font-semibold text-zinc-400">{index + 1}</span>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-10 w-10 rounded-[12px] border border-zinc-200 object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-400">
                      {item.name.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-950">{item.name}</p>
                    <p className="truncate text-[11px] text-zinc-500">{item.brand}</p>
                  </div>
                  <span className="text-sm font-medium text-zinc-500">{formatCompactNumber(item.count)}</span>
                </div>
              )) : <EmptyState label={copy.notEnoughData} />}
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-950">{copy.mostAddedWishlist}</h3>
            </div>
            <div className="mt-4 space-y-2">
              {topWishlistedPerfumes.length ? topWishlistedPerfumes.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3 rounded-[16px] border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
                  <span className="w-4 text-[11px] font-semibold text-zinc-400">{index + 1}</span>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-10 w-10 rounded-[12px] border border-zinc-200 object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-400">
                      {item.name.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-950">{item.name}</p>
                    <p className="truncate text-[11px] text-zinc-500">{item.brand}</p>
                  </div>
                  <span className="text-sm font-medium text-zinc-500">{formatCompactNumber(item.count)}</span>
                </div>
              )) : <EmptyState label={copy.notEnoughData} />}
            </div>
          </div>

          <div className={cx(panelClass, "xl:col-span-1")}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-950">{copy.searchAnalytics}</h3>
            </div>
            {searchAnalytics.totalSearches ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-sm font-medium text-emerald-700">{copy.searchGrowth}</p>
                    <p className="mt-2 text-[28px] font-bold leading-none text-emerald-950">↑ {searchAnalytics.searchGrowth}%</p>
                  </div>
                  <div className="rounded-[14px] border border-rose-100 bg-rose-50 p-3">
                    <p className="text-sm font-medium text-rose-700">{copy.noResultSearches}</p>
                    <p className="mt-2 text-[28px] font-bold leading-none text-rose-950">{searchAnalytics.noResults.length}</p>
                  </div>
                  <div className="rounded-[14px] border border-indigo-100 bg-indigo-50 p-3">
                    <p className="text-sm font-medium text-indigo-700">{copy.trendingSearches}</p>
                    <p className="mt-2 text-[28px] font-bold leading-none text-indigo-950">{searchAnalytics.trending.length}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-zinc-950">{copy.mostSearchedTerms}</p>
                  <div className="mt-3 space-y-2">
                    {searchAnalytics.mostSearched.map((item, index) => (
                      <div key={item.query} className="flex items-center justify-between rounded-[14px] border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-700">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-semibold text-zinc-500">{index + 1}</span>
                          <span className="truncate">{item.query}</span>
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-sm font-semibold text-zinc-950">{formatCompactNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-4">
                  <p className="text-sm font-semibold text-zinc-950">{copy.noResultSearches}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {searchAnalytics.noResults.length ? searchAnalytics.noResults.map((query) => (
                      <span key={query.query} className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700">
                        {query.query} · {query.count}
                      </span>
                    )) : (
                      <span className="text-sm font-medium text-zinc-500">{copy.notEnoughData}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState label={copy.notEnoughData} />
              </div>
            )}
          </div>
        </section>

        <section className={cx(panelClass, "rounded-[18px] p-4 sm:p-5")} id="dashboard-activity">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold leading-tight text-zinc-950">{copy.recentActivity}</h3>
              <p className="mt-1 text-sm font-medium text-zinc-500">
                {copy.liveUserActions}
              </p>
            </div>
            <div className="flex items-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActivityLimitMenuOpen((current) => !current)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[11px] border border-indigo-100 bg-white px-3 text-sm font-semibold text-indigo-600 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                >
                  <span>{activityFeedLimit}</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
                {activityLimitMenuOpen ? (
                  <div className="absolute right-0 top-11 z-30 w-[116px] overflow-hidden rounded-[12px] border border-zinc-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
                    {([5, 10, 25, 50, 100] as const).map((limit) => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => {
                          setActivityFeedLimit(limit);
                          setActivityLimitMenuOpen(false);
                        }}
                        className={cx(
                          "flex h-9 w-full items-center justify-between rounded-[9px] px-3 text-sm font-semibold transition",
                          activityFeedLimit === limit ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                        )}
                      >
                        <span>{limit}</span>
                        {activityFeedLimit === limit ? <span>✓</span> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[16px] border border-zinc-200 bg-white">
            {localizedActivityFeed.length ? localizedActivityFeed.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="grid min-h-[70px] grid-cols-[54px_18px_40px_minmax(0,1fr)] items-center gap-2.5 border-b border-zinc-100 px-3 py-3 last:border-b-0 sm:grid-cols-[68px_22px_48px_minmax(0,1fr)] sm:gap-3 sm:px-4">
                  <div>
                    <p className="text-sm font-semibold leading-none text-zinc-950">{formatActivityTimeLabel(item.timestamp)}</p>
                    <p className="mt-1.5 text-xs font-medium text-zinc-500">{formatActivityDateLabel(item.timestamp)}</p>
                  </div>
                  <div className="flex h-full items-center justify-center border-l border-zinc-200">
                    <span className={cx("h-2.5 w-2.5 rounded-full", item.dotTone)} />
                  </div>
                  <span className={cx("grid h-9 w-9 place-items-center rounded-[11px] border sm:h-11 sm:w-11 sm:rounded-[13px]", item.tileTone)}>
                    <Icon size={20} weight="regular" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">{item.title}</p>
                    {item.detail ? <p className="mt-1 truncate text-sm font-medium text-zinc-500">{item.detail}</p> : null}
                  </div>
                </div>
              );
            }) : <EmptyState label={copy.notEnoughData} />}
          </div>
        </section>

        <section className={panelClass}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="text-[22px] font-semibold leading-tight text-zinc-950">{copy.usersTitle}</h3>
              <p className="mt-1 text-sm font-medium text-zinc-500">{copy.usersPanelSubtitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              {[
                [copy.userCount, `${filteredUsers.length.toLocaleString()} / ${usersMeta.total.toLocaleString()}`],
                [copy.activeUserCount, userMetricSummary.active.toLocaleString()],
                [copy.liveGuests, liveVisitors.length.toLocaleString()],
                [copy.newsletterSubscribersMetric, userMetricSummary.newsletter.toLocaleString()],
              ].map(([label, value]) => (
                <div key={String(label)} className="min-w-[132px] border-l border-zinc-200 pl-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-y border-zinc-100 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 lg:w-[340px]">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} weight="bold" />
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder={copy.searchUsers}
                  className="h-10 w-full rounded-[10px] border border-zinc-200 bg-white px-3 pl-10 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                />
              </div>
              <div className="grid grid-cols-4 rounded-[12px] border border-zinc-200 bg-zinc-50 p-1 sm:inline-grid">
                {[
                  ["all", copy.all],
                  ["active", copy.active],
                  ["newsletter", copy.newsletterFilter],
                  ["recent", copy.recent],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setUserFilter(value as "all" | "active" | "newsletter" | "recent")}
                    className={cx(
                      "h-8 rounded-[8px] px-2 text-xs font-semibold transition",
                      userFilter === value ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAllUsers}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                {copy.selectAll}
                <span className="font-semibold text-zinc-950">{allFilteredSelected ? "✓" : selectedUserEmails.length.toLocaleString()}</span>
              </button>
              <button
                type="button"
                onClick={exportFilteredUsers}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                {copy.export}
              </button>
              <button
                type="button"
                onClick={openNewsletterPanel}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-indigo-100 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <EnvelopeOpen size={15} weight="bold" />
                {copy.newsletterButton}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px_320px]">
            <div className="grid gap-2 md:hidden">
              {isUsersLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-[14px] bg-zinc-100" />
                ))
              ) : filteredUsers.length ? (
                filteredUsers.map((user) => {
                  const email = user.email.toLowerCase();
                  const subscribed = newsletterStatusByEmail.get(email) === "subscribed";
                  const country = countryByEmail.get(email) || {
                    country: user.country || "",
                    countryCode: user.countryCode || "",
                  };
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user.id)}
                      className={cx(
                        "rounded-[14px] border p-3 text-left transition",
                        selectedUserId === user.id ? "border-indigo-200 bg-indigo-50" : "border-zinc-200 bg-white hover:bg-zinc-50",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-bold uppercase text-zinc-600">
                          {user.email.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-zinc-950">{user.email}</span>
                          <span className="mt-1 flex min-w-0 items-center gap-2 text-xs font-medium text-zinc-500">
                            <span>{formatDateTime(user.last_seen_at || user.last_sign_in_at)}</span>
                            <span>·</span>
                            <CountryFlag country={country.country} countryCode={country.countryCode} className="h-5 w-7 text-[13px]" />
                          </span>
                        </span>
                        <span className={cx("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", subscribed ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-500")}>
                          {subscribed ? copy.subscribed : copy.notSubscribed}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <EmptyState label={copy.noUsers} />
              )}
            </div>

            <div className={cx("hidden min-w-0 overflow-x-auto rounded-[14px] border border-zinc-200 bg-white md:block", containedScrollClass)}>
              <div className="grid min-w-[560px] grid-cols-[34px_minmax(176px,1fr)_86px_90px_88px_54px] items-center border-b border-zinc-100 bg-white px-3 py-3 text-xs font-semibold text-zinc-500">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllUsers} className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="truncate">{copy.userColumn}</span>
                <span className="truncate">{copy.lastLogin}</span>
                <span className="truncate">{copy.lastSeen}</span>
                <span className="truncate">{copy.newsletterButton}</span>
                <span className="truncate">{copy.countryLabel}</span>
              </div>
              {isUsersLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-[14px] bg-zinc-100" />
                  ))}
                </div>
              ) : filteredUsers.length ? (
                <div className={cx("max-h-[540px] min-w-[560px] divide-y divide-zinc-100 overflow-y-auto", containedScrollClass)}>
                  {filteredUsers.map((user) => {
                    const email = user.email.toLowerCase();
                    const subscribed = newsletterStatusByEmail.get(email) === "subscribed";
                    const country = countryByEmail.get(email) || {
                      country: user.country || "",
                      countryCode: user.countryCode || "",
                    };
                    const checked = selectedUserSet.has(user.email);

                    return (
                      <div
                        key={user.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectUser(user.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectUser(user.id);
                          }
                        }}
                        className={cx(
                          "grid cursor-pointer grid-cols-[34px_minmax(176px,1fr)_86px_90px_88px_54px] items-center px-3 py-3 transition hover:bg-zinc-50 focus:bg-indigo-50/60 focus:outline-none",
                          selectedUserId === user.id && "bg-indigo-50/60",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleUserSelection(user.email)}
                          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={cx(
                            "grid h-8 w-8 place-items-center rounded-full border text-xs font-bold uppercase",
                            selectedUserId === user.id ? "border-indigo-200 bg-white text-indigo-700" : "border-zinc-200 bg-zinc-50 text-zinc-600",
                          )}>
                            {user.email.slice(0, 1)}
                          </span>
                          <span className="min-w-0 truncate text-sm font-semibold text-zinc-950">{user.email}</span>
                        </div>
                        <span className="truncate text-xs font-medium text-zinc-600">{formatDateTime(user.last_sign_in_at)}</span>
                        <span className="truncate text-xs font-medium text-zinc-600">{formatDateTime(user.last_seen_at)}</span>
                        <div>
                          <span className={cx("rounded-full border px-2 py-0.5 text-xs font-medium", subscribed ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-500")}>
                            {subscribed ? copy.subscribed : copy.notSubscribed}
                          </span>
                        </div>
                        <span className="min-w-0 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                          <CountryFlag country={country.country} countryCode={country.countryCode} className="h-5 w-7 text-[13px]" />
                          <span className="truncate">{normalizeCountryCode(country.country, country.countryCode) || "-"}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState label={copy.noUsers} />
              )}
            </div>

            <div className="min-w-0 rounded-[14px] border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{copy.liveGuests}</p>
                  <p className="mt-0.5 text-xs font-medium text-zinc-500">{copy.liveVisitorPanelSubtitle}</p>
                </div>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {liveVisitors.length.toLocaleString()}
                </span>
              </div>
              <div className={cx("max-h-[360px] divide-y divide-zinc-100 overflow-y-auto sm:max-h-[460px] xl:max-h-[640px]", containedScrollClass)}>
                {liveVisitors.length ? liveVisitors.slice(0, 18).map((visitor) => (
                  <button
                    key={visitor.sessionId}
                    type="button"
                    onClick={() => handleSelectLiveVisitor(visitor.sessionId)}
                    className={cx(
                      "block w-full px-4 py-3 text-left transition hover:bg-zinc-50",
                      selectedLiveVisitor?.sessionId === visitor.sessionId && "bg-indigo-50",
                    )}
                  >
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 flex items-center gap-2">
                        <CountryFlag country={visitor.country} countryCode={visitor.countryCode} className="h-5 w-7 text-[13px]" />
                        <span className="truncate text-sm font-semibold text-zinc-900">{visitor.label || copy.visitor}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-zinc-400">{visitor.locale || "az"}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs font-medium text-zinc-500">{visitor.pathWithQuery || visitor.path || "/"}</span>
                    <span className="mt-1 block truncate text-xs font-medium text-zinc-400">
                      {[visitor.deviceType, visitor.browser, visitor.city || visitor.country].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                )) : (
                  <EmptyState label={copy.notEnoughData} />
                )}
              </div>
            </div>

            <aside className="min-w-0 rounded-[14px] border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-950">{selectedLiveVisitor ? copy.liveGuests : selectedUser ? copy.userColumn : copy.currentPage}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">
                  {selectedLiveVisitor?.label || selectedUser?.email || copy.notEnoughData}
                </p>
              </div>

              {selectedLiveVisitor ? (
                <div className={cx("max-h-[520px] overflow-y-auto p-4 xl:max-h-[640px]", containedScrollClass)}>
                  <div className="space-y-3">
                    {[
                      [copy.currentPage, selectedLiveVisitor.pathWithQuery || selectedLiveVisitor.path || "/"],
                      [copy.deviceInfo, [selectedLiveVisitor.deviceType, selectedLiveVisitor.browser, selectedLiveVisitor.os].filter(Boolean).join(" · ") || "-"],
                      [copy.locationInfo, [selectedLiveVisitor.city, selectedLiveVisitor.country].filter(Boolean).join(", ") || "-"],
                      [copy.lastSeen, formatDateTime(selectedLiveVisitor.lastSeen)],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="border-b border-zinc-100 pb-3 last:border-b-0">
                        <p className="text-xs font-semibold text-zinc-400">{label}</p>
                        <p className="mt-1 break-words text-sm font-semibold text-zinc-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-4">
                    <div className="grid gap-3">
                      <input
                        value={visitorPopupTitle}
                        onChange={(event) => setVisitorPopupTitle(event.target.value)}
                        placeholder={copy.popupTitle}
                        className="h-10 w-full rounded-[10px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                      />
                      <textarea
                        value={visitorPopupBody}
                        onChange={(event) => setVisitorPopupBody(event.target.value)}
                        placeholder={copy.popupMessage}
                        rows={4}
                        className="w-full resize-none rounded-[10px] border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["visitor", `${copy.visitorLanguage} (${selectedLiveVisitor.locale || "az"})`],
                          ["all", copy.allLanguages],
                        ].map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setVisitorPopupLocaleMode(mode as "visitor" | "all")}
                            className={cx(
                              "h-9 rounded-[10px] border px-2 text-xs font-semibold transition",
                              visitorPopupLocaleMode === mode ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-500 hover:text-zinc-900",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {visitorPopupError ? (
                        <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                          {visitorPopupError}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleSendVisitorPopup}
                        disabled={isVisitorPopupSending || !visitorPopupTitle.trim() || !visitorPopupBody.trim()}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PaperPlaneRight size={15} weight="bold" className={isVisitorPopupSending ? "animate-pulse" : ""} />
                        {copy.sendPopup}
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedUser ? (
                <div className={cx("max-h-[520px] overflow-y-auto p-4 xl:max-h-[640px]", containedScrollClass)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">{selectedUser.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={cx("rounded-full border px-2.5 py-1", selectedUser.is_online ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-500")}>
                          {selectedUser.is_online ? copy.onlineUsers : copy.offline}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-500">{copy.lastSeen}: {formatDateTime(selectedUser.last_seen_at)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      disabled={selectedUser.is_deleted}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 rounded-[12px] border border-zinc-200 bg-zinc-50 p-1">
                    {[
                      ["sessions", copy.viewSessions],
                      ["wishlist", copy.viewWishlist],
                      ["cart", copy.viewCart],
                    ].map(([tab, label]) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => handleChangeDetailTab(tab as "sessions" | "wishlist" | "cart")}
                        className={cx(
                          "h-8 rounded-[8px] px-2 text-xs font-semibold transition",
                          userDetailTab === tab ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                {sessionsError || userItemsError ? (
                  <div className="mb-3 rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                    {sessionsError || userItemsError}
                  </div>
                ) : null}

                {userDetailTab === "sessions" ? (
                  isSessionsLoading ? (
                    <div className="h-24 animate-pulse rounded-[12px] bg-zinc-100" />
                  ) : userSessions.length ? (
                    <div className={cx("max-h-[260px] space-y-2 overflow-y-auto", containedScrollClass)}>
                      {userSessions.map((session) => (
                        <div key={session.session_id} className="grid gap-2 rounded-[14px] border border-zinc-100 bg-zinc-50/70 p-3 text-sm font-medium text-zinc-600 md:grid-cols-[1fr_auto]">
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-950">{formatDateTime(session.last_seen)}</p>
                            <p className="mt-1 truncate">{session.device_type || "-"} · {session.browser || "-"} · {session.os || "-"}</p>
                            <p className="mt-1 inline-flex min-w-0 max-w-full items-center gap-2">
                              <span className="truncate">{session.city || "-"}</span>
                              <span className="text-zinc-300">·</span>
                              <CountryWithFlag country={session.country} countryCode={session.country_code} />
                            </p>
                            <p className="mt-1 truncate text-zinc-500">{session.path || "-"}</p>
                          </div>
                          <span className="h-fit rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-600">
                            {formatSessionViews(session.page_views)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState label={copy.noSessions} />
                  )
                ) : null}

                {userDetailTab === "wishlist" ? (
                  isUserItemsLoading ? (
                    <div className="h-24 animate-pulse rounded-[12px] bg-zinc-100" />
                  ) : userWishlist.length ? (
                    <div className="grid gap-2">
                      {userWishlist.map((item) => (
                        <div key={`${item.slug}-${item.created_at}`} className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 rounded-[14px] border border-zinc-100 bg-zinc-50/70 p-3">
                          {item.image ? <img src={item.image} alt={item.name} className="h-12 w-12 rounded-[12px] border border-zinc-200 object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-white text-sm font-semibold text-zinc-400">{item.name.slice(0, 1)}</span>}
                          <div className="min-w-0 pr-1">
                            <p className="truncate text-sm font-semibold text-zinc-950">{item.name}</p>
                            <p className="truncate text-sm font-medium text-zinc-500">{item.brand}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState label={copy.emptyWishlist} />
                  )
                ) : null}

                {userDetailTab === "cart" ? (
                  isUserItemsLoading ? (
                    <div className="h-24 animate-pulse rounded-[12px] bg-zinc-100" />
                  ) : userCart.length ? (
                    <div className="grid gap-2">
                      {userCart.map((item) => (
                        <div key={`${item.slug}-${item.created_at}-${item.size_ml}`} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-zinc-100 bg-zinc-50/70 p-3">
                          {item.image ? <img src={item.image} alt={item.name} className="h-12 w-12 rounded-[12px] border border-zinc-200 object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-white text-sm font-semibold text-zinc-400">{item.name.slice(0, 1)}</span>}
                          <div className="min-w-0 pr-1">
                            <p className="truncate text-sm font-semibold text-zinc-950">{item.name}</p>
                            <p className="truncate text-sm font-medium text-zinc-500">{item.size_ml} ml · x{item.quantity}</p>
                          </div>
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-600">
                            {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState label={copy.emptyCart} />
                  )
                ) : null}
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState label={copy.notEnoughData} />
                </div>
              )}
            </aside>
          </div>
        </section>

        {toastMessage ? (
          <div className="fixed bottom-5 right-5 z-[120] rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
            {toastMessage}
          </div>
        ) : null}

        {newsletterOpen && mounted ? createPortal(
          <div className={cx("fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm", containedScrollClass)}>
            <div className={cx("grid h-[min(92dvh,900px)] w-[min(1180px,100%)] overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_26px_90px_rgba(2,6,23,0.28)] lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]", containedScrollClass)}>
              <div className="flex min-h-0 flex-col border-b border-zinc-100 bg-zinc-50/70 p-4 lg:border-b-0 lg:border-r">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950">{copy.newsletterTitle}</h3>
                    <p className="mt-1 text-sm font-medium text-zinc-500">{copy.usersPanelSubtitle}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={copy.close}
                    onClick={() => setNewsletterOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-[10px] border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniMetric label={copy.selectedUsers} value={selectedUserEmails.length} tone="indigo" />
                  <MiniMetric label={copy.subscribed} value={newsletterSubscribedCount} tone="emerald" />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllNewsletterSubscribers}
                    className="h-10 flex-1 rounded-[12px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    {copy.selectAll}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserEmails([])}
                    className="h-10 rounded-[12px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    {copy.cancel}
                  </button>
                </div>

                <div className={cx("mt-3 min-h-0 flex-1 overflow-y-auto space-y-2 pr-1", containedScrollClass)}>
                  {isNewsletterLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="h-[66px] animate-pulse rounded-[14px] bg-white" />
                      ))}
                    </div>
                  ) : activeNewsletterSubscribers.length ? activeNewsletterSubscribers.map((subscriber) => {
                    const checked = selectedUserSet.has(subscriber.email);
                    const registeredUser = registeredUserByEmail.get(subscriber.email.toLowerCase());
                    return (
                      <label key={subscriber.email} className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-zinc-200 bg-white p-3 transition hover:border-zinc-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUserSelection(subscriber.email)}
                          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-sm font-bold uppercase text-zinc-600">{subscriber.email.slice(0, 1)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-zinc-950">{subscriber.email}</span>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              {copy.subscribed}
                            </span>
                            <span className={cx("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", registeredUser ? "border-indigo-100 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-zinc-50 text-zinc-500")}>
                              {registeredUser ? copy.registeredAccount : copy.newsletterOnly}
                            </span>
                          </span>
                        </span>
                      </label>
                    );
                  }) : (
                    <EmptyState label={copy.noSubscribers} />
                  )}
                </div>
              </div>

              <div className={cx("min-h-0 overflow-y-auto p-4 sm:p-5", containedScrollClass)}>
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-1">
                      {[
                        ["preset", copy.presetTemplate, <EnvelopeOpen key="preset" size={15} weight="bold" />],
                        ["custom", copy.customTemplate, <Code key="custom" size={15} weight="bold" />],
                      ].map(([mode, label, icon]) => (
                        <button
                          key={String(mode)}
                          type="button"
                          onClick={() => setNewsletterTemplateMode(mode as "preset" | "custom")}
                          className={cx(
                            "inline-flex h-10 w-1/2 items-center justify-center gap-2 rounded-[12px] text-sm font-medium transition",
                            newsletterTemplateMode === mode ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
                          )}
                        >
                          {icon}
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-1">
                      {[
                        ["newsletter", copy.newsletterMode],
                        ["direct", copy.directMode],
                      ].map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setNewsletterDeliveryMode(mode as "newsletter" | "direct")}
                          className={cx(
                            "inline-flex h-10 w-1/2 items-center justify-center rounded-[12px] text-sm font-medium transition",
                            newsletterDeliveryMode === mode ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-600">{copy.emailSubject}</span>
                    <input className="mt-2 h-11 w-full rounded-[14px] border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50" value={newsletterSubject} onChange={(event) => setNewsletterSubject(event.target.value)} />
                  </label>

                  {newsletterTemplateMode === "preset" ? (
                    <>
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-600">{copy.emailTitle}</span>
                        <input className="mt-2 h-11 w-full rounded-[14px] border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50" value={newsletterTitle} onChange={(event) => setNewsletterTitle(event.target.value)} />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-600">{copy.emailBody}</span>
                        <textarea rows={8} className={cx("mt-2 w-full resize-y rounded-[14px] border border-zinc-200 bg-white px-3 py-3 text-sm leading-6 text-zinc-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50", containedScrollClass)} value={newsletterBody} onChange={(event) => setNewsletterBody(event.target.value)} />
                      </label>
                    </>
                  ) : (
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-600">{copy.emailHtml}</span>
                      <textarea rows={12} spellCheck={false} className={cx("mt-2 w-full resize-y rounded-[14px] border border-zinc-200 bg-zinc-950 px-3 py-3 font-mono text-xs leading-6 text-zinc-50 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50", containedScrollClass)} value={newsletterHtml} onChange={(event) => setNewsletterHtml(event.target.value)} />
                    </label>
                  )}

                  <div className="overflow-hidden rounded-[16px] border border-zinc-200 bg-white">
                    <iframe title={copy.emailPreview} sandbox="" srcDoc={newsletterPreviewHtml} className="h-[260px] w-full bg-white" />
                  </div>

                  <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setNewsletterConfirmTarget("selected")} disabled={selectedUserEmails.length === 0 || isNewsletterSending} className="h-11 rounded-[14px] bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
                      {copy.sendNewsletterCta}
                    </button>
                    <button type="button" onClick={() => setNewsletterConfirmTarget("registered")} disabled={registeredWebsiteUserCount === 0 || isNewsletterSending} className="h-11 rounded-[14px] border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
                      {copy.sendRegisteredUsers} ({registeredWebsiteUserCount})
                    </button>
                    <button type="button" onClick={() => setNewsletterConfirmTarget("subscribed")} disabled={newsletterSubscribedCount === 0 || isNewsletterSending} className="h-11 rounded-[14px] border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50">
                      {copy.sendAllSubscribers}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        ) : null}

        {newsletterConfirmTarget && mounted ? createPortal(
          <div className={cx("fixed inset-0 z-[140] grid min-h-dvh place-items-center overflow-y-auto bg-zinc-950/55 p-4 backdrop-blur-sm", containedScrollClass)}>
            <div className="my-auto w-[min(420px,100%)] rounded-[20px] border border-zinc-200 bg-white p-5 shadow-[0_26px_90px_rgba(2,6,23,0.28)]">
              <h3 className="text-lg font-semibold text-zinc-950">{copy.newsletterSendConfirm}</h3>
              <p className="mt-3 text-sm font-medium text-zinc-500">
                {copy.recipientCount}: {(
                  newsletterConfirmTarget === "selected" 
                    ? selectedUserEmails.length 
                    : newsletterConfirmTarget === "registered"
                      ? registeredWebsiteUserCount
                      : newsletterSubscribedCount
                ).toLocaleString()}
              </p>
              {newsletterError ? (
                <p className="mt-3 rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{newsletterError}</p>
              ) : null}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewsletterConfirmTarget(null)}
                  className="h-10 rounded-[12px] border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendNewsletter(newsletterConfirmTarget)}
                  disabled={isNewsletterSending}
                  className="h-10 rounded-[12px] bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isNewsletterSending ? copy.loadingStats : copy.send}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <h2 className="text-[32px] font-bold leading-tight text-zinc-950">{copy.dashboard}</h2>
        <p className="mt-2 text-sm font-medium text-zinc-500">{error || copy.loadingStats}</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={panelClass}>
            <div className="h-4 w-28 animate-pulse rounded bg-zinc-100" />
            <div className="mt-4 h-9 w-20 animate-pulse rounded bg-zinc-100" />
            <div className="mt-4 h-4 w-40 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </section>
    </div>
  );

}
