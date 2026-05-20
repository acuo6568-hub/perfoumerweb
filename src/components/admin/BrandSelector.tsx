"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

interface BrandSelectorProps {
  value: string;
  onChange: (brand: string) => void;
  brands: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  createLabel?: (brand: string) => string;
  newTagLabel?: string;
}

export function BrandSelector({
  value,
  onChange,
  brands,
  placeholder = "Select or create brand",
  searchPlaceholder = "Search brands...",
  noResultsLabel = "No brands found",
  createLabel = (brand) => `+ Create "${brand}"`,
  newTagLabel = "NEW",
}: BrandSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [localValue, setLocalValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = brands.filter((brand) => brand.toLowerCase().includes(search.toLowerCase()));
  const isNewBrand = localValue && !brands.includes(localValue);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      inputRef.current?.focus();
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (brand: string) => {
    const nextBrand = brand.trim();
    setLocalValue(nextBrand);
    onChange(nextBrand);
    setIsOpen(false);
    setSearch("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (filtered.length === 0) return;
        setHighlightedIndex((current) => (current + 1) % filtered.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (filtered.length === 0) return;
        setHighlightedIndex((current) => (current <= 0 ? filtered.length - 1 : current - 1));
        break;
      case "Enter":
        event.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        } else if (search.trim()) {
          handleSelect(search.trim());
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-12 w-full items-center gap-2 rounded-2xl border border-zinc-300 bg-[#f7f7f5] px-4 text-left transition duration-200 hover:border-zinc-400"
      >
        {localValue ? (
          <>
            <span className="flex-1 text-sm text-zinc-900">{localValue}</span>
            {isNewBrand ? <span className="text-xs font-semibold text-blue-600">{newTagLabel}</span> : null}
            <span
              role="button"
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation();
                setLocalValue("");
                setSearch("");
                setHighlightedIndex(-1);
                onChange("");
              }}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X size={16} weight="bold" />
            </span>
          </>
        ) : (
          <span className="text-sm text-zinc-400">{placeholder}</span>
        )}
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
            <MagnifyingGlass size={18} weight="bold" className="text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((brand, index) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleSelect(brand)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-4 py-3 text-left text-sm transition ${
                    highlightedIndex === index
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  {brand}
                </button>
              ))
            ) : search.trim() ? (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full px-4 py-3 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50"
              >
                {createLabel(search.trim())}
              </button>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-zinc-400">{noResultsLabel}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}