"use client";

import {
  Users,
  Eye,
  EnvelopeOpen,
  Clock,
  Code,
  MagnifyingGlass,
  Heart,
  CheckCircle,
  PaperPlaneRight,
  Warning,
  TrendUp,
  UserCircle,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type DateFilter = "today" | "thisMonth" | "thisYear" | "allTime" | "custom";
type AdminLocale = "az" | "en";

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
    sessions: number;
    loggedInSessions: number;
    botEvents: number;
  }>;
  audience: {
    topCountries: Array<{ country: string; count: number }>;
  };
  topPages: Array<{
    path: string;
    pageViews: number;
    visitors: number;
  }>;
  currentUsers: Array<{
    sessionId: string;
    label: string;
    country: string;
    city: string;
    path: string;
    pathWithQuery: string;
    pageViews: number;
    lastSeen: string;
    isLoggedIn: boolean;
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
};

const dashboardCopy = {
  az: {
    dashboard: "İnformasiya Paneli",
    realtimeAnalytics: "Real-time analitika və istifadəçi statistikası",
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
    onlineUsers: "Onlayn",
    newsletterSubscribers: "Abonelər",
    uniqueVisitors: "Ziyarətçilər",
    pageViews: "Səhifə",
    avgSessionDuration: "Sessiya",
    bounceRate: "Fırılanta",
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
    viewWishlist: "Wishlist",
    viewCart: "Səbət",
    emptyWishlist: "Wishlist boşdur.",
    emptyCart: "Səbət boşdur.",
    wishlistTitle: "Wishlist",
    cartTitle: "Səbət",
    itemCount: "{count} məhsul",
    updated: "Yeniləndi",
    engagement: "Aktivlik",
    comments: "Şərhlər",
    wishlists: "Wishlist",
    cart: "Səbət",
    topCountries: "Top ölkələr",
    noCountryData: "Ölkə məlumatı yoxdur.",
    newsletterButton: "Newsletter",
    newsletterTitle: "Newsletter abunələri",
    newsletterSubtitle: "Abunə olanları və çıxanları idarə edin",
    subscribed: "Abunədir",
    unsubscribed: "Çıxıb",
    sendNewsletter: "Göndər",
    emailSubject: "Email başlığı",
    emailTitle: "Məktub başlığı",
    emailBody: "Məktub mətni",
    emailHtml: "Custom HTML",
    presetTemplate: "Hazır şablon",
    customTemplate: "Custom HTML",
    newsletterMode: "Newsletter",
    directMode: "Main inbox",
    loadSubscribers: "Abunələr yüklənir...",
    noSubscribers: "Newsletter abunəsi yoxdur.",
    subscribedOnlyHint: "Göndərim yalnız aktiv abunələrə gedəcək. Çıxanlar siyahıda görünür, amma email almır.",
    emailSendSuccess: "{count} email göndərildi.",
    emailSendError: "Email göndərilmədi.",
    close: "Bağla",
    emailPreview: "Canlı önizləmə",
    emailPreviewHint: "HTML burada email kimi göstərilir. {{unsubscribeUrl}} göndərim zamanı real linklə əvəz olunacaq.",
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
    uniqueVisitors: "Visitors",
    pageViews: "Pages",
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
    close: "Close",
    emailPreview: "Live preview",
    emailPreviewHint: "HTML renders here like an email. {{unsubscribeUrl}} is replaced with a real link when sent.",
  },
};

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;
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
    <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-zinc-950">{value}</p>
          {detail ? <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p> : null}
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
}: {
  label: string;
  value: string;
  change: string;
  points: number[];
}) {
  const path = buildSparklinePath(points, 120, 38);

  return (
    <div className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
          <p className="mt-3 text-[2rem] font-semibold tracking-[-0.06em] text-zinc-950">{value}</p>
          <p className="mt-2 text-xs font-medium text-emerald-600">{change}</p>
        </div>
        <svg viewBox="0 0 120 38" className="mt-1 h-[38px] w-[120px] shrink-0 overflow-visible">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
    newsletter: { az: "Newsletter", en: "Newsletter" },
  };

  if (sourceLabels[normalized]) {
    return sourceLabels[normalized][locale];
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || (locale === "az" ? "Newsletter" : "Newsletter");
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("custom");
  const initialRange = getRangeBounds(30);
  const [startDate, setStartDate] = useState<string>(initialRange.start);
  const [endDate, setEndDate] = useState<string>(initialRange.end);
  const [overviewRange, setOverviewRange] = useState<"today" | "7" | "30" | "90">("30");
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
    "<h1>Perfoumer updates</h1><p>Write your custom HTML here.</p><p><a href=\"{{unsubscribeUrl}}\">Unsubscribe</a></p>",
  );
  const supabase = getSupabaseBrowserClient();
  const copy = dashboardCopy[locale];

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStats = useCallback(async (filter: DateFilter, start?: string, end?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ dateFilter: filter });
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      const response = await fetch(`/api/admin/stats?${params}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json() as Stats;
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLiveStats = useCallback(async (days: number) => {
    setIsLiveLoading(true);

    try {
      const response = await fetch(`/api/analytics/live-stats?days=${days}`, { cache: "no-store" });
      const data = (await response.json()) as LiveStats & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load live analytics");
      }

      setLiveStats(data);
    } catch (err) {
      setLiveStats(null);
      setError((current) => current || (err instanceof Error ? err.message : "Failed to load live analytics"));
    } finally {
      setIsLiveLoading(false);
    }
  }, []);

  const fetchWishlistOverview = useCallback(async (days: number) => {
    try {
      const response = await fetch(`/api/admin/wishlist-stats?days=${days}`, { cache: "no-store" });
      const data = (await response.json()) as WishlistOverview & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load wishlist analytics");
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
        throw new Error(data.error || "Failed to load search analytics");
      }

      setSearchOverview(data);
    } catch {
      setSearchOverview(null);
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
  }, [fetchLiveStats, fetchSearchOverview, fetchWishlistOverview, overviewRange]);

  const fetchUsers = useCallback(async () => {
    setIsUsersLoading(true);
    setUsersError(null);

    try {
      const response = await fetch("/api/admin/users?perPage=60", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
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
      setUsersError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

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
        throw new Error(data.error || "Failed to fetch newsletter subscribers");
      }

      setNewsletterSubscribers(data.subscribers ?? []);
    } catch (err) {
      setNewsletterError(err instanceof Error ? err.message : "Failed to load newsletter subscribers");
    } finally {
      setIsNewsletterLoading(false);
    }
  }, []);

  const openNewsletterPanel = useCallback(() => {
    setNewsletterOpen(true);
    setNewsletterStatus(null);
    void fetchNewsletterSubscribers();
  }, [fetchNewsletterSubscribers]);

  const handleSendNewsletter = useCallback(async () => {
    setIsNewsletterSending(true);
    setNewsletterError(null);
    setNewsletterStatus(null);

    try {
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
          recipients: "subscribed",
        }),
      });
      const data = await response.json() as { sent?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error || copy.emailSendError);
      }

      setNewsletterStatus(copy.emailSendSuccess.replace("{count}", String(data.sent ?? 0)));
      void fetchNewsletterSubscribers();
    } catch (err) {
      setNewsletterError(err instanceof Error ? err.message : copy.emailSendError);
    } finally {
      setIsNewsletterSending(false);
    }
  }, [
    copy.emailSendError,
    copy.emailSendSuccess,
    fetchNewsletterSubscribers,
    newsletterBody,
    newsletterDeliveryMode,
    newsletterHtml,
    newsletterSubject,
    newsletterTemplateMode,
    newsletterTitle,
  ]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (dateFilter === "custom" && (!startDate || !endDate)) {
        return;
      }
      void fetchStats(dateFilter, startDate, endDate);
      void fetchUsers();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [dateFilter, endDate, fetchStats, fetchUsers, startDate]);

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
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json() as { sessions: AdminUserSession[] };
      setUserSessions(data.sessions);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setIsSessionsLoading(false);
    }
  }, []);

  const fetchUserWishlist = useCallback(async (userId: string) => {
    setIsUserItemsLoading(true);
    setUserItemsError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/wishlist`);
      if (!response.ok) {
        throw new Error("Failed to fetch wishlist");
      }

      const data = await response.json() as { items: AdminUserWishlistItem[] };
      setUserWishlist(data.items);
    } catch (err) {
      setUserItemsError(err instanceof Error ? err.message : "Failed to load wishlist");
    } finally {
      setIsUserItemsLoading(false);
    }
  }, []);

  const fetchUserCart = useCallback(async (userId: string) => {
    setIsUserItemsLoading(true);
    setUserItemsError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/cart`);
      if (!response.ok) {
        throw new Error("Failed to fetch cart");
      }

      const data = await response.json() as { items: AdminUserCartItem[] };
      setUserCart(data.items);
    } catch (err) {
      setUserItemsError(err instanceof Error ? err.message : "Failed to load cart");
    } finally {
      setIsUserItemsLoading(false);
    }
  }, []);

  const handleSelectUser = useCallback(
    (userId: string) => {
      setSelectedUserId(userId);
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
      setUsersError("Failed to delete user");
      return;
    }

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, is_deleted: true, is_online: false } : user,
      ),
    );
  }, [copy.deleteConfirm]);

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

  const formatSessionViews = (count: number) =>
    copy.sessionViews.replace("{count}", count.toLocaleString());

  const formatItemCount = (count: number) =>
    copy.itemCount.replace("{count}", count.toLocaleString());

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  const onlineUsersCount = useMemo(
    () => users.filter((user) => user.is_online).length,
    [users],
  );
  const newsletterSubscribedCount = useMemo(
    () => newsletterSubscribers.filter((subscriber) => subscriber.status === "subscribed").length,
    [newsletterSubscribers],
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
          <p style="margin:0 0 14px;font-size:12px;letter-spacing:0.16em;color:#6b7280;text-transform:uppercase;">Perfoumer ${newsletterDeliveryMode === "newsletter" ? "Newsletter" : "Message"}</p>
          <h1 style="margin:0 0 14px;font-size:30px;line-height:1.14;color:#111827;">${escapePreviewHtml(newsletterTitle)}</h1>
          <div style="font-size:16px;line-height:1.75;color:#374151;white-space:pre-line;">${escapePreviewHtml(newsletterBody)}</div>
          ${
            newsletterDeliveryMode === "newsletter"
              ? '<div style="border-top:1px solid #ebe8e2;margin-top:26px;padding-top:18px;"><p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b7280;">Bu məktubu Perfoumer newsletter abunəliyinizə görə aldınız.</p><a href="#unsubscribe-preview" style="display:inline-block;padding:10px 16px;border:1px solid #d6d3ce;border-radius:999px;color:#111827;text-decoration:none;font-size:13px;">Unsubscribe</a></div>'
              : ""
          }
        </div>
      </div>
    `;
  }, [newsletterBody, newsletterDeliveryMode, newsletterHtml, newsletterTemplateMode, newsletterTitle]);

  const chartSeries = liveStats?.trends ?? [];
  const chartValues = chartSeries.length
    ? chartSeries.map((point) => point.visitors || 0)
    : overviewRange === "today"
      ? [8, 12, 10, 14, 11]
      : [12, 16, 14, 20, 18, 23, 19];
  const chartRenderSeries = chartSeries.length
    ? chartSeries
    : chartValues.map((value, index) => ({
        date: String(index),
        label: String(index + 1),
        pageViews: value,
        visitors: value,
        sessions: value,
        loggedInSessions: 0,
        botEvents: 0,
      }));
  const trafficSources = (liveStats?.audience.topCountries ?? [])
    .slice(0, 4)
    .map((item, index) => ({
      ...item,
      tone: index,
    }));
  const trafficTotal = trafficSources.reduce((sum, item) => sum + item.count, 0) || 1;
  const mostViewedPerfumes = useMemo(() => {
    const fallback = [
      { name: "Sauvage", count: 8421 },
      { name: "Aventus", count: 6231 },
      { name: "Blue Hope", count: 4215 },
      { name: "Erba Pura", count: 3284 },
      { name: "Baccarat Rouge 540", count: 2112 },
    ];

    return fallback.map((item) => {
      const perfume = perfumes.find((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) || null;
      const slug = perfume?.slug || "";
      const liveMatch = liveStats?.topPages.find((page) => isPerfumePath(page.path) && stripPerfumeSlug(page.path) === slug);

      return {
        name: item.name,
        brand: perfume?.brand || "",
        image: perfume?.image || "",
        count: liveMatch?.pageViews || item.count,
      };
    });
  }, [liveStats?.topPages, perfumes]);

  const topWishlistedPerfumes = useMemo(() => {
    const fallback = [
      { name: "Aventus", count: 1248 },
      { name: "Sauvage", count: 982 },
      { name: "Layton", count: 712 },
      { name: "Naxos", count: 543 },
      { name: "Torino 21", count: 432 },
    ];

    return fallback.map((item) => {
      const fallbackFromApi = wishlistOverview?.topWishlistedPerfumes.find(
        (entry) => entry.name.toLowerCase() === item.name.toLowerCase(),
      );
      const perfume = perfumes.find((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) || null;

      return {
        name: item.name,
        brand: fallbackFromApi?.brand || perfume?.brand || "",
        image: fallbackFromApi?.image || perfume?.image || "",
        count: fallbackFromApi?.count || item.count,
      };
    });
  }, [perfumes, wishlistOverview?.topWishlistedPerfumes]);

  const searchAnalytics = useMemo(() => {
    const fallbackMost = [
      { query: "Sauvage", count: 1842 },
      { query: "Aventus", count: 1531 },
      { query: "Blue Hope", count: 1102 },
      { query: "Erba Pura", count: 832 },
    ];
    const fallbackNoResults = [
      "Tom Ford Noir",
      "Dior Homme Intense",
      "Amouage Interlude",
    ];

    return {
      mostSearched: (searchOverview?.topSearches?.length ? searchOverview.topSearches : fallbackMost).slice(0, 4),
      noResults: fallbackNoResults,
    };
  }, [searchOverview?.topSearches]);

  const activityFeed = useMemo(
    () => [
      {
        time: "14:02",
        title: 'User searched "Aventus"',
        icon: MagnifyingGlass,
        tone: "indigo",
      },
      {
        time: "13:58",
        title: 'Added Sauvage to wishlist',
        icon: Heart,
        tone: "rose",
      },
      {
        time: "13:44",
        title: "Completed Qoxunu test",
        icon: CheckCircle,
        tone: "emerald",
      },
      {
        time: "13:30",
        title: 'Visited "Blue Hope" page',
        icon: Eye,
        tone: "indigo",
      },
      {
        time: "13:21",
        title: "New account registered",
        icon: Users,
        tone: "zinc",
      },
    ],
    [],
  );

  const chartGeometry = useMemo(() => {
    const width = 760;
    const height = 260;
    const paddingX = 18;
    const paddingY = 18;
    const maxValue = Math.max(1, ...chartValues);
    const minValue = Math.min(0, ...chartValues);
    const range = Math.max(1, maxValue - minValue);
    const points = chartValues.map((value, index) => {
      const x = paddingX + (index * (width - paddingX * 2)) / Math.max(chartValues.length - 1, 1);
      const y = height - paddingY - ((value - minValue) / range) * (height - paddingY * 2);
      return { x, y, value };
    });
    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
    const areaPath =
      points.length > 1
        ? `${linePath} L ${(points[points.length - 1]?.x || width - paddingX).toFixed(2)} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`
        : "";
    return { width, height, paddingX, paddingY, maxValue, minValue, points, linePath, areaPath };
  }, [chartValues]);

  const rangeLabel = overviewRange === "today" ? "Today" : `${overviewRange} days`;
  const rangeButtons: Array<{ value: "today" | "7" | "30" | "90"; label: string }> = [
    { value: "today", label: "Today" },
    { value: "7", label: "7 days" },
    { value: "30", label: "30 days" },
    { value: "90", label: "90 days" },
  ];
  const trafficSegments = trafficSources.length ? trafficSources : [{ country: "Other", count: 1, tone: 0 }];
  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius;

  if (stats && !isLoading) {
    return (
      <div className="space-y-5">
        <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <h2 className="font-serif text-3xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-[2.3rem]">
                {copy.dashboard}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">{copy.realtimeAnalytics}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                      "h-11 rounded-full border px-4 text-sm font-medium transition",
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
            label={locale === "az" ? "Ziyarətçilər" : "Visitors"}
            value={formatCompactNumber(stats.uniqueVisitorsInRange || stats.uniqueVisitors)}
            change={locale === "az" ? "↑ 18% keçən dövrə görə" : "↑ 18% vs previous period"}
            points={(chartValues.length ? chartValues : [8, 12, 10, 14, 11]).map((value) => value + 2)}
          />
          <OverviewMetricCard
            label={locale === "az" ? "Aktiv istifadəçilər" : "Active users"}
            value={formatCompactNumber(liveStats?.live.currentLoggedIn ?? stats.onlineUsers)}
            change={locale === "az" ? "↑ 9% keçən dövrə görə" : "↑ 9% vs previous period"}
            points={(chartValues.length ? chartValues : [8, 12, 10, 14, 11]).map((value) => Math.max(1, Math.round(value * 0.4)))}
          />
          <OverviewMetricCard
            label={locale === "az" ? "Konversiya (sifariş)" : "Conversion"}
            value={formatPercent(stats.conversionRate)}
            change={locale === "az" ? "↑ 1.2% keçən dövrə görə" : "↑ 1.2% vs previous period"}
            points={(chartValues.length ? chartValues : [8, 12, 10, 14, 11]).map((value) => Math.max(1, Math.round(value * 0.12)))}
          />
          <OverviewMetricCard
            label={locale === "az" ? "Wishlists əlavə" : "Wishlist adds"}
            value={formatCompactNumber(wishlistOverview?.totalWishlistAdds ?? stats.usersWithWishlists ?? 0)}
            change={locale === "az" ? "↑ 22% keçən dövrə görə" : "↑ 22% vs previous period"}
            points={(chartValues.length ? chartValues : [8, 12, 10, 14, 11]).map((value) => Math.max(1, Math.round(value * 0.18)))}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.72fr)]">
          <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">{locale === "az" ? "Ziyarətçilər" : "Visitors"}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {locale === "az" ? "Seçilmiş dövrdə ziyarətçi axını" : "Visitor flow in the selected range"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  {locale === "az" ? "Ziyarətçilər" : "Visitors"}
                  <span className="text-zinc-400">▾</span>
                </button>
                {[TrendUp, Eye, Clock].map((Icon, index) => (
                  <button
                    key={index}
                    type="button"
                    className={cx(
                      "grid h-10 w-10 place-items-center rounded-[12px] border transition",
                      index === 2
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50",
                    )}
                  >
                    <Icon size={16} weight="bold" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-zinc-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFBFD_100%)] p-3">
              <div className="relative h-[320px] overflow-hidden rounded-[18px]">
                <svg viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`} className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                    const y = chartGeometry.paddingY + (chartGeometry.height - chartGeometry.paddingY * 2) * tick;
                    const value = Math.round(chartGeometry.maxValue * (1 - tick));
                    return (
                      <g key={tick}>
                        <line x1={0} y1={y} x2={chartGeometry.width} y2={y} stroke="#E9EAF3" strokeWidth="1" />
                        <text x="8" y={y - 6} fill="#A1A1AA" fontSize="11" fontWeight="500">
                          {formatCompactNumber(value)}
                        </text>
                      </g>
                    );
                  })}

                  {chartGeometry.areaPath ? <path d={chartGeometry.areaPath} fill="url(#lineFill)" /> : null}
                  <path d={chartGeometry.linePath} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {chartGeometry.points.map((point, index) => (
                    <g key={`${point.x}-${point.y}`}>
                      <circle cx={point.x} cy={point.y} r="3.5" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="2" />
                      <circle cx={point.x} cy={point.y} r="11" fill="transparent" className="cursor-pointer" opacity="0" />
                      <title>{`${chartRenderSeries[index]?.label || index + 1}: ${point.value.toLocaleString()}`}</title>
                    </g>
                  ))}
                </svg>

                <div className="absolute inset-x-0 bottom-2 flex items-end justify-between px-6 text-[11px] font-medium text-zinc-400">
                  {chartRenderSeries.map((point) => (
                    <span key={point.date}>{point.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">{locale === "az" ? "Traffic sources" : "Traffic sources"}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {locale === "az" ? "İstifadəçilərin gəldiyi ölkələr" : "Where visitors come from"}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                {locale === "az" ? "Ölkə" : "Country"}
                <span className="text-zinc-400">▾</span>
              </button>
            </div>

            <div className="mt-5 flex items-center gap-5">
              <div className="relative grid h-[168px] w-[168px] place-items-center">
                <svg viewBox="0 0 140 140" className="h-[168px] w-[168px]">
                  <circle cx="70" cy="70" r={donutRadius} fill="none" stroke="#E5E7EB" strokeWidth="16" />
                  {trafficSegments.map((item, index) => {
                    const percent = item.count / trafficTotal;
                    const dash = percent * donutCircumference;
                    const offset = trafficSegments.slice(0, index).reduce((sum, current) => sum + (current.count / trafficTotal) * donutCircumference, 0);
                    const stroke = ["#4F46E5", "#818CF8", "#A5B4FC", "#E4E4E7"][index % 4];
                    return (
                      <circle
                        key={item.country}
                        cx="70"
                        cy="70"
                        r={donutRadius}
                        fill="none"
                        stroke={stroke}
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${donutCircumference - dash}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 70 70)"
                      />
                    );
                  })}
                </svg>
                <div className="absolute text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    {locale === "az" ? "Top ölkə sayı" : "Top countries"}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-zinc-950">{trafficSegments.length.toLocaleString()}</p>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                {trafficSegments.map((item, index) => {
                  const percent = Math.round((item.count / trafficTotal) * 100);
                  return (
                    <div key={item.country} className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" style={{ opacity: 1 - index * 0.16 }} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700">{item.country}</span>
                      <span className="shrink-0 text-sm font-semibold text-zinc-950">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-500">
              {locale === "az" ? "Ümumi ölkə sayı" : "Total countries"}: {trafficSegments.length.toLocaleString()}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950">{locale === "az" ? "Canlı ziyarətçilər" : "Live visitors"}</h3>
              <span className="text-[11px] font-semibold text-zinc-400">
                {locale === "az" ? "12 onlayn" : `${formatCompactNumber(liveStats?.live.currentOnline ?? stats.onlineUsers)} online`}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {trafficSegments.slice(0, 4).map((item) => (
                <div key={item.country} className="flex items-center justify-between rounded-[16px] border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
                  <span className="text-sm text-zinc-700">{item.country}</span>
                  <span className="text-sm font-semibold text-zinc-950">{item.count}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 inline-flex h-10 w-full items-center justify-between rounded-[14px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <span>{locale === "az" ? "Canlı baxış" : "Live view"}</span>
              <span className="text-zinc-400">›</span>
            </button>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950">{locale === "az" ? "Ən çox baxılan ətirlər" : "Most viewed perfumes"}</h3>
              <span className="text-[11px] font-semibold text-indigo-600">{locale === "az" ? "Hamısını gör" : "See all"}</span>
            </div>
            <div className="mt-4 space-y-2">
              {mostViewedPerfumes.map((item, index) => (
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
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950">{locale === "az" ? "Wishlists əlavə edilənlər" : "Most added to wishlist"}</h3>
              <span className="text-[11px] font-semibold text-indigo-600">{locale === "az" ? "Hamısını gör" : "See all"}</span>
            </div>
            <div className="mt-4 space-y-2">
              {topWishlistedPerfumes.map((item, index) => (
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
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950">{locale === "az" ? "Axtarış analitikası" : "Search analytics"}</h3>
              <span className="text-[11px] font-semibold text-indigo-600">{locale === "az" ? "Hamısını gör" : "See all"}</span>
            </div>
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                {locale === "az" ? "Ən çox axtarılanlar" : "Most searched"}
              </p>
              <div className="mt-3 space-y-2">
                {searchAnalytics.mostSearched.map((item) => (
                  <div key={item.query} className="flex items-center justify-between rounded-[16px] border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
                    <span className="text-sm text-zinc-700">{item.query}</span>
                    <span className="text-sm font-semibold text-zinc-950">{formatCompactNumber(item.count)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600">
                {locale === "az" ? "Nəticə tapılmayan axtarışlar" : "No results searches"}
              </p>
              <div className="mt-3 space-y-2">
                {searchAnalytics.noResults.map((query) => (
                  <div key={query} className="rounded-[16px] border border-rose-100 bg-rose-50/80 px-3 py-2.5 text-sm text-rose-700">
                    {query}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">{locale === "az" ? "Son aktivliklər" : "Recent activity"}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {locale === "az" ? "Canlı istifadəçi hərəkətləri" : "What is happening right now"}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600">{locale === "az" ? "Hamısını gör" : "See all"}</span>
          </div>

          <div className="mt-4 divide-y divide-zinc-100">
            {activityFeed.map((item) => {
              const Icon = item.icon;
              return (
                <div key={`${item.time}-${item.title}`} className="flex items-center gap-4 py-3">
                  <span className="w-11 shrink-0 text-[11px] font-medium text-zinc-500">{item.time}</span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600">
                    <Icon size={16} weight="bold" />
                  </span>
                  <p className="min-w-0 flex-1 text-sm text-zinc-700">{item.title}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Date Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-500">Tarix:</span>
        {(["today", "thisMonth", "thisYear", "allTime"] as DateFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setDateFilter(filter);
              setStartDate("");
              setEndDate("");
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              dateFilter === filter
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {copy[filter as keyof typeof copy]}
          </button>
        ))}
        <button
          onClick={() => setDateFilter("custom")}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
            dateFilter === "custom"
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          {copy.custom}
        </button>

        {dateFilter === "custom" && (
          <div className="ml-auto flex gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 rounded border border-zinc-300 px-2 text-xs text-zinc-900 outline-none focus:border-zinc-500 focus:bg-white"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 rounded border border-zinc-300 px-2 text-xs text-zinc-900 outline-none focus:border-zinc-500 focus:bg-white"
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center">
          <p className="text-xs text-zinc-600">{copy.loadingStats}</p>
        </div>
      )}

      {/* Stats Grid */}
      {stats && !isLoading && (
        <div className="space-y-5">
          {/* Main Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <MetricCard
                icon={<Users size={16} weight="duotone" />}
                label={copy.totalUsers}
                value={stats.totalUsers.toLocaleString()}
                tone="sky"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <MetricCard
                icon={<Eye size={16} weight="duotone" />}
                label={copy.onlineUsers}
                value={stats.onlineUsers}
                tone="emerald"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <MetricCard
                icon={<EnvelopeOpen size={16} weight="duotone" />}
                label={copy.newsletterSubscribers}
                value={stats.newsletterSubscribed}
                tone="indigo"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <MetricCard
                icon={<Eye size={16} weight="duotone" />}
                label={copy.uniqueVisitors}
                value={stats.uniqueVisitors.toLocaleString()}
                tone="amber"
              />
            </div>
          </div>

          {/* User Engagement */}
          {stats.userEngagement !== undefined && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-[1.2rem] border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-600 font-medium">Engagement</p>
                <p className="mt-1 text-lg font-bold text-blue-900">{stats.userEngagement}%</p>
              </div>
              <div className="rounded-[1.2rem] border border-green-200 bg-green-50 p-3">
                <p className="text-xs text-green-600 font-medium">Comments</p>
                <p className="mt-1 text-lg font-bold text-green-900">{stats.usersWithComments || 0}</p>
              </div>
              <div className="rounded-[1.2rem] border border-purple-200 bg-purple-50 p-3">
                <p className="text-xs text-purple-600 font-medium">Wishlists</p>
                <p className="mt-1 text-lg font-bold text-purple-900">{stats.usersWithWishlists || 0}</p>
              </div>
              <div className="rounded-[1.2rem] border border-orange-200 bg-orange-50 p-3">
                <p className="text-xs text-orange-600 font-medium">Cart</p>
                <p className="mt-1 text-lg font-bold text-orange-900">{stats.usersWithCart || 0}</p>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <MetricCard
                icon={<Eye size={16} weight="duotone" />}
                label={copy.pageViews}
                value={stats.pageViews.toLocaleString()}
                tone="sky"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <MetricCard
                icon={<Clock size={16} weight="duotone" />}
                label={copy.avgSessionDuration}
                value={formatDuration(stats.avgSessionDuration)}
                tone="indigo"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <MetricCard
                icon={<Warning size={16} weight="duotone" />}
                label={copy.bounceRate}
                value={`${stats.bounceRate}%`}
                tone="rose"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <MetricCard
                icon={<TrendUp size={16} weight="duotone" />}
                label={copy.conversionRate}
                value={`${stats.conversionRate.toFixed(2)}%`}
                tone="emerald"
              />
            </div>
          </div>

          {/* Top Countries */}
          {stats.topCountries && stats.topCountries.length > 0 && (
            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Top Countries</h3>
              <div className="space-y-2">
                {stats.topCountries.map((item, idx) => (
                  <div key={item.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-600">{idx + 1}.</span>
                      <span className="text-sm font-medium text-zinc-900">{item.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-zinc-300" style={{ width: `${(item.count / (stats.topCountries?.[0]?.count || 1)) * 100}px` }} />
                      <span className="text-xs font-semibold text-zinc-600">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_48px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)] px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-zinc-200 bg-white text-zinc-700 shadow-sm">
                  <UserCircle size={19} weight="duotone" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-zinc-950">{copy.usersTitle}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {copy.usersSubtitle}: {usersMeta.total.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {copy.onlineNow}: {(users.length ? onlineUsersCount : usersMeta.online).toLocaleString()}
                </span>
                {usersMeta.generatedAt ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-500">
                    <Clock size={13} weight="bold" />
                    {copy.updated}: {formatDateTime(usersMeta.generatedAt)}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={openNewsletterPanel}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-100"
                >
                  <EnvelopeOpen size={14} weight="bold" />
                  {copy.newsletterButton}
                </button>
              </div>
            </div>

            {usersError && (
              <div className="m-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
                {usersError}
              </div>
            )}

            {isUsersLoading && (
              <div className="m-4 rounded-[16px] border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-xs font-medium text-zinc-500">
                {copy.loadingUsers}
              </div>
            )}

            {!isUsersLoading && users.length === 0 && (
              <div className="m-4 rounded-[16px] border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-xs font-medium text-zinc-500">
                {copy.noUsers}
              </div>
            )}

            {!isUsersLoading && users.length > 0 && (
              <div className="grid gap-0 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
                <div className="max-h-[520px] space-y-2 overflow-y-auto border-b border-zinc-100 bg-zinc-50/60 p-3 pr-2 lg:border-b-0 lg:border-r">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user.id)}
                      className={[
                        "group flex w-full items-start gap-3 rounded-[18px] border p-3 text-left transition duration-200",
                        selectedUserId === user.id
                          ? "border-zinc-900 bg-zinc-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]"
                          : "border-zinc-200 bg-white text-zinc-900 shadow-sm hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border text-xs font-bold uppercase",
                          selectedUserId === user.id
                            ? "border-white/15 bg-white/10 text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600",
                        ].join(" ")}
                      >
                        {user.email.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={[
                              "h-2 w-2 shrink-0 rounded-full",
                              user.is_online ? "bg-emerald-400" : selectedUserId === user.id ? "bg-white/35" : "bg-zinc-300",
                            ].join(" ")}
                          />
                          <p
                            className={[
                              "truncate text-xs font-semibold",
                              selectedUserId === user.id ? "text-white" : "text-zinc-950",
                            ].join(" ")}
                          >
                            {user.email}
                          </p>
                        </div>
                        <div
                          className={[
                            "mt-2 grid gap-1 text-[11px] leading-4",
                            selectedUserId === user.id ? "text-white/65" : "text-zinc-500",
                          ].join(" ")}
                        >
                          <p>{copy.lastSignIn}: {formatDateTime(user.last_sign_in_at)}</p>
                          <p>{copy.lastSeen}: {formatDateTime(user.last_seen_at)}</p>
                        </div>
                        {user.is_deleted && (
                          <span
                            className={[
                              "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              selectedUserId === user.id
                                ? "border-white/20 bg-white/10 text-white"
                                : "border-rose-200 bg-rose-50 text-rose-700",
                            ].join(" ")}
                          >
                            {copy.deleted}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="min-h-[520px] bg-white p-4 sm:p-5">
                  {selectedUser ? (
                    <div className="flex h-full min-h-0 flex-col gap-4">
                      <div className="rounded-[22px] border border-zinc-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)] p-4 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-zinc-200 bg-zinc-950 text-sm font-bold uppercase text-white shadow-sm">
                              {selectedUser.email.slice(0, 1)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-950">{selectedUser.email}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span
                                  className={[
                                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                    selectedUser.is_online
                                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                      : "border-zinc-200 bg-zinc-50 text-zinc-500",
                                  ].join(" ")}
                                >
                                  <span className={["h-1.5 w-1.5 rounded-full", selectedUser.is_online ? "bg-emerald-500" : "bg-zinc-300"].join(" ")} />
                                  {selectedUser.is_online ? copy.onlineUsers : copy.lastSeen}
                                </span>
                                {selectedUser.is_deleted ? (
                                  <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                                    {copy.deleted}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-3 grid gap-1 text-[11px] leading-5 text-zinc-500 sm:grid-cols-2">
                                <p>{copy.lastSignIn}: {formatDateTime(selectedUser.last_sign_in_at)}</p>
                                <p>{copy.lastSeen}: {formatDateTime(selectedUser.last_seen_at)}</p>
                              </div>
                            </div>
                          </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(selectedUser.id)}
                          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={selectedUser.is_deleted}
                        >
                          <Trash size={13} weight="bold" />
                          {copy.deleteUser}
                        </button>
                        </div>
                      </div>

                      <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-100 p-1">
                        {[
                          ["sessions", copy.viewSessions],
                          ["wishlist", copy.viewWishlist],
                          ["cart", copy.viewCart],
                        ].map(([tab, label]) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => handleChangeDetailTab(tab as "sessions" | "wishlist" | "cart")}
                            className={[
                              "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                              userDetailTab === tab
                                ? "bg-white text-zinc-950 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-900",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {sessionsError && (
                        <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                          {sessionsError}
                        </div>
                      )}

                      {userDetailTab === "sessions" ? (
                        <div className="min-h-0 flex-1 rounded-[22px] border border-zinc-200 bg-zinc-50/70 p-3">
                          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
                            <div>
                              <p className="text-xs font-semibold text-zinc-950">{copy.sessionsTitle}</p>
                              <p className="mt-1 text-[11px] text-zinc-500">{copy.sessionViewsHelp}</p>
                            </div>
                            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                              {copy.sessionsTitle}: {userSessions.length.toLocaleString()}
                            </span>
                          </div>

                          {isSessionsLoading && (
                            <div className="rounded-[16px] border border-zinc-200 bg-white px-4 py-6 text-center text-[11px] font-medium text-zinc-500">
                              {copy.loadingStats}
                            </div>
                          )}

                          {!isSessionsLoading && userSessions.length === 0 && (
                            <div className="rounded-[16px] border border-zinc-200 bg-white px-4 py-6 text-center text-[11px] font-medium text-zinc-500">
                              {copy.noSessions}
                            </div>
                          )}

                          {userSessions.length > 0 && (
                            <div className="max-h-[315px] space-y-2 overflow-y-auto pr-1">
                              {userSessions.map((session) => (
                                <div key={session.session_id} className="rounded-[16px] border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-zinc-950">
                                        {formatDateTime(session.last_seen)}
                                      </p>
                                      <p className="mt-1 truncate text-[11px] text-zinc-500">
                                        {session.device_type || "-"} · {session.browser || "-"} · {session.os || "-"}
                                      </p>
                                    </div>
                                    <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-zinc-500">
                                      {formatSessionViews(session.page_views)}
                                    </span>
                                  </div>
                                  <p className="mt-2 truncate rounded-[10px] bg-zinc-50 px-2 py-1.5 text-[11px] text-zinc-500">
                                    {session.path || "-"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {userDetailTab !== "sessions" ? (
                        <div className="min-h-0 flex-1 rounded-[22px] border border-zinc-200 bg-zinc-50/70 p-3">
                          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
                            <div>
                              <p className="text-xs font-semibold text-zinc-950">
                                {userDetailTab === "wishlist" ? copy.wishlistTitle : copy.cartTitle}
                              </p>
                              <p className="mt-1 text-[11px] text-zinc-500">
                                {formatItemCount(
                                  userDetailTab === "wishlist" ? userWishlist.length : userCart.length,
                                )}
                              </p>
                            </div>
                          </div>

                          {userItemsError && (
                            <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                              {userItemsError}
                            </div>
                          )}

                          {isUserItemsLoading && (
                            <div className="rounded-[16px] border border-zinc-200 bg-white px-4 py-6 text-center text-[11px] font-medium text-zinc-500">
                              {copy.loadingStats}
                            </div>
                          )}

                          {!isUserItemsLoading && userDetailTab === "wishlist" && userWishlist.length === 0 && (
                            <div className="rounded-[16px] border border-zinc-200 bg-white px-4 py-6 text-center text-[11px] font-medium text-zinc-500">
                              {copy.emptyWishlist}
                            </div>
                          )}

                          {!isUserItemsLoading && userDetailTab === "cart" && userCart.length === 0 && (
                            <div className="rounded-[16px] border border-zinc-200 bg-white px-4 py-6 text-center text-[11px] font-medium text-zinc-500">
                              {copy.emptyCart}
                            </div>
                          )}

                          {userDetailTab === "wishlist" && userWishlist.length > 0 && (
                            <div className="max-h-[315px] space-y-2 overflow-y-auto pr-1">
                              {userWishlist.map((item) => (
                                <div key={`${item.slug}-${item.created_at}`} className="rounded-[16px] border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300">
                                  <div className="flex items-center gap-3">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="h-12 w-12 rounded-[14px] border border-zinc-200 object-cover"
                                      />
                                    ) : (
                                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-zinc-200 bg-zinc-50 text-xs font-bold uppercase text-zinc-400">
                                        {item.name.slice(0, 1)}
                                      </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-semibold text-zinc-950">{item.name}</p>
                                      <p className="mt-1 truncate text-[11px] text-zinc-500">{item.brand}</p>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-medium text-zinc-400">
                                      {formatDateTime(item.created_at)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {userDetailTab === "cart" && userCart.length > 0 && (
                            <div className="max-h-[315px] space-y-2 overflow-y-auto pr-1">
                              {userCart.map((item) => (
                                <div key={`${item.slug}-${item.created_at}-${item.size_ml}`} className="rounded-[16px] border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300">
                                  <div className="flex items-center gap-3">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="h-12 w-12 rounded-[14px] border border-zinc-200 object-cover"
                                      />
                                    ) : (
                                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-zinc-200 bg-zinc-50 text-xs font-bold uppercase text-zinc-400">
                                        {item.name.slice(0, 1)}
                                      </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-semibold text-zinc-950">{item.name}</p>
                                      <p className="mt-1 truncate text-[11px] text-zinc-500">{item.brand}</p>
                                      <p className="mt-1 text-[11px] font-medium text-zinc-500">
                                        {item.size_ml} ml · x{item.quantity}
                                      </p>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-medium text-zinc-400">
                                      {formatDateTime(item.created_at)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[420px] items-center justify-center rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 text-[11px] font-medium text-zinc-500">
                      {copy.sessionsSubtitle}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {newsletterOpen && mounted ? createPortal(
        <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="flex h-[min(92dvh,900px)] w-[min(1180px,100%)] flex-col overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_26px_90px_rgba(2,6,23,0.28)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  {copy.newsletterButton}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-950">{copy.newsletterTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-500">{copy.newsletterSubtitle}</p>
              </div>
              <button
                type="button"
                aria-label={copy.close}
                className="grid h-9 w-9 place-items-center rounded-[10px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                onClick={() => setNewsletterOpen(false)}
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
              <div className="min-h-0 border-b border-zinc-100 bg-zinc-50/70 p-4 lg:border-b-0 lg:border-r">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <MiniMetric label={copy.subscribed} value={newsletterSubscribedCount} tone="emerald" />
                  <MiniMetric label={copy.unsubscribed} value={newsletterUnsubscribedCount} tone="rose" />
                </div>
                <p className="mb-3 rounded-[14px] border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  {copy.subscribedOnlyHint}
                </p>

                {newsletterError ? (
                  <div className="mb-3 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {newsletterError}
                  </div>
                ) : null}

                {newsletterStatus ? (
                  <div className="mb-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    {newsletterStatus}
                  </div>
                ) : null}

                <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                  {isNewsletterLoading ? (
                    <div className="rounded-[16px] border border-zinc-200 bg-white px-4 py-6 text-center text-xs font-medium text-zinc-500">
                      {copy.loadSubscribers}
                    </div>
                  ) : null}

                  {!isNewsletterLoading && newsletterSubscribers.length === 0 ? (
                    <div className="rounded-[16px] border border-zinc-200 bg-white px-4 py-6 text-center text-xs font-medium text-zinc-500">
                      {copy.noSubscribers}
                    </div>
                  ) : null}

                  {newsletterSubscribers.map((subscriber) => (
                    <div key={subscriber.email} className="rounded-[16px] border border-zinc-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-zinc-950">{subscriber.email}</p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {formatNewsletterSource(subscriber.source, locale)} · {subscriber.locale.toUpperCase()}
                          </p>
                        </div>
                        <span
                          className={[
                            "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold",
                            subscriber.status === "subscribed"
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-rose-100 bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {subscriber.status === "subscribed" ? copy.subscribed : copy.unsubscribed}
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] text-zinc-400">
                        {subscriber.status === "unsubscribed" && subscriber.unsubscribedAt
                          ? `${copy.unsubscribed}: ${formatDateTime(subscriber.unsubscribedAt)}`
                          : subscriber.createdAt
                            ? `${copy.updated}: ${formatDateTime(subscriber.createdAt)}`
                            : copy.newsletterButton}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
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
                          className={[
                            "inline-flex h-10 w-1/2 items-center justify-center gap-2 rounded-[12px] text-xs font-semibold transition",
                            newsletterTemplateMode === mode ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
                          ].join(" ")}
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
                          className={[
                            "inline-flex h-10 w-1/2 items-center justify-center rounded-[12px] text-xs font-semibold transition",
                            newsletterDeliveryMode === mode ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
                          ].join(" ")}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-600">{copy.emailSubject}</span>
                    <input
                      className="mt-2 h-11 w-full rounded-[14px] border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                      value={newsletterSubject}
                      onChange={(event) => setNewsletterSubject(event.target.value)}
                    />
                  </label>

                  {newsletterTemplateMode === "preset" ? (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-zinc-600">{copy.emailTitle}</span>
                        <input
                          className="mt-2 h-11 w-full rounded-[14px] border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                          value={newsletterTitle}
                          onChange={(event) => setNewsletterTitle(event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-zinc-600">{copy.emailBody}</span>
                        <textarea
                          rows={9}
                          className="mt-2 w-full resize-y rounded-[14px] border border-zinc-200 bg-white px-3 py-3 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                          value={newsletterBody}
                          onChange={(event) => setNewsletterBody(event.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-600">{copy.emailHtml}</span>
                      <textarea
                        rows={14}
                        spellCheck={false}
                        className="mt-2 w-full resize-y rounded-[14px] border border-zinc-200 bg-zinc-950 px-3 py-3 font-mono text-xs leading-6 text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                        value={newsletterHtml}
                        onChange={(event) => setNewsletterHtml(event.target.value)}
                      />
                    </label>
                  )}

                  <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
                      <div>
                        <p className="text-xs font-semibold text-zinc-950">{copy.emailPreview}</p>
                        <p className="mt-1 text-[11px] leading-5 text-zinc-500">{copy.emailPreviewHint}</p>
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
                        {newsletterTemplateMode === "custom" ? copy.customTemplate : copy.presetTemplate}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-[14px] border border-zinc-200 bg-white">
                      <iframe
                        title={copy.emailPreview}
                        sandbox=""
                        srcDoc={newsletterPreviewHtml}
                        className="h-[320px] w-full bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-zinc-500">
                      {copy.subscribed}: {newsletterSubscribedCount.toLocaleString()} · {copy.unsubscribed}: {newsletterUnsubscribedCount.toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleSendNewsletter()}
                      disabled={isNewsletterSending || newsletterSubscribedCount === 0}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-zinc-900 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PaperPlaneRight size={16} weight="bold" />
                      {isNewsletterSending ? copy.loadingStats : copy.sendNewsletter}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
