"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Clock, CopySimple, MagnifyingGlass, Sparkle, UserCircle, Users } from "@phosphor-icons/react";

type AdminLocale = "az" | "en";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type ChatSession = {
  id: string;
  userId: string | null;
  anonymousId: string;
  isSignedIn: boolean;
  isGuest: boolean;
  email: string;
  username: string;
  locale: string;
  title: string;
  preview: string;
  pagePath: string;
  currentPerfumeSlug: string;
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
  updatedAt: string;
  lastMessageAt: string;
  expiresAt: string;
  messageCount: number;
  messages: ChatMessage[];
};

type ChatInsightsResponse = {
  generatedAt: string;
  totalSessions: number;
  guestSessions: number;
  signedInSessions: number;
  topCountries: Array<{ country: string; count: number }>;
  sessions: ChatSession[];
};

const copy = {
  az: {
    title: "AI chat analitikası",
    description: "Guest və giriş etmiş istifadəçilərin chat sessiyalarını, yerlərini və tam yazışma tarixçəsini izləyin.",
    refresh: "Yenilə",
    loading: "AI chat sessiyaları yüklənir...",
    empty: "Hələ AI chat sessiyası yoxdur.",
    search: "Sessiya axtar...",
    all: "Hamısı",
    guest: "Guest",
    signedIn: "Giriş etmiş",
    totalSessions: "Sessiyalar",
    guestSessions: "Guest sessiyalar",
    signedInSessions: "Giriş etmiş sessiyalar",
    topCountries: "Top ölkələr",
    transcript: "Tam yazışma",
    details: "Sessiya detalları",
    identity: "İstifadəçi",
    location: "Location",
    device: "Device",
    page: "Səhifə",
    metadata: "Metadata",
    anonymous: "Anonim id",
    lastSeen: "Son mesaj",
    expiresAt: "Bitir",
    messages: "Mesajlar",
    copySessionId: "Sessiya id-ni kopyala",
  },
  en: {
    title: "AI chat intelligence",
    description: "Inspect guest and signed-in chat sessions, locations, and the full transcript in one place.",
    refresh: "Refresh",
    loading: "Loading AI chat sessions...",
    empty: "No AI chat sessions yet.",
    search: "Search sessions...",
    all: "All",
    guest: "Guest",
    signedIn: "Signed in",
    totalSessions: "Sessions",
    guestSessions: "Guest sessions",
    signedInSessions: "Signed-in sessions",
    topCountries: "Top countries",
    transcript: "Full transcript",
    details: "Session details",
    identity: "Identity",
    location: "Location",
    device: "Device",
    page: "Page",
    metadata: "Metadata",
    anonymous: "Anonymous id",
    lastSeen: "Last message",
    expiresAt: "Expires",
    messages: "Messages",
    copySessionId: "Copy session id",
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

export function AiChatInsights({ locale = "en" }: { locale?: AdminLocale }) {
  const copyText = copy[locale];
  const [data, setData] = useState<ChatInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [filter, setFilter] = useState<"all" | "guest" | "signedIn">("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai-chat-sessions?limit=100", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch AI chat sessions");
      }

      const payload = (await response.json()) as ChatInsightsResponse;
      setData(payload);
      setSelectedSessionId((current) => current ?? payload.sessions[0]?.id ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch AI chat sessions");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = useMemo(() => {
    const sessions = data?.sessions ?? [];
    return sessions.filter((session) => {
      const haystack = [
        session.title,
        session.preview,
        session.email,
        session.username,
        session.anonymousId,
        session.country,
        session.region,
        session.city,
        session.pagePath,
        session.deviceType,
        session.browser,
        session.os,
        session.locale,
      ]
        .join(" ")
        .toLowerCase();

      const searchMatch = deferredSearch ? haystack.includes(deferredSearch) : true;
      const filterMatch =
        filter === "all" ? true : filter === "guest" ? session.isGuest : session.isSignedIn;

      return searchMatch && filterMatch;
    });
  }, [data?.sessions, deferredSearch, filter]);

  const selectedSession = useMemo(
    () => filteredSessions.find((session) => session.id === selectedSessionId) ?? filteredSessions[0] ?? null,
    [filteredSessions, selectedSessionId],
  );

  useEffect(() => {
    if (!filteredSessions.length) {
      setSelectedSessionId(null);
      return;
    }

    if (!selectedSession || !filteredSessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(filteredSessions[0]?.id ?? null);
    }
  }, [filteredSessions, selectedSession, selectedSessionId]);

  const copySessionId = async () => {
    if (!selectedSession) return;
    try {
      await navigator.clipboard.writeText(selectedSession.id);
    } catch {
      // ignore clipboard failures
    }
  };

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

        <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50" onClick={() => void fetchSessions()}>
          <Clock size={16} weight="bold" />
          {copyText.refresh}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={copyText.totalSessions} value={data?.totalSessions ?? 0} icon={<Users size={18} weight="bold" />} />
        <MetricCard label={copyText.guestSessions} value={data?.guestSessions ?? 0} icon={<UserCircle size={18} weight="bold" />} />
        <MetricCard label={copyText.signedInSessions} value={data?.signedInSessions ?? 0} icon={<Users size={18} weight="bold" />} />
        <MetricCard label={copyText.topCountries} value={data?.topCountries?.[0] ? `${data.topCountries[0].country} (${data.topCountries[0].count})` : "-"} icon={<Clock size={18} weight="bold" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4">
          <label className="relative block">
            <span className="sr-only">{copyText.search}</span>
            <MagnifyingGlass size={16} weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="h-11 w-full rounded-2xl border border-zinc-300 bg-[#f7f7f5] px-4 pl-11 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:bg-white"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copyText.search}
            />
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

          <div className="mt-4 max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">{copyText.loading}</div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">{error}</div>
            ) : filteredSessions.length ? (
              filteredSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={cx(
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    selectedSession?.id === session.id
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{session.title || session.preview || session.id}</p>
                      <p className={cx("mt-1 truncate text-xs", selectedSession?.id === session.id ? "text-white/70" : "text-zinc-500")}>
                        {session.isGuest ? copyText.guest : session.email || session.username || session.userId || copyText.signedIn}
                      </p>
                    </div>
                    <span className={cx("rounded-full border px-2 py-1 text-[11px] font-semibold", selectedSession?.id === session.id ? "border-white/20 bg-white/10 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-600") }>
                      {session.messageCount}
                    </span>
                  </div>
                  <p className={cx("mt-2 line-clamp-2 text-xs leading-5", selectedSession?.id === session.id ? "text-white/75" : "text-zinc-500")}>
                    {session.preview}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                {copyText.empty}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4 sm:p-5">
          {selectedSession ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <Clock size={14} weight="bold" />
                    {copyText.details}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">{selectedSession.title || selectedSession.preview || selectedSession.id}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{selectedSession.preview}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50" onClick={copySessionId}>
                    <CopySimple size={16} weight="bold" />
                    {copyText.copySessionId}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MetaBlock label={copyText.identity} value={selectedSession.isGuest ? `${copyText.guest} · ${selectedSession.anonymousId}` : selectedSession.email || selectedSession.username || selectedSession.userId || selectedSession.anonymousId} />
                <MetaBlock label={copyText.location} value={[selectedSession.city, selectedSession.region, selectedSession.country].filter(Boolean).join(" / ") || "-"} />
                <MetaBlock label={copyText.device} value={[selectedSession.deviceType, selectedSession.browser, selectedSession.os].filter(Boolean).join(" · ") || "-"} />
                <MetaBlock label={copyText.page} value={selectedSession.pagePath || "-"} />
                <MetaBlock label={copyText.anonymous} value={selectedSession.anonymousId || "-"} />
                <MetaBlock label={copyText.metadata} value={`Locale ${selectedSession.locale || "-"} · ${selectedSession.messageCount} messages`} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <MetaBlock label={copyText.lastSeen} value={formatDateTime(selectedSession.lastMessageAt)} />
                <MetaBlock label={copyText.expiresAt} value={formatDateTime(selectedSession.expiresAt)} />
                <MetaBlock label={copyText.topCountries} value={selectedSession.country || selectedSession.countryCode || "-"} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{copyText.transcript}</p>
                <div className="mt-3 space-y-3">
                  {selectedSession.messages.length ? (
                    selectedSession.messages.map((message, index) => (
                      <div key={`${selectedSession.id}-${index}-${message.role}`} className={cx("max-w-4xl rounded-2xl border px-4 py-3", message.role === "assistant" ? "border-zinc-200 bg-zinc-50" : "border-zinc-900/10 bg-white") }>
                        <div className="flex items-center justify-between gap-3">
                          <p className={cx("text-xs font-semibold uppercase tracking-[0.12em]", message.role === "assistant" ? "text-zinc-500" : "text-zinc-900")}>{message.role === "assistant" ? "Assistant" : "User"}</p>
                          <span className="text-xs text-zinc-400">{index + 1}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800">{message.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                      {copyText.empty}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
              {copyText.empty}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-[1.4rem] border border-zinc-200 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(17,24,39,0.04)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-zinc-500">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold text-zinc-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-zinc-800">{value}</p>
    </div>
  );
}