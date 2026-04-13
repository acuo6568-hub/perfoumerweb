"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import type { Locale } from "@/lib/i18n";
import { humanizeNoteToken, localizeNoteLabel } from "@/lib/note-label";
import type { Note, Perfume } from "@/types/catalog";

type QuizAnswers = {
  gender: string;
  vibe: string;
  occasion: string;
  intensity: string;
  profile: string;
  budget: string;
  season: string;
  longevity: string;
};

type TextAnswers = {
  favoriteNotes: string;
  avoidNotes: string;
};

type Option = {
  value: string;
  label: string;
  hint: string;
};

type ChoiceQuestion = {
  kind: "choice";
  key: keyof QuizAnswers;
  title: string;
  description: string;
  options: Option[];
};

type OptionalTextQuestion = {
  kind: "text";
  key: keyof TextAnswers;
  title: string;
  description: string;
  label: string;
  placeholder: string;
};

type Question = ChoiceQuestion | OptionalTextQuestion;

type QuizDictionary = {
  eyebrow: string;
  title: string;
  description: string;
  stepsLabel: string;
  progressLabel: string;
  next: string;
  previous: string;
  restart: string;
  seeCatalog: string;
  resultTitle: string;
  resultDescription: string;
  resultConfidenceLabel: string;
  generating: string;
  generatingHint: string;
  noMatchTitle: string;
  noMatchDescription: string;
  aiSummaryLabel: string;
  showMore: string;
  showLess: string;
  topPickLabel: string;
  otherPicksLabel: string;
  chipProfile: string;
  chipNotes: string;
  chipFit: string;
  rankedLabel: string;
  reasonLabel: string;
  fallbackNotice: string;
  sameResultNotice: string;
  failed: string;
  apiMissing: string;
  questions: Question[];
};

