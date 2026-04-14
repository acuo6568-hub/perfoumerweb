"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n";

type ProductOption = {
  slug: string;
  name: string;
  brand: string;
};

type HomeFeaturedSearchProps = {
  locale: Locale;
  products: ProductOption[];
};

const searchCopyByLocale: Record<
  Locale,
  {
    placeholder: string;
    submitAria: string;
  }
> = {
  az: {
    placeholder: "Məhsul, marka və ya not axtar...",
    submitAria: "Kataloqda axtar",
  },
  en: {
    placeholder: "Search by product, brand, or notes...",
    submitAria: "Search in catalog",
  },
  ru: {
    placeholder: "Ищите по товару, бренду или нотам...",
    submitAria: "Искать в каталоге",
  },
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

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİəƏæÆœŒøØđĐłŁþÞðÐß]/g, (char) => SEARCH_CHAR_FOLD_MAP[char] ?? char)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function suggestionScore(product: ProductOption, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedName = normalizeSearchText(product.name);
  const normalizedBrand = normalizeSearchText(product.brand);
  const haystack = `${normalizedName} ${normalizedBrand}`;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (!tokens.length) return 0;

  // Require every token to exist so suggestions stay accurate.
  const matchesAllTokens = tokens.every((token) => haystack.includes(token));
  if (!matchesAllTokens) return 0;

  let score = 0;

  if (normalizedName.startsWith(normalizedQuery)) score += 230;
  else if (normalizedName.includes(normalizedQuery)) score += 145;

  if (normalizedBrand.startsWith(normalizedQuery)) score += 100;
  else if (normalizedBrand.includes(normalizedQuery)) score += 65;

  // Favor tighter matches over broad ones.
  score += Math.max(0, 30 - Math.abs(normalizedName.length - normalizedQuery.length));

  return score;
}

export function HomeFeaturedSearch({ locale, products }: HomeFeaturedSearchProps) {
  const router = useRouter();
  const copy = searchCopyByLocale[locale];
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const normalizedQuery = query.trim();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 220);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query]);

  const suggestions = useMemo(() => {
    const normalizedQueryValue = normalizeSearchText(debouncedQuery);

    if (!normalizedQueryValue || normalizedQueryValue.length < 2) {
      return [] as ProductOption[];
    }

    return products
      .map((product) => ({
        product,
        score: suggestionScore(product, normalizedQueryValue),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.product);
  }, [debouncedQuery, products]);
  const shouldShowSuggestions = isOpen && normalizedQuery.length >= 2 && suggestions.length > 0;

  const navigateToCatalog = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      router.push("/catalog");
      return;
    }

    router.push(`/catalog?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl text-left">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setIsOpen(false);
          navigateToCatalog(query);
        }}
        className="relative"
      >
        <div className="group flex items-center gap-2 rounded-[1.35rem] border border-zinc-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf8_100%)] px-2 py-2 shadow-[0_16px_38px_rgba(22,22,24,0.08)] transition-all duration-300 focus-within:border-zinc-300 focus-within:shadow-[0_20px_44px_rgba(22,22,24,0.12)]">
          <span className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition group-focus-within:bg-zinc-900 group-focus-within:text-white">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M8.75 2.5a6.25 6.25 0 104.03 11.03l3.84 3.84a.75.75 0 101.06-1.06l-3.84-3.84A6.25 6.25 0 008.75 2.5zm0 1.5a4.75 4.75 0 110 9.5 4.75 4.75 0 010-9.5z" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuery(nextValue);
              setIsOpen(nextValue.trim().length >= 2);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) {
                setIsOpen(true);
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setIsOpen(false), 120);
            }}
            placeholder={copy.placeholder}
            className="w-full rounded-xl bg-transparent px-1 py-2.5 text-[15px] text-zinc-800 outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            aria-label={copy.submitAria}
            className="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white transition hover:bg-zinc-800"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M4.25 10a.75.75 0 01.75-.75h8.19L10.47 6.53a.75.75 0 111.06-1.06l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 11-1.06-1.06l2.72-2.72H5a.75.75 0 01-.75-.75z" />
            </svg>
          </button>
        </div>

        {shouldShowSuggestions ? (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 overflow-hidden rounded-[1.2rem] border border-zinc-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfa_100%)] shadow-[0_22px_40px_rgba(24,24,24,0.12)]">
            {suggestions.map((product) => (
              <button
                key={product.slug}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setIsOpen(false);
                  setQuery(product.name);
                  navigateToCatalog(product.name);
                }}
                className="flex w-full items-center justify-between gap-3 border-b border-zinc-100/90 px-4 py-3 text-left transition last:border-b-0 hover:bg-zinc-50"
              >
                <span className="truncate text-sm font-medium text-zinc-800">{product.name}</span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[11px] tracking-[0.02em] text-zinc-600">
                  {product.brand}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  );
}
