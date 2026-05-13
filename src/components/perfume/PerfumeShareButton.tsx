"use client";

import { Check, ShareNetwork } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { useSiteSettings } from "@/components/site-settings/SiteSettingsProvider";
import type { Locale } from "@/lib/i18n";

type PerfumeShareButtonProps = {
  locale: Locale;
  title: string;
  url: string;
};

const copyByLocale = {
  az: {
    label: "Paylaş",
    copied: "Link kopyalandı",
    share: "Məhsulu paylaş",
  },
  en: {
    label: "Share",
    copied: "Link copied",
    share: "Share product",
  },
  ru: {
    label: "Поделиться",
    copied: "Ссылка скопирована",
    share: "Поделиться товаром",
  },
} as const;

export function PerfumeShareButton({ locale, title, url }: PerfumeShareButtonProps) {
  const siteSettings = useSiteSettings();
  const copy = copyByLocale[locale];
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const shareData = useMemo(
    () => ({
      title,
      text: `${title} · ${siteSettings.siteName}`,
      url,
    }),
    [siteSettings.siteName, title, url],
  );

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      return true;
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    if (isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        setCopied(false);
        return;
      }

      const copiedSuccessfully = await copyLink();
      if (!copiedSuccessfully) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="group inline-flex h-12 min-w-[9.75rem] items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-[0_10px_24px_rgba(18,18,18,0.06)] active:translate-y-0"
      aria-label={copy.share}
      aria-live="polite"
      aria-busy={isSharing}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white transition duration-300 group-hover:bg-zinc-800">
        {copied ? <Check size={16} weight="bold" /> : <ShareNetwork size={16} weight="bold" />}
      </span>
      <span className="leading-none tracking-[-0.01em] text-zinc-800">
        {copied ? copy.copied : copy.label}
      </span>
    </button>
  );
}
