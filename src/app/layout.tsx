import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";

import { AppShell } from "@/components/AppShell";
import { SiteTracker } from "@/components/analytics/SiteTracker";
import { ConsoleCredit } from "@/components/ConsoleCredit";
import { getCurrentLocale } from "@/lib/i18n.server";
import {
  DEFAULT_SITE_NAME,
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
} from "@/lib/site-branding";
import {
  getSiteSettings,
} from "@/lib/site-settings";
import {
  DEFAULT_OG_IMAGE,
  SEO_CONTACT,
  SEO_LOCAL_BUSINESS,
  SITE_URL,
  absoluteUrl,
  absoluteUrlForLocale,
  buildStoreGeoCoordinates,
  buildStoreOpeningHoursSpecification,
  buildStorePostalAddress,
  resolveSiteMetaKeywords,
} from "@/lib/seo";

import "./globals.css";

export const dynamic = "force-dynamic";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["Avenir Next", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
  variable: "--font-poppins",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
  variable: "--font-playfair",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const defaultTitle = settings.siteTitle || buildDefaultSiteTitle(settings.siteName);
  const defaultDescription =
    settings.siteDescription || buildDefaultSiteDescription(settings.siteName);
  const keywordList = resolveSiteMetaKeywords(settings.metaKeywords, settings.siteName);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: defaultTitle,
      template: `%s | ${settings.siteName}`,
    },
    description: defaultDescription,
    keywords: keywordList,
    alternates: {
      canonical: "/",
    },
    applicationName: settings.siteName,
    category: "shopping",
    referrer: "origin-when-cross-origin",
    formatDetection: {
      telephone: true,
      email: true,
      address: false,
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    authors: [{ name: settings.siteName, url: SITE_URL }],
    creator: settings.siteName,
    publisher: settings.siteName,
    icons: {
      icon: [
        { url: "/perfmlogo.png", type: "image/png", sizes: "512x512" },
      ],
      shortcut: "/perfmlogo.png",
      apple: [
        { url: "/perfmlogo.png", type: "image/png", sizes: "180x180" },
      ],
    },
    openGraph: {
      title: settings.openGraphTitle || defaultTitle,
      description: settings.openGraphDescription || defaultDescription,
      url: absoluteUrl("/"),
      siteName: settings.siteName,
      locale: "az_AZ",
      alternateLocale: ["en_US", "ru_RU"],
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: settings.siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.twitterTitle || defaultTitle,
      description: settings.twitterDescription || defaultDescription,
      images: [DEFAULT_OG_IMAGE],
      site: "@perfoumer",
    },
    other: {
      thumbnail: absoluteUrl(DEFAULT_OG_IMAGE),
    },
    manifest: "/manifest.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const { siteName } = settings;
  const orgStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: siteName,
    url: absoluteUrlForLocale("/", locale),
    logo: absoluteUrl("/perfmlogo.png"),
    email: SEO_CONTACT.email,
    telephone: SEO_CONTACT.phone,
    foundingDate: SEO_LOCAL_BUSINESS.foundingDate,
    address: buildStorePostalAddress(),
    areaServed: SEO_LOCAL_BUSINESS.areaServed,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: SEO_CONTACT.phone,
        email: SEO_CONTACT.email,
        areaServed: "AZ",
        availableLanguage: ["az", "en", "ru"],
      },
    ],
    sameAs: [...SEO_LOCAL_BUSINESS.sameAs],
  };

  const siteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: siteName,
    url: absoluteUrlForLocale("/", locale),
    inLanguage: ["az", "en", "ru"],
    hasPart: [
      {
        "@type": "WebPage",
        name: "Kataloq",
        url: absoluteUrlForLocale("/catalog", locale),
      },
      {
        "@type": "WebPage",
        name: "Brendlər",
        url: absoluteUrlForLocale("/brands", locale),
      },
      {
        "@type": "WebPage",
        name: "Haqqımızda",
        url: absoluteUrlForLocale("/haqqimizda", locale),
      },
      {
        "@type": "WebPage",
        name: "Əlaqə və ünvan",
        url: absoluteUrlForLocale("/elaqe", locale),
      },
      {
        "@type": "WebPage",
        name: "Blog",
        url: absoluteUrlForLocale("/blog", locale),
      },
    ],
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrlForLocale("/catalog", locale)}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const localBusinessStructuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: siteName,
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    url: absoluteUrlForLocale("/", locale),
    telephone: SEO_CONTACT.phone,
    email: SEO_CONTACT.email,
    description:
      `${siteName} Bakıda real mağazası olan və Azərbaycan üzrə onlayn sifariş qəbul edən premium və orijinal ətir mağazasıdır.`,
    address: buildStorePostalAddress(),
    geo: buildStoreGeoCoordinates(),
    hasMap: SEO_LOCAL_BUSINESS.mapUrl,
    openingHoursSpecification: buildStoreOpeningHoursSpecification(),
    areaServed: SEO_LOCAL_BUSINESS.areaServed,
    availableLanguage: ["az", "en", "ru"],
    priceRange: SEO_LOCAL_BUSINESS.priceRange,
    currenciesAccepted: SEO_LOCAL_BUSINESS.currenciesAccepted,
    paymentAccepted: SEO_LOCAL_BUSINESS.paymentAccepted,
    sameAs: [...SEO_LOCAL_BUSINESS.sameAs],
  };

  const navigationStructuredData = {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: ["Məhsullar", "Brendlər", "Haqqımızda", "Əlaqə və ünvan", "Blog"],
    url: [
      absoluteUrlForLocale("/catalog", locale),
      absoluteUrlForLocale("/brands", locale),
      absoluteUrlForLocale("/haqqimizda", locale),
      absoluteUrlForLocale("/elaqe", locale),
      absoluteUrlForLocale("/blog", locale),
    ],
  };

  return (
    <html
      lang={locale}
      className={`${poppins.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WGV47ZWS');`}
        </Script>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WGV47ZWS"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <div className="site-sketch-layer" aria-hidden>
          <span className="site-sketch-wash" />
        </div>
        <div className="site-side-ornaments" aria-hidden>
          <div className="site-side-ornament site-side-ornament-left site-side-ornament-variant-a">
            <span className="site-side-ornament-bloom" />
          </div>
          <div className="site-side-ornament site-side-ornament-left site-side-ornament-variant-b">
            <span className="site-side-ornament-bloom" />
          </div>
          <div className="site-side-ornament site-side-ornament-left site-side-ornament-variant-c">
            <span className="site-side-ornament-bloom" />
          </div>
          <div className="site-side-ornament site-side-ornament-left site-side-ornament-variant-d">
            <span className="site-side-ornament-bloom" />
          </div>
          <div className="site-side-ornament site-side-ornament-left site-side-ornament-variant-e">
            <span className="site-side-ornament-bloom" />
          </div>

          <div className="site-side-ornament site-side-ornament-right site-side-ornament-variant-a">
            <span className="site-side-ornament-bloom" />
          </div>
          <div className="site-side-ornament site-side-ornament-right site-side-ornament-variant-b">
            <span className="site-side-ornament-bloom" />
          </div>
          <div className="site-side-ornament site-side-ornament-right site-side-ornament-variant-c">
            <span className="site-side-ornament-bloom" />
          </div>
          <div className="site-side-ornament site-side-ornament-right site-side-ornament-variant-d">
            <span className="site-side-ornament-bloom" />
          </div>
          <div className="site-side-ornament site-side-ornament-right site-side-ornament-variant-e">
            <span className="site-side-ornament-bloom" />
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(navigationStructuredData) }}
        />
        <ConsoleCredit />
        <SiteTracker />
        <Analytics />
        <div className="relative z-[1]">
          <AppShell locale={locale} settings={settings}>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
