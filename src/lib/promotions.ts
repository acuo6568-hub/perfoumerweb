export type SitePromotionMode = "manual" | "discount";
export type SitePromotionLocale = "az" | "en" | "ru";

export type SitePromotionSettings = {
  enabled: boolean;
  mode: SitePromotionMode;
  text: string;
  textByLocale: Record<SitePromotionLocale, string>;
  linkHref: string;
  linkLabel: string;
  linkLabelByLocale: Record<SitePromotionLocale, string>;
  backgroundMode: "solid" | "gradient";
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  textColor: string;
  speed: number;
  closable: boolean;
  countdownEnabled: boolean;
  scheduleStartAt: string;
  scheduleEndAt: string;
  mobileHeight: number;
  mobileTextScale: number;
  mobilePaddingX: number;
  sourcePerfumeSlug: string;
  sourcePerfumeSlugs: string[];
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHexColor(value: unknown, fallback: string) {
  const normalized = normalizeString(value);
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized) ? normalized : fallback;
}

function normalizeSpeed(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(120, Math.max(8, Math.round(parsed)));
}

export const DEFAULT_PROMOTION_SETTINGS: SitePromotionSettings = {
  enabled: false,
  mode: "manual",
  text: "Limited-time offers are live now.",
  textByLocale: {
    az: "Limited-time offers are live now.",
    en: "Limited-time offers are live now.",
    ru: "Limited-time offers are live now.",
  },
  linkHref: "",
  linkLabel: "View offer",
  linkLabelByLocale: {
    az: "View offer",
    en: "View offer",
    ru: "View offer",
  },
  backgroundMode: "solid",
  backgroundColor: "#111111",
  gradientFrom: "#111111",
  gradientTo: "#2d2d2d",
  gradientAngle: 110,
  textColor: "#ffffff",
  speed: 28,
  closable: true,
  countdownEnabled: false,
  scheduleStartAt: "",
  scheduleEndAt: "",
  mobileHeight: 52,
  mobileTextScale: 0.94,
  mobilePaddingX: 16,
  sourcePerfumeSlug: "",
  sourcePerfumeSlugs: [],
};

