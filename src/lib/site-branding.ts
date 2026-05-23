export type SitePromotionMode = "manual" | "discount";
export type SitePromotionLocale = "az" | "en" | "ru";
export type SitePromotionTextMap = Record<SitePromotionLocale, string>;

export type SitePromotionSettings = {
  enabled: boolean;
  mode: SitePromotionMode;
  text: string;
  textByLocale: SitePromotionTextMap;
  linkHref: string;
  linkLabel: string;
  linkLabelByLocale: SitePromotionTextMap;
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
  messages?: string[];
};

const DEFAULT_PROMOTION_TEXT = "Limited-time offers are live now.";

const DEFAULT_PROMOTION_SETTINGS: SitePromotionSettings = {
  enabled: false,
  mode: "manual",
  text: DEFAULT_PROMOTION_TEXT,
  textByLocale: {
    az: DEFAULT_PROMOTION_TEXT,
    en: DEFAULT_PROMOTION_TEXT,
    ru: DEFAULT_PROMOTION_TEXT,
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
  messages: [],
};

function normalizePromotionText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePromotionHexColor(value: unknown, fallback: string) {
  const normalized = normalizePromotionText(value);
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized) ? normalized : fallback;
}

function normalizePromotionSpeed(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(120, Math.max(8, Math.round(parsed)));
}

function normalizePromotionTextMap(value: unknown): SitePromotionTextMap {
  const settings = (value && typeof value === "object" ? value : {}) as {
    az?: unknown;
    en?: unknown;
    ru?: unknown;
  };

  const fallback = normalizePromotionText(value);
  const az = normalizePromotionText(settings.az) || fallback || DEFAULT_PROMOTION_SETTINGS.text;
  const en = normalizePromotionText(settings.en) || fallback || DEFAULT_PROMOTION_SETTINGS.text;
  const ru = normalizePromotionText(settings.ru) || fallback || DEFAULT_PROMOTION_SETTINGS.text;

  return { az, en, ru };
}

function normalizePromotionSlugList(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizePromotionText(item).toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  return [] as string[];
}

function normalizePromotionSettings(value: unknown): SitePromotionSettings {
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

  const mode = normalizePromotionText(settings.mode) === "discount" ? "discount" : "manual";
  const textByLocale = normalizePromotionTextMap(settings.textByLocale ?? settings.text);
  const linkLabelByLocale = normalizePromotionTextMap(settings.linkLabelByLocale ?? settings.linkLabel);
  const sourcePerfumeSlugs = normalizePromotionSlugList(
    settings.sourcePerfumeSlugs ?? settings.sourcePerfumeSlug,
  );

  const messages = Array.isArray((settings as any).messages)
    ? (settings as any).messages.map((m: unknown) => normalizePromotionText(m)).filter(Boolean)
    : [] as string[];

  return {
    enabled: Boolean(settings.enabled),
    mode,
    text: textByLocale.az || textByLocale.en || textByLocale.ru || DEFAULT_PROMOTION_SETTINGS.text,
    textByLocale,
    linkHref: normalizePromotionText(settings.linkHref),
    linkLabel: normalizePromotionText(settings.linkLabel) || DEFAULT_PROMOTION_SETTINGS.linkLabel,
    linkLabelByLocale,
    backgroundMode: normalizePromotionText(settings.backgroundMode) === "gradient" ? "gradient" : "solid",
    backgroundColor: normalizePromotionHexColor(
      settings.backgroundColor,
      DEFAULT_PROMOTION_SETTINGS.backgroundColor,
    ),
    gradientFrom: normalizePromotionHexColor(settings.gradientFrom, DEFAULT_PROMOTION_SETTINGS.gradientFrom),
    gradientTo: normalizePromotionHexColor(settings.gradientTo, DEFAULT_PROMOTION_SETTINGS.gradientTo),
    gradientAngle: Math.min(180, Math.max(0, Number(settings.gradientAngle) || DEFAULT_PROMOTION_SETTINGS.gradientAngle)),
    textColor: normalizePromotionHexColor(settings.textColor, DEFAULT_PROMOTION_SETTINGS.textColor),
    speed: normalizePromotionSpeed(settings.speed, DEFAULT_PROMOTION_SETTINGS.speed),
    closable: Boolean(settings.closable ?? DEFAULT_PROMOTION_SETTINGS.closable),
    countdownEnabled: Boolean(settings.countdownEnabled ?? DEFAULT_PROMOTION_SETTINGS.countdownEnabled),
    scheduleStartAt: normalizePromotionText(settings.scheduleStartAt),
    scheduleEndAt: normalizePromotionText(settings.scheduleEndAt),
    mobileHeight: Math.min(84, Math.max(40, Math.round(Number(settings.mobileHeight) || DEFAULT_PROMOTION_SETTINGS.mobileHeight))),
    mobileTextScale: Math.min(1.25, Math.max(0.8, Number(settings.mobileTextScale) || DEFAULT_PROMOTION_SETTINGS.mobileTextScale)),
    mobilePaddingX: Math.min(28, Math.max(8, Math.round(Number(settings.mobilePaddingX) || DEFAULT_PROMOTION_SETTINGS.mobilePaddingX))),
    sourcePerfumeSlug: sourcePerfumeSlugs[0] ?? "",
    sourcePerfumeSlugs,
    messages,
  };
}

