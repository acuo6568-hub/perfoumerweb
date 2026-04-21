"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowCounterClockwise, CheckCircle, ShieldCheck, Truck } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { getDictionary, toLocalePath, type Locale } from "@/lib/i18n";
import { instagramSnapshot } from "@/lib/instagram-snapshot";
import { getLegalPageLinks } from "@/lib/legal";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type FooterProps = {
  locale: Locale;
};

type StyleImageItem = {
  id: string;
  src: string;
  alt: string;
  href: string;
};

export function Footer({ locale }: FooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [styleError, setStyleError] = useState("");
  const [styleSuccess, setStyleSuccess] = useState("");
  const [isSubmittingStyle, setIsSubmittingStyle] = useState(false);
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

  const trustItems = [
    {
      label: t.footer.securePayment,
      icon: ShieldCheck,
    },
    {
      label: t.footer.fastDelivery,
      icon: Truck,
    },
    {
      label: t.footer.easyReturns,
      icon: ArrowCounterClockwise,
    },
  ] as const;

  const fallbackStyleImages = [
    { id: "fallback-1", src: "/perfoumerjar.png", alt: "Perfoumer style image 1", href: "https://www.instagram.com/perfoumer/" },
    { id: "fallback-2", src: "/15mlperfoumer.png", alt: "Perfoumer style image 2", href: "https://www.instagram.com/perfoumer/" },
    { id: "fallback-3", src: "/30mlperfoumer.png", alt: "Perfoumer style image 3", href: "https://www.instagram.com/perfoumer/" },
    { id: "fallback-4", src: "/logo.webp", alt: "Perfoumer style image 4", href: "https://www.instagram.com/perfoumer/" },
    { id: "fallback-5", src: "/perfmmob.png", alt: "Perfoumer style image 5", href: "https://www.instagram.com/perfoumer/" },
    { id: "fallback-6", src: "/perfmlogo.png", alt: "Perfoumer style image 6", href: "https://www.instagram.com/perfoumer/" },
  ] as const;

  const snapshotItems = instagramSnapshot.items.map((item) => ({
    id: item.id,
    src: item.src,
    alt: item.alt,
    href: item.href,
  })) as StyleImageItem[];

  const displayStyleImages = snapshotItems.length > 0 ? snapshotItems : fallbackStyleImages;

  const handleStyleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingStyle) return;

    const normalizedEmail = email.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!isValidEmail) {
      setStyleError(t.footer.styleInvalidEmail);
      setStyleSuccess("");
      return;
    }

    setStyleError("");
    setStyleSuccess("");
    setIsSubmittingStyle(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          locale,
          source: "footer_style",
        }),
      });

      if (!response.ok) {
        setStyleError(t.footer.styleFailed);
        return;
      }

      setEmail("");
      setStyleSuccess(t.footer.styleSuccess);
    } catch {
      setStyleError(t.footer.styleFailed);
    } finally {
      setIsSubmittingStyle(false);
    }
  };

  return (
    <footer id="contact" ref={footerRef} className="mt-16 bg-[#f3f3f2] pb-12 md:mt-20 md:pb-14">
      <div className="mx-auto max-w-[1540px] px-6 md:px-10">
        <section
          className="relative mb-7 overflow-hidden rounded-[1.2rem] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(248,248,246,0.95)_0%,rgba(236,236,233,0.92)_100%)] px-4 py-5 shadow-[0_18px_36px_rgba(20,20,20,0.045)] md:mb-8 md:px-6 md:py-6"
          aria-label="Our style"
        >
          <div className="flex items-center gap-3 border-b border-zinc-200/80 pb-3">
            <a
              href={instagramSnapshot.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-[0.92rem] font-semibold tracking-[0.06em] text-zinc-900 uppercase sm:text-[0.98rem]"
            >
              {t.footer.styleHandle}
            </a>
            <span className="h-px flex-1 bg-zinc-200/90" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
            {displayStyleImages.map((image) => (
              <a
                key={image.id}
                href={image.href}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-[4/5] overflow-hidden rounded-[0.65rem] bg-zinc-200"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 768px) 33vw, 16vw"
                  className="object-cover"
                />
              </a>
            ))}
          </div>

          <div className="mt-5 rounded-[0.95rem] border border-zinc-200/80 bg-white/55 px-4 py-5 backdrop-blur-[1px] sm:px-5 md:mt-6 md:px-6 md:py-5">
            <div className="grid gap-5 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-8 lg:gap-10">
              <div className="text-center md:pr-3 md:text-left">
                <h2
                  className="text-[clamp(1.55rem,4vw,2.35rem)] leading-[1.01] tracking-[-0.015em] text-zinc-900"
                  style={{ fontFamily: "Iowan Old Style, Baskerville, Times New Roman, serif" }}
                >
                  {t.footer.styleTitle}
                </h2>
                <p className="mt-3 text-[0.95rem] leading-7 text-zinc-700 sm:text-[0.98rem] sm:leading-8">
                  {t.footer.styleDescription}
                </p>
              </div>

              <div className="md:border-l md:border-zinc-200/80 md:pl-6 lg:pl-7">
                <form
                  onSubmit={handleStyleSubmit}
                  className="flex w-full flex-col gap-2.5 rounded-[0.85rem] border border-zinc-200/80 bg-white/80 p-2.5 shadow-[0_10px_24px_rgba(18,18,18,0.06)]"
                >
                  <label className="sr-only" htmlFor="style-email-input">
                    {t.footer.styleEmailPlaceholder}
                  </label>
                  <input
                    id="style-email-input"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (styleError) setStyleError("");
                      if (styleSuccess) setStyleSuccess("");
                    }}
                    placeholder={t.footer.styleEmailPlaceholder}
                    className="h-14 w-full rounded-[0.72rem] border border-zinc-300 bg-white px-4 text-[1.02rem] text-zinc-900 placeholder:text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_5px_12px_rgba(18,18,18,0.05)] focus:border-zinc-700 focus:outline-none md:h-12"
                    disabled={isSubmittingStyle}
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingStyle}
                    className="h-14 w-full rounded-[0.72rem] bg-black px-6 text-[0.98rem] font-semibold tracking-[0.1em] text-white uppercase shadow-[0_10px_20px_rgba(12,12,12,0.23)] disabled:cursor-not-allowed disabled:opacity-70 md:h-12"
                  >
                    {isSubmittingStyle ? t.footer.styleSubmitting : t.footer.styleSubscribe}
                  </button>
                </form>

                {styleError ? <p className="mt-2 text-sm text-red-700">{styleError}</p> : null}

                {styleSuccess ? (
                  <div
                    className="mt-3 flex items-center gap-2.5 text-zinc-900"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-zinc-900">
                      <CheckCircle size={18} weight="bold" />
                    </span>
                    <p className="text-[0.98rem] font-medium leading-6 text-zinc-900">{styleSuccess}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mb-5 grid gap-3 md:mb-6 md:grid-cols-3 md:gap-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex min-h-[76px] items-center gap-3 rounded-[0.125rem] border border-zinc-300/75 bg-[#f6f6f5] px-5 py-4"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-zinc-700">
                  <Icon size={20} weight="regular" />
                </span>
                <p className="text-[1.08rem] font-medium leading-tight text-zinc-900">{item.label}</p>
              </div>
            );
          })}
        </div>

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
              <a
                href="https://maps.app.goo.gl/Wpw5PwXDEuhnd6wB6"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-[0.98rem] leading-[1.45] text-zinc-600 transition-colors hover:text-zinc-900"
              >
                Mirzəağa Əliyev Küçəsi, Bakı 1009, Azerbaijan
              </a>
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
                  <Link href={toLocalePath("/haqqimizda", locale)} className="transition-colors hover:text-zinc-900">
                    Haqqımızda
                  </Link>
                  <Link href={toLocalePath("/catalog", locale)} className="transition-colors hover:text-zinc-900">
                    {t.footer.products}
                  </Link>
                  <Link href={toLocalePath("/brands", locale)} className="transition-colors hover:text-zinc-900">
                    {t.footer.brands}
                  </Link>
                  <Link href={toLocalePath("/blog", locale)} className="transition-colors hover:text-zinc-900">
                    {t.footer.blog}
                  </Link>
                  <Link href={toLocalePath("/elaqe", locale)} className="transition-colors hover:text-zinc-900">
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
              <div className="mb-1 flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 transition-transform duration-300 hover:-translate-y-0.5">
                  <span className="relative h-4.5 w-7">
                    <span className="absolute left-0 top-0 h-4.5 w-4.5 rounded-full bg-[#eb001b]" />
                    <span className="absolute left-2.5 top-0 h-4.5 w-4.5 rounded-full bg-[#00a1df] opacity-90" />
                  </span>
                  <span className="text-[0.58rem] font-semibold tracking-[0.08em] text-zinc-500 uppercase">Maestro</span>
                </span>

                <span className="inline-flex items-center gap-1.5 transition-transform duration-300 hover:-translate-y-0.5">
                  <span className="relative h-4.5 w-7">
                    <span className="absolute left-0 top-0 h-4.5 w-4.5 rounded-full bg-[#eb001b]" />
                    <span className="absolute left-2.5 top-0 h-4.5 w-4.5 rounded-full bg-[#f9a01b] opacity-90" />
                  </span>
                  <span className="text-[0.58rem] font-semibold tracking-[0.08em] text-zinc-500 uppercase">Mastercard</span>
                </span>

                <span className="text-[1.1rem] font-black tracking-[-0.03em] text-[#1a41b6] transition-transform duration-300 hover:-translate-y-0.5">
                  VISA
                </span>
              </div>

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
