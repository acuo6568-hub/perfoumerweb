import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { SiteTracker } from "@/components/analytics/SiteTracker";
import { ConsoleCredit } from "@/components/ConsoleCredit";
import { getCurrentLocale } from "@/lib/i18n.server";
import {
  DEFAULT_OG_IMAGE,
  SEO_KEYWORDS,
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
    email: "info@perfoumer.az",
    sameAs: ["https://wa.me/994507078070"],
  };

  const siteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["az", "en", "ru"],
  };

  return (
    <html
      lang={locale}
      className={`${poppins.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData) }}
        />
        <ConsoleCredit />
        <SiteTracker />
        <AppShell locale={locale}>{children}</AppShell>
      </body>
    </html>
  );
}
