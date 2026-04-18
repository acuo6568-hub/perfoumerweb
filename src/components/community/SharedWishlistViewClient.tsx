"use client";

import { useMemo, useState } from "react";

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
  const [slugs, setSlugs] = useState<string[]>(initialSlugs);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");

  const perfumesBySlug = useMemo(() => new Map(allPerfumes.map((item) => [item.slug, item])), [allPerfumes]);

  const selectedPerfumes = useMemo(
    () => slugs.map((slug) => perfumesBySlug.get(slug)).filter((item): item is Perfume => Boolean(item)),
    [perfumesBySlug, slugs],
  );

  const selectablePerfumes = useMemo(
    () => allPerfumes.filter((item) => !slugs.includes(item.slug)),
    [allPerfumes, slugs],
  );

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
        <div className="rounded-[1.4rem] border border-zinc-200 bg-white px-4 py-4">
          <p className="text-sm font-medium text-zinc-900">{addTitle}</p>
          <p className="mt-1 text-sm text-zinc-600">{addDescription}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={selectedSlug}
              onChange={(event) => setSelectedSlug(event.target.value)}
              className="min-h-10 min-w-[260px] rounded-full border border-zinc-300 bg-white px-4 text-sm text-zinc-700"
            >
              <option value="">Select perfume</option>
              {selectablePerfumes.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name} - {item.brand}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={addPerfume}
              disabled={!selectedSlug || isAdding}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
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
