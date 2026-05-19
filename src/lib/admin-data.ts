import path from "node:path";
import os from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { perfumesToCsv } from "@/lib/admin-csv";
import { getNotes, getPerfumes } from "@/lib/catalog";
import { normalizeSiteSettings, readSiteSettings, SITE_SETTINGS_PATH, type SiteSettings } from "@/lib/site-settings";
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

export async function getAdminData() {
  const [notes, catalogPerfumes, settings] = await Promise.all([
    readAdminNotes(),
    getPerfumes(),
    readSiteSettings(),
  ]);

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
    writeFile(ADMIN_PERFUMES_PATH, "[]\n", "utf-8").catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`[JSON Write Failed] ${message}. File: data/admin/perfumes.json`);
    }),
    writeFile(ADMIN_NOTES_PATH, `${JSON.stringify(notes, null, 2)}\n`, "utf-8").catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`[Notes Write Failed] ${message}. File: data/admin/notes.json`);
    }),
    writeFile(SITE_SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, "utf-8").catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`[Settings Write Failed] ${message}. File: data/admin/site-settings.json`);
    }),
  ];

  try {
    await Promise.all(writeOperations);
  } catch (error) {
    throw error; // Re-throw with detailed message
  }

  return { perfumes, notes, settings };
}
