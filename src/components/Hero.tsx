"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { formatCurrencyFromAzn, type SupportedCurrency } from "@/lib/currency";
import { getDictionary, toLocalePath, type Locale } from "@/lib/i18n";
import type { SiteHomeHeaderSettings, SiteHomeHeaderSlide } from "@/lib/site-branding";
import type { Perfume } from "@/types/catalog";

type HeroProps = {
  locale: Locale;
  spotlights: Perfume[];
  allPerfumes: Perfume[];
  homeHeader: SiteHomeHeaderSettings;
};

type PerfumeMood = "fresh" | "bold" | "gourmand" | "floral" | "woody";

type HeroTheme = {
  background: string;
  glowPrimary: string;
  glowSecondary: string;
  leftSheen: string;
  rightSheen: string;
  orb: string;
  panel: string;
  panelBorder: string;
  accent: string;
  accentSoft: string;
};

type HeroSceneSprite = {
  left: string;
  top: string;
  width: number;
  rotate: number;
  opacity: number;
  blur: number;
  scale: number;
};

type HeroScene = {
  main: HeroSceneSprite;
  ambient: HeroSceneSprite[];
};

type HeroModel = {
  perfume: Perfume;
  shortName: string;
  mood: PerfumeMood;
  moodLabel: string;
  title: string;
  description: string;
  primaryCta: string;
  priceLabel: string;
  stockLabel: string;
  notePills: string[];
  theme: HeroTheme;
  scene: HeroScene;
};

const HERO_ROTATION_MS = 5600;
const HERO_MAX_SPOTLIGHTS = 6;
const HERO_VIDEO_LOOP_START = 7;
const HERO_VIDEO_LOOP_END = 15;

const heroUiCopy = {
  az: {
    secondaryCta: "Bütün qoxulara bax",
    priceLabel: "Başlayan qiymət",
    notesLabel: "Önə çıxan notlar",
    fallbackEyebrow: "Perfoumer",
    fallbackPrimary: "Yeni Ətirləri Kəşf Et",
    inStock: "Stokda",
  },
  en: {
    secondaryCta: "Browse all scents",
    priceLabel: "Starting from",
    notesLabel: "Signature notes",
    fallbackEyebrow: "Perfoumer",
    fallbackPrimary: "Discover New Perfumes",
    inStock: "In stock",
  },
  ru: {
    secondaryCta: "Смотреть все ароматы",
    priceLabel: "Стартовая цена",
    notesLabel: "Ключевые ноты",
    fallbackEyebrow: "Perfoumer",
    fallbackPrimary: "Открыть новые ароматы",
    inStock: "В наличии",
  },
} as const;

type HeroPalette = {
  base: string;
  deep: string;
  glow: string;
  accent: string;
  mist: string;
};

const basePaletteByMood: Record<PerfumeMood, HeroPalette> = {
  fresh: {
    base: "#194256",
    deep: "#08141c",
    glow: "#99e4ff",
    accent: "#b8f0ff",
    mist: "#d6f6ff",
  },
  bold: {
    base: "#5c3224",
    deep: "#180d0b",
    glow: "#f0ad73",
    accent: "#f4c08e",
    mist: "#ffe1c9",
  },
  gourmand: {
    base: "#73432a",
    deep: "#1f130c",
    glow: "#f2b972",
    accent: "#ffd6a2",
    mist: "#fbe7cc",
  },
  floral: {
    base: "#664166",
    deep: "#19101c",
    glow: "#f4aacd",
    accent: "#ffd8ea",
    mist: "#ffeaf4",
  },
  woody: {
    base: "#405149",
    deep: "#0f1513",
    glow: "#b4cfbf",
    accent: "#dae9df",
    mist: "#eef6f0",
  },
};

const heroPaletteBySlug: Partial<Record<string, Partial<HeroPalette>>> = {
  "eden-sparkling-lychee-39": {
    base: "#b66772",
    deep: "#34171d",
    glow: "#ff9cab",
    accent: "#ffd0d7",
    mist: "#ffe8ec",
  },
  "vanilla-candy-rock-sugar-42": {
    base: "#b97a97",
    deep: "#321824",
    glow: "#ffb6d3",
    accent: "#ffd8e8",
    mist: "#fff0f6",
  },
  "love-delight": {
    base: "#9e6d79",
    deep: "#2d171c",
    glow: "#f6b2bd",
    accent: "#ffd7df",
    mist: "#fff0f3",
  },
  delina: {
    base: "#b96b82",
    deep: "#34151d",
    glow: "#ff9db8",
    accent: "#ffd2dd",
    mist: "#ffe9ef",
  },
  "delina-exclusif": {
    base: "#9f5e70",
    deep: "#2b1218",
    glow: "#f39db4",
    accent: "#ffd0db",
    mist: "#ffe7ee",
  },
  guidance: {
    base: "#8d6a68",
    deep: "#251716",
    glow: "#dcb0ab",
    accent: "#efd5d0",
    mist: "#f7ece8",
  },
  "invite-only-amber-23": {
    base: "#7f5435",
    deep: "#26150e",
    glow: "#efb16a",
    accent: "#f7cc92",
    mist: "#f2dfc8",
  },
  "cherry-smoke": {
    base: "#63283a",
    deep: "#1b0b12",
    glow: "#e77888",
    accent: "#f4b2bd",
    mist: "#f8d9df",
  },
  "elysium-pour-homme": {
    base: "#24556c",
    deep: "#09131b",
    glow: "#7cdcf6",
    accent: "#b9f3ff",
    mist: "#dbfbff",
  },
  "vanille-de-zanzibar": {
    base: "#876038",
    deep: "#23160e",
    glow: "#f2c06f",
    accent: "#ffe0ab",
    mist: "#f9e9cc",
  },
  "cant-stop-loving-you": {
    base: "#834066",
    deep: "#1f0f18",
    glow: "#f0a5c8",
    accent: "#ffd5e8",
    mist: "#ffeaf3",
  },
  "dark-lord": {
    base: "#423532",
    deep: "#0d0909",
    glow: "#d8ae8f",
    accent: "#ead8cc",
    mist: "#f5eee8",
  },
};

