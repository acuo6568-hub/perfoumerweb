"use client";

import { CaretDown, CaretUp, Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type PerfumeImpressionPanelProps = {
  perfumeSlug: string;
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type ImpressionDimensionKey = "longevity" | "sillage" | "season" | "timeOfDay" | "age";

type ImpressionResponse = {
  summary: string;
  matrix: Record<ImpressionDimensionKey, Record<string, number>>;
};

type Copy = {
  title: string;
  subtitle: string;
  minimize: string;
  expand: string;
  loading: string;
  loadError: string;
  loginToGenerate: string;
  generate: string;
  generating: string;
  loginHint: string;
  unknown: string;
  dimensions: Record<ImpressionDimensionKey, string>;
  options: Record<string, string>;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    title: "Təəssürat",
    subtitle: "Qoxunun necə hiss ediləcəyini sürətli cədvəldə görün.",
    minimize: "Yığ",
    expand: "Aç",
    loading: "Təəssüratlar yüklənir...",
    loadError: "Bu məhsul üçün AI təəssüratı hazır olmadı.",
    loginToGenerate: "Yeni təhlil yaratmaq üçün giriş lazımdır.",
    generate: "Təhlil et",
    generating: "Hazırlanır...",
    loginHint: "Hazır nəticə görünür. Yeni nəticə yaratmaq üçün hesabla giriş edin.",
    unknown: "Naməlum",
    dimensions: {
      longevity: "Davamlılıq",
      sillage: "Şleyf",
      season: "İlin vaxtı",
      timeOfDay: "Günün vaxtları",
      age: "Yaş",
    },
    options: {
      weak: "Zəif",
      unstable: "Qeyri-sabit",
      moderate: "Orta",
      long: "Davamlı",
      very_long: "Çox davamlı",
      none: "Şleyf yoxdur",
      low: "Şleyf azdır",
      high: "Şleyf yüksəkdir",
      very_high: "Şleyf çox yüksəkdir",
      autumn: "Payız",
      winter: "Qış",
      spring: "Yaz",
      summer: "Yay",
      morning: "Səhər",
      evening: "Axşam",
      under_18: "18-ə qədər",
      age_18_25: "18-25 yaş",
      age_26_35: "26-35 yaş",
      age_35_45: "35-45 yaş",
      age_45_plus: "45 yaşdan yuxarı",
    },
  },
  en: {
    title: "Impressions",
    subtitle: "See how this scent is likely to feel in a quick matrix.",
    minimize: "Minimize",
    expand: "Expand",
    loading: "Loading impressions...",
    loadError: "Could not load AI impressions for this perfume.",
    loginToGenerate: "Sign in to generate a new analysis.",
    generate: "Generate analysis",
    generating: "Generating...",
    loginHint: "Cached impressions are shown publicly. Sign in to create a new one.",
    unknown: "Unknown",
    dimensions: {
      longevity: "Longevity",
      sillage: "Sillage",
      season: "Season",
      timeOfDay: "Time of day",
      age: "Age",
    },
    options: {
      weak: "Weak",
      unstable: "Unstable",
      moderate: "Moderate",
      long: "Long",
      very_long: "Very long",
      none: "No trail",
      low: "Low trail",
      high: "Strong trail",
      very_high: "Very strong trail",
      autumn: "Autumn",
      winter: "Winter",
      spring: "Spring",
      summer: "Summer",
      morning: "Morning",
      evening: "Evening",
      under_18: "Under 18",
      age_18_25: "18-25",
      age_26_35: "26-35",
      age_35_45: "35-45",
      age_45_plus: "45+",
    },
  },
  ru: {
    title: "Впечатление",
    subtitle: "Быстрая матрица того, как этот аромат обычно ощущается.",
    minimize: "Свернуть",
    expand: "Развернуть",
    loading: "Загрузка матрицы...",
    loadError: "Не удалось загрузить AI-оценку для этого аромата.",
    loginToGenerate: "Войдите, чтобы сгенерировать новую оценку.",
    generate: "Сгенерировать",
    generating: "Генерируем...",
    loginHint: "Кэшированная матрица доступна всем. Для новой генерации нужен вход.",
    unknown: "Неизвестно",
    dimensions: {
      longevity: "Стойкость",
      sillage: "Шлейф",
      season: "Сезон",
      timeOfDay: "Время суток",
      age: "Возраст",
    },
    options: {
      weak: "Слабая",
      unstable: "Нестабильная",
      moderate: "Средняя",
      long: "Стойкая",
      very_long: "Очень стойкая",
      none: "Без шлейфа",
      low: "Слабый шлейф",
      high: "Сильный шлейф",
      very_high: "Очень сильный шлейф",
      autumn: "Осень",
      winter: "Зима",
      spring: "Весна",
      summer: "Лето",
      morning: "Утро",
      evening: "Вечер",
      under_18: "До 18",
      age_18_25: "18-25",
      age_26_35: "26-35",
      age_35_45: "35-45",
      age_45_plus: "45+",
    },
  },
};

function getToneFillClass(dimension: ImpressionDimensionKey) {
  if (dimension === "longevity") return "bg-fuchsia-200/70";
  if (dimension === "sillage") return "bg-indigo-200/70";
  if (dimension === "season") return "bg-cyan-200/70";
  if (dimension === "timeOfDay") return "bg-amber-200/70";
  return "bg-lime-200/70";
}

export function PerfumeImpressionPanel({ perfumeSlug, locale, supabase: supabaseConfig }: PerfumeImpressionPanelProps) {
  const copy = copyByLocale[locale];
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<ImpressionResponse | null>(null);
  const [error, setError] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [animateFill, setAnimateFill] = useState(false);
  const hasCollapsibleContent = loading || generating || Boolean(data) || Boolean(error);

  useEffect(() => {
    if (!supabase) return;

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

    const loadCached = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/perfumes/impressions?slug=${encodeURIComponent(perfumeSlug)}&locale=${locale}`);
        if (!response.ok) {
          if (response.status !== 404 && isMounted) {
            setError(copy.loadError);
          }
          return;
        }

        const json = (await response.json()) as {
          data?: ImpressionResponse;
        };

        if (!isMounted) return;
        setData(json.data ?? null);
      } catch {
        if (isMounted) {
          setError(copy.loadError);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadCached();

    return () => {
      isMounted = false;
    };
  }, [copy.loadError, locale, perfumeSlug]);

  const orderedDimensions = useMemo(
    () => ["longevity", "sillage", "season", "timeOfDay", "age"] as ImpressionDimensionKey[],
    [],
  );

  useEffect(() => {
    if (!data || isCollapsed) {
      setAnimateFill(false);
      return;
    }

    setAnimateFill(false);
    const frame = requestAnimationFrame(() => {
      setAnimateFill(true);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [data, isCollapsed]);

  const generate = async () => {
    if (!session?.access_token) {
      setError(copy.loginToGenerate);
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/perfumes/impressions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug: perfumeSlug, locale }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as { error?: string };
        if (json.error === "login_required_for_generation") {
          setError(copy.loginToGenerate);
        } else {
          setError(copy.loadError);
        }
        return;
      }

      const json = (await response.json()) as { data?: ImpressionResponse };
      setData(json.data ?? null);
    } catch {
      setError(copy.loadError);
    } finally {
      setGenerating(false);
    }
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return null;
  }

  return (
    <section className="mt-4 py-1.5 md:py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{copy.title}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{copy.subtitle}</p>
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

          {!data ? (
            <button
              type="button"
              onClick={generate}
              disabled={generating || loading}
              className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-medium text-zinc-800 shadow-[0_6px_18px_rgba(20,20,20,0.08)] backdrop-blur transition-all duration-300 hover:-translate-y-[1px] hover:border-zinc-300 hover:shadow-[0_10px_24px_rgba(20,20,20,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkle size={15} weight="duotone" className={generating ? "animate-spin" : "transition-transform duration-300 group-hover:rotate-12 group-hover:scale-105"} />
              {generating ? copy.generating : copy.generate}
            </button>
          ) : null}
        </div>
      </div>

      {!isCollapsed || !hasCollapsibleContent ? (
        <>
          {loading ? <p className="mt-3 text-sm text-zinc-500">{copy.loading}</p> : null}
          {!session && !data ? <p className="mt-3 text-xs text-zinc-500">{copy.loginHint}</p> : null}
          {error ? <p className="mt-3 text-sm text-zinc-600">{error}</p> : null}

          {data ? (
            <>
              {data.summary ? <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-700">{data.summary}</p> : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {orderedDimensions.map((dimension) => {
                  const rows = data.matrix[dimension] ?? {};
                  const maxValue = Math.max(...Object.values(rows), 0);

                  return (
                    <div key={dimension} className="space-y-1">
                      <p className="text-sm font-medium text-zinc-700">{copy.dimensions[dimension]}</p>
                      <div className="space-y-1.5">
                        {Object.entries(rows).map(([key, value]) => {
                          const ratio = maxValue > 0 ? value / maxValue : 0;
                          const fillPercent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
                          const animatedWidth = animateFill ? fillPercent : 0;
                          return (
                            <div
                              key={`${dimension}-${key}`}
                              className="relative grid grid-cols-[2rem_1fr_1.2rem] items-center gap-1 overflow-hidden rounded-lg border border-zinc-200 bg-white/90 px-2 py-1 text-sm"
                            >
                              {fillPercent > 0 ? (
                                <span
                                  className={[
                                    "pointer-events-none absolute inset-y-0 left-0 rounded-l-lg transition-[width] duration-700 ease-out",
                                    getToneFillClass(dimension),
                                  ].join(" ")}
                                  style={{ width: `${animatedWidth}%` }}
                                />
                              ) : null}
                              <span className="relative z-10 text-zinc-600">{value}</span>
                              <span className="relative z-10 truncate text-zinc-700">{copy.options[key] ?? copy.unknown}</span>
                              <span className="relative z-10 text-center text-zinc-400">+</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
