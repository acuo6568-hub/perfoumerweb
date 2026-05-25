"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";

type Props = {
  href?: string;
  className?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
  onStart?: () => void;
};

export default function AnimatedIconButton({ href, className = "", children, ariaLabel, onStart }: Props) {
  const router = useRouter();
  const navigate = useCallback(() => {
    if (!href) return;
    try {
      void router.push(href);
    } catch {
      window.location.href = href;
    }
  }, [href, router]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (onStart) onStart();
    if (href) navigate();
  }, [href, navigate, onStart]);

  return (
    <button
      onClick={handleClick}
      aria-label={ariaLabel}
      className={["animated-icon inline-flex items-center justify-center", className].join(" ")}
      role={href ? "link" : "button"}
    >
      {children}
    </button>
  );
}
