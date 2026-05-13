"use client";

import { AIChatModal } from "./AIChatModal";
import { ChatCenteredDots } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";

type AIChatButtonProps = {
  locale: Locale;
};

const copyByLocale: Record<Locale, string> = {
  az: "Kömək lazımdır?",
  en: "Need help?",
  ru: "Нужна помощь?",
};

export function AIChatButton({ locale }: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUiOverlayOpen, setIsUiOverlayOpen] = useState(false);
  const [isSignupBannerOpen, setIsSignupBannerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const copy = copyByLocale[locale];

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleOverlayState = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen?: boolean }>;
      setIsUiOverlayOpen(Boolean(customEvent.detail?.isOpen));
    };

    const handleSignupBannerState = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen?: boolean }>;
      const nextIsOpen = Boolean(customEvent.detail?.isOpen);
      setIsSignupBannerOpen(nextIsOpen);
      if (nextIsOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("perfoumer:ui-overlay", handleOverlayState as EventListener);
    window.addEventListener("perfoumer:signup-banner-visibility", handleSignupBannerState as EventListener);

    return () => {
      window.removeEventListener("perfoumer:ui-overlay", handleOverlayState as EventListener);
      window.removeEventListener("perfoumer:signup-banner-visibility", handleSignupBannerState as EventListener);
    };
  }, []);

  const shouldHideTrigger = isUiOverlayOpen || isSignupBannerOpen || isOpen;

  // When modal is open, show only the modal (it will have its own trigger button inside)
  if (isOpen) {
    return (
      <AIChatModal
        isOpen={isOpen}
        onClose={handleClose}
        isTriggerHidden={false}
        locale={locale}
        womanVideoUrl="/womanvideo.mp4"
        contactVideoUrl="/contactvideo.mp4"
        triggerLabel={copy}
      />
    );
  }

  // When closed, show the minimized button pill
  return (
    <button
      type="button"
      onClick={() => {
        handleOpen();
        setIsExpanded(true);
      }}
      onPointerEnter={() => {
        setIsExpanded(true);
      }}
      onPointerLeave={() => {
        if (!isOpen) setIsExpanded(false);
      }}
      onFocus={() => {
        setIsExpanded(true);
      }}
      onBlur={() => {
        if (!isOpen) setIsExpanded(false);
      }}
      aria-label={copy}
      aria-expanded={isExpanded}
      className={[
        "fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-45 inline-flex items-center justify-center rounded-full bg-gradient-to-b from-zinc-950 via-black to-zinc-950 shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.4)] active:scale-95 sm:right-4 text-white",
        isExpanded
          ? "h-14 w-56 px-4 gap-2"
          : "h-11 w-11 p-0 gap-0",
        shouldHideTrigger ? "pointer-events-none opacity-60" : "pointer-events-auto opacity-100",
      ].join(" ")}
    >
      <ChatCenteredDots 
        size={isExpanded ? 18 : 22} 
        weight="fill"
        className="transition-all duration-300 flex-shrink-0 text-white"
      />
      <span 
        className={[
          "font-medium text-white transition-all duration-300 overflow-hidden",
          isExpanded ? "w-auto whitespace-nowrap text-xs sm:text-sm ml-1" : "w-0",
        ].join(" ")}
      >
        {copy}
      </span>
    </button>
  );
}
