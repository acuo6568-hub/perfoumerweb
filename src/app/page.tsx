import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { BrandLogoMarquee } from "@/components/home/BrandLogoMarquee";
import { HomeFeaturedSearch } from "@/components/home/HomeFeaturedSearch";
import { PersonalizedFeaturedGrid } from "@/components/home/PersonalizedFeaturedGrid";
import { getFeaturedPerfumes, getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { toLocalePath } from "@/lib/i18n";
import { getDictionary, type Locale } from "@/lib/i18n";
import { BLOG_ARTICLES } from "@/lib/seo-growth";
import { SITE_NAME, absoluteUrl, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";
import { applySiteBranding } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";
import type { Perfume } from "@/types/catalog";

export const dynamic = "force-dynamic";

const homeMetadata: Metadata = {
  title: "Orijinal və Premium Ətirlər Onlayn",
  description:
    "Orijinal və premium ətirləri onlayn kəşf edin. Kişi, qadın və uniseks ətirlər, niş və dizayner kolleksiyalar, sürətli sifariş və çatdırılma.",
  keywords: buildAzeriPageKeywords([
    "onlayn ətir mağazası",
    "orijinal ətir sifarişi",
    "kişi və qadın ətirləri",
    "premium parfum",
    "niş ətir azərbaycan",
  ]),
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();

  return {
    ...applySiteBranding(homeMetadata, settings),
    alternates: buildLocaleAlternates("/", locale),
  };
}

type AboutCopy = {
  eyebrow: string;
  title: string;
  description: string;
  trustEyebrow: string;
  trustTitle: string;
  trustDescription: string;
  trustItems: Array<{
    title: string;
    description: string;
  }>;
  faqEyebrow: string;
  faqTitle: string;
  faqDescription: string;
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
  pillars: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  notes: string[];
};

const ABOUT_COPY: Record<Locale, AboutCopy> = {
  az: {
    eyebrow: "Haqqımızda",
    title: "Gündəlik seçimlər üçün premium ətir komandası",
    description:
      "Perfoumer komandası 2020-ci ildən etibarən gündəlik istifadə üçün seçilmiş premium ətirləri təqdim edir və hər sifarişi göndərişdən əvvəl keyfiyyət yoxlamasından keçirir.",
    trustEyebrow: "Xidmət və Etibar",
    trustTitle: "Sifarişdən çatdırılmaya qədər şəffaf proses",
    trustDescription:
      "Müştəri təcrübəsini sabit saxlamaq üçün sifariş, qablaşdırma və dəstək mərhələləri standart prosedurla idarə olunur.",
    trustItems: [
      {
        title: "Qablaşdırma Standartı",
        description:
          "Məhsullar qoruyucu materialla qablaşdırılır, etiket və həcm uyğunluğu göndərişdən öncə yoxlanılır.",
      },
      {
        title: "Çatdırılma İzlənməsi",
        description:
          "Sifariş hazırlandıqdan sonra izləmə məlumatı paylaşılır və proses boyunca status yenilənir.",
      },
      {
        title: "Operativ Dəstək",
        description:
          "WhatsApp və e-poçt üzərindən seçim, nota uyğunluq və sifariş mərhələsi ilə bağlı sürətli cavab verilir.",
      },
    ],
    faqEyebrow: "FAQ",
    faqTitle: "Ən çox verilən suallar",
    faqDescription:
      "Aşağıdakı cavablar alış prosesində ən çox soruşulan mövzuları qısa və aydın şəkildə izah edir.",
    faqItems: [
      {
        question: "Sifariş neçə günə göndərilir?",
        answer:
          "Əksər sifarişlər 1-3 iş günü ərzində hazırlanır və göndərişə verilir.",
      },
      {
        question: "Qoxunun qalıcılığı hər kəsdə eyni olurmu?",
        answer:
          "Xeyr. Dəri tipi, hava şəraiti və tətbiq nöqtələri qalıcılığa birbaşa təsir edir.",
      },
      {
        question: "Mənə uyğun qoxunu necə seçə bilərəm?",
        answer:
          "Bəyəndiyiniz notları və istifadə məqsədinizi paylaşdıqda komanda uyğun seçimləri təqdim edir.",
      },
      {
        question: "Qaytarılma şərtləri necədir?",
        answer:
          "İstifadə olunmamış məhsullar üçün qaytarılma qaydaları mövcuddur; detallı məlumat dəstək vasitəsilə təqdim olunur.",
      },
    ],
    pillars: [
      {
        label: "Fəaliyyət",
        value: "2020-ci ildən",
        detail: "Müştəri ehtiyacına uyğun niş və dizayner ətirlərdən ibarət davamlı yenilənən kolleksiya.",
      },
      {
        label: "Hazırlama",
        value: "1-3 iş günü",
        detail: "Sifarişlər qoruyucu qablaşdırma ilə hazırlanır və izləmə məlumatı ilə göndərilir.",
      },
      {
        label: "Dəstək",
        value: "Həftə içi 10:00-19:00",
        detail: "WhatsApp və e-poçt vasitəsilə ölçü, nota və seçim uyğunluğu üzrə operativ dəstək.",
      },
    ],
    notes: [
      "Qablaşdırma mərhələsində hər məhsulun etiket, həcm və vizual uyğunluğu əlavə olaraq yoxlanılır.",
      "Kataloq mütəmadi yenilənir: mövsümə uyğun seçmələr və ən çox tələb olunan qoxular önə çıxarılır.",
    ],
  },
  en: {
    eyebrow: "About Us",
    title: "A modern fragrance studio managed from Baku",
    description:
      "Since 2020, the Perfoumer team has curated premium scents for everyday wear and runs a final quality check before every order is dispatched.",
    trustEyebrow: "Service & Trust",
    trustTitle: "A transparent flow from order to delivery",
    trustDescription:
      "To keep quality consistent, order handling, packaging, and support are managed through a clear internal process.",
    trustItems: [
      {
        title: "Packaging Standard",
        description:
          "Products are packed with protective materials and rechecked for label and volume accuracy before dispatch.",
      },
      {
        title: "Delivery Tracking",
        description:
          "Tracking details are shared after preparation so customers can follow the shipment status clearly.",
      },
      {
        title: "Responsive Support",
        description:
          "Fast WhatsApp and email support is available for scent matching, notes, and order-stage questions.",
      },
    ],
    faqEyebrow: "FAQ",
    faqTitle: "Frequently asked questions",
    faqDescription:
      "These answers cover the most common topics customers ask before placing an order.",
    faqItems: [
      {
        question: "How long does dispatch take?",
        answer: "Most orders are prepared and dispatched within 1-3 business days.",
      },
      {
        question: "Is longevity the same for everyone?",
        answer:
          "No. Skin type, weather conditions, and application points all affect fragrance longevity.",
      },
      {
        question: "How can I choose the right scent?",
        answer:
          "Share your preferred notes and use-case, and the team can suggest suitable options.",
      },
      {
        question: "Do you have a return policy?",
        answer:
          "Return options exist for unused items; full details are provided through support channels.",
      },
    ],
    pillars: [
      {
        label: "Operating Since",
        value: "2020",
        detail: "Continuously curated niche and designer fragrances matched to customer demand.",
      },
      {
        label: "Dispatch Window",
        value: "1-3 business days",
        detail: "Orders are prepared with protective packaging and tracking details.",
      },
      {
        label: "Support Hours",
        value: "Weekdays 10:00-19:00",
        detail: "Fast WhatsApp and email support for size, notes, and fragrance fit.",
      },
    ],
    notes: [
      "Each product is rechecked for label, volume, and visual condition during packaging.",
      "The catalog is updated continuously with seasonal selections and most requested scents.",
    ],
  },
  ru: {
    eyebrow: "О нас",
    title: "Современная парфюмерная студия из Баку",
    description:
      "С 2020 года команда Perfoumer подбирает премиальные ароматы на каждый день и проводит финальную проверку качества перед отправкой каждого заказа.",
    trustEyebrow: "Сервис и доверие",
    trustTitle: "Прозрачный процесс от заказа до доставки",
    trustDescription:
      "Чтобы сохранять стабильное качество, этапы заказа, упаковки и поддержки выстроены по единому стандарту.",
    trustItems: [
      {
        title: "Стандарт упаковки",
        description:
          "Товары упаковываются с защитой, а перед отправкой дополнительно проверяются этикетка и объем.",
      },
      {
        title: "Отслеживание доставки",
        description:
          "После подготовки заказа предоставляется трек-номер, чтобы клиент видел актуальный статус отправления.",
      },
      {
        title: "Быстрая поддержка",
        description:
          "По WhatsApp и e-mail можно оперативно получить помощь по выбору аромата и этапу заказа.",
      },
    ],
    faqEyebrow: "FAQ",
    faqTitle: "Часто задаваемые вопросы",
    faqDescription:
      "Ниже собраны короткие ответы на самые частые вопросы перед покупкой.",
    faqItems: [
      {
        question: "За сколько дней отправляется заказ?",
        answer: "Большинство заказов подготавливается и отправляется в течение 1-3 рабочих дней.",
      },
      {
        question: "Стойкость аромата у всех одинаковая?",
        answer:
          "Нет. На стойкость влияют тип кожи, погода и точки нанесения.",
      },
      {
        question: "Как выбрать подходящий аромат?",
        answer:
          "Сообщите предпочтительные ноты и цель использования, и команда предложит подходящие варианты.",
      },
      {
        question: "Есть ли возврат?",
        answer:
          "Для неиспользованных товаров предусмотрены условия возврата; подробности можно получить через поддержку.",
      },
    ],
    pillars: [
      {
        label: "Работаем с",
        value: "2020 года",
        detail: "Постоянно обновляемая коллекция нишевых и дизайнерских ароматов по запросам клиентов.",
      },
      {
        label: "Отправка",
        value: "1-3 рабочих дня",
        detail: "Заказы подготавливаются с защитной упаковкой и данными для отслеживания.",
      },
      {
        label: "Поддержка",
        value: "Будни 10:00-19:00",
        detail: "Быстрые консультации в WhatsApp и по e-mail по объему, нотам и выбору аромата.",
      },
    ],
    notes: [
      "На этапе упаковки дополнительно проверяются этикетка, объем и внешний вид каждого товара.",
      "Каталог регулярно обновляется с учетом сезона и самых востребованных ароматов.",
    ],
  },
};

function normalizeHomeKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function homeIdentity(perfume: Perfume) {
  return `${normalizeHomeKeyPart(perfume.name)}::${normalizeHomeKeyPart(perfume.brand)}`;
}

function getStartingPrice(perfume: Perfume) {
  if (!perfume.sizes.length) return Number.POSITIVE_INFINITY;
  return Math.min(...perfume.sizes.map((size) => size.price));
}

function pickHomeRepresentative(current: Perfume, incoming: Perfume) {
  if (incoming.inStock !== current.inStock) {
    return incoming.inStock ? incoming : current;
  }

  const currentHasSizes = current.sizes.length > 0;
  const incomingHasSizes = incoming.sizes.length > 0;
  if (incomingHasSizes !== currentHasSizes) {
    return incomingHasSizes ? incoming : current;
  }

  const currentPrice = getStartingPrice(current);
  const incomingPrice = getStartingPrice(incoming);
  if (incomingPrice !== currentPrice) {
    return incomingPrice < currentPrice ? incoming : current;
  }

  const currentHasImage = Boolean(current.image.trim());
  const incomingHasImage = Boolean(incoming.image.trim());
  if (incomingHasImage !== currentHasImage) {
    return incomingHasImage ? incoming : current;
  }

  return current;
}

function dedupeForHomepage(perfumes: Perfume[]) {
  const byIdentity = new Map<string, Perfume>();

  for (const perfume of perfumes) {
    const identity = homeIdentity(perfume);
    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, perfume);
      continue;
    }

    byIdentity.set(identity, pickHomeRepresentative(existing, perfume));
  }

  return Array.from(byIdentity.values());
}

