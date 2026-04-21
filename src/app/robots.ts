import type { MetadataRoute } from "next";

import { defaultLocale, locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseDisallow = [
    "/admin",
    "/api",
    "/account",
    "/login",
    "/auth",
    "/cart",
    "/checkout",
    "/wishlist",
    "/wishlist/shared",
    "/payment/kapital/callback",
    "/payment/epoint/callback",
  ];

  const localeDisallow = new Set(
    baseDisallow.flatMap((path) => {
      const localized = locales
        .filter((item) => item !== defaultLocale)
        .map((item) => `/${item}${path}`);
      return [path, ...localized];
    }),
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: Array.from(localeDisallow),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
