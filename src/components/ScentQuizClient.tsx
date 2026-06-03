"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  CurrencyCircleDollar,
  Eye,
  Fire,
  Flower,
  GenderIntersex,
  Moon,
  ShoppingCartSimple,
  Sparkle,
  Sun,
  User,
  UsersThree,
  Waves,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toLocalePath, type Locale } from "@/lib/i18n";
import { humanizeNoteToken, localizeNoteLabel } from "@/lib/note-label";
import type { Note, Perfume } from "@/types/catalog";

type QuizAnswers = {
  gender: string;
  vibe: string;
  occasion: string;
  intensity: string;
  projection: string;
  sweetness: string;
  profile: string;
  budget: string;
  season: string;
  longevity: string;
};

type TextAnswers = {
  favoriteNotes: string;
  avoidNotes: string;
};

type QuizUserContext = {
  id: string;
  email: string;
  username: string;
  isSignedIn: boolean;
  isGuest: boolean;
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

const QOXUNU_HERO_IMAGE = "/qoxunutapimg.png";

type QuickQuestionKey = keyof QuizAnswers;

const QUICK_QUESTION_KEYS: QuickQuestionKey[] = [
  "gender",
  "vibe",
  "occasion",
  "intensity",
  "projection",
  "sweetness",
  "season",
  "profile",
  "longevity",
  "budget",
];

const OPTION_TONES: Record<string, { tint: string; accent: string; label: string }> = {
  all: { tint: "from-zinc-50 to-white", accent: "bg-zinc-900", label: "All" },
  unisex: { tint: "from-violet-50 to-white", accent: "bg-violet-500", label: "Uni" },
  qadın: { tint: "from-rose-50 to-white", accent: "bg-rose-500", label: "Soft" },
  kişi: { tint: "from-slate-100 to-white", accent: "bg-slate-700", label: "Deep" },
  fresh: { tint: "from-cyan-50 to-white", accent: "bg-cyan-500", label: "Air" },
  warm: { tint: "from-amber-50 to-white", accent: "bg-amber-500", label: "Warm" },
  floral: { tint: "from-pink-50 to-white", accent: "bg-pink-500", label: "Bloom" },
  bold: { tint: "from-stone-100 to-white", accent: "bg-stone-800", label: "Bold" },
  daily: { tint: "from-emerald-50 to-white", accent: "bg-emerald-500", label: "Day" },
  office: { tint: "from-blue-50 to-white", accent: "bg-blue-500", label: "Clean" },
  date: { tint: "from-fuchsia-50 to-white", accent: "bg-fuchsia-500", label: "Close" },
  evening: { tint: "from-indigo-50 to-white", accent: "bg-indigo-600", label: "Night" },
  soft: { tint: "from-sky-50 to-white", accent: "bg-sky-400", label: "Soft" },
  balanced: { tint: "from-teal-50 to-white", accent: "bg-teal-500", label: "Mid" },
  strong: { tint: "from-orange-50 to-white", accent: "bg-orange-500", label: "Long" },
  under80: { tint: "from-lime-50 to-white", accent: "bg-lime-600", label: "Easy" },
  "80to140": { tint: "from-violet-50 to-white", accent: "bg-violet-500", label: "Core" },
  "140plus": { tint: "from-zinc-100 to-white", accent: "bg-zinc-900", label: "Prem" },
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
        key: "projection",
        title: "İzlənmə nə qədər yaxın olsun?",
        description: "Ətrinin səndən nə qədər uzağa hiss olunmasını istəyirsən?",
        options: [
          { value: "skin", label: "Dəriyə yaxın", hint: "Yalnız yaxın məsafədə hiss olunur" },
          { value: "close", label: "Yaxın aura", hint: "Zərif, səliqəli iz buraxır" },
          { value: "moderate", label: "Orta yayılım", hint: "Gündəlik üçün ən balanslı" },
          { value: "bold", label: "İddialı iz", hint: "Girişdə hiss olunan daha güclü aura" },
        ],
      },
      {
        kind: "choice",
        key: "sweetness",
        title: "Şirinlik səviyyəsi necə olsun?",
        description: "Şirinlik qoxunun minimal, balanslı və ya gur olmasını dəyişir.",
        options: [
          { value: "dry", label: "Quru və təmiz", hint: "Şirinlik demək olar ki, hiss olunmur" },
          { value: "balanced", label: "Balanslı", hint: "Yumşaq, zərif şirinlik" },
          { value: "sweet", label: "Şirin", hint: "Daha yumşaq və cazibəli" },
          { value: "rich", label: "Doygun", hint: "Aydın, zəngin şirin ton" },
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
    questions: [
      {
        kind: "choice",
        key: "gender",
        title: "What category are you mainly looking for?",
        description: "This helps group the right scents more accurately.",
        options: [
          { value: "all", label: "No preference", hint: "Women, men, and unisex together" },
          { value: "unisex", label: "Unisex", hint: "Balanced and versatile" },
          { value: "qadın", label: "Women", hint: "More soft and elegant" },
          { value: "kişi", label: "Men", hint: "More deep and characterful" },
        ],
      },
      {
        kind: "choice",
        key: "vibe",
        title: "What overall vibe should the scent have?",
        description: "Pick the mood you want to feel most.",
        options: [
          { value: "fresh", label: "Fresh and clean", hint: "Citrus, green, light" },
          { value: "warm", label: "Warm and soft", hint: "Vanilla, amber, cozy" },
          { value: "floral", label: "Floral and elegant", hint: "Rose, jasmine, powdery" },
          { value: "bold", label: "Bold and strong", hint: "Oud, leather, spice" },
        ],
      },
      {
        kind: "choice",
        key: "occasion",
        title: "Where will you use it most?",
        description: "The setting changes the right scent profile.",
        options: [
          { value: "daily", label: "Every day", hint: "Versatility matters most" },
          { value: "office", label: "Office", hint: "Soft and polished" },
          { value: "date", label: "Date", hint: "Pleasant at close range" },
          { value: "evening", label: "Evening", hint: "Fuller and deeper" },
        ],
      },
      {
        kind: "choice",
        key: "intensity",
        title: "How noticeable should it be?",
        description: "Choose the feel of the projection and longevity.",
        options: [
          { value: "soft", label: "Light", hint: "Quiet and close" },
          { value: "balanced", label: "Balanced", hint: "Ideal for daily wear" },
          { value: "strong", label: "Strong", hint: "More expressive and lasting" },
        ],
      },
      {
        kind: "choice",
        key: "projection",
        title: "How far should the scent trail carry?",
        description: "How far do you want the scent to be noticed?",
        options: [
          { value: "skin", label: "Skin close", hint: "Only felt up close" },
          { value: "close", label: "Close aura", hint: "Leaves a neat, subtle trail" },
          { value: "moderate", label: "Moderate trail", hint: "The best balance for daily wear" },
          { value: "bold", label: "Bold trail", hint: "A stronger aura on entry" },
        ],
      },
      {
        kind: "choice",
        key: "sweetness",
        title: "How sweet should it be?",
        description: "Sweetness changes whether the scent feels dry, balanced, or rich.",
        options: [
          { value: "dry", label: "Dry and clean", hint: "Almost no sweetness" },
          { value: "balanced", label: "Balanced", hint: "Soft and elegant sweetness" },
          { value: "sweet", label: "Sweet", hint: "Softer and more attractive" },
          { value: "rich", label: "Rich", hint: "Clear and dense sweetness" },
        ],
      },
      {
        kind: "choice",
        key: "season",
        title: "What is the main season?",
        description: "Seasonal context helps AI rank the picks better.",
        options: [
          { value: "all", label: "All seasons", hint: "Universal use" },
          { value: "summer", label: "Summer", hint: "Light and fresh" },
          { value: "winter", label: "Winter", hint: "Warmer and fuller" },
          { value: "spring", label: "Spring/Autumn", hint: "Balanced transition scents" },
        ],
      },
      {
        kind: "choice",
        key: "profile",
        title: "Which family are you closer to?",
        description: "The main note family has a strong effect on the top result.",
        options: [
          { value: "citrus", label: "Citrus", hint: "Bergamot, lemon, neroli" },
          { value: "floral", label: "Floral", hint: "Rose, jasmine, iris" },
          { value: "woody", label: "Woody", hint: "Sandalwood, cedar, vetiver" },
          { value: "amber", label: "Amber/Sweet", hint: "Vanilla, tonka, balsamic" },
          { value: "oud", label: "Oud/Smoky", hint: "Leather, smoke, dark tones" },
        ],
      },
      {
        kind: "choice",
        key: "longevity",
        title: "What longevity do you want?",
        description: "AI uses this as a ranking priority.",
        options: [
          { value: "moderate", label: "Medium", hint: "4-6 hours is enough" },
          { value: "long", label: "Long", hint: "I want 8+ hours" },
          { value: "beast", label: "Maximum", hint: "Make a strong lasting trail" },
        ],
      },
      {
        kind: "choice",
        key: "budget",
        title: "What is your starting budget range?",
        description: "We prioritize results by your budget.",
        options: [
          { value: "all", label: "No preference", hint: "Any price range" },
          { value: "under80", label: "Under 80 AZN", hint: "Affordable picks" },
          { value: "80to140", label: "80-140 AZN", hint: "Balanced mid-range" },
          { value: "140plus", label: "140+ AZN", hint: "Premium and niche" },
        ],
      },
      {
        kind: "text",
        key: "favoriteNotes",
        title: "Optional: do you have notes you love?",
        description: "For example: bergamot, vanilla, oud, smoky, and more.",
        label: "Favorite notes",
        placeholder: "For example: bergamot, green tea, soft musk",
      },
      {
        kind: "text",
        key: "avoidNotes",
        title: "Optional: any notes you want to avoid?",
        description: "AI will move incompatible picks lower if you share this.",
        label: "Notes to avoid",
        placeholder: "For example: very sweet vanilla, heavy oud, smoke",
      },
    ],
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
    questions: [
      {
        kind: "choice",
        key: "gender",
        title: "Какую категорию вы ищете?",
        description: "Это помогает точнее сгруппировать подходящие ароматы.",
        options: [
          { value: "all", label: "Без разницы", hint: "Женские, мужские и унисекс вместе" },
          { value: "unisex", label: "Унисекс", hint: "Сбалансированный и универсальный" },
          { value: "qadın", label: "Женские", hint: "Более мягкий и элегантный профиль" },
          { value: "kişi", label: "Мужские", hint: "Более глубокий и характерный профиль" },
        ],
      },
      {
        kind: "choice",
        key: "vibe",
        title: "Какое общее настроение должен давать аромат?",
        description: "Выберите настроение, которое хотите ощущать чаще всего.",
        options: [
          { value: "fresh", label: "Свежий и чистый", hint: "Цитрус, зелень, легкость" },
          { value: "warm", label: "Теплый и мягкий", hint: "Ваниль, амбра, уют" },
          { value: "floral", label: "Цветочный и элегантный", hint: "Роза, жасмин, пудровый" },
          { value: "bold", label: "Смелый и мощный", hint: "Уд, кожа, специи" },
        ],
      },
      {
        kind: "choice",
        key: "occasion",
        title: "Где вы будете использовать его чаще всего?",
        description: "Ситуация сильно влияет на правильный профиль аромата.",
        options: [
          { value: "daily", label: "Каждый день", hint: "Главное — универсальность" },
          { value: "office", label: "Офис", hint: "Мягкий и аккуратный профиль" },
          { value: "date", label: "Встреча", hint: "Приятен на близкой дистанции" },
          { value: "evening", label: "Вечер", hint: "Более плотный и глубокий" },
        ],
      },
      {
        kind: "choice",
        key: "intensity",
        title: "Насколько заметным он должен быть?",
        description: "Выберите ощущение шлейфа и стойкости.",
        options: [
          { value: "soft", label: "Легкий", hint: "Тихий и близкий" },
          { value: "balanced", label: "Сбалансированный", hint: "Идеально для каждый день" },
          { value: "strong", label: "Сильный", hint: "Более выразительный и стойкий" },
        ],
      },
      {
        kind: "choice",
        key: "projection",
        title: "На каком расстоянии должен ощущаться шлейф?",
        description: "Насколько далеко вы хотите, чтобы аромат был заметен?",
        options: [
          { value: "skin", label: "Близко к коже", hint: "Чувствуется только рядом" },
          { value: "close", label: "Близкая аура", hint: "Оставляет мягкий аккуратный след" },
          { value: "moderate", label: "Средний шлейф", hint: "Лучший баланс для каждый день" },
          { value: "bold", label: "Яркий шлейф", hint: "Более сильная аура при входе" },
        ],
      },
      {
        kind: "choice",
        key: "sweetness",
        title: "Насколько сладким он должен быть?",
        description: "Сладость определяет сухое, сбалансированное или насыщенное звучание.",
        options: [
          { value: "dry", label: "Сухой и чистый", hint: "Сладость почти не ощущается" },
          { value: "balanced", label: "Сбалансированный", hint: "Мягкая и элегантная сладость" },
          { value: "sweet", label: "Сладкий", hint: "Более мягкий и привлекательный" },
          { value: "rich", label: "Насыщенный", hint: "Явная и плотная сладость" },
        ],
      },
      {
        kind: "choice",
        key: "season",
        title: "Какой основной сезон?",
        description: "Сезонность помогает AI точнее ранжировать варианты.",
        options: [
          { value: "all", label: "Круглый год", hint: "Универсальное использование" },
          { value: "summer", label: "Лето", hint: "Легкий и свежий" },
          { value: "winter", label: "Зима", hint: "Более теплый и плотный" },
          { value: "spring", label: "Весна/осень", hint: "Сбалансированные переходные ароматы" },
        ],
      },
      {
        kind: "choice",
        key: "profile",
        title: "Какая группа вам ближе?",
        description: "Главное семейство нот сильно влияет на итоговый результат.",
        options: [
          { value: "citrus", label: "Цитрусовые", hint: "Бергамот, лимон, нероли" },
          { value: "floral", label: "Цветочные", hint: "Роза, жасмин, ирис" },
          { value: "woody", label: "Древесные", hint: "Сандал, кедр, ветивер" },
          { value: "amber", label: "Амбра/сладкие", hint: "Ваниль, тонка, бальзамические" },
          { value: "oud", label: "Уд/дымные", hint: "Кожа, дым, темные оттенки" },
        ],
      },
      {
        kind: "choice",
        key: "longevity",
        title: "Какой стойкости вы ожидаете?",
        description: "AI использует это как приоритет при ранжировании.",
        options: [
          { value: "moderate", label: "Средняя", hint: "4-6 часов достаточно" },
          { value: "long", label: "Долгая", hint: "Хочу 8+ часов" },
          { value: "beast", label: "Максимальная", hint: "Пусть оставляет сильный шлейф" },
        ],
      },
      {
        kind: "choice",
        key: "budget",
        title: "Какой у вас стартовый бюджет?",
        description: "Ранжируем результаты с учетом бюджета.",
        options: [
          { value: "all", label: "Без разницы", hint: "Любой ценовой диапазон" },
          { value: "under80", label: "До 80 AZN", hint: "Бюджетные варианты" },
          { value: "80to140", label: "80-140 AZN", hint: "Сбалансированный средний сегмент" },
          { value: "140plus", label: "140+ AZN", hint: "Премиальные и нишевые варианты" },
        ],
      },
      {
        kind: "text",
        key: "favoriteNotes",
        title: "По желанию: какие ноты вам нравятся?",
        description: "Например: бергамот, ваниль, уд, дымные оттенки и т. д.",
        label: "Любимые ноты",
        placeholder: "Например: бергамот, зеленый чай, мягкий мускус",
      },
      {
        kind: "text",
        key: "avoidNotes",
        title: "По желанию: какие ноты вы не любите?",
        description: "Так AI отодвинет неподходящие варианты вниз.",
        label: "Ноты, которых избегать",
        placeholder: "Например: слишком сладкая ваниль, тяжелый уд, дым",
      },
    ],
  },
};

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
  projection: {
    skin: ["musk", "tea", "iris", "cashmere", "soft"],
    close: ["floral", "green", "woody", "musk", "smooth"],
    moderate: ["amber", "citrus", "woody", "floral", "musk"],
    bold: ["oud", "leather", "tobacco", "incense", "patchouli"],
  },
  sweetness: {
    dry: ["citrus", "green", "tea", "iris", "woody"],
    balanced: ["musk", "floral", "amber", "woody", "vanilla"],
    sweet: ["vanilla", "tonka", "caramel", "amber", "jasmine"],
    rich: ["vanilla", "amber", "tonka", "resin", "benzoin", "caramel"],
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
  projection: "",
  sweetness: "",
  profile: "",
  budget: "",
  season: "",
  longevity: "",
};

const SEARCH_CHAR_FOLD_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ə: "e",
  Ə: "e",
  æ: "ae",
  Æ: "ae",
  œ: "oe",
  Œ: "oe",
  ø: "o",
  Ø: "o",
  đ: "d",
  Đ: "d",
  ł: "l",
  Ł: "l",
  þ: "th",
  Þ: "th",
  ð: "d",
  Ð: "d",
  ß: "ss",
};

