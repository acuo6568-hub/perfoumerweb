import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";

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
  buildAzeriPageKeywords,
} from "@/lib/seo";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
});

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
      { url: "/icon.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icon.png?v=2",
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
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
    url: SITE_URL,
    logo: absoluteUrl("/icon.png"),
    email: SEO_CONTACT.email,
    telephone: SEO_CONTACT.phone,
    sameAs: [SEO_CONTACT.whatsappUrl],
  };

  const siteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["az", "en", "ru"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/catalog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const localBusinessStructuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: SITE_NAME,
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    url: SITE_URL,
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

  return (
    <html
      lang={locale}
      className={`${poppins.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
        <ConsoleCredit />
        <SiteTracker />
        <div className="relative z-[1]">
          <AppShell locale={locale}>{children}</AppShell>
        </div>
        <AIChatButton locale={locale} />
      </body>
    </html>
  );
}
