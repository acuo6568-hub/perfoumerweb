"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CaretDown, Sparkle, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { localizeNoteLabel } from "@/lib/note-label";
import type { Note, Perfume } from "@/types/catalog";

type CompareClientProps = {
  perfumes: Perfume[];
  notes: Note[];
  locale: Locale;
};

type Spec =
  | {
      label: string;
      noteRow?: false;
      value: (perfume: Perfume) => string;
    }
  | {
      label: string;
      noteRow: true;
      value: (perfume: Perfume) => string[];
    };

type Copy = {
  title: string;
  subtitle: string;
  slotLabel: string;
  selectPlaceholder: string;
  clear: string;
  compareHint: string;
  searchPlaceholder: string;
  openProduct: string;
  aiSummaryTitle: string;
  aiSummaryDescription: string;
  aiSummaryAction: string;
  aiSummaryLoading: string;
  aiSummaryError: string;
  aiSummaryLimitReached: string;
  aiSummaryRemaining: string;
  aiSummaryHighlights: string;
  specs: string;
  brand: string;
  gender: string;
  price: string;
  stock: string;
  topNotes: string;
  heartNotes: string;
  baseNotes: string;
  inStock: string;
  outOfStock: string;
  noPrice: string;
  noNotes: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    title: "Ətir Müqayisə",
    subtitle: "Apple üslubunda yan-yana müqayisə ilə özünə ən uyğun qoxunu daha rahat seç.",
    slotLabel: "Məhsul",
    selectPlaceholder: "Ətir seç",
    clear: "Təmizlə",
    compareHint: "Ən azı 2 ətir seçərək müqayisəni başlat.",
    searchPlaceholder: "Axtar...",
    openProduct: "Məhsula keç",
    aiSummaryTitle: "Qoxunu AI müqayisəsi",
    aiSummaryDescription: "Seçilən ətirləri qısa və praktik müqayisə ilə izah edir.",
    aiSummaryAction: "Qısa müqayisə et",
    aiSummaryLoading: "Müqayisə hazırlanır...",
    aiSummaryError: "Müqayisə hazır olmadı. Bir az sonra yenidən yoxlayın.",
    aiSummaryLimitReached: "Saatlıq limit dolub. Daha sonra yenidən cəhd edin.",
    aiSummaryRemaining: "Qalan limit: {count}",
    aiSummaryHighlights: "Əsas fərqlər",
    specs: "Müqayisə göstəriciləri",
    brand: "Brend",
    gender: "Kateqoriya",
    price: "Başlanğıc qiymət",
    stock: "Stok",
    topNotes: "Üst notlar",
    heartNotes: "Ürək notlar",
    baseNotes: "Baza notlar",
    inStock: "Mövcuddur",
    outOfStock: "Stokda yoxdur",
    noPrice: "Qiymət yoxdur",
    noNotes: "Not yoxdur",
  },
  en: {
    title: "Perfume Compare",
    subtitle: "Use a clean Apple-style side-by-side view to pick the scent that fits you best.",
    slotLabel: "Product",
    selectPlaceholder: "Select perfume",
    clear: "Clear",
    compareHint: "Pick at least 2 perfumes to start comparing.",
    searchPlaceholder: "Search...",
    openProduct: "Open product",
    aiSummaryTitle: "AI scent comparison",
    aiSummaryDescription: "Generates a short and practical comparison for selected perfumes.",
    aiSummaryAction: "Summarize comparison",
    aiSummaryLoading: "Generating comparison...",
    aiSummaryError: "Could not generate comparison right now. Please try again.",
    aiSummaryLimitReached: "Hourly limit reached. Please try later.",
    aiSummaryRemaining: "Remaining limit: {count}",
    aiSummaryHighlights: "Key differences",
    specs: "Comparison specs",
    brand: "Brand",
    gender: "Category",
    price: "Starting price",
    stock: "Stock",
    topNotes: "Top notes",
    heartNotes: "Heart notes",
    baseNotes: "Base notes",
    inStock: "In stock",
    outOfStock: "Out of stock",
    noPrice: "No price",
    noNotes: "No notes",
  },
  ru: {
    title: "Сравнение ароматов",
    subtitle: "Сравнивайте ароматы бок о бок в чистом Apple-стиле и выбирайте лучший для себя.",
    slotLabel: "Продукт",
    selectPlaceholder: "Выберите аромат",
    clear: "Очистить",
    compareHint: "Выберите минимум 2 аромата для сравнения.",
    searchPlaceholder: "Поиск...",
    openProduct: "Открыть товар",
    aiSummaryTitle: "AI-сравнение ароматов",
    aiSummaryDescription: "Создает короткое и практичное сравнение выбранных ароматов.",
    aiSummaryAction: "Суммировать сравнение",
    aiSummaryLoading: "Готовим сравнение...",
    aiSummaryError: "Не удалось создать сравнение. Попробуйте позже.",
    aiSummaryLimitReached: "Почасовой лимит исчерпан. Попробуйте позже.",
    aiSummaryRemaining: "Осталось лимита: {count}",
    aiSummaryHighlights: "Ключевые отличия",
    specs: "Параметры сравнения",
    brand: "Бренд",
    gender: "Категория",
    price: "Стартовая цена",
    stock: "Наличие",
    topNotes: "Верхние ноты",
    heartNotes: "Ноты сердца",
    baseNotes: "Базовые ноты",
    inStock: "В наличии",
    outOfStock: "Нет в наличии",
    noPrice: "Нет цены",
    noNotes: "Нет нот",
  },
};

