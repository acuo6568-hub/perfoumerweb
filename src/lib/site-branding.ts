export type SitePromotionMode = "manual" | "discount";
export type SitePromotionLocale = "az" | "en" | "ru";
export type SitePromotionTextMap = Record<SitePromotionLocale, string>;

export type SiteHomeHeaderMode = "video" | "rotating";
export type SiteHomeHeaderRotationMode = "random" | "selected";

export type SiteHomeHeaderSlide = {
  perfumeSlug: string;
  buttonLabel: string;
  description: string;
};

export type SiteHomeHeaderSettings = {
  mode: SiteHomeHeaderMode;
  videoUrl: string;
  videoTitle: string;
  videoDescription: string;
  videoCtaLabel: string;
  videoTitleByLocale?: SitePromotionTextMap;
  videoDescriptionByLocale?: SitePromotionTextMap;
  videoCtaLabelByLocale?: SitePromotionTextMap;
  videoCtaHref: string;
  rotationMode: SiteHomeHeaderRotationMode;
  slides: SiteHomeHeaderSlide[];
};

export type WeatherTemperatureRule = {
  id: string;
  min: number | null;
  max: number | null;
  recommend: string[];
  avoid: string[];
  goodFor: string[];
};

export type WeatherConditionRule = {
  condition: "rainy" | "windy" | "humid" | "day" | "night";
  recommend: string[];
  avoid: string[];
  boost: string[];
};

export type SiteWeatherSettings = {
  enabled: boolean;
  homepageEnabled: boolean;
  catalogEnabled: boolean;
  qoxunuEnabled: boolean;
  defaultCity: string;
  productLimit: number;
  cacheMinutes: number;
  temperatureRules: WeatherTemperatureRule[];
  conditionRules: WeatherConditionRule[];
};

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

export const DEFAULT_HOME_HEADER_SETTINGS: SiteHomeHeaderSettings = {
  mode: "rotating",
  videoUrl: "/perfumevid.MP4",
  videoTitle: "KAY ALI Perfumes",
  videoDescription: "Discover the full KAY ALI collection in a modern TikTok-style video header.",
  videoCtaLabel: "View all brands",
  videoTitleByLocale: {
    az: "KAY ALI",
    en: "KAY ALI Perfumes",
    ru: "KAY ALI Perfumes",
  },
  videoDescriptionByLocale: {
    az: "KAY ALI kolleksiyasını kəşf edin.",
    en: "Discover the full KAY ALI collection.",
    ru: "Откройте всю коллекцию KAY ALI.",
  },
  videoCtaLabelByLocale: {
    az: "Bütün qoxulara bax",
    en: "View all brands",
    ru: "Все бренды",
  },
  videoCtaHref: "/brands",
  rotationMode: "random",
  slides: [],
};

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