export function normalizePromotionSettings(value: unknown): SitePromotionSettings {
  const settings = (value && typeof value === "object" ? value : {}) as {
    enabled?: unknown;
    mode?: unknown;
    text?: unknown;
    textByLocale?: unknown;
    linkHref?: unknown;
    linkLabel?: unknown;
    linkLabelByLocale?: unknown;
    backgroundMode?: unknown;
    backgroundColor?: unknown;
    gradientFrom?: unknown;
    gradientTo?: unknown;
    gradientAngle?: unknown;
    textColor?: unknown;
    speed?: unknown;
    closable?: unknown;
    countdownEnabled?: unknown;
    scheduleStartAt?: unknown;
    scheduleEndAt?: unknown;
    mobileHeight?: unknown;
    mobileTextScale?: unknown;
    mobilePaddingX?: unknown;
    sourcePerfumeSlug?: unknown;
    sourcePerfumeSlugs?: unknown;
  };

  const mode = normalizeString(settings.mode) === "discount" ? "discount" : "manual";
  const text = normalizeString(settings.text) || DEFAULT_PROMOTION_SETTINGS.text;
  const textByLocaleSource =
    settings.textByLocale && typeof settings.textByLocale === "object"
      ? (settings.textByLocale as Partial<Record<SitePromotionLocale, unknown>>)
      : {};
  const linkLabelByLocaleSource =
    settings.linkLabelByLocale && typeof settings.linkLabelByLocale === "object"
      ? (settings.linkLabelByLocale as Partial<Record<SitePromotionLocale, unknown>>)
      : {};
  const sourcePerfumeSlugs = Array.isArray(settings.sourcePerfumeSlugs)
    ? Array.from(
        new Set(
          settings.sourcePerfumeSlugs
            .map((item) => normalizeString(item).toLowerCase())
            .filter(Boolean),
        ),
      )
    : typeof settings.sourcePerfumeSlug === "string" && settings.sourcePerfumeSlug.trim()
      ? [settings.sourcePerfumeSlug.trim().toLowerCase()]
      : [];

  return {
    enabled: Boolean(settings.enabled),
    mode,
    text,
    textByLocale: {
      az: normalizeString(textByLocaleSource.az) || text,
      en: normalizeString(textByLocaleSource.en) || text,
      ru: normalizeString(textByLocaleSource.ru) || text,
    },
    linkHref: normalizeString(settings.linkHref),
    linkLabel: normalizeString(settings.linkLabel) || DEFAULT_PROMOTION_SETTINGS.linkLabel,
    linkLabelByLocale: {
      az: normalizeString(linkLabelByLocaleSource.az) || normalizeString(settings.linkLabel) || DEFAULT_PROMOTION_SETTINGS.linkLabel,
      en: normalizeString(linkLabelByLocaleSource.en) || normalizeString(settings.linkLabel) || DEFAULT_PROMOTION_SETTINGS.linkLabel,
      ru: normalizeString(linkLabelByLocaleSource.ru) || normalizeString(settings.linkLabel) || DEFAULT_PROMOTION_SETTINGS.linkLabel,
    },
    backgroundMode: normalizeString(settings.backgroundMode) === "gradient" ? "gradient" : "solid",
    backgroundColor: normalizeHexColor(settings.backgroundColor, DEFAULT_PROMOTION_SETTINGS.backgroundColor),
    gradientFrom: normalizeHexColor(settings.gradientFrom, DEFAULT_PROMOTION_SETTINGS.gradientFrom),
    gradientTo: normalizeHexColor(settings.gradientTo, DEFAULT_PROMOTION_SETTINGS.gradientTo),
    gradientAngle: Math.min(180, Math.max(0, Number(settings.gradientAngle) || DEFAULT_PROMOTION_SETTINGS.gradientAngle)),
    textColor: normalizeHexColor(settings.textColor, DEFAULT_PROMOTION_SETTINGS.textColor),
    speed: normalizeSpeed(settings.speed, DEFAULT_PROMOTION_SETTINGS.speed),
    closable: Boolean(settings.closable ?? DEFAULT_PROMOTION_SETTINGS.closable),
    countdownEnabled: Boolean(settings.countdownEnabled ?? DEFAULT_PROMOTION_SETTINGS.countdownEnabled),
    scheduleStartAt: normalizeString(settings.scheduleStartAt),
    scheduleEndAt: normalizeString(settings.scheduleEndAt),
    mobileHeight: Math.min(84, Math.max(40, Math.round(Number(settings.mobileHeight) || DEFAULT_PROMOTION_SETTINGS.mobileHeight))),
    mobileTextScale: Math.min(1.25, Math.max(0.8, Number(settings.mobileTextScale) || DEFAULT_PROMOTION_SETTINGS.mobileTextScale)),
    mobilePaddingX: Math.min(28, Math.max(8, Math.round(Number(settings.mobilePaddingX) || DEFAULT_PROMOTION_SETTINGS.mobilePaddingX))),
    sourcePerfumeSlug: sourcePerfumeSlugs[0] ?? "",
    sourcePerfumeSlugs,
  };
}

function parseTime(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function isPromotionActiveAt(
  promotion: SitePromotionSettings | null | undefined,
  at = new Date(),
) {
  if (!promotion?.enabled) {
    return false;
  }

  const start = parseTime(promotion.scheduleStartAt);
  const end = parseTime(promotion.scheduleEndAt);
  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

export function getPromotionCountdownTarget(promotion: SitePromotionSettings | null | undefined) {
  return parseTime(promotion?.scheduleEndAt || "");
}

export function buildPromotionStorageKey(settings: SitePromotionSettings) {
  return [
    settings.mode,
    settings.enabled ? "1" : "0",
    settings.text,
    settings.linkHref,
    settings.linkLabel,
    settings.linkLabelByLocale.az,
    settings.linkLabelByLocale.en,
    settings.linkLabelByLocale.ru,
    settings.backgroundMode,
    settings.backgroundColor,
    settings.gradientFrom,
    settings.gradientTo,
    String(settings.gradientAngle),
    settings.scheduleStartAt,
    settings.scheduleEndAt,
    String(settings.mobileHeight),
    String(settings.mobileTextScale),
    String(settings.mobilePaddingX),
    settings.sourcePerfumeSlug,
    settings.backgroundColor,
    settings.textColor,
    String(settings.speed),
  ].join("|");
}
