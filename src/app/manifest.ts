import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description:
      "Perfoumer-də orijinal və premium ətirləri kəşf edin: niş və dizayner kolleksiyaları, sürətli çatdırılma və seçilmiş qoxular.",
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
