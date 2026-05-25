"use client";

import React, { useCallback, useRef, useState } from "react";
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
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  const navigate = useCallback(async () => {
    if (!href) return;
    try {
      await router.push(href);
    } catch {
      // fallback
      window.location.href = href;
    }
  }, [href, router]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (onStart) onStart();
    if (playing) return;
    setPlaying(true);

    const el = ref.current;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      setPlaying(false);
      if (href) void navigate();
    };

    if (el) {
      const onAnimEnd = () => finish();
      el.addEventListener("animationend", onAnimEnd, { once: true });
      // safety fallback
      window.setTimeout(finish, 600);
    } else {
      window.setTimeout(finish, 600);
    }
  }, [href, navigate, onStart, playing]);

  return (
    <button
      ref={ref}
      onClick={handleClick}
      aria-label={ariaLabel}
      className={["animated-icon inline-flex items-center justify-center", className, playing ? "play" : ""].join(" ")}
      role={href ? "link" : "button"}
    >
      {children}
    </button>
  );
}
