import type { Perfume } from "@/types/catalog";

export type QoxunuAnswers = {
  gender?: string;
  vibe?: string;
  occasion?: string;
  intensity?: string;
  projection?: string;
  sweetness?: string;
  profile?: string;
  budget?: string;
  season?: string;
  longevity?: string;
  environment?: string;
  personality?: string;
};

export type QoxunuMatch = {
  perfume: Perfume;
  score: number;
  matchPercent: number;
  reasons: string[];
  archetype: QoxunuArchetype;
  profile: WeightedScentProfile;
};

export type QoxunuArchetype = {
  key: string;
  name: string;
  sentence: string;
  traits: string[];
};

type FacetKey =
  | "sweetness"
  | "freshness"
  | "warmth"
  | "floral"
  | "woody"
  | "smoky"
  | "green"
  | "powdery"
  | "spicy"
  | "musky"
  | "romantic"
  | "formal"
  | "minimal"
  | "mysterious";

export type WeightedScentProfile = Record<FacetKey, number>;

type PerfumeRuntimeAttributes = {
  season: string[];
  longevity: string;
  projection: string;
  style: string[];
  occasion: string[];
  mood: string[];
  ageRange: string[];
  luxuryLevel: string;
  facets: Partial<Record<FacetKey, number>>;
};

const FACETS: FacetKey[] = [
  "sweetness",
  "freshness",
  "warmth",
  "floral",
  "woody",
  "smoky",
  "green",
  "powdery",
  "spicy",
  "musky",
  "romantic",
  "formal",
  "minimal",
  "mysterious",
];

const EMPTY_PROFILE = Object.fromEntries(FACETS.map((facet) => [facet, 0])) as WeightedScentProfile;

const CHAR_FOLD_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ə: "e",
  Ə: "e",
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

const NOTE_ALIASES: Record<string, string> = {
  amber: "amber",
  ambar: "amber",
  anbar: "amber",
  kehreba: "amber",
  nbr: "amber",
  "boz-nbr": "amber",
  benzoin: "benzoin",
  labdanum: "labdanum",
  vanil: "vanilla",
  vanilla: "vanilla",
  tonka: "tonka",
  "tonka-lobyas": "tonka",
  karamel: "caramel",
  caramel: "caramel",
  bal: "honey",
  ud: "oud",
  oud: "oud",
  "aqar-aac-ud": "oud",
  aoud: "oud",
  deri: "leather",
  dri: "leather",
  leather: "leather",
  tustu: "smoke",
  smoke: "smoke",
  "bxur-ladan": "incense",
  incense: "incense",
  tutun: "tobacco",
  ttn: "tobacco",
  tobacco: "tobacco",
  berqamot: "bergamot",
  bergamot: "bergamot",
  limon: "lemon",
  lemon: "lemon",
  mandarin: "mandarin",
  tanqerin: "mandarin",
  qreyfrut: "grapefruit",
  grapefruit: "grapefruit",
  neroli: "neroli",
  sitrus: "citrus",
  citrus: "citrus",
  dniz: "marine",
  "dniz-notlar": "marine",
  marine: "marine",
  aquatic: "aquatic",
  green: "green",
  yasil: "green",
  "yasil-cay": "tea",
  tea: "tea",
  cay: "tea",
  qizilgul: "rose",
  qzlgl: "rose",
  rose: "rose",
  jasmin: "jasmine",
  yasemen: "jasmine",
  jasmine: "jasmine",
  iris: "iris",
  ssn: "iris",
  pion: "peony",
  peony: "peony",
  zanbaq: "lily",
  lily: "lily",
  maqnoliya: "magnolia",
  violet: "violet",
  benovse: "violet",
  musk: "musk",
  mk: "musk",
  "a-mk": "musk",
  muskus: "musk",
  sidr: "cedar",
  cedar: "cedar",
  sndl: "sandalwood",
  sandalwood: "sandalwood",
  vetiver: "vetiver",
  vetivera: "vetiver",
  pauli: "patchouli",
  patchouli: "patchouli",
  agac: "woody",
  "aac-notlar": "woody",
  woody: "woody",
  istiot: "pepper",
  spice: "spice",
  dviyyatlar: "spice",
  hil: "cardamom",
  zfran: "saffron",
  darcin: "cinnamon",
  darcn: "cinnamon",
};

