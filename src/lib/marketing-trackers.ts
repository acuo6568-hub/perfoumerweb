import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

const ADMIN_DATA_DIR = path.join(process.cwd(), "data", "admin");
const TRACKER_LINKS_PATH = path.join(ADMIN_DATA_DIR, "tracker-links.json");
const TRACKER_LINKS_DATA_ID = "marketing_tracker_links";

export type MarketingTrackerLink = {
  id: string;
  slug: string;
  name: string;
  targetPath: string;
  createdAt: string;
};

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeTrackerSlug(value: unknown) {
  return normalizeString(value)
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeTargetPath(value: unknown) {
  const raw = normalizeString(value, "/");
  if (!raw.startsWith("/")) return "/";
  return raw.slice(0, 180) || "/";
}

function normalizeTrackerLink(value: unknown): MarketingTrackerLink | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<MarketingTrackerLink>;
  const slug = normalizeTrackerSlug(row.slug);
  const name = normalizeString(row.name, slug);
  if (!slug || !name) return null;

  return {
    id: normalizeString(row.id, slug),
    slug,
    name: name.slice(0, 80),
    targetPath: normalizeTargetPath(row.targetPath),
    createdAt: normalizeString(row.createdAt, new Date().toISOString()),
  };
}

async function readSupabaseTrackerLinks() {
  const config = getSupabaseServiceConfigFromServer();
  if (!config) return null;

  try {
    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("admin_data")
      .select("data")
      .eq("id", TRACKER_LINKS_DATA_ID)
      .maybeSingle();

    if (error || !data) return null;
    return (data as { data?: unknown }).data;
  } catch {
    return null;
  }
}

async function saveSupabaseTrackerLinks(links: MarketingTrackerLink[]) {
  const config = getSupabaseServiceConfigFromServer();
  if (!config) return false;

  try {
    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase
      .from("admin_data")
      .upsert({ id: TRACKER_LINKS_DATA_ID, data: links });

    return !error;
  } catch {
    return false;
  }
}

function normalizeTrackerLinks(value: unknown) {
  if (!Array.isArray(value)) return [] as MarketingTrackerLink[];
  return value
    .map(normalizeTrackerLink)
    .filter((item): item is MarketingTrackerLink => item !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function readMarketingTrackerLinks() {
  const supabaseLinks = await readSupabaseTrackerLinks();
  if (Array.isArray(supabaseLinks)) {
    return normalizeTrackerLinks(supabaseLinks);
  }

  try {
    const raw = await readFile(TRACKER_LINKS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return normalizeTrackerLinks(parsed);
  } catch {
    return [] as MarketingTrackerLink[];
  }
}

export async function saveMarketingTrackerLinks(links: MarketingTrackerLink[]) {
  const normalized = normalizeTrackerLinks(links);
  const savedToSupabase = await saveSupabaseTrackerLinks(normalized);
  if (savedToSupabase) return;

  await mkdir(ADMIN_DATA_DIR, { recursive: true });
  await writeFile(TRACKER_LINKS_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
}

export function buildTrackerUrl(origin: string, link: Pick<MarketingTrackerLink, "slug" | "targetPath">) {
  const url = new URL(link.targetPath || "/", origin);
  url.searchParams.set("perf_track", link.slug);
  return url.toString();
}
