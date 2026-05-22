export type SitePromotionMode = "manual" | "discount";

export type SitePromotionSettings = {
  enabled: boolean;
  mode: SitePromotionMode;
  text: string;
  linkHref: string;
  linkLabel: string;
  backgroundColor: string;
  textColor: string;
  speed: number;
  closable: boolean;
  sourcePerfumeSlug: string;
};

const DEFAULT_PROMOTION_SETTINGS: SitePromotionSettings = {
  enabled: false,
  mode: "manual",
  text: "Limited-time offers are live now.",
  linkHref: "",
  linkLabel: "View offer",
  backgroundColor: "#111111",
  textColor: "#ffffff",
  speed: 28,
  closable: true,
  sourcePerfumeSlug: "",
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

function normalizePromotionSettings(value: unknown): SitePromotionSettings {
  const settings = (value && typeof value === "object" ? value : {}) as {
    enabled?: unknown;
    mode?: unknown;
    text?: unknown;
    linkHref?: unknown;
    linkLabel?: unknown;
    backgroundColor?: unknown;
    textColor?: unknown;
    speed?: unknown;
    closable?: unknown;
    sourcePerfumeSlug?: unknown;
  };

  const mode = normalizePromotionText(settings.mode) === "discount" ? "discount" : "manual";

  return {
    enabled: Boolean(settings.enabled),
    mode,
    text: normalizePromotionText(settings.text) || DEFAULT_PROMOTION_SETTINGS.text,
    linkHref: normalizePromotionText(settings.linkHref),
    linkLabel: normalizePromotionText(settings.linkLabel) || DEFAULT_PROMOTION_SETTINGS.linkLabel,
    backgroundColor: normalizePromotionHexColor(
      settings.backgroundColor,
      DEFAULT_PROMOTION_SETTINGS.backgroundColor,
    ),
    textColor: normalizePromotionHexColor(settings.textColor, DEFAULT_PROMOTION_SETTINGS.textColor),
    speed: normalizePromotionSpeed(settings.speed, DEFAULT_PROMOTION_SETTINGS.speed),
    closable: Boolean(settings.closable ?? DEFAULT_PROMOTION_SETTINGS.closable),
    sourcePerfumeSlug: normalizePromotionText(settings.sourcePerfumeSlug).toLowerCase(),
  };
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
