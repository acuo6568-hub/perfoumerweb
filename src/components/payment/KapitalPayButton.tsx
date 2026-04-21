"use client";

import type { Locale } from "@/lib/i18n";
import { toLocalePath } from "@/lib/i18n";

type KapitalPayButtonProps = {
  locale: Locale;
  label: string;
  perfumeSlug: string;
  perfumeName: string;
  amount: number;
  returnPath?: string;
  className?: string;
  disabled?: boolean;
};

export function KapitalPayButton({
  locale,
  label,
  perfumeSlug,
  perfumeName,
  amount,
  returnPath,
  className,
  disabled = false,
}: KapitalPayButtonProps) {
  const nextPath = toLocalePath(`/perfumes/${perfumeSlug}`, locale);
  const query = new URLSearchParams({
    locale,
    perfumeSlug,
    perfumeName,
    amount: String(amount),
    returnPath: returnPath ?? `${toLocalePath("/payment/epoint/callback", locale)}?next=${encodeURIComponent(nextPath)}`,
  });

  const href = `/api/payments/epoint?${query.toString()}`;
  const resolvedClassName =
    className ??
    "detail-cta detail-cta-primary inline-flex min-h-13 w-full items-center justify-center rounded-full bg-[#31302f] px-6 text-lg font-medium text-white";

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={`${resolvedClassName} cursor-not-allowed opacity-60`}
      >
        {label}
      </button>
    );
  }

  return (
    <a
      href={href}
      className={resolvedClassName}
    >
      {label}
    </a>
  );
}
