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
