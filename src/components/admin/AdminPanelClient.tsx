"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  Suspense,
} from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  TrendUp,
  ArrowsClockwise,
  CheckCircle,
  ClockCounterClockwise,
  CopySimple,
  Database,
  DownloadSimple,
  FloppyDisk,
  Bell,
  ImageSquare,
  Link,
  MagnifyingGlass,
  NotePencil,
  Package,
  Plus,
  Rows,
  CaretLeft,
  CaretRight,
  SignOut,
  Sparkle,
  SquaresFour,
  Tag,
  TextT,
  Trash,
  UploadSimple,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";

import {
  DEFAULT_SITE_NAME,
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
  normalizeKeywordList,
  normalizeSiteSettings,
  getPromotionLinkLabelForLocale,
  getPromotionTextForLocale,
  type SiteHomeHeaderSettings,
  type SiteHomeHeaderSlide,
  type SitePromotionLocale,
  type SitePromotionSettings,
  type SitePromotionTextMap,
  type SiteSettings,
} from "@/lib/site-branding";
import {
  DEFAULT_SITE_META_KEYWORD_COUNT,
  resolveSiteMetaKeywords,
} from "@/lib/seo";
import {
  addDiscountDuration,
  formatDiscountDeadlineLabel,
  normalizePerfumeDiscount,
  resolveDiscountedSizePrice,
  toDateInputValue,
} from "@/lib/discounts";
import { DEFAULT_PROMOTION_SETTINGS } from "@/lib/promotions";
import type { Note, Perfume, PerfumeDiscount, PerfumeSize } from "@/types/catalog";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminCommandCenter } from "@/components/admin/AdminCommandCenter";
import { AiChatInsights } from "@/components/admin/AiChatInsights";
import { QoxunuInsights } from "@/components/admin/QoxunuInsights";
import { BrandSelector } from "@/components/admin/BrandSelector";
import { SaveStatusPill } from "@/components/admin/SaveStatusPill";
import { normalizeSearchText, tokenizeSearch } from "@/lib/search-normalize";

type AdminPanelClientProps = {
  configured: boolean;
  initialAuthenticated: boolean;
  initialPerfumesJson: string;
  initialNotesJson: string;
  initialSettingsJson: string;
};

