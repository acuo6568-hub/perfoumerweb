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
  backgroundColor: string;
  textColor: string;
  speed: number;
  closable: boolean;
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
  backgroundColor: "#111111",
  textColor: "#ffffff",
  speed: 28,
  closable: true,
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
    backgroundColor?: unknown;
    textColor?: unknown;
    speed?: unknown;
    closable?: unknown;
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
    backgroundColor: normalizeHexColor(settings.backgroundColor, DEFAULT_PROMOTION_SETTINGS.backgroundColor),
    textColor: normalizeHexColor(settings.textColor, DEFAULT_PROMOTION_SETTINGS.textColor),
    speed: normalizeSpeed(settings.speed, DEFAULT_PROMOTION_SETTINGS.speed),
    closable: Boolean(settings.closable ?? DEFAULT_PROMOTION_SETTINGS.closable),
    sourcePerfumeSlug: sourcePerfumeSlugs[0] ?? "",
    sourcePerfumeSlugs,
  };
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
    settings.sourcePerfumeSlug,
    settings.backgroundColor,
    settings.textColor,
    String(settings.speed),
  ].join("|");
}