const NOTE_FACETS: Record<string, Partial<Record<FacetKey, number>>> = {
  amber: { warmth: 9, sweetness: 6, romantic: 7, formal: 5 },
  benzoin: { warmth: 8, sweetness: 6, powdery: 4, romantic: 6 },
  labdanum: { warmth: 8, smoky: 4, mysterious: 7, formal: 6 },
  vanilla: { sweetness: 9, warmth: 8, romantic: 8 },
  tonka: { sweetness: 8, warmth: 7, powdery: 4, romantic: 7 },
  caramel: { sweetness: 9, warmth: 6, romantic: 5 },
  honey: { sweetness: 8, warmth: 6, romantic: 5 },
  oud: { woody: 9, smoky: 8, mysterious: 9, formal: 8, warmth: 6 },
  leather: { smoky: 7, formal: 8, mysterious: 7, woody: 5 },
  smoke: { smoky: 9, mysterious: 8, formal: 6 },
  incense: { smoky: 8, mysterious: 9, formal: 7, warmth: 5 },
  tobacco: { warmth: 8, smoky: 7, sweetness: 5, formal: 8, mysterious: 6 },
  bergamot: { freshness: 9, green: 4, minimal: 6 },
  lemon: { freshness: 10, green: 3, minimal: 7 },
  mandarin: { freshness: 8, sweetness: 4, minimal: 5 },
  grapefruit: { freshness: 9, green: 5, minimal: 7 },
  neroli: { freshness: 8, floral: 6, green: 5, minimal: 6 },
  citrus: { freshness: 9, green: 4, minimal: 7 },
  marine: { freshness: 8, green: 3, minimal: 7 },
  aquatic: { freshness: 8, minimal: 7 },
  green: { green: 9, freshness: 7, minimal: 7 },
  tea: { green: 8, freshness: 7, minimal: 8, powdery: 3 },
  rose: { floral: 9, romantic: 8, powdery: 4 },
  jasmine: { floral: 9, romantic: 8, sweetness: 4 },
  iris: { floral: 7, powdery: 9, minimal: 7, formal: 5 },
  peony: { floral: 8, freshness: 5, romantic: 6 },
  lily: { floral: 8, freshness: 4, powdery: 4 },
  magnolia: { floral: 8, freshness: 5, romantic: 5 },
  violet: { floral: 7, powdery: 7, romantic: 5 },
  musk: { musky: 9, minimal: 7, romantic: 5, powdery: 4 },
  cedar: { woody: 8, formal: 6, minimal: 5 },
  sandalwood: { woody: 8, warmth: 6, musky: 4, romantic: 5 },
  vetiver: { woody: 8, green: 6, formal: 7, minimal: 6 },
  patchouli: { woody: 7, smoky: 5, warmth: 5, mysterious: 6 },
  woody: { woody: 8, formal: 5, minimal: 4 },
  pepper: { spicy: 7, formal: 5 },
  spice: { spicy: 8, warmth: 6, formal: 5 },
  cardamom: { spicy: 7, warmth: 5, formal: 5 },
  saffron: { spicy: 8, warmth: 5, formal: 7, mysterious: 5 },
  cinnamon: { spicy: 7, warmth: 8, sweetness: 5 },
};

