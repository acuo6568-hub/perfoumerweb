"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type BlogHeroParallaxProps = {
  imageSrc: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
};

export function BlogHeroParallax({
  imageSrc,
  imageAlt,
  eyebrow,
  title,
  description,
}: BlogHeroParallaxProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let raf = 0;

    const updateOffset = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) {
        return;
      }

      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      setOffset((clamped - 0.5) * 160);
    };

    const onScroll = () => {
      if (raf) {
        return;
      }
      raf = window.requestAnimationFrame(updateOffset);
    };

    updateOffset();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative left-1/2 right-1/2 mt-2 h-[360px] w-[calc(100vw-1rem)] -translate-x-1/2 overflow-hidden rounded-[2rem] sm:h-[420px] sm:w-[calc(100vw-1.5rem)] md:h-[520px] md:w-[calc(100vw-2rem)]"
    >
      <div
        className="absolute inset-[-15%] will-change-transform"
        style={{ transform: `translate3d(0, ${offset}px, 0)` }}
      >
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.08)_0%,rgba(10,10,10,0.22)_45%,rgba(10,10,10,0.58)_100%)]" />
      <div className="pointer-events-none absolute inset-x-[-8%] bottom-[-10%] h-[50%] bg-[radial-gradient(ellipse_at_center,rgba(247,186,110,0.74)_0%,rgba(247,186,110,0.34)_34%,rgba(20,14,11,0)_72%)] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-2 bottom-2 h-36 rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(255,214,156,0.18)_0%,rgba(12,9,8,0.44)_100%)] blur-3xl sm:inset-x-5 sm:bottom-4 sm:h-40 md:inset-x-8 md:bottom-6 md:h-44" />

      <div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-8 md:inset-x-12 md:bottom-10">
        <div className="max-w-5xl rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(22,16,12,0.18)_0%,rgba(22,16,12,0.32)_100%)] px-3 py-3 backdrop-blur-md sm:px-4 sm:py-4 md:px-5 md:py-5">
          <p className="text-[0.68rem] tracking-[0.2em] text-white/80 uppercase">{eyebrow}</p>
          <h1 className="mt-2 max-w-[18ch] text-[clamp(2rem,5vw,5.1rem)] leading-[0.96] tracking-[-0.025em] text-white">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85 md:text-[1.02rem]">{description}</p>
        </div>
      </div>
    </section>
  );
}
