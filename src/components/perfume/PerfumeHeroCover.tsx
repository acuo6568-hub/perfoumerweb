"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type PerfumeHeroCoverProps = {
  src: string;
  alt: string;
};

export function PerfumeHeroCover({ src, alt }: PerfumeHeroCoverProps) {
  const fallbackSrc = "/perfoumerlogo.png";
  const initialSrc = useMemo(() => (src?.trim() ? src : fallbackSrc), [src]);
  const [imageSrc, setImageSrc] = useState(initialSrc);

  return (
    <div className="relative overflow-hidden rounded-[2.15rem] p-8 shadow-[0_24px_70px_rgba(24,24,24,0.08)] ring-1 ring-white/70 md:p-12 xl:flex xl:h-[calc(100vh-10rem)] xl:items-center xl:justify-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "linear-gradient(180deg,#f1f1ef 0%, #e5e3de 100%)" }}
      />
      <div
        aria-hidden="true"
        className="perfume-cover-overlay pointer-events-none absolute inset-0 bg-[radial-gradient(110%_86%_at_16%_20%,rgba(255,255,255,0.62)_0%,rgba(255,255,255,0.16)_38%,rgba(255,255,255,0)_68%),linear-gradient(104deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.08)_46%,rgba(214,212,208,0.22)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-7 h-10 w-[58%] -translate-x-[30%] rounded-full bg-zinc-900/11 blur-3xl md:bottom-8 md:h-12"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-6 h-8 w-[42%] -translate-x-[12%] rotate-[1.6deg] rounded-full bg-zinc-900/8 blur-2xl md:bottom-7 md:h-9"
      />
      <Image
        src={imageSrc}
        alt={alt}
        width={900}
        height={1200}
        priority
        sizes="(max-width: 767px) 82vw, (max-width: 1279px) 72vw, 38vw"
        className="relative z-[1] mx-auto h-[420px] w-auto max-w-full object-contain drop-shadow-[12px_26px_30px_rgba(0,0,0,0.22)] md:h-[560px] xl:h-[min(70vh,640px)] xl:max-w-[74%]"
        onError={() => {
          if (imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
          }
        }}
      />
    </div>
  );
}

/*
ARCHIVED: Image-based color aura logic kept for future reuse.
Previous implementation used:
- types: Rgb
- constants: DEFAULT_PALETTE
- helpers: clamp, colorDistance, soften, toRgba, buildGradientLayers, extractPalette
- hooks in component: useState/useEffect/useMemo to extract palette from `src`
- overlay layers: perfume-cover-aura-layer A/B/C
*/
