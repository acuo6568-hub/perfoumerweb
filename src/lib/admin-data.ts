import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { getNotes, getPerfumes } from "@/lib/catalog";
import type { Note, Perfume, PerfumeSize } from "@/types/catalog";

const ADMIN_DATA_DIR = path.join(process.cwd(), "data", "admin");
const ADMIN_NOTES_PATH = path.join(ADMIN_DATA_DIR, "notes.json");
const ADMIN_PERFUMES_PATH = path.join(ADMIN_DATA_DIR, "perfumes.json");

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

function perfumeIdentityKey(perfume: Perfume) {
  const sizeKey = perfume.sizes
    .map((size) => `${size.ml}:${size.price}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");

  return [perfume.slug, sizeKey, perfume.externalLink].join("::");
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

export async function readAdminPerfumes() {
  const parsed = await readJsonFile<unknown[]>(ADMIN_PERFUMES_PATH);
  if (!Array.isArray(parsed)) {
    return null;
  }

  return parsed
    .map(normalizePerfume)
    .filter((item): item is Perfume => item !== null);
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
  const [adminPerfumes, notes, catalogPerfumes] = await Promise.all([
    readAdminPerfumes(),
    readAdminNotes(),
    getPerfumes(),
  ]);

  const mergedPerfumes = (() => {
    if (!adminPerfumes?.length) {
      return catalogPerfumes;
    }

    const byKey = new Map<string, Perfume>();

    for (const perfume of catalogPerfumes) {
      byKey.set(perfumeIdentityKey(perfume), perfume);
    }

    for (const perfume of adminPerfumes) {
      byKey.set(perfumeIdentityKey(perfume), perfume);
    }

    return Array.from(byKey.values());
  })();

  return {
    perfumes: mergedPerfumes,
    notes: notes ?? (await getNotes()),
  };
}

export async function saveAdminData(input: { perfumes: unknown; notes: unknown }) {
  if (!Array.isArray(input.perfumes) || !Array.isArray(input.notes)) {
    throw new Error("Perfumes and notes must be arrays.");
  }

  const perfumes = input.perfumes
    .map(normalizePerfume)
    .filter((item): item is Perfume => item !== null);
  const notes = input.notes.map(normalizeNote).filter((item): item is Note => item !== null);

  await mkdir(ADMIN_DATA_DIR, { recursive: true });

  await Promise.all([
    writeFile(ADMIN_PERFUMES_PATH, `${JSON.stringify(perfumes, null, 2)}\n`, "utf-8"),
    writeFile(ADMIN_NOTES_PATH, `${JSON.stringify(notes, null, 2)}\n`, "utf-8"),
  ]);

  return { perfumes, notes };
}
