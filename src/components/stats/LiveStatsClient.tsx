"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ClockCounterClockwise,
  Compass,
  CursorClick,
  DeviceMobileCamera,
  Globe,
  ShoppingCart,
  SignIn,
  Target,
  TrendUp,
  UserCircle,
  Users,
} from "@phosphor-icons/react";

type StatsPayload = {
  generatedAt: string;
  accountResolution: {
    available: boolean;
    source: string;
  };
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
  acquisition: {
    topReferrers: Array<{ source: string; sessions: number; visitors: number }>;
    topCampaigns: Array<{ campaign: string; source: string; medium: string; sessions: number; pageViews: number }>;
    topLandingPages: Array<{ path: string; sessions: number; visitors: number }>;
  };
  audience: {
    topCountries: Array<{ country: string; count: number }>;
    recentCountries: Array<{ country: string; count: number }>;
    recentCities: Array<{ city: string; count: number }>;
    topDevices: Array<{ device: string; count: number }>;
    topBrowsers: Array<{ browser: string; count: number }>;
    topOs: Array<{ os: string; count: number }>;
    topTimezones: Array<{ timezone: string; count: number }>;
  };
  topPages: Array<{ path: string; pageViews: number; visitors: number }>;
  liveCountries: Array<{ country: string; count: number }>;
  deviceLocationBreakdown: Array<{ deviceType: string; country: string; city: string; count: number }>;
  currentDeviceBreakdown: Record<string, number>;
  currentTopPaths: Array<{ path: string; count: number }>;
  currentUsers: Array<{
    sessionId: string;
    anonymousId: string;
    userId: string | null;
    isLoggedIn: boolean;
    label: string;
    username: string;
    email: string;
    deviceType: string;
    browser: string;
    os: string;
    countryCode: string;
    country: string;
    region: string;
    city: string;
    timezone: string;
    isSuspectedBot: boolean;
    trafficReason: string;
    path: string;
    pathWithQuery: string;
    referrerHost: string;
    referrer: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmContent: string;
    utmTerm: string;
    pageViews: number;
    firstSeen: string;
    lastSeen: string;
    signals: {
      ordersCount: number;
      completedOrders: number;
      totalRevenue: number;
      wishlistItems: number;
      cartItems: number;
      commentsCount: number;
      lastOrderAt: string;
    };
  }>;
  marketing: {
    strongestMarket: string;
    topSource: string;
    topCampaign: string;
  };
};

type TrendMetric = "visitors" | "pageViews" | "sessions" | "loggedInSessions";

const trendMetricCopy: Record<TrendMetric, { label: string; accent: string }> = {
  visitors: { label: "Visitors", accent: "from-cyan-400 to-sky-500" },
  pageViews: { label: "Page views", accent: "from-emerald-400 to-teal-500" },
  sessions: { label: "Sessions", accent: "from-amber-300 to-orange-500" },
  loggedInSessions: { label: "Logged-in sessions", accent: "from-fuchsia-400 to-pink-500" },
};

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "AZN",
  maximumFractionDigits: 0,
});

