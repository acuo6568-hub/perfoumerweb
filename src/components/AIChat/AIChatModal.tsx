"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import type { Locale } from "@/lib/i18n";
import { applySiteBranding } from "@/lib/site-branding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type FollowUpPrompt = {
  question: string;
  options?: string[];
  allowFreeText?: boolean;
  inputPlaceholder?: string;
};

type ActionType = "add_to_cart" | "add_to_wishlist" | "remove_from_cart" | "clear_cart" | "remove_from_wishlist";

type ActionSuggestion = {
  id: string;
  type: ActionType;
  perfumeSlug: string;
  perfumeName: string;
  sizeMl?: number;
  quantity?: number;
  unitPrice?: number;
  reason: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  followUp?: FollowUpPrompt | null;
  actionSuggestions?: ActionSuggestion[];
};

type StoredChatSession = {
  id: string;
  title: string;
  preview: string;
  locale: Locale;
  lastMessageAt: string;
  expiresAt: string;
  messages: Message[];
};

const CHAT_PERSIST_KEY = "ai-chat-preserved-conversation-v1";

type AIChatModalProps = {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onAfterClose?: () => void;
  isTriggerHidden?: boolean;
  locale: Locale;
  womanVideoUrl?: string;
  contactVideoUrl?: string;
  triggerLabel?: string;
};

type ModalTab = "chat" | "contact";

type UserContextPayload = {
  signedIn: boolean;
  email?: string;
  username?: string;
  profileGender?: string;
  device?: {
    userAgent?: string;
    platform?: string;
    language?: string;
    timezone?: string;
  };
  wishlistSlugs?: string[];
  cartItems?: Array<{
    perfumeSlug: string;
    quantity: number;
    sizeMl: number;
  }>;
  comments?: Array<{
    perfumeSlug: string;
    rating: number;
    createdAt: string;
  }>;
};

function collectDeviceContext(): UserContextPayload["device"] {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    language: window.navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

const copyByLocale: Record<
  Locale,
  {
    title: string;
    placeholder: string;
    tabChat: string;
    tabContact: string;
    introName: string;
    introLine1: string;
    introLine2: string;
    askAnything: string;
    suggestions: string;
    emptyHint: string;
    question1: string;
    question2: string;
    question3: string;
    question4: string;
    thinking: string;
    error: string;
    contactTitle: string;
    contactBody: string;
    contactEmailLabel: string;
    contactWhatsappLabel: string;
    contactHoursLabel: string;
    contactHoursValue: string;
    contactLocationLabel: string;
    contactLocationValue: string;
    contactDeveloperLabel: string;
    contactDeveloperValue: string;
    history: string;
    historyTitle: string;
    historyEmpty: string;
    historyActiveUntil: string;
    historyResume: string;
    historyClose: string;
  }
> = {
  az: {
    title: "Perfoumer-ə xoş gəlmisiniz.",
    placeholder: "Sualınızı yazın...",
    tabChat: "Çat",
    tabContact: "Əlaqə",
    introName: "Remi",
    introLine1: "Perfoumer-ə xoş gəlmisiniz.",
    introLine2: "Zövqünüzə uyğun seçimləri tapmaq və sayt üzrə sizi yönləndirmək üçün buradayam.",
    askAnything: "İstədiyinizi soruşun...",
    suggestions: "Hazır suallar",
    emptyHint: "Ətir, sifariş, çatdırılma və qaytarma barədə yaza bilərsiniz.",
    question1: "Sifarişlərimi harda görə bilərəm?",
    question2: "Mənə ədviyyatlı unisex ətir tövsiyə et",
    question3: "Çatdırılma və ödəniş necə olur?",
    question4: "Qaytarma prosesi necə olur?",
    thinking: "Düşünürəm...",
    error: "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
    contactTitle: "Perfoumer komandası ilə birbaşa əlaqə saxlayın.",
    contactBody: "Email və ya WhatsApp ilə sürətli yazın.",
    contactEmailLabel: "Email",
    contactWhatsappLabel: "WhatsApp",
    contactHoursLabel: "İş saatları",
    contactHoursValue: "Həftəiçi 10:00 - 19:00",
    contactLocationLabel: "Baza",
    contactLocationValue: "Bakı, Azərbaycan",
    contactDeveloperLabel: "Vebsayt və AI",
    contactDeveloperValue: "Bakhishov Brands tərəfindən hazırlanıb",
    history: "Tarixçə",
    historyTitle: "Son çatlar",
    historyEmpty: "Son 3 saatda aktiv çat tapılmadı.",
    historyActiveUntil: "Aktivlik bitir",
    historyResume: "Aç",
    historyClose: "Bağla",
  },
  en: {
    title: "How can I help?",
    placeholder: "Ask me anything...",
    tabChat: "Chat",
    tabContact: "Contact",
    introName: "Remi",
    introLine1: "Checking out Perfoumer.",
    introLine2: "I can walk you through what happened here.",
    askAnything: "Ask me anything...",
    suggestions: "Quick questions",
    emptyHint: "Ask about perfumes, orders, shipping, and returns.",
    question1: "Where can I see my orders?",
    question2: "Suggest spicy unisex perfumes",
    question3: "How does shipping and payment work?",
    question4: "What is your return policy?",
    thinking: "Thinking...",
    error: "Something went wrong. Please try again.",
    contactTitle: "Reach Perfoumer directly.",
    contactBody: "Email or WhatsApp works best.",
    contactEmailLabel: "Email",
    contactWhatsappLabel: "WhatsApp",
    contactHoursLabel: "Support hours",
    contactHoursValue: "Weekdays 10:00 - 19:00",
    contactLocationLabel: "Base",
    contactLocationValue: "Baku, Azerbaijan",
    contactDeveloperLabel: "Website & AI",
    contactDeveloperValue: "Developed by Bakhishov Brands",
    history: "History",
    historyTitle: "Recent chats",
    historyEmpty: "No active chats in the last 3 hours.",
    historyActiveUntil: "Active until",
    historyResume: "Resume",
    historyClose: "Close",
  },
  ru: {
    title: "Чем я могу помочь?",
    placeholder: "Напишите ваш вопрос...",
    tabChat: "Чат",
    tabContact: "Контакт",
    introName: "Remi",
    introLine1: "Вы смотрите Perfoumer.",
    introLine2: "Могу быстро провести по сайту и разделам.",
    askAnything: "Спросите что угодно...",
    suggestions: "Быстрые вопросы",
    emptyHint: "Спросите про ароматы, заказы, доставку и возврат.",
    question1: "Где посмотреть мои заказы?",
    question2: "Посоветуйте пряные унисекс ароматы",
    question3: "Как работают доставка и оплата?",
    question4: "Какие условия возврата?",
    thinking: "Думаю...",
    error: "Произошла ошибка. Попробуйте еще раз.",
    contactTitle: "Свяжитесь с Perfoumer напрямую.",
    contactBody: "Быстрее всего через email или WhatsApp.",
    contactEmailLabel: "Email",
    contactWhatsappLabel: "WhatsApp",
    contactHoursLabel: "Часы поддержки",
    contactHoursValue: "Будни 10:00 - 19:00",
    contactLocationLabel: "База",
    contactLocationValue: "Баку, Азербайджан",
    contactDeveloperLabel: "Сайт и AI",
    contactDeveloperValue: "Разработано Bakhishov Brands",
    history: "История",
    historyTitle: "Недавние чаты",
    historyEmpty: "Нет активных чатов за последние 3 часа.",
    historyActiveUntil: "Активно до",
    historyResume: "Открыть",
    historyClose: "Закрыть",
  },
};

const CONTACT_EMAIL = "info@perfoumer.az";
const CONTACT_WHATSAPP_LABEL = "+994 50 707 80 70";
const CONTACT_WHATSAPP_URL = "https://wa.me/994507078070";
const DEVELOPER_WHATSAPP_URL = "https://wa.me/bakhishov";
const introRotatingTitlesByLocale: Record<Locale, string[]> = {
  az: [
    "Zövqünüzə uyğun seçimləri tapmağa kömək edə bilərəm.",
    "Bir neçə sualla sizə uyğun ətiri tez seçə bilərəm.",
    "Sifariş, çatdırılma və qaytarma ilə bağlı sizi yönləndirə bilərəm.",
    "Gündəlik istifadə üçün balanslı seçimləri birgə tapa bilərik.",
    "Mövsümə uyğun daha qalıcı qoxuları seçməkdə kömək edərəm.",
    "Büdcənizə uyğun alternativləri qısa siyahıya sala bilərəm.",
    "Ağır, fresh və ya şirin üslubda doğru istiqamət verərəm.",
    "Hədiyyə üçün uyğun ətir seçimini sürətlə dəqiqləşdirə bilərəm.",
    "Notlara görə bənzər qoxuları müqayisə etməyə kömək edərəm.",
    "İstifadə məqsədinizə görə ideal variantları önə çıxararam.",
    "Kişi, qadın və unisex seçimlərini rahat daralda bilərəm.",
    "Sizin üçün ən uyğun 3-5 varianta fokuslana bilərik.",
    "Axtardığınız hissə yaxın qoxuları mərhələli tapa bilərik.",
  ],
  en: [
    "I can help you find options that match your taste.",
    "I can narrow down the right perfume in just a few questions.",
    "I can guide you through orders, shipping, and returns.",
    "I can shortlist balanced everyday fragrances for your routine.",
    "I can suggest longer-lasting picks based on the season.",
    "I can filter great options that fit your budget range.",
    "I can guide you toward fresh, sweet, or bold scent profiles.",
    "I can help you quickly choose a fragrance-worthy gift option.",
    "I can compare similar scent directions by note structure.",
    "I can surface ideal picks based on where and when you wear them.",
    "I can narrow men, women, and unisex options with clarity.",
    "I can focus your search down to the top 3-5 matches.",
    "I can help you discover scents that match the vibe you want.",
  ],
  ru: [
    "Помогу подобрать варианты под ваш вкус.",
    "Смогу быстро сузить выбор аромата по нескольким вопросам.",
    "Подскажу по заказу, доставке и возврату.",
    "Помогу подобрать сбалансированные ароматы на каждый день.",
    "Подскажу более стойкие варианты с учетом сезона.",
    "Смогу отфильтровать удачные варианты под ваш бюджет.",
    "Направлю в сторону свежего, сладкого или более насыщенного профиля.",
    "Помогу быстро выбрать подходящий аромат в подарок.",
    "Сравню похожие направления по нотам и характеру звучания.",
    "Подберу варианты под ваш сценарий: день, вечер, офис или выход.",
    "Сузим выбор среди мужских, женских и унисекс ароматов.",
    "Сфокусирую поиск на 3-5 самых подходящих позициях.",
    "Помогу найти аромат с нужным настроением и подачей.",
  ],
};

type QuickQuestionCategory = "technical" | "perfume" | "practical";

type LocalizedQuickQuestions = Record<
  Locale,
  Record<QuickQuestionCategory, string[]>
>;

type SmartQuestionBundle = {
  technical: string;
  perfume: string;
  practical: string;
};

type LocalizedSmartQuestionBundles = Record<Locale, SmartQuestionBundle[]>;

const quickQuestionPools: LocalizedQuickQuestions = {
  az: {
    technical: [
      "Qoxuda üst, orta, baza notları nə deməkdi?",
      "Nişlə dizayner ətirin fərqi nədi?",
      "EDP, EDT və Parfum arasında fərq nədi?",
      "Ətri daha qalıcı etmək üçün necə vurum?",
      "Layering nədi, necə edim?",
    ],
    perfume: [
      "Mənə ədviyyatlı unisex ətir tövsiyə et",
      "Hansı kişi ətirləri daha ağır və qalıcıdı?",
      "Gündəlik istifadə üçün yüngül qadın ətri axtarıram",
      "Şirin, vanilli qoxular tövsiyə et",
      "Yay üçün təmiz, fresh ətir təklif et",
      "Qış üçün güclü axşam ətri istəyirəm",
    ],
    practical: [
      "Sifarişlərimi harda görə bilərəm?",
      "Çatdırılma və ödəniş necə olur?",
      "Qaytarma prosesi necə olur?",
      "20-30 AZN aralığında nə məsləhət görərsən?",
      "Sifarişimi hardan izləyə bilərəm?",
    ],
  },
  en: {
    technical: [
      "What do top, heart, and base notes mean?",
      "What is the difference between niche and designer perfumes?",
      "What is the difference between EDP, EDT, and Parfum?",
      "How can I apply perfume for better longevity?",
      "What is fragrance layering and how does it work?",
    ],
    perfume: [
      "Suggest spicy unisex perfumes",
      "Recommend long-lasting perfumes for men",
      "I need a light everyday perfume for women",
      "Recommend sweet vanilla-forward perfumes",
      "Suggest fresh scents for summer",
      "Recommend bold evening perfumes for winter",
    ],
    practical: [
      "Where can I see my orders?",
      "How does shipping and payment work?",
      "What is your return policy?",
      "What can you suggest in the 20-30 AZN range?",
      "How can I track my order?",
    ],
  },
  ru: {
    technical: [
      "Что означают верхние, сердечные и базовые ноты?",
      "В чем разница между нишевыми и дизайнерскими ароматами?",
      "В чем разница между EDP, EDT и Parfum?",
      "Как наносить аромат для лучшей стойкости?",
      "Что такое layering ароматов и как его делать?",
    ],
    perfume: [
      "Посоветуйте пряные унисекс ароматы",
      "Посоветуйте стойкие мужские ароматы",
      "Ищу легкий женский аромат на каждый день",
      "Посоветуйте сладкие ванильные ароматы",
      "Подберите свежие ароматы на лето",
      "Нужен насыщенный вечерний аромат на зиму",
    ],
    practical: [
      "Где посмотреть мои заказы?",
      "Как работают доставка и оплата?",
      "Какие условия возврата?",
      "Что посоветуете в диапазоне 20-30 AZN?",
      "Как отслеживать мой заказ?",
    ],
  },
};

const smartQuestionBundlesByLocale: LocalizedSmartQuestionBundles = {
  az: [
    {
      technical: "EDP, EDT və Parfum arasında fərq nədi?",
      perfume: "Gündəlik istifadə üçün yüngül qadın ətri axtarıram",
      practical: "20-30 AZN aralığında nə məsləhət görərsən?",
    },
    {
      technical: "Qoxuda üst, orta, baza notları nə deməkdi?",
      perfume: "Mənə ədviyyatlı unisex ətir tövsiyə et",
      practical: "Çatdırılma və ödəniş necə olur?",
    },
    {
      technical: "Nişlə dizayner ətirin fərqi nədi?",
      perfume: "Hansı kişi ətirləri daha ağır və qalıcıdı?",
      practical: "Sifarişlərimi harda görə bilərəm?",
    },
    {
      technical: "Ətri daha qalıcı etmək üçün necə vurum?",
      perfume: "Şirin, vanilli qoxular tövsiyə et",
      practical: "Qaytarma prosesi necə olur?",
    },
    {
      technical: "Layering nədi, necə edim?",
      perfume: "Yay üçün təmiz, fresh ətir təklif et",
      practical: "Sifarişimi hardan izləyə bilərəm?",
    },
    {
      technical: "Qoxuda üst, orta, baza notları nə deməkdi?",
      perfume: "Qış üçün güclü axşam ətri istəyirəm",
      practical: "Çatdırılma və ödəniş necə olur?",
    },
  ],
  en: [
    {
      technical: "What is the difference between EDP, EDT, and Parfum?",
      perfume: "I need a light everyday perfume for women",
      practical: "What can you suggest in the 20-30 AZN range?",
    },
    {
      technical: "What do top, heart, and base notes mean?",
      perfume: "Suggest spicy unisex perfumes",
      practical: "How does shipping and payment work?",
    },
    {
      technical: "What is the difference between niche and designer perfumes?",
      perfume: "Recommend long-lasting perfumes for men",
      practical: "Where can I see my orders?",
    },
    {
      technical: "How can I apply perfume for better longevity?",
      perfume: "Recommend sweet vanilla-forward perfumes",
      practical: "What is your return policy?",
    },
    {
      technical: "What is fragrance layering and how does it work?",
      perfume: "Suggest fresh scents for summer",
      practical: "How can I track my order?",
    },
    {
      technical: "What do top, heart, and base notes mean?",
      perfume: "Recommend bold evening perfumes for winter",
      practical: "How does shipping and payment work?",
    },
  ],
  ru: [
    {
      technical: "В чем разница между EDP, EDT и Parfum?",
      perfume: "Ищу легкий женский аромат на каждый день",
      practical: "Что посоветуете в диапазоне 20-30 AZN?",
    },
    {
      technical: "Что означают верхние, сердечные и базовые ноты?",
      perfume: "Посоветуйте пряные унисекс ароматы",
      practical: "Как работают доставка и оплата?",
    },
    {
      technical: "В чем разница между нишевыми и дизайнерскими ароматами?",
      perfume: "Посоветуйте стойкие мужские ароматы",
      practical: "Где посмотреть мои заказы?",
    },
    {
      technical: "Как наносить аромат для лучшей стойкости?",
      perfume: "Посоветуйте сладкие ванильные ароматы",
      practical: "Какие условия возврата?",
    },
    {
      technical: "Что такое layering ароматов и как его делать?",
      perfume: "Подберите свежие ароматы на лето",
      practical: "Как отслеживать мой заказ?",
    },
    {
      technical: "Что означают верхние, сердечные и базовые ноты?",
      perfume: "Нужен насыщенный вечерний аромат на зиму",
      practical: "Как работают доставка и оплата?",
    },
  ],
};

function pickRandomQuestion(list: string[]): string {
  if (!list.length) return "";
  return list[Math.floor(Math.random() * list.length)] || "";
}

function shuffleQuestions(questions: string[]): string[] {
  const pool = [...questions];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }
  return pool;
}