const QUIZ_CARD_COPY: Record<
  Locale,
  {
    viewPerfume: string;
    startingFrom: string;
    quote: string;
    size: string;
    addToCart: string;
    adding: string;
    added: string;
    signIn: string;
    failed: string;
    refine: string;
    update: string;
    fromPrice: (price: string) => string;
  }
> = {
  az: {
    viewPerfume: "Ətirə bax",
    startingFrom: "Başlayan qiymət",
    quote: "Qiymət sorğu ilə",
    size: "Ölçü",
    addToCart: "Səbətə at",
    adding: "Əlavə olunur...",
    added: "Səbətə əlavə olundu",
    signIn: "Səbət üçün giriş et",
    failed: "Əlavə etmək alınmadı",
    refine: "Daha dəqiq et",
    update: "Nəticəni yenilə",
    fromPrice: (price) => `${price} ₼-dən başlayır`,
  },
  en: {
    viewPerfume: "View perfume",
    startingFrom: "Starting from",
    quote: "Quote on request",
    size: "Size",
    addToCart: "Add to cart",
    adding: "Adding...",
    added: "Added to cart",
    signIn: "Sign in for cart",
    failed: "Could not add",
    refine: "Refine match",
    update: "Update results",
    fromPrice: (price) => `From ${price} ₼`,
  },
  ru: {
    viewPerfume: "Открыть аромат",
    startingFrom: "Цена от",
    quote: "Цена по запросу",
    size: "Объем",
    addToCart: "В корзину",
    adding: "Добавляем...",
    added: "Добавлено",
    signIn: "Войдите для корзины",
    failed: "Не удалось добавить",
    refine: "Уточнить",
    update: "Обновить результат",
    fromPrice: (price) => `от ${price} ₼`,
  },
};

