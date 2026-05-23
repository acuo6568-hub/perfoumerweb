"use client";

import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

type CategoryOption = {
  id: string;
  label: string;
};

type BrandItem = {
  name: string;
  href: string;
  categories: string[];
};

type BrandGroup = {
  letter: string;
  items: BrandItem[];
};

type BrandsDirectoryProps = {
  groupedBrands: BrandGroup[];
  categoryOptions: CategoryOption[];
  dropdownAriaLabel: string;
};

function slugForLetter(letter: string) {
  return `brands-letter-${letter.toLowerCase()}`;
}

export function BrandsDirectory({ groupedBrands, categoryOptions, dropdownAriaLabel }: BrandsDirectoryProps) {
  const [activeCategory, setActiveCategory] = useState(categoryOptions[0]?.id ?? "all");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(event.target as Node)) return;
      setIsSelectOpen(false);
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredGroups = useMemo(() => {
    const normalized = activeCategory.toLowerCase();
    const shouldFilter = normalized === "women" || normalized === "men" || normalized === "unisex";

    const mapped = groupedBrands
      .map((group) => {
        if (!shouldFilter) return group;

        return {
          ...group,
          items: group.items.filter((item) => item.categories.includes(normalized)),
        };
      })
      .filter((group) => group.items.length > 0);

    return mapped;
  }, [activeCategory, groupedBrands]);

  const letters = filteredGroups.map((group) => group.letter);
  const activeOption = categoryOptions.find((option) => option.id === activeCategory) ?? categoryOptions[0];

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [filteredGroups]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const target = asideRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      target.style.setProperty("--mx", `${x}px`);
      target.style.setProperty("--my", `${y}px`);
    }

    function onLeave() {
      const target = asideRef.current;
      if (!target) return;
      target.style.setProperty("--mx", `0px`);
      target.style.setProperty("--my", `0px`);
    }

    const node = asideRef.current;
    if (!node) return;

    node.addEventListener("mousemove", onMove);
    node.addEventListener("mouseleave", onLeave);
    return () => {
      node.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <section className="pb-8 md:pb-12">
      <div className="relative max-w-[300px]" ref={dropdownRef}>
        <button
          type="button"
          aria-label={dropdownAriaLabel}
          aria-haspopup="listbox"
          aria-expanded={isSelectOpen}
          onClick={() => setIsSelectOpen((current) => !current)}
          className="flex min-h-12 w-full items-center justify-between rounded-xl border border-zinc-300/75 bg-[linear-gradient(150deg,#ffffff_0%,#f5f5f4_100%)] px-3.5 text-[0.9rem] font-medium tracking-[0.12em] uppercase text-zinc-900 shadow-[0_6px_16px_rgba(20,20,24,0.05)] transition-colors duration-200 hover:border-zinc-400"
        >
          <span>{activeOption?.label ?? "ALL"}</span>
          <CaretDown
            size={16}
            weight="bold"
            className={[
              "text-zinc-700 transition-transform duration-200",
              isSelectOpen ? "rotate-180" : "rotate-0",
            ].join(" ")}
          />
        </button>

        <div
          className={[
            "absolute inset-x-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-zinc-300/85 bg-[linear-gradient(180deg,#fafaf9_0%,#f4f4f3_100%)] shadow-[0_14px_30px_rgba(20,20,24,0.1)] transition-all duration-200",
            isSelectOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
          role="listbox"
        >
          {categoryOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setActiveCategory(option.id);
                setIsSelectOpen(false);
              }}
              className="flex min-h-11 w-full items-center border-b border-zinc-200/85 px-4 text-left text-[0.88rem] font-medium tracking-[0.08em] uppercase text-zinc-900 transition-colors last:border-b-0 hover:bg-zinc-200/45"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-start gap-4 sm:gap-7 md:gap-10">
        <aside ref={asideRef} style={{ "--mx": "0px", "--my": "0px" } as React.CSSProperties} className="w-6 shrink-0 pt-1">
          <ul className="space-y-3 text-[1.08rem] leading-none text-indigo-950/90 sm:text-[1.15rem]">
            {letters.map((letter) => (
              <li key={letter}>
                <a
                  href={`#${slugForLetter(letter)}`}
                  className="block transition-all duration-300 hover:opacity-100 hover:-translate-y-1"
                  style={{
                    boxShadow: "calc(var(--mx) * 0.02) calc(var(--my) * 0.02) 18px rgba(17,24,39,0.06)",
                    transform: "translateZ(0)",
                  }}
                >
                  {letter}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 space-y-10 sm:space-y-12">
          {filteredGroups.map((group) => (
            <section key={group.letter} id={slugForLetter(group.letter)} className="scroll-mt-28">
              <div className="font-[family-name:var(--font-playfair)] text-[3rem] leading-none tracking-[-0.02em] text-zinc-900 sm:text-[3.4rem]">
                {group.letter}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-[1.03rem] text-zinc-900 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-x-8 md:gap-y-4">
                {group.items.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block transition-colors duration-200 hover:text-zinc-500"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              <div className="mt-6 border-b border-zinc-300/85 sm:mt-8" />
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
