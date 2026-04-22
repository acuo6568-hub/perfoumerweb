import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";

import { AppShell } from "@/components/AppShell";
import { AIChatButton } from "@/components/AIChat/AIChatButton";
import { SiteTracker } from "@/components/analytics/SiteTracker";
import { ConsoleCredit } from "@/components/ConsoleCredit";
import { getCurrentLocale } from "@/lib/i18n.server";
import {
  DEFAULT_OG_IMAGE,
  SEO_CONTACT,
  SEO_KEYWORDS,
  SEO_LOCAL_BUSINESS,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  absoluteUrlForLocale,
  buildAzeriPageKeywords,
} from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Perfoumer | Orijinal və Premium Ətirlər",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Perfoumer-də orijinal və uzunömürlü kişi və qadın ətirlərini kəşf edin. Lüks, niş və dizayner brendləri, sürətli çatdırılma və xüsusi kolleksiyalar - hamısı bir onlayn ətir mağazasında.",
  keywords: buildAzeriPageKeywords(SEO_KEYWORDS),
  alternates: {
    canonical: "/",
  },
  applicationName: SITE_NAME,
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
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
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
    title: "Perfoumer | Orijinal və Premium Ətirlər",
    description:
      "Perfoumer-də orijinal və uzunömürlü kişi və qadın ətirlərini kəşf edin. Lüks, niş və dizayner brendləri, sürətli çatdırılma və xüsusi kolleksiyalar - hamısı bir onlayn ətir mağazasında.",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    locale: "az_AZ",
    alternateLocale: ["en_US", "ru_RU"],
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Perfoumer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Perfoumer | Orijinal və Premium Ətirlər",
    description:
      "Perfoumer-də orijinal və uzunömürlü kişi və qadın ətirlərini kəşf edin. Lüks, niş və dizayner brendləri, sürətli çatdırılma və xüsusi kolleksiyalar - hamısı bir onlayn ətir mağazasında.",
    images: [DEFAULT_OG_IMAGE],
    site: "@perfoumer",
  },
  other: {
    thumbnail: absoluteUrl(DEFAULT_OG_IMAGE),
  },
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const orgStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrlForLocale("/", locale),
    logo: absoluteUrlForLocale("/perfmlogo.png", locale),
    email: SEO_CONTACT.email,
    telephone: SEO_CONTACT.phone,
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
    sameAs: [SEO_CONTACT.whatsappUrl],
  };

  const siteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
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
    name: SITE_NAME,
    image: absoluteUrlForLocale(DEFAULT_OG_IMAGE, locale),
    url: absoluteUrlForLocale("/", locale),
    telephone: SEO_CONTACT.phone,
    email: SEO_CONTACT.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: SEO_LOCAL_BUSINESS.city,
      addressCountry: SEO_LOCAL_BUSINESS.country,
    },
    areaServed: SEO_LOCAL_BUSINESS.areaServed,
    availableLanguage: ["az", "en", "ru"],
    currenciesAccepted: SEO_LOCAL_BUSINESS.currenciesAccepted,
    paymentAccepted: SEO_LOCAL_BUSINESS.paymentAccepted,
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
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Script id="gtm-init" strategy="beforeInteractive">
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
          <AppShell locale={locale}>{children}</AppShell>
        </div>
        <AIChatButton locale={locale} />
      </body>
    </html>
  );
}
