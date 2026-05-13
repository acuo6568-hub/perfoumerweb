"use client";

import {
  Users,
  Eye,
  EnvelopeOpen,
  Clock,
  Warning,
  TrendUp,
  TrendDown,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

type DateFilter = "today" | "thisMonth" | "thisYear" | "allTime" | "custom";
type AdminLocale = "az" | "en";

type Stats = {
  totalUsers: number;
  onlineUsers: number;
  onlineUsersInRange: number;
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
  activeUserDetails?: Array<{
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    country?: string;
    city?: string;
    has_comments: boolean;
    has_wishlist: boolean;
    has_cart: boolean;
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
  },
};
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

          {/* Active Users List */}
          {stats.activeUserDetails && stats.activeUserDetails.length > 0 && (
            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/50 p-4">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Active Users</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.activeUserDetails.map((user) => (
                  <div key={user.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-zinc-100 hover:border-zinc-200 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 truncate">{user.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.country && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{user.country}</span>}
                        {user.city && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">{user.city}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.has_comments && <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700">Comments</span>}
                        {user.has_wishlist && <span className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-700">Wishlist</span>}
                        {user.has_cart && <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-700">Cart</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString(locale === "az" ? "az-AZ" : "en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