const ANSWER_FACETS: Record<string, Partial<Record<FacetKey, number>>> = {
  fresh: { freshness: 9, green: 5, minimal: 6 },
  warm: { warmth: 9, sweetness: 5, romantic: 5 },
  floral: { floral: 9, romantic: 6, powdery: 4 },
  bold: { smoky: 7, mysterious: 8, formal: 7, woody: 5 },
  daily: { freshness: 5, minimal: 7, musky: 4 },
  office: { minimal: 9, freshness: 5, formal: 6 },
  date: { romantic: 9, warmth: 5, sweetness: 4 },
  evening: { formal: 8, warmth: 5, mysterious: 6 },
  soft: { minimal: 8, freshness: 4 },
  balanced: { musky: 4, woody: 4, floral: 4, warmth: 4 },
  strong: { formal: 6, smoky: 5, warmth: 5 },
  skin: { minimal: 9, musky: 6 },
  close: { minimal: 7, musky: 5, floral: 3 },
  moderate: { formal: 4, musky: 4, woody: 3 },
  dry: { minimal: 7, woody: 5, green: 4 },
  sweet: { sweetness: 8, warmth: 5, romantic: 6 },
  rich: { sweetness: 8, warmth: 8, mysterious: 5 },
  citrus: { freshness: 10, green: 4, minimal: 7 },
  woody: { woody: 9, formal: 5, minimal: 4 },
  amber: { warmth: 10, sweetness: 6, romantic: 6 },
  oud: { woody: 9, smoky: 9, mysterious: 9, formal: 8 },
  beach: { freshness: 9, green: 4, minimal: 7 },
  hotel: { formal: 9, minimal: 6, warmth: 4 },
  nature: { green: 9, woody: 6, freshness: 6 },
  city: { mysterious: 8, formal: 7, smoky: 5 },
  calm: { minimal: 9, musky: 4 },
  elegant: { floral: 6, formal: 8, powdery: 5 },
  assertive: { formal: 8, smoky: 6, mysterious: 5 },
  mysterious: { mysterious: 10, smoky: 6, warmth: 4 },
};

const ARCHETYPES: QoxunuArchetype[] = [
  {
    key: "velvet-amber",
    name: "Velvet Amber",
    sentence: "İsti kəhrəba, vanil və yumşaq odunsu notaların cazibədar harmoniyası.",
    traits: ["İsti", "Cazibədar", "Yadda qalan"],
  },
  {
    key: "modern-executive",
    name: "Modern Executive",
    sentence: "Səliqəli, təmiz və özünəinamlı kompozisiyalarla modern imza təsiri.",
    traits: ["Səliqəli", "Formal", "Etibarlı"],
  },
  {
    key: "quiet-luxury",
    name: "Quiet Luxury",
    sentence: "Yumşaq musk, pudralı toxunuş və sakit bahalı hissin incə balansı.",
    traits: ["Minimal", "Zərif", "Sakit"],
  },
  {
    key: "midnight-signature",
    name: "Midnight Signature",
    sentence: "Tünd, sirli və axşam ab-havası daşıyan dərin qoxu izi.",
    traits: ["Sirli", "Güclü", "Gecə"],
  },
  {
    key: "mediterranean-fresh",
    name: "Mediterranean Fresh",
    sentence: "Sitrus, neroli və təmiz havalı notalarla parlaq Aralıq dənizi təravəti.",
    traits: ["Təravətli", "Parlaq", "Yüngül"],
  },
  {
    key: "white-floral-muse",
    name: "White Floral Muse",
    sentence: "Yasəmən, gül və ağ çiçəklərin zərif, romantik və yumşaq aurası.",
    traits: ["Çiçəkli", "Romantik", "Zərif"],
  },
  {
    key: "dark-oud-reserve",
    name: "Dark Oud Reserve",
    sentence: "Ud, tüstü və dəri çalarları ilə dərin, premium və xarakterli imza.",
    traits: ["Tünd", "Premium", "Xarakterli"],
  },
  {
    key: "coastal-escape",
    name: "Coastal Escape",
    sentence: "Dəniz havası, yaşıl təravət və təmiz musk ilə rahat gündəlik qaçış.",
    traits: ["Dəniz", "Rahat", "Təmiz"],
  },
  {
    key: "elegant-minimalist",
    name: "Elegant Minimalist",
    sentence: "Az danışan, amma dərhal keyfiyyət hiss etdirən incə və təmiz profil.",
    traits: ["İncə", "Minimal", "Gündəlik"],
  },
  {
    key: "golden-sunset",
    name: "Golden Sunset",
    sentence: "İsti, yumşaq şirin və romantik tonların günbatımı kimi parlaq izi.",
    traits: ["Romantik", "İsti", "Yumşaq"],
  },
];

