"use client";

import { useEffect, useMemo, useState } from "react";

type StatsPayload = {
  generatedAt: string;
  visitors: {
    totalUnique: number;
    todayUnique: number;
    totalRegisteredSeen: number;
  };
  live: {
    currentOnline: number;
    currentLikelyHumans: number;
    currentSuspectedBots: number;
    currentLoggedIn: number;
    currentGuests: number;
  };
  engagement: {
    totalSessions: number;
    totalEvents: number;
    totalPageViews: number;
  };
  topCountries: Array<{ country: string; visitors: number }>;
  liveCountries: Array<{ country: string; count: number }>;
  deviceLocationBreakdown: Array<{ deviceType: string; country: string; city: string; count: number }>;
  currentDeviceBreakdown: Record<string, number>;
  currentTopPaths: Array<{ path: string; count: number }>;
  currentUsers: Array<{
    sessionId: string;
    anonymousId: string;
    userId: string | null;
    isLoggedIn: boolean;
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
    lastSeen: string;
  }>;
};

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-[0_8px_20px_rgba(20,20,20,0.05)]">
      <p className="text-[0.72rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-zinc-900">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-zinc-500">{hint}</p> : null}
    </article>
  );
}

export function LiveStatsClient() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/analytics/live-stats", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as StatsPayload;
        if (mounted) {
          setStats(payload);
          setError("");
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load stats");
      }
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const deviceRows = useMemo(
    () => Object.entries(stats?.currentDeviceBreakdown || {}).sort((a, b) => b[1] - a[1]),
    [stats],
  );

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-900 px-5 py-4 text-white">
        <p className="text-sm">Live website analytics</p>
        <p className="mt-1 text-xs text-zinc-300">
          Updated: {stats?.generatedAt ? new Date(stats.generatedAt).toLocaleString() : "-"}
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Current online" value={stats?.live.currentOnline ?? 0} />
        <StatCard label="Likely humans" value={stats?.live.currentLikelyHumans ?? 0} />
        <StatCard label="Suspected bots" value={stats?.live.currentSuspectedBots ?? 0} />
        <StatCard label="Current logged in" value={stats?.live.currentLoggedIn ?? 0} />
        <StatCard label="Current guests" value={stats?.live.currentGuests ?? 0} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total unique visitors" value={stats?.visitors.totalUnique ?? 0} hint="All-time based on anonymous IDs" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today unique visitors" value={stats?.visitors.todayUnique ?? 0} />
        <StatCard label="Registered seen" value={stats?.visitors.totalRegisteredSeen ?? 0} />
        <StatCard label="Total sessions" value={stats?.engagement.totalSessions ?? 0} />
        <StatCard label="Tracked events" value={stats?.engagement.totalEvents ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <h2 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">Live device breakdown</h2>
          <div className="mt-3 space-y-2 text-sm">
            {deviceRows.length ? (
              deviceRows.map(([device, count]) => (
                <div key={device} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <span className="capitalize text-zinc-700">{device}</span>
                  <span className="font-medium text-zinc-900">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No live device data yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <h2 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">Top live paths</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(stats?.currentTopPaths || []).length ? (
              stats?.currentTopPaths.map((row) => (
                <div key={`${row.path}:${row.count}`} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <span className="truncate text-zinc-700">{row.path}</span>
                  <span className="ml-3 font-medium text-zinc-900">{row.count}</span>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No live paths yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <h2 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">Top countries by visitors</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(stats?.topCountries || []).length ? (
              stats?.topCountries.map((row) => (
                <div key={`${row.country}:${row.visitors}`} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <span className="truncate text-zinc-700">{row.country}</span>
                  <span className="ml-3 font-medium text-zinc-900">{row.visitors}</span>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No country data yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <h2 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">Current online by country</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(stats?.liveCountries || []).length ? (
              stats?.liveCountries.map((row) => (
                <div key={`${row.country}:${row.count}`} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <span className="truncate text-zinc-700">{row.country}</span>
                  <span className="ml-3 font-medium text-zinc-900">{row.count}</span>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No live country data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
        <h2 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">Device + location breakdown (live)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="px-2 py-2 font-medium">Device</th>
                <th className="px-2 py-2 font-medium">Country</th>
                <th className="px-2 py-2 font-medium">City</th>
                <th className="px-2 py-2 font-medium">Users</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.deviceLocationBreakdown || []).map((row) => (
                <tr key={`${row.deviceType}:${row.country}:${row.city}:${row.count}`} className="border-b border-zinc-100 text-zinc-700">
                  <td className="px-2 py-2 capitalize">{row.deviceType}</td>
                  <td className="px-2 py-2">{row.country}</td>
                  <td className="px-2 py-2">{row.city}</td>
                  <td className="px-2 py-2 font-medium text-zinc-900">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
        <h2 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">Current visitors</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Path</th>
                <th className="px-2 py-2 font-medium">Device</th>
                <th className="px-2 py-2 font-medium">Country</th>
                <th className="px-2 py-2 font-medium">Region</th>
                <th className="px-2 py-2 font-medium">City</th>
                <th className="px-2 py-2 font-medium">Browser</th>
                <th className="px-2 py-2 font-medium">OS</th>
                <th className="px-2 py-2 font-medium">Timezone</th>
                <th className="px-2 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.currentUsers || []).map((row) => (
                <tr key={row.sessionId} className="border-b border-zinc-100 text-zinc-700">
                  <td className="px-2 py-2">
                    {row.isSuspectedBot ? (
                      <span title={row.trafficReason || "Suspected automated traffic"} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Suspected bot</span>
                    ) : row.isLoggedIn ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Logged in</span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">Guest</span>
                    )}
                  </td>
                  <td className="max-w-[24rem] truncate px-2 py-2">{row.path}</td>
                  <td className="px-2 py-2 capitalize">{row.deviceType}</td>
                  <td className="px-2 py-2">{row.country || row.countryCode || "-"}</td>
                  <td className="px-2 py-2">{row.region || "-"}</td>
                  <td className="px-2 py-2">{row.city || "-"}</td>
                  <td className="px-2 py-2">{row.browser}</td>
                  <td className="px-2 py-2">{row.os}</td>
                  <td className="px-2 py-2">{row.timezone || "-"}</td>
                  <td className="px-2 py-2">{new Date(row.lastSeen).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
