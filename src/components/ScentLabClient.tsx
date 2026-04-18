"use client";

import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type { Perfume } from "@/types/catalog";

type Props = {
  perfumes: Perfume[];
  locale: Locale;
};

type Occasion = "daily" | "office" | "date" | "evening";
type TempBand = "cold" | "mild" | "hot";
type DayPart = "day" | "night";
type HeatCondition = "summer_day" | "summer_night" | "winter_day" | "winter_night";

type FeedbackStore = Record<string, Partial<Record<HeatCondition, { sum: number; count: number }>>>;

const HEAVY_TOKENS = [
  "oud",
  "ud",
  "aqar-a\u011fac\u0131-ud",
  "d\u0259ri",
  "leather",
  "tobacco",
  "t\u00fct\u00fcn",
  "amber",
  "\u0259nb\u0259r",
  "vanilla",
  "vanil",
  "tonka",
  "pa\u00e7uli",
  "patchouli",
  "incense",
  "b\u00fcxur-ladan",
];

const FRESH_TOKENS = [
  "bergamot",
  "berqamot",
  "lemon",
  "limon",
  "grapefruit",
  "qreyfrut",
  "marine",
  "duz",
  "sea",
  "su-notlar",
  "fresh",
  "green",
  "nan\u0259",
  "mint",
  "tea",
  "\u00e7ay",
  "neroli",
  "yuzu",
  "sitrus",
];

const FLORAL_TOKENS = [
  "rose",
  "q\u0131z\u0131lg\u00fcl",
  "jasmine",
  "jasmin",
  "yas\u0259m\u0259n",
  "peony",
  "pion",
  "iris",
  "s\u00fcs\u0259n",
  "violet",
  "b\u0259n\u00f6v\u015f\u0259",
  "lily",
  "zanbaq",
  "tuberoza",
  "floral",
  "\u00e7i\u00e7\u0259k",
];

const SWEET_TOKENS = ["vanil", "vanilla", "caramel", "karamel", "praline", "bal", "honey", "tonka"];