function pickSmartBundle(locale: Locale): SmartQuestionBundle | null {
  const bundles = smartQuestionBundlesByLocale[locale] ?? smartQuestionBundlesByLocale.az;
  if (!bundles.length) return null;

  // Change bundle every 6 hours to keep it fresh but coherent.
  const windowSeed = Math.floor(Date.now() / (1000 * 60 * 60 * 6));
  const localeOffset = locale === "az" ? 0 : locale === "en" ? 1 : 2;
  const bundleIndex = (windowSeed + localeOffset) % bundles.length;

  return bundles[bundleIndex] ?? bundles[0] ?? null;
}

function selectRandomQuestions(locale: Locale): string[] {
  const smartBundle = pickSmartBundle(locale);
  if (smartBundle) {
    return shuffleQuestions([smartBundle.technical, smartBundle.perfume, smartBundle.practical]);
  }

  const localizedPool = quickQuestionPools[locale] ?? quickQuestionPools.az;
  const selected = [
    pickRandomQuestion(localizedPool.technical),
    pickRandomQuestion(localizedPool.perfume),
    pickRandomQuestion(localizedPool.practical),
  ].filter((question): question is string => Boolean(question));

  return shuffleQuestions(selected).slice(0, 3);
}

function formatMessageTime(timestamp: number, locale: Locale): string {
  const localeCode = locale === "az" ? "az-AZ" : locale === "ru" ? "ru-RU" : "en-US";
  const use24Hour = locale !== "en";

  return new Date(timestamp).toLocaleTimeString(localeCode, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour ? true : false,
  });
}

function getUserMessageLabel(locale: Locale): string {
  if (locale === "az") return "Siz";
  if (locale === "ru") return "Вы";
  return "You";
}

function sanitizeStoredMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Partial<Message>;
      if (raw.role !== "user" && raw.role !== "assistant") return null;
      const text = typeof raw.text === "string" ? raw.text.trim() : "";
      if (!text) return null;

      return {
        id: typeof raw.id === "string" && raw.id ? raw.id : `${raw.role}-${Date.now()}-${index}`,
        role: raw.role,
        text,
        createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
        followUp: sanitizeFollowUpPrompt(raw.followUp),
        actionSuggestions: sanitizeActionSuggestions(raw.actionSuggestions),
      } as Message;
    })
    .filter((entry): entry is Message => entry !== null);
}

function buildSessionTitle(messages: Message[], locale: Locale): string {
  const allText = messages
    .filter((m) => m.text && m.text.length > 0)
    .map((m) => m.text.trim())
    .join(" ");

  if (!allText) {
    if (locale === "az") return "Yeni söhbət";
    if (locale === "ru") return "Новый чат";
    return "New chat";
  }

  const normalized = allText.toLowerCase();
  const keywords = [];

  if (/(gift|hədiyyə|hediye|podarok|подар)/i.test(normalized)) keywords.push(locale === "az" ? "Hədiyyə" : locale === "ru" ? "Подарок" : "Gift");
  if (/(recommend|tövsiyə|совету|рекомендуй)/i.test(normalized)) keywords.push(locale === "az" ? "Tövsiyə" : locale === "ru" ? "Рекомендация" : "Recommendation");
  if (/(fragrance|perfume|ətir|qoxu|аромат)/i.test(normalized)) keywords.push(locale === "az" ? "Ətir" : locale === "ru" ? "Аромат" : "Perfume");
  if (/(fresh|clean|light|təmiz|свежий)/i.test(normalized)) keywords.push(locale === "az" ? "Fresh" : locale === "ru" ? "Свежий" : "Fresh");
  if (/(sweet|vanilla|şirin|vanil|ванил|сладкий)/i.test(normalized)) keywords.push(locale === "az" ? "Şirin" : locale === "ru" ? "Сладкий" : "Sweet");
  if (/(spicy|ədviyyat|пряный)/i.test(normalized)) keywords.push(locale === "az" ? "Ədviyyatlı" : locale === "ru" ? "Пряный" : "Spicy");
  if (/(budget|price|azn|manat|цена)/i.test(normalized)) keywords.push(locale === "az" ? "Büdcə" : locale === "ru" ? "Бюджет" : "Budget");

  if (keywords.length > 0) {
    return keywords.slice(0, 3).join(" • ");
  }

  const firstUserMessage = messages.find((message) => message.role === "user")?.text.trim();
  if (firstUserMessage) {
    return firstUserMessage.length > 50 ? `${firstUserMessage.slice(0, 47)}...` : firstUserMessage;
  }

  if (locale === "az") return "Yeni söhbət";
  if (locale === "ru") return "Новый чат";
  return "New chat";
}

