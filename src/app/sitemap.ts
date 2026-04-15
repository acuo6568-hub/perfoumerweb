import type { MetadataRoute } from "next";

import { getNotes, getPerfumes } from "@/lib/catalog";
import { BLOG_ARTICLES, CORE_CLUSTER_PATHS, TRUST_PAGES } from "@/lib/seo-growth";
import { SITE_URL, absoluteUrl, slugifyPathSegment } from "@/lib/seo";

function toAbsoluteUrl(input: string) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return absoluteUrl(input.startsWith("/") ? input : `/${input}`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [perfumes, notes] = await Promise.all([getPerfumes(), getNotes()]);
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/catalog"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.82,
    },
    {
      url: absoluteUrl("/brands"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/haqqimizda"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/elaqe"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.62,
    },
    {
      url: absoluteUrl("/qoxunu"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.78,
    },
    {
      url: absoluteUrl("/compare"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: absoluteUrl("/refund-policy"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.48,
    },
    {
      url: absoluteUrl("/terms-and-conditions"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.48,
    },
    {
      url: absoluteUrl("/privacy-policy"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.48,
    },
    ...CORE_CLUSTER_PATHS.map((path) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.86,
    })),
    ...TRUST_PAGES.filter((page) => page.href !== "/privacy-policy" && page.href !== "/refund-policy" && page.href !== "/terms-and-conditions").map((page) => ({
      url: absoluteUrl(page.href),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: page.href === "/elaqe" ? 0.62 : 0.56,
    })),
    ...BLOG_ARTICLES.map((article) => ({
      url: absoluteUrl(`/blog/${article.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: article.category === "campaign" ? 0.72 : 0.78,
    })),
  ];

  const brandRoutes: MetadataRoute.Sitemap = Array.from(
    new Set(perfumes.map((perfume) => slugifyPathSegment(perfume.brand)).filter(Boolean)),
  ).map((slug) => ({
    url: absoluteUrl(`/brands/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.74,
  }));

  const perfumeRoutes: MetadataRoute.Sitemap = perfumes.map((perfume) => {
    const imageUrl = toAbsoluteUrl(perfume.image);
    return {
      url: absoluteUrl(`/perfumes/${perfume.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      images: imageUrl ? [imageUrl] : undefined,
    };
  });

  const noteRoutes: MetadataRoute.Sitemap = notes.map((note) => ({
    url: absoluteUrl(`/notes/${note.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  return [...staticRoutes, ...brandRoutes, ...perfumeRoutes, ...noteRoutes];
}