const copy = {
  az: {
    title: "Scent Lab",
    subtitle: "Canl\u0131 qoxu al\u0259tl\u0259ri: hava + occasion, layering studio, longevity heatmap",
    weatherTitle: "1) Hava + Occasion Recommender",
    weatherHint: "M\u00f6vs\u00fcm, g\u00fcn\u00fcn saat\u0131 v\u0259 istifad\u0259 ssenarisin\u0259 g\u00f6r\u0259 3 t\u00f6vsiy\u0259.",
    occasion: "Occasion",
    temp: "Hava",
    dayPart: "Saat",
    layeringTitle: "2) Layering Studio",
    layeringHint: "2 \u0259tir se\u00e7, qar\u0131\u015f\u0131q xarakterini v\u0259 uy\u011funluq bal\u0131n\u0131 g\u00f6r.",
    firstPerfume: "Birinci \u0259tir",
    secondPerfume: "\u0130kinci \u0259tir",
    longevityTitle: "3) Longevity Heatmap",
    longevityHint: "Proqnoz + icma feedback-i il\u0259 2x2 performans x\u0259rit\u0259si.",
    pickPerfume: "\u018ftir se\u00e7",
    feedbackCondition: "\u015e\u0259rait",
    feedbackHours: "Saat",
    submitFeedback: "Feedback \u0259lav\u0259 et",
    recommendationReason: "S\u0259b\u0259b",
    overlapNotes: "K\u0259si\u015f\u0259n notlar",
    blendedMood: "Qar\u0131\u015f\u0131q mood",
    compatibility: "Uy\u011funluq",
    predictedLongevity: "Proqnoz",
    communitySamples: "icma n\u00fcmun\u0259si",
    cold: "Soyuq",
    mild: "M\u00fct\u0259dil",
    hot: "\u0130sti",
    day: "G\u00fcn",
    night: "Gec\u0259",
    daily: "G\u00fcnd\u0259lik",
    office: "Ofis",
    date: "G\u00f6r\u00fc\u015f",
    evening: "Ax\u015fam",
    summerDay: "Yay/G\u00fcn",
    summerNight: "Yay/Gec\u0259",
    winterDay: "Q\u0131\u015f/G\u00fcn",
    winterNight: "Q\u0131\u015f/Gec\u0259",
  },
  en: {
    title: "Scent Lab",
    subtitle: "Live scent tools: weather + occasion, layering studio, longevity heatmap",
    weatherTitle: "1) Weather + Occasion Recommender",
    weatherHint: "Top 3 picks based on season feel, time, and wear scenario.",
    occasion: "Occasion",
    temp: "Weather",
    dayPart: "Time",
    layeringTitle: "2) Layering Studio",
    layeringHint: "Pick two perfumes to see blend character and compatibility.",
    firstPerfume: "First perfume",
    secondPerfume: "Second perfume",
    longevityTitle: "3) Longevity Heatmap",
    longevityHint: "Predicted + community-adjusted 2x2 performance map.",
    pickPerfume: "Pick perfume",
    feedbackCondition: "Condition",
    feedbackHours: "Hours",
    submitFeedback: "Add feedback",
    recommendationReason: "Reason",
    overlapNotes: "Overlapping notes",
    blendedMood: "Blend mood",
    compatibility: "Compatibility",
    predictedLongevity: "Predicted",
    communitySamples: "community samples",
    cold: "Cold",
    mild: "Mild",
    hot: "Hot",
    day: "Day",
    night: "Night",
    daily: "Daily",
    office: "Office",
    date: "Date",
    evening: "Evening",
    summerDay: "Summer/Day",
    summerNight: "Summer/Night",
    winterDay: "Winter/Day",
    winterNight: "Winter/Night",
  },
  ru: {
    title: "Scent Lab",
    subtitle: "Инструменты: погода+сценарий, layering studio, heatmap стойкости",
    weatherTitle: "1) Погода + Сценарий",
    weatherHint: "3 рекомендации по погоде, времени и сценарию.",
    occasion: "Сценарий",
    temp: "Погода",
    dayPart: "Время",
    layeringTitle: "2) Layering Studio",
    layeringHint: "Выберите 2 аромата и получите совместимость и характер микса.",
    firstPerfume: "Первый аромат",
    secondPerfume: "Второй аромат",
    longevityTitle: "3) Longevity Heatmap",
    longevityHint: "Прогноз + данные сообщества в формате 2x2.",
    pickPerfume: "Выберите аромат",
    feedbackCondition: "Условия",
    feedbackHours: "Часы",
    submitFeedback: "Добавить отзыв",
    recommendationReason: "Причина",
    overlapNotes: "Общие ноты",
    blendedMood: "Характер микса",
    compatibility: "Совместимость",
    predictedLongevity: "Прогноз",
    communitySamples: "оценок сообщества",
    cold: "Холодно",
    mild: "Умеренно",
    hot: "Жарко",
    day: "День",
    night: "Ночь",
    daily: "На каждый день",
    office: "Офис",
    date: "Свидание",
    evening: "Вечер",
    summerDay: "Лето/День",
    summerNight: "Лето/Ночь",
    winterDay: "Зима/День",
    winterNight: "Зима/Ночь",
  },
} as const;

const normalize = (value: string) => value.toLowerCase();

const includesToken = (pool: string, tokens: string[]) => tokens.some((token) => pool.includes(token));

const minPrice = (perfume: Perfume) => (perfume.sizes.length ? Math.min(...perfume.sizes.map((s) => s.price)) : 9999);

const getNotePool = (perfume: Perfume) =>
  normalize([
    perfume.name,
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
  ].join(" "));

const getMoodTags = (perfume: Perfume) => {
  const pool = getNotePool(perfume);
  const sweet = includesToken(pool, SWEET_TOKENS);
  const heavy = includesToken(pool, HEAVY_TOKENS);
  return {
    fresh: includesToken(pool, FRESH_TOKENS),
    floral: includesToken(pool, FLORAL_TOKENS),
    sweet,
    heavy,
    warm: sweet || heavy,
  };
};