function parseDate(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function isPromotionActiveAt(promotion: SitePromotionSettings | null | undefined, at = new Date()) {
  if (!promotion?.enabled) {
    return false;
  }

  const start = parseDate(promotion.scheduleStartAt);
  const end = parseDate(promotion.scheduleEndAt);
  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

export function getPromotionCountdownTarget(promotion: SitePromotionSettings | null | undefined) {
  return parseDate(promotion?.scheduleEndAt || "");
}

export function getPromotionTextForLocale(
  promotion: SitePromotionSettings | null | undefined,
  locale: SitePromotionLocale,
) {
  if (!promotion) {
    return "";
  }

  const localized =
    normalizePromotionText(promotion.textByLocale?.[locale]) ||
    normalizePromotionText(promotion.textByLocale?.az) ||
    normalizePromotionText(promotion.textByLocale?.en) ||
    normalizePromotionText(promotion.textByLocale?.ru);

  if (localized) return localized;

  if (Array.isArray(promotion.messages) && promotion.messages.length) {
    return normalizePromotionText(promotion.messages[0]);
  }

  return normalizePromotionText(promotion.text);
}

export function getPromotionLinkLabelForLocale(
  promotion: SitePromotionSettings | null | undefined,
  locale: SitePromotionLocale,
) {
  if (!promotion) {
    return "";
  }

  return (
    normalizePromotionText(promotion.linkLabelByLocale?.[locale]) ||
    normalizePromotionText(promotion.linkLabelByLocale?.az) ||
    normalizePromotionText(promotion.linkLabelByLocale?.en) ||
    normalizePromotionText(promotion.linkLabelByLocale?.ru) ||
    normalizePromotionText(promotion.linkLabel)
  );
}

export const DEFAULT_SITE_NAME = "Perfoumer";
export const DEFAULT_SITE_DOMAIN = "perfoumer.az";

export type SiteSettings = {
  siteName: string;
  siteDomain: string;
  siteTitle: string;
  siteDescription: string;
  metaKeywords: string[];
  openGraphTitle: string;
  openGraphDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  promotions: SitePromotionSettings;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSiteName(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || DEFAULT_SITE_NAME;
}

export function normalizeSiteDomain(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || DEFAULT_SITE_DOMAIN;
}

export function normalizeKeywordList(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizeString(item))
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  return [] as string[];
}

export function normalizeSiteSettings(value: unknown): SiteSettings {
  const settings = (value && typeof value === "object" ? value : {}) as {
    siteName?: unknown;
    siteDomain?: unknown;
    siteTitle?: unknown;
    siteDescription?: unknown;
    metaKeywords?: unknown;
    openGraphTitle?: unknown;
    openGraphDescription?: unknown;
    twitterTitle?: unknown;
    twitterDescription?: unknown;
    promotions?: unknown;
  };
  const siteName = normalizeSiteName(settings.siteName);
  const siteDomain = normalizeSiteDomain(settings.siteDomain);
  const defaultTitle = buildDefaultSiteTitle(siteName);
  const defaultDescription = buildDefaultSiteDescription(siteName);

  return {
    siteName,
    siteDomain,
    siteTitle: normalizeString(settings.siteTitle) || defaultTitle,
    siteDescription: normalizeString(settings.siteDescription) || defaultDescription,
    metaKeywords: normalizeKeywordList(settings.metaKeywords),
    openGraphTitle: normalizeString(settings.openGraphTitle) || defaultTitle,
    openGraphDescription:
      normalizeString(settings.openGraphDescription) || defaultDescription,
    twitterTitle: normalizeString(settings.twitterTitle) || defaultTitle,
    twitterDescription:
      normalizeString(settings.twitterDescription) || defaultDescription,
    promotions: normalizePromotionSettings(settings.promotions ?? DEFAULT_PROMOTION_SETTINGS),
  };
}

export function buildDefaultSiteTitle(siteName: string) {
  return `${siteName} | Orijinal və Premium Ətirlər`;
}

export function buildDefaultSiteDescription(siteName: string) {
  return `${siteName}-də orijinal və uzunömürlü kişi və qadın ətirlərini kəşf edin. Lüks, niş və dizayner brendləri, sürətli çatdırılma və xüsusi kolleksiyalar - hamısı bir onlayn ətir mağazasında.`;
}

export function applySiteBrandingToText(text: string, settings: SiteSettings) {
  return text
    .replaceAll("Perfoumer.az", settings.siteDomain)
    .replaceAll("perfoumer.az", settings.siteDomain.toLowerCase())
    .replaceAll("PERFOUMER.AZ", settings.siteDomain.toUpperCase())
    .replaceAll("Perfoumer", settings.siteName)
    .replaceAll("PERFOUMER", settings.siteName.toUpperCase());
}

export function applySiteBranding<T>(value: T, settings: SiteSettings): T {
  if (typeof value === "string") {
    return applySiteBrandingToText(value, settings) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => applySiteBranding(item, settings)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, applySiteBranding(item, settings)]),
    ) as T;
  }

  return value;
}
