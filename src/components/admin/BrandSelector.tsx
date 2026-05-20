"use client";

import { useState, useRef, useEffect } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

interface BrandSelectorProps {
  value: string;
  onChange: (brand: string) => void;
  brands: string[];
  placeholder?: string;
}

export function BrandSelector({
  value,
  onChange,
  brands,
  placeholder = "Select or create brand",
}: BrandSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = brands.filter((brand) =>
    brand.toLowerCase().includes(search.toLowerCase()),
  );

  const isNewBrand = value && !brands.includes(value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
    onChange(brand);
    setIsOpen(false);
    setSearch("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev <= 0 ? filtered.length - 1 : prev - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
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
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-full rounded-2xl border border-zinc-300 bg-[#f7f7f5] px-4 flex items-center gap-2 cursor-pointer transition duration-200 hover:border-zinc-400"
      >
        {value ? (
          <>
            <span className="flex-1 text-sm text-zinc-900">{value}</span>
            {isNewBrand && (
              <span className="text-xs font-semibold text-blue-600">NEW</span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearch("");
              }}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X size={16} weight="bold" />
            </button>
          </>
        ) : (
          <span className="text-sm text-zinc-400">{placeholder}</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-zinc-300 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
            <MagnifyingGlass size={18} weight="bold" className="text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search brands..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
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
                className="w-full px-4 py-3 text-left text-sm text-blue-600 font-semibold hover:bg-blue-50"
              >
                + Create "{search.trim()}"
              </button>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-zinc-400">
                No brands found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
