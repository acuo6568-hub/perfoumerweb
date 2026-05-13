"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  CaretDown,
  Check,
  MagnifyingGlass,
  SlidersHorizontal,
  Sparkle,
  X,
} from "@phosphor-icons/react";

import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { formatMessage, getDictionary, type Locale } from "@/lib/i18n";
import { localizeNoteLabel } from "@/lib/note-label";
import { filterPerfumesBySpecialPreset, type CatalogSpecialPreset } from "@/lib/special-items";
import { ProductCard } from "@/components/ProductCard";
import type { Perfume } from "@/types/catalog";

type NoteFilterType = "top" | "heart" | "base";

type LockedNoteFilter = {
  slug: string;
  type: NoteFilterType;
  label: string;
};

type CatalogClientProps = {
  perfumes: Perfume[];
  lockedNoteFilter?: LockedNoteFilter;
  initialBrand?: string;
  initialGender?: string;
  initialQuery?: string;
  initialMinPrice?: number;
  initialMaxPrice?: number;
  specialPreset?: CatalogSpecialPreset;
  locale: Locale;
};

type FilterOption = {
  value: string;
  label: string;
};

type ActiveChip = {
  key: string;
  label: string;
  onClear: () => void;
  icon?: ReactNode;
};

type SearchSuggestion = {
  id: string;
  label: string;
  type: "brand" | "perfume";
  value: string;
  subLabel?: string;
  score: number;
};

type SmartSearchIntent = {
  tokens: string[];
  minPrice: number | null;
  maxPrice: number | null;
  genderHint: "all" | "male" | "female" | "unisex";
  noteHints: string[];
};

const PAGE_SIZE = 8;
const isNonNull = <T,>(value: T | null): value is T => value !== null;

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

function foldSearchCharacters(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİəƏæÆœŒøØđĐłŁþÞðÐß]/g, (char) => SEARCH_CHAR_FOLD_MAP[char] ?? char)
    .toLowerCase();
}

function getStartingPrice(perfume: Perfume) {
  return perfume.sizes[0]?.price ?? Number.POSITIVE_INFINITY;
}

function toNoteLabel(slug: string, locale: Locale) {
  return localizeNoteLabel({ slug, name: "" }, locale);
}

function parseSmartSearchIntent(rawQuery: string): SmartSearchIntent {
  const normalized = normalizeSearchText(rawQuery);
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  const underMatch = normalized.match(/(?:under|below|less\s+than|sub)\s*(\d{2,4})/i);
  const overMatch = normalized.match(/(?:over|above|more\s+than)\s*(\d{2,4})/i);
  const betweenMatch = normalized.match(/(\d{2,4})\s*(?:-|to)\s*(\d{2,4})/i);

  let minPrice: number | null = null;
  let maxPrice: number | null = null;

  if (betweenMatch) {
    minPrice = Number.parseInt(betweenMatch[1] || "", 10);
    maxPrice = Number.parseInt(betweenMatch[2] || "", 10);
  } else {
    if (underMatch) {
      maxPrice = Number.parseInt(underMatch[1] || "", 10);
    }
    if (overMatch) {
      minPrice = Number.parseInt(overMatch[1] || "", 10);
    }
  }

  const genderHint: SmartSearchIntent["genderHint"] =
    /(male|men|man|kis[iı]|kişi|muzh|муж)/iu.test(normalized)
      ? "male"
      : /(female|women|woman|qad[iı]n|жен|дам)/iu.test(normalized)
        ? "female"
        : /(unisex)/iu.test(normalized)
          ? "unisex"
          : "all";

  const noteHints = Array.from(
    new Set(
      tokens.flatMap((token) => {
        if (["fresh", "citrus", "summer", "yay", "clean", "aquatic"].includes(token)) {
          return ["citrus", "bergamot", "marine", "aquatic", "grapefruit", "lemon"];
        }
        if (["sweet", "vanilla", "gourmand", "desert", "caramel"].includes(token)) {
          return ["vanilla", "tonka", "caramel", "amber", "praline", "chocolate"];
        }
        if (["woody", "wood", "oud", "office", "formal"].includes(token)) {
          return ["oud", "sandalwood", "cedar", "vetiver", "patchouli", "musk"];
        }
        if (["floral", "rose", "yasemin", "jasmine"].includes(token)) {
          return ["rose", "jasmine", "lily", "peony", "violet", "floral"];
        }
        return [token];
      }),
    ),
  );

  return {
    tokens,
    minPrice: Number.isFinite(minPrice) ? minPrice : null,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
    genderHint,
    noteHints,
  };
}

function scoreSmartMatch(perfume: Perfume, intent: SmartSearchIntent): number {
  if (!intent.tokens.length) return 0;

  const name = normalizeSearchText(perfume.name);
  const brand = normalizeSearchText(perfume.brand);
  const gender = normalizeSearchText(perfume.gender);
  const notePool = normalizeSearchText([
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
  ].join(" "));

  let score = 0;

  for (const token of intent.tokens) {
    if (name.includes(token)) score += 35;
    if (brand.includes(token)) score += 24;
    if (notePool.includes(token)) score += 18;
  }

  for (const hint of intent.noteHints) {
    if (notePool.includes(hint)) {
      score += 9;
    }
  }

  if (intent.genderHint === "male" && /(men|male|kişi|man)/iu.test(gender)) score += 14;
  if (intent.genderHint === "female" && /(women|female|qadın|woman)/iu.test(gender)) score += 14;
  if (intent.genderHint === "unisex" && /unisex/iu.test(gender)) score += 14;
  if (perfume.inStock) score += 4;

  return score;
}