const sceneAnchors: HeroSceneSprite[] = [
  { left: "69%", top: "14%", width: 68, rotate: 8, opacity: 0.09, blur: 0.6, scale: 0.78 },
  { left: "82%", top: "56%", width: 76, rotate: -10, opacity: 0.08, blur: 1.1, scale: 0.8 },
  { left: "58%", top: "62%", width: 64, rotate: 12, opacity: 0.06, blur: 1.4, scale: 0.72 },
];

const mainSceneAnchors: HeroSceneSprite[] = [
  { left: "68%", top: "14%", width: 292, rotate: -5, opacity: 1, blur: 0, scale: 1 },
  { left: "70%", top: "16%", width: 278, rotate: 5, opacity: 1, blur: 0, scale: 1 },
  { left: "66%", top: "18%", width: 286, rotate: -7, opacity: 1, blur: 0, scale: 1 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(value: string) {
  const normalized = value.replace("#", "");
  const parsed = Number.parseInt(normalized, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function toHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function mixHex(left: string, right: string, weight: number) {
  const a = hexToRgb(left);
  const b = hexToRgb(right);

  return `#${toHex(a.r + (b.r - a.r) * weight)}${toHex(a.g + (b.g - a.g) * weight)}${toHex(a.b + (b.b - a.b) * weight)}`;
}

function withAlpha(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function buildHeroTheme(perfume: Perfume, mood: PerfumeMood): HeroTheme {
  const curatedPalette = heroPaletteBySlug[perfume.slug];
  const palette = {
    ...basePaletteByMood[mood],
    ...(curatedPalette ?? {}),
  };
  const notePool = new Set([
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
  ]);
  const slugContext = `${perfume.slug} ${perfume.name}`.toLowerCase();
  const hasWarmResinousProfile =
    ["amber", "oud", "wood", "vanill", "tobacco", "patchouli", "leather", "santal", "khamrah", "royale"].some((token) =>
      slugContext.includes(token),
    ) ||
    [
      "aqar-ağacı-ud",
      "tütün",
      "ənbər",
      "vanil",
      "bal",
      "darçın",
      "dəri",
      "benzoin",
      "labdanum",
      "şokolad",
    ].some((note) => notePool.has(note));
  const hasFreshProfile =
    ["berqamot", "limon", "qreyfrut", "naringi-mandarin", "laym", "dəniz-duzu"].some((note) => notePool.has(note)) ||
    ["blue", "sage", "salt", "elysium", "talisman"].some((token) => slugContext.includes(token));

  if (!curatedPalette && !hasWarmResinousProfile && notePool.has("albalı")) {
    palette.base = "#6a3040";
    palette.deep = "#180a10";
    palette.glow = "#ec8496";
    palette.accent = "#f9bbc6";
    palette.mist = "#f8d9df";
  } else if (!curatedPalette && (notePool.has("aqar-ağacı-ud") || notePool.has("tütün"))) {
    palette.base = "#6d4831";
    palette.deep = "#1c100b";
    palette.glow = "#dfb187";
    palette.accent = "#f1d8bc";
    palette.mist = "#f4dfca";
  } else if (!curatedPalette && hasFreshProfile) {
    palette.base = "#205b63";
    palette.deep = "#08171a";
    palette.glow = "#8be4dc";
    palette.accent = "#ccf8ef";
    palette.mist = "#dff9f1";
  }

  if (hasWarmResinousProfile) {
    palette.base = mixHex(palette.base, "#7a4a2d", curatedPalette ? 0.34 : 0.58);
    palette.deep = mixHex(palette.deep, "#22120c", curatedPalette ? 0.34 : 0.56);
    palette.glow = mixHex(palette.glow, "#efb36d", curatedPalette ? 0.3 : 0.5);
    palette.accent = mixHex(palette.accent, "#f2d0a7", curatedPalette ? 0.28 : 0.44);
    palette.mist = mixHex(palette.mist, "#f3dfc8", curatedPalette ? 0.24 : 0.38);
  }

  const baseSoft = mixHex(palette.base, "#ffffff", 0.16);
  const deepRich = mixHex(palette.deep, "#000000", 0.22);

  return {
    background: `linear-gradient(128deg, ${deepRich} 0%, ${palette.base} 40%, ${baseSoft} 100%)`,
    glowPrimary: `radial-gradient(circle_at_76%_22%, ${withAlpha(palette.glow, 0.34)}, transparent 34%)`,
    glowSecondary: `radial-gradient(circle_at_16%_80%, ${withAlpha(palette.mist, 0.18)}, transparent 36%)`,
    leftSheen: `linear-gradient(90deg, ${withAlpha("#ffffff", 0.22)} 0%, ${withAlpha("#ffffff", 0.05)} 48%, transparent 100%)`,
    rightSheen: `linear-gradient(270deg, ${withAlpha(palette.accent, 0.18)} 0%, ${withAlpha(palette.accent, 0.03)} 52%, transparent 100%)`,
    orb: `radial-gradient(circle, ${withAlpha(palette.glow, 0.36)} 0%, ${withAlpha(palette.glow, 0.04)} 72%)`,
    panel: `linear-gradient(180deg, ${withAlpha("#ffffff", 0.08)} 0%, ${withAlpha(palette.deep, 0.26)} 100%)`,
    panelBorder: withAlpha(palette.accent, 0.24),
    accent: palette.accent,
    accentSoft: withAlpha(palette.accent, 0.16),
  };
}

function buildScene(perfume: Perfume): HeroScene {
  const seed = hashString(`${perfume.slug}:${perfume.brand}`);
  const main = mainSceneAnchors[seed % mainSceneAnchors.length];
  const ambient = Array.from({ length: 4 }, (_, index) => {
    const anchor = sceneAnchors[(seed + index * 2) % sceneAnchors.length];
    const xNudge = ((seed >> (index * 3)) % 8) - 4;
    const yNudge = ((seed >> (index * 4 + 1)) % 8) - 4;

    return {
      ...anchor,
      left: `calc(${anchor.left} + ${xNudge}px)`,
      top: `calc(${anchor.top} + ${yNudge}px)`,
      rotate: anchor.rotate + (((seed >> (index + 2)) % 12) - 6),
      width: anchor.width + (((seed >> (index + 5)) % 18) - 9),
      opacity: clamp(anchor.opacity + (((seed >> (index + 7)) % 10) - 5) * 0.008, 0.08, 0.24),
    };
  });

  return {
    main,
    ambient,
  };
}

function getStartingPrice(perfume: Perfume) {
  if (!perfume.sizes.length) {
    return null;
  }

  return Math.min(...perfume.sizes.map((size) => size.price));
}

function humanizeNoteSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function detectMood(perfume: Perfume): PerfumeMood {
  const notes = [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
  ];

  if (notes.some((note) => ["vanil", "karamel", "bal", "albalı", "şokolad"].includes(note))) {
    return "gourmand";
  }
  if (notes.some((note) => ["aqar-ağacı-ud", "dəri", "zəfəran", "tütün", "büxur-ladan"].includes(note))) {
    return "bold";
  }
  if (notes.some((note) => ["jasmin", "qızılgül", "portağal-çiçəyi", "inciçiçəyi", "osmantus"].includes(note))) {
    return "floral";
  }
  if (notes.some((note) => ["berqamot", "limon", "qreyfrut", "naringi-mandarin", "laym"].includes(note))) {
    return "fresh";
  }

  return "woody";
}

function buildPrimaryCta(perfumeName: string, locale: Locale) {
  const shortName = perfumeName.length > 18 ? perfumeName.replace(/\s+\|.*$/, "") : perfumeName;

  if (locale === "az") {
    return shortName.length > 16 ? "Bu ətrə bax" : `${shortName} haqqında`;
  }

  if (locale === "ru") {
    return shortName.length > 18 ? "Открыть аромат" : `Открыть ${shortName}`;
  }

  return shortName.length > 18 ? "Explore this scent" : `Explore ${shortName}`;
}

function buildHeroModel(
  perfume: Perfume,
  locale: Locale,
  selectedCurrency: SupportedCurrency,
  overrides?: Partial<Pick<HeroModel, "description" | "primaryCta" | "title" | "shortName" | "moodLabel" | "priceLabel" | "stockLabel">>,
): HeroModel {
  const mood = detectMood(perfume);
  const theme = buildHeroTheme(perfume, mood);
  const scene = buildScene(perfume);
  const startingPrice = getStartingPrice(perfume);
  const formattedStartingPrice = startingPrice
    ? formatCurrencyFromAzn(startingPrice, selectedCurrency, locale)
    : null;
  const notePills = [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
  ]
    .slice(0, 3)
    .map(humanizeNoteSlug);

  const displayName = perfume.name.length > 26 ? perfume.name.replace(/\s+\|.*$/, "") : perfume.name;
  if (locale === "az") {
    const descriptionByMood: Record<PerfumeMood, string> = {
      fresh: `${perfume.brand} imzalı daha təmiz və parlaq gündəlik seçim. ${formattedStartingPrice ? `${formattedStartingPrice}-dən başlayan qiymətlə.` : "Qiymət sorğu ilə."}`,
      bold: `${perfume.brand} xəttində daha dərin, isti və qalıcı xarakter. ${formattedStartingPrice ? `${formattedStartingPrice}-dən başlayan qiymətlə.` : "Qiymət sorğu ilə."}`,
      gourmand: `${perfume.brand} tərəfindən isti şirinlik və yumşaq, yaddaqalan sonluq. ${formattedStartingPrice ? `${formattedStartingPrice}-dən başlayan qiymətlə.` : "Qiymət sorğu ilə."}`,
      floral: `${perfume.brand} imzasında zərif çiçək parlaqlığı və yüngül balans. ${formattedStartingPrice ? `${formattedStartingPrice}-dən başlayan qiymətlə.` : "Qiymət sorğu ilə."}`,
      woody: `${perfume.brand} tərəfindən balanslı ağac izi və sakit güc. ${formattedStartingPrice ? `${formattedStartingPrice}-dən başlayan qiymətlə.` : "Qiymət sorğu ilə."}`,
    };

    return {
      perfume,
      shortName: displayName,
      mood,
      moodLabel:
        mood === "fresh"
          ? "Fresh aura"
          : mood === "bold"
            ? "Dərin aura"
            : mood === "gourmand"
              ? "İsti şirinlik"
              : mood === "floral"
                ? "Parlaq çiçək"
                : "Ağac balansı",
      title: displayName,
      description: descriptionByMood[mood],
      primaryCta: buildPrimaryCta(displayName, locale),
      priceLabel: formattedStartingPrice || "Qiymət sorğu ilə",
      stockLabel: heroUiCopy.az.inStock,
      notePills,
      theme,
      scene,
    };
  }

  if (locale === "ru") {
    const descriptionByMood: Record<PerfumeMood, string> = {
      fresh: `${perfume.brand}: чистое, яркое и более легкое дневное звучание. ${formattedStartingPrice ? `От ${formattedStartingPrice}.` : "Цена по запросу."}`,
      bold: `${perfume.brand}: более глубокий, теплый и заметный шлейф. ${formattedStartingPrice ? `От ${formattedStartingPrice}.` : "Цена по запросу."}`,
      gourmand: `${perfume.brand}: мягкая сладость и притягательный теплый характер. ${formattedStartingPrice ? `От ${formattedStartingPrice}.` : "Цена по запросу."}`,
      floral: `${perfume.brand}: деликатная цветочная яркость и мягкий баланс. ${formattedStartingPrice ? `От ${formattedStartingPrice}.` : "Цена по запросу."}`,
      woody: `${perfume.brand}: спокойная древесная база и универсальное звучание. ${formattedStartingPrice ? `От ${formattedStartingPrice}.` : "Цена по запросу."}`,
    };

    return {
      perfume,
      shortName: displayName,
      mood,
      moodLabel:
        mood === "fresh"
          ? "Чистый акцент"
          : mood === "bold"
            ? "Глубокий шлейф"
            : mood === "gourmand"
              ? "Теплая сладость"
              : mood === "floral"
                ? "Цветочное сияние"
                : "Древесный баланс",
      title: displayName,
      description: descriptionByMood[mood],
      primaryCta: buildPrimaryCta(displayName, locale),
      priceLabel: formattedStartingPrice || "Цена по запросу",
      stockLabel: heroUiCopy.ru.inStock,
      notePills,
      theme,
      scene,
    };
  }

  const descriptionByMood: Record<PerfumeMood, string> = {
    fresh: `${perfume.brand} with a cleaner, brighter everyday signature. ${formattedStartingPrice ? `Starting from ${formattedStartingPrice}.` : "Price on request."}`,
    bold: `${perfume.brand} with deeper warmth and a more lasting trail. ${formattedStartingPrice ? `Starting from ${formattedStartingPrice}.` : "Price on request."}`,
    gourmand: `${perfume.brand} with warm sweetness and an addictive finish. ${formattedStartingPrice ? `Starting from ${formattedStartingPrice}.` : "Price on request."}`,
    floral: `${perfume.brand} with a softer floral glow and balanced feel. ${formattedStartingPrice ? `Starting from ${formattedStartingPrice}.` : "Price on request."}`,
    woody: `${perfume.brand} with smooth woods and a quieter signature. ${formattedStartingPrice ? `Starting from ${formattedStartingPrice}.` : "Price on request."}`,
  };

  return {
    perfume,
    shortName: displayName,
    mood,
    moodLabel:
      mood === "fresh"
        ? "Clean energy"
        : mood === "bold"
          ? "Lasting depth"
          : mood === "gourmand"
            ? "Warm sweetness"
            : mood === "floral"
              ? "Floral light"
              : "Woody balance",
    title: displayName,
    description: descriptionByMood[mood],
    primaryCta: buildPrimaryCta(displayName, locale),
    priceLabel: formattedStartingPrice || "Price on request",
    stockLabel: heroUiCopy.en.inStock,
    notePills,
    theme,
    scene,
    ...overrides,
  };
}

function buildVideoCopy(homeHeader: SiteHomeHeaderSettings, locale: Locale) {
  const defaults: Record<string, { title: string; description: string; ctaLabel: string; ctaHref: string }> = {
    az: {
      title: "KAY ALI",
      description: "KAY ALI Perfumes — KAY ALI kolleksiyasını kəşf edin.",
      ctaLabel: "Bütün qoxulara bax",
      ctaHref: "/brands",
    },
    en: {
      title: "KAY ALI",
      description: "Discover the full KAY ALI collection.",
      ctaLabel: "View all brands",
      ctaHref: "/brands",
    },
    ru: {
      title: "KAY ALI",
      description: "Откройте всю коллекцию KAY ALI.",
      ctaLabel: "Все бренды",
      ctaHref: "/brands",
    },
  };

  const pick = defaults[locale] ?? defaults.en;

  return {
    title: (homeHeader.videoTitleByLocale && (homeHeader.videoTitleByLocale as any)[locale]) || homeHeader.videoTitle || pick.title,
    description:
      (homeHeader.videoDescriptionByLocale && (homeHeader.videoDescriptionByLocale as any)[locale]) || homeHeader.videoDescription || pick.description,
    ctaLabel:
      (homeHeader.videoCtaLabelByLocale && (homeHeader.videoCtaLabelByLocale as any)[locale]) || homeHeader.videoCtaLabel || pick.ctaLabel,
    ctaHref: homeHeader.videoCtaHref || pick.ctaHref,
  } as any;
}

export function Hero({ locale, spotlights, allPerfumes, homeHeader }: HeroProps) {
  const siteSettings = useSiteSettings();
  const t = getDictionary(locale, siteSettings);
  const copy = heroUiCopy[locale];
  const { selectedCurrency } = useCurrency();
  const selectedPerfumesMap = useMemo(() => new Map(allPerfumes.map((perfume) => [perfume.slug, perfume])), [allPerfumes]);
  const curatedModels = useMemo(() => {
    if (homeHeader.rotationMode !== "selected" || !homeHeader.slides.length) {
      return [] as HeroModel[];
    }

    return homeHeader.slides
      .map((slide) => {
        const perfume = selectedPerfumesMap.get(slide.perfumeSlug);
        if (!perfume) return null;

        return buildHeroModel(perfume, locale, selectedCurrency, {
          description: slide.description || undefined,
          primaryCta: slide.buttonLabel || undefined,
        });
      })
      .filter((item): item is HeroModel => item !== null)
      .slice(0, HERO_MAX_SPOTLIGHTS);
  }, [homeHeader.rotationMode, homeHeader.slides, locale, selectedCurrency, selectedPerfumesMap]);

  const models = (homeHeader.mode === "rotating"
    ? (homeHeader.rotationMode === "selected" && curatedModels.length ? curatedModels : spotlights.slice(0, HERO_MAX_SPOTLIGHTS).map((perfume) => buildHeroModel(perfume, locale, selectedCurrency)))
    : []) as HeroModel[];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [videoRevealPulse, setVideoRevealPulse] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tiltResetRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inLoopPhaseRef = useRef(false);
  const goPrevious = () => {
    setActiveIndex((current) => (models.length ? (current - 1 + models.length) % models.length : 0));
  };
  const goNext = () => {
    setActiveIndex((current) => (models.length ? (current + 1) % models.length : 0));
  };

  useEffect(() => {
    if (models.length <= 1 || isPaused) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % models.length);
    }, HERO_ROTATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeIndex, isPaused, models.length]);

  useEffect(() => {
    setActiveIndex((current) => (models.length ? current % models.length : 0));
  }, [models.length]);

  useEffect(() => {
    return () => {
      if (tiltResetRef.current !== null) {
        window.clearTimeout(tiltResetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (homeHeader.mode !== "video") {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    let pulseTimer: number | null = null;
    let scheduledRevealTimer: number | null = null;

    const triggerRevealPulse = () => {
      // debug
      // eslint-disable-next-line no-console
      console.debug("Hero: triggerRevealPulse -> set true");
      setVideoRevealPulse(true);
      if (pulseTimer !== null) {
        // eslint-disable-next-line no-console
        console.debug("Hero: clearing previous pulseTimer");
        window.clearTimeout(pulseTimer);
      }

      // keep pulse class active for the full animation duration (10s) plus stagger buffer
      pulseTimer = window.setTimeout(() => {
        // eslint-disable-next-line no-console
        console.debug("Hero: pulseTimer fired -> set false");
        setVideoRevealPulse(false);
        pulseTimer = null;
      }, 11500);
    };

    const syncLoopWindow = () => {
      if (video.currentTime < HERO_VIDEO_LOOP_START || video.currentTime >= HERO_VIDEO_LOOP_END) {
        video.currentTime = HERO_VIDEO_LOOP_START;
      }
    };

    const handleLoadedMetadata = () => {
      // start from 0 on initial load; reveal pulse will trigger when we hit the loop start time
      inLoopPhaseRef.current = false;
      try {
        if (Math.abs(video.currentTime) > 0.01) {
          video.currentTime = 0;
        }
      } catch (e) {
        // ignore seeking errors in some browsers
      }

      // eslint-disable-next-line no-console
      console.debug("Hero: loadedmetadata currentTime=", video.currentTime);
      // schedule a reveal at the loop start to ensure it fires even if timeupdate misses
      try {
        const remaining = (HERO_VIDEO_LOOP_START - video.currentTime) * 1000;
        if (remaining > 150) {
          scheduledRevealTimer = window.setTimeout(() => {
            // eslint-disable-next-line no-console
            console.debug("Hero: scheduled reveal firing (loadedmetadata)");
            if (!inLoopPhaseRef.current) {
              inLoopPhaseRef.current = true;
              triggerRevealPulse();
            }
          }, remaining);
        } else if (video.currentTime >= HERO_VIDEO_LOOP_START) {
          if (!inLoopPhaseRef.current) {
            inLoopPhaseRef.current = true;
            triggerRevealPulse();
          }
        }
      } catch (e) {
        // ignore
      }

      void video.play().catch(() => {});
    };

    const handleTimeUpdate = () => {
      // debug
      // eslint-disable-next-line no-console
      console.debug("Hero: timeupdate", video.currentTime.toFixed(2), "inLoopPhase=", inLoopPhaseRef.current);

      // When we pass the loop start for the first time, enter loop phase and trigger reveal
      if (!inLoopPhaseRef.current && video.currentTime >= HERO_VIDEO_LOOP_START) {
        inLoopPhaseRef.current = true;
        // eslint-disable-next-line no-console
        console.debug("Hero: entering loop phase at", video.currentTime);
        triggerRevealPulse();
      }

      if (inLoopPhaseRef.current && video.currentTime >= HERO_VIDEO_LOOP_END) {
        // loop the reveal segment
        // eslint-disable-next-line no-console
        console.debug("Hero: loop end reached at", video.currentTime, "seeking to", HERO_VIDEO_LOOP_START);
        video.currentTime = HERO_VIDEO_LOOP_START;
        void video.play().catch(() => {});
        triggerRevealPulse();
      }
    };

    const handlePlay = () => {
      // no-op; let playback continue from 0 or loop segment
    };

    const handleSeeked = () => {
      // If user seeks outside loop window, ensure next timeupdate handles entering loop
      if (video.currentTime < HERO_VIDEO_LOOP_START) {
        inLoopPhaseRef.current = false;
      } else if (video.currentTime >= HERO_VIDEO_LOOP_START && video.currentTime < HERO_VIDEO_LOOP_END) {
        inLoopPhaseRef.current = true;
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("seeked", handleSeeked);

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("seeked", handleSeeked);

      if (pulseTimer !== null) {
        window.clearTimeout(pulseTimer);
      }

      if (scheduledRevealTimer !== null) {
        window.clearTimeout(scheduledRevealTimer);
      }
    };
  }, [homeHeader.mode, homeHeader.videoUrl]);

  const pulseTilt = (side: "left" | "right") => {
    const node = stageRef.current;
    if (!node) {
      return;
    }

    const nextClass = side === "left" ? "hero-shell-stage--pulse-left" : "hero-shell-stage--pulse-right";
    node.classList.remove("hero-shell-stage--pulse-left", "hero-shell-stage--pulse-right");
    void node.offsetWidth;
    node.classList.add(nextClass);

    if (tiltResetRef.current !== null) {
      window.clearTimeout(tiltResetRef.current);
    }

    tiltResetRef.current = window.setTimeout(() => {
      node.classList.remove(nextClass);
      tiltResetRef.current = null;
    }, 520);
  };

  if (homeHeader.mode === "video") {
    const videoCopy = buildVideoCopy(homeHeader, locale);

    return (
      <section className={`hero-shell hero-shell--video ${videoRevealPulse ? "hero-shell--video-pulse" : ""} hero-shell--lift relative overflow-hidden rounded-[34px] xl:rounded-[42px] mt-3 sm:mt-4`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(255,255,255,0.18),transparent_30%),linear-gradient(135deg,#0f0d12_0%,#18121a_36%,#28161f_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-95">
          <div
            className="hero-video-aura hero-aura-float absolute -left-24 top-[-8%] h-[34rem] w-[34rem] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255, 42, 154, 0.34) 0%, rgba(255, 42, 154, 0.16) 40%, rgba(255, 42, 154, 0) 72%)",
            }}
          />
          <div
            className="hero-video-aura hero-aura-float-delayed absolute right-[-10%] top-[-14%] h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255, 120, 214, 0.28) 0%, rgba(255, 120, 214, 0.12) 44%, rgba(255, 120, 214, 0) 74%)",
            }}
          />
          <div
            className="hero-video-aura hero-aura-float absolute bottom-[-16%] left-[32%] h-[22rem] w-[22rem] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.08) 42%, rgba(255, 255, 255, 0) 72%)",
            }}
          />
        </div>
        {
          // pink bubble particles (rendered above the gradient)
        }
        <div className="pointer-events-none absolute inset-0 hero-video-particles z-[2]">
          <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_82%_12%,rgba(250,196,231,0.24),transparent_28%),radial-gradient(circle_at_18%_84%,rgba(255,255,255,0.10),transparent_30%)]" />
          {
            // render bubbles
          }
          {/** bubbles generated once per mount */}
          {(() => {
            const count = 18;
            const children: ReactElement[] = [];
            for (let i = 0; i < count; i += 1) {
              const left = 6 + Math.round(Math.random() * 88);
              const top = 6 + Math.round(Math.random() * 78);
              const size = 10 + Math.round(Math.random() * 48);
              const delay = Math.round((i / count) * 600);

              // burst vector: random angle and distance
              const angle = Math.random() * Math.PI * 2;
              const distance = 120 + Math.round(Math.random() * 260); // px
              const dx = Math.round(Math.cos(angle) * distance);
              const dy = Math.round(Math.sin(angle) * -distance);

              const style = {
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                ['--delay' as any]: `${delay}ms`,
                ['--dx' as any]: `${dx}px`,
                ['--dy' as any]: `${dy}px`,
                ['--duration' as any]: `10000ms`,
              } as any;

              children.push(
                <span key={`hero-bubble-${i}`} className="bubble pointer-events-none absolute" style={style}>
                  <span className="bubble-circle absolute inset-0 rounded-full" aria-hidden />
                  <span
                    className="bubble-heart absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ width: `64%`, height: `64%` }}
                    aria-hidden
                  />
                </span>,
              );
            }

            return children;
          })()}
        </div>
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(14,10,14,0.18)_0%,rgba(14,10,14,0.32)_100%)]" />
        <div className="relative z-[3] mx-auto flex h-full max-w-[1540px] items-start px-4 pb-7 pt-4 text-white sm:px-6 sm:py-6 md:px-10 xl:px-12 xl:py-12">
          <div className="grid w-full gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
            <div className="hidden max-w-2xl lg:order-1 lg:block">
              <p className="text-[0.72rem] font-semibold tracking-[0.24em] text-white/62 uppercase">KAY ALI</p>
              <h1 className="mt-3 text-[clamp(2rem,7.8vw,4.9rem)] leading-[0.94] font-semibold tracking-[-0.06em] sm:text-[clamp(2.2rem,5.8vw,4.9rem)]">
                {videoCopy.title}
              </h1>
              <p className="mt-4 max-w-xl text-[0.94rem] leading-7 text-white/80 md:text-[1.04rem]">
                {videoCopy.description}
              </p>

              <div className="mt-6 hidden flex-wrap items-center gap-3 lg:flex">
                <Link
                  href={toLocalePath(videoCopy.ctaHref, locale)}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                >
                  {videoCopy.ctaLabel}
                </Link>
                <Link
                  href={toLocalePath("/catalog", locale)}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/6 px-6 text-sm font-semibold text-white transition hover:bg-white/12"
                >
                  {copy.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="relative isolate order-1 w-full lg:order-2 lg:mx-auto lg:max-w-[330px] xl:max-w-[380px]">
              <div className="hero-video-burst pointer-events-none absolute -inset-3 rounded-[2.3rem] bg-[radial-gradient(circle_at_50%_22%,rgba(255,68,169,0.34),transparent_56%),radial-gradient(circle_at_18%_82%,rgba(255,255,255,0.12),transparent_36%),radial-gradient(circle_at_82%_72%,rgba(255,123,219,0.24),transparent_34%)] blur-3xl hero-aura-float opacity-90" />
              <div className="hero-video-intro relative aspect-[9/16] overflow-hidden rounded-[1.7rem] border border-white/12 bg-black shadow-[0_36px_90px_rgba(0,0,0,0.42)] backdrop-blur-md sm:rounded-[2rem]">
                <div className="hero-video-surface absolute inset-0 overflow-hidden rounded-[inherit] bg-black">
                  <div className="hero-video-corner hero-video-corner--left" />
                  <div className="hero-video-corner hero-video-corner--right" />
                  <video
                    ref={videoRef}
                    className="block h-full w-full rounded-[inherit] object-cover"
                    src={homeHeader.videoUrl}
                    autoPlay
                    muted
                    loop={false}
                    playsInline
                    controls={false}
                    aria-label={homeHeader.videoTitle}
                  />
                  <div className="absolute inset-0 z-[2] flex items-end p-4 sm:hidden">
                    <div className="w-full rounded-[1.2rem] border border-white/16 bg-black/46 p-3 backdrop-blur-md">
                      <p className="text-[0.64rem] font-semibold tracking-[0.24em] text-white/62 uppercase">
                        KAY ALI
                      </p>
                      <h2 className="mt-2 text-[1.55rem] leading-[0.95] font-semibold tracking-[-0.06em] text-white">
                        {videoCopy.title}
                      </h2>
                      <p className="mt-2 text-[0.88rem] leading-6 text-white/82">
                        {videoCopy.description}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Link
                          href={toLocalePath(videoCopy.ctaHref, locale)}
                          className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-[0.82rem] font-semibold text-zinc-950"
                        >
                          {videoCopy.ctaLabel}
                        </Link>
                        <Link
                          href={toLocalePath("/catalog", locale)}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/8 px-4 text-[0.82rem] font-semibold text-white"
                        >
                          {copy.secondaryCta}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,transparent_0%,transparent_70%,rgba(0,0,0,0.52)_100%)]" />
              </div>
            </div>

            <div className="hidden space-y-4 lg:hidden">
              <div className="max-w-2xl">
                <p className="text-[0.68rem] font-semibold tracking-[0.24em] text-white/60 uppercase">KAY ALI</p>
                <h1 className="mt-2 text-[clamp(1.8rem,8.6vw,3.2rem)] leading-[0.95] font-semibold tracking-[-0.06em]">
                  {videoCopy.title}
                </h1>
                <p className="mt-3 max-w-xl text-[0.92rem] leading-6 text-white/80">
                  {videoCopy.description}
                </p>
              </div>

              <div className="hidden flex-wrap gap-3">
                <Link
                  href={toLocalePath(videoCopy.ctaHref, locale)}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-white px-5 text-[0.88rem] font-semibold text-zinc-950 transition hover:bg-zinc-100"
                >
                  {videoCopy.ctaLabel}
                </Link>
                <Link
                  href={toLocalePath("/catalog", locale)}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/20 bg-white/6 px-5 text-[0.88rem] font-semibold text-white transition hover:bg-white/12"
                >
                  {copy.secondaryCta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!models.length) {
    return (
      <section className="hero-shell relative overflow-hidden rounded-[34px] xl:rounded-[42px]">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(126deg, #111214 0%, #191a1f 36%, #2a2320 68%, #3a2a24 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_78%,rgba(244,209,176,0.36),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_22%,rgba(214,227,255,0.22),transparent_44%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-white/24 via-white/8 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] bg-gradient-to-l from-[#c5d0eb]/18 via-[#c5d0eb]/8 to-transparent xl:block" />
        <div className="hero-grain pointer-events-none absolute inset-0 opacity-[0.16]" />

        <div className="relative z-[3] mx-auto flex h-full max-w-[1540px] items-start px-6 py-16 text-white md:px-10 md:py-20 xl:py-24">
          <div className="max-w-[46rem] pt-28 md:pt-32 xl:max-w-[50rem] xl:pt-36">
            <p className="hero-fade-up hero-delay-1 mb-3 text-sm tracking-[0.2em] text-white/80 uppercase">
              {copy.fallbackEyebrow}
            </p>
            <h1 className="hero-fade-up hero-delay-2 text-5xl leading-[1.02] font-semibold md:text-7xl xl:text-[4.75rem] 2xl:text-[5rem]">
              {t.hero.title}
            </h1>
            <p className="hero-fade-up hero-delay-3 mt-6 max-w-xl text-base text-white/85 md:text-lg">
              {t.hero.description}
            </p>
            <div className="hero-fade-up hero-delay-4 mt-8 flex flex-wrap gap-3">
              <Link
                href={toLocalePath("/catalog", locale)}
                className="rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
              >
                {copy.fallbackPrimary}
              </Link>
              <Link
                href={toLocalePath("/catalog", locale)}
                className="rounded-full border border-white/70 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {t.hero.viewAll}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const activeModel = models[activeIndex] ?? models[0];

  return (
    <section
      className="hero-shell relative overflow-hidden rounded-[34px] xl:rounded-[42px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={stageRef}
        className="hero-shell-stage absolute inset-0 overflow-hidden rounded-[inherit]"
      >
      {models.map((model, index) => (
        <div
          key={model.perfume.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            background: model.theme.background,
          }}
        />
      ))}
      {models.map((model, index) => (
        <div
          key={`${model.perfume.id}-glow-primary`}
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            background: model.theme.glowPrimary,
          }}
        />
      ))}
      {models.map((model, index) => (
        <div
          key={`${model.perfume.id}-glow-secondary`}
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            background: model.theme.glowSecondary,
          }}
        />
      ))}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[58%]"
        style={{ background: activeModel.theme.leftSheen }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] xl:block"
        style={{ background: activeModel.theme.rightSheen }}
      />
      <div className="hero-grain pointer-events-none absolute inset-0 opacity-[0.14]" />
      {models.length > 1 ? (
        <>
          <button
            type="button"
            aria-label={locale === "ru" ? "Предыдущий аромат" : locale === "en" ? "Previous scent" : "Əvvəlki ətir"}
            onClick={() => {
              pulseTilt("left");
              goPrevious();
            }}
            className="hero-side-switcher hero-side-switcher--left"
          >
            <ArrowLeft size={18} weight="bold" className="hero-side-switcher__icon" />
          </button>
          <button
            type="button"
            aria-label={locale === "ru" ? "Следующий аромат" : locale === "en" ? "Next scent" : "Növbəti ətir"}
            onClick={() => {
              pulseTilt("right");
              goNext();
            }}
            className="hero-side-switcher hero-side-switcher--right"
          >
            <ArrowRight size={18} weight="bold" className="hero-side-switcher__icon" />
          </button>
        </>
      ) : null}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {models.map((model, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={`${model.perfume.id}-scene`}
              className="absolute inset-0 transition-[opacity,transform] duration-700"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? "translate3d(0, 0, 0)" : "translate3d(18px, 0, 0)",
              }}
            >
              {model.scene.ambient.slice(0, 1).map((sprite, spriteIndex) => (
                <div
                  key={`${model.perfume.id}-ambient-${spriteIndex}`}
                  className="hero-aura-float-delayed absolute hidden xl:block"
                  style={{
                    left: sprite.left,
                    top: sprite.top,
                    width: `${sprite.width}px`,
                    opacity: sprite.opacity,
                    transform: `rotate(${sprite.rotate}deg) scale(${sprite.scale})`,
                    filter: `blur(${sprite.blur}px) drop-shadow(0 18px 26px rgba(0, 0, 0, 0.12))`,
                  }}
                >
                  <Image
                    src={model.perfume.image}
                    alt=""
                    width={sprite.width}
                    height={Math.round(sprite.width * 1.75)}
                    sizes="180px"
                    className="h-auto w-full object-contain"
                    aria-hidden
                  />
                </div>
              ))}

              <div
                className="hero-aura-float absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{
                  left: `calc(${model.scene.main.left} + 8%)`,
                  top: `calc(${model.scene.main.top} + 23%)`,
                  height: `${Math.round(model.scene.main.width * 0.72)}px`,
                  width: `${Math.round(model.scene.main.width * 0.72)}px`,
                  background: model.theme.orb,
                  opacity: isActive ? 0.82 : 0,
                }}
              />

              <div
                className="absolute"
                style={{
                  left: model.scene.main.left,
                  top: model.scene.main.top,
                  width: `${model.scene.main.width}px`,
                  transform: `rotate(${model.scene.main.rotate}deg) scale(${model.scene.main.scale})`,
                  filter: `drop-shadow(0 28px 40px rgba(0, 0, 0, 0.26))`,
                }}
              >
                <Image
                  src={model.perfume.image}
                  alt={model.perfume.imageAlt || model.perfume.name}
                  width={model.scene.main.width}
                  height={Math.round(model.scene.main.width * 1.75)}
                  sizes="(max-width: 1023px) 0px, (max-width: 1279px) 34vw, 420px"
                  className="h-auto w-full object-contain"
                  quality={70}
                  priority={index === 0}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative z-[3] mx-auto flex h-full max-w-[1540px] px-5 py-5 text-white sm:px-6 sm:py-6 md:px-10 xl:py-14">
        <div className="w-full pt-[3.5rem] pr-[31vw] pb-[calc(env(safe-area-inset-bottom)+2.75rem)] sm:pt-[4.25rem] sm:pr-[28vw] sm:pb-[calc(env(safe-area-inset-bottom)+3rem)] md:pt-28 md:pr-0 md:pb-0 lg:max-w-[52rem] lg:pt-20 lg:pr-[20rem] xl:max-w-[56rem] xl:pr-[24rem]">
          <div key={activeModel.perfume.id} className="hero-reveal">
            <p className="text-[0.66rem] font-medium tracking-[0.22em] text-white/56 uppercase sm:text-[0.72rem] sm:tracking-[0.24em]">
              {activeModel.perfume.brand}
            </p>

            <h1 className="mt-3 max-w-[7.2ch] text-[clamp(1.9rem,9.5vw,2.7rem)] leading-[0.9] font-semibold tracking-[-0.06em] text-white sm:mt-4 sm:max-w-[8ch] md:max-w-[11ch] md:text-[clamp(2.4rem,4.6vw,3.9rem)] md:leading-[0.94] md:tracking-[-0.05em]">
              {activeModel.title}
            </h1>
            <p className="mt-3 max-w-[15rem] text-[0.88rem] leading-[1.32rem] text-white/74 sm:mt-4 sm:max-w-[16.5rem] sm:text-[0.93rem] sm:leading-[1.42rem] md:max-w-[36rem] md:text-[0.98rem] md:leading-7">
              {activeModel.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.8rem] text-white/68 sm:mt-5 sm:gap-3 sm:text-sm">
              <span className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1 font-semibold tracking-[0.16em] text-white/58 uppercase">
                {copy.priceLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-[0.94rem] font-medium text-white shadow-[0_12px_24px_rgba(0,0,0,0.12)] sm:text-[1.05rem]">
                {activeModel.priceLabel}
              </span>
            </div>

            <div className="mt-6 grid max-w-[14rem] gap-2.5 sm:mt-7 sm:max-w-[15rem] md:max-w-[22rem] md:gap-3 lg:max-w-none lg:flex lg:flex-wrap">
              <Link
                href={toLocalePath(`/perfumes/${activeModel.perfume.slug}`, locale)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100 lg:w-auto"
              >
                <span>{activeModel.primaryCta}</span>
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href={toLocalePath("/catalog", locale)}
                className="inline-flex min-h-9 items-center justify-start px-1 text-[0.86rem] font-medium text-white/78 transition hover:text-white md:min-h-11 md:w-full md:justify-center md:rounded-full md:border md:border-white/20 md:bg-white/6 md:px-5 md:text-sm lg:w-auto"
              >
                {copy.secondaryCta}
              </Link>
            </div>

            <div className="mt-5 max-w-[14rem] sm:mt-6 sm:max-w-[15rem] md:max-w-none md:mt-8">
              <p className="hidden text-[0.68rem] font-semibold tracking-[0.18em] text-white/55 uppercase sm:text-[0.72rem] sm:tracking-[0.2em] md:block">
                {copy.notesLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 md:hidden">
                {activeModel.notePills.slice(0, 2).map((note) => (
                  <span
                    key={note}
                    className="rounded-full border border-white/12 bg-white/7 px-3 py-1.5 text-[0.76rem] font-medium text-white/76"
                  >
                    {note}
                  </span>
                ))}
              </div>
              <p className="mt-3 hidden text-[0.95rem] text-white/72 md:block">
                {activeModel.notePills.join(" / ")}
              </p>
            </div>

            <div className="relative mt-8 hidden h-[248px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/10 shadow-[0_18px_36px_rgba(0,0,0,0.16)] md:block lg:hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle_at_50%_42%, ${activeModel.theme.accentSoft} 0%, transparent 56%)`,
                }}
              />
              <div
                className="hero-aura-float absolute left-1/2 top-1/2 h-[8.75rem] w-[8.75rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-[10.5rem] sm:w-[10.5rem]"
                style={{ background: activeModel.theme.orb }}
              />
              <div className="absolute inset-x-8 bottom-4 top-7 sm:inset-x-10 sm:bottom-5 sm:top-8">
                <Image
                  src={activeModel.perfume.image}
                  alt={activeModel.perfume.imageAlt || activeModel.perfume.name}
                  fill
                  sizes="(max-width: 767px) 0px, (max-width: 1023px) 280px, 0px"
                  className="object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.34)]"
                  quality={70}
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-[0.35rem] z-[2] h-[14.25rem] w-[40vw] max-w-[10rem] md:hidden">
        <div
          className="absolute left-1/2 top-[40%] h-[7rem] w-[7rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: activeModel.theme.orb }}
        />
        <div className="absolute inset-x-[6%] bottom-[1rem] h-[1rem] rounded-full bg-black/24 blur-2xl" />
        <Image
          src={activeModel.perfume.image}
          alt={activeModel.perfume.imageAlt || activeModel.perfume.name}
          fill
          sizes="(max-width: 767px) 44vw, 0px"
          className="object-contain object-bottom drop-shadow-[0_24px_40px_rgba(0,0,0,0.28)]"
          quality={70}
          priority
        />
      </div>
      </div>
    </section>
  );
}