function isHomepageEligible(perfume: Perfume) {
  if (!perfume.sizes.length) return false;

  return perfume.sizes.some((size) => Number.isFinite(size.price) && size.price > 0);
}

// Inference: tuned toward 2026 demand signals (gourmand, warm amber/oud, fresh unisex)
// and Azerbaijan-facing catalog availability for men, women, and unisex spotlight coverage.
const HERO_SLUG_WEIGHTS: Record<string, number> = {
  guidance: 56,
  "guidance-46": 52,
  "baccarat-rouge-540": 50,
  "santal-33": 48,
  khamrah: 46,
  "invite-only-amber-23": 46,
  "vanilla-royale-sugared-patchouli-64": 44,
  "oud-satin-mood": 44,
  "wood-sage-sea-salt": 42,
  "gypsy-water": 40,
  "santal-royal": 40,
  "blue-talisman": 39,
  "erba-pura": 38,
  "oud-for-greatness": 38,
  "delina": 50,
  "delina-exclusif": 48,
  "love-delight": 46,
  "eden-sparkling-lychee-39": 44,
  "vanilla-candy-rock-sugar-42": 43,
  "libre-vanille-couture": 40,
  "elysium-pour-homme": 52,
  "boss-bottled-oud-saffron": 44,
  hero: 38,
  "bvlgari-man-wood-essence": 36,
  "oud-malaki": 34,
};

