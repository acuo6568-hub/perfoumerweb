"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Clock, MagnifyingGlass, Sparkle, UserCircle, Users } from "@phosphor-icons/react";

type AdminLocale = "az" | "en";

type QoxunuLog = {
  id: string;
  userId: string | null;
  anonymousId: string;
  isSignedIn: boolean;
  isGuest: boolean;
  email: string;
  username: string;
  locale: string;
  pagePath: string;
  freeText: string;
  answers: Record<string, string>;
  recommendations: Array<{ slug: string; name: string; brand: string; minPrice: number }>;
  summary: string;
  usedFallback: boolean;
  warning: string;
  deviceType: string;
  browser: string;
  os: string;
  userAgent: string;
  countryCode: string;
  country: string;
  region: string;
  city: string;
  timezone: string;
  createdAt: string;
};

type QoxunuLogsResponse = {
  generatedAt: string;
  totalLogs: number;
  guestLogs: number;
  signedInLogs: number;
  topCountries: Array<{ country: string; count: number }>;
  logs: QoxunuLog[];
};

const copy = {
  az: {
    title: "Qoxunu logları",
    description: "Qoxunu testini tamamlayan istifadəçiləri, guest və giriş etmiş halları, məkanı, vaxtı və nəticələri izləyin.",
    refresh: "Yenilə",
    loading: "Qoxunu logları yüklənir...",
    empty: "Hələ Qoxunu logu yoxdur.",
    search: "Log axtar...",
    all: "Hamısı",
    guest: "Guest",
    signedIn: "Giriş etmiş",
    total: "Cəmi nəticə",
    guestCount: "Guest nəticələr",
    signedInCount: "Giriş etmiş nəticələr",
    topCountries: "Top ölkə",
    details: "Detallar",
    identity: "İdentiklik",
    location: "Location",
    answers: "İstifadəçi cavabları",
    system: "Sistemin nəticəsi",
    input: "İstifadəçi girişi",
    recommendations: "Tövsiyə olunan ətirlər",
    generatedAt: "Yaradılma vaxtı",
    guestBadge: "Guest",
    signedInBadge: "Giriş etmiş",
    fallbackUsed: "Fallback istifadə edilib",
    warning: "Xəbərdarlıq",
    session: "Sessiya",
    language: "Dil",
  },
  en: {
    title: "Qoxunu logs",
    description: "Track who completed the scent quiz, whether they were a guest or signed in, their location, time, inputs, and final system results.",
    refresh: "Refresh",
    loading: "Loading Qoxunu logs...",
    empty: "No Qoxunu logs yet.",
    search: "Search logs...",
    all: "All",
    guest: "Guest",
    signedIn: "Signed in",
    total: "Total results",
    guestCount: "Guest results",
    signedInCount: "Signed-in results",
    topCountries: "Top country",
    details: "Details",
    identity: "Identity",
    location: "Location",
    answers: "User answers",
    system: "System result",
    input: "User input",
    recommendations: "Recommended perfumes",
    generatedAt: "Generated at",
    guestBadge: "Guest",
    signedInBadge: "Signed in",
    fallbackUsed: "Fallback used",
    warning: "Warning",
    session: "Session",
    language: "Language",
  },
} satisfies Record<AdminLocale, Record<string, string>>;