export function normalizeScentToken(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİəƏçÇğĞöÖşŞüÜ]/g, (char) => CHAR_FOLD_MAP[char] ?? char)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return NOTE_ALIASES[normalized] ?? normalized;
}

export function getStartingPrice(perfume: Perfume) {
  if (!perfume.sizes.length) return Number.POSITIVE_INFINITY;
  return perfume.sizes.reduce((min, item) => (item.price < min ? item.price : min), perfume.sizes[0].price);
}

export function collectNormalizedScentTokens(perfume: Perfume) {
  return [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
    perfume.name,
    perfume.brand,
  ]
    .flatMap((token) => String(token).split(/[\s,/&]+/))
    .map(normalizeScentToken)
    .filter(Boolean);
}

function createProfile() {
  return { ...EMPTY_PROFILE };
}

function addFacets(profile: WeightedScentProfile, facets: Partial<Record<FacetKey, number>>, multiplier = 1) {
  for (const facet of FACETS) {
    const value = facets[facet];
    if (typeof value === "number" && Number.isFinite(value)) {
      profile[facet] += value * multiplier;
    }
  }
}

function clampProfile(profile: WeightedScentProfile) {
  for (const facet of FACETS) {
    profile[facet] = Math.max(0, Math.min(10, profile[facet]));
  }
  return profile;
}

function addAnswer(profile: WeightedScentProfile, value: string | undefined, multiplier = 1) {
  if (!value) return;
  const facets = ANSWER_FACETS[normalizeScentToken(value)];
  if (facets) addFacets(profile, facets, multiplier);
}

export function buildUserScentProfile(answers: QoxunuAnswers) {
  const profile = createProfile();

  addAnswer(profile, answers.vibe, 0.95);
  addAnswer(profile, answers.occasion, 0.75);
  addAnswer(profile, answers.intensity, 0.45);
  addAnswer(profile, answers.projection, 0.45);
  addAnswer(profile, answers.sweetness, 0.75);
  addAnswer(profile, answers.profile, 1);
  addAnswer(profile, answers.environment, 0.8);
  addAnswer(profile, answers.personality, 0.8);

  return clampProfile(profile);
}

function getPerfumeRuntimeAttributes(perfume: Perfume): PerfumeRuntimeAttributes {
  const raw = perfume.attributes;
  return {
    season: raw?.season ?? [],
    longevity: raw?.longevity ?? "",
    projection: raw?.projection ?? "",
    style: raw?.style ?? [],
    occasion: raw?.occasion ?? [],
    mood: raw?.mood ?? [],
    ageRange: raw?.ageRange ?? [],
    luxuryLevel: raw?.luxuryLevel ?? "",
    facets: raw?.facets ?? {},
  };
}

export function buildPerfumeScentProfile(perfume: Perfume) {
  const profile = createProfile();
  const tokens = collectNormalizedScentTokens(perfume);

  for (const token of tokens) {
    const facets = NOTE_FACETS[token];
    if (facets) addFacets(profile, facets, 0.32);
  }

  const attrs = getPerfumeRuntimeAttributes(perfume);
  if (attrs.facets) addFacets(profile, attrs.facets, 0.9);

  if (attrs.style.includes("luxury-evening")) addFacets(profile, { formal: 7, warmth: 4, mysterious: 5 }, 0.7);
  if (attrs.style.includes("quiet-luxury")) addFacets(profile, { minimal: 8, musky: 4, formal: 4 }, 0.7);
  if (attrs.style.includes("fresh-daily")) addFacets(profile, { freshness: 8, minimal: 6, green: 4 }, 0.7);
  if (attrs.occasion.includes("date")) addFacets(profile, { romantic: 7, warmth: 4 }, 0.5);
  if (attrs.occasion.includes("formal")) addFacets(profile, { formal: 8, minimal: 3 }, 0.5);
  if (attrs.occasion.includes("night")) addFacets(profile, { mysterious: 6, smoky: 4 }, 0.5);
  if (attrs.mood.includes("calm")) addFacets(profile, { minimal: 6, musky: 3 }, 0.5);
  if (attrs.mood.includes("assertive")) addFacets(profile, { formal: 6, smoky: 4 }, 0.5);

  return clampProfile(profile);
}

