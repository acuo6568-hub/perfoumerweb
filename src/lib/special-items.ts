import type { Perfume } from "@/types/catalog";

export type CatalogSpecialPreset = "gift-ideas";

const GIFT_FRIENDLY_NOTE_SLUGS = [
  "bergamot",
  "lemon",
  "grapefruit",
  "orange-blossom",
  "neroli",
  "jasmine",
  "rose",
  "peony",
  "lily-of-the-valley",
  "lavender",
  "vanilla",
  "tonka-bean",
  "amber",
  "white-musk",
  "musk",
  "sandalwood",
  "cashmeran",
  "apple",
  "pear",
  "blackcurrant",
  "marine-notes",
] as const;

const POLARIZING_NOTE_SLUGS = [
  "castoreum",
  "civet",
  "animalic-notes",
  "tar",
  "smoke",
  "cumin",
  "asafoetida",
] as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getStartingPrice(perfume: Perfume) {
  return perfume.sizes[0]?.price ?? Number.POSITIVE_INFINITY;
}

function scoreGiftFitness(perfume: Perfume) {
  const notePool = [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
  ].map((item) => normalize(item));

  const noteSet = new Set(notePool);
  let score = 0;

  for (const note of GIFT_FRIENDLY_NOTE_SLUGS) {
    if (noteSet.has(note)) {
      score += 2;
    }
  }

  for (const note of POLARIZING_NOTE_SLUGS) {
    if (noteSet.has(note)) {
      score -= 3;
    }
  }

  if (perfume.inStock) {
    score += 3;
  }

  const normalizedGender = normalize(perfume.gender);
  if (normalizedGender.includes("unisex")) {
    score += 2;
  }

  const startingPrice = getStartingPrice(perfume);
  if (Number.isFinite(startingPrice) && startingPrice <= 220) {
    score += 1;
  }

  return score;
}

function getGiftIdeas(perfumes: Perfume[]) {
  const ranked = perfumes
    .map((perfume) => ({ perfume, score: scoreGiftFitness(perfume) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.perfume.inStock !== right.perfume.inStock) {
        return Number(right.perfume.inStock) - Number(left.perfume.inStock);
      }

      return getStartingPrice(left.perfume) - getStartingPrice(right.perfume);
    })
    .map((entry) => entry.perfume);

  if (!ranked.length) {
    return perfumes;
  }

  return ranked;
}

export function filterPerfumesBySpecialPreset(perfumes: Perfume[], preset?: CatalogSpecialPreset) {
  if (!preset) {
    return perfumes;
  }

  if (preset === "gift-ideas") {
    return getGiftIdeas(perfumes);
  }

  return perfumes;
}
