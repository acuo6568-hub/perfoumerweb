import path from "node:path";
import os from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

import { perfumesToCsv } from "@/lib/admin-csv";
import { getNotes, getPerfumes } from "@/lib/catalog";
import { normalizeSiteSettings, readSiteSettings, SITE_SETTINGS_PATH, type SiteSettings } from "@/lib/site-settings";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";
import type { Note, Perfume, PerfumeSize } from "@/types/catalog";

const ADMIN_DATA_DIR = path.join(process.cwd(), "data", "admin");
const ADMIN_NOTES_PATH = path.join(ADMIN_DATA_DIR, "notes.json");
const ADMIN_PERFUMES_PATH = path.join(ADMIN_DATA_DIR, "perfumes.json");
const PERFUMES_CSV_PATH = path.join(process.cwd(), "data", "perfm77.csv");

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => normalizeSlug(item))
    .filter(Boolean);
}

function normalizeSize(value: unknown): PerfumeSize | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const size = value as { ml?: unknown; price?: unknown; label?: unknown };
  const ml = Number(size.ml);
  const price = Number(size.price);

  if (!Number.isFinite(ml) || !Number.isFinite(price)) {
    return null;
  }

  return {
    ml,
    price,
    label: normalizeString(size.label) || `${ml}ML`,
  };
}

function normalizePerfume(value: unknown): Perfume | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const perfume = value as {
    id?: unknown;
    slug?: unknown;
    name?: unknown;
    brand?: unknown;
    gender?: unknown;
    image?: unknown;
    imageAlt?: unknown;
    stockStatus?: unknown;
    inStock?: unknown;
    externalLink?: unknown;
    sizes?: unknown;
    noteSlugs?: {
      top?: unknown;
      heart?: unknown;
      base?: unknown;
    };
  };

  const slug = normalizeSlug(perfume.slug);
  if (!slug) {
    return null;
  }

  const sizes = Array.isArray(perfume.sizes)
    ? perfume.sizes.map(normalizeSize).filter((item): item is PerfumeSize => item !== null)
    : [];

  return {
    id: normalizeString(perfume.id) || slug,
    slug,
    name: normalizeString(perfume.name),
    brand: normalizeString(perfume.brand),
    gender: normalizeString(perfume.gender) || "Unisex",
    image: normalizeString(perfume.image),
    imageAlt: normalizeString(perfume.imageAlt),
    stockStatus: normalizeString(perfume.stockStatus) || "Naməlum",
    inStock: Boolean(perfume.inStock),
    externalLink: normalizeString(perfume.externalLink),
    sizes: sizes.sort((a, b) => a.ml - b.ml),
    noteSlugs: {
      top: normalizeStringArray(perfume.noteSlugs?.top),
      heart: normalizeStringArray(perfume.noteSlugs?.heart),
      base: normalizeStringArray(perfume.noteSlugs?.base),
    },
  };
}

function normalizeNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const note = value as {
    slug?: unknown;
    name?: unknown;
    image?: unknown;
    imageAlt?: unknown;
    content?: unknown;
  };

  const slug = normalizeSlug(note.slug);
  if (!slug) {
    return null;
  }

  return {
    slug,
    name: normalizeString(note.name),
    image: normalizeString(note.image),
    imageAlt: normalizeString(note.imageAlt),
    content: normalizeString(note.content),
  };
}

export async function readAdminNotes() {
  const parsed = await readJsonFile<unknown[]>(ADMIN_NOTES_PATH);
  if (!Array.isArray(parsed)) {
    return null;
  }

  return parsed
    .map(normalizeNote)
    .filter((item): item is Note => item !== null);
}

