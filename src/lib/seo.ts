import { defaultLocale, locales, type Locale } from "@/lib/i18n";

const DEFAULT_SITE_URL = "https://perfoumer.az";

const normalizeSiteUrl = (value: string) => value.trim().replace(/\/$/, "");

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()
    ? process.env.NEXT_PUBLIC_SITE_URL
    : DEFAULT_SITE_URL,
);

export const SITE_NAME = "Perfoumer";
export const DEFAULT_OG_IMAGE = "/perfoumerlogo.png";

export const SEO_CONTACT = {
  email: "info@perfoumer.az",
  phone: "+994507078070",
  whatsappUrl: "https://wa.me/994507078070",
} as const;

export const SEO_SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/perfoumer/",
} as const;

export const SEO_LOCAL_BUSINESS = {
  streetAddress: "Mirzəağa Əliyev Küçəsi",
  postalCode: "1009",
  city: "Baku",
  cityNative: "Bakı",
  region: "Baku",
  country: "AZ",
  countryName: "Azerbaijan",
  latitude: 40.375092,
  longitude: 49.833675,
  mapUrl: "https://maps.app.goo.gl/Wpw5PwXDEuhnd6wB6",
  areaServed: ["Azerbaijan", "Baku"],
  priceRange: "₼₼",
  currenciesAccepted: "AZN",
  paymentAccepted: ["Cash", "Card"],
  foundingDate: "2020",
  sameAs: [SEO_CONTACT.whatsappUrl, SEO_SOCIAL_LINKS.instagram],
  openingHoursSpecification: [
    {
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "10:00",
      closes: "19:00",
    },
    {
      dayOfWeek: ["Sunday"],
      opens: "10:00",
      closes: "18:00",
    },
  ],
} as const;

export const buildStorePostalAddress = () => ({
  "@type": "PostalAddress",
  streetAddress: SEO_LOCAL_BUSINESS.streetAddress,
  addressLocality: SEO_LOCAL_BUSINESS.cityNative,
  addressRegion: SEO_LOCAL_BUSINESS.region,
  postalCode: SEO_LOCAL_BUSINESS.postalCode,
  addressCountry: SEO_LOCAL_BUSINESS.country,
});

export const buildStoreGeoCoordinates = () => ({
  "@type": "GeoCoordinates",
  latitude: SEO_LOCAL_BUSINESS.latitude,
  longitude: SEO_LOCAL_BUSINESS.longitude,
});

export const buildStoreOpeningHoursSpecification = () =>
  SEO_LOCAL_BUSINESS.openingHoursSpecification.map((entry) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [...entry.dayOfWeek],
    opens: entry.opens,
    closes: entry.closes,
  }));

const AZ_INTENTS = ["al", "onlayn al", "sifariş et", "qiymət", "orijinal", "premium"];

const AZ_CONTEXT = ["mağazası", "kataloqu", "qiyməti", "seçimi", "çatdırılma", "bakı", "azərbaycan"];

const DEFAULT_AZ_TERMS = [
  "ətir",
  "parfum",
  "orijinal ətir",
  "premium ətir",
  "lüks ətir",
  "niş ətir",
  "dizayner ətir",
  "kişi ətri",
  "qadın ətri",
  "uniseks ətir",
  "uzunömürlü ətir",
  "oud ətri",
  "ərəb ətri",
  "ətir mağazası",
  "ətir kataloqu",
];

export const buildAzeriPageKeywords = (
  pageTerms: string[],
  maxCount = 28,
): string[] => {
  const seedTerms = Array.from(
    new Set([...DEFAULT_AZ_TERMS, ...pageTerms.map((item) => item.trim()).filter(Boolean)]),
  );

  const keywords = new Set<string>([
    SITE_NAME,
    "Perfoumer Azərbaycan",
    "Perfoumer Bakı",
    ...seedTerms,
  ]);

  for (const term of seedTerms) {
    for (const intent of AZ_INTENTS) {
      keywords.add(`${intent} ${term}`);
    }

    for (const context of AZ_CONTEXT) {
      keywords.add(`${term} ${context}`);
    }
  }

  return Array.from(keywords).slice(0, Math.max(8, maxCount));
};

export const SEO_KEYWORDS = buildAzeriPageKeywords([]);

export const absoluteUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};

export const withLocalePath = (path: string, locale: Locale) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const prefix = locale === defaultLocale ? "" : `/${locale}`;

  if (normalizedPath === "/") {
    return prefix || "/";
  }

  return `${prefix}${normalizedPath}`;
};

export const absoluteUrlForLocale = (path: string, locale: Locale) =>
  `${SITE_URL}${withLocalePath(path, locale)}`;

export const buildLocaleAlternates = (path: string, locale: Locale) => {
  const languages = Object.fromEntries(
    locales.map((item) => [item, withLocalePath(path, item)]),
  ) as Record<string, string>;

  return {
    canonical: withLocalePath(path, locale),
    languages: {
      ...languages,
      "x-default": withLocalePath(path, defaultLocale),
    },
  };
};

export const slugifyPathSegment = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
