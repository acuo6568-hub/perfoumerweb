"use client";

import { CaretDown, CaretUp, Sparkle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type PerfumeScentSummaryPanelProps = {
  perfumeSlug: string;
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  summarizeScent: string;
  minimize: string;
  expand: string;
  summaryTitle: string;
  summaryDescription: string;
  summaryLoading: string;
  summaryError: string;
  summaryHighlightsLabel: string;
};

const MIN_SUMMARY_LOADING_MS = 1100;

const copyByLocale: Record<Locale, Copy> = {
  az: {
    summarizeScent: "Qoxunu qısa izah et",
    minimize: "Yığ",
    expand: "Aç",
    summaryTitle: "Qoxu qeydləri",
    summaryDescription: "Ətrin notları, xarakteri və ən uyğun istifadə anları",
    summaryLoading: "Qısa izah hazırlanır...",
    summaryError: "Qısa izah hazır olmadı. Bir az sonra yenidən yoxlayın.",
    summaryHighlightsLabel: "Əsas məqamlar",
  },
  en: {
    summarizeScent: "Summarize this scent",
    minimize: "Minimize",
    expand: "Expand",
    summaryTitle: "Scent summary for you",
    summaryDescription: "Notes, character, and practical wearing context in one view",
    summaryLoading: "Generating summary...",
    summaryError: "Could not generate the summary. Please try again shortly.",
    summaryHighlightsLabel: "Key highlights",
  },
  ru: {
    summarizeScent: "Суммировать аромат",
    minimize: "Свернуть",
    expand: "Развернуть",
    summaryTitle: "Сводка аромата для вас",
    summaryDescription: "Ноты, характер и практичный контекст ношения в одном блоке",
    summaryLoading: "Формируем сводку...",
    summaryError: "Не удалось создать сводку. Попробуйте еще раз чуть позже.",
    summaryHighlightsLabel: "Ключевые моменты",
  },
};

export function PerfumeScentSummaryPanel({ perfumeSlug, locale, supabase: supabaseConfig }: PerfumeScentSummaryPanelProps) {
  const copy = copyByLocale[locale];
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [session, setSession] = useState<Session | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [summaryHighlights, setSummaryHighlights] = useState<string[]>([]);
  const [summaryError, setSummaryError] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const hasCollapsibleContent = isSummaryLoading || Boolean(aiSummary) || Boolean(summaryError);

  const formatSummaryParagraphs = (summary: string) => {
    const normalized = summary.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return [] as string[];
    }

    const sentenceChunks = normalized
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (sentenceChunks.length <= 2) {
      return sentenceChunks;
    }

    const midpoint = Math.ceil(sentenceChunks.length / 2);
    return [sentenceChunks.slice(0, midpoint).join(" "), sentenceChunks.slice(midpoint).join(" ")].filter(Boolean);
  };

  const normalizeHighlight = (item: string) => item.replace(/^[-*•\s]+/, "").trim();

  const formatInlineRichText = (text: string): ReactNode[] => {
    const segments = text
      .split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g)
      .map((part) => part.trim())
      .filter(Boolean);

    return segments.map((segment, index) => {
      const isBold =
        (segment.startsWith("**") && segment.endsWith("**")) ||
        (segment.startsWith("__") && segment.endsWith("__"));

      if (isBold) {
        const content = segment.slice(2, -2).trim();
        return (
          <strong key={`rich-${index}`} className="font-semibold text-zinc-900">
            {content}
          </strong>
        );
      }

      const isCode = segment.startsWith("`") && segment.endsWith("`");
      if (isCode) {
        const content = segment.slice(1, -1).trim();
        return (
          <span
            key={`rich-${index}`}
            className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[0.82em] font-medium text-zinc-800"
          >
            {content}
          </span>
        );
      }

      return <span key={`rich-${index}`}>{segment} </span>;
    });
  };

  const renderHighlightText = (item: string) => {
    const normalized = normalizeHighlight(item);
    const labelMatch = normalized.match(/^([^:]{2,36}):\s*(.+)$/);

    if (!labelMatch) {
      return formatInlineRichText(normalized);
    }

    const [, label, value] = labelMatch;
    return (
      <>
        <strong className="font-semibold text-zinc-800">{label}:</strong>{" "}
        {formatInlineRichText(value)}
      </>
    );
  };

  const ensureMinimumLoadingTime = async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= MIN_SUMMARY_LOADING_MS) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, MIN_SUMMARY_LOADING_MS - elapsed);
    });
  };

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const loadCachedSummary = async () => {
      try {
        const response = await fetch(
          `/api/perfumes/summary?slug=${encodeURIComponent(perfumeSlug)}&locale=${locale}`,
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { summary?: string; highlights?: string[] };
        if (!isMounted) {
          return;
        }

        setAiSummary(typeof data.summary === "string" ? data.summary : "");
        setSummaryHighlights(
          Array.isArray(data.highlights)
            ? data.highlights.filter((item): item is string => typeof item === "string")
            : [],
        );
      } catch {
        // Silent fail: panel should still work with explicit button generation.
      } finally {
        if (isMounted) {
          setIsInitialLoadDone(true);
        }
      }
    };

    void loadCachedSummary();

    return () => {
      isMounted = false;
    };
  }, [locale, perfumeSlug]);

  const summarizeScent = async () => {
    if (!session?.user) {
      return;
    }

    const startedAt = Date.now();
    setIsSummaryLoading(true);
    setSummaryError("");
    setAiSummary("");
    setSummaryHighlights([]);

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };

      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/perfumes/summary", {
        method: "POST",
        headers,
        body: JSON.stringify({
          slug: perfumeSlug,
          locale,
        }),
      });

      if (!response.ok) {
        await ensureMinimumLoadingTime(startedAt);
        setSummaryError(copy.summaryError);
        return;
      }

      const data = (await response.json()) as { summary?: string; highlights?: string[] };
      await ensureMinimumLoadingTime(startedAt);
      setAiSummary(typeof data.summary === "string" ? data.summary : "");
      setSummaryHighlights(
        Array.isArray(data.highlights)
          ? data.highlights.filter((item): item is string => typeof item === "string")
          : [],
      );
    } catch {
      await ensureMinimumLoadingTime(startedAt);
      setSummaryError(copy.summaryError);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  return (
    <section className="scent-summary-panel mt-7 py-1.5 md:py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            {copy.summaryTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{copy.summaryDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasCollapsibleContent ? (
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={isCollapsed ? copy.expand : copy.minimize}
              title={isCollapsed ? copy.expand : copy.minimize}
              className="inline-flex h-9 w-9 items-center justify-center text-zinc-500 transition-all duration-300 hover:text-zinc-900 active:scale-90"
            >
              <CaretUp
                size={17}
                weight="bold"
                className={[
                  "transition-transform duration-300",
                  isCollapsed ? "rotate-180" : "rotate-0",
                ].join(" ")}
              />
            </button>
          ) : null}
          {!aiSummary && isInitialLoadDone && Boolean(session?.user) ? (
            <button
              type="button"
              onClick={summarizeScent}
              disabled={isSummaryLoading}
              className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-5 text-sm font-medium text-zinc-800 shadow-[0_6px_18px_rgba(20,20,20,0.08)] backdrop-blur transition-all duration-300 hover:-translate-y-[1px] hover:border-zinc-300 hover:shadow-[0_10px_24px_rgba(20,20,20,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkle size={16} weight="duotone" className={isSummaryLoading ? "animate-spin" : "transition-transform duration-300 group-hover:rotate-12 group-hover:scale-105"} />
              {isSummaryLoading ? copy.summaryLoading : copy.summarizeScent}
            </button>
          ) : null}
        </div>
      </div>

      {!isCollapsed || !hasCollapsibleContent ? (
        <>
          {summaryError ? (
            <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">{summaryError}</p>
          ) : null}

          {isSummaryLoading ? (
            <div className="mt-4 rounded-2xl bg-zinc-50/70 p-4">
              <div className="scent-summary-skeleton h-4 w-10/12 rounded-lg" />
              <div className="scent-summary-skeleton mt-2 h-4 w-9/12 rounded-lg" />
              <div className="scent-summary-skeleton mt-2 h-4 w-8/12 rounded-lg" />
              <div className="mt-4 space-y-2">
                <div className="scent-summary-skeleton h-3 w-7/12 rounded-lg" />
                <div className="scent-summary-skeleton h-3 w-8/12 rounded-lg" />
                <div className="scent-summary-skeleton h-3 w-6/12 rounded-lg" />
              </div>
            </div>
          ) : null}

          {aiSummary ? (
            <div className="summary-reveal mt-4 rounded-2xl bg-zinc-50/70 p-4">
              <div className="space-y-1.5">
                {formatSummaryParagraphs(aiSummary).map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`} className="text-sm leading-6 text-zinc-700">
                    {formatInlineRichText(paragraph)}
                  </p>
                ))}
              </div>
              {summaryHighlights.length ? (
                <>
                  <p className="mt-4 text-[0.65rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    {copy.summaryHighlightsLabel}
                  </p>
                  <ul className="mt-2 space-y-1.5 border-t border-zinc-200/80 pt-2.5">
                  {summaryHighlights.map((item, index) => (
                    <li
                      key={item}
                      style={{ animationDelay: `${120 + index * 70}ms` }}
                      className="summary-highlight-reveal flex items-start gap-2 text-sm text-zinc-600"
                    >
                      <span className="mt-[0.5rem] inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />
                      <span className="leading-6">{renderHighlightText(item)}</span>
                    </li>
                  ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