const SLOT_COUNT = 3;
const ETIRSHAH_BRAND = "etirshah parfum";

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

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİəƏæÆœŒøØđĐłŁþÞðÐß]/g, (char) => SEARCH_CHAR_FOLD_MAP[char] ?? char)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const toReadableNote = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function CompareClient({ perfumes, notes, locale }: CompareClientProps) {
  const copy = copyByLocale[locale];
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([
    perfumes[0]?.slug ?? "",
    perfumes[1]?.slug ?? "",
    "",
  ]);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [slotQueries, setSlotQueries] = useState<string[]>(Array.from({ length: SLOT_COUNT }, () => ""));
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiHighlights, setAiHighlights] = useState<string[]>([]);
  const [aiError, setAiError] = useState("");
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const pickerPerfumes = useMemo(() => {
    const byNameAndBrand = new Map<string, Perfume>();

    for (const perfume of perfumes) {
      const nameKey = normalizeSearchText(perfume.name);
      const brandKey = normalizeSearchText(perfume.brand || "");
      const dedupeKey = `${nameKey}::${brandKey}`;
      const previous = byNameAndBrand.get(dedupeKey);

      if (!previous) {
        byNameAndBrand.set(dedupeKey, perfume);
        continue;
      }

      const nextScore = Number(perfume.inStock) * 4 + Number(perfume.sizes.length > 0) * 2 + perfume.sizes.length;
      const prevScore = Number(previous.inStock) * 4 + Number(previous.sizes.length > 0) * 2 + previous.sizes.length;

      if (nextScore > prevScore) {
        byNameAndBrand.set(dedupeKey, perfume);
      }
    }

    const deduped = Array.from(byNameAndBrand.values());
    const namesWithNonEtirshah = new Set(
      deduped
        .filter((item) => normalizeSearchText(item.brand || "") !== ETIRSHAH_BRAND)
        .map((item) => normalizeSearchText(item.name)),
    );

    return deduped.filter((item) => {
      const isEtirshah = normalizeSearchText(item.brand || "") === ETIRSHAH_BRAND;
      const nameKey = normalizeSearchText(item.name);
      return !isEtirshah || !namesWithNonEtirshah.has(nameKey);
    });
  }, [perfumes]);

  const bySlug = useMemo(() => new Map(pickerPerfumes.map((item) => [item.slug, item])), [pickerPerfumes]);
  const noteBySlug = useMemo(() => new Map(notes.map((item) => [item.slug, item])), [notes]);
  const searchablePerfumes = useMemo(
    () =>
      pickerPerfumes.map((item) => ({
        perfume: item,
        searchText: normalizeSearchText(`${item.name} ${item.brand}`),
      })),
    [pickerPerfumes],
  );

  const selectedPerfumes = useMemo(
    () =>
      selectedSlugs
        .map((slug) => bySlug.get(slug))
        .filter((item): item is Perfume => Boolean(item)),
    [bySlug, selectedSlugs],
  );
  const selectedSlugSet = useMemo(() => new Set(selectedSlugs.filter(Boolean)), [selectedSlugs]);
  const availableBySlot = useMemo(
    () =>
      Array.from({ length: SLOT_COUNT }, (_, slotIndex) => {
        const currentSlotSlug = selectedSlugs[slotIndex] ?? "";
        const currentQuery = normalizeSearchText(slotQueries[slotIndex] ?? "");

        return searchablePerfumes
          .filter(({ perfume, searchText }) => {
            if (perfume.slug === currentSlotSlug) {
              return true;
            }
            if (selectedSlugSet.has(perfume.slug)) {
              return false;
            }
            if (!currentQuery) {
              return true;
            }
            return searchText.includes(currentQuery);
          })
          .slice(0, 90)
          .map(({ perfume }) => perfume);
      }),
    [searchablePerfumes, selectedSlugs, selectedSlugSet, slotQueries],
  );

  useEffect(() => {
    if (openSlot === null) {
      return;
    }

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!shellRef.current || !(target instanceof Node)) {
        return;
      }
      if (!shellRef.current.contains(target)) {
        setOpenSlot(null);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSlot(null);
      }
    };

    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [openSlot]);

  const setSlot = (index: number, slug: string) => {
    setSelectedSlugs((prev) => {
      const next = [...prev];
      next[index] = slug;
      return next;
    });
    setAiSummary("");
    setAiHighlights([]);
    setAiError("");
  };

  const clearSlot = (index: number) => {
    setSlot(index, "");
    setOpenSlot(null);
  };

  const summarizeCompare = async () => {
    if (selectedPerfumes.length < 2) {
      return;
    }

    setIsAiLoading(true);
    setAiError("");
    setAiSummary("");
    setAiHighlights([]);

    try {
      const response = await fetch("/api/compare/summary", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slugs: selectedPerfumes.map((item) => item.slug),
          locale,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        summary?: string;
        highlights?: string[];
        error?: string;
        remaining?: number;
        warning?: string;
      };

      if (typeof payload.remaining === "number") {
        setAiRemaining(payload.remaining);
      }

      if (!response.ok) {
        if (payload.error === "rate_limited") {
          setAiError(copy.aiSummaryLimitReached);
          return;
        }
        setAiError(copy.aiSummaryError);
        return;
      }

      if (payload.warning === "provider_unavailable") {
        setAiError(copy.aiSummaryError);
        return;
      }

      setAiSummary(typeof payload.summary === "string" ? payload.summary : "");
      setAiHighlights(
        Array.isArray(payload.highlights)
          ? payload.highlights.filter((item): item is string => typeof item === "string")
          : [],
      );
    } catch {
      setAiError(copy.aiSummaryError);
    } finally {
      setIsAiLoading(false);
    }
  };

  const specs: Spec[] = [
    {
      label: copy.brand,
      value: (perfume: Perfume) => perfume.brand || "-",
    },
    {
      label: copy.gender,
      value: (perfume: Perfume) => perfume.gender || "-",
    },
    {
      label: copy.price,
      value: (perfume: Perfume) => (perfume.sizes[0] ? `${perfume.sizes[0].price} ₼` : copy.noPrice),
    },
    {
      label: copy.stock,
      value: (perfume: Perfume) => (perfume.inStock ? copy.inStock : copy.outOfStock),
    },
    {
      label: copy.topNotes,
      value: (perfume: Perfume) => perfume.noteSlugs.top,
      noteRow: true,
    },
    {
      label: copy.heartNotes,
      value: (perfume: Perfume) => perfume.noteSlugs.heart,
      noteRow: true,
    },
    {
      label: copy.baseNotes,
      value: (perfume: Perfume) => perfume.noteSlugs.base,
      noteRow: true,
    },
  ];

  const renderNotes = (slugs: string[]) => {
    if (!slugs.length) {
      return <span>{copy.noNotes}</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {slugs.map((slug) => {
          const note = noteBySlug.get(slug);
          const label = note
            ? localizeNoteLabel({ slug: note.slug, name: note.name }, locale)
            : localizeNoteLabel({ slug, name: toReadableNote(slug) }, locale);

          return (
            <span
              key={slug}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700"
            >
              {note?.image ? (
                <Image
                  src={note.image}
                  alt={note.imageAlt || label}
                  width={16}
                  height={16}
                  unoptimized
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <span className="h-4 w-4 rounded-full bg-zinc-300" />
              )}
              <span>{label}</span>
            </span>
          );
        })}
      </div>
    );
  };
  const renderPerfumeCard = (perfume: Perfume, compact = false) => (
    <article
      key={perfume.id}
      className={[
        "group relative overflow-hidden rounded-[1.75rem] border border-zinc-200/90 bg-[linear-gradient(156deg,rgba(255,255,255,0.97)_0%,rgba(248,248,246,0.93)_48%,rgba(242,242,240,0.92)_100%)] p-4 shadow-[0_16px_34px_rgba(20,20,20,0.07)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(20,20,20,0.12)]",
        compact ? "w-[74vw] max-w-[18.5rem] shrink-0 snap-start" : "",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-5 top-3 h-28 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0)_72%)] opacity-80 blur-xl" />
      <div className="relative mx-auto grid h-52 place-items-center overflow-hidden rounded-[1.25rem] border border-white/80 bg-[linear-gradient(170deg,rgba(255,255,255,0.96)_0%,rgba(239,239,236,0.88)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div className="absolute bottom-4 h-14 w-36 rounded-full bg-zinc-900/15 blur-2xl" />
        <Image
          src={perfume.image}
          alt={perfume.imageAlt || perfume.name}
          width={260}
          height={340}
          unoptimized
          className="relative h-44 w-auto max-w-full object-contain drop-shadow-[0_20px_26px_rgba(0,0,0,0.18)] transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.7rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
            {perfume.brand || "-"}
          </p>
          <p className="mt-1 truncate text-[1.35rem] leading-tight font-semibold tracking-[-0.02em] text-zinc-900">
            {perfume.name}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-600">
          {perfume.sizes[0] ? `${perfume.sizes[0].price} ₼` : copy.noPrice}
        </span>
      </div>
      <Link
        href={`/perfumes/${perfume.slug}`}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-300/90 bg-white/90 px-3.5 py-1.5 text-xs font-semibold tracking-[0.1em] text-zinc-700 uppercase transition-all duration-300 hover:border-zinc-400 hover:bg-white hover:text-zinc-900"
      >
        {copy.openProduct}
        <ArrowRight size={12} weight="bold" />
      </Link>
    </article>
  );

  return (
    <section ref={shellRef} className="space-y-6 pb-10">
      <section className="space-y-4 border-b border-zinc-200/80 pb-7">
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: SLOT_COUNT }, (_, index) => {
            const selected = bySlug.get(selectedSlugs[index] ?? "");
            const options = availableBySlot[index] ?? [];
            return (
              <div key={`compare-slot-${index}`} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenSlot((prev) => (prev === index ? null : index))}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white/92 px-4 text-left shadow-[0_10px_24px_rgba(24,24,24,0.05)] transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(24,24,24,0.08)]"
                >
                  {selected ? (
                    <Image
                      src={selected.image}
                      alt={selected.imageAlt || selected.name}
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 rounded-xl object-contain bg-zinc-50"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100 text-xs font-semibold text-zinc-500">
                      {index + 1}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase">
                      {copy.slotLabel} {index + 1}
                    </p>
                    <p className="truncate text-sm font-medium text-zinc-800">
                      {selected ? selected.name : copy.selectPlaceholder}
                    </p>
                  </div>
                  <CaretDown
                    size={14}
                    weight="bold"
                    className={`text-zinc-500 transition-transform duration-200 ${openSlot === index ? "rotate-180" : ""}`}
                  />
                </button>

                {selected ? (
                  <button
                    type="button"
                    onClick={() => clearSlot(index)}
                    className="mt-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 transition-colors duration-200 hover:bg-zinc-100"
                  >
                    <X size={12} />
                    {copy.clear}
                  </button>
                ) : null}

                {openSlot === index ? (
                  <div className="absolute top-[calc(100%+0.55rem)] left-0 z-30 max-h-72 w-full overflow-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_20px_44px_rgba(20,20,20,0.16)]">
                    <div className="px-2 pb-2">
                      <input
                        value={slotQueries[index] ?? ""}
                        onChange={(event) =>
                          setSlotQueries((prev) => {
                            const next = [...prev];
                            next[index] = event.target.value;
                            return next;
                          })
                        }
                        placeholder={copy.searchPlaceholder}
                        className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-sm text-zinc-700 outline-none focus:border-zinc-300 focus:bg-white"
                      />
                    </div>
                    {options.map((item) => (
                      <button
                        key={`${item.slug}-${item.brand}`}
                        type="button"
                        onClick={() => {
                          setSlot(index, item.slug);
                          setOpenSlot(null);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-200 ${
                          selected?.slug === item.slug
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="ml-auto text-[11px] text-zinc-400">{item.brand}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {selectedPerfumes.length < 2 ? (
        <section className="px-1 text-sm text-zinc-600">{copy.compareHint}</section>
      ) : (
        <>
          <section className="rounded-[1.95rem] border border-zinc-200/85 bg-white/96 p-5 shadow-[0_20px_54px_rgba(24,24,24,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.72rem] font-semibold tracking-[0.15em] text-zinc-500 uppercase">
                {copy.aiSummaryTitle}
              </p>
              <button
                type="button"
                onClick={() => {
                  void summarizeCompare();
                }}
                disabled={isAiLoading || selectedPerfumes.length < 2}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 shadow-[0_8px_20px_rgba(24,24,24,0.08)] transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(24,24,24,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkle size={15} weight="duotone" className={isAiLoading ? "animate-spin" : ""} />
                {isAiLoading ? copy.aiSummaryLoading : copy.aiSummaryAction}
              </button>
            </div>
            {aiRemaining !== null ? (
              <p className="mt-2 text-xs text-zinc-500">{copy.aiSummaryRemaining.replace("{count}", String(aiRemaining))}</p>
            ) : null}
            {aiError ? (
              <p className="mt-3 rounded-xl border border-zinc-200 bg-white/85 px-3 py-2 text-sm text-zinc-600">{aiError}</p>
            ) : null}
            {aiSummary ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-white/88 px-4 py-3">
                <p className="text-sm leading-6 text-zinc-700">{aiSummary}</p>
                {aiHighlights.length ? (
                  <>
                    <p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                      {copy.aiSummaryHighlights}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {aiHighlights.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-zinc-600">
                          <span className="mt-[8px] inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="md:hidden">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex snap-x snap-mandatory gap-3">
                {selectedPerfumes.map((perfume) => renderPerfumeCard(perfume, true))}
              </div>
            </div>
          </section>

          <section
            className="hidden gap-3 md:grid"
            style={{ gridTemplateColumns: `repeat(${selectedPerfumes.length}, minmax(0, 1fr))` }}
          >
            {selectedPerfumes.map((perfume) => renderPerfumeCard(perfume))}
          </section>

          <section className="overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-white/94 shadow-[0_14px_34px_rgba(20,20,20,0.06)]">
            <div className="border-b border-zinc-200/70 px-5 py-4">
              <h2 className="text-sm font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.specs}</h2>
            </div>

            <div className="overflow-x-auto">
              <div
                className="min-w-[740px]"
                style={{ gridTemplateColumns: `220px repeat(${selectedPerfumes.length}, minmax(0, 1fr))` }}
              >
                {specs.map((spec, rowIndex) => (
                  <div
                    key={spec.label}
                    className={`grid ${rowIndex !== specs.length - 1 ? "border-b border-zinc-200/65" : ""}`}
                    style={{ gridTemplateColumns: `220px repeat(${selectedPerfumes.length}, minmax(0, 1fr))` }}
                  >
                    <div className="bg-zinc-50/80 px-5 py-4 text-sm font-semibold text-zinc-700">
                      {spec.label}
                    </div>
                    {selectedPerfumes.map((perfume) => (
                      <div key={`${spec.label}-${perfume.id}`} className="px-5 py-4 text-sm leading-6 text-zinc-700">
                        {spec.noteRow ? renderNotes(spec.value(perfume)) : spec.value(perfume)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