const QUIZ_DICTIONARY: Record<Locale, QuizDictionary> = {
  az: {
    eyebrow: "Qoxunu Tap",
    title: "Sənin üçün uyğun ətiri ağıllı suallarla tapaq",
    description: "Seçim + qısa mətn sualları ilə AI daha dəqiq nəticə çıxaracaq.",
    stepsLabel: "Addım",
    progressLabel: "İrəliləyiş",
    next: "Növbəti",
    previous: "Geri",
    restart: "Yenidən başla",
    seeCatalog: "Kataloqa bax",
    resultTitle: "Sizin üçün seçilən 3 qoxu",
    resultDescription: "Cavablarınıza əsasən butik üslubda seçilən xüsusi kolleksiya.",
    resultConfidenceLabel: "AI uyğunluğu",
    generating: "Sizin qoxu profiliniz analiz olunur...",
    generatingHint: "Nəticə bir neçə saniyə ərzində hazır olacaq.",
    noMatchTitle: "Uyğun nəticə tapılmadı",
    noMatchDescription: "Filtrlər çox dar ola bilər. Testi yenidən başlayıb daha geniş seçimlər et.",
    aiSummaryLabel: "Sənin qoxu təsvirin",
    showMore: "Daha çox bax",
    showLess: "Az göstər",
    topPickLabel: "Ən uyğun seçim",
    otherPicksLabel: "Digər variantlar",
    chipProfile: "Sizin profiliniz",
    chipNotes: "Sevdiyiniz notlar",
    chipFit: "Bu seçimin səbəbi",
    rankedLabel: "Seçim",
    reasonLabel: "Niyə uyğundur",
    fallbackNotice: "AI hazırda əlçatan deyil, standart ağıllı nəticə göstərilir.",
    sameResultNotice: "AI nəticəsi mövcud seçimlərlə eyni qaldı.",
    failed: "AI tövsiyəsi alınmadı. Yenidən cəhd edin.",
    apiMissing: "AI konfiqurasiyası tapılmadı. QOXUNU_OPENAI_API_KEY əlavə edin.",
    questions: [
      {
        kind: "choice",
        key: "gender",
        title: "Əsasən hansı kateqoriya axtarırsan?",
        description: "Bu seçim uyğun qoxuları daha dəqiq qruplaşdırmağa kömək edir.",
        options: [
          { value: "all", label: "Fərq etmir", hint: "Qadın, kişi və uniseks birlikdə" },
          { value: "unisex", label: "Uniseks", hint: "Orta balanslı və universal" },
          { value: "qadın", label: "Qadın", hint: "Daha zərif və yumşaq profil" },
          { value: "kişi", label: "Kişi", hint: "Daha dərin və xarakterli profil" },
        ],
      },
      {
        kind: "choice",
        key: "vibe",
        title: "Qoxunun ümumi ab-havası necə olsun?",
        description: "Ən çox hiss etmək istədiyin moodu seç.",
        options: [
          { value: "fresh", label: "Təzə və təmiz", hint: "Sitrus, yaşıl, yüngül" },
          { value: "warm", label: "İsti və yumşaq", hint: "Vanil, amber, rahat" },
          { value: "floral", label: "Çiçəkli və zərif", hint: "Gül, yasəmən, pudralı" },
          { value: "bold", label: "Cəsur və iddialı", hint: "Oud, dəri, ədviyyat" },
        ],
      },
      {
        kind: "choice",
        key: "occasion",
        title: "Ətiri əsasən harada istifadə edəcəksən?",
        description: "İstifadə mühiti qoxunun tonunu dəyişir.",
        options: [
          { value: "daily", label: "Gündəlik", hint: "Universallıq önəmlidir" },
          { value: "office", label: "Ofis", hint: "Yumşaq və səliqəli profil" },
          { value: "date", label: "Görüş", hint: "Yaxın məsafədə xoş təsir" },
          { value: "evening", label: "Axşam", hint: "Daha dolğun və dərin" },
        ],
      },
      {
        kind: "choice",
        key: "intensity",
        title: "Qoxu nə qədər hiss olunsun?",
        description: "Qalıcılıq və yayılım üçün rahatlıq səviyyəni seç.",
        options: [
          { value: "soft", label: "Yüngül", hint: "Sakit, yaxın məsafə" },
          { value: "balanced", label: "Balanslı", hint: "Gündəlik üçün ideal" },
          { value: "strong", label: "Güclü", hint: "Daha ifadəli və qalıcı" },
        ],
      },
      {
        kind: "choice",
        key: "season",
        title: "Əsas mövsüm hansıdır?",
        description: "Mövsüm seçimi AI nəticəsini daha düzgün edir.",
        options: [
          { value: "all", label: "Bütün mövsüm", hint: "Universallıq" },
          { value: "summer", label: "Yay", hint: "Yüngül və təravətli" },
          { value: "winter", label: "Qış", hint: "Daha isti və dolğun" },
          { value: "spring", label: "Yaz/Payız", hint: "Balanslı keçid qoxuları" },
        ],
      },
      {
        kind: "choice",
        key: "profile",
        title: "Hansına daha yaxınsan?",
        description: "Əsas nota ailəsi top nəticəni birbaşa təsir edir.",
        options: [
          { value: "citrus", label: "Sitrus", hint: "Bergamot, limon, neroli" },
          { value: "floral", label: "Çiçəkli", hint: "Gül, yasəmən, iris" },
          { value: "woody", label: "Odunsu", hint: "Səndəl, sidr, vetiver" },
          { value: "amber", label: "Amber/Şirin", hint: "Vanil, tonka, balsamik" },
          { value: "oud", label: "Oud/Dumanlı", hint: "Dəri, tüstü, qaranlıq ton" },
        ],
      },
      {
        kind: "choice",
        key: "longevity",
        title: "Qalıcılıq gözləntin necədir?",
        description: "AI bunu prioritetləşdirmədə istifadə edir.",
        options: [
          { value: "moderate", label: "Orta", hint: "4-6 saat yetərlidir" },
          { value: "long", label: "Uzun", hint: "8+ saat istəyirəm" },
          { value: "beast", label: "Maksimum", hint: "Güclü iz buraxsın" },
        ],
      },
      {
        kind: "choice",
        key: "budget",
        title: "Başlanğıc büdcə aralığın nədir?",
        description: "Nəticələri büdcənə uyğun prioritetləşdiririk.",
        options: [
          { value: "all", label: "Fərq etmir", hint: "Bütün qiymət aralığı" },
          { value: "under80", label: "80 AZN-dən aşağı", hint: "Sərfəli seçimlər" },
          { value: "80to140", label: "80-140 AZN", hint: "Balanslı orta seqment" },
          { value: "140plus", label: "140+ AZN", hint: "Premium və niş seçimlər" },
        ],
      },
      {
        kind: "text",
        key: "favoriteNotes",
        title: "İstəyə bağlı: sevdiyin notlar varmı?",
        description: "Məsələn: bergamot, vanil, oud, tüstülü və s.",
        label: "Sevdiyim notlar",
        placeholder: "Məsələn: bergamot, yaşıl çay, yüngül musk",
      },
      {
        kind: "text",
        key: "avoidNotes",
        title: "İstəyə bağlı: istəmədiyin notlar varmı?",
        description: "AI bu məlumatla uyğun olmayan variantları geri plana atacaq.",
        label: "Qaçındığım notlar",
        placeholder: "Məsələn: çox şirin vanil, ağır oud, tüstü",
      },
    ],
  },
  en: {
    eyebrow: "Find Your Scent",
    title: "Find your match with smarter questions",
    description: "Answer option-based questions and optional text prompts for AI-personalized picks.",
    stepsLabel: "Step",
    progressLabel: "Progress",
    next: "Next",
    previous: "Back",
    restart: "Start again",
    seeCatalog: "Open catalog",
    resultTitle: "3 picks selected for you",
    resultDescription: "A curated set chosen from your answers and scent preferences.",
    resultConfidenceLabel: "AI confidence",
    generating: "We are analyzing your scent profile...",
    generatingHint: "Your curated result will be ready in a few seconds.",
    noMatchTitle: "No strong match found",
    noMatchDescription: "Your filters may be too strict. Restart and select broader options.",
    aiSummaryLabel: "Your scent summary",
    showMore: "Show more",
    showLess: "Show less",
    topPickLabel: "Top pick",
    otherPicksLabel: "Other options",
    chipProfile: "Your profile",
    chipNotes: "Preferred notes",
    chipFit: "Why these picks",
    rankedLabel: "Pick",
    reasonLabel: "Why it fits",
    fallbackNotice: "AI is currently unavailable, showing default smart results.",
    sameResultNotice: "AI returned the same top picks for this profile.",
    failed: "Could not get AI recommendations. Please try again.",
    apiMissing: "AI is not configured. Add QOXUNU_OPENAI_API_KEY.",
    questions: [],
  },
  ru: {
    eyebrow: "Подбор аромата",
    title: "Подберем аромат с умными вопросами",
    description: "Ответьте на вопросы с вариантами и добавьте текстовые пожелания по желанию.",
    stepsLabel: "Шаг",
    progressLabel: "Прогресс",
    next: "Далее",
    previous: "Назад",
    restart: "Начать заново",
    seeCatalog: "Открыть каталог",
    resultTitle: "3 аромата, выбранные для вас",
    resultDescription: "Персональная подборка на основе ваших ответов и предпочтений.",
    resultConfidenceLabel: "Уверенность AI",
    generating: "Мы анализируем ваш ароматический профиль...",
    generatingHint: "Персональный результат будет готов через несколько секунд.",
    noMatchTitle: "Точное совпадение не найдено",
    noMatchDescription: "Фильтры могли получиться слишком узкими. Попробуйте более широкие параметры.",
    aiSummaryLabel: "Ваш ароматический профиль",
    showMore: "Показать больше",
    showLess: "Скрыть",
    topPickLabel: "Лучший выбор",
    otherPicksLabel: "Другие варианты",
    chipProfile: "Ваш профиль",
    chipNotes: "Любимые ноты",
    chipFit: "Почему именно эти",
    rankedLabel: "Выбор",
    reasonLabel: "Почему подходит",
    fallbackNotice: "AI сейчас недоступен, показаны стандартные умные результаты.",
    sameResultNotice: "AI вернул те же топ-результаты для этого профиля.",
    failed: "Не удалось получить рекомендации AI. Попробуйте снова.",
    apiMissing: "AI не настроен. Добавьте QOXUNU_OPENAI_API_KEY.",
    questions: [],
  },
};

QUIZ_DICTIONARY.en.questions = QUIZ_DICTIONARY.az.questions.map((question) => {
  if (question.kind === "choice") {
    return { ...question };
  }
  return { ...question };
});
QUIZ_DICTIONARY.ru.questions = QUIZ_DICTIONARY.az.questions.map((question) => {
  if (question.kind === "choice") {
    return { ...question };
  }
  return { ...question };
});