const HERO_BRAND_WEIGHTS: Record<string, number> = {
  amouage: 22,
  kayali: 20,
  mfk: 20,
  "maison francis kurkdjian": 20,
  "parfums de marly": 19,
  roja: 18,
  "le labo": 18,
  "jo malone": 17,
  byredo: 17,
  xerjoff: 16,
  lattafa: 16,
  exnihilo: 15,
  "ex nihilo": 15,
  kilian: 15,
  "tom ford": 14,
  initio: 14,
  sospiro: 14,
  guerlain: 13,
  burberry: 12,
  bvlgari: 12,
  boss: 11,
  "hugo boss": 11,
};

const HERO_NOTE_WEIGHTS: Record<string, number> = {
  vanil: 10,
  ənbər: 9,
  "aqar-ağacı-ud": 9,
  zəfəran: 8,
  darçın: 8,
  bal: 7,
  tütün: 7,
  praline: 7,
  qəhvəyi: 6,
  liçi: 6,
  meyvə: 6,
  jasmin: 5,
  qızılgül: 5,
  berqamot: 5,
  "portağal-çiçəyi": 5,
  dəri: 5,
  müşk: 4,
  səndəl: 4,
};

const HERO_BUCKET_TARGETS = ["female", "male", "unisex"] as const;
const HOME_HERO_ROTATION_SECONDS = 300;
const HOME_HERO_MIN_ITEMS = 4;
const HOME_HERO_MAX_ITEMS = 6;

function hashHeroSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function rotateHeroEntries<T>(items: T[], seed: string) {
  if (!items.length) {
    return items;
  }

  const offset = hashHeroSeed(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function normalizeHeroGenderBucket(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("unisex")) return "unisex" as const;
  if (normalized.includes("qad") || normalized.includes("women") || normalized.includes("female")) {
    return "female" as const;
  }
  if (normalized.includes("kişi") || normalized.includes("men") || normalized.includes("male")) {
    return "male" as const;
  }

  return "unisex" as const;
}

function getHeroRotationSeed() {
  const bucket = Math.floor(Date.now() / (HOME_HERO_ROTATION_SECONDS * 1000));
  return `hero-window-${bucket}`;
}

function getHeroTargetCount(seed: string) {
  return HOME_HERO_MIN_ITEMS + (hashHeroSeed(`${seed}:count`) % (HOME_HERO_MAX_ITEMS - HOME_HERO_MIN_ITEMS + 1));
}

function scoreHeroPerfume(perfume: Perfume, featuredIdentitySet: Set<string>) {
  let score = 0;

  if (perfume.inStock) {
    score += 30;
  }

  if (featuredIdentitySet.has(homeIdentity(perfume))) {
    score += 24;
  }

  score += HERO_SLUG_WEIGHTS[perfume.slug] ?? 0;
  score += HERO_BRAND_WEIGHTS[normalizeHomeKeyPart(perfume.brand)] ?? 0;

  const startingPrice = getStartingPrice(perfume);
  if (Number.isFinite(startingPrice)) {
    if (startingPrice >= 20 && startingPrice <= 70) {
      score += 12;
    } else if (startingPrice <= 110) {
      score += 6;
    }
  }

  score += Math.min(perfume.sizes.length, 3) * 4;

  const genderBucket = normalizeHeroGenderBucket(perfume.gender);
  if (genderBucket === "unisex") {
    score += 10;
  } else if (genderBucket === "female") {
    score += 6;
  } else {
    score += 5;
  }

  const notePool = new Set([
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
  ]);
  for (const note of notePool) {
    score += HERO_NOTE_WEIGHTS[note] ?? 0;
  }

  return score;
}

function buildHeroSpotlights(featured: Perfume[], homepagePerfumes: Perfume[]) {
  const featuredIdentitySet = new Set(featured.map(homeIdentity));
  const candidates = dedupeForHomepage([...featured, ...homepagePerfumes]).filter(isHomepageEligible);
  const ranked = candidates
    .map((perfume, index) => ({
      perfume,
      score: scoreHeroPerfume(perfume, featuredIdentitySet),
      index,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    });

  const selected: Perfume[] = [];
  const usedBrands = new Set<string>();
  const genderCounts = {
    male: 0,
    female: 0,
    unisex: 0,
  };
  const rotationSeed = getHeroRotationSeed();
  const targetCount = Math.min(getHeroTargetCount(rotationSeed), ranked.length);

  const canUsePerfume = (perfume: Perfume, relaxed = false) => {
    const identity = homeIdentity(perfume);
    if (selected.some((entry) => homeIdentity(entry) === identity)) {
      return false;
    }

    const normalizedBrand = normalizeHomeKeyPart(perfume.brand);
    const genderBucket = normalizeHeroGenderBucket(perfume.gender);

    if (!relaxed && usedBrands.has(normalizedBrand) && selected.length < Math.max(3, targetCount - 2)) {
      return false;
    }

    if (!relaxed && genderCounts[genderBucket] >= (genderBucket === "unisex" ? 2 : 1)) {
      return false;
    }

    return true;
  };

  const addPerfume = (perfume: Perfume) => {
    selected.push(perfume);
    usedBrands.add(normalizeHomeKeyPart(perfume.brand));
    genderCounts[normalizeHeroGenderBucket(perfume.gender)] += 1;
  };

  for (const bucket of HERO_BUCKET_TARGETS) {
    const bucketMatches = ranked.filter((entry) => {
      return normalizeHeroGenderBucket(entry.perfume.gender) === bucket && canUsePerfume(entry.perfume);
    });
    const match = rotateHeroEntries(bucketMatches.slice(0, Math.max(targetCount * 2, 6)), `${rotationSeed}:${bucket}`)[0];

    if (match) {
      addPerfume(match.perfume);
    }
  }

  const rotatedRemainder = rotateHeroEntries(ranked, `${rotationSeed}:wildcard`);
  for (const entry of rotatedRemainder) {
    if (selected.length >= targetCount) {
      break;
    }

    if (!canUsePerfume(entry.perfume, selected.length >= Math.max(2, targetCount - 3))) {
      continue;
    }

    addPerfume(entry.perfume);
  }

  return selected.slice(0, targetCount);
}

export const revalidate = 300;

export default async function Home() {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const t = getDictionary(locale, settings);
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const featuredRaw = await getFeaturedPerfumes();
  const perfumes = await getPerfumes();
  const homepagePerfumes = dedupeForHomepage(perfumes.filter(isHomepageEligible));
  const featured = dedupeForHomepage(featuredRaw.filter(isHomepageEligible));

  const featuredIdentitySet = new Set(featured.map(homeIdentity));
  if (featured.length < 8) {
    for (const perfume of homepagePerfumes) {
      const identity = homeIdentity(perfume);
      if (featuredIdentitySet.has(identity)) {
        continue;
      }

      featured.push(perfume);
      featuredIdentitySet.add(identity);

      if (featured.length >= 8) {
        break;
      }
    }
  }

  const heroSpotlights = buildHeroSpotlights(featured, homepagePerfumes);

  const heroProducts = homepagePerfumes.map((perfume) => ({
    slug: perfume.slug,
    name: perfume.name,
    brand: perfume.brand,
  }));
  const homepageBrands = homepagePerfumes.map((perfume) => perfume.brand);
  const stats = [
    { value: "98%", ...t.home.stats[0] },
    { value: "900+", ...t.home.stats[1] },
    { value: "15k+", ...t.home.stats[2] },
    { value: "4.9/5", ...t.home.stats[3] },
  ];
  const about = applySiteBranding(ABOUT_COPY[locale], settings);
  const homepageArticles = BLOG_ARTICLES.slice(0, 8);
  const blogImagePool = [
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80",
  ] as const;
  const homepageArticleCards = homepageArticles.slice(0, 4).map((article, index) => ({
    ...article,
    imageSrc: blogImagePool[index % blogImagePool.length],
  }));
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: about.faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const featuredListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} featured perfumes`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: Math.min(featured.length, 8),
    itemListElement: featured.slice(0, 8).map((perfume, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/perfumes/${perfume.slug}`),
      name: `${perfume.brand} ${perfume.name}`,
    })),
  };

  return (
    <div className="bg-[#f3f3f2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(featuredListStructuredData) }}
      />
      <div className="mx-auto max-w-[1540px] px-4 pt-2 pb-4 sm:px-6 sm:pt-3 sm:pb-5 md:px-10 md:pt-4 md:pb-6 xl:max-w-none xl:px-6 xl:pt-4 xl:pb-6">
        <Hero locale={locale} spotlights={heroSpotlights} allPerfumes={perfumes} homeHeader={settings.homeHeader} />
      </div>

      <BrandLogoMarquee brands={homepageBrands} />

      <main id="products" className="mx-auto mt-10 max-w-[1540px] px-6 md:px-10">
        <section className="text-center">
          <p className="text-sm text-zinc-500">{t.home.bestSelling}</p>
          <h2 className="mx-auto mt-2 max-w-[14ch] text-5xl leading-[1.05] font-semibold text-zinc-800 md:text-6xl">
            {t.home.selectedTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            {t.home.selectedDescription}
          </p>
          <HomeFeaturedSearch locale={locale} products={heroProducts} />
        </section>

        <PersonalizedFeaturedGrid
          featured={featured}
          locale={locale}
          supabase={supabaseConfig}
        />

        <div className="mt-8 flex justify-center">
          <Link
            href={toLocalePath("/catalog", locale)}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-400 bg-transparent px-8 text-base font-medium text-zinc-700 transition-all duration-300 hover:bg-white/75 hover:shadow-[0_8px_24px_rgba(31,31,31,0.08)]"
          >
            {t.home.showMore}
          </Link>
        </div>

        <section
          className="mt-10 p-1 md:p-0"
          style={{ contentVisibility: "auto", containIntrinsicSize: "1px 720px" }}
        >
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.24em] text-zinc-500 uppercase">Məqalələr və kampaniyalar</p>
            <h2 className="mt-2 text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.03] tracking-[-0.02em] text-zinc-900">Faydalı məqalələr</h2>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2 lg:gap-6">
            {homepageArticleCards.slice(0, 2).map((article) => (
              <article key={article.slug} className="grid items-start gap-4 sm:grid-cols-[210px_1fr] sm:gap-5">
                <Link href={`/blog/${article.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-[1.2rem] bg-zinc-200">
                  <Image
                    src={article.imageSrc}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 260px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </Link>

                <div className="pt-0.5">
                  <Link href={`/blog/${article.slug}`} className="block">
                    <h3 className="text-[1.95rem] leading-[1.04] tracking-[-0.02em] text-zinc-900 md:text-[2.1rem]">{article.title}</h3>
                  </Link>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{article.description}</p>
                  <Link href={`/blog/${article.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-900">
                    Məqaləni oxu
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-[0.92rem] leading-none">↘</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Link href={toLocalePath("/blog", locale)} className="inline-flex items-center gap-2 border-b border-zinc-400/70 pb-1 text-[0.82rem] font-semibold tracking-[0.18em] text-zinc-700 uppercase transition-all duration-300 hover:border-zinc-900 hover:text-zinc-900">
              Bütün məqalələrə bax
              <span className="text-[0.9rem]">↗</span>
            </Link>
          </div>
        </section>

        <section
          id="about"
          className="mt-20 pb-8 md:mt-24"
          style={{ contentVisibility: "auto", containIntrinsicSize: "1px 1400px" }}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm text-zinc-500">{t.home.statsEyebrow}</p>
            <h2 className="mt-3 text-5xl leading-[0.95] tracking-[-0.02em] font-medium text-zinc-800 md:text-[4.9rem]">
              {t.home.statsTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-500">
              {t.home.statsDescription}
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            {stats.map((stat) => (
              <article
                key={stat.title}
                className="flex min-h-[320px] flex-col rounded-[1.85rem] bg-white/45 p-6 shadow-[0_8px_30px_rgba(31,31,31,0.03)] ring-1 ring-white/70"
              >
                <p className="text-[1.05rem] font-medium text-zinc-700">{stat.title}</p>
                <p className="stat-value mt-8 text-[4.9rem] leading-[0.94] tracking-[-0.03em] text-zinc-800 md:text-[5.4rem]">
                  {stat.value}
                </p>
                <p className="mt-auto pt-6 text-[0.98rem] leading-[1.28] text-zinc-500 md:text-[1.02rem]">
                  {stat.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-zinc-200/75 bg-[linear-gradient(132deg,rgba(255,255,255,0.9)_0%,rgba(249,248,245,0.92)_46%,rgba(240,236,230,0.82)_100%)] p-6 shadow-[0_18px_44px_rgba(20,20,22,0.06)] sm:p-8 md:mt-10 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
              <div>
                <p className="text-[0.72rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
                  {about.eyebrow}
                </p>
                <h3 className="mt-3 max-w-[18ch] text-4xl leading-[1.02] text-zinc-900 md:text-5xl">
                  {about.title}
                </h3>
                <p className="mt-4 max-w-2xl text-[1.01rem] leading-relaxed text-zinc-600">
                  {about.description}
                </p>

                <div className="mt-6 space-y-3">
                  {about.notes.slice(0, 1).map((note) => (
                    <p
                      key={note}
                      className="rounded-2xl border border-[#d8c9b4]/40 bg-white/72 px-4 py-3 text-sm leading-relaxed text-zinc-700 shadow-[0_8px_24px_rgba(22,22,24,0.04)]"
                    >
                      {note}
                    </p>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                {about.pillars.slice(0, 2).map((pillar, index) => (
                  <article
                    key={pillar.label}
                    className={[
                      "rounded-2xl border px-5 py-5 shadow-[0_10px_28px_rgba(18,18,20,0.05)]",
                      index === 0
                        ? "border-[#d7c3a3]/55 bg-[#fff8ef]/84"
                        : index === 1
                          ? "border-[#cec9bb]/60 bg-white/84"
                          : "border-[#c9d1d9]/60 bg-[#f7fafc]/84",
                    ].join(" ")}
                  >
                    <p className="text-[0.7rem] font-medium tracking-[0.2em] text-zinc-400 uppercase">
                      {pillar.label}
                    </p>
                    <p className="stat-value mt-2 text-[2rem] leading-none tracking-[-0.02em] text-zinc-900">
                      {pillar.value}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                      {pillar.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-zinc-300/55 bg-[linear-gradient(132deg,rgba(29,31,36,0.98)_0%,rgba(39,42,49,0.96)_46%,rgba(30,33,39,0.98)_100%)] p-6 shadow-[0_20px_46px_rgba(8,8,10,0.28)] sm:p-8 md:p-10">
            <div className="max-w-3xl">
              <p className="text-[0.72rem] font-semibold tracking-[0.22em] text-zinc-300 uppercase">
                {about.trustEyebrow}
              </p>
              <h3 className="mt-3 text-4xl leading-[1.02] text-white md:text-5xl">
                {about.trustTitle}
              </h3>
              <p className="mt-4 max-w-2xl text-[1.01rem] leading-relaxed text-zinc-300">
                {about.trustDescription}
              </p>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {about.trustItems.slice(0, 2).map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/12 bg-white/5 px-5 py-5 shadow-[0_12px_26px_rgba(5,5,6,0.22)] backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/24 bg-white/10 text-xs font-semibold text-zinc-100">
                      {index + 1}
                    </span>
                    <p className="text-[1.02rem] font-semibold text-zinc-100">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(246,248,252,0.86)_100%)] p-6 shadow-[0_16px_38px_rgba(20,20,22,0.05)] sm:p-8 md:p-10">
            <div className="max-w-3xl">
              <p className="text-[0.72rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
                {about.faqEyebrow}
              </p>
              <h3 className="mt-3 text-4xl leading-[1.02] text-zinc-900 md:text-5xl">
                {about.faqTitle}
              </h3>
              <p className="mt-4 max-w-2xl text-[1.01rem] leading-relaxed text-zinc-600">
                {about.faqDescription}
              </p>
            </div>

            <div className="mt-7 space-y-3">
              {about.faqItems.slice(0, 3).map((item, index) => (
                <article
                  key={item.question}
                  className="rounded-2xl border border-zinc-200/70 bg-white/90 px-5 py-4 shadow-[0_8px_20px_rgba(20,20,22,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-zinc-900 px-1.5 text-[0.68rem] font-semibold tracking-[0.06em] text-white">
                      Q{index + 1}
                    </span>
                    <div>
                      <h4 className="text-[1rem] font-semibold text-zinc-800">{item.question}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Link
                href={toLocalePath("/haqqimizda", locale)}
                className="inline-flex items-center gap-2 border-b border-zinc-400/70 pb-1 text-[0.82rem] font-semibold tracking-[0.18em] text-zinc-700 uppercase transition-all duration-300 hover:border-zinc-900 hover:text-zinc-900"
              >
                {applySiteBranding(
                  locale === "ru"
                    ? "Подробнее о Perfoumer"
                    : locale === "en"
                      ? "Learn more about Perfoumer"
                      : "Perfoumer haqqında daha çox",
                  settings,
                )}
                <span className="text-[0.9rem]">↗</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