type PerfumeDraft = Perfume & { mediaScale?: number; mediaScaleByDevice?: { mobile?: number; laptop?: number; monitor?: number } };
type NoteDraft = Note;
type SiteSettingsDraft = SiteSettings;
type AdminLocale = "az" | "en";
type PromotionCopyPreset = {
  id: string;
  label: Record<SitePromotionLocale, string>;
  text: Record<SitePromotionLocale, string>;
};
type StatusTone = "success" | "error" | "neutral";
type StatusState = {
  tone: StatusTone;
  message: string;
};
type SaveStatusState = {
  tone: "idle" | "saving" | "success" | "error";
  message: string;
};
type PerfumeEditorTab = "basics" | "notes" | "discounts" | "media";
type NoteEditorTab = "content" | "media";
type PerfumeListFilter = "all" | "missingImage" | "missingNotes";
type NoteListFilter = "all" | "linked" | "unlinked" | "missingImage";
type PromoAnalyticsState = {
  totalClicks: number;
  uniqueClickers: number;
  topPromos: Array<{
    promoKey: string;
    promoLabel?: string;
    promoTarget?: string;
    clicks: number;
    uniqueUsers: number;
    uniqueSessions: number;
    lastClickedAt?: string | null;
  }>;
  recentClicks: Array<{
    sessionId: string;
    createdAt: string;
    userEmail?: string | null;
    userId?: string | null;
    anonymousId?: string | null;
    promoKey: string;
    promoLabel?: string | null;
    country?: string | null;
    city?: string | null;
    deviceType?: string | null;
    browser?: string | null;
  }>;
};
type AdminView = "dashboard" | "assistant" | "aiChat" | "qoxunuLogs" | "perfumes" | "notes" | "brands" | "branding" | "header" | "promotions";
const ui = {
  shell:
    "overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl",
  card:
    "rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_48px_rgba(15,23,42,0.05)] sm:p-6",
  soft:
    "rounded-[20px] border border-[#E5E7EB] bg-[#FCFCFD] shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
  input:
    "h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-3.5 text-sm text-zinc-900 outline-none transition duration-200 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10",
  textarea:
    "w-full rounded-[12px] border border-[#E5E7EB] bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition duration-200 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10",
  primaryButton:
    "inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(99,102,241,0.22)] transition duration-200 hover:-translate-y-[1px] hover:bg-indigo-500 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55",
  secondaryButton:
    "inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-zinc-700 transition duration-200 hover:-translate-y-[1px] hover:border-[#D1D5DB] hover:bg-zinc-50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55",
  compactButton:
    "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white px-3.5 text-sm font-semibold text-zinc-700 transition duration-200 hover:-translate-y-[1px] hover:border-[#D1D5DB] hover:bg-zinc-50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55",
  compactPrimaryButton:
    "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(99,102,241,0.2)] transition duration-200 hover:-translate-y-[1px] hover:bg-indigo-500 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55",
  dangerButton:
    "inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition duration-200 hover:-translate-y-[1px] hover:border-red-300 hover:bg-red-100 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55",
  tab:
    "inline-flex h-10 items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition duration-200",
  chip:
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
  compactChip:
    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const ADMIN_LOCALE_STORAGE_KEY = "perfoumer-admin-locale";

const DEFAULT_PERFUME_DISCOUNT: PerfumeDiscount = {
  enabled: false,
  mode: "percent",
  value: 10,
  scope: { kind: "all" },
  deadline: { kind: "none" },
  showDeadline: false,
};

function getDefaultDiscount(): PerfumeDiscount {
  return cloneDeep(DEFAULT_PERFUME_DISCOUNT);
}

function getDefaultPromotionSettings(): SitePromotionSettings {
  return cloneDeep(DEFAULT_PROMOTION_SETTINGS);
}

function toDateTimeLocalInputValue(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function mapAdminLocaleToCopyLocale(locale: AdminLocale) {
  return locale === "az" ? "az" : "en";
}

function adminText(locale: AdminLocale, az: string, en: string) {
  return locale === "az" ? az : en;
}

const PROMOTION_LOCALES: SitePromotionLocale[] = ["az", "en", "ru"];

const PROMOTION_COPY_PRESETS: PromotionCopyPreset[] = [
  {
    id: "spotlight",
    label: {
      az: "Spotlight",
      en: "Spotlight",
      ru: "Spotlight",
    },
    text: {
      az: "{perfumes} indi endirimdədir. Sevdiyiniz ətri seçin və fürsəti qaçırmayın.",
      en: "{perfumes} are on sale now. Pick your signature scent before the offer ends.",
      ru: "{perfumes} сейчас со скидкой. Выберите свой аромат, пока действует предложение.",
    },
  },
  {
    id: "limited",
    label: {
      az: "Limited",
      en: "Limited",
      ru: "Limited",
    },
    text: {
      az: "Məhdud vaxt üçün {count} seçilmiş ətir xüsusi qiymətlərlə təqdim olunur.",
      en: "For a limited time, {count} selected perfumes are available at special prices.",
      ru: "Только ограниченное время {count} выбранных ароматов доступны по специальной цене.",
    },
  },
  {
    id: "gift",
    label: {
      az: "Gift",
      en: "Gift",
      ru: "Gift",
    },
    text: {
      az: "{perfumes} ilə yeni favoritini tap. Bu seçimlər indi daha sərfəlidir.",
      en: "Find your next favorite with {perfumes}. These picks are now priced better.",
      ru: "Найдите новый фаворит с {perfumes}. Эти варианты сейчас выгоднее.",
    },
  },
];

function formatPromotionPerfumeNames(perfumes: Perfume[], locale: SitePromotionLocale) {
  if (!perfumes.length) {
    return "";
  }

  const localizedNames = perfumes.slice(0, 3).map((item) => `${item.brand} ${item.name}`.trim());
  const remainingCount = Math.max(0, perfumes.length - localizedNames.length);
  if (remainingCount > 0) {
    if (locale === "az") {
      localizedNames.push(`və daha ${remainingCount} ətir`);
    } else if (locale === "ru") {
      localizedNames.push(`и еще ${remainingCount} аромат`);
    } else {
      localizedNames.push(`and ${remainingCount} more perfumes`);
    }
  }

  const listFormatter = new Intl.ListFormat(locale === "az" ? "az-AZ" : locale === "ru" ? "ru-RU" : "en-US", {
    style: "long",
    type: "conjunction",
  });

  return listFormatter.format(localizedNames);
}

function formatPromotionPerfumeIds(perfumes: Perfume[]) {
  return perfumes.map((item) => `#${item.id}`).join(", ");
}

function buildPromotionTemplateText(
  template: string,
  perfumes: Perfume[],
  locale: SitePromotionLocale,
) {
  const perfumeNames = formatPromotionPerfumeNames(perfumes, locale);
  const perfumeIds = formatPromotionPerfumeIds(perfumes);
  return template
    .replaceAll("{perfumes}", perfumeNames)
    .replaceAll("{count}", String(perfumes.length))
    .replaceAll("{ids}", perfumeIds);
}

function buildPromotionDiscountCopy(perfumes: Perfume[], locale: SitePromotionLocale) {
  const primaryPerfume = perfumes[0] ?? null;
  const copyLocale = locale;
  const deadlineLabel = primaryPerfume
    ? formatDiscountDeadlineLabel(primaryPerfume.discount, copyLocale)
    : null;
  const perfumeNames = formatPromotionPerfumeNames(perfumes, copyLocale);

  const textByLocale = {
    az: perfumes.length > 1
      ? `${perfumeNames} endirimdədir${deadlineLabel ? ` — ${deadlineLabel}` : ""}`
      : `${perfumeNames} endirimdədir${deadlineLabel ? ` — ${deadlineLabel}` : ""}`,
    en: perfumes.length > 1
      ? `${perfumeNames} are on discount${deadlineLabel ? ` — ${deadlineLabel}` : ""}`
      : `${perfumeNames} is on discount${deadlineLabel ? ` — ${deadlineLabel}` : ""}`,
    ru: perfumes.length > 1
      ? `${perfumeNames} со скидкой${deadlineLabel ? ` — ${deadlineLabel}` : ""}`
      : `${perfumeNames} со скидкой${deadlineLabel ? ` — ${deadlineLabel}` : ""}`,
  };

  return {
    textByLocale,
    linkHref: perfumes.length > 1 ? "/offers" : primaryPerfume ? `/perfumes/${primaryPerfume.slug}` : "/offers",
    linkLabel: locale === "az" ? "Endirimi gör" : locale === "ru" ? "Смотреть предложение" : "View offer",
    linkLabelByLocale: {
      az: "Endirimi gör",
      en: "View offer",
      ru: "Смотреть предложение",
    },
    sourcePerfumeSlugs: perfumes.map((item) => item.slug),
  };
}

const adminCopy = {
  az: {
    localeLabel: "Dil seçimi",
    adminWorkspace: "İdarəetmə Paneli",
    professionalWorkspace: "Satış və Məzmun İdarəetməsi",
    notEnabledTitle: "Admin panel aktiv deyil",
    notEnabledDescription:
      "Mühit dəyişənlərində `ADMIN_PASSWORD` təyin edin, tətbiqi yenidən başladın və panel açılacaq.",
    loginHeroTitle:
      "Ətirləri, notları, şəkilləri və CSV əməliyyatlarını idarə etmək üçün daha çevik iş sahəsi.",
    loginHeroDescription:
      "Strukturlaşdırılmış redaktorlar, şəkil yükləmə, CSV import/export və daha təmiz admin axını üçün daxil olun.",
    loginTitle: "Admin giriş",
    loginDescription: "İş sahəsinə daxil olmaq üçün admin şifrənizi istifadə edin.",
    username: "İstifadəçi adı",
    password: "Şifrə",
    enterWorkspace: "İş sahəsinə daxil ol",
    signingIn: "Daxil olunur...",
    editing: "Redaktə",
    assets: "Media",
    bulkOps: "Kütləvi əməliyyat",
    twoDatasets: "2 dataset",
    perfumesAndNotesOneView: "Ətirlər və notlar bir paneldə",
    mediaReady: "Media hazırdır",
    uploadDirect: "Şəkilləri birbaşa paneldən yüklə",
    csvImport: "CSV import",
    moveDataFast: "Məlumatları sürətli içəri və çölə daşı",
    heroTitle: "Stok və notları bir yerdən idarə edin.",
    heroDescription: "Axtar, düzəlt, yüklə və saxla.",
    unsavedChanges: "Saxlanmamış dəyişikliklər",
    everythingSaved: "Bütün dəyişikliklər saxlanıb",
    refresh: "Yenilə",
    reset: "Sıfırla",
    saveChanges: "Dəyişiklikləri saxla",
    saving: "Saxlanılır...",
    logout: "Çıxış",
    dashboard: "İnformasiya Paneli",
    aiChat: "AI chat",
    aiChatDescription:
      "Guest və giriş etmiş AI chat sessiyalarını, location məlumatını və tam yazışmaları bir paneldə izləyin.",
    qoxunuLogs: "Qoxunu logları",
    qoxunuLogsDescription:
      "Qoxunu testini tamamlayan guest və giriş etmiş istifadəçilərin cavablarını, location məlumatını və son nəticələri izləyin.",
    perfumes: "Ətirlər",
    notes: "Notlar",
    linkedNotes: "Bağlı notlar",
    visibleInSearch: "Axtarışda {count} qeyd görünür",
    linkedNoteDetail: "Ətirlərdə istifadə olunan fərqli not sayı",
    assetCoverage: "Şəkli olan qeydlər",
    dataOperations: "Məlumat əməliyyatları",
    dataOperationsDescription:
      "Strukturlaşdırılmış məlumatı iş sahəsindən çıxmadan import və export edin.",
    branding: "Brendinq",
    brandingDescription:
      "Saytın başlığını və admin paneldə görünən əsas brend adını bir yerdən dəyişin.",
    header: "Ana başlıq",
    headerDescription:
      "Başlığı video CTA ilə və ya seçilmiş qoxuların dəyişən paneli ilə idarə edin.",
    headerPreview: "Başlıq önizləməsi",
    headerPreviewDetail:
      "Video rejimi və ya dəyişən ətir başlığı seçin, sonra dəyişikliyi bazaya saxlayın.",
    headerMode: "Başlıq rejimi",
    headerModeVideo: "Video CTA",
    headerModeRotating: "Dönən ətirlər",
    headerVideoUrl: "Video URL",
    headerVideoTitle: "Video başlığı",
    headerVideoDescription: "Video təsviri",
    headerVideoCtaLabel: "CTA yazısı",
    headerVideoCtaHref: "CTA keçidi",
    headerVideoPreview: "Video önizləməsi",
    headerTranslate: "AI tərcümə",
    headerTranslateWorking: "Tərcümə hazırlanır...",
    headerTranslateDone: "Başlıq tərcümələri yeniləndi.",
    headerTranslateFailed: "Tərcümə alınmadı.",
    headerTranslateNeedText: "Əvvəlcə başlıq, təsvir və ya CTA əlavə edin.",
    headerTranslations: "Başlıq tərcümələri",
    headerTranslationsHint: "Hər dil üçün ayrıca başlıq, təsvir və CTA əlavə edin və ya AI ilə tərcümə edin.",
    headerRotatingMode: "Dönən rejim",
    headerRandomMode: "Təsadüfi ətirlər",
    headerSelectedMode: "Seçilmiş ətirlər",
    headerSlides: "Seçilmiş slaydlar",
    headerAddSlide: "Slayd əlavə et",
    headerSlidePerfume: "Ətir seç",
    headerSlideSearchPlaceholder: "Brend və ya adla axtar",
    headerSlideSearchHint: "Şəkilli kartdan seçin, slug avtomatik doldurulsun.",
    headerSlideSelected: "Seçilmiş ətir",
    headerSlideChoose: "Seç",
    headerSlideClear: "Təmizlə",
    headerSlideButtonLabel: "Düymə yazısı",
    headerSlideDescription: "Təsvir",
    headerSlideRemove: "Sil",
    promotions: "Promosiyalar",
    promotionsDescription:
      "Yuxarıda axan, rənglənən və bağlana bilən promo banneri buradan idarə edin.",
    promotionsPreview: "Banner önizləməsi",
    promotionsPreviewDetail:
      "Müştərilərin saytın yuxarısında görəcəyi promosyon mesajını, sürəti və rəngini seçin.",
    promotionsEnable: "Promo banneri aktiv et",
    promotionsEnableHint: "Söndürüləndə banner saytın heç bir yerində görünməyəcək.",
    promotionsEnabled: "Aktiv",
    promotionsDisabled: "Söndürülüb",
    promotionsYes: "Bəli",
    promotionsNo: "Xeyr",
    promotionsMode: "Banner növü",
    promotionsManual: "Manual mətn",
    promotionsDiscount: "Endirim seçimi",
    promotionsText: "Banner mətni",
    promotionsTextHint: "Qısa və aydın mətn daha yaxşı oxunur.",
    promotionsLinkHref: "Banner linki",
    promotionsLinkHrefHint: "Bannerin və ya onun mətninin yönələcəyi keçid.",
    promotionsLinkLabel: "Link etiketi",
    promotionsLinkLabelHint: "Sağ tərəfdə görünəcək düymə yazısı.",
    promotionsSelectPerfume: "Ətir seçin",
    promotionsNoLink: "Hələ link seçilməyib",
    promotionsBackgroundColor: "Arxa fon rəngi",
    promotionsTextColor: "Mətn rəngi",
    promotionsSpeed: "Yazı sürəti",
    promotionsSpeedHint: "Kiçik dəyər daha sürətli hərəkət deməkdir.",
    promotionsClosable: "İstifadəçi bağlaya bilər",
    promotionsClosableHint: "Söndürüləndə banneri bağlama düyməsi gizlənir.",
    promotionsSourcePerfume: "Endirim mənbəyi",
    promotionsSourcePerfumeHint:
      "Endirim rejimində olan ətri seçin və mətn avtomatik təklif olunsun.",
    promotionsGenerate: "Təklif mətni yarat",
    promotionsTranslate: "AI tərcümə",
    promotionsTranslateHint: "Hazır mətni bütün dillərə səliqəli şəkildə çevir.",
    promotionsTranslateWorking: "Tərcümə hazırlanır...",
    promotionsTranslateDone: "Promo mətnləri yeniləndi.",
    promotionsTranslateFailed: "Tərcümə alınmadı.",
    promotionsTranslateNeedText: "Əvvəlcə promo mətni və ya link etiketi əlavə edin.",
    promotionsReset: "Defaulta qaytar",
    promotionsOpenLink: "Banner keçidi",
    siteName: "Sayt adı",
    siteNameHint:
      "Bu ad sayt başlığında və admin paneldə əsas brend adı kimi istifadə olunur.",
    siteDomain: "Sayt domen mətnı",
    siteDomainHint:
      "Mətn daxilində görünən domen adı. Məsələn: brand.az",
    siteTitle: "Default meta title",
    siteDescription: "Default meta description",
    metaKeywords: "Meta keywords",
    metaKeywordsHint:
      "Açar sözləri vergüllə ayırın. Boş olduqda sistem güclü standart siyahını istifadə edir.",
    metaKeywordsCount:
      "Hazırda metadata üçün {count} açar söz istifadə olunur.",
    openGraphTitle: "Open Graph title",
    openGraphDescription: "Open Graph description",
    twitterTitle: "Twitter title",
    twitterDescription: "Twitter description",
    brandingPreview: "Önizləmə",
    brandingPreviewDetail: "Brauzer başlığında və admin iş sahəsində belə görünəcək.",
    exportPerfumesCsv: "Ətirləri CSV export et",
    exportNotesCsv: "Notları CSV export et",
    importPerfumesCsv: "Ətir CSV import et",
    importNotesCsv: "Not CSV import et",
    importingPerfumes: "Ətirlər import olunur...",
    importingNotes: "Notlar import olunur...",
    workspaceRecords: "İş sahəsi qeydləri",
    workspaceRecordsDescription:
      "Datasetləri dəyişin, sürətli axtarın və səhifə yenilənmədən qeydlər arasında keçin.",
    searchPerfumes: "Ətir axtar...",
    searchNotes: "Not axtar...",
    addPerfume: "Ətir əlavə et",
    duplicate: "Kopyala",
    delete: "Sil",
    addNote: "Not əlavə et",
    perfumeList: "Ətir siyahısı",
    noteList: "Not siyahısı",
    all: "Hamısı",
    missingImage: "Şəkilsiz",
    missingNotes: "Notsuz",
    outOfStock: "Stokda yoxdur",
    linked: "Bağlı",
    unlinked: "Bağsız",
    recordsShown: "{shown}/{total} göstərilir",
    updating: "yenilənir",
    noPerfumesFound: "Ətir tapılmadı",
    noPerfumesFoundDescription:
      "Axtarışı dəyişin və ya yeni ətir draftı yaradın.",
    noNotesFound: "Not tapılmadı",
    noNotesFoundDescription:
      "Daha geniş axtarış edin və ya yeni not draftı yaradın.",
    perfumeEditor: "Ətir redaktoru",
    noteEditor: "Not redaktoru",
    copySlug: "Slug kopyala",
    copyImageUrl: "Şəkil URL-ni kopyala",
    basics: "Əsas",
    perfumeNotes: "Notlar",
    media: "Media",
    discounts: "Endirimlər",
    discountControls: "Endirim idarəsi",
    discountControlsDescription:
      "Bütün ölçülərə, bir ölçüyə və ya seçilmiş ölçülərə endirim təyin edin. Vaxtı bitən endirimlər vitrində avtomatik dayanır.",
    discountActive: "Endirim aktivdir",
    discountActiveHint: "Təklifi aktiv edin və ya draft kimi saxlayın.",
    discountType: "Endirim tipi",
    discountPercentOption: "Faizlə endirim",
    discountFixedOption: "Yeni aşağı qiymət",
    discountNewSalePrice: "Yeni endirim qiyməti",
    discountPercentage: "Faiz",
    discountFixedHint: "Uyğun ölçülər üçün müştərinin görəcəyi final qiymət.",
    discountPercentHint: "Məsələn: 20 yazsanız 20% endirim olacaq.",
    discountAppliesTo: "Tətbiq olunur",
    discountAllSizes: "Bütün ölçülər",
    discountOneSize: "Bir ölçü",
    discountCustomSizes: "Seçilmiş ölçülər",
    discountedSize: "Endirimli ölçü",
    discountDeadline: "Bitmə vaxtı",
    discountNoDeadline: "Vaxt limiti yoxdur",
    discountCustomDate: "Xüsusi tarix",
    discountCustomDuration: "Gün / həftə / ay ilə",
    discountEndOfMonth: "Bu ayın sonu",
    discountEndsOn: "Bitir",
    discountDurationAmount: "Müddət sayı",
    discountDurationUnit: "Müddət vahidi",
    discountDays: "Gün",
    discountWeeks: "Həftə",
    discountMonths: "Ay",
    discountStartsOn: "Başlayır",
    discountComputedEndDate: "Hesablanmış bitmə tarixi",
    discountShowDeadline: "Bitmə vaxtını müştəriyə göstər",
    discountShowDeadlineHint: "Məhsul səhifəsində endirimin nə vaxta qədər davam etdiyini göstərir.",
    discountCustomSizePicker: "Seçilmiş endirim ölçüləri",
    discountPreview: "Vitrin önizləməsi",
    discountPreviewDescription:
      "Əsas qiymətlər ölçü cədvəlində qalır. Endirim aktiv olduqda müştərilər bu qiymətləri görür.",
    discountNoSavings: "Endirim yoxdur",
    coreDetails: "Əsas məlumatlar",
    coreDetailsDescription:
      "Kataloqda görünən əsas məlumatları vahid və səliqəli saxlayın.",
    perfumeName: "Ətir adı",
    brand: "Brend",
    slug: "Slug",
    slugHint: "Saytda istifadə olunan kiçik hərf URL açarı",
    gender: "Cins",
    stockStatus: "Stok statusu",
    inventoryFlag: "Stok göstəricisi",
    inStock: "Stokda var",
    outStock: "Stokda yoxdur",
    externalLink: "Xarici keçid",
    sizeMatrix: "Ölçü cədvəli",
    sizeMatrixDescription: "Satış ölçülərini və qiymətləri bir siyahıda saxlayın.",
    addSize: "Ölçü əlavə et",
    label: "Etiket",
    ml: "ML",
    price: "Qiymət",
    remove: "Sil",
    topNotes: "Üst notlar",
    heartNotes: "Ürək notları",
    baseNotes: "Baza notları",
    attachNotesDetail: "{group} qatını qurmaq üçün not slug-ları əlavə edin.",
    noLinkedGroupNotes: "{group} üçün hələ not bağlanmayıb.",
    addNoteSlug: "Not slug əlavə et",
    existingSlugs: "{count} mövcud not slug seçimi",
    addLinkedNote: "Not əlavə et",
    mediaQuickActions: "Sürətli media əməliyyatları",
    uploadImage: "Şəkil yüklə",
    replaceImage: "Şəkli yenilə",
    uploading: "Yüklənir...",
    uploadImageGuidance: "Accepted: PNG, JPG, JPEG, WebP. Max size: 8 MB.",
    imageMetadata: "Şəkil məlumatı",
    imageMetadataDescription:
      "Yüklənmiş şəkilin keçidini və alt mətnini idarə edin.",
    imageUrl: "Şəkil URL",
    imageAlt: "Şəkil alt mətni",
    openProductPage: "Məhsul səhifəsini aç",
    productPageHint: "Bu ətrin canlı məhsul səhifəsinə tam keçid.",
    uploadPerfumePreview: "Ətir şəkli yükləyin, önizləmə burada görünəcək.",
    uploadNotePreview: "Not şəkli yükləyin, önizləmə burada görünəcək.",
    noteContent: "Not məzmunu",
    noteContentDescription:
      "Not adı və təsvirini sayt boyu istifadə üçün redaktə edin.",
    noteName: "Not adı",
    content: "Məzmun",
    usageMap: "İstifadə xəritəsi",
    usageMapDescription: "Bu notu istifadə edən ətirlər.",
    noLinkedPerfumes: "Bağlı ətir yoxdur",
    noLinkedPerfumesDescription:
      "Bu notu ətir redaktorunun notlar bölməsindən əlavə edin.",
    noPerfumeSelected: "Ətir seçilməyib",
    noPerfumeSelectedDescription:
      "Siyahıdan ətir seçin və ya yenisini yaradın.",
    noNoteSelected: "Not seçilməyib",
    noNoteSelectedDescription:
      "Siyahıdan not seçin və ya yenisini yaradın.",
    statusNoValueToCopy: "{label} üçün kopyalanacaq dəyər yoxdur.",
    statusCopied: "{label} kopyalandı.",
    statusCopyFailed: "{label} kopyalanmadı.",
    statusNewPerfumeCreated: "Yeni ətir draftı yaradıldı.",
    statusPerfumeDuplicated: "Ətir yeni draft kimi kopyalandı.",
    statusPerfumeRemoved: "Ətir iş sahəsindən silindi.",
    statusNewNoteCreated: "Yeni not draftı yaradıldı.",
    statusNoteDuplicated: "Not yeni draft kimi kopyalandı.",
    statusNoteRemoved: "Not iş sahəsindən silindi.",
    statusWorkspaceReset: "İş sahəsi son saxlanmış vəziyyətə qaytarıldı.",
    statusUploadingPerfumeImage: "Ətir şəkli yüklənir...",
    statusPerfumeImageUploaded: "Ətir şəkli yükləndi.",
    statusUploadingNoteImage: "Not şəkli yüklənir...",
    statusNoteImageUploaded: "Not şəkli yükləndi.",
    statusWorkspaceReady: "Admin iş sahəsi hazırdır.",
    statusLoginFailed: "Giriş sorğusu uğursuz oldu. Yenidən yoxlayın.",
    statusClosingSession: "Admin sessiyası bağlanır...",
    statusLoggedOut: "Çıxış edildi.",
    statusLogoutFailed: "Çıxış alınmadı. Yenidən cəhd edin.",
    statusRefreshing: "Saxlanmış admin məlumatları yenilənir...",
    statusRefreshFailed: "Yeniləmə alınmadı.",
    statusWorkspaceSynced: "İş sahəsi saxlanmış admin məlumatları ilə sinxronlaşdırıldı.",
    statusAlreadySaved: "Bütün dəyişikliklər artıq saxlanılıb.",
    statusSaving: "Dəyişikliklər saxlanılır və səhifələr yenilənir...",
    statusSaveFailed: "Saxlama uğursuz oldu.",
    statusSaved: "Uğurla saxlanıldı. İctimai səhifələr yeniləndi.",
    statusPreparingExport: "{type} CSV export hazırlanır...",
    statusExportFailed: "Export sorğusu uğursuz oldu.",
    statusExportedPerfumes: "Ətir CSV export edildi.",
    statusExportedNotes: "Not CSV export edildi.",
    statusImportingCsv: "{type} CSV import olunur...",
    statusImportFailed: "Import sorğusu uğursuz oldu.",
    statusImportedPerfumes: "Ətir CSV import edildi.",
    statusImportedNotes: "Not CSV import edildi.",
    confirmReload: "Yeniləmə saxlanmamış dəyişiklikləri siləcək. Davam edilsin?",
    confirmDeletePerfume: '"{name}" ətiri silinsin?',
    confirmDeleteNote: '"{name}" notu silinsin?',
    loginFailed: "Giriş alınmadı.",
    refreshFailed: "Yeniləmə alınmadı.",
    saveFailed: "Saxlama uğursuz oldu.",
    exportFailed: "Export alınmadı.",
    importFailed: "CSV import uğursuz oldu.",
    uploadFailed: "Yükləmə uğursuz oldu.",
    loggedInDataFailed: "Giriş edildi, amma admin məlumatları yüklənmədi.",
    usePassword: "İş sahəsinə daxil olmaq üçün admin şifrənizi istifadə edin.",
    assetCoverageDetail: "{count} qeyd şəkillə tamamlanıb",
    perfumeMetaFallback: "Brend və cins hələ əlavə edilməyib",
    noPricing: "Qiymət yoxdur",
    fromPrice: "{price} AZN-dən",
    usedByPerfumes: "{count} ətirdə istifadə olunur",
    noteLinksCount: "{count} not bağlantısı",
    sizeCount: "{count} ölçü",
    removeBg: "Fonu Sil",
    removeBgTooltip: "Şəkillərdən (adətən çəhrayı) fonu qaldırın",
    removeBgProcessing: "Fon silinir...",
    removeBgSuccess: "Fon uğurla silindi",
    removeBgError: "Fon silmə xətası",
    removeBgUnavailable: "Fon silmə xidməti konfiqurasiya edilməyib",
  },
  en: {
    localeLabel: "Language",
    adminWorkspace: "Admin Workspace",
    professionalWorkspace: "Inventory and Content Control",
    notEnabledTitle: "Admin panel is not enabled",
    notEnabledDescription:
      "Set `ADMIN_PASSWORD` in your environment, restart the app, and the workspace will unlock.",
    loginHeroTitle:
      "A smoother workspace for managing perfumes, notes, media, and CSV operations.",
    loginHeroDescription:
      "Sign in to work with structured editors, image uploads, CSV import/export, and a cleaner admin flow.",
    loginTitle: "Admin login",
    loginDescription: "Use your admin password to enter the workspace.",
    username: "Username",
    password: "Password",
    enterWorkspace: "Enter workspace",
    signingIn: "Signing in...",
    editing: "Editing",
    assets: "Assets",
    bulkOps: "Bulk ops",
    twoDatasets: "2 datasets",
    perfumesAndNotesOneView: "Perfumes and notes in one view",
    mediaReady: "Media-ready",
    uploadDirect: "Upload images directly from the panel",
    csvImport: "CSV import",
    moveDataFast: "Move data in and out quickly",
    heroTitle: "Manage stock, product details, and notes from one admin panel.",
    heroDescription:
      "Search records, edit in place, upload images, update with CSV, and save changes instantly.",
    unsavedChanges: "Unsaved changes",
    everythingSaved: "All changes saved",
    refresh: "Refresh",
    reset: "Reset",
    saveChanges: "Save changes",
    saving: "Saving...",
    logout: "Log out",
    dashboard: "Dashboard",
    aiChat: "AI chat",
    aiChatDescription:
      "Inspect guest and signed-in AI chat sessions, location metadata, and full transcripts from one panel.",
    qoxunuLogs: "Qoxunu logs",
    qoxunuLogsDescription:
      "Inspect guest and signed-in users who completed the scent quiz, their location metadata, their input, and the final system picks.",
    perfumes: "Perfumes",
    notes: "Notes",
    linkedNotes: "Linked notes",
    visibleInSearch: "{count} records visible in search",
    linkedNoteDetail: "Unique notes currently used by perfumes",
    assetCoverage: "Asset coverage",
    dataOperations: "Data operations",
    dataOperationsDescription:
      "Import and export structured data without leaving the workspace.",
    branding: "Branding",
    brandingDescription:
      "Change the website title and the main brand name shown across the admin from one place.",
    header: "Home header",
    headerDescription:
      "Switch the homepage hero between a video CTA and rotating perfume cards.",
    headerPreview: "Header preview",
    headerPreviewDetail:
      "Choose a video or a rotating perfume header, then save the change to the database.",
    headerMode: "Header mode",
    headerModeVideo: "Video CTA",
    headerModeRotating: "Rotating perfumes",
    headerVideoUrl: "Video URL",
    headerVideoTitle: "Video title",
    headerVideoDescription: "Video description",
    headerVideoCtaLabel: "CTA label",
    headerVideoCtaHref: "CTA link",
    headerVideoPreview: "Video preview",
    headerTranslate: "AI translate",
    headerTranslateWorking: "Translating...",
    headerTranslateDone: "Header translations updated.",
    headerTranslateFailed: "Translation failed.",
    headerTranslateNeedText: "Add title, description, or CTA first.",
    headerTranslations: "Header translations",
    headerTranslationsHint: "Provide per-language title, description and CTA or use AI translate.",
    headerRotatingMode: "Rotating mode",
    headerRandomMode: "Random perfumes",
    headerSelectedMode: "Selected perfumes",
    headerSlides: "Selected slides",
    headerAddSlide: "Add slide",
    headerSlidePerfume: "Choose perfume",
    headerSlideSearchPlaceholder: "Search by brand or name",
    headerSlideSearchHint: "Pick from image cards and fill the slug automatically.",
    headerSlideSelected: "Selected perfume",
    headerSlideChoose: "Choose",
    headerSlideClear: "Clear",
    headerSlideButtonLabel: "Button label",
    headerSlideDescription: "Description",
    headerSlideRemove: "Remove",
    promotions: "Promotions",
    promotionsDescription:
      "Control the scrolling promo banner at the very top of the site from one place.",
    promotionsPreview: "Banner preview",
    promotionsPreviewDetail:
      "Choose the message, speed, colors, and dismiss behavior your visitors will see.",
    promotionsEnable: "Enable promo banner",
    promotionsEnableHint: "When off, the banner is hidden everywhere on the site.",
    promotionsEnabled: "Active",
    promotionsDisabled: "Disabled",
    promotionsYes: "Yes",
    promotionsNo: "No",
    promotionsMode: "Banner mode",
    promotionsManual: "Manual text",
    promotionsDiscount: "Discount selection",
    promotionsText: "Banner text",
    promotionsTextHint: "Short, clear copy works best in the moving banner.",
    promotionsLinkHref: "Banner link",
    promotionsLinkHrefHint: "Where the banner or its message should send users.",
    promotionsLinkLabel: "Link label",
    promotionsLinkLabelHint: "Label shown as the right-side button.",
    promotionsSelectPerfume: "Select a perfume",
    promotionsNoLink: "No link selected yet",
    promotionsBackgroundColor: "Background color",
    promotionsTextColor: "Text color",
    promotionsSpeed: "Text speed",
    promotionsSpeedHint: "Lower values make the text move faster.",
    promotionsClosable: "Allow users to close it",
    promotionsClosableHint: "Turn off if the banner should stay visible for everyone.",
    promotionsSourcePerfume: "Discount source",
    promotionsSourcePerfumeHint:
      "Pick a perfume on discount and let the banner copy be suggested automatically.",
    promotionsGenerate: "Generate promo copy",
    promotionsTranslate: "AI translate",
    promotionsTranslateHint: "Translate the current copy neatly into all languages.",
    promotionsTranslateWorking: "Translating...",
    promotionsTranslateDone: "Promotion copy updated.",
    promotionsTranslateFailed: "Translation failed.",
    promotionsTranslateNeedText: "Add promo text or a link label first.",
    promotionsReset: "Reset to default",
    promotionsOpenLink: "Banner link",
    siteName: "Site title",
    siteNameHint:
      "This name is used for the browser title and as the primary brand label in admin.",
    siteDomain: "Display domain",
    siteDomainHint:
      "The domain text shown inside copy, for example: brand.az",
    siteTitle: "Default meta title",
    siteDescription: "Default meta description",
    metaKeywords: "Meta keywords",
    metaKeywordsHint:
      "Separate keywords with commas. When left empty, the system uses the stronger built-in list.",
    metaKeywordsCount:
      "{count} keywords are currently being used in metadata.",
    openGraphTitle: "Open Graph title",
    openGraphDescription: "Open Graph description",
    twitterTitle: "Twitter title",
    twitterDescription: "Twitter description",
    brandingPreview: "Preview",
    brandingPreviewDetail: "This is how it will read in the browser title and admin workspace.",
    exportPerfumesCsv: "Export perfumes CSV",
    exportNotesCsv: "Export notes CSV",
    importPerfumesCsv: "Import perfumes CSV",
    importNotesCsv: "Import notes CSV",
    importingPerfumes: "Importing perfumes...",
    importingNotes: "Importing notes...",
    workspaceRecords: "Workspace records",
    workspaceRecordsDescription:
      "Switch datasets, search quickly, and move between records without page reloads.",
    searchPerfumes: "Search perfumes...",
    searchNotes: "Search notes...",
    addPerfume: "Add perfume",
    duplicate: "Duplicate",
    delete: "Delete",
    addNote: "Add note",
    perfumeList: "Perfume list",
    noteList: "Note list",
    all: "All",
    missingImage: "Missing image",
    missingNotes: "Missing notes",
    outOfStock: "Out of stock",
    linked: "Linked",
    unlinked: "Unlinked",
    recordsShown: "{shown}/{total} shown",
    updating: "updating",
    noPerfumesFound: "No perfumes found",
    noPerfumesFoundDescription:
      "Adjust the search or create a new perfume draft.",
    noNotesFound: "No notes found",
    noNotesFoundDescription:
      "Try a broader search or create a new note draft.",
    perfumeEditor: "Perfume editor",
    noteEditor: "Note editor",
    copySlug: "Copy slug",
    copyImageUrl: "Copy image URL",
    basics: "Basics",
    perfumeNotes: "Notes",
    media: "Media",
    discounts: "Discounts",
    discountControls: "Discount controls",
    discountControlsDescription:
      "Set a sale for all sizes, one bottle size, or a custom group. Expired deadlines stop automatically on the storefront.",
    discountActive: "Discount active",
    discountActiveHint: "Turn the offer on or keep it saved as a draft.",
    discountType: "Discount type",
    discountPercentOption: "Percentage off",
    discountFixedOption: "Set lower price",
    discountNewSalePrice: "New sale price",
    discountPercentage: "Percentage",
    discountFixedHint: "This becomes the final price for matching sizes.",
    discountPercentHint: "Example: 20 means 20% off.",
    discountAppliesTo: "Applies to",
    discountAllSizes: "All sizes",
    discountOneSize: "One size",
    discountCustomSizes: "Custom sizes",
    discountedSize: "Discounted size",
    discountDeadline: "Deadline",
    discountNoDeadline: "No deadline",
    discountCustomDate: "Custom date",
    discountCustomDuration: "Custom days / weeks / months",
    discountEndOfMonth: "End of this month",
    discountEndsOn: "Ends on",
    discountDurationAmount: "Duration amount",
    discountDurationUnit: "Duration unit",
    discountDays: "Days",
    discountWeeks: "Weeks",
    discountMonths: "Months",
    discountStartsOn: "Starts on",
    discountComputedEndDate: "Computed end date",
    discountShowDeadline: "Show deadline publicly",
    discountShowDeadlineHint: "Display the sale end date on the product detail page.",
    discountCustomSizePicker: "Custom discounted sizes",
    discountPreview: "Storefront preview",
    discountPreviewDescription:
      "Base prices stay in the size matrix. These are the prices customers see while the discount is active.",
    discountNoSavings: "No discount",
    coreDetails: "Core details",
    coreDetailsDescription:
      "Keep the core catalog identity clean and consistent.",
    perfumeName: "Perfume name",
    brand: "Brand",
    slug: "Slug",
    slugHint: "Lowercase URL key used across the site",
    gender: "Gender",
    stockStatus: "Stock status",
    inventoryFlag: "Inventory flag",
    inStock: "In stock",
    outStock: "Out of stock",
    externalLink: "External link",
    sizeMatrix: "Size matrix",
    sizeMatrixDescription: "Maintain sale sizes and prices in one list.",
    addSize: "Add size",
    label: "Label",
    ml: "ML",
    price: "Price",
    remove: "Remove",
    topNotes: "Top notes",
    heartNotes: "Heart notes",
    baseNotes: "Base notes",
    attachNotesDetail: "Attach note slugs to build the {group} layer.",
    noLinkedGroupNotes: "No {group} notes linked yet.",
    addNoteSlug: "Add note slug",
    existingSlugs: "{count} note slug options available",
    addLinkedNote: "Add note",
    mediaQuickActions: "Media quick actions",
    uploadImage: "Upload image",
    replaceImage: "Replace image",
    uploading: "Uploading...",
    uploadImageGuidance: "Accepted: PNG, JPG, JPEG, WebP. Max size: 8 MB.",
    imageMetadata: "Image metadata",
    imageMetadataDescription:
      "Control the uploaded image reference and alt text.",
    imageUrl: "Image URL",
    imageAlt: "Image alt text",
    openProductPage: "Open product page",
    productPageHint: "Full link to the live product page for this perfume.",
    uploadPerfumePreview: "Upload a perfume image to preview it here.",
    uploadNotePreview: "Upload a note image to preview it here.",
    noteContent: "Note content",
    noteContentDescription:
      "Edit the note label and descriptive copy used across the site.",
    noteName: "Note name",
    content: "Content",
    usageMap: "Usage map",
    usageMapDescription: "Perfumes currently referencing this note.",
    noLinkedPerfumes: "No linked perfumes yet",
    noLinkedPerfumesDescription:
      "Attach this note from the perfume editor notes tab.",
    noPerfumeSelected: "No perfume selected",
    noPerfumeSelectedDescription:
      "Pick a perfume from the list or create a new one.",
    noNoteSelected: "No note selected",
    noNoteSelectedDescription:
      "Pick a note from the list or create a new one.",
    statusNoValueToCopy: "There is no {label} to copy yet.",
    statusCopied: "{label} copied to clipboard.",
    statusCopyFailed: "Unable to copy {label}.",
    statusNewPerfumeCreated: "New perfume draft created.",
    statusPerfumeDuplicated: "Perfume duplicated into a new draft.",
    statusPerfumeRemoved: "Perfume removed from the workspace.",
    statusNewNoteCreated: "New note draft created.",
    statusNoteDuplicated: "Note duplicated into a new draft.",
    statusNoteRemoved: "Note removed from the workspace.",
    statusWorkspaceReset: "Workspace reset to the latest saved state.",
    statusUploadingPerfumeImage: "Uploading perfume image...",
    statusPerfumeImageUploaded: "Perfume image uploaded.",
    statusUploadingNoteImage: "Uploading note image...",
    statusNoteImageUploaded: "Note image uploaded.",
    statusWorkspaceReady: "Admin workspace ready.",
    statusLoginFailed: "Login request failed. Please try again.",
    statusClosingSession: "Closing your admin session...",
    statusLoggedOut: "Logged out.",
    statusLogoutFailed: "Logout failed. Please try again.",
    statusRefreshing: "Refreshing saved admin data...",
    statusRefreshFailed: "Refresh failed.",
    statusWorkspaceSynced: "Workspace synced with saved admin data.",
    statusAlreadySaved: "Everything is already saved.",
    statusSaving: "Saving changes and revalidating public pages...",
    statusSaveFailed: "Save failed.",
    statusSaved: "Saved successfully. Public pages have been revalidated.",
    statusPreparingExport: "Preparing {type} CSV export...",
    statusExportFailed: "Export request failed.",
    statusExportedPerfumes: "Perfumes CSV exported.",
    statusExportedNotes: "Notes CSV exported.",
    statusImportingCsv: "Importing {type} CSV...",
    statusImportFailed: "Import request failed.",
    statusImportedPerfumes: "Perfumes CSV imported.",
    statusImportedNotes: "Notes CSV imported.",
    confirmReload: "Reloading will discard unsaved changes. Continue?",
    confirmDeletePerfume: 'Delete perfume "{name}"?',
    confirmDeleteNote: 'Delete note "{name}"?',
    loginFailed: "Login failed.",
    refreshFailed: "Refresh failed.",
    saveFailed: "Save failed.",
    exportFailed: "Export failed.",
    importFailed: "CSV import failed.",
    uploadFailed: "Upload failed.",
    loggedInDataFailed: "Logged in, but failed to load admin data.",
    usePassword: "Use your configured admin password to enter the workspace.",
    assetCoverageDetail: "{count} records currently have an image",
    perfumeMetaFallback: "Brand and gender not added yet",
    noPricing: "No pricing",
    fromPrice: "from {price} AZN",
    usedByPerfumes: "Used by {count} perfumes",
    noteLinksCount: "{count} note links",
    sizeCount: "{count} sizes",
    removeBg: "Remove Background",
    removeBgTooltip: "Remove background from images (typically pink backgrounds)",
    removeBgProcessing: "Removing background...",
    removeBgSuccess: "Background removed successfully",
    removeBgError: "Error removing background",
    removeBgUnavailable: "Background removal service is not configured",
  },
} satisfies Record<AdminLocale, Record<string, string>>;

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function interpolate(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function matchesSearchPool(pool: string, query: string) {
  if (!query) {
    return true;
  }

  if (pool.includes(query)) {
    return true;
  }

  const tokens = tokenizeSearch(query);
  if (!tokens.length) {
    return true;
  }

  return tokens.every((token) => pool.includes(token));
}

function tokenizeNormalizedWords(value: string) {
  return tokenizeSearch(normalizeSearchText(value));
}

function matchesTokenPrefixPool(poolTokens: string[], normalizedPool: string, query: string) {
  if (normalizedPool.includes(query)) {
    return true;
  }

  const queryTokens = tokenizeNormalizedWords(query).filter((token) => token.length >= 2);
  if (!queryTokens.length) {
    return true;
  }

  return queryTokens.every((queryToken) =>
    poolTokens.some((poolToken) => poolToken === queryToken || poolToken.startsWith(queryToken)),
  );
}

function scorePerfumeSearch(item: PerfumeDraft, normalizedQuery: string) {
  if (!normalizedQuery) {
    return 0;
  }

  const normalizedName = normalizeSearchText(item.name);
  const normalizedBrand = normalizeSearchText(item.brand);
  const normalizedSlug = normalizeSearchText(item.slug);
  const brandThenName = `${normalizedBrand} ${normalizedName}`.trim();
  const nameThenBrand = `${normalizedName} ${normalizedBrand}`.trim();
  const pool = normalizeSearchText(
    [
      item.name,
      item.brand,
      item.slug,
      item.gender,
      item.stockStatus,
      item.noteSlugs.top.join(" "),
      item.noteSlugs.heart.join(" "),
      item.noteSlugs.base.join(" "),
    ].join(" "),
  );

  let score = 0;

  if (brandThenName === normalizedQuery || nameThenBrand === normalizedQuery) score += 520;
  else if (normalizedName === normalizedQuery || normalizedSlug === normalizedQuery) score += 460;
  else if (brandThenName.includes(normalizedQuery) || nameThenBrand.includes(normalizedQuery)) score += 340;
  else if (normalizedName.includes(normalizedQuery)) score += 260;
  else if (normalizedBrand.includes(normalizedQuery)) score += 180;
  else if (pool.includes(normalizedQuery)) score += 120;

  const tokens = tokenizeSearch(normalizedQuery);
  if (tokens.length && tokens.every((token) => pool.includes(token))) {
    score += 100;
  }

  return score;
}

function scoreNoteSearch(item: NoteDraft, normalizedQuery: string) {
  if (!normalizedQuery) {
    return 0;
  }

  const normalizedName = normalizeSearchText(item.name);
  const normalizedSlug = normalizeSearchText(item.slug);
  const pool = normalizeSearchText([item.name, item.slug, item.content].join(" "));

  let score = 0;

  if (normalizedName === normalizedQuery || normalizedSlug === normalizedQuery) score += 420;
  else if (normalizedName.includes(normalizedQuery)) score += 240;
  else if (normalizedSlug.includes(normalizedQuery)) score += 210;
  else if (pool.includes(normalizedQuery)) score += 120;

  const tokens = tokenizeSearch(normalizedQuery);
  if (tokens.length && tokens.every((token) => pool.includes(token))) {
    score += 80;
  }

  return score;
}

function normalizeSlug(value: unknown) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.map((item) => normalizeSlug(item)).filter(Boolean);
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

function normalizePerfumeDraft(value: unknown): PerfumeDraft | null {
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
    discount?: unknown;
    noteSlugs?: { top?: unknown; heart?: unknown; base?: unknown };
    mediaScale?: unknown;
    mediaScaleByDevice?: {
      mobile?: unknown;
      laptop?: unknown;
      monitor?: unknown;
    };
  };

  const slug = normalizeSlug(perfume.slug) || normalizeSlug(perfume.name);
  if (!slug) {
    return null;
  }

  const sizes = Array.isArray(perfume.sizes)
    ? perfume.sizes
        .map(normalizeSize)
        .filter((item): item is PerfumeSize => item !== null)
        .sort((left, right) => left.ml - right.ml)
    : [];

  // Ensure default sizes with updated prices if provided
  const defaultSizes = [
    { ml: 15, label: "15ML", price: 0 },
    { ml: 30, label: "30ML", price: 0 },
    { ml: 50, label: "50ML", price: 0 },
  ];
  const sizeMap = new Map(sizes.map((s) => [s.ml, s.price]));
  const ensuredSizes = defaultSizes.map((s) => ({
    ...s,
    price: sizeMap.get(s.ml) ?? 0,
  }));

  return {
    id: normalizeString(perfume.id) || slug,
    slug,
    name: normalizeString(perfume.name) || "Untitled perfume",
    brand: normalizeString(perfume.brand),
    gender: normalizeString(perfume.gender) || "Unisex",
    image: normalizeString(perfume.image),
    imageAlt: normalizeString(perfume.imageAlt),
    stockStatus: normalizeString(perfume.stockStatus) || "Available",
    inStock: Boolean(perfume.inStock),
    externalLink: normalizeString(perfume.externalLink),
    sizes: ensuredSizes,
    discount: normalizePerfumeDiscount(perfume.discount) ?? undefined,
    noteSlugs: {
      top: normalizeStringArray(perfume.noteSlugs?.top),
      heart: normalizeStringArray(perfume.noteSlugs?.heart),
      base: normalizeStringArray(perfume.noteSlugs?.base),
    },
    mediaScale:
      typeof perfume.mediaScale === "number" && Number.isFinite(perfume.mediaScale)
        ? perfume.mediaScale
        : undefined,
    mediaScaleByDevice: (() => {
      const mobile = Number(perfume.mediaScaleByDevice?.mobile);
      const laptop = Number(perfume.mediaScaleByDevice?.laptop);
      const monitor = Number(perfume.mediaScaleByDevice?.monitor);
      const next: { mobile?: number; laptop?: number; monitor?: number } = {};
      if (Number.isFinite(mobile)) next.mobile = mobile;
      if (Number.isFinite(laptop)) next.laptop = laptop;
      if (Number.isFinite(monitor)) next.monitor = monitor;
      return Object.keys(next).length ? next : undefined;
    })(),
  };
}

function normalizeNoteDraft(value: unknown): NoteDraft | null {
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

  const slug = normalizeSlug(note.slug) || normalizeSlug(note.name);
  if (!slug) {
    return null;
  }

  return {
    slug,
    name: normalizeString(note.name) || "Untitled note",
    image: normalizeString(note.image),
    imageAlt: normalizeString(note.imageAlt),
    content: normalizeString(note.content),
  };
}

function safeParsePerfumes(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [] as PerfumeDraft[];
    }

    return parsed
      .map(normalizePerfumeDraft)
      .filter((item): item is PerfumeDraft => item !== null);
  } catch {
    return [] as PerfumeDraft[];
  }
}

function safeParseNotes(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [] as NoteDraft[];
    }

    return parsed
      .map(normalizeNoteDraft)
      .filter((item): item is NoteDraft => item !== null);
  } catch {
    return [] as NoteDraft[];
  }
}

function safeParseSettings(raw: string) {
  try {
    return normalizeSiteSettings(JSON.parse(raw));
  } catch {
    return normalizeSiteSettings({ siteName: DEFAULT_SITE_NAME });
  }
}

function formatMetaKeywordsInput(settings: SiteSettingsDraft) {
  return resolveSiteMetaKeywords(settings.metaKeywords, settings.siteName).join(", ");
}

function updateSiteSettingsForNameChange(current: SiteSettingsDraft, nextSiteName: string) {
  const normalizedCurrent = normalizeSiteSettings(current);
  const normalizedNext = normalizeSiteSettings({
    ...normalizedCurrent,
    siteName: nextSiteName,
  });
  const previousDefaultTitle = buildDefaultSiteTitle(normalizedCurrent.siteName);
  const previousDefaultDescription = buildDefaultSiteDescription(normalizedCurrent.siteName);
  const nextDefaultTitle = buildDefaultSiteTitle(normalizedNext.siteName);
  const nextDefaultDescription = buildDefaultSiteDescription(normalizedNext.siteName);

  return {
    ...normalizedNext,
    siteTitle:
      normalizedCurrent.siteTitle === previousDefaultTitle
        ? nextDefaultTitle
        : normalizedCurrent.siteTitle,
    siteDescription:
      normalizedCurrent.siteDescription === previousDefaultDescription
        ? nextDefaultDescription
        : normalizedCurrent.siteDescription,
    openGraphTitle:
      normalizedCurrent.openGraphTitle === previousDefaultTitle
        ? nextDefaultTitle
        : normalizedCurrent.openGraphTitle,
    openGraphDescription:
      normalizedCurrent.openGraphDescription === previousDefaultDescription
        ? nextDefaultDescription
        : normalizedCurrent.openGraphDescription,
    twitterTitle:
      normalizedCurrent.twitterTitle === previousDefaultTitle
        ? nextDefaultTitle
        : normalizedCurrent.twitterTitle,
    twitterDescription:
      normalizedCurrent.twitterDescription === previousDefaultDescription
        ? nextDefaultDescription
        : normalizedCurrent.twitterDescription,
  } satisfies SiteSettingsDraft;
}