function buildSessionPreview(messages: Message[]): string {
  const assistantMessage = [...messages].reverse().find((message) => message.role === "assistant")?.text.trim();
  const fallback = messages[messages.length - 1]?.text?.trim() ?? "";
  const preview = assistantMessage || fallback;
  if (!preview) return "";
  return preview.length > 110 ? `${preview.slice(0, 107)}...` : preview;
}

function formatHistoryTime(timestampIso: string, locale: Locale): string {
  const date = new Date(timestampIso);
  if (Number.isNaN(date.getTime())) return "";

  const localeCode = locale === "az" ? "az-AZ" : locale === "ru" ? "ru-RU" : "en-US";
  return date.toLocaleTimeString(localeCode, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale === "en",
  });
}

type RecommendationCard = {
  kind: "perfume" | "internal-link";
  name: string;
  details: string;
  href: string;
};

function isLikelyPerfumeContext(text: string): boolean {
  return /(perfume|fragrance|scent|notes?|ətir|qoxu|дух|аромат)/iu.test(text);
}

function titleFromInternalPath(path: string): string {
  if (path.startsWith("/catalog")) return "Catalog";
  if (path.startsWith("/brands")) return "Brands";
  if (path.startsWith("/wishlist")) return "Wishlist";
  if (path.startsWith("/compare")) return "Compare";
  if (path.startsWith("/cart")) return "Cart";
  if (path.startsWith("/account")) return "Account";
  if (path.startsWith("/qoxunu")) return "Scent Quiz";
  if (path.startsWith("/perfumes/")) {
    const slug = path.split("/")[2] || "perfume";
    return slug
      .split("-")
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
      .join(" ");
  }

  return "Open page";
}

function perfumeImageCandidates(href: string): string[] {
  if (!href.startsWith("/perfumes/")) return [];
  const slug = href.replace("/perfumes/", "").split(/[?#]/)[0];
  if (!slug) return [];
  const encoded = encodeURIComponent(slug);
  return [
    `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.png`,
    `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.jpg`,
    `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.webp`,
  ];
}

function PerfumeThumb({ href, name, imageSrc }: { href: string; name: string; imageSrc?: string }) {
  const sources = useMemo(() => (imageSrc ? [imageSrc] : perfumeImageCandidates(href)), [href, imageSrc]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const currentSrc = sources[sourceIndex] || "";

  return (
    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md">
      {!failed && currentSrc ? (
        <>
          {!isLoaded ? (
            <div className="absolute inset-0 animate-pulse rounded-md bg-zinc-100" />
          ) : null}
          <Image
            src={currentSrc}
            alt={name}
            fill
            sizes="64px"
            unoptimized
            className={`object-contain transition duration-500 group-hover:scale-[1.07] ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              if (sourceIndex < sources.length - 1) {
                setSourceIndex((prev) => prev + 1);
                setIsLoaded(false);
              } else {
                setFailed(true);
              }
            }}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-zinc-100 text-[11px] font-medium tracking-[0.08em] text-zinc-700">
          {initials || "PF"}
        </div>
      )}
    </div>
  );
}

function AnimatedDots({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      <span className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0s" }} />
      <span className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0.1s" }} />
      <span className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0.2s" }} />
    </div>
  );
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <AnimatedDots />
      <span
        className="bg-[linear-gradient(110deg,rgba(161,161,170,0.72)_10%,rgba(255,255,255,0.98)_35%,rgba(161,161,170,0.72)_60%)] bg-[length:220%_100%] bg-clip-text text-transparent"
        style={{ animation: "thinkingShimmer 1.65s linear infinite" }}
      >
        {label}
      </span>
    </div>
  );
}

function sanitizeAssistantText(value: string): string {
  return value
    .replace(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/giu, (_match, _quote, href, inner) => {
      const label = String(inner).replace(/<[^>]+>/g, "").trim();
      if (/^tel:/iu.test(href)) return label || href.replace(/^tel:/iu, "");
      if (/^mailto:/iu.test(href)) return label || href.replace(/^mailto:/iu, "");
      if (!label) return href;
      return label === href ? label : `${label} (${href})`;
    })
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/p>\s*<p[^>]*>/giu, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function stripRichTextDecorators(value: string): string {
  return sanitizeAssistantText(value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function renderInlineRichText(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`)/g)
    .filter(Boolean)
    .map((segment, index) => {
      const boldMatch = segment.match(/^(?:\*\*|__)(.+)(?:\*\*|__)$/);
      if (boldMatch) {
        return (
          <strong key={`rich-${index}`} className="font-semibold text-white">
            {boldMatch[1]}
          </strong>
        );
      }

      const italicMatch = segment.match(/^(?:\*|_)(.+)(?:\*|_)$/);
      if (italicMatch) {
        return (
          <em key={`rich-${index}`} className="italic text-zinc-100/95">
            {italicMatch[1]}
          </em>
        );
      }

      const codeMatch = segment.match(/^`([^`]+)`$/);
      if (codeMatch) {
        return (
          <code
            key={`rich-${index}`}
            className="rounded bg-white/10 px-1.5 py-0.5 text-[0.92em] font-medium text-zinc-100"
          >
            {codeMatch[1]}
          </code>
        );
      }

      return segment;
    });
}

type RichTextBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "unordered-list"; items: string[] };

function pushParagraphBlock(blocks: RichTextBlock[], lines: string[]) {
  const clean = lines.map((line) => line.trim()).filter(Boolean);
  if (!clean.length) return;
  blocks.push({ type: "paragraph", lines: clean });
}

function parseRichTextBlocks(text: string): RichTextBlock[] {
  const normalized = sanitizeAssistantText(text).replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const blocks: RichTextBlock[] = [];
  let paragraphLines: string[] = [];
  let listMode: "ordered-list" | "unordered-list" | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listMode || !listItems.length) return;
    blocks.push({ type: listMode, items: [...listItems] });
    listMode = null;
    listItems = [];
  };

  const flushParagraph = () => {
    pushParagraphBlock(blocks, paragraphLines);
    paragraphLines = [];
  };

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/u);
    if (orderedMatch) {
      flushParagraph();
      if (listMode !== "ordered-list") {
        flushList();
        listMode = "ordered-list";
      }
      listItems.push(orderedMatch[1]);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/u);
    if (unorderedMatch) {
      flushParagraph();
      if (listMode !== "unordered-list") {
        flushList();
        listMode = "unordered-list";
      }
      listItems.push(unorderedMatch[1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushList();
  flushParagraph();

  return blocks;
}

function RichTextMessage({ text }: { text: string }) {
  const blocks = useMemo(() => parseRichTextBlocks(text), [text]);

  if (!blocks.length) return null;

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "ordered-list") {
          return (
            <ol
              key={`block-${blockIndex}`}
              className="list-decimal space-y-2 pl-5 text-[15px] leading-[1.45] text-zinc-100 marker:text-zinc-400"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`item-${blockIndex}-${itemIndex}`} className="pl-1">
                  {renderInlineRichText(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul
              key={`block-${blockIndex}`}
              className="list-disc space-y-2 pl-5 text-[15px] leading-[1.45] text-zinc-100 marker:text-zinc-400"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`item-${blockIndex}-${itemIndex}`} className="pl-1">
                  {renderInlineRichText(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`block-${blockIndex}`} className="text-[15px] leading-[1.45] text-zinc-100">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={`line-${blockIndex}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInlineRichText(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function ContactPanel({
  copy,
}: {
  copy: (typeof copyByLocale)[Locale];
}) {
  return (
    <div className="absolute bottom-24 left-6 right-6 z-10">
      <div className="mb-4">
        <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.24em] text-white/45">Powered by</p>
        <DeveloperLogoLink className="opacity-80" />
      </div>
      <p className="text-[13px] text-white/72">{copy.tabContact}</p>
      <p className="mt-1 max-w-[88%] text-[20px] font-semibold leading-[1.12] text-white">{copy.contactTitle}</p>
      <p className="mt-3 max-w-[80%] text-[14px] leading-[1.45] text-zinc-300">{copy.contactBody}</p>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{copy.contactEmailLabel}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-1 block text-[18px] font-medium leading-[1.3] text-white transition hover:text-zinc-200"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{copy.contactWhatsappLabel}</p>
          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-[18px] font-medium leading-[1.3] text-white transition hover:text-zinc-200"
          >
            {CONTACT_WHATSAPP_LABEL}
          </a>
        </div>
      </div>
    </div>
  );
}

function DeveloperLogoLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={DEVELOPER_WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Open Bakhishov Brands WhatsApp"
      className={`group inline-flex shrink-0 items-center justify-center text-white transition duration-300 ease-out ${className}`.trim()}
    >
      <Image
        src="/BAKHISHOV.png"
        alt="Bakhishov Brands"
        width={853}
        height={76}
        sizes="120px"
        unoptimized
        className="h-[12px] w-auto object-contain opacity-80 transition duration-300 [filter:brightness(0)_invert(1)] group-hover:opacity-100 group-hover:[filter:brightness(0)_invert(1)_drop-shadow(0_0_8px_rgba(255,255,255,0.28))] group-focus-visible:opacity-100 group-focus-visible:[filter:brightness(0)_invert(1)_drop-shadow(0_0_8px_rgba(255,255,255,0.28))]"
      />
    </a>
  );
}

function sanitizeFollowUpPrompt(value: unknown): FollowUpPrompt | null {
  if (!value || typeof value !== "object") return null;

  const prompt = value as {
    question?: unknown;
    options?: unknown;
    allowFreeText?: unknown;
    inputPlaceholder?: unknown;
  };

  const question = typeof prompt.question === "string" ? prompt.question.trim() : "";
  if (!question) return null;

  const options = Array.isArray(prompt.options)
    ? prompt.options.filter((option): option is string => typeof option === "string").map((option) => option.trim()).filter(Boolean).slice(0, 4)
    : [];
  const allowFreeText = Boolean(prompt.allowFreeText);
  const inputPlaceholder =
    typeof prompt.inputPlaceholder === "string" ? prompt.inputPlaceholder.trim().slice(0, 90) : "";

  return {
    question,
    ...(options.length ? { options } : {}),
    ...(allowFreeText ? { allowFreeText } : {}),
    ...(inputPlaceholder ? { inputPlaceholder } : {}),
  };
}

function sanitizeActionSuggestions(value: unknown): ActionSuggestion[] {
  if (!Array.isArray(value)) return [];

  const parsedSuggestions = value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const parsed = item as Partial<ActionSuggestion>;
    if (
      parsed.type !== "add_to_cart" &&
      parsed.type !== "add_to_wishlist" &&
      parsed.type !== "remove_from_cart" &&
      parsed.type !== "clear_cart" &&
      parsed.type !== "remove_from_wishlist"
    ) {
      return null;
    }

    const id = typeof parsed.id === "string" ? parsed.id.trim() : "";
    const perfumeSlug = typeof parsed.perfumeSlug === "string" ? parsed.perfumeSlug.trim().toLowerCase() : "";
    const perfumeName = typeof parsed.perfumeName === "string" ? parsed.perfumeName.trim() : "";
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
    if (!id || !perfumeSlug || !perfumeName || !reason) return null;

    const action: ActionSuggestion = {
      id,
      type: parsed.type,
      perfumeSlug,
      perfumeName,
      reason,
    };

    if (Number.isFinite(Number(parsed.sizeMl))) action.sizeMl = Number(parsed.sizeMl);
    if (Number.isFinite(Number(parsed.quantity))) action.quantity = Number(parsed.quantity);
    if (Number.isFinite(Number(parsed.unitPrice))) action.unitPrice = Number(parsed.unitPrice);

    return action;
  });

  return parsedSuggestions.filter((item): item is ActionSuggestion => item !== null).slice(0, 2);
}

function actionApproveLabel(locale: Locale, actionType: ActionType): string {
  if (locale === "az") {
    if (actionType === "add_to_cart") return "Təsdiqlə və səbətə əlavə et";
    if (actionType === "add_to_wishlist") return "Təsdiqlə və wishlist-ə əlavə et";
    if (actionType === "remove_from_cart") return "Təsdiqlə və səbətdən sil";
    if (actionType === "remove_from_wishlist") return "Təsdiqlə və wishlist-dən sil";
    return "Təsdiqlə və səbəti təmizlə";
  }
  if (locale === "ru") {
    if (actionType === "add_to_cart") return "Подтвердить и добавить в корзину";
    if (actionType === "add_to_wishlist") return "Подтвердить и добавить в wishlist";
    if (actionType === "remove_from_cart") return "Подтвердить и удалить из корзины";
    if (actionType === "remove_from_wishlist") return "Подтвердить и удалить из wishlist";
    return "Подтвердить и очистить корзину";
  }
  if (actionType === "add_to_cart") return "Approve and add to cart";
  if (actionType === "add_to_wishlist") return "Approve and add to wishlist";
  if (actionType === "remove_from_cart") return "Approve and remove from cart";
  if (actionType === "remove_from_wishlist") return "Approve and remove from wishlist";
  return "Approve and clear cart";
}

function actionDoneLabel(locale: Locale, actionType: ActionType): string {
  if (locale === "az") {
    if (actionType === "add_to_cart") return "Səbətə əlavə olundu";
    if (actionType === "add_to_wishlist") return "Wishlist-ə əlavə olundu";
    if (actionType === "remove_from_cart") return "Səbətdən silindi";
    if (actionType === "remove_from_wishlist") return "Wishlist-dən silindi";
    return "Səbət tam təmizləndi";
  }
  if (locale === "ru") {
    if (actionType === "add_to_cart") return "Добавлено в корзину";
    if (actionType === "add_to_wishlist") return "Добавлено в wishlist";
    if (actionType === "remove_from_cart") return "Удалено из корзины";
    if (actionType === "remove_from_wishlist") return "Удалено из wishlist";
    return "Корзина очищена";
  }
  if (actionType === "add_to_cart") return "Added to cart";
  if (actionType === "add_to_wishlist") return "Added to wishlist";
  if (actionType === "remove_from_cart") return "Removed from cart";
  if (actionType === "remove_from_wishlist") return "Removed from wishlist";
  return "Cart cleared";
}

function actionFailedLabel(locale: Locale): string {
  if (locale === "az") return "Əməliyyatı icra etmək olmadı. Bir az sonra yenidən cəhd edin.";
  if (locale === "ru") return "Не удалось выполнить действие. Попробуйте еще раз.";
  return "I couldn't complete that action right now. Please try again.";
}

function signInRequiredActionLabel(locale: Locale): string {
  if (locale === "az") return "Bu funksiyanı işlətmək üçün hesabınıza daxil olun: /login";
  if (locale === "ru") return "Чтобы использовать это действие, войдите в аккаунт: /login";
  return "Please sign in to use this action: /login";
}

function bulkActionBlockedLabel(locale: Locale): string {
  if (locale === "az") return "Təhlükəsizlik səbəbilə AI ilə toplu əməliyyat icra etmirəm. Məhsulları tək-tək idarə edə bilərəm.";
  if (locale === "ru") return "По соображениям безопасности массовые действия через AI отключены. Могу выполнить по одному товару.";
  return "For safety, bulk actions are disabled in AI. I can do item-by-item actions.";
}

function emitCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("perfoumer:cart-updated"));
}

function emitWishlistUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("perfoumer:wishlist-updated"));
}