export const DEFAULT_WEATHER_SETTINGS: SiteWeatherSettings = {
  enabled: true,
  homepageEnabled: true,
  catalogEnabled: true,
  qoxunuEnabled: true,
  defaultCity: "Bakı",
  productLimit: 6,
  cacheMinutes: 30,
  temperatureRules: [
    {
      id: "hot",
      min: 28,
      max: null,
      recommend: ["fresh", "citrus", "aquatic", "green", "neroli", "musk", "tea"],
      avoid: ["oud", "tobacco", "heavy-vanilla", "leather", "very-sweet"],
      goodFor: ["daily", "office", "summer"],
    },
    {
      id: "mild",
      min: 20,
      max: 27,
      recommend: ["floral", "citrus", "clean-musk", "soft-woody", "fruity-fresh"],
      avoid: [],
      goodFor: ["daily", "office", "university", "casual"],
    },
    {
      id: "cool",
      min: 10,
      max: 19,
      recommend: ["amber", "woody", "vanilla", "musk", "iris", "patchouli", "spicy"],
      avoid: [],
      goodFor: ["date", "evening", "formal"],
    },
    {
      id: "cold",
      min: null,
      max: 9,
      recommend: ["oud", "tobacco", "leather", "amber", "vanilla", "tonka", "incense", "warm-spicy"],
      avoid: [],
      goodFor: ["night", "winter", "strong-signature"],
    },
  ],
  conditionRules: [
    { condition: "rainy", recommend: ["woody", "clean-musk", "iris", "tea", "soft-amber"], avoid: ["very-sweet", "tropical"], boost: [] },
    { condition: "windy", recommend: [], avoid: [], boost: ["strong-projection", "long-lasting"] },
    { condition: "humid", recommend: ["light-citrus", "aquatic", "fresh-green", "clean-musk"], avoid: ["heavy-sweet", "oud", "tobacco"], boost: [] },
    { condition: "night", recommend: [], avoid: [], boost: ["amber", "vanilla", "oud", "tobacco", "musk", "date-night"] },
    { condition: "day", recommend: [], avoid: [], boost: ["fresh", "citrus", "clean", "office-safe"] },
  ],
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

function normalizeHomeHeaderSlide(value: unknown): SiteHomeHeaderSlide | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const slide = value as {
    perfumeSlug?: unknown;
    buttonLabel?: unknown;
    description?: unknown;
  };

  const perfumeSlug = normalizePromotionText(slide.perfumeSlug).toLowerCase();
  if (!perfumeSlug) {
    return null;
  }

  return {
    perfumeSlug,
    buttonLabel: normalizePromotionText(slide.buttonLabel) || "View perfume",
    description: normalizePromotionText(slide.description),
  };
}

function normalizeHomeHeaderSettings(value: unknown): SiteHomeHeaderSettings {
  const settings = (value && typeof value === "object" ? value : {}) as {
    mode?: unknown;
    videoUrl?: unknown;
    videoTitle?: unknown;
    videoDescription?: unknown;
    videoCtaLabel?: unknown;
    videoTitleByLocale?: unknown;
    videoDescriptionByLocale?: unknown;
    videoCtaLabelByLocale?: unknown;
    videoCtaHref?: unknown;
    rotationMode?: unknown;
    slides?: unknown;
  };

  const mode = normalizePromotionText(settings.mode) === "video" ? "video" : "rotating";
  const rotationMode =
    normalizePromotionText(settings.rotationMode) === "selected" ? "selected" : "random";
  const slides = Array.isArray(settings.slides)
    ? settings.slides.map(normalizeHomeHeaderSlide).filter((item): item is SiteHomeHeaderSlide => item !== null)
    : [];

  return {
    mode,
    videoUrl: normalizePromotionText(settings.videoUrl) || DEFAULT_HOME_HEADER_SETTINGS.videoUrl,
    videoTitle: normalizePromotionText(settings.videoTitle) || DEFAULT_HOME_HEADER_SETTINGS.videoTitle,
    videoDescription:
      normalizePromotionText(settings.videoDescription) || DEFAULT_HOME_HEADER_SETTINGS.videoDescription,
    videoCtaLabel:
      normalizePromotionText(settings.videoCtaLabel) || DEFAULT_HOME_HEADER_SETTINGS.videoCtaLabel,
    videoTitleByLocale: normalizePromotionTextMap(settings.videoTitleByLocale ?? settings.videoTitle),
    videoDescriptionByLocale: normalizePromotionTextMap(settings.videoDescriptionByLocale ?? settings.videoDescription),
    videoCtaLabelByLocale: normalizePromotionTextMap(settings.videoCtaLabelByLocale ?? settings.videoCtaLabel),
    videoCtaHref: normalizePromotionText(settings.videoCtaHref) || DEFAULT_HOME_HEADER_SETTINGS.videoCtaHref,
    rotationMode,
    slides,
  };
}

function normalizeWeatherStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePromotionText(item).toLowerCase()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [] as string[];
}