function formatNumber(value: number) {
  return numberFormatter.format(Math.round(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value || 0);
}

function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "-";

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function TrendChart({
  points,
  metric,
  onMetricChange,
}: {
  points: StatsPayload["trends"];
  metric: TrendMetric;
  onMetricChange: (metric: TrendMetric) => void;
}) {
  const values = points.map((point) => point[metric]);
  const maxValue = Math.max(...values, 1);
  const latest = values.at(-1) || 0;
  const previous = values.at(-2) || 0;
  const delta = latest - previous;
  const deltaLabel = `${delta >= 0 ? "+" : ""}${formatNumber(delta)}`;

  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 56 - (point[metric] / maxValue) * 46;
    return `${x},${y}`;
  });

  const linePath = chartPoints.join(" ");
  const areaPath = `M ${chartPoints[0]} L ${chartPoints.slice(1).join(" L ")} L 100,56 L 0,56 Z`;
  const accent = trendMetricCopy[metric].accent;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#090d14] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Trend</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Traffic in the last 7 days</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Switch the metric to see which traffic pattern is worth pushing harder with ads.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(trendMetricCopy) as TrendMetric[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onMetricChange(option)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                option === metric
                  ? "border-white/15 bg-white text-zinc-950"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/8",
              ].join(" ")}
            >
              {trendMetricCopy[option].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(24,120,255,0.18),_transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">{trendMetricCopy[metric].label}</p>
              <p className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-white">{formatNumber(latest)}</p>
            </div>
            <div className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {deltaLabel} vs previous day
            </div>
          </div>

          <svg viewBox="0 0 100 60" className="h-56 w-full">
            <defs>
              <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(56,189,248,0.45)" />
                <stop offset="100%" stopColor="rgba(56,189,248,0.03)" />
              </linearGradient>
            </defs>

            {[14, 28, 42, 56].map((line) => (
              <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
            ))}

            <path d={areaPath} fill="url(#trendArea)" />
            <polyline fill="none" stroke="rgb(96 165 250)" strokeWidth="1.8" points={linePath} />

            {points.map((point, index) => {
              const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
              const y = 56 - (point[metric] / maxValue) * 46;

              return (
                <g key={point.date}>
                  <circle cx={x} cy={y} r="1.4" fill="white" />
                  <text x={x} y="59.5" fill="rgba(255,255,255,0.55)" fontSize="3" textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}>
                    {point.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="grid gap-3">
          {points.slice(-3).reverse().map((point) => (
            <div key={point.date} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{point.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{point.date}</p>
                </div>
                <div className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${accent}`}>
                  {formatNumber(point[metric])}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
                  Visitors
                  <div className="mt-1 text-sm font-semibold text-white">{formatNumber(point.visitors)}</div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
                  Page views
                  <div className="mt-1 text-sm font-semibold text-white">{formatNumber(point.pageViews)}</div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
                  Sessions
                  <div className="mt-1 text-sm font-semibold text-white">{formatNumber(point.sessions)}</div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
                  Logged in
                  <div className="mt-1 text-sm font-semibold text-white">{formatNumber(point.loggedInSessions)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-zinc-400">{icon}</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
          Live
        </span>
      </div>
      <p className="mt-5 text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{hint}</p>
    </article>
  );
}

function RankedList({
  title,
  subtitle,
  rows,
  valueLabel,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: number; meta?: string }>;
  valueLabel: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        </div>
        <span className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{valueLabel}</span>
      </div>

      <div className="mt-5 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={`${title}:${row.label}`} className="rounded-[1.3rem] border border-white/6 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{row.label}</p>
                  {row.meta ? <p className="mt-1 truncate text-xs text-zinc-500">{row.meta}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatNumber(row.value)}</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500" style={{ width: `${(row.value / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-[1.3rem] border border-dashed border-white/8 bg-white/[0.02] px-4 py-5 text-sm text-zinc-500">
            No data yet.
          </p>
        )}
      </div>
    </div>
  );
}

export function LiveStatsClient() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<TrendMetric>("visitors");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/analytics/live-stats", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as StatsPayload;
        if (!mounted) return;

        setStats(payload);
        setError("");
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load stats");
      }
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, 300000);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const deviceRows = useMemo(
    () =>
      Object.entries(stats?.currentDeviceBreakdown || {})
        .sort((a, b) => b[1] - a[1])
        .map(([device, count]) => ({ label: device, value: count })),
    [stats],
  );

  const identifiedUsers = useMemo(
    () =>
      (stats?.currentUsers || [])
        .filter((user) => user.isLoggedIn && !user.isSuspectedBot)
        .sort((a, b) => {
          const signalA = a.signals.ordersCount + a.signals.cartItems + a.signals.wishlistItems;
          const signalB = b.signals.ordersCount + b.signals.cartItems + b.signals.wishlistItems;
          return signalB - signalA;
        })
        .slice(0, 8),
    [stats],
  );

  return (
    <section className="space-y-6 text-white">
      <div className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_70%_20%,_rgba(52,211,153,0.14),_transparent_24%),linear-gradient(180deg,#070b11_0%,#0a0f17_100%)] px-5 py-6 shadow-[0_30px_120px_rgba(0,0,0,0.38)] sm:px-7 sm:py-7">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06),_transparent_60%)] opacity-70" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Advertising dashboard</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-none tracking-[-0.05em] text-white sm:text-[3.6rem]">
              See who is here, what brought them in, and who is worth retargeting.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              This view blends live traffic, audience quality, acquisition sources, and identified account activity so you can decide where to spend ad money faster.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                {stats?.live.currentLikelyHumans ?? 0} likely humans live
              </span>
              <span className="rounded-full border border-sky-400/15 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-300">
                Top source: {stats?.marketing.topSource || "-"}
              </span>
              <span className="rounded-full border border-fuchsia-400/15 bg-fuchsia-400/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-300">
                Strongest market: {stats?.marketing.strongestMarket || "-"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
            <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">Last refresh</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {stats?.generatedAt ? new Date(stats.generatedAt).toLocaleString() : "-"}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">Identity enrichment</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {stats?.accountResolution.available ? "Email, username, and order signals are available." : "Only session and user IDs are available."}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {stats?.accountResolution.available
                  ? "Current signed-in visitors are being matched against Supabase account activity."
                  : "Add `SUPABASE_SERVICE_ROLE_KEY` if you want account names, orders, cart, wishlist, and comment signals in this table."}
              </p>
            </div>

            {error ? (
              <div className="rounded-[1.4rem] border border-red-400/15 bg-red-500/10 p-4 text-sm text-red-200">
                Couldn&apos;t refresh analytics: {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          icon={<Users size={22} weight="duotone" />}
          label="Current online"
          value={formatNumber(stats?.live.currentOnline ?? 0)}
          hint="All active sessions seen in the last 2 minutes."
        />
        <MetricCard
          icon={<SignIn size={22} weight="duotone" />}
          label="Logged-in right now"
          value={formatNumber(stats?.live.currentLoggedIn ?? 0)}
          hint="Best current pool for account-based retargeting."
        />
        <MetricCard
          icon={<Target size={22} weight="duotone" />}
          label="Retargetable now"
          value={formatNumber(stats?.live.retargetableNow ?? 0)}
          hint="Logged-in or high-intent sessions on cart, checkout, wishlist, or deeper browsing."
        />
        <MetricCard
          icon={<ClockCounterClockwise size={22} weight="duotone" />}
          label="Returning visitors"
          value={formatNumber(stats?.visitors.returningUnique ?? 0)}
          hint="People who have shown up across multiple sessions."
        />
        <MetricCard
          icon={<CursorClick size={22} weight="duotone" />}
          label="Avg pages / session"
          value={`${(stats?.engagement.avgPageViewsPerSession ?? 0).toFixed(1)}`}
          hint="Higher depth usually means stronger intent before you scale spend."
        />
        <MetricCard
          icon={<TrendUp size={22} weight="duotone" />}
          label="Single-page sessions"
          value={formatPercent(stats?.engagement.singlePageSessionRate ?? 0)}
          hint="A rough bounce proxy from sessions that never moved past one page."
        />
      </div>

      <TrendChart points={stats?.trends || []} metric={metric} onMetricChange={setMetric} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4 lg:grid-cols-3">
          <RankedList
            title="Top referrers"
            subtitle="Best external traffic sources in the last 7 days."
            rows={(stats?.acquisition.topReferrers || []).map((row) => ({
              label: row.source,
              value: row.sessions,
              meta: `${formatNumber(row.visitors)} visitors`,
            }))}
            valueLabel="Sessions"
          />
          <RankedList
            title="Tagged campaigns"
            subtitle="UTM campaigns with enough traffic to compare."
            rows={(stats?.acquisition.topCampaigns || []).map((row) => ({
              label: row.campaign,
              value: row.sessions,
              meta: `${row.source} / ${row.medium} · ${formatNumber(row.pageViews)} page views`,
            }))}
            valueLabel="Sessions"
          />
          <RankedList
            title="Landing pages"
            subtitle="Where sessions begin before they explore further."
            rows={(stats?.acquisition.topLandingPages || []).map((row) => ({
              label: row.path,
              value: row.sessions,
              meta: `${formatNumber(row.visitors)} visitors`,
            }))}
            valueLabel="Sessions"
          />
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Ad readout</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">What to watch before spending more</h3>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3 text-sky-300">
                <Compass size={18} weight="duotone" />
                <p className="text-sm font-semibold text-white">Acquisition leader</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {stats?.marketing.topSource
                  ? `${stats.marketing.topSource} is currently your strongest source. If that traffic converts well, mirror its creative angle in paid campaigns.`
                  : "There is not enough source data yet. Start tagging campaign links with UTMs so this panel becomes more actionable."}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3 text-emerald-300">
                <Globe size={18} weight="duotone" />
                <p className="text-sm font-semibold text-white">Best geo right now</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {stats?.marketing.strongestMarket
                  ? `${stats.marketing.strongestMarket} is currently leading. That is usually the first geography worth prioritizing for localized ad copy and budget tests.`
                  : "No clear country winner yet."}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3 text-fuchsia-300">
                <ShoppingCart size={18} weight="duotone" />
                <p className="text-sm font-semibold text-white">Retargeting window</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {stats
                  ? `${formatNumber(stats.live.retargetableNow)} live sessions look retargetable now, and ${formatPercent(stats.engagement.loggedInRate)} of all known visitors have logged in before.`
                  : "Waiting for traffic data."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <RankedList
          title="Top countries"
          subtitle="Unique visitors by country."
          rows={(stats?.audience.topCountries || []).map((row) => ({ label: row.country, value: row.count }))}
          valueLabel="Visitors"
        />
        <RankedList
          title="Devices"
          subtitle="Session mix in the recent 7-day window."
          rows={(stats?.audience.topDevices || []).map((row) => ({ label: row.device, value: row.count }))}
          valueLabel="Sessions"
        />
        <RankedList
          title="Browsers"
          subtitle="Useful for QA and creative rendering confidence."
          rows={(stats?.audience.topBrowsers || []).map((row) => ({ label: row.browser, value: row.count }))}
          valueLabel="Sessions"
        />
        <RankedList
          title="Timezones"
          subtitle="Helpful for ad scheduling and send-time experiments."
          rows={(stats?.audience.topTimezones || []).map((row) => ({ label: row.timezone, value: row.count }))}
          valueLabel="Sessions"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Current identified users</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Who is logged in right now</h3>
              <p className="mt-1 text-sm text-zinc-400">
                This section is the most useful for high-intent retargeting and customer-aware campaigns.
              </p>
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-zinc-400">
              {formatNumber(identifiedUsers.length)} visible
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {identifiedUsers.length ? (
              identifiedUsers.map((user) => (
                <article key={user.sessionId} className="rounded-[1.5rem] border border-white/8 bg-[#0a0f16] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full border border-sky-400/15 bg-sky-400/10 p-2 text-sky-300">
                          <UserCircle size={20} weight="duotone" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-white">{user.label}</p>
                          <p className="text-sm text-zinc-500">{user.email || user.userId || "Signed-in visitor"}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          {user.country}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300">
                          {user.deviceType} · {user.browser}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300">
                          {user.path}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 sm:grid-cols-4">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        Orders
                        <div className="mt-1 text-sm font-semibold text-white">{formatNumber(user.signals.ordersCount)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        Cart
                        <div className="mt-1 text-sm font-semibold text-white">{formatNumber(user.signals.cartItems)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        Wishlist
                        <div className="mt-1 text-sm font-semibold text-white">{formatNumber(user.signals.wishlistItems)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        Revenue
                        <div className="mt-1 text-sm font-semibold text-white">{formatCurrency(user.signals.totalRevenue)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-2">
                      Source
                      <div className="mt-1 text-sm font-medium text-white">{user.referrerHost || "Direct"}</div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-2">
                      Campaign
                      <div className="mt-1 truncate text-sm font-medium text-white">{user.utmCampaign || "-"}</div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-2">
                      Page views
                      <div className="mt-1 text-sm font-medium text-white">{formatNumber(user.pageViews)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-2">
                      Last seen
                      <div className="mt-1 text-sm font-medium text-white">{timeAgo(user.lastSeen)}</div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[1.5rem] border border-dashed border-white/8 bg-white/[0.02] px-4 py-6 text-sm text-zinc-500">
                No signed-in users are live right now.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <RankedList
            title="Live pages"
            subtitle="Where your active audience is right now."
            rows={(stats?.currentTopPaths || []).map((row) => ({ label: row.path, value: row.count }))}
            valueLabel="Live"
          />
          <RankedList
            title="Live countries"
            subtitle="Current live audience by country."
            rows={(stats?.liveCountries || []).map((row) => ({ label: row.country, value: row.count }))}
            valueLabel="Live"
          />
          <RankedList
            title="Live devices"
            subtitle="Current device mix from active human sessions."
            rows={deviceRows}
            valueLabel="Live"
          />
        </div>
      </div>

      <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Audience detail</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Live session feed</h3>
            <p className="mt-1 text-sm text-zinc-400">
              This includes guests, logged-in users, and suspicious traffic so you can spot quality problems quickly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-300">
              {formatNumber(stats?.live.currentGuests ?? 0)} guests
            </span>
            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
              {formatNumber(stats?.live.currentLoggedIn ?? 0)} logged in
            </span>
            <span className="rounded-full border border-amber-400/15 bg-amber-400/10 px-3 py-1.5 text-amber-300">
              {formatNumber(stats?.live.currentSuspectedBots ?? 0)} suspected bots
            </span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500">
                <th className="px-3 py-3 font-medium">Identity</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Current page</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Geo</th>
                <th className="px-3 py-3 font-medium">Device</th>
                <th className="px-3 py-3 font-medium">Signals</th>
                <th className="px-3 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.currentUsers || []).map((user) => (
                <tr key={user.sessionId} className="border-b border-white/6 align-top text-zinc-300">
                  <td className="px-3 py-3">
                    <p className="font-medium text-white">{user.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">{user.email || user.userId || user.anonymousId}</p>
                  </td>
                  <td className="px-3 py-3">
                    {user.isSuspectedBot ? (
                      <span className="rounded-full border border-amber-400/15 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                        Suspected bot
                      </span>
                    ) : user.isLoggedIn ? (
                      <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                        Logged in
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-zinc-300">
                        Guest
                      </span>
                    )}
                    {user.trafficReason ? <p className="mt-2 text-xs text-amber-200">{user.trafficReason}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    <p className="max-w-[18rem] truncate font-medium text-white">{user.pathWithQuery}</p>
                    {user.utmCampaign ? <p className="mt-1 text-xs text-fuchsia-300">UTM: {user.utmCampaign}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    <p>{user.referrerHost || "Direct"}</p>
                    {(user.utmSource || user.utmMedium) ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {user.utmSource || "unknown"} / {user.utmMedium || "unknown"}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <p>{user.country}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {user.city}
                      {user.timezone ? ` · ${user.timezone}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="capitalize">{user.deviceType}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {user.browser} · {user.os}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs text-zinc-400">
                      {user.pageViews} page views
                      {user.signals.ordersCount ? ` · ${user.signals.ordersCount} orders` : ""}
                      {user.signals.cartItems ? ` · ${user.signals.cartItems} cart` : ""}
                      {user.signals.wishlistItems ? ` · ${user.signals.wishlistItems} wishlist` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{timeAgo(user.lastSeen)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString() : "-"}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <RankedList
          title="Recent top pages"
          subtitle="Most viewed pages across the recent 7-day window."
          rows={(stats?.topPages || []).map((row) => ({
            label: row.path,
            value: row.pageViews,
            meta: `${formatNumber(row.visitors)} visitors`,
          }))}
          valueLabel="Views"
        />
        <RankedList
          title="Cities"
          subtitle="Recent session locations."
          rows={(stats?.audience.recentCities || []).map((row) => ({ label: row.city, value: row.count }))}
          valueLabel="Sessions"
        />
        <RankedList
          title="OS mix"
          subtitle="Useful for device targeting and QA sanity."
          rows={(stats?.audience.topOs || []).map((row) => ({ label: row.os, value: row.count }))}
          valueLabel="Sessions"
        />
      </div>

      <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-sky-400/15 bg-sky-400/10 p-2 text-sky-300">
            <DeviceMobileCamera size={18} weight="duotone" />
          </div>
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Live device + location map</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Where live traffic is concentrated</h3>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500">
                <th className="px-3 py-3 font-medium">Device</th>
                <th className="px-3 py-3 font-medium">Country</th>
                <th className="px-3 py-3 font-medium">City</th>
                <th className="px-3 py-3 font-medium">Live users</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.deviceLocationBreakdown || []).map((row) => (
                <tr key={`${row.deviceType}:${row.country}:${row.city}:${row.count}`} className="border-b border-white/6 text-zinc-300">
                  <td className="px-3 py-3 capitalize text-white">{row.deviceType}</td>
                  <td className="px-3 py-3">{row.country}</td>
                  <td className="px-3 py-3">{row.city}</td>
                  <td className="px-3 py-3 font-semibold text-white">{formatNumber(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
