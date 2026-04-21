"use client";

import { useCallback, useEffect, useState } from "react";
import { AIChatModal } from "./AIChatModal";
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
  const [mounted, setMounted] = useState(false);
  const [isUiOverlayOpen, setIsUiOverlayOpen] = useState(false);
  const [isSignupBannerOpen, setIsSignupBannerOpen] = useState(false);
  const copy = copyByLocale[locale];

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frameId);
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

  if (!mounted) return null;

  return (
    <AIChatModal
      isOpen={isOpen}
      onOpen={handleOpen}
      onClose={handleClose}
      isTriggerHidden={isUiOverlayOpen || isSignupBannerOpen}
      locale={locale}
      womanVideoUrl="/womanvideo.mp4"
      contactVideoUrl="/contactvideo.mp4"
      triggerLabel={copy}
    />
  );
}
