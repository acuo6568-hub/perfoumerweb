"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getLegalPageLinks } from "@/lib/legal";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type FooterProps = {
  locale: Locale;
};

export function Footer({ locale }: FooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const t = getDictionary(locale);
  const legalLinks = getLegalPageLinks(locale);

  useEffect(() => {
    let raf = 0;

    const updateProgress = () => {
      raf = 0;
      const footer = footerRef.current;
      if (!footer) return;

      const rect = footer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const start = viewportHeight * 0.92;
      const end = -rect.height * 0.26;
      const next = clamp((start - rect.top) / (start - end), 0, 1);
      setProgress(next);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const wordmarkStyle = {
    transform: `translate3d(0, ${(1 - progress) * 46}px, 0)`,
    opacity: 0.2 + progress * 0.8,
    letterSpacing: `${-0.022 + progress * 0.012}em`,
  };

  return (
    <footer id="contact" ref={footerRef} className="mt-16 bg-[#f3f3f2] pb-12 md:mt-20 md:pb-14">
      <div className="mx-auto max-w-[1540px] px-6 md:px-10">
        <div className="overflow-hidden rounded-[2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.64)_0%,rgba(245,245,243,0.7)_100%)] shadow-[0_24px_56px_rgba(26,26,26,0.06)] ring-1 ring-zinc-200/45">
          <div className="grid gap-10 px-6 pt-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-10 md:px-10 md:pt-12 xl:px-12">
            <div className="text-center md:text-left">
              <p className="text-[0.88rem] font-medium tracking-[0.06em] text-zinc-500 uppercase">{t.footer.contact}</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
                <a
                  href="mailto:info@perfoumer.az"
                  className="text-[1.1rem] font-medium leading-[1.25] text-zinc-500 transition-colors hover:text-zinc-700"
                >
                  info@perfoumer.az
                </a>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <a
                  href="tel:+994507078070"
                  className="text-[1.1rem] font-medium leading-[1.25] text-zinc-500 transition-colors hover:text-zinc-700"
                >
                  +994 50 707 80 70
                </a>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <a
                  href="https://wa.me/994507078070"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[1.1rem] font-medium leading-[1.25] text-zinc-500 transition-colors hover:text-zinc-700"
                >
                  WhatsApp
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-end md:gap-12">
              <div className="text-center md:text-right">
                <p className="text-[0.88rem] font-medium tracking-[0.06em] text-zinc-500 uppercase">Legal</p>
                <nav aria-label="Legal pages" className="mt-5 flex flex-col items-center gap-2.5 text-base leading-[1.3] text-zinc-600 md:items-end">
                  {legalLinks.map((link) => (
                    <Link key={link.slug} href={link.href} className="transition-colors hover:text-zinc-900">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="text-center md:text-right">
                <p className="text-[0.88rem] font-medium tracking-[0.06em] text-zinc-500 uppercase">{t.footer.pages}</p>
                <nav className="mt-5 flex flex-col items-center gap-2.5 text-base leading-[1.3] text-zinc-600 md:items-end">
                  <Link href="/haqqimizda" className="transition-colors hover:text-zinc-900">
                    Haqqımızda
                  </Link>
                  <Link href="/catalog" className="transition-colors hover:text-zinc-900">
                    {t.footer.products}
                  </Link>
                  <Link href="/brands" className="transition-colors hover:text-zinc-900">
                    {t.footer.brands}
                  </Link>
                  <Link href="/blog" className="transition-colors hover:text-zinc-900">
                    {t.footer.blog}
                  </Link>
                  <Link href="/elaqe" className="transition-colors hover:text-zinc-900">
                    Əlaqə və ünvan
                  </Link>
                </nav>
              </div>

              <div className="text-center md:text-right">
                <p className="text-[0.88rem] font-medium tracking-[0.06em] text-zinc-500 uppercase">Əlaqə kanalları</p>
                <div className="mt-5 flex flex-col items-center gap-2.5 text-base leading-[1.3] text-zinc-600 md:items-end">
                  <a href="mailto:info@perfoumer.az" className="transition-colors hover:text-zinc-900">
                    E-poçt
                  </a>
                  <a href="tel:+994507078070" className="transition-colors hover:text-zinc-900">
                    Telefon
                  </a>
                  <a href="https://wa.me/994507078070" target="_blank" rel="noreferrer" className="transition-colors hover:text-zinc-900">
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden border-t border-zinc-200/65 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(248,248,246,0.72)_100%)] px-6 pt-2 pb-2 md:mt-6 md:px-10 md:pb-3 xl:px-12">
            <div className="flex flex-col items-start gap-1 text-left">
              <a
                href="https://wa.me/bakhishov"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-700"
              >
                © 2026 Bakhishov Brands <span className="mx-2">—</span> Perfoumer.az
              </a>
              <p
                className="footer-wordmark footer-wordmark-animated mt-2 select-none whitespace-nowrap leading-[0.78] text-zinc-800 will-change-transform"
                style={{
                  ...wordmarkStyle,
                  fontSize: "clamp(4.8rem, 16vw, 16rem)",
                  letterSpacing: "-0.11em",
                  transform: `${wordmarkStyle.transform} translateX(0) translateY(8px)`,
                }}
              >
                   PERFOUMER
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
