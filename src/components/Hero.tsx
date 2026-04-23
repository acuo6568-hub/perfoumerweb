"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatCurrencyFromAzn, type SupportedCurrency } from "@/lib/currency";
import { getDictionary, toLocalePath, type Locale } from "@/lib/i18n";
import type { Perfume } from "@/types/catalog";

type HeroProps = {
  locale: Locale;
  spotlights: Perfume[];
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
  };
}

export function Hero({ locale, spotlights }: HeroProps) {
  const t = getDictionary(locale);
  const copy = heroUiCopy[locale];
  const { selectedCurrency } = useCurrency();
  const models = spotlights
    .slice(0, HERO_MAX_SPOTLIGHTS)
    .map((perfume) => buildHeroModel(perfume, locale, selectedCurrency));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tiltResetRef = useRef<number | null>(null);
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
                  sizes="(max-width: 1280px) 34vw, 420px"
                  className="h-auto w-full object-contain"
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
                  sizes="78vw"
                  className="object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.34)]"
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
          sizes="40vw"
          className="object-contain object-bottom drop-shadow-[0_24px_40px_rgba(0,0,0,0.28)]"
          priority
        />
      </div>
      </div>
    </section>
  );
}