async function parseResponse(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function createEmptyPerfume(): PerfumeDraft {
  const seed = Date.now().toString(36);
  const slug = `perfume-${seed}`;

  return {
    id: slug,
    slug,
    name: "New perfume",
    brand: "",
    gender: "Unisex",
    image: "",
    imageAlt: "",
    stockStatus: "Available",
    inStock: true,
    externalLink: "",
    sizes: [
      { label: "15ML", ml: 15, price: 0 },
      { label: "30ML", ml: 30, price: 0 },
      { label: "50ML", ml: 50, price: 0 },
    ],
    discount: getDefaultDiscount(),
    noteSlugs: {
      top: [],
      heart: [],
      base: [],
    },
  };
}

function createEmptyNote(): NoteDraft {
  const seed = Date.now().toString(36);

  return {
    slug: `note-${seed}`,
    name: "New note",
    image: "",
    imageAlt: "",
    content: "",
  };
}

function formatStartingPrice(perfume: PerfumeDraft, copy: (typeof adminCopy)[AdminLocale]) {
  const price = perfume.sizes
    .map((size) => size.price)
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)[0];

  return Number.isFinite(price)
    ? interpolate(copy.fromPrice, { price })
    : copy.noPricing;
}

function formatPerfumeMeta(perfume: PerfumeDraft, copy: (typeof adminCopy)[AdminLocale]) {
  const parts = [perfume.brand, perfume.gender].filter(Boolean);
  if (!parts.length) {
    return copy.perfumeMetaFallback;
  }
  return parts.join(" • ");
}

function toneClasses(tone: StatusTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function StatusIcon({ tone }: { tone: StatusTone }) {
  if (tone === "success") {
    return <CheckCircle size={16} weight="fill" />;
  }

  if (tone === "error") {
    return <WarningCircle size={16} weight="fill" />;
  }

  return <Sparkle size={16} weight="fill" />;
}

function WorkspaceStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {label}
        </span>
      </div>
    </div>
  );
}

function SectionLabel({
  icon,
  title,
  detail,
  action,
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600">
            {icon}
          </span>
          {title}
        </div>
        {detail ? <p className="mt-2 text-sm leading-6 text-zinc-500">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-zinc-700">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs leading-5 text-zinc-500">{hint}</span> : null}
    </label>
  );
}

function DropdownShell({
  value,
  open,
  onClick,
  label,
  summary,
}: {
  value: ReactNode;
  open?: boolean;
  onClick: () => void;
  label?: string;
  summary?: string;
}) {
  return (
    <button
      type="button"
      className={cx(
        "flex min-h-12 w-full items-center justify-between gap-3 rounded-[16px] border bg-white px-4 py-3 text-left transition-all duration-200",
        open
          ? "border-violet-300 shadow-[0_10px_24px_rgba(124,58,237,0.12)] ring-4 ring-violet-100"
          : "border-zinc-200 hover:border-zinc-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]",
      )}
      onClick={onClick}
    >
      <span className="min-w-0">
        {label ? <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</span> : null}
        <span className={cx("mt-0.5 block truncate text-sm font-medium", summary ? "text-zinc-500" : "text-zinc-900")}>{summary || value}</span>
      </span>
      <span className={cx("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition", open ? "border-violet-200 bg-violet-50 text-violet-700" : "border-zinc-200 bg-zinc-50 text-zinc-500") }>
        <CaretRight size={14} weight="bold" className={cx("transition-transform duration-200", open ? "rotate-90" : "")} />
      </span>
    </button>
  );
}

function ModernDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node | null)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? placeholder;

  return (
    <div ref={rootRef} className="relative">
      <DropdownShell value={selectedLabel} onClick={() => setOpen((current) => !current)} open={open} />
      {open ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-full overflow-hidden rounded-[16px] border border-zinc-200 bg-white shadow-[0_22px_48px_rgba(15,23,42,0.12)]">
          <div className="max-h-64 overflow-y-auto p-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cx(
                  "flex h-11 w-full items-center justify-between rounded-[12px] px-3 text-left text-sm transition",
                  option.value === value ? "bg-violet-50 text-violet-700" : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value ? <CheckCircle size={16} weight="fill" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(
        ui.tab,
        active
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-zinc-500 hover:border-zinc-200 hover:text-zinc-900",
      )}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

function RecordButton({
  active,
  title,
  subtitle,
  meta,
  src,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  meta: string;
  src?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group w-full rounded-[14px] border px-3 py-2.5 text-left transition duration-200",
        active
          ? "border-indigo-500 bg-indigo-50/70 text-zinc-950 shadow-[0_8px_20px_rgba(99,102,241,0.08)]"
          : "border-transparent bg-white hover:border-[#E5E7EB] hover:bg-[#FAFAFB]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] border border-[#E5E7EB] bg-zinc-100">
          {src ? (
            <Image src={src} alt={title} fill sizes="40px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              {title.slice(0, 2)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-zinc-950">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{subtitle}</p>
        </div>

        <span
          className={cx(
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
            active ? "bg-white text-indigo-600" : "bg-zinc-100 text-zinc-600",
          )}
        >
          {meta}
        </span>
      </div>
    </button>
  );
}

type PerfumePickerModalCopy = {
  searchPerfumes: string;
  all: string;
  missingImage: string;
  missingNotes: string;
  perfumeList: string;
  noPerfumesFound: string;
  noPerfumesFoundDescription: string;
};

function PerfumePickerModal({
  open,
  entering,
  perfumes,
  selectedPerfume,
  onSelectPerfume,
  onClose,
  initialQuery,
  onQueryCommit,
  copy,
  priceCopy,
  locale,
}: {
  open: boolean;
  entering: boolean;
  perfumes: PerfumeDraft[];
  selectedPerfume: PerfumeDraft | null;
  onSelectPerfume: (id: string) => void;
  onClose: () => void;
  initialQuery: string;
  onQueryCommit: (query: string) => void;
  copy: PerfumePickerModalCopy;
  priceCopy: (typeof adminCopy)[AdminLocale];
  locale: AdminLocale;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<PerfumeListFilter>("all");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery, open]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onQueryCommit(query);
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onQueryCommit, query]);

  const normalizedQuery = tokenizeNormalizedWords(deferredQuery)
    .filter((token) => token.length >= 2)
    .join(" ");
  const isFiltering = query.trim() !== deferredQuery.trim();

  const perfumeSearchIndex = useMemo(
    () =>
      perfumes.map((item) => {
        const pool = [
          item.name,
          item.slug,
          item.brand,
          item.gender,
          item.noteSlugs.top.join(" "),
          item.noteSlugs.heart.join(" "),
          item.noteSlugs.base.join(" "),
        ].join(" ");

        return {
          item,
          normalizedPool: normalizeSearchText(pool),
          tokens: tokenizeNormalizedWords(pool),
        };
      }),
    [perfumes],
  );

  const filteredPerfumes = useMemo(() => {
    const searchMatched = perfumeSearchIndex.filter((entry) =>
      matchesTokenPrefixPool(entry.tokens, entry.normalizedPool, normalizedQuery),
    );

    const filtered = searchMatched.filter((item) => {
      if (filter === "missingImage") {
        return !item.item.image;
      }

      if (filter === "missingNotes") {
        return item.item.noteSlugs.top.length + item.item.noteSlugs.heart.length + item.item.noteSlugs.base.length === 0;
      }

      return true;
    });

    if (normalizedQuery) {
      filtered.sort((left, right) => {
        const scoreRight = scorePerfumeSearch(right.item, normalizedQuery);
        const scoreLeft = scorePerfumeSearch(left.item, normalizedQuery);
        if (scoreRight !== scoreLeft) {
          return scoreRight - scoreLeft;
        }

        return left.item.name.localeCompare(right.item.name);
      });
    }

    return filtered.map((entry) => entry.item);
  }, [filter, normalizedQuery, perfumeSearchIndex]);

  const visiblePerfumes = filteredPerfumes.slice(0, 60);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cx(
        "fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/35 px-4 py-6 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        entering ? "opacity-100" : "opacity-0",
      )}
      onClick={onClose}
    >
      <div
        className={cx(
          "w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          entering ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-4 scale-[0.98] opacity-0 blur-sm",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{adminText(locale, "Ətir seçici", "Perfume picker")}</p>
            <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-zinc-950">{adminText(locale, "Ətir seçin", "Select a perfume")}</h3>
            <p className="mt-1 text-sm text-zinc-500">{adminText(locale, "Axtarın, önizləyin və iş sahəsindən çıxmadan dəyişin.", "Search, preview, and switch without leaving the workspace.")}</p>
          </div>

          <button type="button" className={ui.compactButton} onClick={onClose}>
            {adminText(locale, "Bağla", "Close")}
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border-b border-[#E5E7EB] p-5 lg:border-b-0 lg:border-r sm:p-6">
            <label className="relative block">
              <span className="sr-only">{adminText(locale, "Ətirləri axtar", "Search perfumes")}</span>
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPerfumes}
                className={cx(
                  "h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-3.5 pl-10 text-sm text-zinc-900 outline-none transition duration-200 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10",
                )}
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {([
                ["all", copy.all],
                ["missingImage", copy.missingImage],
                ["missingNotes", copy.missingNotes],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cx(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                    filter === value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50",
                  )}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              <span>{copy.perfumeList}</span>
              <span className="inline-flex items-center gap-2">
                {isFiltering ? <ArrowsClockwise className="animate-spin text-indigo-500" size={13} weight="bold" /> : null}
                {filteredPerfumes.length}
              </span>
            </div>

            <div className="mt-3 max-h-[58vh] overflow-y-auto pr-1">
              <div className={cx("grid gap-2 transition duration-200", isFiltering ? "opacity-60" : "opacity-100")}>
                {visiblePerfumes.length ? (
                  visiblePerfumes.map((item) => {
                    const isSelected = selectedPerfume?.id === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          startTransition(() => {
                            onSelectPerfume(item.id);
                            onClose();
                          });
                        }}
                        className={cx(
                          "flex items-center gap-3 rounded-[16px] border px-3 py-2.5 text-left transition duration-200",
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/70 shadow-[0_8px_20px_rgba(99,102,241,0.08)]"
                            : "border-[#E5E7EB] bg-white hover:border-zinc-300 hover:bg-zinc-50",
                        )}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-zinc-100">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                              {item.name.slice(0, 2)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-950">{item.name}</p>
                          <p className="truncate text-xs text-zinc-500">
                            {item.brand} · {item.gender || "Unspecified"}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
                          {formatStartingPrice(item, priceCopy)}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#D1D5DB] bg-zinc-50 px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-zinc-800">{copy.noPerfumesFound}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{copy.noPerfumesFoundDescription}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#FCFCFD] p-5 sm:p-6">
            {selectedPerfume ? (
              <div className="space-y-4">
                <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-zinc-50">
                    {selectedPerfume.image ? (
                      <Image
                        src={selectedPerfume.image}
                        alt={selectedPerfume.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 320px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase tracking-[0.1em] text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-zinc-900">{selectedPerfume.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {selectedPerfume.brand} · {selectedPerfume.gender || "Unspecified"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-zinc-800">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{detail}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

function ImagePreview({
  src,
  alt,
  emptyLabel,
  fit = "cover",
  showCheckerboard = false,
}: {
  src: string;
  alt: string;
  emptyLabel: string;
  fit?: "cover" | "contain";
  showCheckerboard?: boolean;
}) {
  const checkerboardStyle = showCheckerboard
    ? {
        backgroundImage:
          "linear-gradient(45deg, rgba(228,228,231,0.8) 25%, transparent 25%)," +
          "linear-gradient(-45deg, rgba(228,228,231,0.8) 25%, transparent 25%)," +
          "linear-gradient(45deg, transparent 75%, rgba(228,228,231,0.8) 75%)," +
          "linear-gradient(-45deg, transparent 75%, rgba(228,228,231,0.8) 75%)",
        backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
        backgroundSize: "12px 12px",
      }
    : undefined;

  return (
    <div
      className="overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
      style={checkerboardStyle}
    >
      {src ? (
        <img
          src={src}
          alt={alt || emptyLabel}
          className={[
            "aspect-[4/3] h-full w-full",
            fit === "contain" ? "object-contain" : "object-cover",
          ].join(" ")}
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(228,228,231,0.95),rgba(244,244,245,0.92))] px-6 text-center text-sm text-zinc-500">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

export function AdminPanelClient({
  configured,
  initialAuthenticated,
  initialPerfumesJson,
  initialNotesJson,
  initialSettingsJson,
}: AdminPanelClientProps) {
  const initialPerfumes = useMemo(
    () => safeParsePerfumes(initialPerfumesJson),
    [initialPerfumesJson],
  );
  const initialNotes = useMemo(() => safeParseNotes(initialNotesJson), [initialNotesJson]);
  const initialSettings = useMemo(
    () => safeParseSettings(initialSettingsJson),
    [initialSettingsJson],
  );

  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [locale, setLocale] = useState<AdminLocale>("az");
  const [promotionEditorLocale, setPromotionEditorLocale] = useState<SitePromotionLocale>("az");
  const [headerEditorLocale, setHeaderEditorLocale] = useState<SitePromotionLocale>("az");
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageValue, setEditingMessageValue] = useState<string>("");
  const [isTranslatingPromotion, setIsTranslatingPromotion] = useState(false);
  const [isTranslatingHeader, setIsTranslatingHeader] = useState(false);
  const [promoAnalytics, setPromoAnalytics] = useState<PromoAnalyticsState | null>(null);
  const [isPromoAnalyticsLoading, setIsPromoAnalyticsLoading] = useState(false);
  const [promoAnalyticsError, setPromoAnalyticsError] = useState<string | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<AdminView>("perfumes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [perfumeEditorTab, setPerfumeEditorTab] = useState<PerfumeEditorTab>("basics");
  const [resizeModalOpen, setResizeModalOpen] = useState(false);
  const [resizeScale, setResizeScale] = useState(1);
  const [resizeMin] = useState(0.4);
  const [resizeMax, setResizeMax] = useState(1.6);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const previewCardRef = useRef<HTMLImageElement | null>(null);
  const [deviceViewMode, setDeviceViewMode] = useState<"mobile" | "laptop" | "monitor">("laptop");
  const [syncScaleAcrossDevices, setSyncScaleAcrossDevices] = useState(true);
  useEffect(() => {
    if (!resizeModalOpen) return;
    const t = () => {
      const container = modalContainerRef.current;
      const card = previewCardRef.current;
      if (!container || !card) return;
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      if (cardRect.width === 0 || cardRect.height === 0) return;
      const maxByWidth = containerRect.width / cardRect.width;
      const maxByHeight = containerRect.height / cardRect.height;
      const computed = Math.max(1, Math.min(maxByWidth, maxByHeight));
      setResizeMax(Math.max(1, computed));
      setResizeScale((s) => Math.min(s, Math.max(1, computed)));
    };

    // measure after paint
    requestAnimationFrame(t);
  }, [resizeModalOpen]);

  
  const [noteEditorTab, setNoteEditorTab] = useState<NoteEditorTab>("content");
  const [perfumeListFilter, setPerfumeListFilter] = useState<PerfumeListFilter>("all");
  const [noteListFilter, setNoteListFilter] = useState<NoteListFilter>("all");
  const [perfumes, setPerfumes] = useState<PerfumeDraft[]>(initialPerfumes);
  const [notes, setNotes] = useState<NoteDraft[]>(initialNotes);
  const [settings, setSettings] = useState<SiteSettingsDraft>(initialSettings);
  const [metaKeywordsInput, setMetaKeywordsInput] = useState(
    formatMetaKeywordsInput(initialSettings),
  );
  const [savedPerfumes, setSavedPerfumes] = useState<PerfumeDraft[]>(cloneDeep(initialPerfumes));
  const [savedNotes, setSavedNotes] = useState<NoteDraft[]>(cloneDeep(initialNotes));
  const [savedSettings, setSavedSettings] = useState<SiteSettingsDraft>(cloneDeep(initialSettings));
  const [selectedPerfumeId, setSelectedPerfumeId] = useState(
    initialPerfumes[0]?.id || initialPerfumes[0]?.slug || "",
  );
  const [selectedNoteSlug, setSelectedNoteSlug] = useState(initialNotes[0]?.slug || "");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [brandSearch, setBrandSearch] = useState("");
  const [search, setSearch] = useState("");
  const [perfumePickerQuery, setPerfumePickerQuery] = useState("");
  const [isPerfumePickerOpen, setIsPerfumePickerOpen] = useState(false);
  const [isPerfumePickerMounted, setIsPerfumePickerMounted] = useState(false);
  const [isPerfumePickerEntering, setIsPerfumePickerEntering] = useState(false);
  const [headerSlideSearches, setHeaderSlideSearches] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<StatusState | null>(null);
  const [statusTimerId, setStatusTimerId] = useState<NodeJS.Timeout | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatusState>({ tone: "idle", message: "" });
  const [saveStatusTimerId, setSaveStatusTimerId] = useState<NodeJS.Timeout | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [importing, setImporting] = useState<"perfumes" | "notes" | null>(null);
  const [tokenInput, setTokenInput] = useState({ top: "", heart: "", base: "" });
  const [brandDropdownSearch, setBrandDropdownSearch] = useState("");

  const perfumeImportRef = useRef<HTMLInputElement | null>(null);
  const noteImportRef = useRef<HTMLInputElement | null>(null);
  const perfumeImageInputRef = useRef<HTMLInputElement | null>(null);
  const noteImageInputRef = useRef<HTMLInputElement | null>(null);

  const deferredSearch = useDeferredValue(search);
  const deferredPerfumePickerQuery = useDeferredValue(perfumePickerQuery);
  const deferredHeaderSlideSearches = useDeferredValue(headerSlideSearches);
  const normalizedSearch = normalizeSearchText(deferredSearch);
  const normalizedPerfumePickerQuery = tokenizeNormalizedWords(deferredPerfumePickerQuery)
    .filter((token) => token.length >= 2)
    .join(" ");
  const isWorking = busy || uploading || importing !== null;
  const isFiltering = search.trim() !== deferredSearch.trim();
  const isPerfumePickerFiltering = perfumePickerQuery.trim() !== deferredPerfumePickerQuery.trim();
  const copy = adminCopy[locale];
  const t = (key: keyof typeof copy, values: Record<string, string | number> = {}) =>
    interpolate(copy[key], values);
  const showTopSearch = view === "perfumes";
  const siteName = settings.siteName || DEFAULT_SITE_NAME;
  const effectiveMetaKeywords = useMemo(
    () => resolveSiteMetaKeywords(settings.metaKeywords, siteName),
    [settings.metaKeywords, siteName],
  );

  const selectedPerfume = useMemo(
    () =>
      perfumes.find((item) => item.id === selectedPerfumeId || item.slug === selectedPerfumeId) ||
      perfumes[0] ||
      null,
    [perfumes, selectedPerfumeId],
  );
  useEffect(() => {
    if (!resizeModalOpen) return;
    // initialize slider from saved perfume values for current device
    const init = () => {
      const p = selectedPerfume as PerfumeDraft | null;
      if (!p) return;
      const byDevice = p.mediaScaleByDevice ?? {};
      const initial = syncScaleAcrossDevices
        ? p.mediaScale ?? 1
        : (byDevice[deviceViewMode] ?? p.mediaScale ?? 1);
      setResizeScale(initial);
      // recompute max again after setting initial
      requestAnimationFrame(() => {
        const container = modalContainerRef.current;
        const card = previewCardRef.current as HTMLElement | null;
        if (!container || !card) return;
        const containerRect = container.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        if (cardRect.width === 0) return;
        const maxByWidth = containerRect.width / cardRect.width;
        const maxByHeight = containerRect.height / cardRect.height;
        const computed = Math.max(1, Math.min(maxByWidth, maxByHeight));
        setResizeMax(Math.max(1, computed));
      });
    };

    init();
  }, [resizeModalOpen, deviceViewMode, syncScaleAcrossDevices, selectedPerfume]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let frameId: number | null = null;

    if (isPerfumePickerOpen) {
      setIsPerfumePickerMounted(true);
      frameId = requestAnimationFrame(() => setIsPerfumePickerEntering(true));
    } else {
      setIsPerfumePickerEntering(false);
      timeoutId = setTimeout(() => setIsPerfumePickerMounted(false), 220);
    }

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isPerfumePickerOpen]);
  const selectedPerfumeProductUrl = selectedPerfume
    ? `https://perfoumer.az/perfumes/${selectedPerfume.slug}`
    : "";
  const selectedPerfumeDiscount = selectedPerfume?.discount ?? DEFAULT_PERFUME_DISCOUNT;
  const promotionSourcePerfumes = useMemo(
    () =>
      (settings.promotions.sourcePerfumeSlugs.length
        ? settings.promotions.sourcePerfumeSlugs
        : settings.promotions.sourcePerfumeSlug
          ? [settings.promotions.sourcePerfumeSlug]
          : [])
        .map((slug) => perfumes.find((item) => item.slug === slug || item.id === slug) || null)
        .filter((item): item is Perfume => item !== null),
    [perfumes, settings.promotions.sourcePerfumeSlug, settings.promotions.sourcePerfumeSlugs],
  );
  const promotionSuggestion = promotionSourcePerfumes.length
    ? buildPromotionDiscountCopy(promotionSourcePerfumes, promotionEditorLocale)
    : null;
  const promotionPreviewText = getPromotionTextForLocale(settings.promotions, promotionEditorLocale);
  const promotionTextValue = settings.promotions.textByLocale[promotionEditorLocale] || settings.promotions.text;
  const promotionLinkLabelValue =
    getPromotionLinkLabelForLocale(settings.promotions, promotionEditorLocale) || settings.promotions.linkLabel;
  const promotionDiscountPerfumes = useMemo(
    () => perfumes.filter((item) => Boolean(item.discount?.enabled)),
    [perfumes],
  );
  const promotionTargetPerfumes = promotionDiscountPerfumes.length ? promotionDiscountPerfumes : perfumes;
  const selectedNote = useMemo(
    () => notes.find((item) => item.slug === selectedNoteSlug) || notes[0] || null,
    [notes, selectedNoteSlug],
  );

  const loadPromoAnalytics = useCallback(async () => {
    setIsPromoAnalyticsLoading(true);
    setPromoAnalyticsError(null);

    try {
      const response = await fetch("/api/admin/promotions/stats", { cache: "no-store" });
      const data = (await response.json()) as PromoAnalyticsState & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load promo analytics");
      }

      setPromoAnalytics({
        totalClicks: data.totalClicks || 0,
        uniqueClickers: data.uniqueClickers || 0,
        topPromos: data.topPromos || [],
        recentClicks: data.recentClicks || [],
      });
    } catch (error) {
      setPromoAnalyticsError(error instanceof Error ? error.message : "Failed to load promo analytics");
    } finally {
      setIsPromoAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view !== "promotions") {
      return;
    }

    void loadPromoAnalytics();
  }, [loadPromoAnalytics, view]);

  const updatePromotionSettings = (patch: Partial<SitePromotionSettings>) => {
    setSettings((current) => ({
      ...current,
      promotions: {
        ...current.promotions,
        ...patch,
      },
    }));
  };

  const updatePromotionTextForLocale = (text: string) => {
    updatePromotionSettings({
      text,
      textByLocale: {
        ...settings.promotions.textByLocale,
        [promotionEditorLocale]: text,
      },
    });
  };

  const updatePromotionLinkLabelForLocale = (linkLabel: string) => {
    updatePromotionSettings({
      linkLabel,
      linkLabelByLocale: {
        ...settings.promotions.linkLabelByLocale,
        [promotionEditorLocale]: linkLabel,
      },
    });
  };

  const updateHeaderLocaleField = (
    localeKey: SitePromotionLocale,
    field: "videoTitleByLocale" | "videoDescriptionByLocale" | "videoCtaLabelByLocale",
    value: string,
  ) => {
    setHomeHeader((current) => ({
      ...current,
      [field]: {
        ...((current[field] ?? {}) as Record<string, string>),
        [localeKey]: value,
      },
    } as any));
  };

  const translateHeaderCopy = async () => {
    const sourceTitle = settings.homeHeader.videoTitle.trim();
    const sourceDescription = settings.homeHeader.videoDescription.trim();
    const sourceCta = settings.homeHeader.videoCtaLabel.trim();

    if (!sourceTitle && !sourceDescription && !sourceCta) {
      setStatus({ tone: "error", message: copy.headerTranslateNeedText });
      return;
    }

    setIsTranslatingHeader(true);
    setStatus({ tone: "neutral", message: copy.headerTranslateWorking });

    try {
      const response = await fetch("/api/admin/home-header/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLocale: headerEditorLocale,
          videoTitle: sourceTitle,
          videoDescription: sourceDescription,
          videoCtaLabel: sourceCta,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        titleByLocale?: Record<SitePromotionLocale, string>;
        descriptionByLocale?: Record<SitePromotionLocale, string>;
        ctaLabelByLocale?: Record<SitePromotionLocale, string>;
      };

      if (!response.ok || !body.titleByLocale || !body.descriptionByLocale || !body.ctaLabelByLocale) {
        throw new Error(body.error || copy.headerTranslateFailed);
      }

      setHomeHeader((current) => {
        const mergedTitleByLocale = PROMOTION_LOCALES.reduce((acc, loc) => {
          acc[loc] = body.titleByLocale?.[loc] ?? (current.videoTitleByLocale as Record<string, string>)?.[loc] ?? "";
          return acc;
        }, {} as Record<SitePromotionLocale, string>);

        const mergedDescriptionByLocale = PROMOTION_LOCALES.reduce((acc, loc) => {
          acc[loc] = body.descriptionByLocale?.[loc] ?? (current.videoDescriptionByLocale as Record<string, string>)?.[loc] ?? "";
          return acc;
        }, {} as Record<SitePromotionLocale, string>);

        const mergedCtaByLocale = PROMOTION_LOCALES.reduce((acc, loc) => {
          acc[loc] = body.ctaLabelByLocale?.[loc] ?? (current.videoCtaLabelByLocale as Record<string, string>)?.[loc] ?? "";
          return acc;
        }, {} as Record<SitePromotionLocale, string>);

        return {
          ...current,
          videoTitle: mergedTitleByLocale[headerEditorLocale] || sourceTitle || current.videoTitle,
          videoDescription: mergedDescriptionByLocale[headerEditorLocale] || sourceDescription || current.videoDescription,
          videoCtaLabel: mergedCtaByLocale[headerEditorLocale] || sourceCta || current.videoCtaLabel,
          videoTitleByLocale: mergedTitleByLocale as unknown as SitePromotionTextMap,
          videoDescriptionByLocale: mergedDescriptionByLocale as unknown as SitePromotionTextMap,
          videoCtaLabelByLocale: mergedCtaByLocale as unknown as SitePromotionTextMap,
        } as any;
      });

      setStatus({ tone: "success", message: copy.headerTranslateDone });
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.headerTranslateFailed;
      setStatus({ tone: "error", message });
    } finally {
      setIsTranslatingHeader(false);
    }
  };

  const translatePromotionCopy = async () => {
    const sourceText = promotionTextValue.trim();
    const sourceLabel = promotionLinkLabelValue.trim();

    if (!sourceText && !sourceLabel) {
      setStatus({ tone: "error", message: copy.promotionsTranslateNeedText });
      return;
    }

    setIsTranslatingPromotion(true);
    setStatus({ tone: "neutral", message: copy.promotionsTranslateWorking });

    try {
      const response = await fetch("/api/admin/promotions/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLocale: promotionEditorLocale,
          text: sourceText,
          linkLabel: sourceLabel,
          mode: settings.promotions.mode,
          perfumeNames: promotionSourcePerfumes.map((item) => `${item.brand} ${item.name}`.trim()),
          sourcePerfumes: promotionSourcePerfumes.map((item) => item.slug),
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        textByLocale?: Record<SitePromotionLocale, string>;
        linkLabelByLocale?: Record<SitePromotionLocale, string>;
        text?: string;
        linkLabel?: string;
      };

      if (!response.ok || !body.textByLocale || !body.linkLabelByLocale) {
        throw new Error(body.error || copy.promotionsTranslateFailed);
      }

      const nextTextByLocale = {
        ...settings.promotions.textByLocale,
        ...body.textByLocale,
      };
      const nextLinkLabelByLocale = {
        ...settings.promotions.linkLabelByLocale,
        ...body.linkLabelByLocale,
      };

      updatePromotionSettings({
        text: body.text || nextTextByLocale.az || nextTextByLocale.en || nextTextByLocale.ru || sourceText,
        textByLocale: nextTextByLocale,
        linkLabel: body.linkLabel || nextLinkLabelByLocale.az || nextLinkLabelByLocale.en || nextLinkLabelByLocale.ru || sourceLabel,
        linkLabelByLocale: nextLinkLabelByLocale,
      });
      setStatus({ tone: "success", message: copy.promotionsTranslateDone });
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.promotionsTranslateFailed;
      setStatus({ tone: "error", message });
    } finally {
      setIsTranslatingPromotion(false);
    }
  };

  const updatePromotionLocale = (nextLocale: SitePromotionLocale) => {
    setPromotionEditorLocale(nextLocale);
  };

  const noteUsageCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const perfume of perfumes) {
      for (const slug of [
        ...perfume.noteSlugs.top,
        ...perfume.noteSlugs.heart,
        ...perfume.noteSlugs.base,
      ]) {
        counts.set(slug, (counts.get(slug) || 0) + 1);
      }
    }

    return counts;
  }, [perfumes]);

  const filteredNotes = useMemo(() => {
    const searchMatched = notes.filter((item) => {
      const pool = normalizeSearchText([item.name, item.slug, item.content].join(" "));
      return matchesSearchPool(pool, normalizedSearch);
    });

    const filtered = searchMatched.filter((item) => {
      if (noteListFilter === "linked") {
        return (noteUsageCounts.get(item.slug) || 0) > 0;
      }

      if (noteListFilter === "unlinked") {
        return (noteUsageCounts.get(item.slug) || 0) === 0;
      }

      if (noteListFilter === "missingImage") {
        return !item.image;
      }

      return true;
    });

    if (normalizedSearch) {
      filtered.sort((left, right) => {
        const scoreRight = scoreNoteSearch(right, normalizedSearch);
        const scoreLeft = scoreNoteSearch(left, normalizedSearch);
        if (scoreRight !== scoreLeft) {
          return scoreRight - scoreLeft;
        }

        return left.name.localeCompare(right.name);
      });
    }

    return filtered;
  }, [normalizedSearch, noteListFilter, noteUsageCounts, notes]);

  const noteSlugOptions = useMemo(
    () =>
      Array.from(new Set(notes.map((item) => normalizeSlug(item.slug)).filter(Boolean))).sort(),
    [notes],
  );

  const perfumePickerOptions = useMemo(
    () =>
      perfumes
        .map((item) => ({
          slug: normalizeSlug(item.slug),
          label: `${item.brand} ${item.name}`.trim(),
          brand: item.brand,
          name: item.name,
          image: item.image,
          imageAlt: item.imageAlt,
        }))
        .filter((item) => Boolean(item.slug))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [perfumes],
  );

  const perfumesLinkedToSelectedNote = useMemo(() => {
    if (!selectedNote) {
      return [] as PerfumeDraft[];
    }

    return perfumes.filter((item) =>
      [
        ...item.noteSlugs.top,
        ...item.noteSlugs.heart,
        ...item.noteSlugs.base,
      ].includes(selectedNote.slug),
    );
  }, [perfumes, selectedNote]);

  const dirty = useMemo(() => {
    return (
      JSON.stringify(perfumes) !== JSON.stringify(savedPerfumes) ||
      JSON.stringify(notes) !== JSON.stringify(savedNotes) ||
      JSON.stringify(settings) !== JSON.stringify(savedSettings)
    );
  }, [notes, perfumes, savedNotes, savedPerfumes, savedSettings, settings]);

  useEffect(() => {
    if (dirty && saveStatus.tone === "success") {
      if (saveStatusTimerId) {
        clearTimeout(saveStatusTimerId);
      }

      setSaveStatus({ tone: "idle", message: "" });
      setSaveStatusTimerId(null);
    }
  }, [dirty, saveStatus.tone, saveStatusTimerId]);

  useEffect(() => {
    if (!isPerfumePickerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPerfumePickerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isPerfumePickerOpen]);

  const stats = useMemo(() => {
    const linkedNotes = new Set<string>();
    let perfumeImages = 0;
    let noteImages = 0;

    for (const perfume of perfumes) {
      if (perfume.image) {
        perfumeImages += 1;
      }

      for (const slug of [
        ...perfume.noteSlugs.top,
        ...perfume.noteSlugs.heart,
        ...perfume.noteSlugs.base,
      ]) {
        linkedNotes.add(slug);
      }
    }

    for (const note of notes) {
      if (note.image) {
        noteImages += 1;
      }
    }

    return {
      perfumes: perfumes.length,
      notes: notes.length,
      linkedNotes: linkedNotes.size,
      assetCoverage: `${perfumeImages + noteImages}/${perfumes.length + notes.length || 0}`,
    };
  }, [notes, perfumes]);

  const perfumePickerContent = (
    <PerfumePickerModal
      open={isPerfumePickerMounted}
      entering={isPerfumePickerEntering}
      perfumes={perfumes}
      selectedPerfume={selectedPerfume}
      onSelectPerfume={setSelectedPerfumeId}
      onClose={() => setIsPerfumePickerOpen(false)}
      initialQuery={perfumePickerQuery}
      onQueryCommit={setPerfumePickerQuery}
      locale={locale}
      copy={{
        searchPerfumes: copy.searchPerfumes,
        all: copy.all,
        missingImage: copy.missingImage,
        missingNotes: copy.missingNotes,
        perfumeList: copy.perfumeList,
        noPerfumesFound: copy.noPerfumesFound,
        noPerfumesFoundDescription: copy.noPerfumesFoundDescription,
      }}
      priceCopy={copy}
    />
  );

  const perfumePickerModal =
    isPerfumePickerMounted && typeof document !== "undefined"
      ? createPortal(perfumePickerContent, document.body)
      : null;

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY);
    if (savedLocale === "az" || savedLocale === "en") {
      setLocale(savedLocale);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (!perfumes.length) {
      if (selectedPerfumeId) {
        setSelectedPerfumeId("");
      }
      return;
    }

    if (
      !selectedPerfumeId ||
      !perfumes.some((item) => item.id === selectedPerfumeId || item.slug === selectedPerfumeId)
    ) {
      setSelectedPerfumeId(perfumes[0]?.id || perfumes[0]?.slug || "");
    }
  }, [perfumes, selectedPerfumeId]);

  useEffect(() => {
    if (!notes.length) {
      if (selectedNoteSlug) {
        setSelectedNoteSlug("");
      }
      return;
    }

    if (!selectedNoteSlug || !notes.some((item) => item.slug === selectedNoteSlug)) {
      setSelectedNoteSlug(notes[0]?.slug || "");
    }
  }, [notes, selectedNoteSlug]);

  useEffect(() => {
    if (!settings.metaKeywords.length) {
      setMetaKeywordsInput(formatMetaKeywordsInput(settings));
    }
  }, [settings.metaKeywords, settings.siteName]);

  const applyServerData = (
    nextPerfumes: PerfumeDraft[],
    nextNotes: NoteDraft[],
    nextSettings: SiteSettingsDraft,
  ) => {
    setPerfumes(nextPerfumes);
    setNotes(nextNotes);
    setSettings(nextSettings);
    setMetaKeywordsInput(formatMetaKeywordsInput(nextSettings));
    setSavedPerfumes(cloneDeep(nextPerfumes));
    setSavedNotes(cloneDeep(nextNotes));
    setSavedSettings(cloneDeep(nextSettings));
    setSelectedPerfumeId((current) => {
      if (nextPerfumes.some((item) => item.id === current || item.slug === current)) {
        return current;
      }
      return nextPerfumes[0]?.id || nextPerfumes[0]?.slug || "";
    });
    setSelectedNoteSlug((current) => {
      if (nextNotes.some((item) => item.slug === current)) {
        return current;
      }
      return nextNotes[0]?.slug || "";
    });
  };

  // Brand and size utilities
  const DEFAULT_SIZES = [
    { ml: 15, label: "15ML", price: 0 },
    { ml: 30, label: "30ML", price: 0 },
    { ml: 50, label: "50ML", price: 0 },
  ];

  const getAllBrands = (): string[] => {
    const brands = new Set<string>();
    for (const perfume of perfumes) {
      if (perfume.brand?.trim()) {
        brands.add(perfume.brand.trim());
      }
    }
    return Array.from(brands).sort();
  };

  const ensureDefaultSizes = (perfume: PerfumeDraft): PerfumeDraft => {
    // Ensure perfume always has the 3 default sizes
    const sizeMap = new Map(DEFAULT_SIZES.map((s) => [s.ml, s.price]));

    // Update prices from existing sizes
    for (const size of perfume.sizes) {
      if (sizeMap.has(size.ml)) {
        sizeMap.set(size.ml, size.price);
      }
    }

    return {
      ...perfume,
      sizes: DEFAULT_SIZES.map((s) => ({
        ...s,
        price: sizeMap.get(s.ml) ?? 0,
      })),
    };
  };

  const getBrandStats = useMemo(() => {
    const stats = new Map<string, number>();
    for (const perfume of perfumes) {
      if (perfume.brand?.trim()) {
        stats.set(perfume.brand.trim(), (stats.get(perfume.brand.trim()) || 0) + 1);
      }
    }
    return stats;
  }, [perfumes]);

  const brandsWithStats = useMemo(() => {
    return getAllBrands().map((brand) => ({
      name: brand,
      count: getBrandStats.get(brand) || 0,
    }));
  }, [getBrandStats]);

  const renameBrand = (oldBrand: string, newBrand: string) => {
    if (!newBrand.trim() || oldBrand === newBrand) {
      return;
    }

    setPerfumes((current) =>
      current.map((perfume) =>
        perfume.brand === oldBrand
          ? { ...perfume, brand: newBrand.trim() }
          : perfume,
      ),
    );
    setSelectedBrand(newBrand.trim());
    setStatus({ tone: "success", message: `Brand renamed to "${newBrand.trim()}"` });
  };

  const setPerfumeField = <K extends keyof PerfumeDraft>(key: K, value: PerfumeDraft[K]) => {
    if (!selectedPerfume) {
      return;
    }

    setPerfumes((current) =>
      current.map((item) =>
        item.id === selectedPerfume.id
          ? ensureDefaultSizes({
              ...item,
              [key]: value,
            })
          : item,
      ),
    );
  };

  const setHomeHeader = (
    updater: (current: SiteHomeHeaderSettings) => SiteHomeHeaderSettings,
  ) => {
    setSettings((current) => ({
      ...current,
      homeHeader: updater(current.homeHeader),
    }));
  };

  const setHomeHeaderField = <K extends keyof SiteHomeHeaderSettings>(
    key: K,
    value: SiteHomeHeaderSettings[K],
  ) => {
    setHomeHeader((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const setHomeHeaderSlideField = (
    index: number,
    key: keyof SiteHomeHeaderSlide,
    value: string,
  ) => {
    setHomeHeader((current) => ({
      ...current,
      slides: current.slides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, [key]: value } : slide,
      ),
    }));
  };

  const addHomeHeaderSlide = () => {
    const perfume = perfumes[0];
    setHomeHeader((current) => ({
      ...current,
      slides: [
        ...current.slides,
        {
          perfumeSlug: perfume?.slug || "",
          buttonLabel: perfume ? perfume.name : "View perfume",
          description: perfume ? `${perfume.brand} ${perfume.name}` : "",
        },
      ],
    }));
  };

  const chooseHomeHeaderSlidePerfume = (index: number, perfume: PerfumeDraft) => {
    const slug = normalizeSlug(perfume.slug);
    if (!slug) {
      return;
    }

    setHomeHeader((current) => ({
      ...current,
      slides: current.slides.map((slide, slideIndex) =>
        slideIndex === index
          ? {
              ...slide,
              perfumeSlug: slug,
              buttonLabel: perfume.name,
              description: `${perfume.brand} ${perfume.name}`.trim(),
            }
          : slide,
      ),
    }));
    setHeaderSlideSearches((current) => ({
      ...current,
      [index]: `${perfume.brand} ${perfume.name}`.trim(),
    }));
  };

  const removeHomeHeaderSlide = (index: number) => {
    setHomeHeader((current) => ({
      ...current,
      slides: current.slides.filter((_, slideIndex) => slideIndex !== index),
    }));
  };

  const setPerfumeSizeField = (
    index: number,
    field: keyof PerfumeSize,
    value: string,
  ) => {
    if (!selectedPerfume) {
      return;
    }

    setPerfumes((current) =>
      current.map((item) => {
        if (item.id !== selectedPerfume.id) {
          return item;
        }

        const nextSizes = [...item.sizes];
        const currentSize = nextSizes[index];

        if (!currentSize) {
          return item;
        }

        if (field === "label") {
          nextSizes[index] = { ...currentSize, label: value };
        } else {
          const parsed = Number(value);
          nextSizes[index] = {
            ...currentSize,
            [field]: Number.isFinite(parsed) ? parsed : 0,
          };
        }

        return {
          ...item,
          sizes: nextSizes.sort((left, right) => left.ml - right.ml),
        };
      }),
    );
  };

  const updateSelectedPerfumeDiscount = (
    updater: (discount: PerfumeDiscount) => PerfumeDiscount,
  ) => {
    if (!selectedPerfume) {
      return;
    }

    setPerfumes((current) =>
      current.map((item) => {
        if (item.id !== selectedPerfume.id) {
          return item;
        }

        return {
          ...item,
          discount: updater(item.discount ?? getDefaultDiscount()),
        };
      }),
    );
  };

  const addPerfumeSize = () => {
    if (!selectedPerfume) {
      return;
    }

    setPerfumes((current) =>
      current.map((item) =>
        item.id === selectedPerfume.id
          ? {
              ...item,
              sizes: [
                ...item.sizes,
                { label: "100ML", ml: 100, price: 0 },
              ].sort((left, right) => left.ml - right.ml),
            }
          : item,
      ),
    );
  };

  const removePerfumeSize = (index: number) => {
    if (!selectedPerfume) {
      return;
    }

    setPerfumes((current) =>
      current.map((item) =>
        item.id === selectedPerfume.id
          ? {
              ...item,
              sizes: item.sizes.filter((_, sizeIndex) => sizeIndex !== index),
            }
          : item,
      ),
    );
  };

  const setPerfumeNoteSlugs = (group: "top" | "heart" | "base", values: string[]) => {
    if (!selectedPerfume) {
      return;
    }

    setPerfumes((current) =>
      current.map((item) =>
        item.id === selectedPerfume.id
          ? {
              ...item,
              noteSlugs: {
                ...item.noteSlugs,
                [group]: Array.from(new Set(values.map((value) => normalizeSlug(value)).filter(Boolean))),
              },
            }
          : item,
      ),
    );
  };

  const addTokenToGroup = (group: "top" | "heart" | "base") => {
    if (!selectedPerfume) {
      return;
    }

    const token = normalizeSlug(tokenInput[group]);
    if (!token) {
      return;
    }

    if (!selectedPerfume.noteSlugs[group].includes(token)) {
      setPerfumeNoteSlugs(group, [...selectedPerfume.noteSlugs[group], token]);
    }

    setTokenInput((current) => ({ ...current, [group]: "" }));
  };

  const removeTokenFromGroup = (group: "top" | "heart" | "base", token: string) => {
    if (!selectedPerfume) {
      return;
    }

    setPerfumeNoteSlugs(
      group,
      selectedPerfume.noteSlugs[group].filter((item) => item !== token),
    );
  };

  const setNoteField = <K extends keyof NoteDraft>(key: K, value: NoteDraft[K]) => {
    if (!selectedNote) {
      return;
    }

    const nextValue =
      key === "slug" ? (normalizeSlug(value) as NoteDraft[K]) : value;

    setNotes((current) =>
      current.map((item) =>
        item.slug === selectedNote.slug
          ? {
              ...item,
              [key]: nextValue,
            }
          : item,
      ),
    );

    if (key === "slug" && typeof nextValue === "string") {
      setSelectedNoteSlug(nextValue);
    }
  };

  const addPerfume = () => {
    const fresh = createEmptyPerfume();
    setPerfumes((current) => [fresh, ...current]);
    startTransition(() => {
      setView("perfumes");
      setPerfumeEditorTab("basics");
      setSelectedPerfumeId(fresh.id);
    });
    setStatus({ tone: "neutral", message: t("statusNewPerfumeCreated") });
  };

  const duplicatePerfume = () => {
    if (!selectedPerfume) {
      return;
    }

    const seed = Date.now().toString(36);
    const cloned: PerfumeDraft = {
      ...cloneDeep(selectedPerfume),
      id: `${selectedPerfume.id}-copy-${seed}`,
      slug: `${selectedPerfume.slug}-copy-${seed.slice(-4)}`,
      name: `${selectedPerfume.name} Copy`,
    };

    setPerfumes((current) => [cloned, ...current]);
    startTransition(() => {
      setView("perfumes");
      setPerfumeEditorTab("basics");
      setSelectedPerfumeId(cloned.id);
    });
    setStatus({ tone: "neutral", message: t("statusPerfumeDuplicated") });
  };

  const deletePerfume = async () => {
    if (!selectedPerfume) {
      return;
    }

    if (!window.confirm(t("confirmDeletePerfume", { name: selectedPerfume.name }))) {
      return;
    }

    setPerfumes((current) => current.filter((item) => item.id !== selectedPerfume.id));
    setStatus({ tone: "neutral", message: t("statusPerfumeRemoved") });

    // Persist change immediately
    try {
      await onSave();
    } catch {
      // onSave handles setting status on error
    }
  };

  const addNote = () => {
    const fresh = createEmptyNote();
    setNotes((current) => [fresh, ...current]);
    startTransition(() => {
      setView("notes");
      setNoteEditorTab("content");
      setSelectedNoteSlug(fresh.slug);
    });
    setStatus({ tone: "neutral", message: t("statusNewNoteCreated") });
  };

  const duplicateNote = () => {
    if (!selectedNote) {
      return;
    }

    const seed = Date.now().toString(36);
    const cloned: NoteDraft = {
      ...cloneDeep(selectedNote),
      slug: `${selectedNote.slug}-copy-${seed.slice(-4)}`,
      name: `${selectedNote.name} Copy`,
    };

    setNotes((current) => [cloned, ...current]);
    startTransition(() => {
      setView("notes");
      setNoteEditorTab("content");
      setSelectedNoteSlug(cloned.slug);
    });
    setStatus({ tone: "neutral", message: t("statusNoteDuplicated") });
  };

  const deleteNote = async () => {
    if (!selectedNote) {
      return;
    }

    if (!window.confirm(t("confirmDeleteNote", { name: selectedNote.name }))) {
      return;
    }

    setNotes((current) => current.filter((item) => item.slug !== selectedNote.slug));
    setStatus({ tone: "neutral", message: t("statusNoteRemoved") });

    // Persist change immediately
    try {
      await onSave();
    } catch {
      // onSave handles setting status on error
    }
  };

  const cancelEditing = () => {
    setPerfumes(cloneDeep(savedPerfumes));
    setNotes(cloneDeep(savedNotes));
    setSettings(cloneDeep(savedSettings));
    setMetaKeywordsInput(formatMetaKeywordsInput(savedSettings));
    setStatus({ tone: "neutral", message: t("statusWorkspaceReset") });
  };

  const copyToClipboard = async (value: string, label: string) => {
    if (!value) {
      setStatus({ tone: "error", message: t("statusNoValueToCopy", { label }) });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setStatus({ tone: "success", message: t("statusCopied", { label }) });
    } catch {
      setStatus({ tone: "error", message: t("statusCopyFailed", { label }) });
    }
  };

  const uploadImage = async (file: File, folder: "perfumes" | "notes") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const body = await parseResponse(response);

    if (!response.ok || typeof body.url !== "string") {
      throw new Error(String(body.error || t("uploadFailed")));
    }

    return body.url;
  };

  const onUploadPerfumeImage = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedPerfume) {
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setStatus({ tone: "neutral", message: t("statusUploadingPerfumeImage") });

    try {
      const url = await uploadImage(file, "perfumes");
      setPerfumeField("image", url);
      if (!selectedPerfume.imageAlt) {
        setPerfumeField(
          "imageAlt",
          selectedPerfume.name || file.name.replace(/\.[^.]+$/, ""),
        );
      }
      setStatus({ tone: "success", message: t("statusPerfumeImageUploaded") });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("uploadFailed");
      setStatus({ tone: "error", message });
    } finally {
      setUploading(false);
    }
  };

  const onUploadNoteImage = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedNote) {
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setStatus({ tone: "neutral", message: t("statusUploadingNoteImage") });

    try {
      const url = await uploadImage(file, "notes");
      setNoteField("image", url);
      if (!selectedNote.imageAlt) {
        setNoteField("imageAlt", selectedNote.name || file.name.replace(/\.[^.]+$/, ""));
      }
      setStatus({ tone: "success", message: t("statusNoteImageUploaded") });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("uploadFailed");
      setStatus({ tone: "error", message });
    } finally {
      setUploading(false);
    }
  };

  const onRemoveBackgroundPerfume = async () => {
    if (!selectedPerfume?.image) {
      return;
    }

    setRemovingBg(true);
    setStatus({ tone: "neutral", message: copy.removeBgProcessing });

    try {
      const response = await fetch("/api/admin/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedPerfume.image,
          itemSlug: selectedPerfume.slug,
          itemType: "perfume",
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as {
          error?: string;
          setup?: string;
          details?: string;
        };

        // Check if it's a setup error
        if (response.status === 503 && data.setup) {
          const setupMsg = data.setup
            .split("\n")
            .filter((line) => line.trim())
            .slice(0, 5)
            .join("\n");
          throw new Error(
            `Setup needed: ${data.error}\n\n${setupMsg}\n\nSee BACKGROUND_REMOVAL_SETUP.md for full instructions.`,
          );
        }

        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = (await response.json()) as { newImageUrl?: string; download?: { filename?: string; contentType?: string; base64?: string }; uploadedTo?: string; warning?: string };
      if (data.newImageUrl) {
        setPerfumeField("image", data.newImageUrl);
        setStatus({ tone: "success", message: copy.removeBgSuccess });
      } else if (data.download && data.download.base64) {
        // Trigger automatic download of the returned image
        try {
          const byteString = atob(data.download.base64);
          const ia = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ia], { type: data.download.contentType || "image/png" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.download.filename || "image-nobg.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          setStatus({ tone: "success", message: data.warning || copy.removeBgSuccess });
        } catch (e) {
          setStatus({ tone: "error", message: copy.removeBgError });
        }
      } else {
        throw new Error("No image URL in response");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.removeBgError;
      setStatus({ tone: "error", message });
    } finally {
      setRemovingBg(false);
    }
  };

  const onRemoveBackgroundNote = async () => {
    if (!selectedNote?.image) {
      return;
    }

    setRemovingBg(true);
    setStatus({ tone: "neutral", message: copy.removeBgProcessing });

    try {
      const response = await fetch("/api/admin/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedNote.image,
          itemSlug: selectedNote.slug,
          itemType: "note",
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as {
          error?: string;
          setup?: string;
          details?: string;
        };

        // Check if it's a setup error
        if (response.status === 503 && data.setup) {
          const setupMsg = data.setup
            .split("\n")
            .filter((line) => line.trim())
            .slice(0, 5)
            .join("\n");
          throw new Error(
            `Setup needed: ${data.error}\n\n${setupMsg}\n\nSee BACKGROUND_REMOVAL_SETUP.md for full instructions.`,
          );
        }

        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = (await response.json()) as { newImageUrl?: string; download?: { filename?: string; contentType?: string; base64?: string }; uploadedTo?: string; warning?: string };
      if (data.newImageUrl) {
        setNoteField("image", data.newImageUrl);
        setStatus({ tone: "success", message: copy.removeBgSuccess });
      } else if (data.download && data.download.base64) {
        try {
          const byteString = atob(data.download.base64);
          const ia = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ia], { type: data.download.contentType || "image/png" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.download.filename || "image-nobg.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          setStatus({ tone: "success", message: data.warning || copy.removeBgSuccess });
        } catch (e) {
          setStatus({ tone: "error", message: copy.removeBgError });
        }
      } else {
        throw new Error("No image URL in response");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.removeBgError;
      setStatus({ tone: "error", message });
    } finally {
      setRemovingBg(false);
    }
  };

  const onLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus({ tone: "neutral", message: t("signingIn") });

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const body = await parseResponse(response);

      if (!response.ok) {
        setStatus({ tone: "error", message: String(body.error || t("loginFailed")) });
        return;
      }

      const dataResponse = await fetch("/api/admin/data", { method: "GET" });
      const dataBody = await parseResponse(dataResponse);

      if (!dataResponse.ok) {
        setStatus({
          tone: "error",
          message: String(dataBody.error || t("loggedInDataFailed")),
        });
        return;
      }

      const nextPerfumes = safeParsePerfumes(
        JSON.stringify(dataBody.perfumes ?? [], null, 2),
      );
      const nextNotes = safeParseNotes(JSON.stringify(dataBody.notes ?? [], null, 2));
      const nextSettings = normalizeSiteSettings(dataBody.settings);

      applyServerData(nextPerfumes, nextNotes, nextSettings);
      setAuthenticated(true);
      setPassword("");
      setStatus({ tone: "success", message: t("statusWorkspaceReady") });
    } catch {
      setStatus({
        tone: "error",
        message: t("statusLoginFailed"),
      });
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setBusy(true);
    setStatus({ tone: "neutral", message: t("statusClosingSession") });

    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setAuthenticated(false);
      setPassword("");
      setStatus({ tone: "success", message: t("statusLoggedOut") });
    } catch {
      setStatus({ tone: "error", message: t("statusLogoutFailed") });
    } finally {
      setBusy(false);
    }
  };

  const onReload = async () => {
    if (dirty && !window.confirm(t("confirmReload"))) {
      return;
    }

    setBusy(true);
    setStatus({ tone: "neutral", message: t("statusRefreshing") });

    try {
      const response = await fetch("/api/admin/data", { method: "GET" });
      const body = await parseResponse(response);

      if (!response.ok) {
        setStatus({ tone: "error", message: String(body.error || t("refreshFailed")) });
        return;
      }

      const nextPerfumes = safeParsePerfumes(JSON.stringify(body.perfumes ?? [], null, 2));
      const nextNotes = safeParseNotes(JSON.stringify(body.notes ?? [], null, 2));
      const nextSettings = normalizeSiteSettings(body.settings);
      applyServerData(nextPerfumes, nextNotes, nextSettings);
      setStatus({ tone: "success", message: t("statusWorkspaceSynced") });
    } catch {
      setStatus({
        tone: "error",
        message: t("statusRefreshFailed"),
      });
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!dirty) {
      setSaveStatus({ tone: "idle", message: "" });
      setStatus({ tone: "neutral", message: t("statusAlreadySaved") });
      return;
    }

    console.log("[AdminClient] Starting save...");
    setBusy(true);
    if (saveStatusTimerId) {
      clearTimeout(saveStatusTimerId);
      setSaveStatusTimerId(null);
    }
    setSaveStatus({ tone: "saving", message: t("statusSaving") });
    setStatus({ tone: "neutral", message: t("statusSaving") });

    const perfumesPayload = perfumes.map((item) => ({
      ...item,
      slug: normalizeSlug(item.slug) || normalizeSlug(item.name),
      id: item.id || normalizeSlug(item.slug) || normalizeSlug(item.name),
    }));
    const notesPayload = notes.map((item) => ({
      ...item,
      slug: normalizeSlug(item.slug) || normalizeSlug(item.name),
    }));

    console.log("[AdminClient] Payload prepared:", {
      perfumesCount: perfumesPayload.length,
      notesCount: notesPayload.length,
      hasSettings: !!settings,
    });

    try {
      console.log("[AdminClient] Sending PUT request to /api/admin/data...");
      const response = await fetch("/api/admin/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfumes: perfumesPayload,
          notes: notesPayload,
          settings: normalizeSiteSettings(settings),
        }),
      });

      console.log("[AdminClient] Response received. Status:", response.status, response.statusText);
      const body = await parseResponse(response);
      console.log("[AdminClient] Response body:", body);

      if (!response.ok) {
        console.log("[AdminClient] Response not OK. Error:", body.error);
        setSaveStatus({ tone: "error", message: String(body.error || t("saveFailed")) });
        setStatus({ tone: "error", message: String(body.error || t("saveFailed")) });
        return;
      }

      console.log("[AdminClient] Save successful. Applying server data...");
      const nextPerfumes = safeParsePerfumes(JSON.stringify(body.perfumes ?? [], null, 2));
      const nextNotes = safeParseNotes(JSON.stringify(body.notes ?? [], null, 2));
      const nextSettings = normalizeSiteSettings(body.settings);
      applyServerData(nextPerfumes, nextNotes, nextSettings);
      console.log("[AdminClient] Server data applied. Setting success status");
      const successTimer = setTimeout(() => {
        setSaveStatus((current) =>
          current.tone === "success" ? { tone: "idle", message: "" } : current,
        );
        setSaveStatusTimerId(null);
      }, 2200);
      setSaveStatusTimerId(successTimer);
      setSaveStatus({ tone: "success", message: t("statusSaved") });
      setStatus({
        tone: "success",
        message: t("statusSaved"),
      });
    } catch (err) {
      console.log("[AdminClient] Exception during save:", err);
      setSaveStatus({ tone: "error", message: t("statusSaveFailed") });
      setStatus({
        tone: "error",
        message: t("statusSaveFailed"),
      });
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = async (type: "perfumes" | "notes") => {
    setStatus({
      tone: "neutral",
      message: t("statusPreparingExport", {
        type: type === "perfumes" ? copy.perfumes : copy.notes,
      }),
    });

    try {
      const response = await fetch(`/api/admin/export?type=${type}`);

      if (!response.ok) {
        const body = await parseResponse(response);
        setStatus({ tone: "error", message: String(body.error || t("exportFailed")) });
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${type}-export.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setStatus({
        tone: "success",
        message: type === "perfumes" ? t("statusExportedPerfumes") : t("statusExportedNotes"),
      });
    } catch {
      setStatus({ tone: "error", message: t("statusExportFailed") });
    }
  };

  const importCsv = async (type: "perfumes" | "notes", file: File) => {
    setImporting(type);
    setStatus({
      tone: "neutral",
      message: t("statusImportingCsv", {
        type: type === "perfumes" ? copy.perfumes : copy.notes,
      }),
    });

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", file);

      const response = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const body = await parseResponse(response);

      if (!response.ok) {
        setStatus({ tone: "error", message: String(body.error || t("importFailed")) });
        return;
      }

      const nextPerfumes = safeParsePerfumes(JSON.stringify(body.perfumes ?? [], null, 2));
      const nextNotes = safeParseNotes(JSON.stringify(body.notes ?? [], null, 2));
      const nextSettings = normalizeSiteSettings(body.settings);
      applyServerData(nextPerfumes, nextNotes, nextSettings);
      setStatus({
        tone: "success",
        message: type === "perfumes" ? t("statusImportedPerfumes") : t("statusImportedNotes"),
      });
    } catch {
      setStatus({ tone: "error", message: t("statusImportFailed") });
    } finally {
      setImporting(null);
    }
  };

  if (!configured) {
    return (
      <section className={ui.card}>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950">{copy.notEnabledTitle}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          {copy.notEnabledDescription}
        </p>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className={cx(ui.shell, "mx-auto max-w-[68rem]")}>
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,rgba(244,244,245,0.95),rgba(255,255,255,0.92))] p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <Database size={14} weight="bold" />
              {copy.adminWorkspace}
            </div>
            <h1 className="mt-5 text-[2.3rem] font-semibold leading-tight tracking-[-0.06em] text-zinc-950">
              {copy.loginHeroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600">
              {copy.loginHeroDescription}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <WorkspaceStat
                icon={<SquaresFour size={18} weight="bold" />}
                label={copy.editing}
                value={copy.twoDatasets}
                detail={copy.perfumesAndNotesOneView}
              />
              <WorkspaceStat
                icon={<UploadSimple size={18} weight="bold" />}
                label={copy.assets}
                value={copy.mediaReady}
                detail={copy.uploadDirect}
              />
              <WorkspaceStat
                icon={<Rows size={18} weight="bold" />}
                label={copy.bulkOps}
                value={copy.csvImport}
                detail={copy.moveDataFast}
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="max-w-md">
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-zinc-950">
                {copy.loginTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {copy.loginDescription}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  {copy.localeLabel}
                </span>
                {(["az", "en"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cx(
                      "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] transition",
                      locale === option
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50",
                    )}
                    onClick={() => setLocale(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <form className="mt-6 space-y-4" onSubmit={onLogin}>
                <Field label={copy.username}>
                  <input
                    className={ui.input}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    required
                  />
                </Field>

                <Field label={copy.password}>
                  <input
                    type="password"
                    className={ui.input}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </Field>

                <button type="submit" className={ui.primaryButton} disabled={busy}>
                  <Sparkle size={16} weight="bold" />
                  {busy ? copy.signingIn : copy.enterWorkspace}
                </button>
              </form>

              {status ? (
                <div
                  className={cx(
                    "mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium",
                    toneClasses(status.tone),
                  )}
                >
                  <StatusIcon tone={status.tone} />
                  {status.message}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="h-dvh overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 admin-page-enter">
      <div className="flex h-full gap-6 overflow-visible">
        <aside
          className={cx(
            ui.card,
            "relative shrink-0 overflow-visible transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            sidebarCollapsed ? "w-[72px] p-3 pt-3" : "w-[220px] p-3 pt-6",
          )}
        >
          <div className={cx("flex h-full min-h-0 flex-col gap-4 overflow-visible admin-sidebar-enter transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", sidebarCollapsed ? "-translate-x-0" : "translate-x-0")}>
          <div className={cx("flex min-h-0 flex-1 flex-col", sidebarCollapsed ? "items-center" : "") }>
            <div className={cx("flex items-start", sidebarCollapsed ? "justify-center" : "justify-end") }>
              <button
                type="button"
                className={cx(
                  "flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white shadow-sm transition-colors duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200",
                  sidebarCollapsed ? "text-zinc-700 hover:bg-zinc-50" : "mr-[-10px] text-zinc-700 hover:bg-zinc-50",
                )}
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label={sidebarCollapsed ? (locale === "az" ? "Genişləndir" : "Expand sidebar") : (locale === "az" ? "Yığ" : "Collapse sidebar")}
                title={sidebarCollapsed ? (locale === "az" ? "Genişləndir" : "Expand sidebar") : (locale === "az" ? "Yığ" : "Collapse sidebar")}
              >
                <span className="sr-only">{sidebarCollapsed ? (locale === "az" ? "Genişləndir" : "Expand sidebar") : (locale === "az" ? "Yığ" : "Collapse sidebar")}</span>
                <span className="relative flex items-center justify-center">
                  {sidebarCollapsed ? (
                    <CaretRight className="sidebar-toggle-icon inline-flex transition-transform duration-200" size={18} weight="bold" />
                  ) : (
                    <Rows className="sidebar-toggle-icon inline-flex transition-transform duration-200" size={20} weight="bold" />
                  )}
                </span>
              </button>
            </div>

            <div className={cx("mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain", sidebarCollapsed ? "pr-0" : "pr-1")}>
              <div className="space-y-1">
                {[
                  { value: "dashboard", label: copy.dashboard, icon: <TrendUp size={16} weight="bold" /> },
                  { value: "perfumes", label: copy.perfumes, icon: <SquaresFour size={16} weight="bold" /> },
                  { value: "notes", label: copy.notes, icon: <Rows size={16} weight="bold" /> },
                  { value: "brands", label: adminText(locale, "Brendlər", "Brands"), icon: <Package size={16} weight="bold" /> },
                  { value: "promotions", label: copy.promotions, icon: <Sparkle size={16} weight="bold" /> },
                  { value: "branding", label: copy.branding, icon: <TextT size={16} weight="bold" /> },
                  { value: "aiChat", label: copy.aiChat, icon: <UserCircle size={16} weight="bold" /> },
                  { value: "header", label: adminText(locale, "Media", "Media"), icon: <ImageSquare size={16} weight="bold" /> },
                  { value: "qoxunuLogs", label: adminText(locale, "İstifadəçilər", "Users"), icon: <UserCircle size={16} weight="bold" /> },
                  { value: "assistant", label: adminText(locale, "AI köməkçisi", "AI Assistant"), icon: <Sparkle size={16} weight="bold" /> },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={cx(
                      "group relative isolate flex items-center gap-2.5 overflow-hidden text-[13px] font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      item.value === "assistant"
                        ? view === item.value
                          ? "border border-cyan-300/70 bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)]"
                          : "border border-transparent bg-[linear-gradient(135deg,rgba(236,254,255,0.92),rgba(240,249,255,0.78),rgba(250,245,255,0.9))] text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-cyan-200 hover:text-zinc-950 hover:shadow-[0_8px_22px_rgba(14,165,233,0.14)]"
                        : view === item.value
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                      sidebarCollapsed
                        ? "mx-auto h-10 w-10 justify-center rounded-[14px] px-0"
                        : "h-9 w-full justify-start rounded-[11px] px-3",
                    )}
                    onClick={() => {
                      startTransition(() => setView(item.value as AdminView));
                    }}
                    aria-label={item.label}
                    title={item.label}
                  >
                    {item.value === "assistant" ? (
                      <>
                        <span
                          className={cx(
                            "pointer-events-none absolute bg-gradient-to-r from-cyan-400/0 via-white/45 to-fuchsia-400/0 bg-[length:220%_100%] opacity-70 blur-[1px] transition-opacity duration-300 group-hover:opacity-100 animate-shimmer",
                            sidebarCollapsed ? "inset-1 rounded-[12px]" : "inset-0 rounded-[inherit]",
                          )}
                        />
                        <span
                          className={cx(
                            "pointer-events-none absolute bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.65),rgba(255,255,255,0.16)_40%,rgba(255,255,255,0)_72%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                            sidebarCollapsed ? "inset-[2px] rounded-[10px]" : "inset-[1px] rounded-[inherit]",
                          )}
                        />
                      </>
                    ) : null}
                    <span className={cx("relative z-[1] shrink-0 transition-transform duration-300", sidebarCollapsed ? "" : "group-hover:scale-110", item.value === "assistant" ? (view === item.value ? "text-white" : "text-cyan-600 group-hover:text-cyan-700") : view === item.value ? "text-indigo-600" : "text-zinc-400") }>
                      {sidebarCollapsed ? (
                        <span className={cx(
                          "inline-flex h-10 w-10 items-center justify-center rounded-[12px] transition",
                          view === item.value
                            ? item.value === "assistant"
                              ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 text-white"
                              : "bg-indigo-50 text-indigo-600"
                            : "bg-white text-zinc-400",
                        )}>
                          {item.icon}
                        </span>
                      ) : (
                        item.icon
                      )}
                    </span>
                    {!sidebarCollapsed ? <span className={cx("relative z-[1] truncate", item.value === "assistant" && view === item.value ? "drop-shadow-[0_1px_0_rgba(255,255,255,0.22)]" : "")}>{item.label}</span> : null}
                  </button>
                ))}
              </div>

              {!sidebarCollapsed ? (view === "dashboard" ? null : view === "aiChat" ? (
                <div className="mt-5 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-sm font-semibold text-zinc-900">{copy.aiChat}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{copy.aiChatDescription}</p>
                </div>
              ) : view === "qoxunuLogs" ? (
                <div className="mt-5 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-sm font-semibold text-zinc-900">{copy.qoxunuLogs}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{copy.qoxunuLogsDescription}</p>
                </div>
              ) : view === "promotions" ? (
                <div className="mt-5 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-sm font-semibold text-zinc-900">{copy.promotions}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{copy.promotionsDescription}</p>
                </div>
              ) : view === "header" ? (
                <div className="mt-5 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-sm font-semibold text-zinc-900">{copy.header}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{copy.headerDescription}</p>
                </div>
              ) : view === "branding" ? (
                <div className="mt-5 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-sm font-semibold text-zinc-900">{copy.branding}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{copy.brandingDescription}</p>
                </div>
              ) : view === "perfumes" ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button type="button" className={cx(ui.primaryButton, "h-9 px-3 text-[13px]")} onClick={addPerfume}>
                      <Plus size={16} weight="bold" />
                      {copy.addPerfume}
                    </button>
                    <button
                      type="button"
                      className={cx(ui.secondaryButton, "h-9 px-3 text-[13px]")}
                      onClick={duplicatePerfume}
                      disabled={!selectedPerfume}
                    >
                      <CopySimple size={16} weight="bold" />
                      {copy.duplicate}
                    </button>
                    <button
                      type="button"
                      className={cx(ui.dangerButton, "h-9 px-3 text-[13px]")}
                      onClick={deletePerfume}
                      disabled={!selectedPerfume}
                    >
                      <Trash size={16} weight="bold" />
                      {copy.delete}
                    </button>
                  </div>
                </>
              ) : null) : null}
          </div>
          </div>
          </div>
        </aside>

        <div
          key={view}
          className={cx(
            "flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-6 pb-32 pt-0 pr-4 sm:pr-5 lg:pr-6",
            "admin-section-stagger",
          )}
        >
          <div
            className="sticky top-0 z-20 flex flex-col gap-3 rounded-[18px] border border-[#E5E7EB] bg-white/95 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur sm:flex-row sm:items-center sm:justify-between"
          >
            {showTopSearch ? (
              <label className="relative block w-full max-w-2xl flex-1">
                <span className="sr-only">{locale === "az" ? "Axtar..." : "Search..."}</span>
                <MagnifyingGlass
                  size={15}
                  weight="bold"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={perfumePickerQuery}
                  onChange={(event) => {
                    setPerfumePickerQuery(event.target.value);
                    setIsPerfumePickerOpen(true);
                  }}
                  onFocus={() => setIsPerfumePickerOpen(true)}
                  placeholder={locale === "az" ? "Axtar..." : "Search..."}
                  className={cx(
                    "h-11 w-full rounded-full border border-[#E5E7EB] bg-white px-3.5 pl-10 text-sm text-zinc-900 outline-none transition duration-200 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10",
                  )}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                  ⌘K
                </span>
              </label>
            ) : (
              <div className="hidden flex-1 sm:block" />
            )}

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-zinc-600 transition hover:border-[#D1D5DB] hover:bg-zinc-50"
                aria-label={locale === "az" ? "Bildirişlər" : "Notifications"}
              >
                <Bell size={16} weight="bold" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-500" />
              </button>

              <button
                type="button"
                className="flex items-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-left transition hover:border-[#D1D5DB] hover:bg-zinc-50"
                aria-label={locale === "az" ? "Hesab" : "Account"}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                  AA
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-zinc-900">Admin</p>
                  <p className="text-xs text-zinc-500">Super Admin</p>
                </div>
                <UserCircle size={16} weight="bold" className="text-zinc-400" />
              </button>
            </div>
          </div>

          {view === "dashboard" ? (
            <div className="space-y-6">
              <Suspense fallback={<div className="text-center text-sm text-zinc-500">{adminText(locale, "İdarəetmə paneli yüklənir...", "Loading dashboard...")}</div>}>
                <AdminDashboard locale={locale} />
              </Suspense>
            </div>
          ) : view === "assistant" ? (
            <div className="space-y-6">
              <AdminCommandCenter locale={locale} onRefresh={onReload} />
            </div>
          ) : view === "aiChat" ? (
            <div className="space-y-6">
              <AiChatInsights locale={locale} />
            </div>
          ) : view === "qoxunuLogs" ? (
            <div className="space-y-6">
              <QoxunuInsights locale={locale} />
            </div>
          ) : view === "brands" ? (
            <div className="space-y-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-950">{adminText(locale, "Brendlər", "Brands")}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{adminText(locale, `Kataloq üzrə ${brandsWithStats.length} brendi idarə edin`, `Manage ${brandsWithStats.length} brand${brandsWithStats.length === 1 ? "" : "s"} across your catalog`)}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Brands List */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">All Brands</h3>
                    <span className="text-xs font-medium text-zinc-500">{brandsWithStats.length} total</span>
                  </div>

                  {brandsWithStats.length ? (
                    <div className="space-y-2">
                      {brandsWithStats.map((brand, index) => (
                        <button
                          key={`${brand.name}-${index}`}
                          type="button"
                          onClick={() => setSelectedBrand(brand.name)}
                          className={cx(
                            "group w-full rounded-xl border-2 px-4 py-3 text-left transition-all duration-150",
                            selectedBrand === brand.name
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-md"
                              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm active:scale-[0.98]",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className={cx(
                                "truncate font-semibold transition-colors",
                                selectedBrand === brand.name ? "text-white" : "text-zinc-900"
                              )}>
                                {brand.name}
                              </p>
                            </div>
                            <span
                              className={cx(
                                "flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                                selectedBrand === brand.name
                                  ? "bg-white/20 text-white"
                                  : "bg-zinc-100 text-zinc-600",
                              )}
                            >
                              {adminText(locale, `${brand.count} element`, `${brand.count} item${brand.count === 1 ? "" : "s"}`)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-8 text-center">
                      <Package size={24} weight="bold" className="mx-auto mb-2 text-zinc-400" />
                      <p className="text-sm text-zinc-500">{adminText(locale, "Hələ brend yoxdur", "No brands yet")}</p>
                    </div>
                  )}
                </div>

                {/* Edit Panel */}
                <div>
                  {selectedBrand ? (
                    <div className="rounded-xl border-2 border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 p-5 shadow-sm admin-page-enter">
                      <div className="mb-5 flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-zinc-900">{adminText(locale, "Redaktə et", "Edit")}: {selectedBrand}</h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            {adminText(locale, `${getBrandStats.get(selectedBrand) || 0} ətir`, `${getBrandStats.get(selectedBrand) || 0} perfume${(getBrandStats.get(selectedBrand) || 0) === 1 ? "" : "s"}`)}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedBrand("")}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-[0.5px] text-zinc-600 mb-2">
                            {adminText(locale, "Brend adı", "Brand Name")}
                          </label>
                          <input
                            className={cx(
                              "w-full rounded-lg border-2 border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-all",
                              "focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10",
                              "placeholder:text-zinc-400"
                            )}
                            type="text"
                            id="brand-name-input"
                            defaultValue={selectedBrand}
                            placeholder={adminText(locale, "Brend adını daxil edin", "Enter brand name")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const newBrand = (e.target as HTMLInputElement).value.trim();
                                if (newBrand && newBrand !== selectedBrand) {
                                  renameBrand(selectedBrand, newBrand);
                                  setSelectedBrand("");
                                }
                              }
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          className={cx(
                            "w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
                            "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm hover:shadow-md"
                          )}
                          onClick={(e) => {
                            const input = document.getElementById("brand-name-input") as HTMLInputElement;
                            if (input && input.value.trim() && input.value.trim() !== selectedBrand) {
                              renameBrand(selectedBrand, input.value.trim());
                              setSelectedBrand("");
                            }
                          }}
                        >
                          <FloppyDisk size={16} weight="bold" className="mr-1.5 inline" />
                          {adminText(locale, "Dəyişiklikləri saxla", "Save Changes")}
                        </button>

                        <button
                          type="button"
                          className="w-full rounded-lg border-2 border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-all duration-150 hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98]"
                          onClick={() => setSelectedBrand("")}
                        >
                          {adminText(locale, "Ləğv et", "Cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-12 text-center">
                      <Package size={32} weight="bold" className="mx-auto mb-3 text-zinc-300" />
                      <p className="text-sm font-medium text-zinc-600">{adminText(locale, "Brendi redaktə etmək üçün seçin", "Select a brand to edit")}</p>
                      <p className="mt-1 text-xs text-zinc-500">{adminText(locale, "Siyahıdakı istənilən brendi klikləyin", "Click any brand from the list")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === "promotions" ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <Sparkle size={14} weight="bold" />
                    {copy.promotions}
                  </div>
                  <h2 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.05em] text-zinc-950">
                    {copy.promotions}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                    {copy.promotionsDescription}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className={cx(ui.soft, "space-y-5 overflow-visible rounded-[24px] bg-white p-5 sm:p-6")}>
                  <SectionLabel
                    icon={<Sparkle size={16} weight="bold" />}
                    title={copy.promotions}
                    detail={copy.promotionsDescription}
                  />

                  <div className="grid gap-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                      <label className="flex min-h-[76px] cursor-pointer items-center justify-between gap-4 rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3 transition hover:border-zinc-300 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        <span>
                          <span className="block text-sm font-semibold text-zinc-900">{copy.promotionsEnable}</span>
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">
                            {settings.promotions.enabled ? copy.promotionsEnabled : copy.promotionsDisabled}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={settings.promotions.enabled}
                          onChange={(event) => updatePromotionSettings({ enabled: event.target.checked })}
                        />
                        <span className="relative inline-flex h-7 w-12 shrink-0 rounded-full border border-zinc-300 bg-white p-1 transition after:h-5 after:w-5 after:rounded-full after:bg-zinc-300 after:shadow-sm after:transition peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                      </label>

                      <div className="rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] p-2">
                        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                          {copy.promotionsMode}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(["manual", "discount"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => updatePromotionSettings({ mode })}
                              className={cx(
                                "rounded-[14px] border px-4 py-3 text-left text-sm font-semibold transition",
                                settings.promotions.mode === mode
                                  ? "border-indigo-600 bg-indigo-600 text-white shadow-[0_10px_22px_rgba(79,70,229,0.18)]"
                                  : "border-transparent bg-white text-zinc-600 hover:border-zinc-200 hover:text-zinc-950",
                              )}
                            >
                              {mode === "manual" ? copy.promotionsManual : copy.promotionsDiscount}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Field label={copy.promotionsSourcePerfume} hint={copy.promotionsSourcePerfumeHint}>
                      <div className="rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] p-3">
                        <div className="max-h-72 overflow-y-auto pr-1">
                          <div className="grid gap-2 md:grid-cols-2">
                            {promotionTargetPerfumes.map((perfume) => {
                              const selected = settings.promotions.sourcePerfumeSlugs.includes(perfume.slug);

                              return (
                                <button
                                  key={perfume.id}
                                  type="button"
                                  onClick={() => {
                                    const nextSlugs = selected
                                      ? settings.promotions.sourcePerfumeSlugs.filter((slug) => slug !== perfume.slug)
                                      : [...settings.promotions.sourcePerfumeSlugs, perfume.slug];

                                    updatePromotionSettings({
                                      sourcePerfumeSlugs: nextSlugs,
                                      sourcePerfumeSlug: nextSlugs[0] || "",
                                    });
                                  }}
                                  className={cx(
                                    "flex min-h-[72px] items-center gap-3 rounded-[16px] border px-3 py-2 text-left transition",
                                    selected
                                      ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-[0_10px_22px_rgba(79,70,229,0.1)]"
                                      : "border-transparent bg-white text-zinc-700 hover:border-zinc-200 hover:text-zinc-950",
                                  )}
                                >
                                  <span
                                    className={cx(
                                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                                      selected ? "border-indigo-200 bg-white text-indigo-700" : "border-zinc-200 bg-zinc-50 text-zinc-400",
                                    )}
                                  >
                                    {selected ? <CheckCircle size={15} weight="fill" /> : perfume.name.slice(0, 1)}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold">{perfume.name}</span>
                                    <span className="mt-0.5 block truncate text-xs text-zinc-500">{perfume.brand}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={ui.secondaryButton}
                            onClick={() =>
                              updatePromotionSettings({
                                sourcePerfumeSlugs: promotionTargetPerfumes.map((item) => item.slug),
                                sourcePerfumeSlug: promotionTargetPerfumes[0]?.slug || "",
                              })
                            }
                          >
                            {locale === "az" ? "Hamısını seç" : "Select all"}
                          </button>
                          <button
                            type="button"
                            className={ui.secondaryButton}
                            onClick={() =>
                              updatePromotionSettings({ sourcePerfumeSlugs: [], sourcePerfumeSlug: "" })
                            }
                          >
                            {locale === "az" ? "Təmizlə" : "Clear"}
                          </button>
                          <button
                            type="button"
                            className={ui.primaryButton}
                            onClick={() => {
                              if (!promotionSuggestion) {
                                return;
                              }

                              updatePromotionSettings({
                                mode: "discount",
                                textByLocale: promotionSuggestion.textByLocale,
                                text: promotionSuggestion.textByLocale.az,
                                linkHref: promotionSuggestion.linkHref,
                                linkLabel: promotionSuggestion.linkLabel,
                                sourcePerfumeSlugs: promotionSuggestion.sourcePerfumeSlugs,
                                sourcePerfumeSlug: promotionSuggestion.sourcePerfumeSlugs[0] || "",
                              });
                            }}
                            disabled={!promotionSuggestion}
                          >
                            {copy.promotionsGenerate}
                          </button>
                        </div>

                        {settings.promotions.sourcePerfumeSlugs.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {settings.promotions.sourcePerfumeSlugs.map((slug) => {
                              const perfume = perfumes.find((item) => item.slug === slug || item.id === slug);
                              return perfume ? (
                                <div key={slug} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 flex items-center gap-2">
                                  <span className="truncate max-w-[12rem]">{perfume.brand} {perfume.name}</span>
                                  <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-mono text-zinc-600">#{perfume.id}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        ) : null}
                      </div>
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={copy.promotionsLinkHref} hint={copy.promotionsLinkHrefHint}>
                        <input
                          className={ui.input}
                          value={settings.promotions.linkHref}
                          onChange={(event) => updatePromotionSettings({ linkHref: event.target.value })}
                          placeholder="/offers"
                        />
                      </Field>

                      <Field label={copy.promotionsLinkLabel} hint={copy.promotionsLinkLabelHint}>
                        <input
                          className={ui.input}
                          value={promotionLinkLabelValue}
                          onChange={(event) => updatePromotionLinkLabelForLocale(event.target.value)}
                          placeholder={copy.promotionsOpenLink}
                        />
                      </Field>
                    </div>

                    <div className="rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{copy.promotionsText}</p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">{copy.promotionsTextHint}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {PROMOTION_LOCALES.map((promoLocale) => (
                            <button
                              key={promoLocale}
                              type="button"
                              onClick={() => updatePromotionLocale(promoLocale)}
                              className={cx(
                                "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition",
                                promotionEditorLocale === promoLocale
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
                              )}
                            >
                              {promoLocale}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap gap-2">
                          {PROMOTION_COPY_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                const text = buildPromotionTemplateText(
                                  preset.text[promotionEditorLocale],
                                  promotionSourcePerfumes,
                                  promotionEditorLocale,
                                );
                                updatePromotionTextForLocale(text);
                              }}
                              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                              {preset.label[promotionEditorLocale]}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={translatePromotionCopy}
                          disabled={isTranslatingPromotion || (!promotionTextValue.trim() && !promotionLinkLabelValue.trim() && promotionSourcePerfumes.length === 0)}
                          className={ui.secondaryButton}
                        >
                          <Sparkle size={16} weight="fill" />
                          <span>{isTranslatingPromotion ? copy.promotionsTranslateWorking : copy.promotionsTranslate}</span>
                        </button>

                        <span className="text-xs text-zinc-500">{copy.promotionsTranslateHint}</span>
                      </div>
                      <textarea
                        className={cx(ui.textarea, "mt-4 bg-white")}
                        value={promotionTextValue}
                        onChange={(event) => updatePromotionTextForLocale(event.target.value)}
                        rows={3}
                        placeholder={promotionSuggestion?.textByLocale[promotionEditorLocale] || copy.promotionsText}
                      />
                      <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-zinc-500 max-w-full break-words whitespace-normal">
                          {copy.promotionsPreview}: {getPromotionTextForLocale(settings.promotions, promotionEditorLocale) || copy.promotionsPreviewDetail}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={ui.compactButton}
                            onClick={() => {
                              const current = promotionTextValue.trim();
                              if (!current) return;
                              updatePromotionSettings({ messages: [...(settings.promotions.messages || []), current] });
                            }}
                          >
                            Add message
                          </button>
                          <button
                            type="button"
                            className={ui.compactButton}
                            onClick={() => updatePromotionSettings({ messages: [] })}
                          >
                            Clear messages
                          </button>
                        </div>
                      </div>

                      {settings.promotions.messages && settings.promotions.messages.length ? (
                        <div className="mt-3 max-h-40 overflow-auto flex flex-col gap-2">
                          {settings.promotions.messages.map((msg, idx) => (
                            <div key={idx} className="min-w-0 flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                              {editingMessageIndex === idx ? (
                                <div className="flex w-full items-start gap-2">
                                  <textarea
                                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                    value={editingMessageValue}
                                    onChange={(e) => setEditingMessageValue(e.target.value)}
                                    rows={2}
                                  />
                                  <div className="flex flex-col gap-2">
                                    <button
                                      type="button"
                                      className={ui.compactPrimaryButton}
                                      onClick={() => {
                                        const next = [...settings.promotions.messages!];
                                        next[idx] = editingMessageValue.trim() || next[idx];
                                        updatePromotionSettings({ messages: next });
                                        setEditingMessageIndex(null);
                                        setEditingMessageValue("");
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className={ui.compactButton}
                                      onClick={() => {
                                        setEditingMessageIndex(null);
                                        setEditingMessageValue("");
                                      }}
                                    >
                                      {adminText(locale, "Ləğv et", "Cancel")}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="break-words whitespace-normal">{msg}</div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="text-xs text-zinc-500"
                                      onClick={() => {
                                        const next = [...settings.promotions.messages!];
                                        next.splice(idx, 1);
                                        updatePromotionSettings({ messages: next });
                                        if (editingMessageIndex === idx) {
                                          setEditingMessageIndex(null);
                                          setEditingMessageValue("");
                                        }
                                      }}
                                    >
                                      Remove
                                    </button>
                                    <button
                                      type="button"
                                      className="text-xs text-zinc-500"
                                      onClick={() => {
                                        setEditingMessageIndex(idx);
                                        setEditingMessageValue(msg);
                                      }}
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{locale === "az" ? "Yayım vaxtı" : "Schedule"}</p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                              {locale === "az" ? "Bannerin nə vaxt görünüb gizlənəcəyini seçin." : "Choose when the banner appears and hides."}
                            </p>
                          </div>
                          <ClockCounterClockwise size={18} weight="bold" className="text-zinc-400" />
                        </div>
                        <div className="mt-4 grid gap-3">
                          <Field label={locale === "az" ? "Başlanğıc" : "Start"}>
                            <input
                              type="datetime-local"
                              className={ui.input}
                              value={toDateTimeLocalInputValue(settings.promotions.scheduleStartAt)}
                              onChange={(event) => updatePromotionSettings({ scheduleStartAt: event.target.value })}
                            />
                          </Field>
                          <Field label={locale === "az" ? "Bitmə" : "End"}>
                            <input
                              type="datetime-local"
                              className={ui.input}
                              value={toDateTimeLocalInputValue(settings.promotions.scheduleEndAt)}
                              onChange={(event) => updatePromotionSettings({ scheduleEndAt: event.target.value })}
                            />
                          </Field>
                          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-[14px] border border-zinc-200 bg-white px-3 py-2">
                            <span>
                              <span className="block text-sm font-semibold text-zinc-800">{locale === "az" ? "Sayım" : "Countdown"}</span>
                              <span className="mt-0.5 block text-xs text-zinc-500">
                                {settings.promotions.countdownEnabled ? (locale === "az" ? "Aktivdir" : "On") : (locale === "az" ? "Söndürülüb" : "Off")}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={settings.promotions.countdownEnabled}
                              onChange={(event) => updatePromotionSettings({ countdownEnabled: event.target.checked })}
                            />
                            <span className="relative inline-flex h-7 w-12 shrink-0 rounded-full border border-zinc-300 bg-white p-1 transition after:h-5 after:w-5 after:rounded-full after:bg-zinc-300 after:shadow-sm after:transition peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                          </label>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{locale === "az" ? "Görünüş" : "Appearance"}</p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                              {locale === "az" ? "Əsas rəngləri və fon tipini seçin." : "Choose the core colors and background type."}
                            </p>
                          </div>
                          <Sparkle size={18} weight="bold" className="text-zinc-400" />
                        </div>

                        <div className="mt-4 rounded-[14px] border border-zinc-200 bg-white p-1">
                          <div className="grid grid-cols-2 gap-1">
                            {(["solid", "gradient"] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updatePromotionSettings({ backgroundMode: mode })}
                                className={cx(
                                  "h-10 rounded-[11px] text-xs font-semibold uppercase tracking-[0.12em] transition",
                                  settings.promotions.backgroundMode === mode
                                    ? "bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.18)]"
                                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                                )}
                              >
                                {mode === "solid"
                                  ? locale === "az" ? "Sadə" : "Solid"
                                  : locale === "az" ? "Qradient" : "Gradient"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {settings.promotions.backgroundMode === "gradient" ? (
                            <>
                              <Field label={locale === "az" ? "Başlanğıc rəng" : "Gradient from"}>
                                <input
                                  type="color"
                                  className="h-11 w-full rounded-[12px] border border-zinc-200 bg-white p-1"
                                  value={settings.promotions.gradientFrom}
                                  onChange={(event) => updatePromotionSettings({ gradientFrom: event.target.value })}
                                />
                              </Field>
                              <Field label={locale === "az" ? "Son rəng" : "Gradient to"}>
                                <input
                                  type="color"
                                  className="h-11 w-full rounded-[12px] border border-zinc-200 bg-white p-1"
                                  value={settings.promotions.gradientTo}
                                  onChange={(event) => updatePromotionSettings({ gradientTo: event.target.value })}
                                />
                              </Field>
                            </>
                          ) : (
                            <Field label={locale === "az" ? "Arxa fon" : "Background"}>
                              <div className="flex items-center gap-2 rounded-[12px] border border-zinc-200 bg-white p-1.5">
                                <input
                                  type="color"
                                  className="h-8 w-10 rounded-[9px] border-0 bg-transparent p-0"
                                  value={settings.promotions.backgroundColor}
                                  onChange={(event) => updatePromotionSettings({ backgroundColor: event.target.value })}
                                />
                                <input
                                  className="min-w-0 flex-1 border-0 bg-transparent px-1 text-sm font-medium text-zinc-800 outline-none"
                                  value={settings.promotions.backgroundColor}
                                  onChange={(event) => updatePromotionSettings({ backgroundColor: event.target.value })}
                                />
                              </div>
                            </Field>
                          )}
                          <Field label={copy.promotionsTextColor}>
                            <div className="flex items-center gap-2 rounded-[12px] border border-zinc-200 bg-white p-1.5">
                              <input
                                type="color"
                                className="h-8 w-10 rounded-[9px] border-0 bg-transparent p-0"
                                value={settings.promotions.textColor}
                                onChange={(event) => updatePromotionSettings({ textColor: event.target.value })}
                              />
                              <input
                                className="min-w-0 flex-1 border-0 bg-transparent px-1 text-sm font-medium text-zinc-800 outline-none"
                                value={settings.promotions.textColor}
                                onChange={(event) => updatePromotionSettings({ textColor: event.target.value })}
                              />
                            </div>
                          </Field>
                        </div>
                      </div>
                    </div>

                    <details className="group rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
                        <span>
                          <span className="block text-sm font-semibold text-zinc-900">{locale === "az" ? "Əlavə görünüş ayarları" : "Advanced display"}</span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {settings.promotions.speed}s / loop · {settings.promotions.mobileHeight}px · {settings.promotions.mobileTextScale.toFixed(2)}x
                          </span>
                        </span>
                        <CaretRight size={16} weight="bold" className="text-zinc-400 transition group-open:rotate-90" />
                      </summary>
                      <div className="grid gap-4 border-t border-[#E5E7EB] p-4 md:grid-cols-2">
                        {settings.promotions.backgroundMode === "gradient" ? (
                          <Field label={locale === "az" ? "Qradient bucağı" : "Gradient angle"}>
                            <input
                              type="range"
                              min={0}
                              max={180}
                              className="w-full accent-indigo-600"
                              value={settings.promotions.gradientAngle}
                              onChange={(event) => updatePromotionSettings({ gradientAngle: Number(event.target.value) || 110 })}
                            />
                            <div className="mt-1 text-xs text-zinc-500">{settings.promotions.gradientAngle}°</div>
                          </Field>
                        ) : null}

                        <Field label={copy.promotionsSpeed} hint={copy.promotionsSpeedHint}>
                          <input
                            type="range"
                            min={8}
                            max={120}
                            className="w-full accent-indigo-600"
                            value={settings.promotions.speed}
                            onChange={(event) => updatePromotionSettings({ speed: Number(event.target.value) || 28 })}
                          />
                          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                            <span>8s</span>
                            <span>{settings.promotions.speed}s</span>
                            <span>120s</span>
                          </div>
                        </Field>

                        <Field label={locale === "az" ? "Mobil hündürlük" : "Mobile height"}>
                          <input
                            type="range"
                            min={40}
                            max={84}
                            className="w-full accent-indigo-600"
                            value={settings.promotions.mobileHeight}
                            onChange={(event) => updatePromotionSettings({ mobileHeight: Number(event.target.value) || 52 })}
                          />
                          <div className="mt-1 text-xs text-zinc-500">{settings.promotions.mobileHeight}px</div>
                        </Field>

                        <Field label={locale === "az" ? "Mobil mətn ölçüsü" : "Mobile text scale"}>
                          <input
                            type="range"
                            min={0.8}
                            max={1.25}
                            step={0.01}
                            className="w-full accent-indigo-600"
                            value={settings.promotions.mobileTextScale}
                            onChange={(event) => updatePromotionSettings({ mobileTextScale: Number(event.target.value) || 0.94 })}
                          />
                          <div className="mt-1 text-xs text-zinc-500">{settings.promotions.mobileTextScale.toFixed(2)}x</div>
                        </Field>

                        <Field label={locale === "az" ? "Mobil yan boşluq" : "Mobile side padding"}>
                          <input
                            type="range"
                            min={8}
                            max={28}
                            className="w-full accent-indigo-600"
                            value={settings.promotions.mobilePaddingX}
                            onChange={(event) => updatePromotionSettings({ mobilePaddingX: Number(event.target.value) || 16 })}
                          />
                          <div className="mt-1 text-xs text-zinc-500">{settings.promotions.mobilePaddingX}px</div>
                        </Field>
                      </div>
                    </details>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3">
                        <span>
                          <span className="block text-sm font-semibold text-zinc-900">{copy.promotionsClosable}</span>
                          <span className="mt-0.5 block text-xs text-zinc-500">{copy.promotionsClosableHint}</span>
                        </span>
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={settings.promotions.closable}
                          onChange={(event) => updatePromotionSettings({ closable: event.target.checked })}
                        />
                        <span className="relative inline-flex h-7 w-12 shrink-0 rounded-full border border-zinc-300 bg-white p-1 transition after:h-5 after:w-5 after:rounded-full after:bg-zinc-300 after:shadow-sm after:transition peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                      </label>

                      <button
                        type="button"
                        className={ui.secondaryButton}
                        onClick={() => updatePromotionSettings(getDefaultPromotionSettings())}
                      >
                        {copy.promotionsReset}
                      </button>
                    </div>

                    <div className="rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3 text-sm text-zinc-600">
                      <span className="font-semibold text-zinc-900">{copy.promotionsOpenLink}:</span>{" "}
                      {settings.promotions.linkHref ? settings.promotions.linkHref : copy.promotionsNoLink}
                    </div>
                  </div>
                </div>

                <div className={cx(ui.soft, "p-4 sm:p-5")}>
                  <SectionLabel
                    icon={<Sparkle size={16} weight="bold" />}
                    title={copy.promotionsPreview}
                    detail={copy.promotionsPreviewDetail}
                  />

                  <div className="mt-5 overflow-hidden rounded-[1.2rem] border border-zinc-200 shadow-[0_16px_28px_rgba(0,0,0,0.06)]">
                    <div
                        className="promo-banner-shell relative overflow-hidden"
                        style={{
                          backgroundColor: settings.promotions.backgroundColor,
                          backgroundImage: settings.promotions.backgroundMode === "gradient"
                            ? `linear-gradient(${settings.promotions.gradientAngle}deg, ${settings.promotions.gradientFrom}, ${settings.promotions.gradientTo})`
                            : undefined,
                          color: settings.promotions.textColor,
                          ["--promo-banner-mobile-height" as string]: `${settings.promotions.mobileHeight}px`,
                          ["--promo-banner-mobile-text-scale" as string]: String(settings.promotions.mobileTextScale),
                          ["--promo-banner-mobile-padding-x" as string]: `${settings.promotions.mobilePaddingX}px`,
                        }}
                    >
                      <div className="promo-banner-inner brand-marquee-mask">
                        <div
                          className="promo-banner-track brand-marquee-track"
                          style={{ animationDuration: `${settings.promotions.speed}s` }}
                        >
                          <div className="flex items-center gap-5 pr-5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] min-w-0">
                            <span className="whitespace-normal break-words max-w-[60ch]">{promotionPreviewText || copy.promotionsPreview}</span>
                            {settings.promotions.linkLabel ? (
                              <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[0.62rem]">
                                {settings.promotions.linkLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-5 pr-5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] min-w-0" aria-hidden="true">
                            <span className="whitespace-normal break-words max-w-[60ch]">{promotionPreviewText || copy.promotionsPreview}</span>
                            {settings.promotions.linkLabel ? (
                              <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[0.62rem]">
                                {settings.promotions.linkLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                      <p className="font-semibold text-zinc-900">
                        {settings.promotions.enabled ? copy.promotions : copy.promotionsReset}
                      </p>
                      <p className="mt-2 leading-6">
                        {promotionPreviewText || copy.promotionsPreviewDetail}
                      </p>
                      <div className="mt-3 grid gap-2 text-xs uppercase tracking-[0.12em] text-zinc-400">
                        {PROMOTION_LOCALES.map((promoLocale) => (
                          <div key={promoLocale} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-zinc-500">
                            {promoLocale.toUpperCase()}: {getPromotionTextForLocale(settings.promotions, promoLocale) || copy.promotionsPreviewDetail}
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-zinc-400">
                        {settings.promotions.linkHref || copy.promotionsNoLink}
                      </p>
                    </div>
                  </div>

                  <div className={cx(ui.soft, "mt-5 p-4 sm:p-5") }>
                    <SectionLabel
                      icon={<TrendUp size={16} weight="bold" />}
                      title={locale === "az" ? "Promo analitikası" : "Promo analytics"}
                      detail={locale === "az" ? "Hansı banner daha çox klik toplayır və kimlər klikləyir." : "See which promo gets clicked most and who is clicking it."}
                    />

                    {isPromoAnalyticsLoading ? (
                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
                        {locale === "az" ? "Analitika yüklənir..." : "Loading promo analytics..."}
                      </div>
                    ) : promoAnalyticsError ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {promoAnalyticsError}
                      </div>
                    ) : promoAnalytics ? (
                      <div className="mt-4 grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">{locale === "az" ? "Toplam klik" : "Total clicks"}</p>
                            <p className="mt-1 text-2xl font-semibold text-zinc-950">{promoAnalytics.totalClicks}</p>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">{locale === "az" ? "Unikal klik edənlər" : "Unique clickers"}</p>
                            <p className="mt-1 text-2xl font-semibold text-zinc-950">{promoAnalytics.uniqueClickers}</p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{locale === "az" ? "Ən güclü bannerlər" : "Top promos"}</p>
                          <div className="mt-3 grid gap-3">
                            {promoAnalytics.topPromos.length ? promoAnalytics.topPromos.map((item) => (
                              <div key={item.promoKey} className="min-w-0 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-zinc-950">{item.promoLabel || item.promoKey}</p>
                                    <p className="mt-1 truncate text-xs text-zinc-500">{item.promoTarget || "-"}</p>
                                  </div>
                                  <div className="shrink-0 text-right text-xs text-zinc-500">
                                    <p>{item.clicks} clicks</p>
                                    <p>{item.uniqueUsers} users</p>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                                  <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">{locale === "az" ? "Sessiyalar" : "Sessions"}: {item.uniqueSessions}</span>
                                  <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">{locale === "az" ? "Son klik" : "Last click"}: {item.lastClickedAt ? new Date(item.lastClickedAt).toLocaleString() : "-"}</span>
                                </div>
                              </div>
                            )) : (
                              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                                {locale === "az" ? "Hələ klik yoxdur." : "No promo clicks yet."}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{locale === "az" ? "Son klik edənlər" : "Recent clickers"}</p>
                          <div className="mt-3 grid gap-2">
                            {promoAnalytics.recentClicks.length ? promoAnalytics.recentClicks.slice(0, 12).map((item) => (
                              <div key={`${item.sessionId}-${item.createdAt}`} className="min-w-0 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-zinc-950">{item.userEmail || item.userId || item.anonymousId}</p>
                                    <p className="mt-1 truncate text-xs text-zinc-500">{item.promoLabel || item.promoKey}</p>
                                  </div>
                                  <div className="shrink-0 text-right text-xs text-zinc-500">
                                    <p>{item.country || "-"}{item.city ? ` / ${item.city}` : ""}</p>
                                    <p>{item.deviceType || "-"} · {item.browser || "-"}</p>
                                  </div>
                                </div>
                                <p className="mt-2 text-xs text-zinc-400">{new Date(item.createdAt).toLocaleString()}</p>
                              </div>
                            )) : (
                              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                                {locale === "az" ? "Son klik edən yoxdur." : "No recent clickers yet."}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : view === "header" ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <ImageSquare size={14} weight="bold" />
                    {copy.header}
                  </div>
                  <h2 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.05em] text-zinc-950">
                    {copy.header}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                    {copy.headerDescription}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className={cx(ui.soft, "p-4 sm:p-5")}>
                  <SectionLabel
                    icon={<ImageSquare size={16} weight="bold" />}
                    title={copy.headerMode}
                    detail={copy.headerPreviewDetail}
                  />

                  <div className="mt-5 flex flex-wrap gap-2">
                    <TabButton
                      active={settings.homeHeader.mode === "video"}
                      icon={<ImageSquare size={15} weight="bold" />}
                      onClick={() => setHomeHeaderField("mode", "video")}
                    >
                      {copy.headerModeVideo}
                    </TabButton>
                    <TabButton
                      active={settings.homeHeader.mode === "rotating"}
                      icon={<Sparkle size={15} weight="bold" />}
                      onClick={() => setHomeHeaderField("mode", "rotating")}
                    >
                      {copy.headerModeRotating}
                    </TabButton>
                  </div>

                  {settings.homeHeader.mode === "video" ? (
                    <div className="mt-5 grid gap-4">
                      <Field label={copy.headerVideoUrl} hint={adminText(locale, "Mp4 URL və ya /perfumevid.MP4 kimi açıq fayl yolu istifadə edin.", "Use an mp4 URL or a public file path like /perfumevid.MP4")}>
                        <input
                          className={ui.input}
                          value={settings.homeHeader.videoUrl}
                          onChange={(event) => setHomeHeaderField("videoUrl", event.target.value)}
                          placeholder={adminText(locale, "/perfumevid.MP4", "/perfumevid.MP4")}
                        />
                      </Field>
                      <Field label={copy.headerVideoTitle}>
                        <input
                          className={ui.input}
                          value={settings.homeHeader.videoTitle}
                          onChange={(event) => setHomeHeaderField("videoTitle", event.target.value)}
                          placeholder={adminText(locale, "KAY ALI Ətirləri", "KAY ALI Perfumes")}
                        />
                      </Field>
                      <Field label={copy.headerVideoDescription}>
                        <textarea
                          className={ui.textarea}
                          value={settings.homeHeader.videoDescription}
                          onChange={(event) => setHomeHeaderField("videoDescription", event.target.value)}
                          rows={3}
                          placeholder={adminText(locale, "Bütün KAY ALI kolleksiyasını kəşf edin.", "Discover the full KAY ALI collection.")}
                        />
                      </Field>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label={copy.headerVideoCtaLabel}>
                          <input
                            className={ui.input}
                            value={settings.homeHeader.videoCtaLabel}
                            onChange={(event) => setHomeHeaderField("videoCtaLabel", event.target.value)}
                            placeholder={adminText(locale, "Bütün brendlərə bax", "View all brands")}
                          />
                        </Field>
                        <Field label={copy.headerVideoCtaHref}>
                          <input
                            className={ui.input}
                            value={settings.homeHeader.videoCtaHref}
                            onChange={(event) => setHomeHeaderField("videoCtaHref", event.target.value)}
                            placeholder="/brands"
                          />
                        </Field>
                      </div>

                      <div className="mt-2 rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{copy.headerTranslations}</p>
                            <p className="mt-1 text-xs text-zinc-500">{copy.headerTranslationsHint}</p>
                          </div>
                          <button
                            type="button"
                            className={cx(ui.compactButton, "border-zinc-300 bg-white text-zinc-700")}
                            disabled={isTranslatingHeader || !settings.homeHeader.videoTitle.trim()}
                            onClick={translateHeaderCopy}
                          >
                            <ArrowsClockwise size={14} />
                            <span className="ml-2">{isTranslatingHeader ? copy.headerTranslateWorking : copy.headerTranslate}</span>
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(["az", "en", "ru"] as const).map((loc) => (
                            <button
                              key={`header-locale-${loc}`}
                              type="button"
                              className={cx(
                                ui.compactButton,
                                headerEditorLocale === loc
                                  ? "border-zinc-900 bg-zinc-900 text-white"
                                  : "border-zinc-300 bg-white text-zinc-700",
                              )}
                              onClick={() => setHeaderEditorLocale(loc)}
                            >
                              {loc.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 grid gap-4">
                          <Field label={copy.headerVideoTitle}>
                            <input
                              className={ui.input}
                              value={((settings.homeHeader.videoTitleByLocale ?? {}) as any)[headerEditorLocale] ?? ""}
                              onChange={(event) =>
                                updateHeaderLocaleField(headerEditorLocale, "videoTitleByLocale", event.target.value)
                              }
                              placeholder="KAY ALI Perfumes"
                            />
                          </Field>
                          <Field label={copy.headerVideoDescription}>
                            <textarea
                              className={ui.textarea}
                              value={((settings.homeHeader.videoDescriptionByLocale ?? {}) as any)[headerEditorLocale] ?? ""}
                              onChange={(event) =>
                                updateHeaderLocaleField(headerEditorLocale, "videoDescriptionByLocale", event.target.value)
                              }
                              rows={3}
                              placeholder="Discover the full KAY ALI collection."
                            />
                          </Field>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label={copy.headerVideoCtaLabel}>
                              <input
                                className={ui.input}
                                value={((settings.homeHeader.videoCtaLabelByLocale ?? {}) as any)[headerEditorLocale] ?? ""}
                                onChange={(event) =>
                                  updateHeaderLocaleField(headerEditorLocale, "videoCtaLabelByLocale", event.target.value)
                                }
                                placeholder="View all brands"
                              />
                            </Field>
                            <Field label={copy.headerVideoCtaHref}>
                              <input
                                className={ui.input}
                                value={settings.homeHeader.videoCtaHref}
                                onChange={(event) => setHomeHeaderField("videoCtaHref", event.target.value)}
                                placeholder="/brands"
                              />
                            </Field>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4">
                      <Field label={copy.headerRotatingMode}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={cx(
                              ui.compactButton,
                              settings.homeHeader.rotationMode === "random"
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-300 bg-white text-zinc-700",
                            )}
                            onClick={() => setHomeHeaderField("rotationMode", "random")}
                          >
                            {copy.headerRandomMode}
                          </button>
                          <button
                            type="button"
                            className={cx(
                              ui.compactButton,
                              settings.homeHeader.rotationMode === "selected"
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-300 bg-white text-zinc-700",
                            )}
                            onClick={() => setHomeHeaderField("rotationMode", "selected")}
                          >
                            {copy.headerSelectedMode}
                          </button>
                        </div>
                      </Field>

                      {settings.homeHeader.rotationMode === "selected" ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">{copy.headerSlides}</p>
                              <p className="mt-1 text-xs text-zinc-500">{copy.headerPreviewDetail}</p>
                            </div>
                            <button type="button" className={ui.secondaryButton} onClick={addHomeHeaderSlide}>
                              <Plus size={16} weight="bold" />
                              {copy.headerAddSlide}
                            </button>
                          </div>

                          <div className="mt-4 space-y-3">
                            {settings.homeHeader.slides.length ? settings.homeHeader.slides.map((slide, index) => (
                              <div key={`${slide.perfumeSlug}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
                                  <Field label={copy.headerSlidePerfume} hint={copy.headerSlideSearchHint}>
                                    <div className="grid gap-3">
                                      {(() => {
                                        const selectedPickerPerfume = perfumePickerOptions.find(
                                          (item) => item.slug === normalizeSlug(slide.perfumeSlug),
                                        ) || null;
                                        const slideSearch = deferredHeaderSlideSearches[index] ?? "";
                                        const normalizedSlideSearch = normalizeSearchText(slideSearch);
                                        const slideSearchTokens = tokenizeSearch(normalizedSlideSearch);
                                        const slidePerfumeResults = perfumePickerOptions
                                          .filter((item) => {
                                            if (!normalizedSlideSearch) return true;
                                            const pool = normalizeSearchText([item.label, item.slug].join(" "));
                                            return slideSearchTokens.length
                                              ? slideSearchTokens.every((token) => pool.includes(token))
                                              : pool.includes(normalizedSlideSearch);
                                          })
                                          .slice(0, 8);
                                        const showSlideResults = normalizedSlideSearch.length > 0;

                                        return (
                                          <>
                                            {selectedPickerPerfume ? (
                                              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5">
                                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                                                  <Image
                                                    src={selectedPickerPerfume.image}
                                                    alt={selectedPickerPerfume.imageAlt}
                                                    fill
                                                    sizes="64px"
                                                    className="object-cover"
                                                  />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-semibold text-zinc-900">
                                                    {selectedPickerPerfume.name}
                                                  </p>
                                                  <p className="truncate text-xs text-zinc-500">
                                                    {selectedPickerPerfume.brand} · {selectedPickerPerfume.slug}
                                                  </p>
                                                </div>
                                                <button
                                                  type="button"
                                                  className={ui.secondaryButton}
                                                  onClick={() => {
                                                    setHomeHeaderSlideField(index, "perfumeSlug", "");
                                                    setHeaderSlideSearches((current) => ({ ...current, [index]: "" }));
                                                  }}
                                                >
                                                  {copy.headerSlideClear}
                                                </button>
                                              </div>
                                            ) : null}

                                            <label className="relative block">
                                              <span className="sr-only">{copy.headerSlidePerfume}</span>
                                              <MagnifyingGlass
                                                size={16}
                                                weight="bold"
                                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                                              />
                                              <input
                                                className={cx(ui.input, "pl-11")}
                                                value={slideSearch}
                                                onChange={(event) =>
                                                  setHeaderSlideSearches((current) => ({
                                                    ...current,
                                                    [index]: event.target.value,
                                                  }))
                                                }
                                                placeholder={copy.headerSlideSearchPlaceholder}
                                              />
                                            </label>

                                            {showSlideResults ? (
                                              <div className="max-h-72 overflow-auto rounded-2xl border border-zinc-200 bg-white p-3">
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                  {slidePerfumeResults.length ? slidePerfumeResults.map((item) => {
                                                    const isSelected = item.slug === normalizeSlug(slide.perfumeSlug);
                                                    const matchingPerfume = perfumes.find(
                                                      (perfume) => normalizeSlug(perfume.slug) === item.slug,
                                                    );

                                                    if (!matchingPerfume) {
                                                      return null;
                                                    }

                                                    return (
                                                      <button
                                                        key={`${item.slug}-${index}`}
                                                        type="button"
                                                        onClick={() => chooseHomeHeaderSlidePerfume(index, matchingPerfume)}
                                                        className={cx(
                                                          "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200",
                                                          isSelected
                                                            ? "border-zinc-900 bg-zinc-900 text-white"
                                                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white",
                                                        )}
                                                      >
                                                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                                                          <Image
                                                            src={item.image}
                                                            alt={item.imageAlt}
                                                            fill
                                                            sizes="56px"
                                                            className="object-cover"
                                                          />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                          <p className="truncate text-sm font-semibold">
                                                            {item.name}
                                                          </p>
                                                          <p className={cx("truncate text-xs", isSelected ? "text-white/70" : "text-zinc-500")}>
                                                            {item.brand} · {item.slug}
                                                          </p>
                                                        </div>
                                                        <span className={cx("text-xs font-semibold", isSelected ? "text-white" : "text-zinc-500")}>
                                                          {isSelected ? copy.headerSlideSelected : copy.headerSlideChoose}
                                                        </span>
                                                      </button>
                                                    );
                                                  }) : (
                                                    <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 sm:col-span-2">
                                                      {locale === "az"
                                                        ? "Uyğun ətir tapılmadı. Fərqli ad və ya brend yazın."
                                                        : "No matching perfume found. Try another name or brand."}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ) : (
                                              <p className="text-xs text-zinc-500">
                                                {locale === "az"
                                                  ? "Nəticələr yalnız axtarış yazdıqda görünəcək."
                                                  : "Results will appear only after you start typing."}
                                              </p>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </Field>
                                  <Field label={copy.headerSlideButtonLabel}>
                                    <input
                                      className={ui.input}
                                      value={slide.buttonLabel}
                                      onChange={(event) => setHomeHeaderSlideField(index, "buttonLabel", event.target.value)}
                                      placeholder="Explore now"
                                    />
                                  </Field>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                  <Field label={copy.headerSlideDescription}>
                                    <textarea
                                      className={ui.textarea}
                                      rows={2}
                                      value={slide.description}
                                      onChange={(event) => setHomeHeaderSlideField(index, "description", event.target.value)}
                                      placeholder="Short supporting copy for the slide."
                                    />
                                  </Field>
                                  <button
                                    type="button"
                                    className={ui.dangerButton}
                                    onClick={() => removeHomeHeaderSlide(index)}
                                  >
                                    <Trash size={16} weight="bold" />
                                    {copy.headerSlideRemove}
                                  </button>
                                </div>
                              </div>
                            )) : (
                              <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
                                {locale === "az"
                                  ? "Hələ slayd seçilməyib. İlk ətiri əlavə edin."
                                  : "No slides yet. Add the first perfume slide."}
                              </div>
                            )}
                          </div>

                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className={cx(ui.soft, "p-4 sm:p-5")}>
                  <SectionLabel
                    icon={<Sparkle size={16} weight="bold" />}
                    title={copy.headerPreview}
                    detail={copy.headerPreviewDetail}
                  />

                  <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white p-4">
                    {settings.homeHeader.mode === "video" ? (
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-[1.4rem] bg-zinc-950">
                          <video
                            src={settings.homeHeader.videoUrl || "/perfumevid.MP4"}
                            className="aspect-[9/16] w-full object-cover"
                            muted
                            loop
                            playsInline
                            autoPlay
                          />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                          {settings.homeHeader.videoTitle}
                        </p>
                        <p className="text-sm leading-6 text-zinc-600">
                          {settings.homeHeader.videoDescription}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                            {settings.homeHeader.videoCtaLabel}
                          </span>
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                            {settings.homeHeader.videoCtaHref}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {settings.homeHeader.rotationMode === "selected" && settings.homeHeader.slides.length ? (
                          settings.homeHeader.slides.slice(0, 3).map((slide, index) => {
                            const perfume = perfumes.find((item) => item.slug === slide.perfumeSlug || item.id === slide.perfumeSlug);
                            return (
                              <div key={`${slide.perfumeSlug}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                                  {perfume ? `${perfume.brand} ${perfume.name}` : slide.perfumeSlug}
                                </p>
                                <p className="mt-1 text-sm font-medium text-zinc-900">{slide.buttonLabel}</p>
                                <p className="mt-1 text-sm leading-6 text-zinc-600">{slide.description}</p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                            {locale === "az"
                              ? "Təsadüfi rejim aktivdir. Başlıq mövcud seçilmiş ətirlərdən avtomatik qurulacaq."
                              : "Random mode is active. The header will rotate through the selected perfume pool automatically."}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : view === "branding" ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <TextT size={14} weight="bold" />
                    {copy.branding}
                  </div>
                  <h2 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.05em] text-zinc-950">
                    {siteName}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                    {copy.brandingDescription}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className={cx(ui.soft, "p-4 sm:p-5")}>
                  <SectionLabel
                    icon={<TextT size={16} weight="bold" />}
                    title={copy.siteName}
                    detail={copy.siteNameHint}
                  />

                  <div className="mt-5 grid gap-4">
                    <Field label={copy.siteName} hint={copy.siteNameHint}>
                      <input
                        className={ui.input}
                        value={settings.siteName}
                        onChange={(event) =>
                          setSettings((current) =>
                            updateSiteSettingsForNameChange(current, event.target.value),
                          )
                        }
                        placeholder={DEFAULT_SITE_NAME}
                      />
                    </Field>

                    <Field label={copy.siteDomain} hint={copy.siteDomainHint}>
                      <input
                        className={ui.input}
                        value={settings.siteDomain}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            siteDomain: event.target.value,
                          }))
                        }
                        placeholder="brand.az"
                      />
                    </Field>

                    <Field label={copy.siteTitle}>
                      <input
                        className={ui.input}
                        value={settings.siteTitle}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            siteTitle: event.target.value,
                          }))
                        }
                        placeholder={buildDefaultSiteTitle(siteName)}
                      />
                    </Field>

                    <Field label={copy.siteDescription}>
                      <textarea
                        className={ui.textarea}
                        value={settings.siteDescription}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            siteDescription: event.target.value,
                          }))
                        }
                        rows={4}
                        placeholder={buildDefaultSiteDescription(siteName)}
                      />
                    </Field>

                    <Field
                      label={copy.metaKeywords}
                      hint={`${copy.metaKeywordsHint} ${t("metaKeywordsCount", {
                        count: effectiveMetaKeywords.length || DEFAULT_SITE_META_KEYWORD_COUNT,
                      })}`}
                    >
                      <textarea
                        className={ui.textarea}
                        value={metaKeywordsInput}
                        onChange={(event) =>
                          {
                            const nextValue = event.target.value;
                            setMetaKeywordsInput(nextValue);
                            setSettings((current) => ({
                              ...current,
                              metaKeywords: normalizeKeywordList(nextValue),
                            }));
                          }
                        }
                        rows={8}
                        placeholder={formatMetaKeywordsInput({
                          ...settings,
                          metaKeywords: [],
                        })}
                      />
                    </Field>

                    <Field label={copy.openGraphTitle}>
                      <input
                        className={ui.input}
                        value={settings.openGraphTitle}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            openGraphTitle: event.target.value,
                          }))
                        }
                        placeholder={settings.siteTitle}
                      />
                    </Field>

                    <Field label={copy.openGraphDescription}>
                      <textarea
                        className={ui.textarea}
                        value={settings.openGraphDescription}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            openGraphDescription: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder={settings.siteDescription}
                      />
                    </Field>

                    <Field label={copy.twitterTitle}>
                      <input
                        className={ui.input}
                        value={settings.twitterTitle}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            twitterTitle: event.target.value,
                          }))
                        }
                        placeholder={settings.siteTitle}
                      />
                    </Field>

                    <Field label={copy.twitterDescription}>
                      <textarea
                        className={ui.textarea}
                        value={settings.twitterDescription}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            twitterDescription: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder={settings.siteDescription}
                      />
                    </Field>
                  </div>
                </div>

                <div className={cx(ui.soft, "p-4 sm:p-5")}>
                  <SectionLabel
                    icon={<Sparkle size={16} weight="bold" />}
                    title={copy.brandingPreview}
                    detail={copy.brandingPreviewDetail}
                  />

                  <div className="mt-5 rounded-[1.2rem] border border-zinc-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                      {copy.brandingPreview}
                    </p>
                    <p className="mt-3 text-lg font-semibold text-zinc-950">
                      {settings.siteTitle}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {settings.siteDescription}
                    </p>
                    <p className="mt-3 text-sm font-medium text-zinc-700">
                      OG: {settings.openGraphTitle}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {settings.openGraphDescription}
                    </p>
                    <p className="mt-3 text-sm font-medium text-zinc-700">
                      X/Twitter: {settings.twitterTitle}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {settings.twitterDescription}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.12em] text-zinc-400">
                      {settings.siteDomain}
                    </p>
                  </div>
                </div>

                <div className={cx(ui.soft, "p-4 sm:p-5")}>
                  <SectionLabel
                    icon={<DownloadSimple size={16} weight="bold" />}
                    title={copy.dataOperations}
                    detail={copy.dataOperationsDescription}
                  />

                  <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <button
                      className={cx(ui.secondaryButton, "w-full justify-start")}
                      type="button"
                      onClick={() => downloadCsv("perfumes")}
                      disabled={isWorking}
                    >
                      <DownloadSimple size={16} weight="bold" />
                      {copy.exportPerfumesCsv}
                    </button>
                    <button
                      className={cx(ui.secondaryButton, "w-full justify-start")}
                      type="button"
                      onClick={() => downloadCsv("notes")}
                      disabled={isWorking}
                    >
                      <DownloadSimple size={16} weight="bold" />
                      {copy.exportNotesCsv}
                    </button>
                    <button
                      className={cx(ui.secondaryButton, "w-full justify-start")}
                      type="button"
                      onClick={() => perfumeImportRef.current?.click()}
                      disabled={isWorking}
                    >
                      <UploadSimple size={16} weight="bold" />
                      {importing === "perfumes" ? copy.importingPerfumes : copy.importPerfumesCsv}
                    </button>
                    <button
                      className={cx(ui.secondaryButton, "w-full justify-start")}
                      type="button"
                      onClick={() => noteImportRef.current?.click()}
                      disabled={isWorking}
                    >
                      <UploadSimple size={16} weight="bold" />
                      {importing === "notes" ? copy.importingNotes : copy.importNotesCsv}
                    </button>
                    <input
                      ref={perfumeImportRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) {
                          void importCsv("perfumes", file);
                        }
                      }}
                    />
                    <input
                      ref={noteImportRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) {
                          void importCsv("notes", file);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : view === "perfumes" ? (
            selectedPerfume ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      {copy.perfumes} / {selectedPerfume.brand || "Unbranded"}
                    </div>
                    <h2 className="mt-3 text-[clamp(2rem,2.6vw,2.8rem)] font-semibold tracking-[-0.06em] text-zinc-950">
                      {selectedPerfume.name}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {[
                        selectedPerfume.brand || "Unbranded",
                        selectedPerfume.gender || "Unspecified",
                        t("sizeCount", { count: selectedPerfume.sizes.length }),
                        t("noteLinksCount", {
                          count:
                            selectedPerfume.noteSlugs.top.length +
                            selectedPerfume.noteSlugs.heart.length +
                            selectedPerfume.noteSlugs.base.length,
                        }),
                      ].map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-medium text-zinc-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <button
                      type="button"
                      className={ui.secondaryButton}
                      onClick={() => window.open(selectedPerfume.image || selectedPerfumeProductUrl, "_blank", "noopener,noreferrer")}
                    >
                      <ImageSquare size={16} weight="bold" />
                      Preview
                    </button>
                    <a
                      className={ui.secondaryButton}
                      href={selectedPerfumeProductUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Link size={16} weight="bold" />
                      {adminText(locale, "Məhsulu aç", "Open Product")}
                    </a>
                    <button type="button" className={ui.primaryButton} onClick={onSave} disabled={busy}>
                      <FloppyDisk size={16} weight="bold" />
                      {adminText(locale, "Dəyişiklikləri saxla", "Save Changes")}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 border-b border-[#E5E7EB] pb-1">
                  <TabButton
                    active={perfumeEditorTab === "basics"}
                    icon={<TextT size={15} weight="bold" />}
                    onClick={() => startTransition(() => setPerfumeEditorTab("basics"))}
                  >
                    Basics
                  </TabButton>
                  <TabButton
                    active={perfumeEditorTab === "notes"}
                    icon={<Tag size={15} weight="bold" />}
                    onClick={() => startTransition(() => setPerfumeEditorTab("notes"))}
                  >
                    Notes
                  </TabButton>
                  <TabButton
                    active={perfumeEditorTab === "discounts"}
                    icon={<TrendUp size={15} weight="bold" />}
                    onClick={() => startTransition(() => setPerfumeEditorTab("discounts"))}
                  >
                    {copy.discounts}
                  </TabButton>
                  <TabButton
                    active={perfumeEditorTab === "media"}
                    icon={<ImageSquare size={15} weight="bold" />}
                    onClick={() => startTransition(() => setPerfumeEditorTab("media"))}
                  >
                    Media
                  </TabButton>
                </div>

                {perfumeEditorTab === "basics" ? (
                  <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                      <div className={cx(ui.soft, "p-4 sm:p-5")}>
                        <SectionLabel
                          icon={<TextT size={16} weight="bold" />}
                          title="Core details"
                          detail="Keep the main catalog identity clean and consistent across the storefront."
                        />

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <Field label="Perfume name">
                            <input
                              className={ui.input}
                              value={selectedPerfume.name}
                              onChange={(event) => setPerfumeField("name", event.target.value)}
                              placeholder="Maison Francis Kurkdjian Baccarat Rouge 540"
                            />
                          </Field>
                          <Field label={copy.brand}>
                            <BrandSelector
                              value={selectedPerfume.brand}
                              onChange={(brand) => setPerfumeField("brand", brand)}
                              brands={getAllBrands()}
                              placeholder={adminText(locale, "Brend seçin və ya yazın", "Select or type brand name")}
                            />
                          </Field>
                          <Field label={copy.slug} hint={adminText(locale, "Sayt üzrə istifadə olunan kiçik hərfli URL açarı", "Lowercase URL key used across the site")}>
                            <input
                              className={ui.input}
                              value={selectedPerfume.slug}
                              onChange={(event) =>
                                setPerfumeField("slug", normalizeSlug(event.target.value))
                              }
                              placeholder="baccarat-rouge-540"
                            />
                          </Field>
                          <Field label="Gender">
                            <input
                              className={ui.input}
                              value={selectedPerfume.gender}
                              onChange={(event) => setPerfumeField("gender", event.target.value)}
                              placeholder="Unisex"
                            />
                          </Field>
                        </div>

                        <div className="mt-4">
                          <Field label="External link">
                            <input
                              className={ui.input}
                              value={selectedPerfume.externalLink}
                              onChange={(event) =>
                                setPerfumeField("externalLink", event.target.value)
                              }
                              placeholder="https://..."
                            />
                          </Field>
                        </div>
                      </div>

                      <div className={cx(ui.soft, "p-4 sm:p-5")}>
                        <SectionLabel
                          icon={<Rows size={16} weight="bold" />}
                          title="Size matrix"
                          detail="Standard sizes: 15ML, 30ML, 50ML. Edit prices only."
                        />

                        <div className="mt-5 space-y-3">
                          {selectedPerfume.sizes.map((size, index) => (
                            <div
                              key={`${size.label}-${index}`}
                              className="grid gap-3 rounded-[16px] border border-[#E5E7EB] bg-white p-3.5 md:grid-cols-[auto_1fr]"
                            >
                              <Field label="Size">
                                <div className="flex h-11 items-center rounded-[12px] border border-[#E5E7EB] bg-zinc-50 px-3 font-mono text-sm font-semibold text-zinc-700">
                                  {size.label}
                                </div>
                              </Field>
                              <Field label="Price">
                                <input
                                  type="number"
                                  className={ui.input}
                                  value={size.price}
                                  onChange={(event) =>
                                    setPerfumeSizeField(index, "price", event.target.value)
                                  }
                                  min="0"
                                  step="0.01"
                                />
                              </Field>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className={cx(ui.soft, "p-4 sm:p-5") }>
                        <SectionLabel
                          icon={<ImageSquare size={16} weight="bold" />}
                          title="Image preview"
                          detail="Large preview with replace and delete actions."
                        />

                        <div className="mt-5 space-y-4">
                          <ImagePreview
                            src={selectedPerfume.image}
                            alt={selectedPerfume.imageAlt || selectedPerfume.name}
                            emptyLabel={copy.uploadPerfumePreview}
                          />

                          <div className="rounded-[18px] border border-dashed border-[#D1D5DB] bg-white p-4">
                            <p className="text-sm font-semibold text-zinc-900">{adminText(locale, "Şəkli buraya atın və ya yenisi ilə dəyişin", "Drop image or replace it")}</p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">{adminText(locale, "Tövsiyə: 1200x1200px JPG və ya PNG, maksimum 2 MB.", "Recommended: 1200x1200px JPG or PNG, max 2MB.")}</p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={ui.primaryButton}
                                onClick={() => perfumeImageInputRef.current?.click()}
                                disabled={uploading}
                              >
                                <UploadSimple size={16} weight="bold" />
                                {selectedPerfume.image ? copy.replaceImage : copy.uploadImage}
                              </button>
                              <button
                                type="button"
                                className={ui.secondaryButton}
                                onClick={() => void copyToClipboard(selectedPerfume.image, copy.imageUrl)}
                              >
                                <CopySimple size={16} weight="bold" />
                                {copy.copyImageUrl}
                              </button>
                              <button
                                type="button"
                                className={ui.secondaryButton}
                                onClick={() => void onRemoveBackgroundPerfume()}
                                disabled={!selectedPerfume.image || removingBg}
                                title={copy.removeBgTooltip}
                              >
                                <Sparkle size={16} weight="bold" />
                                {removingBg ? copy.removeBgProcessing : copy.removeBg}
                              </button>
                              <button
                                type="button"
                                className={ui.secondaryButton}
                                onClick={() => {
                                  setResizeScale(1);
                                  setResizeModalOpen(true);
                                }}
                                disabled={!selectedPerfume.image}
                              >
                                <MagnifyingGlass size={16} weight="bold" />
                                Resize preview
                              </button>
                              <input
                                ref={perfumeImageInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(event) => {
                                  void onUploadPerfumeImage(event);
                                }}
                              />
                            </div>

                            <div className="mt-4 grid gap-2 text-xs text-zinc-500">
                              <p>Image URL: {selectedPerfume.image || "Not set"}</p>
                              <p>Alt text: {selectedPerfume.imageAlt || "Not set"}</p>
                            </div>
                          </div>

                          <Field label={adminText(locale, "Məhsul səhifəsini aç", "Open product page")}>
                            <a
                              className={ui.secondaryButton}
                              href={selectedPerfumeProductUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Link size={16} weight="bold" />
                              {copy.openProductPage}
                            </a>
                          </Field>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {perfumeEditorTab === "discounts" ? (
                  <div className="mt-6 space-y-6">
                    <div className={cx(ui.soft, "overflow-visible rounded-[24px] bg-white p-5 sm:p-6")}>
                      <SectionLabel
                        icon={<TrendUp size={16} weight="bold" />}
                        title={copy.discountControls}
                        detail={copy.discountControlsDescription}
                      />

                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <label className="group flex min-h-[72px] items-center justify-between gap-4 rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3 transition hover:border-zinc-300 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                          <span>
                            <span className="block text-sm font-semibold text-zinc-800">{copy.discountActive}</span>
                            <span className="mt-1 block text-xs text-zinc-500">{copy.discountActiveHint}</span>
                          </span>
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={selectedPerfumeDiscount.enabled}
                            onChange={(event) =>
                              updateSelectedPerfumeDiscount((discount) => ({
                                ...discount,
                                enabled: event.target.checked,
                              }))
                            }
                          />
                          <span className="relative inline-flex h-7 w-12 shrink-0 rounded-full border border-zinc-300 bg-white p-1 transition after:h-5 after:w-5 after:rounded-full after:bg-zinc-300 after:shadow-sm after:transition peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                        </label>

                        <Field label={copy.discountType}>
                          <ModernDropdown
                            value={selectedPerfumeDiscount.mode}
                            placeholder={copy.discountPercentOption}
                            onChange={(value) =>
                              updateSelectedPerfumeDiscount((discount) => ({
                                ...discount,
                                mode: value === "fixed" ? "fixed" : "percent",
                                value:
                                  value === "fixed"
                                    ? selectedPerfume.sizes[0]?.price ?? 0
                                    : Math.min(discount.value || 10, 95),
                              }))
                            }
                            options={[
                              { value: "percent", label: copy.discountPercentOption },
                              { value: "fixed", label: copy.discountFixedOption },
                            ]}
                          />
                        </Field>

                        <Field
                          label={selectedPerfumeDiscount.mode === "fixed" ? copy.discountNewSalePrice : copy.discountPercentage}
                          hint={selectedPerfumeDiscount.mode === "fixed" ? copy.discountFixedHint : copy.discountPercentHint}
                        >
                          <input
                            type="number"
                            className={ui.input}
                            value={selectedPerfumeDiscount.value}
                            min="0"
                            max={selectedPerfumeDiscount.mode === "percent" ? "95" : undefined}
                            step="0.01"
                            onChange={(event) => {
                              const parsed = Number(event.target.value);
                              updateSelectedPerfumeDiscount((discount) => ({
                                ...discount,
                                value: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                              }));
                            }}
                          />
                        </Field>

                        <Field label={copy.discountAppliesTo}>
                          <ModernDropdown
                            value={selectedPerfumeDiscount.scope.kind}
                            placeholder={copy.discountAllSizes}
                            onChange={(kind) => {
                              updateSelectedPerfumeDiscount((discount) => {
                                if (kind === "size") {
                                  return {
                                    ...discount,
                                    scope: { kind: "size", ml: selectedPerfume.sizes[0]?.ml ?? 15 },
                                  };
                                }

                                if (kind === "custom") {
                                  return {
                                    ...discount,
                                    scope: { kind: "custom", mls: selectedPerfume.sizes.map((size) => size.ml) },
                                  };
                                }

                                return { ...discount, scope: { kind: "all" } };
                              });
                            }}
                            options={[
                              { value: "all", label: copy.discountAllSizes },
                              { value: "size", label: copy.discountOneSize },
                              { value: "custom", label: copy.discountCustomSizes },
                            ]}
                          />
                        </Field>

                        {selectedPerfumeDiscount.scope.kind === "size" ? (
                          <Field label={copy.discountedSize}>
                            <ModernDropdown
                              value={String(selectedPerfumeDiscount.scope.ml)}
                              placeholder={selectedPerfume.sizes[0]?.label ?? copy.discountOneSize}
                              onChange={(value) => {
                                const ml = Number(value);
                                updateSelectedPerfumeDiscount((discount) => ({
                                  ...discount,
                                  scope: { kind: "size", ml: Number.isFinite(ml) ? ml : selectedPerfume.sizes[0]?.ml ?? 15 },
                                }));
                              }}
                              options={selectedPerfume.sizes.map((size) => ({
                                value: String(size.ml),
                                label: size.label,
                              }))}
                            />
                          </Field>
                        ) : null}

                        <Field label={copy.discountDeadline}>
                          <ModernDropdown
                            value={selectedPerfumeDiscount.deadline.kind}
                            placeholder={copy.discountNoDeadline}
                            onChange={(kind) => {
                              updateSelectedPerfumeDiscount((discount) => {
                                if (kind === "date") {
                                  return {
                                    ...discount,
                                    showDeadline: true,
                                    deadline: { kind: "date", endsOn: toDateInputValue() },
                                  };
                                }

                                if (kind === "duration") {
                                  const startsOn = toDateInputValue();
                                  return {
                                    ...discount,
                                    showDeadline: true,
                                    deadline: {
                                      kind: "duration",
                                      unit: "days",
                                      amount: 7,
                                      startsOn,
                                      endsOn: addDiscountDuration(7, "days"),
                                    },
                                  };
                                }

                                if (kind === "endOfMonth") {
                                  return { ...discount, showDeadline: true, deadline: { kind: "endOfMonth" } };
                                }

                                return { ...discount, showDeadline: false, deadline: { kind: "none" } };
                              });
                            }}
                            options={[
                              { value: "none", label: copy.discountNoDeadline },
                              { value: "date", label: copy.discountCustomDate },
                              { value: "duration", label: copy.discountCustomDuration },
                              { value: "endOfMonth", label: copy.discountEndOfMonth },
                            ]}
                          />
                        </Field>

                        {selectedPerfumeDiscount.deadline.kind === "date" ? (
                          <Field label={copy.discountEndsOn}>
                            <input
                              type="date"
                              className={ui.input}
                              value={selectedPerfumeDiscount.deadline.endsOn}
                              onChange={(event) =>
                                updateSelectedPerfumeDiscount((discount) => ({
                                  ...discount,
                                  deadline: { kind: "date", endsOn: event.target.value },
                                }))
                              }
                            />
                          </Field>
                        ) : null}

                        {selectedPerfumeDiscount.deadline.kind === "duration" ? (
                          <>
                            <Field label={copy.discountDurationAmount}>
                              <input
                                type="number"
                                className={ui.input}
                                value={selectedPerfumeDiscount.deadline.amount}
                                min="1"
                                step="1"
                                onChange={(event) => {
                                  const amount = Math.max(1, Math.floor(Number(event.target.value) || 1));
                                  updateSelectedPerfumeDiscount((discount) => {
                                    const current =
                                      discount.deadline.kind === "duration"
                                        ? discount.deadline
                                        : {
                                            kind: "duration" as const,
                                            unit: "days" as const,
                                            amount: 7,
                                            startsOn: toDateInputValue(),
                                            endsOn: addDiscountDuration(7, "days"),
                                          };

                                    return {
                                      ...discount,
                                      deadline: {
                                        ...current,
                                        amount,
                                        endsOn: addDiscountDuration(amount, current.unit, new Date(`${current.startsOn}T00:00:00`)),
                                      },
                                    };
                                  });
                                }}
                              />
                            </Field>

                            <Field label={copy.discountDurationUnit}>
                              <ModernDropdown
                                value={selectedPerfumeDiscount.deadline.unit}
                                placeholder={copy.discountDays}
                                onChange={(value) => {
                                  const unit =
                                    value === "weeks" || value === "months"
                                      ? value
                                      : "days";
                                  updateSelectedPerfumeDiscount((discount) => {
                                    const current =
                                      discount.deadline.kind === "duration"
                                        ? discount.deadline
                                        : {
                                            kind: "duration" as const,
                                            unit: "days" as const,
                                            amount: 7,
                                            startsOn: toDateInputValue(),
                                            endsOn: addDiscountDuration(7, "days"),
                                          };

                                    return {
                                      ...discount,
                                      deadline: {
                                        ...current,
                                        unit,
                                        endsOn: addDiscountDuration(current.amount, unit, new Date(`${current.startsOn}T00:00:00`)),
                                      },
                                    };
                                  });
                                }}
                                options={[
                                  { value: "days", label: copy.discountDays },
                                  { value: "weeks", label: copy.discountWeeks },
                                  { value: "months", label: copy.discountMonths },
                                ]}
                              />
                            </Field>

                            <Field label={copy.discountStartsOn}>
                              <input
                                type="date"
                                className={ui.input}
                                value={selectedPerfumeDiscount.deadline.startsOn}
                                onChange={(event) =>
                                  updateSelectedPerfumeDiscount((discount) => {
                                    const current =
                                      discount.deadline.kind === "duration"
                                        ? discount.deadline
                                        : {
                                            kind: "duration" as const,
                                            unit: "days" as const,
                                            amount: 7,
                                            startsOn: toDateInputValue(),
                                            endsOn: addDiscountDuration(7, "days"),
                                          };
                                    const startsOn = event.target.value || toDateInputValue();

                                    return {
                                      ...discount,
                                      deadline: {
                                        ...current,
                                        startsOn,
                                        endsOn: addDiscountDuration(current.amount, current.unit, new Date(`${startsOn}T00:00:00`)),
                                      },
                                    };
                                  })
                                }
                              />
                            </Field>

                            <Field label={copy.discountComputedEndDate}>
                              <input
                                type="date"
                                className={ui.input}
                                value={selectedPerfumeDiscount.deadline.endsOn}
                                onChange={(event) =>
                                  updateSelectedPerfumeDiscount((discount) => ({
                                    ...discount,
                                    deadline:
                                      discount.deadline.kind === "duration"
                                        ? { ...discount.deadline, endsOn: event.target.value }
                                        : discount.deadline,
                                  }))
                                }
                              />
                            </Field>
                          </>
                        ) : null}
                      </div>

                      {selectedPerfumeDiscount.deadline.kind !== "none" ? (
                        <label className="mt-5 flex min-h-[72px] items-center justify-between gap-4 rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3 transition hover:border-zinc-300 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                          <span>
                            <span className="block text-sm font-semibold text-zinc-800">{copy.discountShowDeadline}</span>
                            <span className="mt-1 block text-xs text-zinc-500">
                              {copy.discountShowDeadlineHint}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={Boolean(selectedPerfumeDiscount.showDeadline)}
                            onChange={(event) =>
                              updateSelectedPerfumeDiscount((discount) => ({
                                ...discount,
                                showDeadline: event.target.checked,
                              }))
                            }
                          />
                          <span className="relative inline-flex h-7 w-12 shrink-0 rounded-full border border-zinc-300 bg-white p-1 transition after:h-5 after:w-5 after:rounded-full after:bg-zinc-300 after:shadow-sm after:transition peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                        </label>
                      ) : null}

                      {selectedPerfumeDiscount.scope.kind === "custom" ? (
                        <div className="mt-5 rounded-[18px] border border-[#E5E7EB] bg-[#FCFCFD] p-4">
                          <p className="mb-2 text-sm font-medium text-zinc-700">{copy.discountCustomSizePicker}</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPerfume.sizes.map((size) => {
                              const checked = selectedPerfumeDiscount.scope.kind === "custom" && selectedPerfumeDiscount.scope.mls.includes(size.ml);

                              return (
                                <label
                                  key={size.ml}
                                  className={cx(
                                    "inline-flex h-10 cursor-pointer items-center rounded-full border px-3.5 text-xs font-semibold transition",
                                    checked
                                      ? "border-indigo-600 bg-indigo-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.18)]"
                                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={(event) =>
                                      updateSelectedPerfumeDiscount((discount) => {
                                        const currentMls = discount.scope.kind === "custom" ? discount.scope.mls : [];
                                        const nextMls = event.target.checked
                                          ? Array.from(new Set([...currentMls, size.ml]))
                                          : currentMls.filter((ml) => ml !== size.ml);

                                        return {
                                          ...discount,
                                          scope: { kind: "custom", mls: nextMls.length ? nextMls.sort((a, b) => a - b) : [size.ml] },
                                        };
                                      })
                                    }
                                  />
                                  {size.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className={cx(ui.soft, "overflow-hidden rounded-[24px] bg-white p-5 sm:p-6")}>
                      <SectionLabel
                        icon={<Rows size={16} weight="bold" />}
                        title={copy.discountPreview}
                        detail={copy.discountPreviewDescription}
                      />

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {selectedPerfume.sizes.map((size) => {
                          const pricing = resolveDiscountedSizePrice(size, selectedPerfumeDiscount);
                          const hasSavings = pricing.finalPrice < pricing.originalPrice;

                          return (
                            <div
                              key={size.ml}
                              className={cx(
                                "rounded-[18px] border p-4 transition",
                                hasSavings
                                  ? "border-indigo-200 bg-indigo-50/60 shadow-[0_14px_28px_rgba(79,70,229,0.08)]"
                                  : "border-[#E5E7EB] bg-[#FCFCFD]",
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-zinc-900">{size.label}</p>
                                <span
                                  className={cx(
                                    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                    hasSavings ? "bg-white text-indigo-700" : "bg-zinc-100 text-zinc-500",
                                  )}
                                >
                                  {hasSavings ? `-${Math.round(pricing.savingsPercent)}%` : copy.discountNoSavings}
                                </span>
                              </div>
                              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                                {hasSavings ? (
                                  <span className="text-sm text-zinc-400 line-through">
                                    {pricing.originalPrice} AZN
                                  </span>
                                ) : null}
                                <span className="text-2xl font-semibold tracking-[-0.04em] text-zinc-900">
                                  {pricing.finalPrice} AZN
                                </span>
                              </div>
                              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                                <div
                                  className={cx(
                                    "h-full rounded-full transition-all",
                                    hasSavings ? "bg-indigo-600" : "bg-zinc-300",
                                  )}
                                  style={{ width: `${hasSavings ? Math.min(100, Math.max(8, pricing.savingsPercent)) : 0}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {perfumeEditorTab === "notes" ? (
                  <div className="mt-6 space-y-4">
                    {(["top", "heart", "base"] as const).map((group) => (
                      <div key={group} className={cx(ui.soft, "p-4 sm:p-5")}>
                        <SectionLabel
                          icon={<Tag size={16} weight="bold" />}
                          title={`${group[0]?.toUpperCase()}${group.slice(1)} notes`}
                          detail={`Attach note slugs to build the ${group} layer for this perfume.`}
                        />

                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedPerfume.noteSlugs[group].length ? (
                            selectedPerfume.noteSlugs[group].map((token) => (
                              <button
                                key={token}
                                type="button"
                                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
                                onClick={() => removeTokenFromGroup(group, token)}
                              >
                                <span>{token}</span>
                                <span className="text-zinc-400">{adminText(locale, "Sil", "Remove")}</span>
                              </button>
                            ))
                          ) : (
                            <span className="text-sm text-zinc-500">
                              {adminText(locale, `Hələ bağlı ${group} notu yoxdur.`, `No ${group} notes linked yet.`)}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                          <Field
                            label="Add note slug"
                            hint={`${noteSlugOptions.length} existing note slug${noteSlugOptions.length === 1 ? "" : "s"} available for autocomplete`}
                          >
                            <input
                              list={`note-options-${group}`}
                              className={ui.input}
                              value={tokenInput[group]}
                              onChange={(event) =>
                                setTokenInput((current) => ({
                                  ...current,
                                  [group]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  addTokenToGroup(group);
                                }
                              }}
                              placeholder="bergamot"
                            />
                          </Field>
                          <div className="flex items-end">
                            <button
                              type="button"
                              className={ui.secondaryButton}
                              onClick={() => addTokenToGroup(group)}
                            >
                              <Plus size={16} weight="bold" />
                              Add note
                            </button>
                          </div>
                        </div>

                        <datalist id={`note-options-${group}`}>
                          {noteSlugOptions.map((slug) => (
                            <option key={slug} value={slug} />
                          ))}
                        </datalist>
                      </div>
                    ))}
                  </div>
                ) : null}

                {perfumeEditorTab === "media" ? (
                  <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <div className="space-y-4">
                      <ImagePreview
                        src={selectedPerfume.image}
                        alt={selectedPerfume.imageAlt || selectedPerfume.name}
                        emptyLabel={copy.uploadPerfumePreview}
                      />
                      <div className={cx(ui.soft, "p-4")}>
                        <p className="text-sm font-semibold text-zinc-900">{copy.mediaQuickActions}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={ui.primaryButton}
                            onClick={() => perfumeImageInputRef.current?.click()}
                            disabled={uploading}
                          >
                            <UploadSimple size={16} weight="bold" />
                            {uploading
                              ? copy.uploading
                              : selectedPerfume.image
                                ? copy.replaceImage
                                : copy.uploadImage}
                          </button>
                          <button
                            type="button"
                            className={ui.secondaryButton}
                            onClick={() => void copyToClipboard(selectedPerfume.image, copy.imageUrl)}
                          >
                            <CopySimple size={16} weight="bold" />
                            {copy.copyImageUrl}
                          </button>
                          <button
                            type="button"
                            className={ui.secondaryButton}
                            onClick={() => void onRemoveBackgroundPerfume()}
                            disabled={!selectedPerfume.image || removingBg}
                            title={copy.removeBgTooltip}
                          >
                            <Sparkle size={16} weight="bold" />
                            {removingBg ? copy.removeBgProcessing : copy.removeBg}
                          </button>
                          <button
                            type="button"
                            className={ui.secondaryButton}
                            onClick={() => {
                              setResizeScale(1);
                              setResizeModalOpen(true);
                            }}
                            disabled={!selectedPerfume.image}
                          >
                            <MagnifyingGlass size={16} weight="bold" />
                            Resize Preview
                          </button>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-zinc-500">{copy.uploadImageGuidance}</p>
                        <input
                          ref={perfumeImageInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            void onUploadPerfumeImage(event);
                          }}
                        />
                      </div>
                    </div>

                    <div className={cx(ui.soft, "p-4 sm:p-5")}>
                      <SectionLabel
                        icon={<ImageSquare size={16} weight="bold" />}
                        title={copy.imageMetadata}
                        detail={copy.imageMetadataDescription}
                      />

                      <div className="mt-5 grid gap-4">
                        <Field label={copy.imageUrl}>
                          <input
                            className={ui.input}
                            value={selectedPerfume.image}
                            onChange={(event) => setPerfumeField("image", event.target.value)}
                            placeholder="/uploads/admin/perfumes/..."
                          />
                        </Field>
                        <Field label={copy.imageAlt}>
                          <input
                            className={ui.input}
                            value={selectedPerfume.imageAlt}
                            onChange={(event) =>
                              setPerfumeField("imageAlt", event.target.value)
                            }
                            placeholder="Elegant perfume bottle on neutral background"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                
                    ) : null}
                </div>
            ) : (
              <div className="space-y-6">
                <EmptyState
                  title="No perfume selected"
                  detail="Pick a perfume from the list or create a new one to start editing."
                  action={
                    <button type="button" className={ui.primaryButton} onClick={addPerfume}>
                      <Plus size={16} weight="bold" />
                      Add perfume
                    </button>
                  }
                />
              </div>
            )
          ) : view === "notes" ? (
            <div className="space-y-6">
              <div className={cx(ui.soft, "p-4 sm:p-5")}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <SectionLabel
                    icon={<Rows size={16} weight="bold" />}
                    title={copy.noteList}
                    detail={t("recordsShown", {
                      shown: filteredNotes.length,
                      total: notes.length,
                    })}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className={ui.primaryButton} onClick={addNote}>
                      <Plus size={16} weight="bold" />
                      {copy.addNote}
                    </button>
                    <button
                      type="button"
                      className={ui.secondaryButton}
                      onClick={duplicateNote}
                      disabled={!selectedNote}
                    >
                      <CopySimple size={16} weight="bold" />
                      {copy.duplicate}
                    </button>
                    <button
                      type="button"
                      className={ui.dangerButton}
                      onClick={deleteNote}
                      disabled={!selectedNote}
                    >
                      <Trash size={16} weight="bold" />
                      {copy.delete}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(260px,0.42fr)_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <label className="relative block">
                      <span className="sr-only">{copy.searchNotes}</span>
                      <MagnifyingGlass
                        size={15}
                        weight="bold"
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={copy.searchNotes}
                        className="h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-3.5 pl-10 text-sm text-zinc-900 outline-none transition duration-200 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {([
                        ["all", copy.all],
                        ["linked", copy.linked],
                        ["unlinked", copy.unlinked],
                        ["missingImage", copy.missingImage],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={cx(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                            noteListFilter === value
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50",
                          )}
                          onClick={() => setNoteListFilter(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-0 rounded-[16px] border border-[#E5E7EB] bg-white p-2">
                    <div className="max-h-[288px] overflow-y-auto pr-1">
                      <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                        {filteredNotes.length ? (
                          filteredNotes.map((item, index) => (
                            <RecordButton
                              key={`${item.slug}-${index}`}
                              active={selectedNote?.slug === item.slug}
                              title={item.name}
                              subtitle={item.slug}
                              meta={t("usedByPerfumes", { count: noteUsageCounts.get(item.slug) || 0 })}
                              src={item.image || undefined}
                              onClick={() => {
                                startTransition(() => {
                                  setSelectedNoteSlug(item.slug);
                                });
                              }}
                            />
                          ))
                        ) : (
                          <div className="md:col-span-2 2xl:col-span-3">
                            <EmptyState
                              title={copy.noNotesFound}
                              detail={copy.noNotesFoundDescription}
                              action={
                                <button type="button" className={ui.secondaryButton} onClick={addNote}>
                                  <Plus size={16} weight="bold" />
                                  {copy.addNote}
                                </button>
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedNote ? (
                <>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <NotePencil size={14} weight="bold" />
                    Note editor
                  </div>
                  <h2 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.05em] text-zinc-950">
                    {selectedNote.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {selectedNote.slug} • Used by {perfumesLinkedToSelectedNote.length} perfume
                    {perfumesLinkedToSelectedNote.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={ui.secondaryButton}
                    onClick={() => void copyToClipboard(selectedNote.slug, copy.slug)}
                  >
                    <CopySimple size={16} weight="bold" />
                    {copy.copySlug}
                  </button>
                  <button
                    type="button"
                    className={ui.secondaryButton}
                    onClick={() => void copyToClipboard(selectedNote.image, copy.imageUrl)}
                  >
                    <ImageSquare size={16} weight="bold" />
                    {copy.copyImageUrl}
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <TabButton
                  active={noteEditorTab === "content"}
                  icon={<TextT size={15} weight="bold" />}
                  onClick={() => startTransition(() => setNoteEditorTab("content"))}
                >
                  Content
                </TabButton>
                <TabButton
                  active={noteEditorTab === "media"}
                  icon={<ImageSquare size={15} weight="bold" />}
                  onClick={() => startTransition(() => setNoteEditorTab("media"))}
                >
                  Media
                </TabButton>
              </div>

              {noteEditorTab === "content" ? (
                <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className={cx(ui.soft, "p-4 sm:p-5")}>
                    <SectionLabel
                      icon={<TextT size={16} weight="bold" />}
                      title="Note content"
                      detail="Edit the note label and descriptive copy shown throughout the site."
                    />

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <Field label="Note name">
                        <input
                          className={ui.input}
                          value={selectedNote.name}
                          onChange={(event) => setNoteField("name", event.target.value)}
                          placeholder="Saffron"
                        />
                      </Field>
                      <Field label="Slug">
                        <input
                          className={ui.input}
                          value={selectedNote.slug}
                          onChange={(event) =>
                            setNoteField("slug", normalizeSlug(event.target.value))
                          }
                          placeholder="saffron"
                        />
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label="Content" hint="Used in note detail pages and explanatory panels">
                        <textarea
                          className={cx(ui.textarea, "min-h-[260px]")}
                          value={selectedNote.content}
                          onChange={(event) => setNoteField("content", event.target.value)}
                          placeholder="Describe the note, its character, and how it behaves in fragrance compositions."
                        />
                      </Field>
                    </div>
                  </div>

                  <div className={cx(ui.soft, "p-4 sm:p-5")}>
                    <SectionLabel
                      icon={<Link size={16} weight="bold" />}
                      title="Usage map"
                      detail="Perfumes currently referencing this note."
                    />

                    <div className="mt-4 space-y-2">
                      {perfumesLinkedToSelectedNote.length ? (
                        perfumesLinkedToSelectedNote.slice(0, 8).map((perfume) => (
                          <button
                            key={perfume.id}
                            type="button"
                            className="w-full rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                            onClick={() => {
                              startTransition(() => {
                                setView("perfumes");
                                setSelectedPerfumeId(perfume.id);
                                setPerfumeEditorTab("notes");
                              });
                            }}
                          >
                            <p className="text-sm font-semibold text-zinc-900">{perfume.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{formatPerfumeMeta(perfume, copy)}</p>
                          </button>
                        ))
                      ) : (
                        <EmptyState
                          title="No linked perfumes yet"
                          detail="Attach this note to any perfume in the notes editor tab."
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {noteEditorTab === "media" ? (
                <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <ImagePreview
                      src={selectedNote.image}
                      alt={selectedNote.imageAlt || selectedNote.name}
                      emptyLabel={copy.uploadNotePreview}
                      fit="contain"
                      showCheckerboard
                    />
                    <div className={cx(ui.soft, "p-4")}>
                      <p className="text-sm font-semibold text-zinc-900">{copy.mediaQuickActions}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={ui.primaryButton}
                          onClick={() => noteImageInputRef.current?.click()}
                          disabled={uploading}
                        >
                          <UploadSimple size={16} weight="bold" />
                          {uploading
                            ? copy.uploading
                            : selectedNote.image
                              ? copy.replaceImage
                              : copy.uploadImage}
                        </button>
                        <button
                          type="button"
                          className={ui.secondaryButton}
                          onClick={() => void copyToClipboard(selectedNote.image, copy.imageUrl)}
                        >
                          <CopySimple size={16} weight="bold" />
                          {copy.copyImageUrl}
                        </button>
                        <button
                          type="button"
                          className={ui.secondaryButton}
                          onClick={() => void onRemoveBackgroundNote()}
                          disabled={!selectedNote.image || removingBg}
                          title={copy.removeBgTooltip}
                        >
                          <Sparkle size={16} weight="bold" />
                          {removingBg ? copy.removeBgProcessing : copy.removeBg}
                        </button>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-zinc-500">{copy.uploadImageGuidance}</p>
                      <input
                        ref={noteImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          void onUploadNoteImage(event);
                        }}
                      />
                    </div>
                  </div>

                  <div className={cx(ui.soft, "p-4 sm:p-5")}>
                    <SectionLabel
                      icon={<ImageSquare size={16} weight="bold" />}
                        title={copy.imageMetadata}
                        detail={copy.imageMetadataDescription}
                    />

                    <div className="mt-5 grid gap-4">
                      <Field label={copy.imageUrl}>
                        <input
                          className={ui.input}
                          value={selectedNote.image}
                          onChange={(event) => setNoteField("image", event.target.value)}
                          placeholder="/uploads/admin/notes/..."
                        />
                      </Field>
                      <Field label={copy.imageAlt}>
                        <input
                          className={ui.input}
                          value={selectedNote.imageAlt}
                          onChange={(event) => setNoteField("imageAlt", event.target.value)}
                          placeholder="Illustration representing the note"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ) : null}
                </>
              ) : (
              <EmptyState
                title="No note selected"
                detail="Pick a note from the list or create a new one to start editing."
                action={
                  <button type="button" className={ui.primaryButton} onClick={addNote}>
                    <Plus size={16} weight="bold" />
                    Add note
                  </button>
                }
              />
              )}
            </div>
          ) : null}
        </div>
      </div>

      <SaveStatusPill
        status={saveStatus.tone}
        message={saveStatus.message}
        onSave={onSave}
        isDirty={dirty}
        isSaving={busy}
      />
      {perfumePickerModal}
      {resizeModalOpen && (() => {
        const modal = (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setResizeModalOpen(false)}>
            <div className="w-full max-w-[1200px] p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold">{adminText(locale, "Ətir önizləməsini ölçüləndir", "Resize perfume preview")}</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" className={ui.compactButton} onClick={() => setResizeModalOpen(false)}>
                      {adminText(locale, "Bağla", "Close")}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1 bg-white">
                      <button
                        type="button"
                        className={cx("px-3 py-1 rounded-full text-sm", deviceViewMode === "mobile" ? "bg-zinc-900 text-white" : "text-zinc-600")}
                        onClick={() => setDeviceViewMode("mobile")}
                      >
                        {adminText(locale, "Mobil", "Mobile")}
                      </button>
                      <button
                        type="button"
                        className={cx("px-3 py-1 rounded-full text-sm", deviceViewMode === "laptop" ? "bg-zinc-900 text-white" : "text-zinc-600")}
                        onClick={() => setDeviceViewMode("laptop")}
                      >
                        {adminText(locale, "Noutbuk", "Laptop")}
                      </button>
                      <button
                        type="button"
                        className={cx("px-3 py-1 rounded-full text-sm", deviceViewMode === "monitor" ? "bg-zinc-900 text-white" : "text-zinc-600")}
                        onClick={() => setDeviceViewMode("monitor")}
                      >
                        {adminText(locale, "Monitor", "Monitor")}
                      </button>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
                      <input type="checkbox" checked={syncScaleAcrossDevices} onChange={(e) => setSyncScaleAcrossDevices(e.target.checked)} />
                      <span>{adminText(locale, "Bütün cihazlara tətbiq et", "Apply to all devices")}</span>
                    </label>
                  </div>
                  <div className="mx-auto flex w-full items-center justify-center">
                    <div ref={modalContainerRef} className="relative max-h-[70vh] h-auto w-full max-w-[680px] overflow-hidden rounded-xl bg-zinc-50 p-6 md:p-8 flex items-center justify-center">
                      <div className={cx(
                        "product-card-clip w-full overflow-hidden rounded-[1.2rem] bg-white p-6 shadow-sm",
                        deviceViewMode === "mobile" ? "max-w-[320px]" : deviceViewMode === "laptop" ? "max-w-[520px]" : "max-w-[760px]",
                      )}>
                        <div className={cx(
                          "relative mx-auto w-full flex items-center justify-center",
                          deviceViewMode === "mobile" ? "h-60" : deviceViewMode === "laptop" ? "h-72 md:h-80" : "h-96 md:h-[28rem]",
                        )}>
                          <img ref={previewCardRef} src={selectedPerfume?.image || "/perfoumerlogo.png"} alt={selectedPerfume?.imageAlt || selectedPerfume?.name} className="mx-auto h-full w-full object-contain transition-transform duration-150" style={{ transform: 'scale(' + resizeScale + ')', transformOrigin: "center center" }} />
                        </div>
                        <div className="px-1 pt-3">
                          <h4 className="text-sm font-medium text-zinc-900">{selectedPerfume?.name}</h4>
                          <p className="mt-1 text-xs text-zinc-500">{selectedPerfume?.brand}</p>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:block" />
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-zinc-700">{adminText(locale, "Ölçü", "Scale")}</label>
                      <input type="range" min={resizeMin} max={resizeMax} step={0.01} value={resizeScale} onChange={(e) => setResizeScale(Number((e.target as HTMLInputElement).value))} className="mt-2 w-full" />
                      <div className="mt-2 text-sm text-zinc-500">{Math.round(resizeScale * 100)}%</div>
                    </div>

                    <div className="flex w-full justify-end">
                      <button type="button" className={ui.primaryButton} onClick={async () => {
                        if (!selectedPerfume) {
                          setResizeModalOpen(false);
                          return;
                        }

                        if (syncScaleAcrossDevices) {
                          setPerfumeField("mediaScale", resizeScale as any);
                          setPerfumeField("mediaScaleByDevice", { mobile: resizeScale, laptop: resizeScale, monitor: resizeScale } as any);
                        } else {
                          const current = (selectedPerfume as any).mediaScaleByDevice || {};
                          const next = { ...current, [deviceViewMode]: resizeScale };
                          setPerfumeField("mediaScaleByDevice", next as any);
                        }

                        setResizeModalOpen(false);

                        // Persist immediately so public views can pick up the change
                        try {
                          await onSave();
                        } catch (err) {
                          // onSave will set status; swallow here
                        }
                      }}>{adminText(locale, "Bitdi", "Done")}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
      })()}
    </section>
  );
}