async function getSupabaseAdminData() {
  try {
    console.log("[Supabase Read] Checking Supabase configuration...");
    const config = getSupabaseServiceConfigFromServer();
    if (!config) {
      console.log("[Supabase Read] ❌ No Supabase config found - returning null");
      return null;
    }

    const { url, serviceRoleKey } = config;
    console.log("[Supabase Read] ✓ Config found. URL:", url.substring(0, 30) + "...");
    console.log("[Supabase Read] ✓ Service role key exists:", !!serviceRoleKey);

    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log("[Supabase Read] 📡 Querying admin_data table for id='admin_data'...");
    const { data, error } = await supabase
      .from("admin_data")
      .select("data")
      .eq("id", "admin_data")
      .single();

    if (error) {
      console.log("[Supabase Read] ❌ Query error:", error.code, error.message);
      console.log("[Supabase Read] Error details:", JSON.stringify(error));
      return null;
    }

    if (!data) {
      console.log("[Supabase Read] ⚠️  No data found in admin_data table (empty result)");
      return null;
    }

    console.log("[Supabase Read] ✓ Data retrieved successfully");
    console.log("[Supabase Read] Data structure keys:", Object.keys(data));
    const result = (data as { data: unknown }).data;
    console.log("[Supabase Read] ✓ Extracted 'data' field. Type:", typeof result, "Has perfumes?", result && typeof result === "object" && "perfumes" in result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("[Supabase Read] ❌ Exception caught:", message);
    console.log("[Supabase Read] Stack:", err instanceof Error ? err.stack : "no stack");
    return null;
  }
}

async function saveSupabaseAdminData(data: unknown) {
  try {
    console.log("[Supabase Write] Checking Supabase configuration...");
    const config = getSupabaseServiceConfigFromServer();
    if (!config) {
      console.log("[Supabase Write] ❌ No Supabase config found - cannot save");
      return false;
    }

    const { url, serviceRoleKey } = config;
    console.log("[Supabase Write] ✓ Config found. URL:", url.substring(0, 30) + "...");
    console.log("[Supabase Write] ✓ Service role key exists:", !!serviceRoleKey);

    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const payload = {
      id: "admin_data",
      data,
      updated_at: new Date().toISOString(),
    };

    console.log("[Supabase Write] 📦 Payload to save:");
    console.log("[Supabase Write]   - id:", payload.id);
    console.log("[Supabase Write]   - updated_at:", payload.updated_at);
    console.log("[Supabase Write]   - data type:", typeof data);
    if (typeof data === "object" && data !== null) {
      console.log("[Supabase Write]   - data keys:", Object.keys(data));
    }

    console.log("[Supabase Write] 📡 Upserting into admin_data table...");
    const { error } = await supabase
      .from("admin_data")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.log("[Supabase Write] ❌ Upsert error:", error.code, error.message);
      console.log("[Supabase Write] Full error:", JSON.stringify(error));
      return false;
    }

    console.log("[Supabase Write] ✓ Successfully upserted admin_data to Supabase");
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("[Supabase Write] ❌ Exception caught:", message);
    console.log("[Supabase Write] Stack:", err instanceof Error ? err.stack : "no stack");
    return false;
  }
}

export async function getAdminData() {
  console.log("[Admin Data] Loading admin data...");
  
  // Try to load from Supabase first (on production)
  console.log("[Admin Data] Attempting to load from Supabase...");
  const supabaseData = await getSupabaseAdminData();
  
  if (supabaseData && typeof supabaseData === "object") {
    console.log("[Admin Data] ✓ Using Supabase data");
    const supabaseObj = supabaseData as {
      perfumes?: unknown;
      notes?: unknown;
      settings?: unknown;
    };
    
    // Normalize perfumes FROM SUPABASE (not from catalog!)
    const perfumes = Array.isArray(supabaseObj.perfumes)
      ? supabaseObj.perfumes.map(normalizePerfume).filter((item): item is Perfume => item !== null)
      : null;
    
    const notes = Array.isArray(supabaseObj.notes)
      ? supabaseObj.notes.map(normalizeNote).filter((item): item is Note => item !== null)
      : null;
    const settings = supabaseObj.settings ? normalizeSiteSettings(supabaseObj.settings) : null;

    console.log("[Admin Data] Loaded", perfumes ? perfumes.length : "0", "perfumes from Supabase");
    console.log("[Admin Data] Loaded", notes ? notes.length : "0", "notes from Supabase");
    console.log("[Admin Data] Loaded settings:", !!settings, "from Supabase");

    return {
      perfumes: perfumes ?? (await getPerfumes()),
      notes: notes ?? (await getNotes()),
      settings: settings ?? (await readSiteSettings()) ?? normalizeSiteSettings(null),
    };
  }

  // Fallback to local files (for development or if Supabase is not configured)
  console.log("[Admin Data] ⚠️  Supabase data not available, falling back to local files");
  const [notes, catalogPerfumes, settings] = await Promise.all([
    readAdminNotes(),
    getPerfumes(),
    readSiteSettings(),
  ]);

  console.log("[Admin Data] Loaded from local files - perfumes:", catalogPerfumes.length, "notes:", notes?.length ?? 0);
  
  return {
    perfumes: catalogPerfumes,
    notes: notes ?? (await getNotes()),
    settings: settings ?? normalizeSiteSettings(null),
  };
}

