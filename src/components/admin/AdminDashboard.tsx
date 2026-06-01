"use client";

import {
  Users,
  Eye,
  EnvelopeOpen,
  Clock,
  Warning,
  TrendUp,
  UserCircle,
  Trash,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

export function AdminDashboard({ locale = "en" }: { locale?: AdminLocale }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("allTime");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
  const supabase = getSupabaseBrowserClient();
  const copy = dashboardCopy[locale];

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

  useEffect(() => {
    if (dateFilter === "custom" && (!startDate || !endDate)) {
      return;
    }
    fetchStats(dateFilter, startDate, endDate);
  }, [dateFilter, startDate, endDate, fetchStats]);

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
    </div>
  );
}