function scoreForContext(perfume: Perfume, occasion: Occasion, temp: TempBand, dayPart: DayPart) {
  const tags = getMoodTags(perfume);
  let score = 0;

  if (perfume.inStock) score += 8;

  if (occasion === "office") {
    if (tags.fresh || tags.floral) score += 20;
    if (tags.heavy) score -= 12;
  } else if (occasion === "date") {
    if (tags.warm || tags.sweet) score += 16;
    if (tags.floral) score += 10;
  } else if (occasion === "evening") {
    if (tags.heavy || tags.sweet) score += 20;
  } else {
    if (tags.fresh) score += 12;
    if (!tags.heavy) score += 6;
  }

  if (temp === "hot") {
    if (tags.fresh) score += 18;
    if (tags.heavy) score -= 12;
  } else if (temp === "cold") {
    if (tags.heavy || tags.sweet) score += 16;
    if (tags.fresh) score -= 4;
  } else {
    score += 4;
  }

  if (dayPart === "day") {
    if (tags.fresh || tags.floral) score += 8;
  } else {
    if (tags.heavy || tags.sweet) score += 10;
  }

  score += Math.max(0, 12 - Math.round(minPrice(perfume) / 20));

  return score;
}

function layeringScore(a: Perfume, b: Perfume) {
  const notesA = new Set([...a.noteSlugs.top, ...a.noteSlugs.heart, ...a.noteSlugs.base]);
  const notesB = new Set([...b.noteSlugs.top, ...b.noteSlugs.heart, ...b.noteSlugs.base]);
  const overlap = [...notesA].filter((note) => notesB.has(note));

  const tagsA = getMoodTags(a);
  const tagsB = getMoodTags(b);

  let score = 48;
  score += Math.min(24, overlap.length * 4);
  if (tagsA.fresh && tagsB.fresh) score += 8;
  if (tagsA.heavy && tagsB.heavy) score += 8;
  if (tagsA.fresh && tagsB.heavy) score += 10;
  if (tagsA.floral && tagsB.sweet) score += 8;

  return {
    score: Math.max(0, Math.min(100, score)),
    overlap,
  };
}

function baseLongevityHours(perfume: Perfume) {
  const pool = getNotePool(perfume);
  const heavyCount = HEAVY_TOKENS.filter((token) => pool.includes(token)).length;
  const baseCount = perfume.noteSlugs.base.length;
  const topCount = perfume.noteSlugs.top.length;

  const raw = 3.8 + heavyCount * 0.6 + baseCount * 0.22 - topCount * 0.05;
  return Math.max(2.5, Math.min(13, raw));
}

function conditionModifier(condition: HeatCondition) {
  if (condition === "summer_day") return -1.0;
  if (condition === "summer_night") return -0.4;
  if (condition === "winter_day") return 0.3;
  return 0.9;
}

function conditionLabel(locale: Locale, condition: HeatCondition) {
  const t = copy[locale];
  if (condition === "summer_day") return t.summerDay;
  if (condition === "summer_night") return t.summerNight;
  if (condition === "winter_day") return t.winterDay;
  return t.winterNight;
}

