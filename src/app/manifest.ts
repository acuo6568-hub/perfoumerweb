import type { MetadataRoute } from "next";

import { buildDefaultSiteDescription } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { siteName } = await getSiteSettings();

  return {
    name: siteName,
    short_name: siteName,
    description: buildDefaultSiteDescription(siteName),
    start_url: "/",
    display: "standalone",
    background_color: "#f3f3f2",
    theme_color: "#111111",
    lang: "az",
    icons: [
      {
        src: "/perfmlogo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/perfmlogo.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