function profileSimilarity(userProfile: WeightedScentProfile, perfumeProfile: WeightedScentProfile) {
  let weightedDistance = 0;
  let maxDistance = 0;

  for (const facet of FACETS) {
    const userValue = userProfile[facet];
    const perfumeValue = perfumeProfile[facet];
    const weight = Math.max(0.4, userValue / 5);
    weightedDistance += Math.abs(userValue - perfumeValue) * weight;
    maxDistance += 10 * weight;
  }

  if (!maxDistance) return 0.65;
  return Math.max(0, 1 - weightedDistance / maxDistance);
}

function optionScore(value: string | undefined, target: string | string[] | undefined, fallback = 0.55) {
  if (!value || value === "all") return fallback;
  if (!target || (Array.isArray(target) && target.length === 0)) return fallback;

  const normalized = normalizeScentToken(value);
  const values = Array.isArray(target) ? target : [target];
  return values.map(normalizeScentToken).includes(normalized) ? 1 : 0.35;
}

function projectionScore(answer: string | undefined, perfumeProjection: string | undefined, profile: WeightedScentProfile) {
  if (!answer) return 0.55;
  if (perfumeProjection) return optionScore(answer, perfumeProjection);

  const power = (profile.smoky + profile.warmth + profile.formal + profile.woody) / 4;
  if (answer === "skin") return power <= 4.5 ? 0.9 : 0.45;
  if (answer === "close") return power <= 6 ? 0.85 : 0.55;
  if (answer === "moderate") return power >= 4 && power <= 7.5 ? 0.9 : 0.55;
  if (answer === "bold") return power >= 6 ? 0.92 : 0.42;
  return 0.55;
}

function longevityScore(answer: string | undefined, perfumeLongevity: string | undefined, profile: WeightedScentProfile) {
  if (!answer) return 0.55;
  if (perfumeLongevity) return optionScore(answer, perfumeLongevity);

  const stamina = (profile.warmth + profile.woody + profile.smoky + profile.musky) / 4;
  if (answer === "moderate") return stamina <= 5.5 ? 0.9 : 0.55;
  if (answer === "long") return stamina >= 4.5 ? 0.86 : 0.45;
  if (answer === "beast") return stamina >= 6.2 ? 0.9 : 0.38;
  return 0.55;
}

function budgetScore(answer: string | undefined, perfume: Perfume) {
  if (!answer || answer === "all") return 0.65;
  const price = getStartingPrice(perfume);
  if (!Number.isFinite(price)) return 0.45;
  if (answer === "under80") return price <= 80 ? 1 : 0.32;
  if (answer === "80to140") return price >= 80 && price <= 140 ? 1 : 0.42;
  if (answer === "140plus") return price >= 140 ? 1 : price >= 80 ? 0.62 : 0.35;
  return 0.65;
}

function genderScore(answer: string | undefined, perfume: Perfume) {
  if (!answer || answer === "all") return 0.72;
  const gender = normalizeScentToken(perfume.gender);
  const target = normalizeScentToken(answer);
  if (gender.includes(target)) return 1;
  if (gender.includes("unisex")) return 0.82;
  return 0.28;
}

function scoreToPercent(score: number) {
  return Math.max(62, Math.min(97, Math.round(62 + score * 35)));
}

