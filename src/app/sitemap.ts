import type { MetadataRoute } from "next";

import { getNotes, getPerfumes } from "@/lib/catalog";
import { locales } from "@/lib/i18n";
import { BLOG_ARTICLES, CORE_CLUSTER_PATHS, TRUST_PAGES } from "@/lib/seo-growth";
import { absoluteUrl, absoluteUrlForLocale, slugifyPathSegment } from "@/lib/seo";

function toAbsoluteUrl(input: string) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return absoluteUrl(input.startsWith("/") ? input : `/${input}`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [perfumes, notes] = await Promise.all([getPerfumes(), getNotes()]);
  const now = new Date();

  const expandLocales = (path: string, entry: Omit<MetadataRoute.Sitemap[number], "url">) =>
    locales.map((locale) => ({
      ...entry,
      url: absoluteUrlForLocale(path, locale),
    }));

  const staticPaths = [
    {
      path: "/",
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      path: "/catalog",
      changeFrequency: "daily" as const,
      priority: 0.95,
    },
    {
      path: "/blog",
      changeFrequency: "daily" as const,
      priority: 0.82,
    },
    {
      path: "/brands",
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    {
      path: "/haqqimizda",
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      path: "/elaqe",
      changeFrequency: "monthly" as const,
      priority: 0.62,
    },
    {
      path: "/qoxunu",
      changeFrequency: "weekly" as const,
      priority: 0.78,
    },
    {
      path: "/compare",
      changeFrequency: "weekly" as const,
      priority: 0.72,
    },
    {
      path: "/refund-policy",
      changeFrequency: "monthly" as const,
      priority: 0.48,
    },
    {
      path: "/terms-and-conditions",
      changeFrequency: "monthly" as const,
      priority: 0.48,
    },
    {
      path: "/privacy-policy",
      changeFrequency: "monthly" as const,
      priority: 0.48,
    },
  ];

  const staticRoutes: MetadataRoute.Sitemap = [
    ...staticPaths.flatMap((item) =>
      expandLocales(item.path, {
        lastModified: now,
        changeFrequency: item.changeFrequency,
        priority: item.priority,
      }),
    ),
    ...CORE_CLUSTER_PATHS.flatMap((path) =>
      expandLocales(path, {
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.86,
      }),
    ),
    ...TRUST_PAGES.filter(
      (page) =>
        page.href !== "/privacy-policy" &&
        page.href !== "/refund-policy" &&
        page.href !== "/terms-and-conditions",
    ).flatMap((page) =>
      expandLocales(page.href, {
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: page.href === "/elaqe" ? 0.62 : 0.56,
      }),
    ),
    ...BLOG_ARTICLES.flatMap((article) =>
      expandLocales(`/blog/${article.slug}`, {
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: article.category === "campaign" ? 0.72 : 0.78,
      }),
    ),
  ];

  const brandRoutes: MetadataRoute.Sitemap = Array.from(
    new Set(perfumes.map((perfume) => slugifyPathSegment(perfume.brand)).filter(Boolean)),
  ).flatMap((slug) =>
    expandLocales(`/brands/${slug}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.74,
    }),
  );

  const perfumeRoutes: MetadataRoute.Sitemap = perfumes.flatMap((perfume) => {
    const imageUrl = toAbsoluteUrl(perfume.image);
    return locales.map((locale) => ({
      url: absoluteUrlForLocale(`/perfumes/${perfume.slug}`, locale),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      images: imageUrl ? [imageUrl] : undefined,
    }));
  });

  const noteRoutes: MetadataRoute.Sitemap = notes.flatMap((note) =>
    expandLocales(`/notes/${note.slug}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    }),
  );

  return [...staticRoutes, ...brandRoutes, ...perfumeRoutes, ...noteRoutes];
}