const answerLabels = {
  az: {
    gender: "Cins",
    vibe: "Ab-hava",
    occasion: "İstifadə yeri",
    intensity: "Güc",
    projection: "Yayılma",
    sweetness: "Şirinlik",
    profile: "Qoxu tipi",
    budget: "Büdcə",
    season: "Mövsüm",
    longevity: "Qalıcılıq",
  },
  en: {
    gender: "Gender",
    vibe: "Vibe",
    occasion: "Occasion",
    intensity: "Intensity",
    projection: "Projection",
    sweetness: "Sweetness",
    profile: "Profile",
    budget: "Budget",
    season: "Season",
    longevity: "Longevity",
  },
} satisfies Record<AdminLocale, Record<string, string>>;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
}

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-zinc-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-zinc-500">{icon}</div>
        <div>
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-zinc-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function QoxunuInsights({ locale = "en" }: { locale?: AdminLocale }) {
  const copyText = copy[locale];
  const labels = answerLabels[locale];
  const [data, setData] = useState<QoxunuLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [filter, setFilter] = useState<"all" | "guest" | "signedIn">("all");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/qoxunu-logs?limit=100", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch Qoxunu logs");
      }

      const payload = (await response.json()) as QoxunuLogsResponse;
      setData(payload);
      setSelectedLogId((current) => current ?? payload.logs[0]?.id ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch Qoxunu logs");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const logs = data?.logs ?? [];
    return logs.filter((log) => {
      const haystack = [
        log.email,
        log.username,
        log.anonymousId,
        log.country,
        log.region,
        log.city,
        log.locale,
        log.pagePath,
        log.freeText,
        log.summary,
        JSON.stringify(log.answers),
        JSON.stringify(log.recommendations),
      ]
        .join(" ")
        .toLowerCase();

      const searchMatch = deferredSearch ? haystack.includes(deferredSearch) : true;
      const filterMatch = filter === "all" ? true : filter === "guest" ? log.isGuest : log.isSignedIn;

      return searchMatch && filterMatch;
    });
  }, [data?.logs, deferredSearch, filter]);

  const selectedLog = useMemo(
    () => filteredLogs.find((log) => log.id === selectedLogId) ?? filteredLogs[0] ?? null,
    [filteredLogs, selectedLogId],
  );

  useEffect(() => {
    if (!filteredLogs.length) {
      setSelectedLogId(null);
      return;
    }

    if (!selectedLog || !filteredLogs.some((log) => log.id === selectedLogId)) {
      setSelectedLogId(filteredLogs[0]?.id ?? null);
    }
  }, [filteredLogs, selectedLog, selectedLogId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <Sparkle size={14} weight="bold" />
            {copyText.title}
          </div>
          <h2 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.05em] text-zinc-950">{copyText.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{copyText.description}</p>
        </div>

        <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50" onClick={() => void fetchLogs()}>
          <Clock size={16} weight="bold" />
          {copyText.refresh}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={copyText.total} value={data?.totalLogs ?? 0} icon={<Users size={18} weight="bold" />} />
        <MetricCard label={copyText.guestCount} value={data?.guestLogs ?? 0} icon={<UserCircle size={18} weight="bold" />} />
        <MetricCard label={copyText.signedInCount} value={data?.signedInLogs ?? 0} icon={<Users size={18} weight="bold" />} />
        <MetricCard label={copyText.topCountries} value={data?.topCountries?.[0] ? `${data.topCountries[0].country} (${data.topCountries[0].count})` : "-"} icon={<Clock size={18} weight="bold" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4">
          <label className="relative block">
            <span className="sr-only">{copyText.search}</span>
            <MagnifyingGlass size={16} weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input className="h-11 w-full rounded-2xl border border-zinc-300 bg-[#f7f7f5] px-4 pl-11 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:bg-white" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copyText.search} />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {([
              ["all", copyText.all],
              ["guest", copyText.guest],
              ["signedIn", copyText.signedIn],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  filter === value
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 min-h-[28rem] space-y-2 overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-zinc-50/80 p-2">
            <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              <span>{copyText.details}</span>
              <span>{filteredLogs.length}</span>
            </div>

            <div className="h-[min(56vh,36rem)] space-y-2 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="px-3 py-3 text-sm text-zinc-500">{copyText.loading}</div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</div>
              ) : filteredLogs.length ? (
                filteredLogs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    className={cx(
                      "w-full rounded-2xl border px-3 py-3 text-left transition",
                      selectedLog?.id === log.id
                        ? "border-zinc-900 bg-white shadow-[0_12px_26px_rgba(0,0,0,0.06)]"
                        : "border-zinc-200 bg-white/80 hover:border-zinc-300 hover:bg-white",
                    )}
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          {log.isSignedIn ? log.email || log.username || log.anonymousId : log.anonymousId}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{log.country || log.countryCode || "Unknown"} • {formatDateTime(log.createdAt)}</p>
                      </div>
                      <span className={cx("rounded-full px-2 py-1 text-[11px] font-semibold", log.isGuest ? "bg-zinc-100 text-zinc-700" : "bg-zinc-900 text-white")}>
                        {log.isGuest ? copyText.guestBadge : copyText.signedInBadge}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{log.summary || log.freeText || "-"}</p>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-zinc-500">{copyText.empty}</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_40px_rgba(17,24,39,0.06)]">
          {selectedLog ? (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-semibold", selectedLog.isGuest ? "bg-zinc-100 text-zinc-700" : "bg-zinc-900 text-white")}>
                    {selectedLog.isGuest ? copyText.guestBadge : copyText.signedInBadge}
                  </span>
                  <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">{copyText.language}: {selectedLog.locale || "-"}</span>
                  <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">{copyText.session}: {selectedLog.id.slice(0, 8)}</span>
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">{selectedLog.email || selectedLog.username || selectedLog.anonymousId}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{formatDateTime(selectedLog.createdAt)} • {selectedLog.country || selectedLog.countryCode || "Unknown"} {selectedLog.city ? `• ${selectedLog.city}` : ""}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Section title={copyText.identity}>
                  <DetailLine label={copyText.guestBadge} value={selectedLog.isGuest ? "Yes" : "No"} />
                  <DetailLine label="Email" value={selectedLog.email || "-"} />
                  <DetailLine label="Username" value={selectedLog.username || "-"} />
                  <DetailLine label="Anonymous id" value={selectedLog.anonymousId} />
                  <DetailLine label="User id" value={selectedLog.userId || "-"} />
                </Section>
                <Section title={copyText.location}>
                  <DetailLine label="Country" value={selectedLog.country || selectedLog.countryCode || "-"} />
                  <DetailLine label="Region" value={selectedLog.region || "-"} />
                  <DetailLine label="City" value={selectedLog.city || "-"} />
                  <DetailLine label="Timezone" value={selectedLog.timezone || "-"} />
                  <DetailLine label="Path" value={selectedLog.pagePath || "-"} />
                </Section>
              </div>

              <Section title={copyText.input}>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">{selectedLog.freeText || "-"}</p>
              </Section>

              <Section title={copyText.answers}>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(selectedLog.answers).length ? Object.entries(selectedLog.answers).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{labels[key as keyof typeof labels] || key}</p>
                      <p className="mt-1 text-sm font-medium text-zinc-900">{value}</p>
                    </div>
                  )) : <p className="text-sm text-zinc-500">-</p>}
                </div>
              </Section>

              <Section title={copyText.system}>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">{selectedLog.summary || "-"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600">
                    {copyText.fallbackUsed}: {selectedLog.usedFallback ? "Yes" : "No"}
                  </span>
                  {selectedLog.warning ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      {copyText.warning}: {selectedLog.warning}
                    </span>
                  ) : null}
                </div>
              </Section>

              <Section title={copyText.recommendations}>
                <div className="space-y-2">
                  {selectedLog.recommendations.length ? selectedLog.recommendations.map((perfume) => (
                    <div key={perfume.slug} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">{perfume.brand ? `${perfume.brand} ${perfume.name}` : perfume.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{perfume.slug}</p>
                      </div>
                      <p className="text-xs font-semibold text-zinc-500">{perfume.minPrice ? `${perfume.minPrice} AZN` : "-"}</p>
                    </div>
                  )) : <p className="text-sm text-zinc-500">-</p>}
                </div>
              </Section>

              <Section title="Metadata">
                <DetailLine label={copyText.generatedAt} value={formatDateTime(selectedLog.createdAt)} />
                <DetailLine label="Device" value={selectedLog.deviceType || "-"} />
                <DetailLine label="Browser" value={selectedLog.browser || "-"} />
                <DetailLine label="OS" value={selectedLog.os || "-"} />
                <DetailLine label="User agent" value={selectedLog.userAgent || "-"} />
              </Section>
            </div>
          ) : (
            <div className="grid min-h-[28rem] place-items-center rounded-[1.4rem] border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-10 text-center text-sm text-zinc-500">
              {copyText.empty}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.35rem] border border-zinc-200 bg-zinc-50/80 p-4">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{title}</h4>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-200/70 py-2 last:border-b-0">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="max-w-[70%] text-right text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}