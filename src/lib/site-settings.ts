import path from "node:path";
import { readFile } from "node:fs/promises";

import {
  DEFAULT_SITE_NAME,
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
  normalizeSiteSettings,
  normalizeSiteName,
  type SiteSettings,
} from "@/lib/site-branding";

const ADMIN_DATA_DIR = path.join(process.cwd(), "data", "admin");
export const SITE_SETTINGS_PATH = path.join(ADMIN_DATA_DIR, "site-settings.json");

export async function readSiteSettings() {
  try {
    const raw = await readFile(SITE_SETTINGS_PATH, "utf-8");
    return normalizeSiteSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return (await readSiteSettings()) ?? normalizeSiteSettings({ siteName: DEFAULT_SITE_NAME });
}

export {
  DEFAULT_SITE_NAME,
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
  normalizeSiteName,
  normalizeSiteSettings,
};
export type { SiteSettings };
