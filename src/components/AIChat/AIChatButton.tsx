"use client";

import dynamic from "next/dynamic";
import { ChatCenteredDots } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";

const LazyAIChatModal = dynamic(
  () => import("./AIChatModal").then((mod) => mod.AIChatModal),
  { ssr: false },
);

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
  const [shouldLoadModal, setShouldLoadModal] = useState(false);
  const [isUiOverlayOpen, setIsUiOverlayOpen] = useState(false);
  const [isSignupBannerOpen, setIsSignupBannerOpen] = useState(false);
  const copy = copyByLocale[locale];

  const warmModal = useCallback(() => {
    setShouldLoadModal(true);
  }, []);

  const handleOpen = useCallback(() => {
    setShouldLoadModal(true);
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

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        onPointerEnter={warmModal}
        onFocus={warmModal}
        aria-label={copy}
        aria-expanded={isOpen}
        className={[
          "fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 inline-flex h-14 w-[220px] items-center justify-center gap-2 rounded-full bg-gradient-to-b from-zinc-950 via-black to-zinc-950 px-5 text-sm font-medium text-white shadow-[0_22px_40px_rgba(0,0,0,0.3)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_26px_48px_rgba(0,0,0,0.34)] sm:right-5",
          shouldHideTrigger ? "pointer-events-none translate-y-3 opacity-0" : "translate-y-0 opacity-100",
        ].join(" ")}
      >
        <ChatCenteredDots size={18} weight="fill" />
        <span>{copy}</span>
      </button>

      {shouldLoadModal ? (
        <LazyAIChatModal
          isOpen={isOpen}
          onClose={handleClose}
          isTriggerHidden
          locale={locale}
          womanVideoUrl="/womanvideo.mp4"
          contactVideoUrl="/contactvideo.mp4"
          triggerLabel={copy}
        />
      ) : null}
    </>
  );
}