const NOTE_SEARCH_SHORTCUTS = ["bergamot", "vanilla", "oud", "rose", "musk", "citrus", "jasmine", "amber"];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİəƏæÆœŒøØđĐłŁþÞðÐß]/g, (char) => SEARCH_CHAR_FOLD_MAP[char] ?? char)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

function formatQuizPrice(price: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "az-AZ", {
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatQuizFromPrice(price: number, locale: Locale) {
  return QUIZ_CARD_COPY[locale].fromPrice(formatQuizPrice(price, locale));
}

function QuizResultProductCard({ perfume, locale }: { perfume: Perfume; locale: Locale }) {
  const displayPerfume = sanitizePerfumeForDisplay(perfume);
  const cardCopy = QUIZ_CARD_COPY[locale];
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();
  const [selectedMl, setSelectedMl] = useState<number | null>(() => displayPerfume.sizes[0]?.ml ?? null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");
  const startingPrice = getStartingPrice(displayPerfume);
  const selectedSize = useMemo(
    () => displayPerfume.sizes.find((size) => size.ml === selectedMl) ?? displayPerfume.sizes[0] ?? null,
    [displayPerfume.sizes, selectedMl],
  );
  const noteChips = [
    ...displayPerfume.noteSlugs.top,
    ...displayPerfume.noteSlugs.heart,
    ...displayPerfume.noteSlugs.base,
  ]
    .filter(Boolean)
    .slice(0, 2)
    .map((slug) =>
      localizeNoteLabel(
        {
          slug,
          name: humanizeNoteToken(slug),
        },
        locale,
      ),
    );

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => setMessage(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const addToCart = async () => {
    if (!selectedSize || !supabase || isAdding) {
      return;
    }

    setIsAdding(true);
    setMessage("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push(`/login?next=${encodeURIComponent(pathname || "/qoxunu")}`);
        return;
      }

      const { data: existingRows, error: selectError } = await supabase
        .from("cart_items")
        .select("id,quantity,created_at")
        .eq("user_id", user.id)
        .eq("perfume_slug", displayPerfume.slug)
        .eq("size_ml", selectedSize.ml)
        .order("created_at", { ascending: true });

      if (selectError) {
        setMessage(cardCopy.failed);
        return;
      }

      const rows = ((existingRows as { id?: string; quantity?: number }[] | null) ?? []).filter((row) => Boolean(row.id));
      const primaryRow = rows[0] ?? null;
      const existingQuantity = rows.reduce((sum, row) => sum + (Number.isFinite(row.quantity) ? Number(row.quantity) : 0), 0);

      const result = primaryRow?.id
        ? await supabase
            .from("cart_items")
            .update({ quantity: Math.max(1, existingQuantity + 1), unit_price: selectedSize.price })
            .eq("id", primaryRow.id)
            .eq("user_id", user.id)
        : await supabase.from("cart_items").insert({
            user_id: user.id,
            perfume_slug: displayPerfume.slug,
            size_ml: selectedSize.ml,
            quantity: 1,
            unit_price: selectedSize.price,
          });

      if (result.error) {
        setMessage(cardCopy.failed);
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("perfoumer:cart-updated"));
      }
      setMessage(cardCopy.added);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="group rounded-[1.15rem] border border-zinc-200 bg-[#fcfcfb] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white">
      <div className="flex items-center gap-3">
        <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[0.95rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(243,243,240,0.9))]">
          <Image
            src={displayPerfume.image || "/perfoumerlogo.png"}
            alt={displayPerfume.imageAlt || `${displayPerfume.brand} ${displayPerfume.name}`}
            fill
            sizes="(max-width: 767px) 28vw, 120px"
            quality={70}
            className="object-contain object-bottom px-2 py-2 transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
            {displayPerfume.brand}
          </p>
          <Link href={toLocalePath(`/perfumes/${displayPerfume.slug}`, locale)} className="block">
            <h3 className="mt-1 line-clamp-2 text-[1.05rem] leading-tight font-semibold text-zinc-900 transition-colors hover:text-zinc-700">
              {displayPerfume.name}
            </h3>
          </Link>

          {noteChips.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {noteChips.map((note) => (
                <span
                  key={`${displayPerfume.id}-${note}`}
                  className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[0.66rem] font-medium text-zinc-600"
                >
                  {note}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                {cardCopy.startingFrom}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-900">
                {Number.isFinite(startingPrice) ? formatQuizFromPrice(startingPrice, locale) : cardCopy.quote}
              </p>
            </div>
          </div>
        </div>
      </div>

      {displayPerfume.sizes.length ? (
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-2">
          <p className="px-1 text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">{cardCopy.size}</p>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            {displayPerfume.sizes.slice(0, 5).map((size) => {
              const active = selectedSize?.ml === size.ml;
              return (
                <button
                  key={`${displayPerfume.id}-${size.ml}`}
                  type="button"
                  onClick={() => setSelectedMl(size.ml)}
                  className={[
                    "shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold transition",
                    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300",
                  ].join(" ")}
                >
                  {size.ml}ML
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Link
          href={toLocalePath(`/perfumes/${displayPerfume.slug}`, locale)}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-3 text-[0.72rem] font-semibold text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
        >
          <Eye size={15} weight="duotone" />
          {cardCopy.viewPerfume}
        </Link>
        <button
          type="button"
          onClick={addToCart}
          disabled={!selectedSize || isAdding}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-3 text-[0.72rem] font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingCartSimple size={15} weight="duotone" />
          {isAdding ? cardCopy.adding : cardCopy.addToCart}
        </button>
      </div>
      {message ? <p className="mt-2 text-center text-[0.72rem] font-medium text-zinc-600">{message}</p> : null}
    </article>
  );
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
  if (answers.projection && answers.projection in KEYWORDS.projection) score += countMatches(tokens, KEYWORDS.projection[answers.projection as keyof typeof KEYWORDS.projection]) * 1.4;
  if (answers.sweetness && answers.sweetness in KEYWORDS.sweetness) score += countMatches(tokens, KEYWORDS.sweetness[answers.sweetness as keyof typeof KEYWORDS.sweetness]) * 1.6;
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

function getLuxuryOptionIcon(value: string) {
  const props = { size: 22, weight: "duotone" as const };
  if (value === "kişi") return <User {...props} />;
  if (value === "qadın") return <Sparkle {...props} />;
  if (value === "unisex" || value === "all") return <GenderIntersex {...props} />;
  if (["fresh", "citrus", "summer", "dry"].includes(value)) return <Waves {...props} />;
  if (["warm", "amber", "winter", "sweet", "rich"].includes(value)) return <Fire {...props} />;
  if (["floral", "spring"].includes(value)) return <Flower {...props} />;
  if (["bold", "oud", "strong", "beast"].includes(value)) return <Sparkle {...props} />;
  if (["date", "evening"].includes(value)) return <Moon {...props} />;
  if (value === "office") return <Briefcase {...props} />;
  if (["daily", "soft", "skin", "close"].includes(value)) return <Sun {...props} />;
  if (["long", "moderate", "balanced"].includes(value)) return <Clock {...props} />;
  if (["under80", "80to140", "140plus"].includes(value)) return <CurrencyCircleDollar {...props} />;
  return <UsersThree {...props} />;
}

function getLuxuryMatchScore(index: number, confidence: number) {
  if (index === 0) return Math.max(96, confidence);
  if (index === 1) return Math.max(92, confidence - 4);
  return Math.max(88, confidence - 9);
}

function getLuxuryRankLabel(locale: Locale, index: number) {
  if (index === 0) return locale === "az" ? "Perfect match" : locale === "ru" ? "Perfect match" : "Perfect match";
  if (index === 1) return locale === "az" ? "Alternativ" : locale === "ru" ? "Альтернатива" : "Alternative";
  return locale === "az" ? "Fərqli xarakter" : locale === "ru" ? "Другой характер" : "Different character";
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
  const [aiMatches, setAiMatches] = useState<Perfume[] | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [hasGeneratedAi, setHasGeneratedAi] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isRefineOpen, setIsRefineOpen] = useState(false);
  const [questionPhase, setQuestionPhase] = useState<"idle" | "leaving">("idle");
  const [displayedScore, setDisplayedScore] = useState(0);
  const [userContext, setUserContext] = useState<QuizUserContext | null>(null);

  const lastGeneratedRef = useRef("");
  const questionTransitionRef = useRef<number | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let cancelled = false;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const user = data.user;
        if (!user) {
          setUserContext(null);
          return;
        }

        const username =
          typeof user.user_metadata?.username === "string"
            ? user.user_metadata.username.trim()
            : typeof user.user_metadata?.name === "string"
              ? user.user_metadata.name.trim()
              : "";

        setUserContext({
          id: user.id,
          email: user.email?.trim() || "",
          username,
          isSignedIn: true,
          isGuest: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setUserContext(null);
        }
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const user = session?.user ?? null;
      if (!user) {
        setUserContext(null);
        return;
      }

      const username =
        typeof user.user_metadata?.username === "string"
          ? user.user_metadata.username.trim()
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name.trim()
            : "";

      setUserContext({
        id: user.id,
        email: user.email?.trim() || "",
        username,
        isSignedIn: true,
        isGuest: false,
      });
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const choiceQuestions = useMemo(() => {
    const seen = new Set<string>();
    return dictionary.questions
      .filter((question): question is ChoiceQuestion => question.kind === "choice")
      .filter((question) => QUICK_QUESTION_KEYS.includes(question.key as QuickQuestionKey))
      .filter((question) => {
        if (seen.has(question.key)) return false;
        seen.add(question.key);
        return true;
      });
  }, [dictionary.questions]);

  const totalSteps = choiceQuestions.length;
  const isComplete = stepIndex >= totalSteps;
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

  const matchStrengthLabel =
    locale === "az"
      ? resultConfidence >= 92
        ? "Yüksək uyğunluq"
        : resultConfidence >= 84
          ? "Balanslı seçim"
          : "Yaxşı başlanğıc"
      : locale === "ru"
        ? resultConfidence >= 92
          ? "Высокое совпадение"
          : resultConfidence >= 84
            ? "Сбалансированный выбор"
            : "Хорошее начало"
        : resultConfidence >= 92
          ? "High match"
          : resultConfidence >= 84
            ? "Balanced match"
            : "Good starting point";

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
    answers.projection ? getChoiceLabel(choiceQuestions, "projection", answers.projection) : "",
    answers.sweetness ? getChoiceLabel(choiceQuestions, "sweetness", answers.sweetness) : "",
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

  const selectedNotes = useMemo(
    () =>
      Object.entries(notePreferences)
        .filter(([, state]) => state !== undefined)
        .map(([slug, state]) => {
          const note = noteBySlug.get(slug);
          return {
            slug,
            state,
            label: note ? localizeNoteLabel(note, locale) : humanizeNoteToken(slug),
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [locale, noteBySlug, notePreferences],
  );

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
  const visibleMatches = shownMatches;
  const featuredMatch = visibleMatches[0];
  const secondaryMatches = visibleMatches.slice(1);

  const summaryPreview = useMemo(() => {
    if (!aiSummary) return "";

    if (aiSummary.length <= 160) {
      return aiSummary;
    }

    return `${aiSummary.slice(0, 160).trimEnd()}...`;
  }, [aiSummary]);

  const currentAnswer = currentQuestion ? answers[currentQuestion.key] : "";

  const onSelect = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
  };

  const goToStep = (nextStep: number) => {
    if (questionTransitionRef.current) {
      window.clearTimeout(questionTransitionRef.current);
    }

    setQuestionPhase("leaving");
    questionTransitionRef.current = window.setTimeout(() => {
      setStepIndex(nextStep);
      setQuestionPhase("idle");
      questionTransitionRef.current = null;
    }, 190);
  };

  const onNext = () => {
    if (!currentAnswer) return;
    goToStep(Math.min(stepIndex + 1, totalSteps));
  };

  const onPrevious = () => {
    goToStep(Math.max(stepIndex - 1, 0));
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
    setIsRefineOpen(false);
    setQuestionPhase("idle");
    if (questionTransitionRef.current) {
      window.clearTimeout(questionTransitionRef.current);
      questionTransitionRef.current = null;
    }
    lastGeneratedRef.current = "";
  };

  const toggleNotePreference = (slug: string) => {
    setNotePreferences((prev) => {
      const next = { ...prev };
      const current = next[slug];
      if (!current) {
        next[slug] = "like";
        return next;
      }
      if (current === "like") {
        next[slug] = "dislike";
        return next;
      }
      delete next[slug];
      return next;
    });
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
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
          userId: userContext?.id ?? "",
          email: userContext?.email ?? "",
          username: userContext?.username ?? "",
          isSignedIn: userContext?.isSignedIn ?? false,
          isGuest: userContext?.isGuest ?? true,
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
    return () => {
      if (questionTransitionRef.current) {
        window.clearTimeout(questionTransitionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setNotesPage(1);
  }, [normalizedNotesQuery]);

  useEffect(() => {
    if (notesPage > totalNotePages) {
      setNotesPage(totalNotePages);
    }
  }, [notesPage, totalNotePages]);

  useEffect(() => {
    if (!isComplete || !shouldShowResults) {
      setDisplayedScore(0);
      return;
    }

    const target = getLuxuryMatchScore(0, resultConfidence);
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progressValue = Math.min(1, (now - startedAt) / 780);
      const eased = 1 - Math.pow(1 - progressValue, 3);
      setDisplayedScore(Math.round(target * eased));
      if (progressValue < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isComplete, resultConfidence, shouldShowResults]);

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

  const renderRefinementPanel = () => {
    const refineTitle =
      locale === "az" ? "Nəticəni daha dəqiq et" : locale === "ru" ? "Уточнить подбор" : "Make this more accurate";
    const refineDescription =
      locale === "az"
        ? "İstəsəniz sevdiyiniz və qaçındığınız notları əlavə edin. İlk nəticəni görmək üçün bu hissə məcburi deyil."
        : locale === "ru"
          ? "Добавьте любимые или нежелательные ноты, если хотите. Для первого результата это необязательно."
          : "Add notes you love or avoid if you want. This is optional after the first result.";
    const searchLabel = locale === "az" ? "Not axtar" : locale === "ru" ? "Поиск нот" : "Search notes";
    const extraLabel = locale === "az" ? "Əlavə istək" : locale === "ru" ? "Пожелания" : "Extra preference";
    const popularNotes = NOTE_SEARCH_SHORTCUTS.map((slug) => noteBySlug.get(slug) ?? notes.find((note) => normalize(note.slug).includes(normalize(slug)))).filter((note): note is Note => Boolean(note));

    return (
      <section className="mt-4 rounded-[1.25rem] border border-zinc-200 bg-white p-3 shadow-[0_12px_28px_rgba(24,24,24,0.04)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">{QUIZ_CARD_COPY[locale].refine}</p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-900">{refineTitle}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">{refineDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsRefineOpen((value) => !value)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-white"
          >
            {isRefineOpen ? dictionary.showLess : QUIZ_CARD_COPY[locale].refine}
          </button>
        </div>

        {selectedNotes.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedNotes.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => toggleNotePreference(item.slug)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition",
                  item.state === "like" ? "border-zinc-900 bg-zinc-900 text-white" : "border-rose-200 bg-rose-50 text-rose-700",
                ].join(" ")}
              >
                <span>{item.state === "like" ? "+" : "-"}</span>
                <span className="max-w-[9rem] truncate">{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        {isRefineOpen ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 rounded-[1.1rem] border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[0.67rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                {locale === "az" ? "Populyar notlar" : locale === "ru" ? "Популярные ноты" : "Popular notes"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {popularNotes.map((note) => {
                  const state = notePreferences[note.slug];
                  const label = localizeNoteLabel(note, locale);
                  return (
                    <button
                      key={note.slug}
                      type="button"
                      onClick={() => toggleNotePreference(note.slug)}
                      className={[
                        "rounded-full border px-3 py-1.5 text-[0.76rem] font-semibold transition",
                        state === "like"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : state === "dislike"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <label className="mt-3 block">
                <span className="mb-2 block text-[0.67rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">{searchLabel}</span>
                <input
                  value={notesQuery}
                  onChange={(event) => setNotesQuery(event.target.value)}
                  placeholder={locale === "az" ? "vanil, oud, gül..." : locale === "ru" ? "ваниль, oud, роза..." : "vanilla, oud, rose..."}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-zinc-500"
                />
              </label>

              {notesQuery ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {visibleNotes.slice(0, 8).map((note) => {
                    const state = notePreferences[note.slug];
                    return (
                      <button
                        key={note.slug}
                        type="button"
                        onClick={() => toggleNotePreference(note.slug)}
                        className={[
                          "rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition",
                          state === "like"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : state === "dislike"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                        ].join(" ")}
                      >
                        {localizeNoteLabel(note, locale)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.1rem] border border-zinc-200 bg-white p-3">
              <label className="block">
                <span className="mb-2 block text-[0.67rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">{extraLabel}</span>
                <textarea
                  value={extraAiNotes}
                  onChange={(event) => setExtraAiNotes(event.target.value)}
                  rows={6}
                  placeholder={
                    locale === "az"
                      ? "Məsələn: daha az şirin, ofis üçün sakit, daha premium hiss..."
                      : locale === "ru"
                        ? "Например: меньше сладости, мягче для офиса..."
                        : "Example: less sweet, softer for office, more premium..."
                  }
                  className="w-full resize-none rounded-2xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-500"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  lastGeneratedRef.current = "";
                  void requestAiRecommendations();
                }}
                disabled={isAiLoading}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isAiLoading ? dictionary.generating : QUIZ_CARD_COPY[locale].update}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  const previewPerfume = featuredMatch ?? perfumes.find((perfume) => perfume.image) ?? perfumes[0] ?? null;
  const heroPerfume = featuredMatch ?? previewPerfume;
  const heroDisplayPerfume = heroPerfume ? sanitizePerfumeForDisplay(heroPerfume) : null;
  const getResultNoteLabel = (slug: string) => {
    const note = noteBySlug.get(slug);
    return localizeNoteLabel(note ? { slug: note.slug, name: note.name } : { slug, name: humanizeNoteToken(slug) }, locale);
  };
  const heroNotePills = heroDisplayPerfume
    ? [...heroDisplayPerfume.noteSlugs.top, ...heroDisplayPerfume.noteSlugs.heart, ...heroDisplayPerfume.noteSlugs.base]
        .filter(Boolean)
        .slice(0, 2)
        .map(getResultNoteLabel)
    : [];
  const luxuryProfileChips = [
    answers.sweetness ? getChoiceLabel(choiceQuestions, "sweetness", answers.sweetness) : "",
    answers.profile ? getChoiceLabel(choiceQuestions, "profile", answers.profile) : "",
    answers.occasion ? getChoiceLabel(choiceQuestions, "occasion", answers.occasion) : "",
    answers.longevity ? getChoiceLabel(choiceQuestions, "longevity", answers.longevity) : "",
    answers.budget ? getChoiceLabel(choiceQuestions, "budget", answers.budget) : "",
  ].filter(Boolean);
  const luxuryWhyLines = [
    answers.sweetness ? `${getChoiceLabel(choiceQuestions, "sweetness", answers.sweetness)} not balansına üstünlük verdiniz` : "",
    answers.profile ? `${getChoiceLabel(choiceQuestions, "profile", answers.profile)} xarakteri profilinizə uyğundur` : "",
    answers.occasion ? `${getChoiceLabel(choiceQuestions, "occasion", answers.occasion)} istifadəsi üçün seçildi` : "",
    answers.longevity ? `${getChoiceLabel(choiceQuestions, "longevity", answers.longevity)} qalıcılıq istədiniz` : "",
  ].filter(Boolean);
  const profileTitle =
    answers.profile === "amber"
      ? "Warm Oriental"
      : answers.profile === "woody"
        ? "Soft Woods"
        : answers.profile === "floral"
          ? "Modern Floral"
          : answers.profile === "citrus"
            ? "Clean Citrus"
            : answers.profile === "oud"
              ? "Dark Signature"
              : "Personal Signature";

  return (
    <section className="qoxunu-luxury-shell mx-auto w-full pb-8">
      {!isComplete ? (
        <div className="qoxunu-luxury-quiz">
          <aside className="qoxunu-luxury-hero">
            <div>
              <p className="qoxunu-luxury-kicker">{dictionary.eyebrow}</p>
              <h1>Sizin üçün seçilən imza ətri</h1>
              <p className="qoxunu-luxury-lead">
                {totalSteps} qısa suala cavab verin. AI zövqünüzü analiz edib sizə uyğun ətirləri seçəcək.
              </p>
            </div>
            <div className="qoxunu-luxury-bottle">
              <Image
                src={QOXUNU_HERO_IMAGE}
                alt={dictionary.eyebrow}
                fill
                sizes="(max-width: 900px) 58vw, 34vw"
                className="object-contain object-bottom"
                priority
              />
            </div>
          </aside>

          <main className="qoxunu-luxury-question">
            <div key={stepIndex} className={["qoxunu-question-stage", questionPhase === "leaving" ? "qoxunu-question-stage--leave" : ""].join(" ")}>
              <div className="qoxunu-luxury-progress">
                <span>{String(stepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}</span>
                <div>
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <i key={index} className={index <= stepIndex ? "is-active" : ""} />
                  ))}
                </div>
              </div>

              <h2>{currentQuestion.title}</h2>
              <p>{currentQuestion.description}</p>

              <div className="qoxunu-luxury-options">
                {currentQuestion.options.map((option, index) => {
                  const active = currentAnswer === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSelect(option.value)}
                      style={{ animationDelay: `${index * 70}ms` }}
                      className={["qoxunu-luxury-option quiz-option-reveal", active ? "qoxunu-luxury-option-active" : ""].join(" ")}
                    >
                      <span className="qoxunu-luxury-option-icon">{getLuxuryOptionIcon(option.value)}</span>
                      <span className="min-w-0 flex-1">
                        <strong>{option.label}</strong>
                        <small>{option.hint}</small>
                      </span>
                      <span className="qoxunu-luxury-arrow">
                        {active ? <Check size={18} weight="bold" /> : <ArrowRight size={18} weight="bold" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="qoxunu-luxury-nav">
                <button type="button" onClick={onPrevious} disabled={stepIndex === 0 || questionPhase === "leaving"}>
                  {dictionary.previous}
                </button>
                <button type="button" onClick={onNext} disabled={!currentAnswer || questionPhase === "leaving"}>
                  {dictionary.next} <span><ArrowRight size={18} weight="bold" /></span>
                </button>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="qoxunu-luxury-results quiz-results-enter">
          {isAiLoading ? (
            <div className="qoxunu-luxury-loading qoxunu-analysis-reveal">
              <div className="qoxunu-analysis-orb">
                {previewPerfume ? (
                  <Image
                    src={previewPerfume.image || "/perfoumerlogo.png"}
                    alt={previewPerfume.imageAlt || `${previewPerfume.brand} ${previewPerfume.name}`}
                    fill
                    sizes="320px"
                    className="object-contain"
                  />
                ) : null}
                <span />
              </div>
              <div className="qoxunu-analysis-copy">
                <p>{locale === "az" ? "Zövqünüz analiz olunur..." : locale === "ru" ? "Анализируем ваш вкус..." : "Analyzing your taste..."}</p>
                <span>{dictionary.generatingHint}</span>
              </div>
              <div className="qoxunu-analysis-progress" aria-hidden="true">
                <i />
              </div>
              <div className="qoxunu-analysis-dots" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => <span key={index} />)}
              </div>
            </div>
          ) : heroDisplayPerfume ? (
            <>
              <main className="qoxunu-signature-panel">
                <p className="qoxunu-luxury-kicker">Sizin üçün seçilən</p>
                <h2>İmza Ətriniz</h2>
                <div className="qoxunu-score-badge">
                  <strong>{displayedScore || getLuxuryMatchScore(0, resultConfidence)}%</strong>
                  <span>Uyğunluq</span>
                </div>

                <div className="qoxunu-signature-bottle">
                  <Image
                    src={heroDisplayPerfume.image || "/perfoumerlogo.png"}
                    alt={heroDisplayPerfume.imageAlt || `${heroDisplayPerfume.brand} ${heroDisplayPerfume.name}`}
                    fill
                    sizes="(max-width: 900px) 82vw, 46vw"
                    className="object-contain object-bottom"
                    priority
                  />
                </div>

                <p className="qoxunu-brand-name">{heroDisplayPerfume.brand}</p>
                <h3>{heroDisplayPerfume.name}</h3>
                <div className="qoxunu-note-pills">
                  {heroNotePills.map((note) => <span key={note}>{note}</span>)}
                </div>
                <p className="qoxunu-quote">“{aiSummary || getReasonText(locale, luxuryProfileChips[1] || "", luxuryProfileChips)}”</p>

                <div className="qoxunu-dna">
                  <p>Sizin qoxu profiliniz</p>
                  <div>
                    {luxuryProfileChips.slice(0, 6).map((chip, index) => <span key={chip} style={{ animationDelay: `${220 + index * 70}ms` }}>{chip}</span>)}
                  </div>
                </div>

                <Link href={toLocalePath(`/perfumes/${heroDisplayPerfume.slug}`, locale)} className="qoxunu-black-cta">
                  Kataloqa bax <span><ArrowRight size={18} weight="bold" /></span>
                </Link>

                <section className="qoxunu-why-card">
                  <p>Niyə bu ətri seçdik?</p>
                  {(luxuryWhyLines.length ? luxuryWhyLines : [dictionary.resultDescription]).map((line) => (
                    <span key={line}><Check size={15} weight="bold" /> {line}</span>
                  ))}
                </section>
              </main>

              <aside className="qoxunu-alternatives-panel">
                <p className="qoxunu-luxury-kicker">Digər seçimlər</p>
                <h2>Zövqünüzə uyğun başqa ətirlər</h2>
                <div className="qoxunu-alt-list">
                  {shownMatches.map((perfume, index) => {
                    const displayPerfume = sanitizePerfumeForDisplay(perfume);
                    const notePills = [...displayPerfume.noteSlugs.top, ...displayPerfume.noteSlugs.heart, ...displayPerfume.noteSlugs.base]
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(getResultNoteLabel);
                    return (
                      <Link
                        key={perfume.id}
                        href={toLocalePath(`/perfumes/${displayPerfume.slug}`, locale)}
                        className={["qoxunu-alt-card", index === 0 ? "qoxunu-alt-card-primary" : ""].join(" ")}
                        style={{ animationDelay: `${280 + index * 90}ms` }}
                      >
                        <div className="qoxunu-alt-rank">
                          <span>#{index + 1}</span>
                          <small>{getLuxuryRankLabel(locale, index)}</small>
                          <strong>{getLuxuryMatchScore(index, resultConfidence)}%</strong>
                        </div>
                        <div className="qoxunu-alt-body">
                          <div className="qoxunu-alt-image">
                            <Image src={displayPerfume.image || "/perfoumerlogo.png"} alt={displayPerfume.imageAlt || displayPerfume.name} fill sizes="120px" className="object-contain" />
                          </div>
                          <div>
                            <p>{displayPerfume.brand}</p>
                            <h3>{displayPerfume.name}</h3>
                            <div>{notePills.map((note) => <span key={note}>{note}</span>)}</div>
                            <strong>{Number.isFinite(getStartingPrice(displayPerfume)) ? formatQuizFromPrice(getStartingPrice(displayPerfume), locale) : QUIZ_CARD_COPY[locale].quote}</strong>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <section className="qoxunu-profile-card">
                  <p>Sizin qoxu profiliniz</p>
                  <h3>{profileTitle}</h3>
                  <span>{aiSummary || "İsti, zərif və yadda qalan qoxular sizin profilinizə daha yaxın görünür."}</span>
                  <div>
                    {luxuryProfileChips.slice(0, 4).map((chip) => <small key={chip}>{chip}</small>)}
                  </div>
                  <div className="qoxunu-profile-indicator" aria-hidden="true">
                    {Array.from({ length: 7 }).map((_, index) => <span key={index} className={index < 3 ? "is-active" : ""} />)}
                  </div>
                </section>
              </aside>
            </>
          ) : (
            <div className="qoxunu-luxury-loading">
              <p>{dictionary.noMatchTitle}</p>
              <span>{dictionary.noMatchDescription}</span>
              <button type="button" onClick={onRestart}>{dictionary.restart}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
