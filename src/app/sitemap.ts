import type { MetadataRoute } from "next";

import { getNotes, getPerfumes } from "@/lib/catalog";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

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
      url: absoluteUrl("/brands"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
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
  ];

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

  return [...staticRoutes, ...perfumeRoutes, ...noteRoutes];
}