export function ScentLabClient({ perfumes, locale }: Props) {
  const t = copy[locale];

  const [occasion, setOccasion] = useState<Occasion>("daily");
  const [temp, setTemp] = useState<TempBand>("mild");
  const [dayPart, setDayPart] = useState<DayPart>("day");

  const [layeringA, setLayeringA] = useState(perfumes[0]?.slug ?? "");
  const [layeringB, setLayeringB] = useState(perfumes[1]?.slug ?? "");

  const [heatSlug, setHeatSlug] = useState(perfumes[0]?.slug ?? "");
  const [feedbackCondition, setFeedbackCondition] = useState<HeatCondition>("summer_day");
  const [feedbackHours, setFeedbackHours] = useState(7);
  const [feedbackStore, setFeedbackStore] = useState<FeedbackStore>({});

  const bySlug = useMemo(() => new Map(perfumes.map((perfume) => [perfume.slug, perfume])), [perfumes]);
  const perfumeOptions = useMemo(
    () => [...perfumes].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ slug: p.slug, label: `${p.name} - ${p.brand}` })),
    [perfumes],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("perfoumer-longevity-feedback-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as FeedbackStore;
      if (parsed && typeof parsed === "object") {
        setFeedbackStore(parsed);
      }
    } catch {
      // Ignore malformed local data.
    }
  }, []);

  const recommended = useMemo(() => {
    return [...perfumes]
      .map((perfume) => ({ perfume, score: scoreForContext(perfume, occasion, temp, dayPart) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [perfumes, occasion, temp, dayPart]);

  const perfumeA = bySlug.get(layeringA);
  const perfumeB = bySlug.get(layeringB);

  const layering = useMemo(() => {
    if (!perfumeA || !perfumeB) return null;
    const blend = layeringScore(perfumeA, perfumeB);
    const tagsA = getMoodTags(perfumeA);
    const tagsB = getMoodTags(perfumeB);

    const moods: string[] = [];
    if (tagsA.fresh || tagsB.fresh) moods.push("fresh");
    if (tagsA.floral || tagsB.floral) moods.push("floral");
    if (tagsA.sweet || tagsB.sweet) moods.push("sweet");
    if (tagsA.heavy || tagsB.heavy) moods.push("bold");

    return {
      ...blend,
      moods,
      predictedHours: ((baseLongevityHours(perfumeA) + baseLongevityHours(perfumeB)) / 2 + 0.6).toFixed(1),
    };
  }, [perfumeA, perfumeB]);

  const heatPerfume = bySlug.get(heatSlug);

  const heatRows = useMemo(() => {
    if (!heatPerfume) return [];

    const conditions: HeatCondition[] = ["summer_day", "summer_night", "winter_day", "winter_night"];
    const base = baseLongevityHours(heatPerfume);

    return conditions.map((condition) => {
      const predicted = Math.max(1.8, Math.min(14, base + conditionModifier(condition)));
      const feedback = feedbackStore[heatPerfume.slug]?.[condition];
      const communityAvg = feedback && feedback.count > 0 ? feedback.sum / feedback.count : null;
      const shown = communityAvg === null ? predicted : predicted * 0.4 + communityAvg * 0.6;

      return {
        condition,
        predicted,
        shown,
        communityCount: feedback?.count ?? 0,
      };
    });
  }, [heatPerfume, feedbackStore]);

  const submitFeedback = () => {
    if (!heatPerfume) return;

    const current = feedbackStore[heatPerfume.slug]?.[feedbackCondition] ?? { sum: 0, count: 0 };
    const updated: FeedbackStore = {
      ...feedbackStore,
      [heatPerfume.slug]: {
        ...feedbackStore[heatPerfume.slug],
        [feedbackCondition]: {
          sum: current.sum + feedbackHours,
          count: current.count + 1,
        },
      },
    };

    setFeedbackStore(updated);
    try {
      window.localStorage.setItem("perfoumer-longevity-feedback-v1", JSON.stringify(updated));
    } catch {
      // Ignore storage write errors.
    }
  };

  return (
    <section className="mt-8 rounded-[2rem] border border-zinc-200/80 bg-white/80 p-4 shadow-[0_20px_45px_rgba(24,24,24,0.06)] backdrop-blur-sm sm:p-6">
      <div className="mb-4 border-b border-zinc-200/75 pb-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">{t.title}</p>
        <h2 className="mt-2 text-2xl leading-tight font-semibold tracking-[-0.02em] text-zinc-900 sm:text-3xl">{t.subtitle}</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-zinc-200/85 bg-zinc-50/75 p-4">
          <h3 className="text-lg font-semibold text-zinc-900">{t.weatherTitle}</h3>
          <p className="mt-1 text-sm text-zinc-600">{t.weatherHint}</p>

          <div className="mt-3 grid gap-2">
            <label className="text-xs font-medium text-zinc-600">{t.occasion}</label>
            <select value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
              <option value="daily">{t.daily}</option>
              <option value="office">{t.office}</option>
              <option value="date">{t.date}</option>
              <option value="evening">{t.evening}</option>
            </select>

            <label className="mt-1 text-xs font-medium text-zinc-600">{t.temp}</label>
            <select value={temp} onChange={(e) => setTemp(e.target.value as TempBand)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
              <option value="cold">{t.cold}</option>
              <option value="mild">{t.mild}</option>
              <option value="hot">{t.hot}</option>
            </select>

            <label className="mt-1 text-xs font-medium text-zinc-600">{t.dayPart}</label>
            <select value={dayPart} onChange={(e) => setDayPart(e.target.value as DayPart)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
              <option value="day">{t.day}</option>
              <option value="night">{t.night}</option>
            </select>
          </div>

          <div className="mt-4 space-y-2">
            {recommended.map(({ perfume, score }) => (
              <div key={perfume.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <p className="text-sm font-medium text-zinc-900">{perfume.name}</p>
                <p className="text-xs text-zinc-500">{t.recommendationReason}: {Math.round(score)}%</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-200/85 bg-zinc-50/75 p-4">
          <h3 className="text-lg font-semibold text-zinc-900">{t.layeringTitle}</h3>
          <p className="mt-1 text-sm text-zinc-600">{t.layeringHint}</p>

          <div className="mt-3 grid gap-2">
            <label className="text-xs font-medium text-zinc-600">{t.firstPerfume}</label>
            <select value={layeringA} onChange={(e) => setLayeringA(e.target.value)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
              {perfumeOptions.map((option) => (
                <option key={`a-${option.slug}`} value={option.slug}>{option.label}</option>
              ))}
            </select>

            <label className="mt-1 text-xs font-medium text-zinc-600">{t.secondPerfume}</label>
            <select value={layeringB} onChange={(e) => setLayeringB(e.target.value)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
              {perfumeOptions.map((option) => (
                <option key={`b-${option.slug}`} value={option.slug}>{option.label}</option>
              ))}
            </select>
          </div>

          {layering ? (
            <div className="mt-4 space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
              <p className="text-sm font-medium text-zinc-900">{t.compatibility}: {layering.score}%</p>
              <p className="text-xs text-zinc-600">{t.predictedLongevity}: {layering.predictedHours}h</p>
              <p className="text-xs text-zinc-600">{t.blendedMood}: {layering.moods.join(", ") || "balanced"}</p>
              <p className="text-xs text-zinc-600">{t.overlapNotes}: {layering.overlap.slice(0, 6).join(", ") || "-"}</p>
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-zinc-200/85 bg-zinc-50/75 p-4">
          <h3 className="text-lg font-semibold text-zinc-900">{t.longevityTitle}</h3>
          <p className="mt-1 text-sm text-zinc-600">{t.longevityHint}</p>

          <div className="mt-3 grid gap-2">
            <label className="text-xs font-medium text-zinc-600">{t.pickPerfume}</label>
            <select value={heatSlug} onChange={(e) => setHeatSlug(e.target.value)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
              {perfumeOptions.map((option) => (
                <option key={`h-${option.slug}`} value={option.slug}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {heatRows.map((row) => (
              <div key={row.condition} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                <p className="text-xs font-medium text-zinc-700">{conditionLabel(locale, row.condition)}</p>
                <p className="text-sm font-semibold text-zinc-900">{row.shown.toFixed(1)}h</p>
                <p className="text-[11px] text-zinc-500">{row.communityCount} {t.communitySamples}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2">
            <label className="text-xs font-medium text-zinc-600">{t.feedbackCondition}</label>
            <select value={feedbackCondition} onChange={(e) => setFeedbackCondition(e.target.value as HeatCondition)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
              <option value="summer_day">{t.summerDay}</option>
              <option value="summer_night">{t.summerNight}</option>
              <option value="winter_day">{t.winterDay}</option>
              <option value="winter_night">{t.winterNight}</option>
            </select>

            <label className="text-xs font-medium text-zinc-600">{t.feedbackHours}: {feedbackHours}h</label>
            <input
              type="range"
              min={1}
              max={14}
              step={1}
              value={feedbackHours}
              onChange={(e) => setFeedbackHours(Number(e.target.value))}
            />

            <button type="button" onClick={submitFeedback} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
              {t.submitFeedback}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
