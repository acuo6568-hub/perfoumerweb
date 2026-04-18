import { parseCsv } from "@/lib/csv";
import type { Note, Perfume } from "@/types/catalog";

type PerfumeCsvRow = {
  id?: string;
  slug?: string;
  title?: string;
  name?: string;
  image?: string;
  image_alt?: string;
  gender?: string;
  price_15ml?: string;
  price_30ml?: string;
  price_50ml?: string;
  brand?: string;
  top_notes?: string;
  heart_notes?: string;
  base_notes?: string;
  link?: string;
  stock_status?: string;
};

type NotesCsvRow = {
  Slug?: string;
  Title?: string;
  Image?: string;
  "Image:alt"?: string;
  Content?: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function splitSlugs(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function toNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function perfumesToCsv(perfumes: Perfume[]) {
  const header = [
    "id",
    "slug",
    "title",
    "image",
    "image_alt",
    "gender",
    "price_15ml",
    "price_30ml",
    "price_50ml",
    "brand",
    "top_notes",
    "heart_notes",
    "base_notes",
    "link",
    "stock_status",
  ];

  const lines = perfumes.map((perfume) => {
    const p15 = perfume.sizes.find((item) => item.ml === 15)?.price;
    const p30 = perfume.sizes.find((item) => item.ml === 30)?.price;
    const p50 = perfume.sizes.find((item) => item.ml === 50)?.price;

    const values = [
      perfume.id,
      perfume.slug,
      perfume.name,
      perfume.image,
      perfume.imageAlt,
      perfume.gender,
      p15 !== undefined ? String(p15) : "",
      p30 !== undefined ? String(p30) : "",
      p50 !== undefined ? String(p50) : "",
      perfume.brand,
      perfume.noteSlugs.top.join(", "),
      perfume.noteSlugs.heart.join(", "),
      perfume.noteSlugs.base.join(", "),
      perfume.externalLink,
      perfume.stockStatus,
    ];

    return values.map((value) => escapeCsv(value || "")).join(",");
  });

  return [header.join(","), ...lines].join("\n");
}

export function notesToCsv(notes: Note[]) {
  const header = ["Slug", "Title", "Image", "Image:alt", "Content"];

  const lines = notes.map((note) =>
    [note.slug, note.name, note.image, note.imageAlt, note.content]
      .map((value) => escapeCsv(value || ""))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export function parsePerfumesCsv(input: string): Perfume[] {
  const rows = parseCsv<PerfumeCsvRow>(input);

  return rows
    .map((row) => {
      const slug = (row.slug || "").trim().toLowerCase();
      if (!slug) {
        return null;
      }

      const externalLink = (row.link || "").trim();
      const externalId = externalLink.match(/\/(\d+)(?:\D*)$/)?.[1] ?? "";
      const id = (row.id || "").trim() || externalId || slug;

      const sizeCandidates = [
        { ml: 15, price: toNumber(row.price_15ml) },
        { ml: 30, price: toNumber(row.price_30ml) },
        { ml: 50, price: toNumber(row.price_50ml) },
      ].filter((item): item is { ml: number; price: number } => item.price !== null);

      const stockStatus = (row.stock_status || "").trim() || "Naməlum";
      const inStock = stockStatus.toLowerCase().includes("var");

      return {
        id,
        slug,
        name: (row.title || row.name || "").trim(),
        brand: (row.brand || "").trim(),
        gender: (row.gender || "Unisex").trim(),
        image: (row.image || "").trim(),
        imageAlt: (row.image_alt || "").trim(),
        stockStatus,
        inStock,
        externalLink,
        sizes: sizeCandidates.map((size) => ({
          ml: size.ml,
          price: size.price,
          label: `${size.ml}ML`,
        })),
        noteSlugs: {
          top: splitSlugs(row.top_notes || ""),
          heart: splitSlugs(row.heart_notes || ""),
          base: splitSlugs(row.base_notes || ""),
        },
      } as Perfume;
    })
    .filter((item): item is Perfume => item !== null);
}

export function parseNotesCsv(input: string): Note[] {
  const rows = parseCsv<NotesCsvRow>(input);

  return rows
    .map((row) => {
      const slug = (row.Slug || "").trim().toLowerCase();
      if (!slug) {
        return null;
      }

      return {
        slug,
        name: (row.Title || "").trim(),
        image: (row.Image || "").trim(),
        imageAlt: (row["Image:alt"] || "").trim(),
        content: (row.Content || "").trim(),
      } satisfies Note;
    })
    .filter((item): item is Note => item !== null);
}