export async function saveAdminData(input: { perfumes: unknown; notes: unknown; settings?: unknown }) {
  if (!Array.isArray(input.perfumes) || !Array.isArray(input.notes)) {
    throw new Error("Perfumes and notes must be arrays.");
  }

  const perfumes = input.perfumes
    .map(normalizePerfume)
    .filter((item): item is Perfume => item !== null);
  const notes = input.notes.map(normalizeNote).filter((item): item is Note => item !== null);
  const settings: SiteSettings = normalizeSiteSettings(input.settings);

  try {
    await mkdir(ADMIN_DATA_DIR, { recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create admin data directory";
    throw new Error(`[Directory Creation Failed] ${message}. Check directory permissions on data/admin/`);
  }

  const perfumesCsv = perfumesToCsv(perfumes);

  // Write perfumes CSV, with fallback to a writable directory (e.g., /tmp) if filesystem is read-only
  try {
    await writeFile(PERFUMES_CSV_PATH, `${perfumesCsv}\n`, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isReadOnly = message.includes("read-only file system") || (error as any)?.code === "EROFS";
    if (isReadOnly) {
      const altDir = process.env.WRITABLE_DATA_DIR || os.tmpdir();
      const altPath = path.join(altDir, "perfm77.csv");
      try {
        await writeFile(altPath, `${perfumesCsv}\n`, "utf-8");
        console.warn(`[CSV Write Fallback] original path not writable, saved to ${altPath}`);
      } catch (altErr) {
        const altMsg = altErr instanceof Error ? altErr.message : "Unknown error";
        throw new Error(`[CSV Write Failed] ${message}. Also failed to write fallback file: ${altMsg}`);
      }
    } else {
      throw new Error(`[CSV Write Failed] ${message}. File: data/perfm77.csv. Check file permissions with: chmod 644 data/perfm77.csv`);
    }
  }

  // Write other admin files (these may also fail on read-only filesystems)
  const writeOperations = [
    (async () => {
      try {
        await writeFile(ADMIN_PERFUMES_PATH, "[]\n", "utf-8");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const isReadOnly =
          message.includes("read-only file system") || (error as any)?.code === "EROFS";
        if (isReadOnly) {
          const altDir = process.env.WRITABLE_DATA_DIR || os.tmpdir();
          const altPath = path.join(altDir, "perfumes.json");
          try {
            await writeFile(altPath, "[]\n", "utf-8");
            console.warn(
              `[Perfumes JSON Write Fallback] original path not writable, saved to ${altPath}`,
            );
          } catch (altErr) {
            console.warn(`[Perfumes JSON Write Failed] ${message} and fallback failed too`);
          }
        } else {
          throw new Error(
            `[JSON Write Failed] ${message}. File: data/admin/perfumes.json`,
          );
        }
      }
    })(),
    (async () => {
      try {
        await writeFile(ADMIN_NOTES_PATH, `${JSON.stringify(notes, null, 2)}\n`, "utf-8");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const isReadOnly =
          message.includes("read-only file system") || (error as any)?.code === "EROFS";
        if (isReadOnly) {
          const altDir = process.env.WRITABLE_DATA_DIR || os.tmpdir();
          const altPath = path.join(altDir, "notes.json");
          try {
            await writeFile(altPath, `${JSON.stringify(notes, null, 2)}\n`, "utf-8");
            console.warn(
              `[Notes JSON Write Fallback] original path not writable, saved to ${altPath}`,
            );
          } catch (altErr) {
            console.warn(`[Notes JSON Write Failed] ${message} and fallback failed too`);
          }
        } else {
          throw new Error(`[Notes Write Failed] ${message}. File: data/admin/notes.json`);
        }
      }
    })(),
    (async () => {
      try {
        await writeFile(
          SITE_SETTINGS_PATH,
          `${JSON.stringify(settings, null, 2)}\n`,
          "utf-8",
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const isReadOnly =
          message.includes("read-only file system") || (error as any)?.code === "EROFS";
        if (isReadOnly) {
          const altDir = process.env.WRITABLE_DATA_DIR || os.tmpdir();
          const altPath = path.join(altDir, "site-settings.json");
          try {
            await writeFile(
              altPath,
              `${JSON.stringify(settings, null, 2)}\n`,
              "utf-8",
            );
            console.warn(
              `[Settings JSON Write Fallback] original path not writable, saved to ${altPath}`,
            );
          } catch (altErr) {
            console.warn(
              `[Settings JSON Write Failed] ${message} and fallback failed too`,
            );
          }
        } else {
          throw new Error(
            `[Settings Write Failed] ${message}. File: data/admin/site-settings.json`,
          );
        }
      }
    })(),
  ];

  try {
    await Promise.all(writeOperations);
  } catch (error) {
    throw error; // Re-throw with detailed message
  }

  // Also save to Supabase for persistence on production (read-only filesystems)
  const adminData = { perfumes, notes, settings };
  console.log("[Admin Data Save] Attempting Supabase save with:", {
    perfumesCount: perfumes.length,
    notesCount: notes.length,
    hasSettings: !!settings,
  });
  
  const saved = await saveSupabaseAdminData(adminData);
  
  if (saved) {
    console.log("[Admin Data Save] ✓ Data successfully saved to Supabase");
  } else {
    console.warn(
      "[Admin Data Save] ⚠️  Supabase save failed - changes saved locally but NOT persisted on production",
    );
  }

  return adminData;
}