function parseInternalLinkCards(text: string): RecommendationCard[] {
  const cards: RecommendationCard[] = [];
  const bestHrefByBasePath = new Map<string, string>();
  const pathRegex = /(https?:\/\/(?:www\.)?(?:perfoumer\.az|perfoumerweb\.com))?(\/(?:catalog|brands|wishlist|compare|cart|account|qoxunu|perfumes\/[a-z0-9-]+)(?:[/?#][^\s)]*)?)/giu;

  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(text)) !== null) {
    const href = match[2];
    const basePath = href.split("?")[0]?.split("#")[0] || href;
    const existing = bestHrefByBasePath.get(basePath);

    // Prefer more specific links (e.g. /catalog?note=... over /catalog).
    if (!existing || href.length > existing.length) {
      bestHrefByBasePath.set(basePath, href);
    }
  }

  for (const href of bestHrefByBasePath.values()) {
    const isPerfumePath = href.startsWith("/perfumes/");

    cards.push({
      kind: isPerfumePath ? "perfume" : "internal-link",
      name: titleFromInternalPath(href),
      details: href,
      href,
    });
  }

  return cards;
}

function parsePerfumeCards(text: string): RecommendationCard[] {
  const cards: RecommendationCard[] = [];
  const seenNames = new Set<string>();
  const allowPerfumeCards = isLikelyPerfumeContext(text);
  const plainText = stripRichTextDecorators(text);
  const hasStructuredRecommendationList = plainText
    .split("\n")
    .some((line) => /^(?:[-*]|\d+\.)\s*(?:\*\*|__)?[^:–-]{1,70}\s*[:–-]\s*.+$/u.test(line.trim()));
  const hasRecommendationLeadIn =
    /(tövsiy|teklif|uyğun|secilmis|seçilmiş|diqqete layiq|diqqətəlayiq|recommend|suggest|best match|top picks|вариант|рекоменд|подход)/iu.test(
      plainText
    );
  const hasRecommendationSignal = hasRecommendationLeadIn || hasStructuredRecommendationList;

  const pushInternalLinks = () => {
    for (const linkCard of parseInternalLinkCards(text)) {
      const key = `${linkCard.kind}:${linkCard.href}`;
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      cards.push(linkCard);
    }
  };

  const addCard = (nameRaw: string, detailsRaw: string, allowSingleWord = false) => {
    if (!allowPerfumeCards) return;

    const name = stripRichTextDecorators(nameRaw).replace(/[.,;:!?]+$/g, "");
    const details = stripRichTextDecorators(detailsRaw).replace(/^[,\s]+/, "").replace(/[\s]+$/g, "");
    const words = name.split(/\s+/).filter(Boolean);

    if (!name || !details) return;
    if (name.includes("/") || name.includes("http")) return;
    if (words.length < (allowSingleWord ? 1 : 2) || words.length > 6) return;
    if (name.length < 4 || name.length > 60) return;

    const key = name.toLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);

    cards.push({ kind: "perfume", name, details, href: "/catalog" });
  };

  // Only parse perfume cards when text clearly looks like recommendation output.
  if (!hasRecommendationSignal) {
    pushInternalLinks();
    return cards.slice(0, 5);
  }

  // Pattern 1: line-based recommendations (bullets or numbered lines).
  const lines = plainText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const normalized = line
      .replace(/^\d+\.\s*/, "")
      .replace(/^[-*]\s*/, "");

    const match = normalized.match(/^([^:–-]+?)\s*[:–-]\s*(.+)$/u);
    if (match) {
      addCard(match[1], match[2], true);
    }
  }

  // Pattern 2: inline paragraph recommendations: "Brand Name Perfume - details ..."
  const compact = plainText.replace(/\s+/g, " ").trim();
  const inlinePattern =
    /([\p{Lu}][\p{L}\d'&.-]*(?:\s+[\p{Lu}][\p{L}\d'&.-]*){1,5})\s*[–-]\s*([^.;!?]+(?:[.;!?](?!\s*[\p{Lu}][\p{L}\d'&.-]*(?:\s+[\p{Lu}][\p{L}\d'&.-]*){1,5}\s*[–-])[^.;!?]*)*)/gu;

  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlinePattern.exec(compact)) !== null) {
    addCard(inlineMatch[1], inlineMatch[2]);
  }

  pushInternalLinks();
  return cards.slice(0, 5);
}

