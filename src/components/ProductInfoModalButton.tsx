"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "@phosphor-icons/react";
import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import { getDictionary, type Locale } from "@/lib/i18n";

type ProductInfoModalButtonProps = {
  locale: Locale;
};

export function ProductInfoModalButton({ locale }: ProductInfoModalButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const siteSettings = useSiteSettings();
  const t = getDictionary(locale, siteSettings);

  const openModal = () => {
    setIsMounted(true);
    window.setTimeout(() => {
      setIsVisible(true);
    }, 10);
  };

  const closeModal = () => {
    setIsVisible(false);
    window.setTimeout(() => {
      setIsMounted(false);
    }, 220);
  };

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMounted]);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        onTouchStart={openModal}
        className="mx-auto flex items-center justify-center gap-2 text-center text-[1.05rem] text-zinc-500 transition-colors duration-300 hover:text-zinc-800"
        style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
      >
        <Info size={18} weight="fill" className="text-current" />
        {t.modal.title}
      </button>

      {isMounted && typeof document !== "undefined"
        ? createPortal(
        <div
          className={[
            "fixed inset-0 z-[130] flex items-end justify-center bg-zinc-900/35 px-0 backdrop-blur-[2px] transition-all duration-200 sm:items-center sm:px-4",
            isVisible
              ? "opacity-100"
              : "opacity-0",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className={[
              "w-full rounded-t-3xl border border-zinc-200 bg-white p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_28px_64px_rgba(18,18,18,0.24)] transition-all duration-220 sm:max-w-md sm:rounded-3xl sm:pb-6",
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0 sm:translate-y-2",
            ].join(" ")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.78rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
                  {t.modal.info}
                </p>
                <h3 className="mt-2 text-[1.65rem] leading-[1.02] tracking-[-0.03em] text-zinc-900 sm:text-[1.9rem]">
                  {t.modal.title}
                </h3>
              </div>

              <button
                type="button"
                aria-label="Bağla"
                onClick={closeModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors duration-300 hover:text-zinc-900"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-5 py-4">
              <p className="text-sm leading-7 text-zinc-600 sm:text-base">
                {t.modal.body}
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}