function normalizeSearchText(value: string) {
  return foldSearchCharacters(value)
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveInitialGenderValue(initialGender: string | undefined, perfumes: Perfume[]) {
  const normalizedInitialGender = normalizeSearchText(initialGender ?? "");
  if (!normalizedInitialGender || normalizedInitialGender === "all") {
    return "all";
  }

  const directMatch = perfumes.find(
    (perfume) => normalizeSearchText(perfume.gender) === normalizedInitialGender,
  );
  if (directMatch) {
    return directMatch.gender;
  }

  if (/(male|men|man|kisi|kişi|muzh|муж)/iu.test(normalizedInitialGender)) {
    const maleMatch = perfumes.find((perfume) =>
      /(male|men|man|kisi|kişi|muzh|муж)/iu.test(normalizeSearchText(perfume.gender)),
    );
    if (maleMatch) {
      return maleMatch.gender;
    }
  }

  if (/(female|women|woman|qadin|qadın|жен|lady)/iu.test(normalizedInitialGender)) {
    const femaleMatch = perfumes.find((perfume) =>
      /(female|women|woman|qadin|qadın|жен|lady)/iu.test(normalizeSearchText(perfume.gender)),
    );
    if (femaleMatch) {
      return femaleMatch.gender;
    }
  }

  if (/(unisex|uniseks|унисекс)/iu.test(normalizedInitialGender)) {
    const unisexMatch = perfumes.find((perfume) =>
      /(unisex|uniseks|унисекс)/iu.test(normalizeSearchText(perfume.gender)),
    );
    if (unisexMatch) {
      return unisexMatch.gender;
    }
  }

  return "all";
}

function toSearchPool(perfume: Perfume) {
  return normalizeSearchText(
    [
      perfume.name,
      perfume.brand,
      perfume.slug,
      ...perfume.noteSlugs.top,
      ...perfume.noteSlugs.heart,
      ...perfume.noteSlugs.base,
    ].join(" "),
  );
}

function scoreQueryRelevance(perfume: Perfume, normalizedQuery: string, smartScore: number): number {
  if (!normalizedQuery) {
    return 0;
  }

  const normalizedName = normalizeSearchText(perfume.name);
  const normalizedBrand = normalizeSearchText(perfume.brand);
  const brandThenName = `${normalizedBrand} ${normalizedName}`.trim();
  const nameThenBrand = `${normalizedName} ${normalizedBrand}`.trim();
  const pool = toSearchPool(perfume);
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const hasAllTokens = tokens.every((token) => pool.includes(token));

  let score = smartScore;

  if (brandThenName === normalizedQuery || nameThenBrand === normalizedQuery) score += 500;
  else if (normalizedName === normalizedQuery) score += 430;
  else if (brandThenName.includes(normalizedQuery) || nameThenBrand.includes(normalizedQuery)) score += 320;
  else if (normalizedName.includes(normalizedQuery)) score += 260;
  else if (pool.includes(normalizedQuery)) score += 170;

  if (hasAllTokens) {
    score += 120;
  }

  return score;
}

function PillButton({
  active,
  children,
  onClick,
  className = "",
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
        active
          ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_12px_24px_rgba(24,24,24,0.16)]"
          : "border-zinc-200/80 bg-white/85 text-zinc-600 hover:border-zinc-300 hover:bg-white hover:text-zinc-900",
        className,
      ].join(" ")}
    >
      {active ? <Check size={12} weight="bold" className="shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.8rem] border border-zinc-200/80 bg-white/82 p-4 shadow-[0_18px_40px_rgba(24,24,24,0.06)] backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
            {title}
          </p>
          {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OptionCluster({
  options,
  value,
  onChange,
  itemClassName = "",
  gridClassName = "flex flex-wrap gap-2",
}: {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  itemClassName?: string;
  gridClassName?: string;
}) {
  return (
    <div className={gridClassName}>
      {options.map((option) => (
        <PillButton
          key={option.value}
          active={option.value === value}
          onClick={() => onChange(option.value)}
          className={itemClassName}
        >
          {option.label}
        </PillButton>
      ))}
    </div>
  );
}

function CollapsibleFilterSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[1.2rem] border border-zinc-200/80 bg-white/80 shadow-[0_10px_24px_rgba(24,24,24,0.04)]">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-[0.62rem] font-medium tracking-[0.22em] text-zinc-400 uppercase">{title}</p>
          {description ? <p className="mt-0.5 text-sm text-zinc-500">{description}</p> : null}
        </div>
        <CaretDown
          size={14}
          weight="bold"
          className={[
            "shrink-0 text-zinc-500 transition-transform duration-300",
            isOpen ? "rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>

      <div
        className={[
          "grid transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-zinc-200/70 px-4 py-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function CatalogClient({
  perfumes,
  lockedNoteFilter,
  initialBrand = "all",
  initialGender,
  initialQuery = "",
  initialMinPrice,
  initialMaxPrice,
  specialPreset,
  locale,
}: CatalogClientProps) {
  const siteSettings = useSiteSettings();
  const t = getDictionary(locale, siteSettings);
  const sourcePerfumes = useMemo(
    () => filterPerfumesBySpecialPreset(perfumes, specialPreset),
    [perfumes, specialPreset],
  );
  const normalizedInitialQuery = initialQuery.trim();
  const resolvedInitialGender = useMemo(
    () => resolveInitialGenderValue(initialGender, sourcePerfumes),
    [initialGender, sourcePerfumes],
  );
  const [query, setQuery] = useState(normalizedInitialQuery);
  const [draftQuery, setDraftQuery] = useState(normalizedInitialQuery);
  const [suggestionQuery, setSuggestionQuery] = useState(normalizedInitialQuery);
  const [selectedGender, setSelectedGender] = useState(resolvedInitialGender);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedTopNote, setSelectedTopNote] = useState(
    lockedNoteFilter?.type === "top" ? lockedNoteFilter.slug : "all",
  );
  const [selectedHeartNote, setSelectedHeartNote] = useState(
    lockedNoteFilter?.type === "heart" ? lockedNoteFilter.slug : "all",
  );
  const [selectedBaseNote, setSelectedBaseNote] = useState(
    lockedNoteFilter?.type === "base" ? lockedNoteFilter.slug : "all",
  );
  const [selectedMinPrice, setSelectedMinPrice] = useState<number | null>(
    Number.isFinite(initialMinPrice) ? Math.max(0, Number(initialMinPrice)) : null,
  );
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | null>(
    Number.isFinite(initialMaxPrice) ? Math.max(0, Number(initialMaxPrice)) : null,
  );
  const [sortBy, setSortBy] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(false);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query);
  const refreshTimerRef = useRef<number | null>(null);
  const suggestionTimerRef = useRef<number | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const lockedTopNote = lockedNoteFilter?.type === "top" ? lockedNoteFilter.slug : "all";
  const lockedHeartNote = lockedNoteFilter?.type === "heart" ? lockedNoteFilter.slug : "all";
  const lockedBaseNote = lockedNoteFilter?.type === "base" ? lockedNoteFilter.slug : "all";

  useEffect(() => {
    // Keep internal note states aligned with externally locked note type switches.
    setSelectedTopNote(lockedTopNote);
    setSelectedHeartNote(lockedHeartNote);
    setSelectedBaseNote(lockedBaseNote);
  }, [lockedTopNote, lockedHeartNote, lockedBaseNote]);

  useEffect(() => {
    const nextQuery = initialQuery.trim();
    setQuery(nextQuery);
    setDraftQuery(nextQuery);
    setSuggestionQuery(nextQuery);
    setVisibleCount(PAGE_SIZE);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedGender(resolvedInitialGender);
  }, [resolvedInitialGender]);

  useEffect(() => {
    setSelectedMinPrice(Number.isFinite(initialMinPrice) ? Math.max(0, Number(initialMinPrice)) : null);
    setSelectedMaxPrice(Number.isFinite(initialMaxPrice) ? Math.max(0, Number(initialMaxPrice)) : null);
  }, [initialMinPrice, initialMaxPrice]);

  const triggerRefresh = () => {
    setVisibleCount(PAGE_SIZE);
    setIsRefreshing(true);

    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 260);
  };

  const commitQuery = (value: string) => {
    setQuery(value);
    setDraftQuery(value);
    setSuggestionQuery(value);
    triggerRefresh();
  };

  const commitDraftQuery = () => {
    commitQuery(draftQuery);
    setIsSuggestionOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const updateGender = (value: string) => {
    startTransition(() => setSelectedGender(value));
    triggerRefresh();
  };

  const updateBrand = (value: string) => {
    startTransition(() => setSelectedBrand(value));
    triggerRefresh();
  };

  const updateTopNote = (value: string) => {
    startTransition(() => setSelectedTopNote(value));
    triggerRefresh();
  };

  const updateHeartNote = (value: string) => {
    startTransition(() => setSelectedHeartNote(value));
    triggerRefresh();
  };

  const updateBaseNote = (value: string) => {
    startTransition(() => setSelectedBaseNote(value));
    triggerRefresh();
  };

  const updateSortBy = (value: string) => {
    startTransition(() => setSortBy(value));
    triggerRefresh();
  };

  const resetFilters = () => {
    setQuery("");
    setDraftQuery("");
    setSelectedMinPrice(null);
    setSelectedMaxPrice(null);
    startTransition(() => {
      setSelectedGender(resolvedInitialGender);
      setSelectedBrand(initialBrand);
      setSelectedTopNote(lockedTopNote);
      setSelectedHeartNote(lockedHeartNote);
      setSelectedBaseNote(lockedBaseNote);
      setSortBy("featured");
    });
    triggerRefresh();
  };

  const genders = useMemo(() => {
    const unique = new Set(sourcePerfumes.map((item) => item.gender.trim()).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [sourcePerfumes]);

  const brands = useMemo(() => {
    const unique = new Set(sourcePerfumes.map((item) => item.brand.trim()).filter(Boolean));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [sourcePerfumes]);

  const searchSuggestions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(suggestionQuery);
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return [] as SearchSuggestion[];
    }

    const brandSuggestions = brands
      .filter((brand) => brand !== "all")
      .map((brand): SearchSuggestion | null => {
        const normalizedBrand = normalizeSearchText(brand);
        const startsWith = normalizedBrand.startsWith(normalizedQuery);
        const includes = normalizedBrand.includes(normalizedQuery);
        if (!startsWith && !includes) {
          return null;
        }

        const brandProductCount = sourcePerfumes.filter(
          (item) => normalizeSearchText(item.brand) === normalizedBrand,
        ).length;

        let score = startsWith ? 160 : 110;
        score += Math.min(30, brandProductCount * 2);

        return {
          id: `brand-${normalizedBrand}`,
          label: brand,
          type: "brand" as const,
          value: brand,
          subLabel: `${brandProductCount}`,
          score,
        };
      })
      .filter(isNonNull)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const perfumeSuggestions = sourcePerfumes
      .map((perfume): SearchSuggestion | null => {
        const normalizedName = normalizeSearchText(perfume.name);
        const normalizedBrand = normalizeSearchText(perfume.brand);

        const nameStartsWith = normalizedName.startsWith(normalizedQuery);
        const nameIncludes = normalizedName.includes(normalizedQuery);
        const brandStartsWith = normalizedBrand.startsWith(normalizedQuery);
        const brandIncludes = normalizedBrand.includes(normalizedQuery);

        if (!nameStartsWith && !nameIncludes && !brandStartsWith && !brandIncludes) {
          return null;
        }

        let score = 0;
        if (nameStartsWith) score += 180;
        else if (nameIncludes) score += 130;
        if (brandStartsWith) score += 110;
        else if (brandIncludes) score += 70;
        if (perfume.inStock) score += 10;

        return {
          id: `perfume-${perfume.id}`,
          label: perfume.name,
          type: "perfume" as const,
          value: perfume.name,
          subLabel: perfume.brand,
          score,
        };
      })
      .filter(isNonNull)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const merged = [...brandSuggestions, ...perfumeSuggestions]
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);

    return merged;
  }, [brands, sourcePerfumes, suggestionQuery]);

  const topNotes = useMemo(() => {
    const unique = new Set(sourcePerfumes.flatMap((item) => item.noteSlugs.top));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [sourcePerfumes]);

  const heartNotes = useMemo(() => {
    const unique = new Set(sourcePerfumes.flatMap((item) => item.noteSlugs.heart));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [sourcePerfumes]);

  const baseNotes = useMemo(() => {
    const unique = new Set(sourcePerfumes.flatMap((item) => item.noteSlugs.base));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [sourcePerfumes]);

  const sortOptions = useMemo<FilterOption[]>(
    () => [
      { value: "featured", label: t.catalog.featured },
      { value: "name", label: t.catalog.nameAsc },
      { value: "price-asc", label: t.catalog.priceAsc },
      { value: "price-desc", label: t.catalog.priceDesc },
    ],
    [t.catalog.featured, t.catalog.nameAsc, t.catalog.priceAsc, t.catalog.priceDesc],
  );
  const mobileSortOptions = useMemo<FilterOption[]>(
    () => [
      { value: "featured", label: t.catalog.featured },
      { value: "price-asc", label: t.catalog.priceAsc },
      { value: "price-desc", label: t.catalog.priceDesc },
    ],
    [t.catalog.featured, t.catalog.priceAsc, t.catalog.priceDesc],
  );
  const mobileSortValue =
    mobileSortOptions.some((option) => option.value === sortBy) ? sortBy : "featured";
  const mobileSearchLabel = locale === "az" ? "Axtar" : locale === "ru" ? "Поиск" : "Search";

  const smartSearchIntent = useMemo(
    () => parseSmartSearchIntent(deferredQuery),
    [deferredQuery],
  );

  const filteredPerfumes = useMemo(() => {
    const normalizedQuery = normalizeSearchText(deferredQuery);

    const filtered = sourcePerfumes.filter((perfume) => {
      const smartScore = scoreSmartMatch(perfume, smartSearchIntent);
      const searchPool = toSearchPool(perfume);
      const queryTokens = normalizedQuery.split(" ").filter(Boolean);
      const smartQueryThreshold =
        queryTokens.length >= 3 ? 18 : queryTokens.length === 2 ? 14 : 10;
      const hasAllQueryTokens = queryTokens.every((token) => searchPool.includes(token));
      const hasExactQuery = searchPool.includes(normalizedQuery);
      const matchesSmartQuery = normalizedQuery.length > 0 && smartScore >= smartQueryThreshold;
      const matchesQuery =
        !normalizedQuery ||
        hasExactQuery ||
        hasAllQueryTokens ||
        matchesSmartQuery;

      const matchesGender =
        selectedGender === "all" ||
        normalizeSearchText(perfume.gender) === normalizeSearchText(selectedGender);

      const matchesBrand =
        selectedBrand === "all" ||
        normalizeSearchText(perfume.brand) === normalizeSearchText(selectedBrand);

      const matchesTopNote =
        selectedTopNote === "all" || perfume.noteSlugs.top.includes(selectedTopNote);

      const matchesHeartNote =
        selectedHeartNote === "all" || perfume.noteSlugs.heart.includes(selectedHeartNote);

      const matchesBaseNote =
        selectedBaseNote === "all" || perfume.noteSlugs.base.includes(selectedBaseNote);

      const startingPrice = getStartingPrice(perfume);
      const matchesMinPrice = selectedMinPrice === null || startingPrice >= selectedMinPrice;
      const matchesMaxPrice = selectedMaxPrice === null || startingPrice <= selectedMaxPrice;
      const matchesSmartMinPrice =
        smartSearchIntent.minPrice === null || startingPrice >= smartSearchIntent.minPrice;
      const matchesSmartMaxPrice =
        smartSearchIntent.maxPrice === null || startingPrice <= smartSearchIntent.maxPrice;
      const perfumeGender = normalizeSearchText(perfume.gender);
      const matchesSmartGender =
        smartSearchIntent.genderHint === "all" ||
        (smartSearchIntent.genderHint === "male" && /(men|male|kişi|man)/iu.test(perfumeGender)) ||
        (smartSearchIntent.genderHint === "female" && /(women|female|qadın|woman)/iu.test(perfumeGender)) ||
        (smartSearchIntent.genderHint === "unisex" && /unisex/iu.test(perfumeGender));

      return (
        matchesQuery &&
        matchesGender &&
        matchesBrand &&
        matchesTopNote &&
        matchesHeartNote &&
        matchesBaseNote &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesSmartMinPrice &&
        matchesSmartMaxPrice &&
        matchesSmartGender
      );
    });

    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sortBy === "price-asc") {
      filtered.sort((a, b) => getStartingPrice(a) - getStartingPrice(b));
    }

    if (sortBy === "price-desc") {
      filtered.sort((a, b) => getStartingPrice(b) - getStartingPrice(a));
    }

    if (sortBy === "featured" && normalizedQuery) {
      filtered.sort((a, b) => {
        const scoreA = scoreQueryRelevance(a, normalizedQuery, scoreSmartMatch(a, smartSearchIntent));
        const scoreB = scoreQueryRelevance(b, normalizedQuery, scoreSmartMatch(b, smartSearchIntent));
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }

        return a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }, [
    sourcePerfumes,
    deferredQuery,
    selectedBaseNote,
    selectedBrand,
    selectedGender,
    selectedHeartNote,
    selectedMaxPrice,
    selectedMinPrice,
    selectedTopNote,
    sortBy,
    smartSearchIntent,
  ]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      if (suggestionTimerRef.current) {
        window.clearTimeout(suggestionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (suggestionTimerRef.current) {
      window.clearTimeout(suggestionTimerRef.current);
    }

    suggestionTimerRef.current = window.setTimeout(() => {
      setSuggestionQuery(draftQuery);
    }, 170);

    return () => {
      if (suggestionTimerRef.current) {
        window.clearTimeout(suggestionTimerRef.current);
      }
    };
  }, [draftQuery]);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  useEffect(() => {
    if (!isFiltersPanelOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFiltersPanelOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFiltersPanelOpen]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [draftQuery]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const node = searchContainerRef.current;
      if (!node) {
        return;
      }

      if (!node.contains(event.target as Node)) {
        setIsSuggestionOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const applySuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === "brand") {
      updateBrand(suggestion.value);
      commitQuery(suggestion.value);
    } else {
      commitQuery(suggestion.value);
    }

    setIsSuggestionOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const visiblePerfumes = filteredPerfumes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPerfumes.length;
  const hasSearchQuery = query.trim().length > 0;
  const normalizedQuery = normalizeSearchText(query);
  const isQueryMirroringBrand =
    normalizedQuery.length > 0 &&
    selectedBrand !== "all" &&
    normalizedQuery === normalizeSearchText(selectedBrand);
  const activeFilterCount = [
    query.trim() !== "" && !isQueryMirroringBrand,
    selectedGender !== resolvedInitialGender,
    selectedBrand !== initialBrand,
    selectedTopNote !== lockedTopNote,
    selectedHeartNote !== lockedHeartNote,
    selectedBaseNote !== lockedBaseNote,
    selectedMinPrice !== null,
    selectedMaxPrice !== null,
    sortBy !== "featured",
  ].filter(Boolean).length;

  const activeChips: ActiveChip[] = [
    query.trim() && !isQueryMirroringBrand
      ? {
          key: "query",
          label: query.trim(),
          onClear: () => commitQuery(""),
          icon: <MagnifyingGlass size={12} weight="bold" />,
        }
      : null,
    selectedGender !== "all"
      ? {
          key: "gender",
          label: selectedGender,
          onClear: () => updateGender(resolvedInitialGender),
        }
      : null,
    selectedBrand !== initialBrand
      ? {
          key: "brand",
          label: selectedBrand,
          onClear: () => updateBrand(initialBrand),
        }
      : null,
    selectedTopNote !== lockedTopNote
      ? {
          key: "top",
          label: toNoteLabel(selectedTopNote, locale),
          onClear: () => updateTopNote(lockedTopNote),
        }
      : null,
    selectedHeartNote !== lockedHeartNote
      ? {
          key: "heart",
          label: toNoteLabel(selectedHeartNote, locale),
          onClear: () => updateHeartNote(lockedHeartNote),
        }
      : null,
    selectedBaseNote !== lockedBaseNote
      ? {
          key: "base",
          label: toNoteLabel(selectedBaseNote, locale),
          onClear: () => updateBaseNote(lockedBaseNote),
        }
      : null,
    selectedMinPrice !== null
      ? {
          key: "price-min",
          label: `>= ${selectedMinPrice} AZN`,
          onClear: () => {
            setSelectedMinPrice(null);
            triggerRefresh();
          },
        }
      : null,
    selectedMaxPrice !== null
      ? {
          key: "price-max",
          label: `<= ${selectedMaxPrice} AZN`,
          onClear: () => {
            setSelectedMaxPrice(null);
            triggerRefresh();
          },
        }
      : null,
    sortBy !== "featured"
      ? {
          key: "sort",
          label:
            sortOptions.find((option) => option.value === sortBy)?.label ?? t.catalog.featured,
          onClear: () => updateSortBy("featured"),
        }
      : null,
  ].filter(Boolean) as ActiveChip[];

  const panelDescription = lockedNoteFilter
    ? formatMessage(t.catalog.noteDiscovery, { note: lockedNoteFilter.label })
    : t.catalog.signature;
  const sourceCatalogUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (selectedBrand !== "all") {
      params.set("brand", selectedBrand);
    }

    if (selectedGender !== "all") {
      params.set("gender", selectedGender);
    }

    const selectedNote =
      selectedTopNote !== lockedTopNote
        ? selectedTopNote
        : selectedHeartNote !== lockedHeartNote
          ? selectedHeartNote
          : selectedBaseNote !== lockedBaseNote
            ? selectedBaseNote
            : lockedNoteFilter?.slug;

    if (selectedNote && selectedNote !== "all") {
      params.set("note", selectedNote);
    }

    if (selectedMinPrice !== null) {
      params.set("min", String(selectedMinPrice));
    }

    if (selectedMaxPrice !== null) {
      params.set("max", String(selectedMaxPrice));
    }

    const serialized = params.toString();
    return serialized ? `/catalog?${serialized}` : "/catalog";
  }, [
    lockedBaseNote,
    lockedHeartNote,
    lockedNoteFilter?.slug,
    lockedTopNote,
    query,
    selectedBaseNote,
    selectedBrand,
    selectedGender,
    selectedHeartNote,
    selectedMaxPrice,
    selectedMinPrice,
    selectedTopNote,
  ]);

  return (
    <>
      <section className="relative z-30 mt-4 overflow-visible px-1 sm:px-0">
        <div className="mb-2 grid grid-cols-2 gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsFiltersPanelOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 border-b border-zinc-300/80 px-2 text-sm font-medium text-zinc-800 transition-colors duration-200 hover:text-zinc-950"
          >
            <SlidersHorizontal size={15} weight="bold" />
            <span>{t.catalog.filters}</span>
          </button>

          <label className="relative inline-flex min-h-11 items-center border-b border-zinc-300/80 px-2 text-sm font-medium text-zinc-800">
            <select
              value={mobileSortValue}
              onChange={(event) => updateSortBy(event.target.value)}
              className="h-full w-full appearance-none bg-transparent pr-6 outline-none"
              aria-label={t.catalog.sort}
            >
              {mobileSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <CaretDown
              size={14}
              weight="bold"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600"
            />
          </label>
        </div>

        <div className="mt-1 grid gap-2 py-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div ref={searchContainerRef} className="relative">
          <label className="flex items-center gap-3 rounded-none border-b border-zinc-300/70 bg-transparent px-1 py-2.5 transition-all duration-300 focus-within:border-zinc-500 lg:rounded-full lg:border lg:border-zinc-200/80 lg:bg-white/85 lg:px-3 lg:py-2 lg:shadow-[0_12px_28px_rgba(24,24,24,0.06)] lg:backdrop-blur-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300/70 bg-zinc-50 text-zinc-600">
              <MagnifyingGlass size={18} weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={draftQuery}
                onChange={(event) => {
                  setDraftQuery(event.target.value);
                  setIsSuggestionOpen(true);
                }}
                onFocus={() => setIsSuggestionOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (isSuggestionOpen && activeSuggestionIndex >= 0 && searchSuggestions.length) {
                      event.preventDefault();
                      const suggestion = searchSuggestions[activeSuggestionIndex];
                      if (suggestion) {
                        applySuggestion(suggestion);
                      }
                      return;
                    }

                    event.preventDefault();
                    commitDraftQuery();
                    return;
                  }

                  if (!searchSuggestions.length) {
                    return;
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setIsSuggestionOpen(true);
                    setActiveSuggestionIndex((prev) =>
                      prev >= searchSuggestions.length - 1 ? 0 : prev + 1,
                    );
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setIsSuggestionOpen(true);
                    setActiveSuggestionIndex((prev) =>
                      prev <= 0 ? searchSuggestions.length - 1 : prev - 1,
                    );
                  }

                  if (event.key === "Escape") {
                    setIsSuggestionOpen(false);
                    setActiveSuggestionIndex(-1);
                  }
                }}
                placeholder={t.catalog.searchPlaceholder}
                className="mt-0.5 w-full bg-transparent text-[1rem] text-zinc-800 outline-none placeholder:text-zinc-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!draftQuery) {
                  return;
                }

                commitQuery("");
              }}
              tabIndex={draftQuery ? 0 : -1}
              aria-hidden={!draftQuery}
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-300/70 bg-zinc-50 text-zinc-600 transition-all duration-250",
                draftQuery
                  ? "scale-100 opacity-100 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                  : "pointer-events-none scale-75 opacity-0",
              ].join(" ")}
              aria-label={t.catalog.reset}
            >
              <X size={13} weight="bold" />
            </button>
          </label>

          {isSuggestionOpen && searchSuggestions.length ? (
            <div
              className="absolute inset-x-0 top-[calc(100%+0.7rem)] z-50 max-h-[20rem] overflow-y-auto overscroll-contain rounded-[1.2rem] border border-zinc-200/80 bg-white/96 p-2 shadow-[0_20px_42px_rgba(24,24,24,0.12)] backdrop-blur"
              onWheelCapture={(event) => event.stopPropagation()}
              onTouchMoveCapture={(event) => event.stopPropagation()}
            >
              <p className="px-2 py-1 text-[0.62rem] font-medium tracking-[0.2em] text-zinc-500 uppercase">
                {t.catalog.searchSuggestionsTitle}
              </p>
              <div className="mt-1 space-y-1">
                {searchSuggestions.map((suggestion, index) => {
                  const isActive = index === activeSuggestionIndex;
                  return (
                    <button
                      key={suggestion.id}
                      type="button"
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySuggestion(suggestion);
                      }}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                        isActive
                          ? "bg-zinc-900 text-white"
                          : "bg-transparent text-zinc-700 hover:bg-zinc-100",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{suggestion.label}</p>
                        {suggestion.subLabel ? (
                          <p
                            className={[
                              "truncate text-xs",
                              isActive ? "text-zinc-300" : "text-zinc-500",
                            ].join(" ")}
                          >
                            {suggestion.subLabel}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={[
                          "shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.14em] uppercase",
                          isActive
                            ? "border-zinc-500/70 text-zinc-200"
                            : "border-zinc-200 text-zinc-500",
                        ].join(" ")}
                      >
                        {suggestion.type === "brand"
                          ? t.catalog.searchSuggestionBrand
                          : t.catalog.searchSuggestionPerfume}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          </div>

          <div className="flex flex-col gap-2 items-start lg:items-end">
            <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto lg:justify-end">
              <div className="inline-flex w-full items-center rounded-full border border-zinc-200/80 bg-white/88 p-1 shadow-[0_12px_28px_rgba(24,24,24,0.05)] backdrop-blur-sm sm:w-auto">
              {genders.map((gender) => {
                const active = selectedGender === gender;

                return (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => updateGender(gender)}
                    aria-pressed={active}
                    className={[
                      "flex-1 rounded-full px-3 py-2 text-center text-sm font-medium transition-all duration-300 sm:flex-none sm:px-4",
                      active
                        ? "bg-zinc-900 text-white shadow-[0_10px_22px_rgba(24,24,24,0.16)]"
                        : "text-zinc-500 hover:text-zinc-900",
                    ].join(" ")}
                  >
                    {gender === "all" ? t.catalog.all : gender}
                  </button>
                );
              })}
              </div>

              <button
                type="button"
                aria-expanded={isFiltersPanelOpen}
                aria-controls="catalog-advanced-filters"
                onClick={() => setIsFiltersPanelOpen((open) => !open)}
                  className="hidden min-h-11 items-center gap-3 rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-[0_12px_28px_rgba(24,24,24,0.05)] transition-all duration-300 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-[0_16px_32px_rgba(24,24,24,0.08)] lg:inline-flex"
              >
                <span className="relative block h-[15px] w-[15px]">
                  <SlidersHorizontal
                    size={15}
                    weight="bold"
                    className={[
                      "absolute inset-0 transition-all duration-300",
                      isFiltersPanelOpen
                        ? "-rotate-90 scale-75 opacity-0"
                        : "rotate-0 scale-100 opacity-100",
                    ].join(" ")}
                  />
                  <X
                    size={15}
                    weight="bold"
                    className={[
                      "absolute inset-0 transition-all duration-300",
                      isFiltersPanelOpen
                        ? "rotate-0 scale-100 opacity-100"
                        : "rotate-90 scale-75 opacity-0",
                    ].join(" ")}
                  />
                </span>
                <span>{t.catalog.refine}</span>
              </button>

              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-600 transition-all duration-300 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-[0_12px_26px_rgba(24,24,24,0.07)]"
                >
                  <X size={14} weight="bold" />
                  {t.catalog.reset}
                </button>
              ) : null}

              {activeFilterCount > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 px-3 py-1.5 text-sm text-zinc-600 shadow-[0_10px_22px_rgba(24,24,24,0.05)]">
                  <Sparkle size={14} weight="fill" className="text-zinc-400" />
                  {formatMessage(t.catalog.activeChoices, { count: activeFilterCount })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="mt-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onClear}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-3 py-2 text-sm text-zinc-600 shadow-[0_10px_22px_rgba(24,24,24,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 hover:shadow-[0_14px_28px_rgba(24,24,24,0.08)]"
                >
                  {chip.icon ? <span className="text-zinc-400">{chip.icon}</span> : null}
                  <span className="max-w-[10rem] truncate sm:max-w-[14rem]">{chip.label}</span>
                  <X size={12} weight="bold" className="shrink-0 text-zinc-400" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="relative z-10 mt-1 flex flex-col gap-1 px-1 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        {hasSearchQuery ? (
          <p>{formatMessage(t.catalog.found, { count: filteredPerfumes.length })}</p>
        ) : (
          <span aria-hidden="true" />
        )}
        {hasMore ? <p className="sm:text-right">{t.catalog.clickMore}</p> : null}
      </div>

      <section
        className={[
          "relative z-10 mt-2 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:gap-5",
          isRefreshing ? "opacity-95" : "opacity-100",
        ].join(" ")}
      >
        {visiblePerfumes.map((perfume, index) => (
          <div
            key={perfume.id}
            className="catalog-card-reveal"
            style={{ animationDelay: `${Math.min(index, 12) * 42}ms` }}
          >
            <ProductCard perfume={perfume} locale={locale} sourceUrlOverride={sourceCatalogUrl} />
          </div>
        ))}
      </section>

      {hasMore ? (
        <div className="mt-8 flex justify-center sm:mt-10">
          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                setVisibleCount((prev) => prev + PAGE_SIZE);
              })
            }
            className="catalog-load-more rounded-full border border-zinc-300/90 bg-white/80 px-6 py-3 text-sm font-medium text-zinc-700 shadow-[0_10px_24px_rgba(24,24,24,0.05)] transition-all duration-300 hover:border-zinc-400 hover:bg-white hover:text-zinc-900 hover:shadow-[0_14px_28px_rgba(24,24,24,0.08)] sm:px-8 sm:text-base"
          >
            {t.catalog.loadMore}
          </button>
        </div>
      ) : null}

      {!filteredPerfumes.length ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white/65 px-6 py-14 text-center text-zinc-500 shadow-[0_16px_34px_rgba(24,24,24,0.04)]">
          {t.catalog.noResults}
        </div>
      ) : null}

      {isPortalReady
        ? createPortal(
            <div
              className={[
                "fixed inset-0 z-[90] overflow-hidden transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isFiltersPanelOpen
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0",
              ].join(" ")}
              aria-hidden={!isFiltersPanelOpen}
            >
              <div
                aria-hidden="true"
                className={[
                  "absolute inset-0 z-0 transition-[opacity,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isFiltersPanelOpen
                    ? "bg-zinc-950/28 opacity-100 backdrop-blur-[3px]"
                    : "bg-zinc-950/0 opacity-0 backdrop-blur-0",
                ].join(" ")}
              />

              <div
                className="absolute inset-0 z-10 flex items-stretch justify-end lg:items-center lg:justify-center lg:p-6"
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setIsFiltersPanelOpen(false);
                  }
                }}
              >
                <aside
                  id="catalog-advanced-filters"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t.catalog.filters}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={[
                    "flex h-full w-[min(92vw,24.5rem)] flex-col overflow-hidden border-l border-zinc-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,249,247,0.92)_100%)] backdrop-blur-xl",
                    "rounded-none",
                    "lg:h-auto lg:w-[min(92vw,72rem)] lg:max-h-[calc(100vh-3.5rem)] lg:max-w-[72rem] lg:rounded-[2.4rem] lg:border",
                    "transition-[transform,opacity] duration-560 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                    "shadow-[-24px_0_58px_rgba(15,15,15,0.2)] lg:shadow-[0_26px_70px_rgba(15,15,15,0.2)]",
                    isFiltersPanelOpen
                      ? "translate-x-0 scale-100 opacity-100 lg:translate-y-0"
                      : "translate-x-full scale-[0.992] opacity-0 lg:translate-x-0 lg:translate-y-6 lg:scale-[0.972]",
                  ].join(" ")}
                >
            <div
              className={[
                "flex items-start justify-between gap-4 border-b border-zinc-200/70 px-5 pb-4 pt-4 sm:px-6 lg:sticky lg:top-0 lg:z-10 lg:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(252,251,249,0.96)_100%)] lg:px-8 lg:pt-6 lg:backdrop-blur",
                "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isFiltersPanelOpen
                  ? "translate-x-0 opacity-100 lg:translate-y-0"
                  : "translate-x-6 opacity-0 lg:translate-x-0 lg:translate-y-2",
              ].join(" ")}
            >
              <div>
                <p className="text-[0.62rem] font-medium tracking-[0.26em] text-zinc-400 uppercase">
                  {t.catalog.filters}
                </p>
                <h3 className="mt-2 text-lg font-medium text-zinc-900 sm:text-xl">
                  {t.catalog.refine}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-zinc-500">{panelDescription}</p>
              </div>

              <div className="flex items-center gap-2">
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-all duration-300 hover:border-zinc-300 hover:text-zinc-900"
                  >
                    <X size={14} weight="bold" />
                    {t.catalog.reset}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsFiltersPanelOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-500 transition-all duration-300 hover:border-zinc-300 hover:text-zinc-900"
                  aria-label={t.catalog.close}
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            <div
              className={[
                "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-8 sm:px-6 lg:px-8 lg:py-6",
                "transition-all duration-560 delay-75 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isFiltersPanelOpen
                  ? "translate-x-0 opacity-100 lg:translate-y-0"
                  : "translate-x-8 opacity-0 lg:translate-x-0 lg:translate-y-3",
              ].join(" ")}
            >
              <div className="space-y-3 lg:hidden">
                <CollapsibleFilterSection
                  title={t.catalog.brand}
                  description={
                    selectedBrand === "all" ? t.catalog.allBrands : selectedBrand
                  }
                  defaultOpen
                >
                  <OptionCluster
                    options={brands.map((brand) => ({
                      value: brand,
                      label: brand === "all" ? t.catalog.allBrands : brand,
                    }))}
                    value={selectedBrand}
                    onChange={updateBrand}
                    gridClassName="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1"
                  />
                </CollapsibleFilterSection>

                <CollapsibleFilterSection
                  title={t.catalog.sort}
                  description={sortOptions.find((option) => option.value === sortBy)?.label}
                  defaultOpen
                >
                  <OptionCluster
                    options={sortOptions}
                    value={sortBy}
                    onChange={updateSortBy}
                    gridClassName="grid grid-cols-1 gap-2"
                    itemClassName="justify-start px-4 py-3"
                  />
                </CollapsibleFilterSection>

                {lockedNoteFilter?.type !== "top" ? (
                  <CollapsibleFilterSection
                    title={t.catalog.topNote}
                    description={
                      selectedTopNote === "all"
                        ? t.catalog.topNotes
                        : toNoteLabel(selectedTopNote, locale)
                    }
                  >
                    <OptionCluster
                      options={topNotes.map((note) => ({
                        value: note,
                        label: note === "all" ? t.catalog.topNotes : toNoteLabel(note, locale),
                      }))}
                      value={selectedTopNote}
                      onChange={updateTopNote}
                      gridClassName="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1"
                    />
                  </CollapsibleFilterSection>
                ) : null}

                {lockedNoteFilter?.type !== "heart" ? (
                  <CollapsibleFilterSection
                    title={t.catalog.heartNote}
                    description={
                      selectedHeartNote === "all"
                        ? t.catalog.heartNotes
                        : toNoteLabel(selectedHeartNote, locale)
                    }
                  >
                    <OptionCluster
                      options={heartNotes.map((note) => ({
                        value: note,
                        label: note === "all" ? t.catalog.heartNotes : toNoteLabel(note, locale),
                      }))}
                      value={selectedHeartNote}
                      onChange={updateHeartNote}
                      gridClassName="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1"
                    />
                  </CollapsibleFilterSection>
                ) : null}

                {lockedNoteFilter?.type !== "base" ? (
                  <CollapsibleFilterSection
                    title={t.catalog.baseNote}
                    description={
                      selectedBaseNote === "all"
                        ? t.catalog.baseNotes
                        : toNoteLabel(selectedBaseNote, locale)
                    }
                  >
                    <OptionCluster
                      options={baseNotes.map((note) => ({
                        value: note,
                        label: note === "all" ? t.catalog.baseNotes : toNoteLabel(note, locale),
                      }))}
                      value={selectedBaseNote}
                      onChange={updateBaseNote}
                      gridClassName="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1"
                    />
                  </CollapsibleFilterSection>
                ) : null}
              </div>

              <div className="hidden gap-5 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <SectionShell title={t.catalog.brand} description={t.catalog.allBrands}>
                  <OptionCluster
                    options={brands.map((brand) => ({
                      value: brand,
                      label: brand === "all" ? t.catalog.allBrands : brand,
                    }))}
                    value={selectedBrand}
                    onChange={updateBrand}
                    gridClassName="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-2 xl:grid-cols-3"
                  />
                </SectionShell>

                <SectionShell title={t.catalog.sort} description={t.catalog.featured}>
                  <OptionCluster
                    options={sortOptions}
                    value={sortBy}
                    onChange={updateSortBy}
                    gridClassName="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    itemClassName="justify-start px-4 py-3"
                  />
                </SectionShell>
              </div>

              <div className="mt-5 hidden rounded-[1.8rem] border border-zinc-200/80 bg-white/82 p-4 shadow-[0_18px_40px_rgba(24,24,24,0.06)] backdrop-blur-sm sm:p-5 lg:block">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.66rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
                      {t.catalog.signature}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {lockedNoteFilter
                        ? formatMessage(t.catalog.noteDiscovery, {
                            note: lockedNoteFilter.label,
                          })
                        : t.catalog.signature}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-5 lg:grid-cols-3">
                  {lockedNoteFilter?.type !== "top" ? (
                    <SectionShell title={t.catalog.topNote} description={t.catalog.topNotes}>
                      <OptionCluster
                        options={topNotes.map((note) => ({
                          value: note,
                          label: note === "all" ? t.catalog.topNotes : toNoteLabel(note, locale),
                        }))}
                        value={selectedTopNote}
                        onChange={updateTopNote}
                        gridClassName="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-2"
                      />
                    </SectionShell>
                  ) : null}

                  {lockedNoteFilter?.type !== "heart" ? (
                    <SectionShell title={t.catalog.heartNote} description={t.catalog.heartNotes}>
                      <OptionCluster
                        options={heartNotes.map((note) => ({
                          value: note,
                          label: note === "all" ? t.catalog.heartNotes : toNoteLabel(note, locale),
                        }))}
                        value={selectedHeartNote}
                        onChange={updateHeartNote}
                        gridClassName="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-2"
                      />
                    </SectionShell>
                  ) : null}

                  {lockedNoteFilter?.type !== "base" ? (
                    <SectionShell title={t.catalog.baseNote} description={t.catalog.baseNotes}>
                      <OptionCluster
                        options={baseNotes.map((note) => ({
                          value: note,
                          label: note === "all" ? t.catalog.baseNotes : toNoteLabel(note, locale),
                        }))}
                        value={selectedBaseNote}
                        onChange={updateBaseNote}
                        gridClassName="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-2"
                      />
                    </SectionShell>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-zinc-200/80 bg-[#f3f3f2] px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 lg:hidden">
              <button
                type="button"
                onClick={() => setIsFiltersPanelOpen(false)}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
              >
                {mobileSearchLabel}
              </button>
            </div>
                </aside>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
