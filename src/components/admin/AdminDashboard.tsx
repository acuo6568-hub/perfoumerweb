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
  },
};

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;
type MetricProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "green" | "purple" | "amber" | "rose";
};

function Metric({ icon, label, value, color }: MetricProps) {
  const colors = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`${colors[color]} mt-0.5`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 font-medium">{label}</p>
        <p className="mt-1 text-sm sm:text-base font-bold text-zinc-900">{value}</p>
      </div>
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

      const response = await fetch(`/api/admin/stats?${params}`);
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
      const response = await fetch("/api/admin/users?perPage=60");
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
          if (!record?.user_id || !record.last_seen) {
            return;
          }

          setUsers((prev) =>
            prev.map((user) =>
              user.id === record.user_id
                ? {
                    ...user,
                    last_seen_at: record.last_seen,
                    is_online: Date.now() - new Date(record.last_seen).getTime() <= ONLINE_THRESHOLD_MS,
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
              <Metric
                icon={<Users size={16} weight="duotone" />}
                label={copy.totalUsers}
                value={stats.totalUsers.toLocaleString()}
                color="blue"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <Metric
                icon={<Eye size={16} weight="duotone" />}
                label={copy.onlineUsers}
                value={stats.onlineUsers}
                color="green"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <Metric
                icon={<EnvelopeOpen size={16} weight="duotone" />}
                label={copy.newsletterSubscribers}
                value={stats.newsletterSubscribed}
                color="purple"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <Metric
                icon={<Eye size={16} weight="duotone" />}
                label={copy.uniqueVisitors}
                value={stats.uniqueVisitors.toLocaleString()}
                color="amber"
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
              <Metric
                icon={<Eye size={16} weight="duotone" />}
                label={copy.pageViews}
                value={stats.pageViews.toLocaleString()}
                color="blue"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <Metric
                icon={<Clock size={16} weight="duotone" />}
                label={copy.avgSessionDuration}
                value={formatDuration(stats.avgSessionDuration)}
                color="purple"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <Metric
                icon={<Warning size={16} weight="duotone" />}
                label={copy.bounceRate}
                value={`${stats.bounceRate}%`}
                color="rose"
              />
            </div>

            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <Metric
                icon={<TrendUp size={16} weight="duotone" />}
                label={copy.conversionRate}
                value={`${stats.conversionRate.toFixed(2)}%`}
                color="green"
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
          <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <UserCircle size={16} weight="duotone" />
                  {copy.usersTitle}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {copy.usersSubtitle}: {usersMeta.total.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-zinc-500">
                {copy.onlineNow}: {(users.length ? onlineUsersCount : usersMeta.online).toLocaleString()}
              </p>
            </div>

            {usersError && (
              <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
                {usersError}
              </div>
            )}

            {isUsersLoading && (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white/70 p-3 text-xs text-zinc-600">
                {copy.loadingUsers}
              </div>
            )}

            {!isUsersLoading && users.length === 0 && (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white/70 p-3 text-xs text-zinc-600">
                {copy.noUsers}
              </div>
            )}

            {!isUsersLoading && users.length > 0 && (
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user.id)}
                      className={[
                        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
                        selectedUserId === user.id
                          ? "border-zinc-300 bg-white"
                          : "border-zinc-100 bg-white/70 hover:border-zinc-200",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          user.is_online ? "bg-emerald-500" : "bg-zinc-300",
                        ].join(" ")}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-zinc-900 truncate">{user.email}</p>
                          {user.is_deleted && (
                            <span className="text-[10px] rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                              {copy.deleted}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {copy.lastSignIn}: {formatDateTime(user.last_sign_in_at)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {copy.lastSeen}: {formatDateTime(user.last_seen_at)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white/80 p-4">
                  {selectedUser ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-zinc-900">{selectedUser.email}</p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {copy.lastSignIn}: {formatDateTime(selectedUser.last_sign_in_at)}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {copy.lastSeen}: {formatDateTime(selectedUser.last_seen_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(selectedUser.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                        >
                          <Trash size={12} weight="bold" />
                          {copy.deleteUser}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleChangeDetailTab("sessions")}
                          className={[
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                            userDetailTab === "sessions"
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                          ].join(" ")}
                        >
                          {copy.viewSessions}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeDetailTab("wishlist")}
                          className={[
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                            userDetailTab === "wishlist"
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                          ].join(" ")}
                        >
                          {copy.viewWishlist}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeDetailTab("cart")}
                          className={[
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                            userDetailTab === "cart"
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                          ].join(" ")}
                        >
                          {copy.viewCart}
                        </button>
                      </div>

                      {sessionsError && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
                          {sessionsError}
                        </div>
                      )}

                      {userDetailTab === "sessions" ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-zinc-900">{copy.sessionsTitle}</p>
                            <p className="text-[11px] text-zinc-500">{copy.sessionViewsHelp}</p>
                          </div>

                          {isSessionsLoading && (
                            <div className="rounded-lg border border-zinc-200 bg-white/70 p-2 text-[11px] text-zinc-600">
                              {copy.loadingStats}
                            </div>
                          )}

                          {!isSessionsLoading && userSessions.length === 0 && (
                            <div className="rounded-lg border border-zinc-200 bg-white/70 p-2 text-[11px] text-zinc-600">
                              {copy.noSessions}
                            </div>
                          )}

                          {userSessions.length > 0 && (
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                              {userSessions.map((session) => (
                                <div key={session.session_id} className="rounded-lg border border-zinc-100 bg-white p-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-zinc-800">
                                      {formatDateTime(session.last_seen)}
                                    </p>
                                    <span className="text-[10px] text-zinc-500">
                                      {formatSessionViews(session.page_views)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-zinc-500">
                                    {session.device_type} · {session.browser} · {session.os}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 truncate">{session.path}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : null}

                      {userDetailTab !== "sessions" ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-zinc-900">
                              {userDetailTab === "wishlist" ? copy.wishlistTitle : copy.cartTitle}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {formatItemCount(
                                userDetailTab === "wishlist" ? userWishlist.length : userCart.length,
                              )}
                            </p>
                          </div>

                          {userItemsError && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
                              {userItemsError}
                            </div>
                          )}

                          {isUserItemsLoading && (
                            <div className="rounded-lg border border-zinc-200 bg-white/70 p-2 text-[11px] text-zinc-600">
                              {copy.loadingStats}
                            </div>
                          )}

                          {!isUserItemsLoading && userDetailTab === "wishlist" && userWishlist.length === 0 && (
                            <div className="rounded-lg border border-zinc-200 bg-white/70 p-2 text-[11px] text-zinc-600">
                              {copy.emptyWishlist}
                            </div>
                          )}

                          {!isUserItemsLoading && userDetailTab === "cart" && userCart.length === 0 && (
                            <div className="rounded-lg border border-zinc-200 bg-white/70 p-2 text-[11px] text-zinc-600">
                              {copy.emptyCart}
                            </div>
                          )}

                          {userDetailTab === "wishlist" && userWishlist.length > 0 && (
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                              {userWishlist.map((item) => (
                                <div key={`${item.slug}-${item.created_at}`} className="rounded-lg border border-zinc-100 bg-white p-2">
                                  <div className="flex items-center gap-2">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="h-10 w-10 rounded-md border border-zinc-200 object-cover"
                                      />
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-semibold text-zinc-800 truncate">{item.name}</p>
                                      <p className="text-[11px] text-zinc-500 truncate">{item.brand}</p>
                                    </div>
                                    <span className="text-[10px] text-zinc-500">
                                      {formatDateTime(item.created_at)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {userDetailTab === "cart" && userCart.length > 0 && (
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                              {userCart.map((item) => (
                                <div key={`${item.slug}-${item.created_at}-${item.size_ml}`} className="rounded-lg border border-zinc-100 bg-white p-2">
                                  <div className="flex items-center gap-2">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="h-10 w-10 rounded-md border border-zinc-200 object-cover"
                                      />
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-semibold text-zinc-800 truncate">{item.name}</p>
                                      <p className="text-[11px] text-zinc-500 truncate">{item.brand}</p>
                                      <p className="text-[11px] text-zinc-500">
                                        {item.size_ml} ml · x{item.quantity}
                                      </p>
                                    </div>
                                    <span className="text-[10px] text-zinc-500">
                                      {formatDateTime(item.created_at)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-500">
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