function normalizeWeatherTemperatureRule(value: unknown, fallback: WeatherTemperatureRule): WeatherTemperatureRule {
  const rule = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const min = rule.min === null || rule.min === "" ? null : Number(rule.min);
  const max = rule.max === null || rule.max === "" ? null : Number(rule.max);

  return {
    id: normalizePromotionText(rule.id) || fallback.id,
    min: Number.isFinite(min) ? min : fallback.min,
    max: Number.isFinite(max) ? max : fallback.max,
    recommend: normalizeWeatherStringList(rule.recommend).length ? normalizeWeatherStringList(rule.recommend) : fallback.recommend,
    avoid: normalizeWeatherStringList(rule.avoid).length ? normalizeWeatherStringList(rule.avoid) : fallback.avoid,
    goodFor: normalizeWeatherStringList(rule.goodFor).length ? normalizeWeatherStringList(rule.goodFor) : fallback.goodFor,
  };
}

function normalizeWeatherConditionRule(value: unknown, fallback: WeatherConditionRule): WeatherConditionRule {
  const rule = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const condition = normalizePromotionText(rule.condition) as WeatherConditionRule["condition"];

  return {
    condition: ["rainy", "windy", "humid", "day", "night"].includes(condition) ? condition : fallback.condition,
    recommend: normalizeWeatherStringList(rule.recommend).length ? normalizeWeatherStringList(rule.recommend) : fallback.recommend,
    avoid: normalizeWeatherStringList(rule.avoid).length ? normalizeWeatherStringList(rule.avoid) : fallback.avoid,
    boost: normalizeWeatherStringList(rule.boost).length ? normalizeWeatherStringList(rule.boost) : fallback.boost,
  };
}

function normalizeWeatherSettings(value: unknown): SiteWeatherSettings {
  const settings = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const temperatureSource = Array.isArray(settings.temperatureRules) ? settings.temperatureRules : [];
  const conditionSource = Array.isArray(settings.conditionRules) ? settings.conditionRules : [];

  return {
    enabled: Boolean(settings.enabled ?? DEFAULT_WEATHER_SETTINGS.enabled),
    homepageEnabled: Boolean(settings.homepageEnabled ?? DEFAULT_WEATHER_SETTINGS.homepageEnabled),
    catalogEnabled: Boolean(settings.catalogEnabled ?? DEFAULT_WEATHER_SETTINGS.catalogEnabled),
    qoxunuEnabled: Boolean(settings.qoxunuEnabled ?? DEFAULT_WEATHER_SETTINGS.qoxunuEnabled),
    defaultCity: normalizePromotionText(settings.defaultCity) || DEFAULT_WEATHER_SETTINGS.defaultCity,
    productLimit: Math.min(12, Math.max(3, Math.round(Number(settings.productLimit) || DEFAULT_WEATHER_SETTINGS.productLimit))),
    cacheMinutes: Math.min(60, Math.max(30, Math.round(Number(settings.cacheMinutes) || DEFAULT_WEATHER_SETTINGS.cacheMinutes))),
    temperatureRules: DEFAULT_WEATHER_SETTINGS.temperatureRules.map((fallback, index) =>
      normalizeWeatherTemperatureRule(temperatureSource[index], fallback),
    ),
    conditionRules: DEFAULT_WEATHER_SETTINGS.conditionRules.map((fallback, index) =>
      normalizeWeatherConditionRule(conditionSource[index], fallback),
    ),
  };
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
  homeHeader: SiteHomeHeaderSettings;
  weather: SiteWeatherSettings;
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
    homeHeader?: unknown;
    weather?: unknown;
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
    homeHeader: normalizeHomeHeaderSettings(settings.homeHeader ?? DEFAULT_HOME_HEADER_SETTINGS),
    weather: normalizeWeatherSettings(settings.weather ?? DEFAULT_WEATHER_SETTINGS),
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

export { normalizeHomeHeaderSettings, normalizeWeatherSettings };