function stripRenderedCardLinksFromText(text: string, cards: RecommendationCard[]): string {
  if (!cards.length) return text;

  let next = text;
  for (const card of cards) {
    const escapedHref = card.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Remove direct path mentions once they are represented as UI cards.
    next = next.replace(new RegExp(`\\(?\\s*${escapedHref}\\s*\\)?`, "giu"), "");
  }

  return next
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function AssistantContent({
  text,
  onCardClick,
}: {
  text: string;
  onCardClick?: (href: string, kind: RecommendationCard["kind"]) => void;
}) {
  const cards = useMemo(() => parsePerfumeCards(text), [text]);
  const displayText = useMemo(() => stripRenderedCardLinksFromText(text, cards), [text, cards]);
  const [resolvedByName, setResolvedByName] = useState<Record<string, { href: string; image: string; name: string }>>({});
  const attemptedResolveNamesRef = useRef<Set<string>>(new Set());
  const visibleCards = cards;

  const perfumeNamesToResolve = useMemo(
    () => cards.filter((card) => card.kind === "perfume").map((card) => card.name),
    [cards]
  );

  useEffect(() => {
    const perfumeNames = Array.from(new Set(perfumeNamesToResolve))
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLowerCase();
        if (resolvedByName[key]) return false;
        // Avoid re-requesting unresolved names on subsequent renders.
        if (attemptedResolveNamesRef.current.has(key)) return false;
        return true;
      });

    if (!perfumeNames.length) return;

    for (const name of perfumeNames) {
      attemptedResolveNamesRef.current.add(name.toLowerCase());
    }

    let isActive = true;

    (async () => {
      try {
        const response = await fetch("/api/perfumes/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: perfumeNames }),
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          items?: Array<{ requestName: string; slug: string; name: string; image: string }>;
        };

        if (!isActive || !Array.isArray(data.items)) return;

        setResolvedByName((prev) => {
          const next = { ...prev };
          for (const item of data.items ?? []) {
            const key = item.requestName.toLowerCase();
            next[key] = {
              href: `/perfumes/${item.slug}`,
              image: item.image,
              name: item.name,
            };
          }
          return next;
        });
      } catch {
        // Allow retry on transient network failures.
        for (const name of perfumeNames) {
          attemptedResolveNamesRef.current.delete(name.toLowerCase());
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [perfumeNamesToResolve, resolvedByName]);

  if (visibleCards.length >= 1) {
    return (
      <div className="space-y-2">
        <RichTextMessage text={displayText} />
        <div className="space-y-2">
          {visibleCards.map((card, idx) => {
            const resolved = card.kind === "perfume" ? resolvedByName[card.name.toLowerCase()] : undefined;
            const href = resolved?.href || card.href;
            const imageSrc = resolved?.image;
            const displayName = resolved?.name || card.name;
            const isInternalLink = card.kind === "internal-link";

            return (
              <Link
                key={`${card.name}-${idx}`}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  onCardClick?.(href, card.kind);
                }}
                className={
                  isInternalLink
                    ? "group block rounded-lg border border-white/75 bg-white px-3 py-2 text-zinc-900 transition duration-300 hover:-translate-y-[1px]"
                    : "group relative block overflow-hidden rounded-xl border border-white/85 bg-white p-2.5 text-zinc-900 transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_10px_26px_rgba(255,255,255,0.22)]"
                }
                style={{
                  opacity: 0,
                  animation: `suggestionCardIn 380ms cubic-bezier(0.22,1,0.36,1) ${Math.min(idx * 80, 360)}ms forwards`,
                }}
              >
                {isInternalLink ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[14px] font-medium text-zinc-900">{displayName}</p>
                    <span className="shrink-0 text-zinc-500 transition duration-300 group-hover:translate-x-1">
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                        <path d="M7.22 4.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 010-1.06z" />
                      </svg>
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="pointer-events-none absolute -left-24 top-0 h-full w-16 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-all duration-700 group-hover:left-[calc(100%+4rem)] group-hover:opacity-100" />
                    <div className="flex items-start gap-2.5">
                      <PerfumeThumb key={imageSrc || href} href={href} name={displayName} imageSrc={imageSrc} />

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-[14px] font-medium text-zinc-900">{displayName}</p>
                        <p
                          className="text-[12px] leading-[1.35] text-zinc-600"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {card.details}
                        </p>
                      </div>

                      <span className="mt-0.5 shrink-0 self-center text-zinc-500 transition duration-300 group-hover:translate-x-1">
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                          <path d="M7.22 4.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 010-1.06z" />
                        </svg>
                      </span>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return <RichTextMessage text={text} />;
}

function useTypewriter(sourceText: string, shouldAnimate: boolean) {
  const [visibleText, setVisibleText] = useState(shouldAnimate ? "" : sourceText);

  useEffect(() => {
    let frameId: number | null = null;
    let timeoutId: number | null = null;

    if (!shouldAnimate) {
      frameId = window.requestAnimationFrame(() => {
        setVisibleText(sourceText);
      });

      return () => {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      setVisibleText("");
      let index = 0;

      const nextDelay = (latestChar: string) => {
        if (/[.!?]/.test(latestChar)) return 130;
        if (/[,;:]/.test(latestChar)) return 90;
        if (/\n/.test(latestChar)) return 120;
        if (/\s/.test(latestChar)) return 35;
        return 24;
      };

      const step = () => {
        // Advance by one character for a more natural sentence-like typing cadence.
        index += 1;
        const slice = sourceText.slice(0, index);
        setVisibleText(slice);

        if (index < sourceText.length) {
          const latestChar = slice[slice.length - 1] ?? "";
          timeoutId = window.setTimeout(step, nextDelay(latestChar));
        }
      };

      timeoutId = window.setTimeout(step, 120);
    });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [sourceText, shouldAnimate]);

  return visibleText;
}

function AnimatedAssistantText({
  text,
  animate,
  onCardClick,
}: {
  text: string;
  animate: boolean;
  onCardClick?: (href: string, kind: RecommendationCard["kind"]) => void;
}) {
  const hasCards = useMemo(() => parsePerfumeCards(text).length > 0, [text]);
  const visibleText = useTypewriter(text, animate);

  if (hasCards && animate && visibleText !== text) {
    return <RichTextMessage text={visibleText} />;
  }

  if (hasCards) {
    return <AssistantContent text={text} onCardClick={onCardClick} />;
  }

  if (animate && visibleText !== text) {
    return <RichTextMessage text={visibleText} />;
  }

  return <AssistantContent text={text} onCardClick={onCardClick} />;
}

function FollowUpPromptView({
  prompt,
  disabled,
  onOptionSelect,
}: {
  prompt: FollowUpPrompt;
  disabled: boolean;
  onOptionSelect: (option: string) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
        <p className="text-[14px] leading-[1.45] text-zinc-100">{renderInlineRichText(prompt.question)}</p>
      </div>

      {prompt.options?.length ? (
        <div className="flex flex-wrap gap-2">
          {prompt.options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => onOptionSelect(option)}
              disabled={disabled}
              className="rounded-full border border-white/20 bg-white/8 px-3 py-2 text-[12px] font-medium text-white transition hover:border-white/35 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                opacity: 0,
                animation: `suggestionCardIn 320ms cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 85, 340)}ms forwards`,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AIChatModal({
  isOpen,
  onOpen,
  onClose,
  onAfterClose,
  isTriggerHidden = false,
  locale,
  womanVideoUrl,
  contactVideoUrl,
  triggerLabel,
}: AIChatModalProps) {
  const siteSettings = useSiteSettings();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const copy = applySiteBranding(copyByLocale[locale], siteSettings);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("chat");
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isBackTransitioning, setIsBackTransitioning] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isTriggerHovered, setIsTriggerHovered] = useState(false);
  const [isAutoNudging, setIsAutoNudging] = useState(false);
  const [presetQuestions, setPresetQuestions] = useState<string[]>(() => selectRandomQuestions(locale));
  const introRotatingTitles = useMemo(
    () => introRotatingTitlesByLocale[locale] ?? [copy.introLine2],
    [locale, copy.introLine2]
  );
  const [introTitleIndex, setIntroTitleIndex] = useState(0);
  const [typedIntroTitle, setTypedIntroTitle] = useState("");
  const [isDeletingIntroTitle, setIsDeletingIntroTitle] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<UserContextPayload>({
    signedIn: false,
    device: {},
    wishlistSlugs: [],
    cartItems: [],
    comments: [],
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<StoredChatSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const onAfterCloseRef = useRef(onAfterClose);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRafOneRef = useRef<number | null>(null);
  const openRafTwoRef = useRef<number | null>(null);
  const autoNudgeDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoNudgeResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadActiveChatHistory = async (userId: string) => {
    if (!supabase) return;

    setIsHistoryLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("ai_chat_sessions")
        .select("id,title,preview,locale,last_message_at,expires_at,messages_json")
        .eq("user_id", userId)
        .gt("expires_at", nowIso)
        .order("last_message_at", { ascending: false })
        .limit(20);

      const sessions = ((data ?? []) as Array<Record<string, unknown>>)
        .map((entry) => {
          const id = typeof entry.id === "string" ? entry.id : "";
          if (!id) return null;

          return {
            id,
            title: typeof entry.title === "string" ? entry.title : "",
            preview: typeof entry.preview === "string" ? entry.preview : "",
            locale: (entry.locale === "az" || entry.locale === "en" || entry.locale === "ru" ? entry.locale : locale) as Locale,
            lastMessageAt: typeof entry.last_message_at === "string" ? entry.last_message_at : new Date().toISOString(),
            expiresAt: typeof entry.expires_at === "string" ? entry.expires_at : new Date().toISOString(),
            messages: sanitizeStoredMessages(entry.messages_json),
          } as StoredChatSession;
        })
        .filter((entry): entry is StoredChatSession => entry !== null)
        .filter((entry) => entry.messages.length > 0);

      setChatHistory(sessions);
    } catch {
      setChatHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const persistChatSession = async (conversation: Message[]) => {
    if (!supabase || !currentUserId || !conversation.length) return;

    const sessionId = chatSessionId ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : `chat-${Date.now()}`);
    if (!chatSessionId) {
      setChatSessionId(sessionId);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const payload = {
      id: sessionId,
      user_id: currentUserId,
      locale,
      title: buildSessionTitle(conversation, locale),
      preview: buildSessionPreview(conversation),
      messages_json: conversation,
      last_message_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    await supabase.from("ai_chat_sessions").upsert(payload, { onConflict: "id" });
    void loadActiveChatHistory(currentUserId);
  };

  const resumeChatSession = (session: StoredChatSession) => {
    const restored = sanitizeStoredMessages(session.messages);
    if (!restored.length) return;

    setMessages(restored);
    setChatSessionId(session.id);
    setTypingMessageId(null);
    setActiveTab("chat");
    setIsHistoryOpen(false);
  };

  useEffect(() => {
    onAfterCloseRef.current = onAfterClose;
  }, [onAfterClose]);

  useEffect(() => {
    let isMounted = true;

    const applyGuestContext = () => {
      if (!isMounted) return;
      setCurrentUserId(null);
      setChatSessionId(null);
      setChatHistory([]);
      setIsHistoryOpen(false);
      setUserContext({
        signedIn: false,
        device: collectDeviceContext(),
        wishlistSlugs: [],
        cartItems: [],
        comments: [],
      });
    };

    const hydrateForSession = async (session: Session | null) => {
      if (!isMounted) return;

      if (!supabase || !session?.user) {
        applyGuestContext();
        return;
      }

      setCurrentUserId(session.user.id);
      void loadActiveChatHistory(session.user.id);

      const [wishlistRes, cartRes, commentsRes] = await Promise.all([
        supabase
          .from("wishlists")
          .select("perfume_slug")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("cart_items")
          .select("perfume_slug,quantity,size_ml")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("comments")
          .select("perfume_slug,rating,created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);

      if (!isMounted) return;

      const wishlistSlugs = ((wishlistRes.data ?? []) as Array<{ perfume_slug?: unknown }>)
        .map((entry) => (typeof entry.perfume_slug === "string" ? entry.perfume_slug.trim().toLowerCase() : ""))
        .filter(Boolean);
      const cartItems = ((cartRes.data ?? []) as Array<{ perfume_slug?: unknown; quantity?: unknown; size_ml?: unknown }>)
        .map((entry) => ({
          perfumeSlug: typeof entry.perfume_slug === "string" ? entry.perfume_slug.trim().toLowerCase() : "",
          quantity: Number.isFinite(Number(entry.quantity)) ? Math.max(1, Number(entry.quantity)) : 1,
          sizeMl: Number.isFinite(Number(entry.size_ml)) ? Math.max(0, Number(entry.size_ml)) : 0,
        }))
        .filter((entry) => entry.perfumeSlug);
      const comments = ((commentsRes.data ?? []) as Array<{ perfume_slug?: unknown; rating?: unknown; created_at?: unknown }>)
        .map((entry) => ({
          perfumeSlug: typeof entry.perfume_slug === "string" ? entry.perfume_slug.trim().toLowerCase() : "",
          rating: Number.isFinite(Number(entry.rating)) ? Number(entry.rating) : 0,
          createdAt: typeof entry.created_at === "string" ? entry.created_at : "",
        }))
        .filter((entry) => entry.perfumeSlug);

      const metadata = session.user.user_metadata ?? {};
      const username = typeof metadata.username === "string" ? metadata.username.trim() : "";
      const profileGender = typeof metadata.gender === "string" ? metadata.gender.trim() : "";

      setUserContext({
        signedIn: true,
        email: session.user.email ?? "",
        username,
        profileGender,
        device: collectDeviceContext(),
        wishlistSlugs,
        cartItems,
        comments,
      });
    };

    if (!supabase) {
      applyGuestContext();
      return () => {
        isMounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      void hydrateForSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrateForSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CHAT_PERSIST_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { messages?: Message[]; locale?: Locale };
      if (parsed.locale !== locale || !Array.isArray(parsed.messages) || !parsed.messages.length) return;

      setMessages(parsed.messages);
      setTypingMessageId(null);
      window.sessionStorage.removeItem(CHAT_PERSIST_KEY);
    } catch {
      // Ignore malformed persisted data.
    }
  }, [locale]);

  useEffect(() => {
    setPresetQuestions(selectRandomQuestions(locale));
  }, [locale]);
  useEffect(() => {
    setIntroTitleIndex(0);
    setTypedIntroTitle("");
    setIsDeletingIntroTitle(false);
  }, [locale]);

  useEffect(() => {
    const titles = introRotatingTitles.filter(Boolean);
    if (!titles.length) return;

    const fullTitle = titles[introTitleIndex % titles.length] || "";
    const reachedEnd = typedIntroTitle === fullTitle;
    const reachedStart = typedIntroTitle.length === 0;

    if (!isDeletingIntroTitle && reachedEnd) {
      const pauseTimer = window.setTimeout(() => {
        setIsDeletingIntroTitle(true);
      }, 2300);

      return () => {
        window.clearTimeout(pauseTimer);
      };
    }

    if (isDeletingIntroTitle && reachedStart) {
      setIsDeletingIntroTitle(false);
      setIntroTitleIndex((prev) => (prev + 1) % titles.length);
      return;
    }

    const typingDelay = isDeletingIntroTitle ? 34 : 56;
    const typingTimer = window.setTimeout(() => {
      setTypedIntroTitle((prev) =>
        isDeletingIntroTitle
          ? fullTitle.slice(0, Math.max(0, prev.length - 1))
          : fullTitle.slice(0, prev.length + 1)
      );
    }, typingDelay);

    return () => {
      window.clearTimeout(typingTimer);
    };
  }, [introRotatingTitles, introTitleIndex, isDeletingIntroTitle, typedIntroTitle]);

  const activeFollowUp = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== "assistant" || !message.followUp?.question) continue;

      const hasLaterUserMessage = messages.slice(index + 1).some((nextMessage) => nextMessage.role === "user");
      if (!hasLaterUserMessage) {
        return { messageId: message.id, prompt: message.followUp };
      }
    }

    return null;
  }, [messages]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateViewport = () => {
      setIsCompactViewport(mediaQuery.matches);
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (typingResetTimerRef.current) clearTimeout(typingResetTimerRef.current);
      if (backTimerRef.current) clearTimeout(backTimerRef.current);
      if (openRafOneRef.current !== null) cancelAnimationFrame(openRafOneRef.current);
      if (openRafTwoRef.current !== null) cancelAnimationFrame(openRafTwoRef.current);
      if (autoNudgeDelayRef.current) clearTimeout(autoNudgeDelayRef.current);
      if (autoNudgeResetRef.current) clearTimeout(autoNudgeResetRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("chat");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isCompactViewport) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isCompactViewport, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (openRafOneRef.current !== null) cancelAnimationFrame(openRafOneRef.current);
      if (openRafTwoRef.current !== null) cancelAnimationFrame(openRafTwoRef.current);

      // Force a collapse baseline first so reopening always animates, even under rapid toggles.
      setIsExpanded(false);
      setIsBackTransitioning(false);

      openRafOneRef.current = requestAnimationFrame(() => {
        openRafTwoRef.current = requestAnimationFrame(() => {
          setIsExpanded(true);
        });
      });
      return;
    }

    if (openRafOneRef.current !== null) cancelAnimationFrame(openRafOneRef.current);
    if (openRafTwoRef.current !== null) cancelAnimationFrame(openRafTwoRef.current);

    setIsExpanded(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onAfterCloseRef.current?.();
    }, 520);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || isExpanded) {
      setIsTriggerHovered(false);
      setIsAutoNudging(false);
    }
  }, [isExpanded, isOpen]);

  useEffect(() => {
    if (isCompactViewport || isOpen || isTriggerHidden) {
      if (autoNudgeDelayRef.current) {
        clearTimeout(autoNudgeDelayRef.current);
        autoNudgeDelayRef.current = null;
      }
      if (autoNudgeResetRef.current) {
        clearTimeout(autoNudgeResetRef.current);
        autoNudgeResetRef.current = null;
      }
      setIsAutoNudging(false);
      return;
    }

    let active = true;

    const scheduleNudge = (isFirstNudge: boolean) => {
      if (!active) return;

      const delayMs = isFirstNudge
        ? 15000 + Math.floor(Math.random() * 7000)
        : 26000 + Math.floor(Math.random() * 22000);

      autoNudgeDelayRef.current = setTimeout(() => {
        if (!active) return;

        setIsAutoNudging(true);

        const visibleForMs = 2600 + Math.floor(Math.random() * 1800);
        autoNudgeResetRef.current = setTimeout(() => {
          if (!active) return;
          setIsAutoNudging(false);
          scheduleNudge(false);
        }, visibleForMs);
      }, delayMs);
    };

    scheduleNudge(true);

    return () => {
      active = false;
      if (autoNudgeDelayRef.current) {
        clearTimeout(autoNudgeDelayRef.current);
        autoNudgeDelayRef.current = null;
      }
      if (autoNudgeResetRef.current) {
        clearTimeout(autoNudgeResetRef.current);
        autoNudgeResetRef.current = null;
      }
    };
  }, [isCompactViewport, isOpen, isTriggerHidden]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const frameId = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: messages.length > 0 ? "smooth" : "auto",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen || !pendingNavigation) return;

    const timer = setTimeout(() => {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }, 560);

    return () => clearTimeout(timer);
  }, [isOpen, pendingNavigation, router]);

  const handleSendMessage = async (messageText: string = input) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    const requestStartedAt = Date.now();
    setActiveTab("chat");
    setIsHistoryOpen(false);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      createdAt: Date.now(),
    };

    const nextConversation = [...messages, userMessage];
    setMessages(nextConversation);
    void persistChatSession(nextConversation);
    setInput("");
    setIsLoading(true);

    try {
      const accessToken =
        userContext.signedIn && supabase
          ? (await supabase.auth.getSession()).data.session?.access_token ?? null
          : null;

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          locale,
          pageContext:
            typeof window !== "undefined"
              ? {
                  pathname: window.location.pathname,
                  currentPerfumeSlug: window.location.pathname.startsWith("/perfumes/")
                    ? window.location.pathname.split("/").filter(Boolean)[1] ?? ""
                    : "",
                }
              : {},
          userContext,
          messages: nextConversation.map((message) => ({
            role: message.role,
            text: message.text,
            followUp: message.followUp ?? null,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("AI chat request failed");
      }

      const data = (await response.json()) as { response?: string; followUp?: unknown; actionSuggestions?: unknown };
      const remainingThinkingMs = Math.max(0, 650 - (Date.now() - requestStartedAt));
      if (remainingThinkingMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingThinkingMs));
      }
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: data.response || copy.error,
        createdAt: Date.now(),
        followUp: sanitizeFollowUpPrompt(data.followUp),
        actionSuggestions: sanitizeActionSuggestions(data.actionSuggestions),
      };
      const completedConversation = [...nextConversation, assistantMessage];
      setMessages(completedConversation);
      void persistChatSession(completedConversation);
      setTypingMessageId(assistantMessage.id);
      if (typingResetTimerRef.current) clearTimeout(typingResetTimerRef.current);
      const duration = Math.min(2600, Math.max(900, assistantMessage.text.length * 18));
      typingResetTimerRef.current = setTimeout(() => {
        setTypingMessageId((current) => (current === assistantMessage.id ? null : current));
      }, duration);
    } catch {
      const remainingThinkingMs = Math.max(0, 650 - (Date.now() - requestStartedAt));
      if (remainingThinkingMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingThinkingMs));
      }
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        text: copy.error,
        createdAt: Date.now(),
      };
      const completedConversation = [...nextConversation, errorMessage];
      setMessages(completedConversation);
      void persistChatSession(completedConversation);
      setTypingMessageId(errorMessage.id);
      if (typingResetTimerRef.current) clearTimeout(typingResetTimerRef.current);
      typingResetTimerRef.current = setTimeout(() => {
        setTypingMessageId((current) => (current === errorMessage.id ? null : current));
      }, 1200);
    } finally {
      setIsLoading(false);
    }
  };

  const executeApprovedAction = async (action: ActionSuggestion) => {
    if (actionBusyId || isLoading) return;

    if (action.type === "clear_cart") {
      const blockedMessage: Message = {
        id: `assistant-bulk-blocked-${Date.now()}`,
        role: "assistant",
        text: bulkActionBlockedLabel(locale),
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, blockedMessage]);
      return;
    }

    const sessionUserId = userContext.signedIn && supabase ? (await supabase.auth.getUser()).data.user?.id : null;
    if (!supabase || !sessionUserId) {
      const assistantMessage: Message = {
        id: `assistant-signin-${Date.now()}`,
        role: "assistant",
        text: signInRequiredActionLabel(locale),
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      return;
    }

    setActionBusyId(action.id);

    try {
      if (action.type === "add_to_wishlist") {
        const { error } = await supabase.from("wishlists").upsert(
          {
            user_id: sessionUserId,
            perfume_slug: action.perfumeSlug,
          },
          { onConflict: "user_id,perfume_slug", ignoreDuplicates: true }
        );

        if (error) throw error;
        emitWishlistUpdated();
      } else if (action.type === "remove_from_wishlist") {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", sessionUserId)
          .eq("perfume_slug", action.perfumeSlug);

        if (error) throw error;
        emitWishlistUpdated();
      } else if (action.type === "remove_from_cart") {
        const baseQuery = supabase
          .from("cart_items")
          .delete()
          .eq("user_id", sessionUserId)
          .eq("perfume_slug", action.perfumeSlug);

        const queryWithSize = Number.isFinite(Number(action.sizeMl))
          ? baseQuery.eq("size_ml", Number(action.sizeMl))
          : baseQuery;

        const { error } = await queryWithSize;
        if (error) throw error;
        emitCartUpdated();
      } else {
        const sizeMl = Number.isFinite(Number(action.sizeMl)) ? Number(action.sizeMl) : 0;
        const quantity = Number.isFinite(Number(action.quantity)) ? Math.max(1, Number(action.quantity)) : 1;
        const unitPrice = Number.isFinite(Number(action.unitPrice)) ? Number(action.unitPrice) : 0;

        const existingRes = await supabase
          .from("cart_items")
          .select("id,quantity")
          .eq("user_id", sessionUserId)
          .eq("perfume_slug", action.perfumeSlug)
          .eq("size_ml", sizeMl)
          .maybeSingle();

        if (existingRes.error) throw existingRes.error;

        if (existingRes.data?.id) {
          const nextQuantity = Math.min(50, Number(existingRes.data.quantity ?? 0) + quantity);
          const { error } = await supabase
            .from("cart_items")
            .update({ quantity: nextQuantity })
            .eq("id", existingRes.data.id)
            .eq("user_id", sessionUserId);

          if (error) throw error;
          emitCartUpdated();
        } else {
          const { error } = await supabase.from("cart_items").insert({
            user_id: sessionUserId,
            perfume_slug: action.perfumeSlug,
            size_ml: sizeMl,
            quantity,
            unit_price: unitPrice,
          });

          if (error) throw error;
          emitCartUpdated();
        }
      }

      const confirmationMessage: Message = {
        id: `assistant-action-ok-${Date.now()}`,
        role: "assistant",
        text: actionDoneLabel(locale, action.type),
        createdAt: Date.now(),
      };
      setMessages((prev) =>
        prev
          .map((msg) =>
            msg.id
              ? {
                  ...msg,
                  actionSuggestions: msg.actionSuggestions?.filter((entry) => entry.id !== action.id),
                }
              : msg
          )
          .concat(confirmationMessage)
      );
    } catch {
      const failMessage: Message = {
        id: `assistant-action-fail-${Date.now()}`,
        role: "assistant",
        text: actionFailedLabel(locale),
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, failMessage]);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSuggestionNavigate = (href: string, kind: RecommendationCard["kind"]) => {
    if (kind === "perfume") {
      try {
        window.sessionStorage.setItem(
          CHAT_PERSIST_KEY,
          JSON.stringify({ messages, locale })
        );
      } catch {
        // Ignore storage errors.
      }
    }

    setPendingNavigation(href);
    onClose();
  };

  const handleBackToHero = () => {
    if (isBackTransitioning) return;

    setIsBackTransitioning(true);
    if (backTimerRef.current) clearTimeout(backTimerRef.current);

    backTimerRef.current = setTimeout(() => {
      setMessages([]);
      setChatSessionId(null);
      setInput("");
      setIsLoading(false);
      setActiveTab("chat");
      setTypingMessageId(null);
      setIsBackTransitioning(false);

      try {
        window.sessionStorage.removeItem(CHAT_PERSIST_KEY);
      } catch {
        // Ignore storage errors.
      }
    }, 220);
  };

  const frameInset = isCompactViewport ? 12 : 24;
  const canHoverExpandTrigger = !isExpanded && !isCompactViewport;
  const isPreviewExpanded = canHoverExpandTrigger && (isTriggerHovered || isAutoNudging);
  const collapsedTriggerWidth = canHoverExpandTrigger ? (isPreviewExpanded ? 220 : 68) : 220;
  const availableWidth = `calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - ${
    frameInset * 2
  }px)`;
  const availableHeight = `calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - ${
    frameInset * 2
  }px)`;

  const panelStyle: CSSProperties = {
    width: isExpanded ? (isCompactViewport ? availableWidth : 420) : collapsedTriggerWidth,
    height: isExpanded ? (isCompactViewport ? availableHeight : 640) : 56,
    borderRadius: isExpanded ? (isCompactViewport ? 24 : 28) : 999,
    maxWidth: availableWidth,
    maxHeight: availableHeight,
    transformOrigin: "right bottom",
    boxShadow: isExpanded
      ? "0 26px 70px rgba(0,0,0,0.45), 0 10px 24px rgba(0,0,0,0.35)"
      : canHoverExpandTrigger && !isPreviewExpanded
        ? "0 8px 18px rgba(0,0,0,0.26)"
        : "0 10px 22px rgba(0,0,0,0.28)",
    transform: "translateZ(0)",
    willChange: "width, height, border-radius, transform, opacity",
    contain: "layout paint",
    transition: isExpanded
      ? "width 420ms cubic-bezier(0.22,1,0.36,1), height 420ms cubic-bezier(0.22,1,0.36,1) 180ms, border-radius 320ms ease 120ms, box-shadow 260ms ease"
      : "width 360ms cubic-bezier(0.22,1,0.36,1) 40ms, height 360ms cubic-bezier(0.22,1,0.36,1) 100ms, border-radius 280ms ease 60ms, box-shadow 240ms ease",
    right: `calc(env(safe-area-inset-right, 0px) + ${frameInset}px)`,
    bottom: `calc(env(safe-area-inset-bottom, 0px) + ${frameInset}px)`,
  };
  const composerPlaceholder =
    activeFollowUp?.prompt.allowFreeText && activeFollowUp.prompt.inputPlaceholder
      ? activeFollowUp.prompt.inputPlaceholder
      : messages.length === 0
        ? copy.askAnything
        : copy.placeholder;
  const isHeroMode = messages.length === 0;
  const showContactView = isHeroMode && activeTab === "contact";
  const showComposer = activeTab === "chat";
  const shouldUseFocusedModal = isCompactViewport;
  const shouldHideTrigger = !isExpanded && isTriggerHidden;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 ${shouldUseFocusedModal ? "bg-black/35 backdrop-blur-sm" : "bg-transparent"}`}
        onClick={shouldUseFocusedModal ? onClose : undefined}
        style={{
          opacity: isExpanded && shouldUseFocusedModal ? 1 : 0,
          transition: isExpanded ? "opacity 240ms ease-out 180ms" : "opacity 280ms ease-in",
          pointerEvents: isExpanded && shouldUseFocusedModal ? "auto" : "none",
        }}
      />

      <div
        className={`fixed z-50 overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-zinc-950 transform-gpu will-change-transform [transition:transform_640ms_cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded ? "scale-100" : isCompactViewport ? "scale-100" : "hover:scale-[1.03]"
        }`}
        onMouseEnter={canHoverExpandTrigger ? () => setIsTriggerHovered(true) : undefined}
        onMouseLeave={canHoverExpandTrigger ? () => setIsTriggerHovered(false) : undefined}
        onFocusCapture={canHoverExpandTrigger ? () => setIsTriggerHovered(true) : undefined}
        onBlurCapture={canHoverExpandTrigger ? () => setIsTriggerHovered(false) : undefined}
        style={{
          ...panelStyle,
          opacity: shouldHideTrigger ? 0 : 1,
          transform: shouldHideTrigger ? "translate3d(0, 14px, 0) scale(0.92)" : "translate3d(0, 0, 0) scale(1)",
          transition: `${panelStyle.transition}, opacity 280ms ease, transform 360ms cubic-bezier(0.22,1,0.36,1)`,
          pointerEvents: shouldHideTrigger ? "none" : "auto",
        }}
      >
        <button
          onClick={onOpen}
          className="absolute inset-0 z-40"
          style={{
            opacity: isExpanded ? 0 : 1,
            pointerEvents: isExpanded ? "none" : "auto",
          }}
          aria-label={triggerLabel || copy.title}
        />

        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center gap-2 text-white"
          style={{
            opacity: isExpanded ? 0 : 1,
            transform: isExpanded
              ? isCompactViewport
                ? "translateY(8px) scale(0.96)"
                : "translate(-104px, 236px) scale(0.9)"
              : "translate(0, 0) scale(1)",
            transition: isExpanded
              ? "opacity 300ms ease 210ms, transform 640ms cubic-bezier(0.22,1,0.36,1) 40ms"
              : "opacity 260ms ease 160ms, transform 420ms cubic-bezier(0.22,1,0.36,1) 80ms",
          }}
        >
          <AnimatedDots className={isPreviewExpanded ? "gap-1.5" : "gap-1"} />
          <span
            className="text-sm"
            style={{
              maxWidth: canHoverExpandTrigger ? (isPreviewExpanded ? 150 : 0) : 150,
              opacity: canHoverExpandTrigger ? (isPreviewExpanded ? 1 : 0) : 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              filter: isExpanded ? "blur(6px)" : "blur(0px)",
              transition: isExpanded
                ? "filter 280ms ease"
                : "filter 200ms ease, opacity 220ms ease, max-width 300ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {triggerLabel || copy.title}
          </span>
        </div>

        <div
          className="relative flex h-full flex-col overflow-hidden"
          style={{
            pointerEvents: isExpanded ? "auto" : "none",
            opacity: isExpanded ? 1 : 0,
            transform: "translateY(0)",
            willChange: "opacity, transform",
            transition: isExpanded
              ? "opacity 240ms ease 500ms"
              : "opacity 140ms ease 20ms",
          }}
        >
          {isHistoryOpen ? (
            <div
              className="relative flex h-full flex-col overflow-hidden"
              style={{
                animation: isBackTransitioning ? "chatBackOut 220ms ease forwards" : "fadeUp 220ms ease-out 30ms both",
              }}
            >
              <div className="flex items-center justify-between px-3 pt-3 sm:px-3 sm:pt-3">
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  aria-label="Back"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                    <path d="M12.79 4.23a.75.75 0 010 1.06L8.06 10l4.73 4.71a.75.75 0 11-1.06 1.06l-5.25-5.24a.75.75 0 010-1.06l5.25-5.24a.75.75 0 011.06 0z" />
                  </svg>
                </button>

                <button
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  aria-label="Close chat"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                    <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                  </svg>
                </button>
              </div>

              <div className="px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-sm font-medium text-white">{copy.historyTitle}</p>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-24 sm:px-4">
                {isHistoryLoading ? (
                  <p className="text-sm text-zinc-400">{copy.thinking}</p>
                ) : chatHistory.length === 0 ? (
                  <p className="text-sm text-zinc-400">{copy.historyEmpty}</p>
                ) : (
                  chatHistory.map((session, index) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => resumeChatSession(session)}
                      className="w-full border-b border-white/5 py-3 text-left transition hover:bg-white/[0.02]"
                      style={{
                        opacity: 0,
                        animation: `suggestionCardIn 280ms cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 60, 320)}ms forwards`,
                      }}
                    >
                      <p className="truncate text-[13px] font-medium text-zinc-100">{session.title || buildSessionTitle(session.messages, locale)}</p>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-[1.4] text-zinc-400">
                        {session.preview || buildSessionPreview(session.messages)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div
              className="relative flex h-full flex-col overflow-hidden"
              style={{
                pointerEvents: isExpanded ? "auto" : "none",
                opacity: isExpanded ? 1 : 0,
                transform: "translateY(0)",
                willChange: "opacity, transform",
                transition: isExpanded
                  ? "opacity 240ms ease 500ms"
                  : "opacity 140ms ease 20ms",
              }}
            >

          {messages.length === 0 ? (
            <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-black sm:rounded-[28px]">
              {womanVideoUrl ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: isExpanded && activeTab === "chat" ? 1 : 0,
                    transition: "opacity 320ms ease",
                    willChange: "opacity",
                  }}
                >
                  <source src={womanVideoUrl} type="video/mp4" />
                </video>
              ) : null}
              {contactVideoUrl ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: isExpanded && activeTab === "contact" ? 1 : 0,
                    transition: "opacity 320ms ease",
                    willChange: "opacity",
                  }}
                >
                  <source src={contactVideoUrl} type="video/mp4" />
                </video>
              ) : null}

              {showContactView ? (
                <>
                  <div className="absolute inset-0 bg-black/18" />
                  <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black via-black/88 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black via-black/95 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/22 to-black/92" />
              )}

              <div className="absolute left-5 top-4 z-10 flex items-center gap-3 text-[14px] sm:left-6 sm:top-5 sm:text-[15px]">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`transition ${
                    activeTab === "chat" ? "font-medium text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {copy.tabChat}
                </button>
                <button
                  onClick={() => setActiveTab("contact")}
                  className={`transition ${
                    activeTab === "contact" ? "font-medium text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {copy.tabContact}
                </button>
                {currentUserId ? (
                  <button
                    onClick={() => {
                      setIsHistoryOpen(true);
                      void loadActiveChatHistory(currentUserId);
                    }}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-[12px] text-zinc-200 transition hover:bg-white/10"
                  >
                    {copy.history}
                  </button>
                ) : null}
              </div>

              <button
                onClick={onClose}
                className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition hover:bg-zinc-800 hover:text-white sm:right-4 sm:top-4 sm:h-9 sm:w-9"
                aria-label="Close chat"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>

              {activeTab === "chat" ? (
                <div className="absolute bottom-24 left-5 right-5 z-10 sm:left-6 sm:right-6">
                  <p className="text-[13px] text-white/75">{copy.introName}</p>
                  <p className="mt-1 max-w-[95%] text-[18px] font-semibold leading-[1.1] text-white sm:max-w-[90%] sm:text-[20px] sm:leading-[1.12]">
                    {copy.introLine1}
                  </p>
                  <p className="mt-1 max-w-[95%] text-[18px] font-semibold leading-[1.1] text-white sm:max-w-[90%] sm:text-[20px] sm:leading-[1.12]">
                    {typedIntroTitle || copy.introLine2}
                    <span className="intro-type-caret ml-1 inline-block h-[0.95em] w-[2px] align-[-0.08em] bg-white/80" />
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {presetQuestions.map((question, index) => {
                      const buttonClassName =
                        index === 0
                          ? "rounded-full bg-white px-3 py-2 text-[11px] font-medium text-black transition hover:bg-zinc-100 sm:px-4 sm:text-[12px]"
                          : index === 1
                            ? "rounded-full bg-zinc-700/90 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-zinc-600 sm:px-4 sm:text-[12px]"
                            : "rounded-full bg-zinc-800/90 px-3 py-2 text-[11px] font-medium text-zinc-200 transition hover:bg-zinc-700 sm:px-4 sm:text-[12px]";

                      return (
                        <button
                          key={`${question}-${index}`}
                          onClick={() => handleSendMessage(question)}
                          className={buttonClassName}
                        >
                          {question}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <ContactPanel copy={copy} />
              )}

            </div>
          ) : (
            <>
              <div
                className="flex items-center justify-between px-3 pt-3 sm:px-3 sm:pt-3"
                style={{
                  animation: isBackTransitioning
                    ? "chatBackOut 220ms ease forwards"
                    : "fadeUp 220ms ease-out 30ms both",
                }}
              >
                <button
                  onClick={handleBackToHero}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition-all duration-300 ease-out hover:bg-zinc-800 hover:text-white active:scale-95 ${
                    isBackTransitioning ? "pointer-events-none scale-90 opacity-0" : "scale-100 opacity-100"
                  }`}
                  aria-label="Back"
                >
                  <svg
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 transition-transform duration-300 ${
                      isBackTransitioning ? "-translate-x-1" : "translate-x-0"
                    }`}
                    fill="currentColor"
                  >
                    <path d="M12.79 4.23a.75.75 0 010 1.06L8.06 10l4.73 4.71a.75.75 0 11-1.06 1.06l-5.25-5.24a.75.75 0 010-1.06l5.25-5.24a.75.75 0 011.06 0z" />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  {currentUserId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(true);
                        void loadActiveChatHistory(currentUserId);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                      aria-label="Chat history"
                      title="Chat history"
                    >
                      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                        <path d="M10.5 1.5H4.75A2.25 2.25 0 002.5 3.75v12.5A2.25 2.25 0 004.75 18.5h10.5a2.25 2.25 0 002.25-2.25V6.75m-15-2h10m-10 4h10m-10 4h7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ) : null}

                  <button
                    onClick={onClose}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                    aria-label="Close chat"
                  >
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                      <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-24 pt-3 sm:space-y-4 sm:px-4 sm:pb-28 sm:pt-4"
                style={{
                  animation: isBackTransitioning
                    ? "chatBackOut 220ms ease forwards"
                    : "chatDrop 260ms ease-out 60ms both",
                  scrollbarGutter: "stable",
                }}
              >
                {messages.map((message) => (
                  <div key={message.id} className="space-y-1" style={{ animation: "fadeUp 220ms ease-out" }}>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{message.role === "user" ? getUserMessageLabel(locale) : copy.introName}</span>
                      <span className="text-[11px] text-zinc-500">{formatMessageTime(message.createdAt, locale)}</span>
                    </div>
                    <div
                      className={`text-[15px] leading-[1.45] ${message.role === "user" ? "text-zinc-200" : "text-zinc-100"}`}
                    >
                      {message.role === "assistant" ? (
                        <>
                          {message.text.trim() ? (
                            <AnimatedAssistantText
                              text={message.text}
                              animate={typingMessageId === message.id && !isLoading}
                              onCardClick={handleSuggestionNavigate}
                            />
                          ) : null}
                          {activeFollowUp?.messageId === message.id ? (
                            <FollowUpPromptView
                              prompt={activeFollowUp.prompt}
                              disabled={isLoading}
                              onOptionSelect={(option) => {
                                if (isLoading) return;
                                handleSendMessage(option);
                              }}
                            />
                          ) : null}
                          {message.actionSuggestions?.length ? (
                            <div className="mt-3 space-y-2">
                              {message.actionSuggestions.map((action) => (
                                <div key={action.id} className="rounded-xl border border-white/15 bg-white/[0.04] p-3">
                                  <p className="text-[13px] leading-[1.4] text-zinc-200">{action.reason}</p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={Boolean(actionBusyId) || isLoading}
                                      onClick={() => {
                                        void executeApprovedAction(action);
                                      }}
                                      className="rounded-full border border-zinc-200/75 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {actionApproveLabel(locale, action.type)}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                ))}

                {isLoading ? (
                  <div className="space-y-2" style={{ animation: "fadeUp 220ms ease-out" }}>
                    <div className="text-sm text-zinc-300">{copy.introName}</div>
                    <ThinkingIndicator label={copy.thinking} />
                  </div>
                ) : null}
              </div>
            </>
          )}
            </div>
          )}

          {showComposer ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black via-black/96 to-transparent sm:h-28" />

              <div
                className="absolute bottom-4 left-4 right-4 z-20 sm:bottom-5 sm:left-5 sm:right-5"
                style={{
                  opacity: isExpanded ? 1 : 0,
                  transform: isExpanded ? "translateY(0) scale(1)" : "translateY(0) scale(0.97)",
                  filter: isExpanded ? "blur(0px)" : "blur(6px)",
                  transition: isExpanded
                    ? "opacity 240ms ease 520ms, transform 360ms cubic-bezier(0.22,1,0.36,1) 480ms, filter 280ms ease 500ms"
                    : "opacity 280ms ease 30ms, transform 420ms cubic-bezier(0.22,1,0.36,1) 20ms, filter 300ms ease 20ms",
                }}
              >
                <div className="flex items-center gap-3 px-1 py-1 text-white/80">
                  <AnimatedDots />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isLoading) {
                        handleSendMessage();
                      }
                    }}
                    placeholder={composerPlaceholder}
                    className="w-full bg-transparent text-[13px] text-zinc-300 outline-none placeholder:text-zinc-400 sm:text-[12px]"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes chatDrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes suggestionCardIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes chatBackOut {
          from {
            opacity: 1;

        .intro-type-caret {
          animation: introCaretBlink 1.45s ease-in-out infinite;
        }

        @keyframes introCaretBlink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(8px);
          }
        }

        @keyframes thinkingShimmer {
          from {
            background-position: 200% 0;
          }
          to {
            background-position: -20% 0;
          }
        }
      `}</style>
    </>
  );
}
