import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, EnvelopeSimple, MapPin, Phone, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

import { Footer } from "@/components/Footer";
import { getCurrentLocale } from "@/lib/i18n.server";
import { SEO_CONTACT, SEO_LOCAL_BUSINESS, absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";

const contactMetadata: Metadata = {
  title: "Əlaqə və Ünvan - Perfoumer",
  description:
    "Perfoumer əlaqə səhifəsi: Bakı üzrə xidmət zonası, e-poçt, telefon, WhatsApp və iş saatları.",
  keywords: buildAzeriPageKeywords([
    "perfoumer əlaqə",
    "ətir mağazası bakı əlaqə",
    "whatsapp ətir sifarişi",
    "bakı ətir çatdırılma",
  ]),
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();

  return {
    ...contactMetadata,
    alternates: buildLocaleAlternates("/elaqe", locale),
  };
}

export default async function ContactPage() {
  const locale = await getCurrentLocale();

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Perfoumer",
    image: absoluteUrlForLocale("/perfoumerlogo.png", locale),
    url: absoluteUrlForLocale("/", locale),
    telephone: SEO_CONTACT.phone,
    email: SEO_CONTACT.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: SEO_LOCAL_BUSINESS.city,
      addressCountry: SEO_LOCAL_BUSINESS.countryName,
    },
    areaServed: SEO_LOCAL_BUSINESS.areaServed,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "10:00",
        closes: "19:00",
      },
    ],
    sameAs: [SEO_CONTACT.whatsappUrl],
  };

  return (
    <div className="bg-[linear-gradient(180deg,#efefed_0%,#e8e8e6_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />

      <main className="mx-auto max-w-[1540px] px-3 pt-8 sm:px-5 md:px-8 md:pt-10">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-zinc-300/80 bg-[#f4f4f3] p-5 shadow-[0_24px_70px_rgba(22,22,22,0.08)] sm:p-7 md:p-9 lg:p-10">
          <div className="flex items-center justify-between border-b border-zinc-300/80 pb-3 text-[0.68rem] tracking-[0.14em] text-zinc-600 uppercase">
            <span>Perfoumer</span>
            <span>Baku, Azerbaijan</span>
          </div>

          <div className="relative mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 xl:gap-10">
            <div className="relative z-10">
              <h1 className="text-[clamp(2.6rem,8.4vw,7.2rem)] leading-[0.86] tracking-[-0.03em] text-zinc-950 uppercase">
                ƏLAQƏ
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-700 sm:text-base sm:leading-8">
                Sifariş, nota uyğun seçim və çatdırılma ilə bağlı suallar üçün bizimlə birbaşa əlaqə saxlayın. Komanda Bakı və Azərbaycan üzrə onlayn xidmət göstərir.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <a href={`tel:${SEO_CONTACT.phone}`} className="group rounded-[0.75rem] border border-zinc-300/85 bg-white/45 px-3 py-3.5 transition-colors hover:bg-white/75">
                  <p className="text-[0.64rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Telefon</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[1.12rem] font-semibold text-zinc-900 sm:text-[1.26rem]">
                    <Phone size={18} weight="regular" />
                    {SEO_CONTACT.phone}
                  </p>
                </a>
                <a href={`mailto:${SEO_CONTACT.email}`} className="group rounded-[0.75rem] border border-zinc-300/85 bg-white/45 px-3 py-3.5 transition-colors hover:bg-white/75">
                  <p className="text-[0.64rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">E-poçt</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[1.12rem] font-semibold text-zinc-900 sm:text-[1.26rem]">
                    <EnvelopeSimple size={18} weight="regular" />
                    {SEO_CONTACT.email}
                  </p>
                </a>
                <a href={SEO_CONTACT.whatsappUrl} target="_blank" rel="noreferrer" className="group rounded-[0.75rem] border border-zinc-300/85 bg-white/45 px-3 py-3.5 transition-colors hover:bg-white/75">
                  <p className="text-[0.64rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">WhatsApp</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[1.12rem] font-semibold text-zinc-900 sm:text-[1.26rem]">
                    <WhatsappLogo size={18} weight="fill" />
                    Birbaşa yaz
                  </p>
                </a>
                <a href="https://maps.app.goo.gl/Wpw5PwXDEuhnd6wB6" target="_blank" rel="noreferrer" className="group rounded-[0.75rem] border border-zinc-300/85 bg-white/45 px-3 py-3.5 transition-colors hover:bg-white/75">
                  <p className="text-[0.64rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Xidmət zonası</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[1.12rem] font-semibold text-zinc-900 sm:text-[1.26rem]">
                    <MapPin size={18} weight="fill" />
                    Bakı və Azərbaycan
                  </p>
                </a>
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden rounded-[0.9rem] border border-zinc-300/80 bg-[linear-gradient(180deg,#ededeb_0%,#e4e4e2_100%)] lg:min-h-[460px]">
              <Image
                src="/perfmmob.png"
                alt="Perfoumer contact visual"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-contain object-center p-6 grayscale contrast-105"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(244,244,243,0.1)_0%,rgba(244,244,243,0.4)_52%,rgba(244,244,243,0.85)_100%)]" />
            </div>
          </div>

          <section className="relative mt-8 overflow-hidden rounded-[1.2rem] border border-zinc-300/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.92)_0%,rgba(246,246,245,0.9)_55%,rgba(238,238,236,0.92)_100%)] p-2.5 shadow-[0_18px_48px_rgba(20,20,20,0.08)] md:mt-10 md:p-3">
            <div className="relative h-[520px] overflow-hidden rounded-[0.95rem] border border-zinc-300/75 bg-white md:h-[620px]">
              <iframe
                title="Perfoumer location map"
                src="https://www.google.com/maps?q=40.375092,49.833675&z=16&output=embed"
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.2)_100%)]" />

              <div className="absolute inset-x-3 bottom-3 z-20 rounded-[1rem] border border-zinc-200/85 bg-[linear-gradient(155deg,rgba(255,255,255,0.97)_0%,rgba(246,246,245,0.94)_100%)] p-4 shadow-[0_18px_34px_rgba(18,18,18,0.18)] backdrop-blur-sm sm:inset-x-auto sm:left-5 sm:top-5 sm:bottom-auto sm:w-[360px] sm:rounded-[1.15rem] sm:p-5">
                <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">Məkan</p>
                <a
                  href="https://maps.app.goo.gl/Wpw5PwXDEuhnd6wB6"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-[1.05rem] font-semibold leading-7 text-zinc-900 transition-colors hover:text-zinc-700"
                >
                  Mirzəağa Əliyev Küçəsi
                  <br />
                  Bakı 1009, Azerbaijan
                </a>

                <div className="mt-4 border-t border-zinc-200/90 pt-3.5">
                  <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">İş saatları</p>
                  <ul className="mt-2.5 space-y-1.5 text-sm text-zinc-700">
                    <li className="flex items-center justify-between">
                      <span>B.e - C.a</span>
                      <span className="font-medium text-zinc-900">10:00 - 19:00</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Bazar</span>
                      <span className="font-medium text-zinc-900">10:00 - 18:00</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="https://maps.app.goo.gl/Wpw5PwXDEuhnd6wB6"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-zinc-800"
                >
                  Xəritədə aç
                </a>
              </div>
            </div>
          </section>

          <div className="mt-8 border-t border-zinc-300/90 pt-6 md:mt-10 md:pt-8">
            <h2 className="text-[2rem] leading-[0.9] tracking-[-0.03em] text-zinc-900 sm:text-[3rem]">TEZ-TEZ VERILƏN SUALLAR</h2>
            <div className="mt-4 space-y-2 border-t border-zinc-300/85 pt-3">
              <details className="group border-b border-zinc-300/80 py-2.5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-900 sm:text-base">
                  Sizinlə əməkdaşlıq üçün necə əlaqə saxlaya bilərəm?
                  <span className="text-lg leading-none text-zinc-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                  WhatsApp və ya e-poçt vasitəsilə yazın. Komandamız sorğunu qısa vaxtda cavablandırır və uyğun istiqamətə yönləndirir.
                </p>
              </details>
              <details className="group border-b border-zinc-300/80 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-900 sm:text-base">
                  Çatdırılma hansı zonalara edilir?
                  <span className="text-lg leading-none text-zinc-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">Bakı və Azərbaycan üzrə onlayn sifarişlər üçün çatdırılma təşkil olunur.</p>
              </details>
              <details className="group border-b border-zinc-300/80 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-900 sm:text-base">
                  Qayda və siyasətlərə haradan baxa bilərəm?
                  <span className="text-lg leading-none text-zinc-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href="/haqqimizda" className="group inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900">
                    Haqqımızda
                    <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/terms-and-conditions" className="group inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900">
                    Şərtlər və qaydalar
                    <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/privacy-policy" className="group inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900">
                    Məxfilik siyasəti
                    <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </details>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
