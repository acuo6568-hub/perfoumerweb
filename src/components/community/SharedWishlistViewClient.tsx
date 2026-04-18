"use client";

import { CaretDown, Check, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import type { Locale } from "@/lib/i18n";
import type { Perfume } from "@/types/catalog";

type SharedWishlistViewClientProps = {
  locale: Locale;
  token: string;
  allPerfumes: Perfume[];
  initialSlugs: string[];
  allowAdditions: boolean;
  addTitle: string;
  addDescription: string;
  addAction: string;
  adding: string;
  addSuccess: string;
  addError: string;
  empty: string;
};

export function SharedWishlistViewClient({
  locale,
  token,
  allPerfumes,
  initialSlugs,
  allowAdditions,
  addTitle,
  addDescription,
  addAction,
  adding,
  addSuccess,
  addError,
  empty,
}: SharedWishlistViewClientProps) {
  const pickerCopy = {
    az: {
      placeholder: "Ətir axtar və seç",
      noResults: "Uyğun ətir tapılmadı",
      selected: "Seçildi",
    },
    en: {
      placeholder: "Search and select perfume",
      noResults: "No matching perfumes",
      selected: "Selected",
    },
    ru: {
      placeholder: "Найдите и выберите аромат",
      noResults: "Совпадений не найдено",
      selected: "Выбрано",
    },
  }[locale];

  const [slugs, setSlugs] = useState<string[]>(initialSlugs);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [query, setQuery] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const perfumesBySlug = useMemo(() => new Map(allPerfumes.map((item) => [item.slug, item])), [allPerfumes]);

  const selectedPerfumes = useMemo(
    () => slugs.map((slug) => perfumesBySlug.get(slug)).filter((item): item is Perfume => Boolean(item)),
    [perfumesBySlug, slugs],
  );

  const selectablePerfumes = useMemo(
    () => allPerfumes.filter((item) => !slugs.includes(item.slug)),
    [allPerfumes, slugs],
  );

  const filteredPerfumes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return selectablePerfumes.slice(0, 10);
    }

    return selectablePerfumes
      .filter((item) => {
        const haystack = `${item.name} ${item.brand}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 10);
  }, [query, selectablePerfumes]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!pickerRef.current) {
        return;
      }

      if (!pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  const getOptionLabel = (item: Perfume) => `${item.name} - ${item.brand}`;

  const addPerfume = async () => {
    if (!selectedSlug || isAdding) {
      return;
    }

    setIsAdding(true);
    setMessage("");

    try {
      const response = await fetch(`/api/wishlist/shared/${token}/add`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ perfumeSlug: selectedSlug }),
      });

      if (!response.ok) {
        setMessage(addError);
        setIsAdding(false);
        return;
      }

      setSlugs((current) => (current.includes(selectedSlug) ? current : [selectedSlug, ...current]));
      setSelectedSlug("");
      setQuery("");
      setIsPickerOpen(false);
      setMessage(addSuccess);
    } catch {
      setMessage(addError);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      {allowAdditions ? (
        <div className="rounded-[1.4rem] border border-zinc-200 bg-white px-4 py-4 shadow-[0_8px_28px_rgba(16,16,16,0.04)]">
          <p className="text-sm font-medium text-zinc-900">{addTitle}</p>
          <p className="mt-1 text-sm text-zinc-600">{addDescription}</p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start" ref={pickerRef}>
            <div className="relative w-full sm:max-w-2xl">
              <div
                className={[
                  "flex min-h-11 items-center gap-2 rounded-full border bg-white px-4 transition-all",
                  isPickerOpen ? "border-zinc-900 shadow-[0_10px_22px_rgba(20,20,20,0.1)]" : "border-zinc-300",
                ].join(" ")}
              >
                <MagnifyingGlass size={16} className="text-zinc-500" />
                <input
                  value={query}
                  onFocus={() => setIsPickerOpen(true)}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedSlug("");
                    setIsPickerOpen(true);
                  }}
                  placeholder={pickerCopy.placeholder}
                  className="w-full bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setIsPickerOpen((prev) => !prev)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100"
                >
                  <CaretDown size={14} className={isPickerOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
              </div>

              {isPickerOpen ? (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_18px_34px_rgba(20,20,20,0.12)]">
                  {filteredPerfumes.length ? (
                    filteredPerfumes.map((item) => {
                      const isSelected = selectedSlug === item.slug;
                      return (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => {
                            setSelectedSlug(item.slug);
                            setQuery(getOptionLabel(item));
                            setIsPickerOpen(false);
                          }}
                          className={[
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition",
                            isSelected ? "bg-zinc-100" : "hover:bg-zinc-50",
                          ].join(" ")}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-zinc-800">{item.name}</span>
                            <span className="block truncate text-xs text-zinc-500">{item.brand}</span>
                          </span>
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700">
                              <Check size={13} weight="bold" />
                              {pickerCopy.selected}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-3 text-sm text-zinc-500">{pickerCopy.noResults}</p>
                  )}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={addPerfume}
              disabled={!selectedSlug || isAdding}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-zinc-800 disabled:opacity-60"
            >
              <Plus size={15} weight="bold" />
              {isAdding ? adding : addAction}
            </button>
          </div>

          {message ? <p className="mt-2 text-xs text-zinc-600">{message}</p> : null}
        </div>
      ) : null}

      {selectedPerfumes.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {selectedPerfumes.map((perfume) => (
            <ProductCard key={perfume.id} perfume={perfume} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-600">{empty}</p>
      )}
    </div>
  );
}
