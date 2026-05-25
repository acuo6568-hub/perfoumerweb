import path from "node:path";
import os from "node:os";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_SITE_NAME,
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
  normalizeSiteSettings,
  normalizeSiteName,
  type SiteSettings,
} from "@/lib/site-branding";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

const ADMIN_DATA_DIR = path.join(process.cwd(), "data", "admin");
export const SITE_SETTINGS_PATH = path.join(ADMIN_DATA_DIR, "site-settings.json");

export async function readSiteSettings() {
  const config = getSupabaseServiceConfigFromServer();
  if (config) {
    try {
      const supabase = createClient(config.url, config.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data, error } = await supabase
        .from("admin_data")
        .select("data")
        .eq("id", "admin_data")
        .single();

      if (!error && data && typeof data === "object") {
        const payload = (data as { data?: unknown }).data as { settings?: unknown } | undefined;
        if (payload?.settings) {
          return normalizeSiteSettings(payload.settings);
        }
      }
    } catch {
      // fall through to file-based settings
    }
  }

  // Try an alternate writable directory first (used when saveAdminData falls back)
  const altDir = process.env.WRITABLE_DATA_DIR || os.tmpdir();
  const altPath = path.join(altDir, "site-settings.json");

  try {
    const rawAlt = await readFile(altPath, "utf-8");
    try {
      return normalizeSiteSettings(JSON.parse(rawAlt));
    } catch {
      // fallthrough to bundled path
    }
  } catch {
    // ignore - alt path not present or unreadable
  }

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