const KEYWORDS = {
  vibe: {
    fresh: ["citrus", "bergamot", "lemon", "grapefruit", "marine", "aquatic", "green", "tea", "neroli"],
    warm: ["vanilla", "amber", "tonka", "benzoin", "cinnamon", "caramel", "resin"],
    floral: ["rose", "jasmine", "peony", "iris", "violet", "orange-blossom", "lily", "floral"],
    bold: ["oud", "leather", "tobacco", "smoke", "spice", "incense", "musk", "patchouli"],
  },
  occasion: {
    daily: ["citrus", "green", "musk", "floral", "tea"],
    office: ["bergamot", "citrus", "neroli", "green", "lavender", "tea"],
    date: ["rose", "vanilla", "amber", "musk", "jasmine", "tonka"],
    evening: ["oud", "amber", "leather", "tobacco", "patchouli", "spice"],
  },
  intensity: {
    soft: ["citrus", "green", "tea", "floral", "neroli"],
    balanced: ["musk", "floral", "woody", "amber"],
    strong: ["oud", "leather", "tobacco", "amber", "patchouli", "incense"],
  },
  profile: {
    citrus: ["citrus", "bergamot", "lemon", "mandarin", "grapefruit", "neroli"],
    floral: ["floral", "rose", "jasmine", "iris", "violet", "peony", "ylang"],
    woody: ["woody", "sandalwood", "cedar", "vetiver", "patchouli"],
    amber: ["amber", "vanilla", "tonka", "benzoin", "resin", "sweet"],
    oud: ["oud", "smoke", "leather", "incense", "tobacco"],
  },
  season: {
    summer: ["citrus", "marine", "aquatic", "green", "neroli"],
    winter: ["amber", "vanilla", "oud", "tobacco", "incense"],
    spring: ["floral", "green", "citrus", "woody"],
    all: ["floral", "woody", "citrus", "amber"],
  },
  longevity: {
    moderate: ["citrus", "green", "tea", "light"],
    long: ["amber", "woody", "musk", "resin"],
    beast: ["oud", "leather", "tobacco", "incense", "patchouli"],
  },
} as const;