function getDominantFacets(profile: WeightedScentProfile) {
  return FACETS
    .map((facet) => ({ facet, value: profile[facet] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
}

export function getProfileArchetype(profile: WeightedScentProfile): QoxunuArchetype {
  if (profile.woody >= 6.5 && profile.smoky >= 6.5 && profile.mysterious >= 6.5) return ARCHETYPES.find((item) => item.key === "dark-oud-reserve") ?? ARCHETYPES[0];
  if (profile.freshness >= 7.5 && profile.green >= 5) return ARCHETYPES.find((item) => item.key === "mediterranean-fresh") ?? ARCHETYPES[0];
  if (profile.freshness >= 6.5 && profile.minimal >= 6.5) return ARCHETYPES.find((item) => item.key === "coastal-escape") ?? ARCHETYPES[0];
  if (profile.warmth >= 7 && profile.sweetness >= 5.5) return ARCHETYPES.find((item) => item.key === "velvet-amber") ?? ARCHETYPES[0];
  if (profile.formal >= 7 && profile.minimal >= 5.5) return ARCHETYPES.find((item) => item.key === "modern-executive") ?? ARCHETYPES[0];
  if (profile.minimal >= 7) return ARCHETYPES.find((item) => item.key === "quiet-luxury") ?? ARCHETYPES[0];
  if (profile.mysterious >= 7) return ARCHETYPES.find((item) => item.key === "midnight-signature") ?? ARCHETYPES[0];
  if (profile.floral >= 7) return ARCHETYPES.find((item) => item.key === "white-floral-muse") ?? ARCHETYPES[0];
  if (profile.romantic >= 7) return ARCHETYPES.find((item) => item.key === "golden-sunset") ?? ARCHETYPES[0];
  return ARCHETYPES.find((item) => item.key === "elegant-minimalist") ?? ARCHETYPES[0];
}

function buildReasons(answers: QoxunuAnswers, perfume: Perfume, profile: WeightedScentProfile, percent: number) {
  const tokens = collectNormalizedScentTokens(perfume);
  const reasons: string[] = [];

  if (tokens.includes("vanilla") || tokens.includes("amber") || tokens.includes("tonka")) {
    reasons.push("Vanil, tonka və ya yumşaq kəhrəba xətti isti və cazibədar seçim istəyinizə yaxın gəlir.");
  }
  if (tokens.includes("bergamot") || tokens.includes("lemon") || tokens.includes("neroli")) {
    reasons.push("Bergamot, limon və neroli təravəti bu ətri daha təmiz və rahat namizədə çevirir.");
  }
  if (tokens.includes("rose") || tokens.includes("jasmine") || tokens.includes("iris")) {
    reasons.push("Çiçəkli notaların zərifliyi profilinizə daha yumşaq və seçilmiş aura verir.");
  }
  if (tokens.includes("oud") || tokens.includes("leather") || tokens.includes("tobacco")) {
    reasons.push("Ud, dəri və tütün çalarları daha iddialı, axşam yönümlü imza yaradır.");
  }
  if (answers.occasion === "office" && profile.minimal >= 5) {
    reasons.push("Ofis üçün seçiminiz nəzərə alınaraq daha səliqəli və nəzarətli aura üstün tutuldu.");
  }
  if (answers.occasion === "date" && profile.romantic >= 5) {
    reasons.push("Görüş ab-havası üçün yaxın məsafədə xoş və romantik təsir verən balansı var.");
  }
  if (answers.personality === "mysterious" && profile.mysterious >= 5) {
    reasons.push("Sirli xarakter seçiminiz tünd və yadda qalan notlarla yaxşı tamamlanır.");
  }
  if (percent >= 92) {
    reasons.push("Profil oxşarlığı, istifadə ssenarisi və qoxu gücü birlikdə çox güclü uyğunluq yaradır.");
  }

  return reasons.slice(0, 3);
}

export function scorePerfumeMatch(perfume: Perfume, answers: QoxunuAnswers): QoxunuMatch {
  const userProfile = buildUserScentProfile(answers);
  const perfumeProfile = buildPerfumeScentProfile(perfume);
  const attrs = getPerfumeRuntimeAttributes(perfume);
  const similarity = profileSimilarity(userProfile, perfumeProfile);

  const structuredScore =
    genderScore(answers.gender, perfume) * 0.12 +
    optionScore(answers.season, attrs.season) * 0.09 +
    optionScore(answers.occasion, attrs.occasion) * 0.09 +
    projectionScore(answers.projection, attrs.projection, perfumeProfile) * 0.08 +
    longevityScore(answers.longevity, attrs.longevity, perfumeProfile) * 0.08 +
    budgetScore(answers.budget, perfume) * 0.08 +
    (perfume.inStock ? 1 : 0.4) * 0.06;

  const score = similarity * 0.4 + structuredScore;
  const matchPercent = scoreToPercent(score);

  return {
    perfume,
    score: Math.round(score * 1000) / 1000,
    matchPercent,
    reasons: buildReasons(answers, perfume, perfumeProfile, matchPercent),
    archetype: getProfileArchetype(userProfile),
    profile: perfumeProfile,
  };
}

function diversityPenalty(candidate: QoxunuMatch, selected: QoxunuMatch[]) {
  if (!selected.length) return 0;

  let penalty = 0;
  const candidateTokens = new Set(collectNormalizedScentTokens(candidate.perfume));
  const candidateDominants = new Set(getDominantFacets(candidate.profile).slice(0, 2).map((item) => item.facet));

  for (const item of selected) {
    const selectedTokens = collectNormalizedScentTokens(item.perfume);
    const sharedTokens = selectedTokens.filter((token) => candidateTokens.has(token)).length;
    const selectedDominants = getDominantFacets(item.profile).slice(0, 2).map((entry) => entry.facet);
    const sharedDominants = selectedDominants.filter((facet) => candidateDominants.has(facet)).length;
    const sameBrand = normalizeScentToken(candidate.perfume.brand) === normalizeScentToken(item.perfume.brand);

    penalty += Math.min(0.08, sharedTokens * 0.018);
    penalty += sharedDominants * 0.035;
    if (sameBrand) penalty += 0.025;
  }

  return penalty;
}

export function rankQoxunuPerfumes(perfumes: Perfume[], answers: QoxunuAnswers, limit = 3) {
  const scored = perfumes
    .map((perfume) => scorePerfumeMatch(perfume, answers))
    .sort((a, b) => b.score - a.score);
  const selected: QoxunuMatch[] = [];
  const pool = scored.slice(0, Math.max(60, limit * 12));

  while (selected.length < limit && pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;

    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index];
      const adjusted = candidate.score - diversityPenalty(candidate, selected);
      if (adjusted > bestValue) {
        bestValue = adjusted;
        bestIndex = index;
      }
    }

    const [picked] = pool.splice(bestIndex, 1);
    selected.push(picked);
  }

  return selected;
}

export function getMatchLabel(matchPercent: number, locale: "az" | "en" | "ru") {
  if (locale === "ru") {
    if (matchPercent >= 94) return "Идеальное совпадение";
    if (matchPercent >= 90) return "Сильное совпадение";
    return "Альтернатива";
  }

  if (locale === "en") {
    if (matchPercent >= 94) return "Perfect match";
    if (matchPercent >= 90) return "Strong match";
    return "Alternative";
  }

  if (matchPercent >= 94) return "Mükəmməl uyğunluq";
  if (matchPercent >= 90) return "Güclü uyğunluq";
  return "Alternativ";
}

export function getPersonalizedReason(match: QoxunuMatch, locale: "az" | "en" | "ru") {
  const fallback =
    locale === "ru"
      ? "Профиль, сценарий использования и характер аромата хорошо совпадают с вашим выбором."
      : locale === "en"
        ? "The scent profile, use case, and performance level line up well with your choices."
        : "Qoxu profili, istifadə ssenarisi və güc balansı seçimlərinizlə yaxşı uyğunlaşır.";

  return match.reasons[0] ?? fallback;
}