const INITIAL_ANSWERS: QuizAnswers = {
  gender: "",
  vibe: "",
  occasion: "",
  intensity: "",
  profile: "",
  budget: "",
  season: "",
  longevity: "",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeUserFacingText(value: string) {
  return value
    .replace(/\s*by\s*etirsah\s*perfume/giu, "")
    .replace(/\s*etirsah\s*perfume/giu, "")
    .replace(/\s*etirsah/giu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizePerfumeForDisplay(perfume: Perfume): Perfume {
  return {
    ...perfume,
    name: sanitizeUserFacingText(perfume.name),
    brand: sanitizeUserFacingText(perfume.brand),
  };
}

function collectPerfumeTokens(perfume: Perfume) {
  return [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
    normalize(perfume.name),
    normalize(perfume.brand),
  ].map(normalize);
}

function countMatches(tokens: string[], keywords: readonly string[]) {
  let score = 0;
  for (const keyword of keywords) {
    if (tokens.some((token) => token.includes(keyword))) {
      score += 1;
    }
  }
  return score;
}

function getStartingPrice(perfume: Perfume) {
  if (!perfume.sizes.length) {
    return Number.POSITIVE_INFINITY;
  }

  return perfume.sizes.reduce((min, item) => (item.price < min ? item.price : min), perfume.sizes[0].price);
}

function scorePerfume(perfume: Perfume, answers: QuizAnswers) {
  const tokens = collectPerfumeTokens(perfume);
  let score = 0;

  const gender = normalize(perfume.gender);
  if (answers.gender && answers.gender !== "all") {
    if (gender.includes(answers.gender)) score += 6;
    else if (gender.includes("unisex")) score += 3;
    else score -= 2;
  }

  if (answers.vibe && answers.vibe in KEYWORDS.vibe) score += countMatches(tokens, KEYWORDS.vibe[answers.vibe as keyof typeof KEYWORDS.vibe]) * 2.2;
  if (answers.occasion && answers.occasion in KEYWORDS.occasion) score += countMatches(tokens, KEYWORDS.occasion[answers.occasion as keyof typeof KEYWORDS.occasion]) * 1.8;
  if (answers.intensity && answers.intensity in KEYWORDS.intensity) score += countMatches(tokens, KEYWORDS.intensity[answers.intensity as keyof typeof KEYWORDS.intensity]) * 1.5;
  if (answers.profile && answers.profile in KEYWORDS.profile) score += countMatches(tokens, KEYWORDS.profile[answers.profile as keyof typeof KEYWORDS.profile]) * 2.8;
  if (answers.season && answers.season in KEYWORDS.season) score += countMatches(tokens, KEYWORDS.season[answers.season as keyof typeof KEYWORDS.season]) * 1.2;
  if (answers.longevity && answers.longevity in KEYWORDS.longevity) score += countMatches(tokens, KEYWORDS.longevity[answers.longevity as keyof typeof KEYWORDS.longevity]) * 1.2;

  const price = getStartingPrice(perfume);
  if (answers.budget === "under80") score += price <= 80 ? 3 : -1;
  else if (answers.budget === "80to140") score += price >= 80 && price <= 140 ? 3 : -1;
  else if (answers.budget === "140plus") score += price >= 140 ? 3 : -1;

  if (perfume.inStock) score += 1.2;

  return score;
}

function getChoiceLabel(questions: Question[], key: keyof QuizAnswers, value: string) {
  for (const question of questions) {
    if (question.kind !== "choice" || question.key !== key) {
      continue;
    }

    const option = question.options.find((item) => item.value === value);
    return option?.label ?? "";
  }

  return "";
}

function getReasonText(locale: Locale, matchedProfile: string, tags: string[]) {
  if (locale === "az") {
    if (matchedProfile) {
      return `${matchedProfile} xəttinə uyğun nota balansı sizin zövqünüzlə yaxşı uyğunlaşır.`;
    }
    return `${tags.join(", ")} istifadəsi üçün balanslı və rahat tərz yaradır.`;
  }

  if (locale === "ru") {
    if (matchedProfile) {
      return `Композиция в стиле ${matchedProfile} хорошо совпадает с вашим ароматическим профилем.`;
    }
    return `Сочетание ${tags.join(", ")} формирует сбалансированный и комфортный характер аромата.`;
  }

  if (matchedProfile) {
    return `Its ${matchedProfile} direction aligns well with your scent profile.`;
  }

  return `The ${tags.join(", ")} profile creates a balanced and wearable signature.`;
}

function getResultTags(dictionary: QuizDictionary, answers: QuizAnswers) {
  return [
    answers.occasion ? getChoiceLabel(dictionary.questions, "occasion", answers.occasion) : "",
    answers.season ? getChoiceLabel(dictionary.questions, "season", answers.season) : "",
    answers.profile ? getChoiceLabel(dictionary.questions, "profile", answers.profile) : "",
  ].filter(Boolean);
}

export function ScentQuizClient({ perfumes, notes, locale }: { perfumes: Perfume[]; notes: Note[]; locale: Locale }) {
  const NOTES_PER_PAGE = 24;
  const dictionary = QUIZ_DICTIONARY[locale];
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [notePreferences, setNotePreferences] = useState<Record<string, "like" | "dislike">>({});
  const [extraAiNotes, setExtraAiNotes] = useState("");
  const [notesQuery, setNotesQuery] = useState("");
  const [notesPage, setNotesPage] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [questionCardHeight, setQuestionCardHeight] = useState<number | null>(null);
  const [aiMatches, setAiMatches] = useState<Perfume[] | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [hasGeneratedAi, setHasGeneratedAi] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const questionCardRef = useRef<HTMLDivElement | null>(null);
  const questionCardInnerRef = useRef<HTMLDivElement | null>(null);
  const lastGeneratedRef = useRef("");

  const choiceQuestions = useMemo(() => {
    const seen = new Set<string>();
    return dictionary.questions
      .filter((question): question is ChoiceQuestion => question.kind === "choice")
      .filter((question) => {
        if (seen.has(question.key)) return false;
        seen.add(question.key);
        return true;
      });
  }, [dictionary.questions]);

  const noteStepIndex = choiceQuestions.length;
  const totalSteps = choiceQuestions.length + 1;
  const isNotesStep = stepIndex === noteStepIndex;
  const isComplete = stepIndex > noteStepIndex;
  const currentStepIndex = Math.min(stepIndex, Math.max(choiceQuestions.length - 1, 0));
  const currentQuestion = choiceQuestions[currentStepIndex];

  const topMatches = useMemo(() => {
    if (!isComplete) return [] as Perfume[];

    return [...perfumes]
      .map((perfume) => ({ perfume, score: scorePerfume(perfume, answers) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.perfume);
  }, [answers, isComplete, perfumes]);

  const perfumesBySlug = useMemo(() => new Map(perfumes.map((item) => [item.slug, item])), [perfumes]);
  const shownMatches = aiMatches && aiMatches.length ? aiMatches : topMatches;
  const shouldShowResults = hasGeneratedAi && !isAiLoading;

  const resultConfidence = useMemo(() => {
    const filledChoiceCount = Object.values(answers).filter(Boolean).length;
    const filledTextCount =
      (Object.keys(notePreferences).length > 0 ? 1 : 0) +
      (extraAiNotes.trim().length > 1 ? 1 : 0);
    const score = 72 + filledChoiceCount * 2.6 + filledTextCount * 4.2;
    return Math.max(74, Math.min(98, Math.round(score)));
  }, [answers, extraAiNotes, notePreferences]);

  const profileLine = [
    answers.vibe ? getChoiceLabel(choiceQuestions, "vibe", answers.vibe) : "",
    answers.profile ? getChoiceLabel(choiceQuestions, "profile", answers.profile) : "",
    answers.intensity ? getChoiceLabel(choiceQuestions, "intensity", answers.intensity) : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const fitLine = [
    answers.occasion ? getChoiceLabel(choiceQuestions, "occasion", answers.occasion) : "",
    answers.season ? getChoiceLabel(choiceQuestions, "season", answers.season) : "",
    answers.longevity ? getChoiceLabel(choiceQuestions, "longevity", answers.longevity) : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const likedNotes = useMemo(
    () => Object.entries(notePreferences).filter(([, state]) => state === "like").map(([slug]) => slug),
    [notePreferences],
  );
  const dislikedNotes = useMemo(
    () => Object.entries(notePreferences).filter(([, state]) => state === "dislike").map(([slug]) => slug),
    [notePreferences],
  );

  const noteBySlug = useMemo(() => {
    return new Map(notes.map((note) => [note.slug, note]));
  }, [notes]);

  const normalizedNotesQuery = useMemo(() => normalize(notesQuery), [notesQuery]);

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        if (!normalizedNotesQuery) return true;
        return (
          normalize(localizeNoteLabel(note, locale)).includes(normalizedNotesQuery) ||
          note.slug.includes(normalizedNotesQuery)
        );
      }),
    [locale, normalizedNotesQuery, notes],
  );

  const totalNotePages = Math.max(1, Math.ceil(filteredNotes.length / NOTES_PER_PAGE));
  const currentNotesPage = Math.min(notesPage, totalNotePages);

  const visibleNotes = useMemo(() => {
    const start = (currentNotesPage - 1) * NOTES_PER_PAGE;
    return filteredNotes.slice(start, start + NOTES_PER_PAGE);
  }, [currentNotesPage, filteredNotes]);

  const notesLine = likedNotes.length
    ? likedNotes
        .slice(0, 4)
        .map((slug) => {
          const note = noteBySlug.get(slug);
          return note ? localizeNoteLabel(note, locale) : humanizeNoteToken(slug);
        })
        .join(", ")
    : answers.profile
      ? getChoiceLabel(choiceQuestions, "profile", answers.profile)
      : "-";

  const summaryChips = [
    { label: dictionary.chipProfile, value: profileLine || "-" },
    { label: dictionary.chipNotes, value: notesLine },
    { label: dictionary.chipFit, value: fitLine || "-" },
  ];

  const resultTags = getResultTags({ ...dictionary, questions: choiceQuestions }, answers);
  const visibleMatches = isMobileLayout ? (aiMatches ?? []) : shownMatches;
  const featuredMatch = visibleMatches[0];
  const secondaryMatches = visibleMatches.slice(1);

  const summaryPreview = useMemo(() => {
    if (!aiSummary) return "";

    if (aiSummary.length <= 160) {
      return aiSummary;
    }

    return `${aiSummary.slice(0, 160).trimEnd()}...`;
  }, [aiSummary]);

  const progress = Math.round((Math.min(stepIndex, totalSteps) / totalSteps) * 100);
  const currentAnswer = currentQuestion ? answers[currentQuestion.key] : "";

  const onSelect = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
  };

  const onNext = () => {
    if (isNotesStep) {
      setStepIndex(totalSteps);
      return;
    }

    if (!currentAnswer) return;
    setStepIndex((prev) => Math.min(prev + 1, noteStepIndex));
  };

  const onPrevious = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const onRestart = () => {
    setAnswers(INITIAL_ANSWERS);
    setNotePreferences({});
    setExtraAiNotes("");
    setNotesQuery("");
    setStepIndex(0);
    setAiMatches(null);
    setAiSummary("");
    setAiError("");
    setAiNotice("");
    setHasGeneratedAi(false);
    lastGeneratedRef.current = "";
  };

  const requestAiRecommendations = async () => {
    setIsAiLoading(true);
    setAiError("");
    setAiNotice("");

    try {
      const response = await fetch("/api/qoxunu/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          answers,
          freeText: [
            likedNotes.length ? `favorite note slugs: ${likedNotes.join(", ")}` : "",
            dislikedNotes.length ? `avoid note slugs: ${dislikedNotes.join(", ")}` : "",
            extraAiNotes.trim() ? `extra preference notes: ${extraAiNotes.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          fallbackSlugs: topMatches.map((item) => item.slug),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        slugs?: string[];
        summary?: string;
        error?: string;
        usedFallback?: boolean;
      };

      if (!response.ok) {
        const normalizedError = (payload.error || "").toLowerCase();
        setAiError(normalizedError.includes("openai_api_key") ? dictionary.apiMissing : payload.error || dictionary.failed);
        setIsAiLoading(false);
        setHasGeneratedAi(true);
        return;
      }

      const mapped = (payload.slugs ?? [])
        .map((slug) => perfumesBySlug.get(slug))
        .filter((item): item is Perfume => Boolean(item));

      if (payload.usedFallback) {
        setAiNotice(dictionary.fallbackNotice);
      } else {
        const currentTopSlugs = topMatches.map((item) => item.slug).join("|");
        const mappedSlugs = mapped.map((item) => item.slug).join("|");
        if (mappedSlugs && mappedSlugs === currentTopSlugs) {
          setAiNotice(dictionary.sameResultNotice);
        }
      }

      setAiMatches(mapped.length ? mapped : null);
      setAiSummary(sanitizeUserFacingText((payload.summary ?? "").trim()));
      setHasGeneratedAi(true);
    } catch {
      setAiError(dictionary.failed);
      setHasGeneratedAi(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  const generationKey = useMemo(
    () => JSON.stringify({ answers, notePreferences, extraAiNotes, topSlugs: topMatches.map((item) => item.slug) }),
    [answers, extraAiNotes, notePreferences, topMatches],
  );

  useEffect(() => {
    if (!isComplete || isAiLoading || hasGeneratedAi) return;
    if (generationKey === lastGeneratedRef.current) return;

    lastGeneratedRef.current = generationKey;
    void requestAiRecommendations();
  }, [generationKey, hasGeneratedAi, isAiLoading, isComplete]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const handleChange = () => {
      const mobile = mediaQuery.matches;
      setIsMobileLayout(mobile);
      setIsSummaryExpanded(!mobile);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      setIsSummaryExpanded(true);
    }
  }, [isMobileLayout]);

  useEffect(() => {
    setNotesPage(1);
  }, [normalizedNotesQuery]);

  useEffect(() => {
    if (notesPage > totalNotePages) {
      setNotesPage(totalNotePages);
    }
  }, [notesPage, totalNotePages]);

  useLayoutEffect(() => {
    if (isComplete || !questionCardRef.current || !questionCardInnerRef.current) return;

    const currentHeight = questionCardRef.current.getBoundingClientRect().height;
    const nextHeight = questionCardInnerRef.current.getBoundingClientRect().height;

    if (!currentHeight || !nextHeight || Math.abs(currentHeight - nextHeight) < 2) {
      setQuestionCardHeight(null);
      return;
    }

    setQuestionCardHeight(currentHeight);

    const frameId = window.requestAnimationFrame(() => {
      setQuestionCardHeight(nextHeight);
    });

    const timeoutId = window.setTimeout(() => {
      setQuestionCardHeight(null);
    }, 520);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [currentQuestion, isComplete]);

  const renderResultMeta = (perfume: Perfume, index: number, dense = false) => {
    const tags = resultTags.length ? resultTags : [sanitizeUserFacingText(perfume.brand) || "Seçim"];
    const profileLabel = answers.profile ? getChoiceLabel(choiceQuestions, "profile", answers.profile) : "";
    const profileMatch =
      answers.profile && answers.profile in KEYWORDS.profile
        ? countMatches(collectPerfumeTokens(perfume), KEYWORDS.profile[answers.profile as keyof typeof KEYWORDS.profile])
        : 0;
    const reason = getReasonText(locale, profileMatch > 0 ? profileLabel : "", tags);

    return (
      <div className={dense ? "qoxunu-mobile-meta" : "qoxunu-desktop-meta"}>
        <p className="inline-flex rounded-full border border-zinc-300/90 bg-[#f7f6f3] px-2.5 py-1 text-[0.62rem] font-semibold tracking-[0.11em] text-zinc-700 uppercase">
          {dictionary.rankedLabel} #{index + 1}
        </p>
        <p className="mt-2 text-[0.7rem] font-semibold tracking-[0.11em] text-zinc-500 uppercase">{dictionary.reasonLabel}</p>
        <p className={dense ? "qoxunu-mobile-reason mt-1 text-[0.8rem] leading-5 text-zinc-700" : "mt-1 text-[0.8rem] leading-5 text-zinc-700"}>{reason}</p>
        <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
          {tags.slice(0, 3).map((tag) => (
            <span key={`${perfume.id}-${tag}`} className="shrink-0 rounded-full border border-zinc-300/85 bg-[#f4f4f2] px-2 py-0.5 text-[0.62rem] font-medium text-zinc-600">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="mx-auto w-full max-w-none px-0 pb-10 pt-3 sm:pb-6 sm:pt-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{dictionary.eyebrow}</p>
        <h1 className="mt-2 text-3xl leading-tight text-zinc-900 sm:text-4xl">{dictionary.title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-600 sm:text-base">{dictionary.description}</p>
      </div>

      {!isComplete ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-600">
            {dictionary.stepsLabel} {Math.min(stepIndex + 1, totalSteps)} / {totalSteps}
          </p>
          <p className="text-sm font-medium text-zinc-600">
            {dictionary.progressLabel} {progress}%
          </p>
        </div>
      ) : null}

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-zinc-900 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!isComplete ? (
        <div
          ref={questionCardRef}
          style={questionCardHeight !== null ? { height: `${questionCardHeight}px` } : undefined}
          className="mt-3 overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          <div ref={questionCardInnerRef} className="py-1 sm:py-2">
            {!isNotesStep ? (
              <>
                <h2
              className={[
                "leading-tight text-zinc-900",
                "text-[1.85rem] sm:text-[2rem]",
              ].join(" ")}
            >
              {currentQuestion.title}
            </h2>
            <p
              className={[
                "mt-1.5 text-zinc-500",
                "text-[0.95rem] sm:text-base",
              ].join(" ")}
            >
              {currentQuestion.description}
            </p>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {currentQuestion.options.map((option, index) => {
                  const active = currentAnswer === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSelect(option.value)}
                      style={{ animationDelay: `${index * 80}ms` }}
                      className={[
                        "quiz-option-reveal rounded-2xl border px-3 py-3 text-left transition-all duration-300 sm:px-4 sm:py-4",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_16px_34px_rgba(18,18,20,0.2)]"
                          : "border-zinc-300/85 bg-[#f3f3f2] text-zinc-700 md:hover:border-zinc-400 md:hover:bg-zinc-100/50",
                      ].join(" ")}
                    >
                      <p className="text-[0.97rem] font-semibold sm:text-[1rem]">{option.label}</p>
                      <p className={["mt-1 hidden text-xs sm:block sm:text-sm", active ? "text-zinc-300" : "text-zinc-500"].join(" ")}>
                        {option.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
              </>
            ) : (
              <div>
                <h2 className="text-[1.85rem] leading-tight text-zinc-900 sm:text-[2rem]">
                  {locale === "az"
                    ? "Sevdiyin və sevmədiyin notları seç"
                    : locale === "ru"
                      ? "Выберите любимые и нежелательные ноты"
                      : "Pick notes you like and dislike"}
                </h2>
                <p className="mt-1.5 text-[0.95rem] text-zinc-500 sm:text-base">
                  {locale === "az"
                    ? "Kartlara klik et: əvvəl sevilən, ikinci klik sevilməyən, üçüncü klik sıfırlayır."
                    : locale === "ru"
                      ? "Нажмите на карточку: сначала нравится, второй раз не нравится, третий раз сбрасывает выбор."
                      : "Tap a card: first click likes, second dislikes, third resets."}
                </p>

                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white/90 p-3">
                  <input
                    value={notesQuery}
                    onChange={(event) => setNotesQuery(event.target.value)}
                    placeholder={locale === "az" ? "Not axtar..." : locale === "ru" ? "Поиск нот..." : "Search notes..."}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2 text-[0.7rem] font-medium text-zinc-500 sm:text-xs">
                    <span>
                      {locale === "az"
                        ? `${filteredNotes.length} not tapıldı`
                        : locale === "ru"
                          ? `Найдено: ${filteredNotes.length}`
                          : `${filteredNotes.length} notes found`}
                    </span>
                    <span>
                      {locale === "az"
                        ? `Səhifə ${currentNotesPage}/${totalNotePages}`
                        : locale === "ru"
                          ? `Страница ${currentNotesPage}/${totalNotePages}`
                          : `Page ${currentNotesPage}/${totalNotePages}`}
                    </span>
                  </div>

                  <div key={`${currentNotesPage}-${normalizedNotesQuery}`} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {visibleNotes.map((note, index) => {
                        const state = notePreferences[note.slug];
                        return (
                          <button
                            key={note.slug}
                            type="button"
                            onClick={() => {
                              setNotePreferences((prev) => {
                                const next = { ...prev };
                                const current = next[note.slug];
                                if (!current) {
                                  next[note.slug] = "like";
                                  return next;
                                }
                                if (current === "like") {
                                  next[note.slug] = "dislike";
                                  return next;
                                }
                                delete next[note.slug];
                                return next;
                              });
                            }}
                            className={[
                              "qoxunu-note-reveal group rounded-xl border bg-white p-1.5 text-left transition-all duration-300",
                              state === "like"
                                ? "border-emerald-400 bg-emerald-50/65"
                                : state === "dislike"
                                  ? "border-rose-400 bg-rose-50/65"
                                  : "border-zinc-200 hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-zinc-50",
                            ].join(" ")}
                            style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                          >
                            <div className="flex items-center gap-2 rounded-[0.7rem]">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[0.65rem] bg-zinc-100">
                                {note.image ? (
                                  <Image
                                    src={note.image}
                                    alt={note.imageAlt || localizeNoteLabel(note, locale)}
                                    fill
                                    sizes="(max-width: 640px) 20vw, (max-width: 1024px) 14vw, 9vw"
                                    unoptimized
                                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-[0.6rem] text-zinc-400">Perfoumer</div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="line-clamp-1 text-[0.78rem] font-medium text-zinc-900">{localizeNoteLabel(note, locale)}</p>
                                <p className="mt-0.5 line-clamp-1 text-[0.7rem] text-zinc-500">
                                {state === "like"
                                  ? locale === "az"
                                    ? "Sevirəm"
                                    : locale === "ru"
                                      ? "Нравится"
                                      : "Like"
                                  : state === "dislike"
                                    ? locale === "az"
                                      ? "Sevmirəm"
                                      : locale === "ru"
                                        ? "Не нравится"
                                        : "Dislike"
                                    : locale === "az"
                                      ? "Seçilməyib"
                                      : locale === "ru"
                                        ? "Не выбрано"
                                        : "Not selected"}
                                  </p>
                                </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>

                  {filteredNotes.length === 0 ? (
                    <p className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                      {locale === "az"
                        ? "Bu axtarışa uyğun not tapılmadı."
                        : locale === "ru"
                          ? "По вашему запросу ноты не найдены."
                          : "No notes match this search."}
                    </p>
                  ) : null}

                  {totalNotePages > 1 ? (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setNotesPage((page) => Math.max(1, page - 1))}
                        disabled={currentNotesPage <= 1}
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-zinc-300 bg-[#f6f5f2] px-3 text-xs font-semibold text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {locale === "az" ? "Əvvəlki" : locale === "ru" ? "Назад" : "Previous"}
                      </button>

                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: Math.min(totalNotePages, 5) }, (_, idx) => {
                          const start = Math.min(
                            Math.max(1, currentNotesPage - 2),
                            Math.max(1, totalNotePages - 4),
                          );
                          const page = start + idx;
                          const active = page === currentNotesPage;

                          return (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setNotesPage(page)}
                              className={[
                                "inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition",
                                active
                                  ? "border-zinc-900 bg-zinc-900 text-white"
                                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
                              ].join(" ")}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setNotesPage((page) => Math.min(totalNotePages, page + 1))}
                        disabled={currentNotesPage >= totalNotePages}
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-zinc-300 bg-[#f6f5f2] px-3 text-xs font-semibold text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {locale === "az" ? "Növbəti" : locale === "ru" ? "Далее" : "Next"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white/90 p-3">
                  <label className="block">
                    <span className="mb-2 block text-[0.72rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      {locale === "az" ? "Əlavə qeyd (istəyə bağlı)" : locale === "ru" ? "Дополнительные пожелания (необязательно)" : "Extra notes (optional)"}
                    </span>
                    <textarea
                      value={extraAiNotes}
                      onChange={(event) => setExtraAiNotes(event.target.value)}
                      rows={3}
                      placeholder={
                        locale === "az"
                          ? "Məsələn: daha az şirin olsun, ofis üçün sakit qoxu, daha premium hiss..."
                          : locale === "ru"
                            ? "Например: меньше сладости, мягче для офиса, более премиальное звучание..."
                            : "For example: less sweet, softer for office, more premium vibe..."
                      }
                      className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onPrevious}
                disabled={stepIndex === 0}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 bg-[#f3f3f2] px-4 text-sm font-semibold text-zinc-600 transition md:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11 sm:px-5"
              >
                {dictionary.previous}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!isNotesStep && !currentAnswer}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-5 text-sm font-semibold text-white transition md:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11 sm:px-6"
              >
                {dictionary.next}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="quiz-results-enter mt-4">
          <div className="quiz-results-hero relative overflow-hidden rounded-[1.35rem] px-3 py-4 sm:px-4 sm:py-4.5 lg:px-5 lg:py-5">
            <div className="qoxunu-result-header grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <h2 className="text-[1.7rem] leading-tight text-zinc-900 sm:text-[1.95rem] lg:text-[2.15rem]">{dictionary.resultTitle}</h2>
                <p className="mt-1.5 max-w-3xl text-[0.88rem] leading-6 text-zinc-600 sm:text-[0.93rem]">{dictionary.resultDescription}</p>
                <p className="mt-2 inline-flex rounded-full border border-zinc-700/20 bg-white/80 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.11em] text-zinc-700 uppercase md:hidden">
                  {dictionary.resultConfidenceLabel}: {resultConfidence}%
                </p>
              </div>

              <div className="hidden flex-wrap items-center gap-2 lg:justify-end md:flex">
                <p className="inline-flex rounded-full border border-zinc-700/20 bg-white/75 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.11em] text-zinc-700 uppercase">
                  {dictionary.resultConfidenceLabel}: {resultConfidence}%
                </p>
                <button
                  type="button"
                  onClick={onRestart}
                  className="hidden min-h-9 items-center justify-center rounded-full border border-zinc-300/90 bg-[#f6f5f2] px-4 text-xs font-semibold text-zinc-700 transition duration-300 md:inline-flex md:hover:-translate-y-0.5 md:hover:bg-white"
                >
                  {dictionary.restart}
                </button>
                <Link
                  href="/catalog"
                  className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-4 text-xs font-semibold text-white shadow-[0_12px_24px_rgba(24,24,24,0.18)] transition duration-300 md:w-auto md:hover:-translate-y-0.5 md:hover:bg-zinc-800"
                >
                  {dictionary.seeCatalog}
                </Link>
              </div>
            </div>
          </div>

          {isMobileLayout ? (
            <div className="mt-3 space-y-3">
              {isAiLoading ? (
                <div className="rounded-xl border border-zinc-200 bg-white px-3 py-4">
                  <p className="text-sm font-medium text-zinc-700">{dictionary.generating}</p>
                  <p className="mt-1 text-xs text-zinc-500">{dictionary.generatingHint}</p>
                  <div className="mt-3 space-y-2">
                    <div className="quiz-loading-chip h-40 rounded-[1.1rem]" />
                    <div className="quiz-loading-chip h-4 rounded-lg" />
                    <div className="quiz-loading-chip h-3 w-2/3 rounded-lg" />
                  </div>
                </div>
              ) : null}

              {!isAiLoading && featuredMatch ? (
                <section className="qoxunu-mobile-featured rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex rounded-full border border-zinc-300/90 bg-[#f7f6f3] px-2.5 py-1 text-[0.62rem] font-semibold tracking-[0.11em] text-zinc-700 uppercase">
                      {dictionary.topPickLabel}
                    </p>
                    <span className="text-[0.62rem] font-semibold tracking-[0.11em] text-zinc-500 uppercase">{dictionary.resultConfidenceLabel} {resultConfidence}%</span>
                  </div>

                  <div className="mt-2">
                    {renderResultMeta(featuredMatch, 0, true)}
                  </div>

                  <div className="mt-3 border-t border-zinc-200 pt-3">
                    <ProductCard perfume={sanitizePerfumeForDisplay(featuredMatch)} locale={locale} />
                  </div>
                </section>
              ) : null}

              {!isAiLoading && secondaryMatches.length ? (
                <section>
                  <p className="mb-2 text-[0.67rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">{dictionary.otherPicksLabel}</p>
                  <div className="qoxunu-mobile-carousel -mx-2 flex gap-3 overflow-x-auto px-2 pb-2 pr-5 snap-x snap-mandatory">
                    {secondaryMatches.map((perfume, index) => (
                      <div key={perfume.id} className="qoxunu-mobile-slide min-w-[82vw] max-w-[82vw] snap-center rounded-xl border border-zinc-200 bg-white p-3">
                        {renderResultMeta(perfume, index + 2, true)}
                        <div className="mt-3 border-t border-zinc-200 pt-3">
                          <ProductCard perfume={sanitizePerfumeForDisplay(perfume)} locale={locale} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {!isAiLoading && !featuredMatch ? (
                <div className="quiz-results-empty rounded-xl border border-zinc-200 bg-white px-3 py-3 text-zinc-500">
                  <p className="text-lg font-semibold text-zinc-700">{dictionary.noMatchTitle}</p>
                  <p className="mt-1.5 text-sm leading-6">{dictionary.noMatchDescription}</p>
                </div>
              ) : null}

              <div className="qoxunu-mobile-dock">
                <div
                  className={[
                    "qoxunu-mobile-dock-panel rounded-lg border border-zinc-200 bg-white px-3 py-3",
                    isSummaryExpanded ? "qoxunu-mobile-dock-panel--open" : "qoxunu-mobile-dock-panel--closed",
                  ].join(" ")}
                >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.67rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">{dictionary.aiSummaryLabel}</p>
                        <p className="mt-1 text-sm leading-6 text-zinc-700">{aiSummary || summaryPreview || dictionary.generatingHint}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSummaryExpanded(false)}
                        aria-label={dictionary.showLess}
                        className="qoxunu-dock-toggle group"
                      >
                        <span className="qoxunu-dock-toggle-stick qoxunu-dock-toggle-stick-top qoxunu-dock-toggle-stick-top--open" />
                        <span className="qoxunu-dock-toggle-stick qoxunu-dock-toggle-stick-bottom qoxunu-dock-toggle-stick-bottom--open" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {summaryChips.map((chip) => (
                        <div key={chip.label} className="qoxunu-summary-chip rounded-xl border border-zinc-200/80 bg-[#fafaf8] px-3 py-2">
                          <p className="text-[0.62rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">{chip.label}</p>
                          <p className="mt-1 text-[0.8rem] leading-5 text-zinc-700">{chip.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3">
                      <Link
                        href="/catalog"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(24,24,24,0.18)]"
                      >
                        {dictionary.seeCatalog}
                      </Link>
                    </div>
                </div>

                <div
                  className={[
                    "qoxunu-mobile-dock-bar rounded-lg border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-[0_12px_28px_rgba(24,24,24,0.08)] backdrop-blur-md",
                    isSummaryExpanded ? "qoxunu-mobile-dock-bar--hidden" : "qoxunu-mobile-dock-bar--visible",
                  ].join(" ")}
                >
                    <div className="flex items-center gap-2">
                      <div className="min-h-[56px] flex-1 rounded-lg border border-zinc-300 bg-[#f6f5f2] px-3 py-2 text-left text-[0.78rem] font-medium text-zinc-700">
                        <span className="block text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">{dictionary.aiSummaryLabel}</span>
                        <span className="mt-0.5 block line-clamp-2 text-[0.8rem] leading-[1.3] text-zinc-700">{summaryPreview || aiSummary || dictionary.generatingHint}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsSummaryExpanded((value) => !value)}
                        aria-label={dictionary.showMore}
                        className="qoxunu-dock-toggle group"
                      >
                        <span className="qoxunu-dock-toggle-stick qoxunu-dock-toggle-stick-top" />
                        <span className="qoxunu-dock-toggle-stick qoxunu-dock-toggle-stick-bottom" />
                      </button>

                      <Link
                        href="/catalog"
                        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(24,24,24,0.18)]"
                      >
                        {dictionary.seeCatalog}
                      </Link>
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-2.5 rounded-[1.35rem] border border-zinc-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
                {isAiLoading ? (
                  <div>
                    <p className="text-sm font-medium text-zinc-700">{dictionary.generating}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{dictionary.generatingHint}</p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                      <div className="quiz-loading-chip h-14 rounded-xl" />
                      <div className="quiz-loading-chip h-14 rounded-xl" />
                      <div className="quiz-loading-chip h-14 rounded-xl" />
                    </div>
                  </div>
                ) : null}

                {aiSummary && shouldShowResults ? (
                  <details open className="qoxunu-summary-shell mt-1 rounded-2xl border border-zinc-200 bg-[#f7f7f6] px-3 py-3">
                    <summary className="qoxunu-summary-summary cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.67rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">{dictionary.aiSummaryLabel}</p>
                          <p className="mt-1 text-sm leading-6 text-zinc-700 sm:text-[0.92rem]">{aiSummary}</p>
                        </div>
                        <span className="hidden rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-zinc-600 uppercase sm:inline-flex">
                          Details
                        </span>
                      </div>
                    </summary>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-3">
                      {summaryChips.map((chip) => (
                        <div key={chip.label} className="qoxunu-summary-chip rounded-xl border border-zinc-200/80 bg-white/90 px-3 py-2">
                          <p className="text-[0.62rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">{chip.label}</p>
                          <p className="mt-1 text-[0.8rem] leading-5 text-zinc-700">{chip.value}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}

                {aiNotice ? <p className="mt-2.5 text-xs text-amber-700">{aiNotice}</p> : null}
                {aiError ? <p className="mt-2.5 text-xs text-rose-600">{aiError}</p> : null}
              </div>

              {isAiLoading ? (
                <div className="quiz-results-grid mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 xl:gap-5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`loading-${index}`} className="quiz-loading-card rounded-[1.3rem] border border-zinc-200 bg-white p-3 sm:p-4">
                      <div className="quiz-loading-chip h-5 w-16 rounded-full" />
                      <div className="quiz-loading-chip mt-3 h-56 rounded-2xl" />
                      <div className="quiz-loading-chip mt-3 h-4 rounded-lg" />
                      <div className="quiz-loading-chip mt-2 h-3 w-3/4 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : null}

              {shouldShowResults ? (
                shownMatches.length ? (
                  <div className="quiz-results-grid mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3 xl:gap-4">
                    {shownMatches.map((perfume, index) => (
                      <div key={perfume.id} className="quiz-result-card-wrap rounded-[1.2rem] border border-zinc-200 bg-white px-2.5 py-2.5 sm:px-3 sm:py-3" style={{ animationDelay: `${110 + index * 90}ms` }}>
                        {renderResultMeta(perfume, index, false)}
                        <div className="mt-2.5 border-t border-zinc-200 pt-2.5">
                          <ProductCard perfume={perfume} locale={locale} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="quiz-results-empty mt-4 rounded-[1.2rem] border border-zinc-200 bg-white px-3 py-3 text-zinc-500">
                    <p className="text-lg font-semibold text-zinc-700">{dictionary.noMatchTitle}</p>
                    <p className="mt-1.5 text-sm leading-6">{dictionary.noMatchDescription}</p>
                  </div>
                )
              ) : null}
            </>
          )}
        </div>
      )}
    </section>
  );
}
