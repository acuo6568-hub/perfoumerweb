import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, EnvelopeSimple, MapPin, Phone, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

import { Footer } from "@/components/Footer";
import { getCurrentLocale } from "@/lib/i18n.server";
import { toLocalePath } from "@/lib/i18n";
import { applySiteBranding } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";
import {
  SEO_CONTACT,
  SEO_LOCAL_BUSINESS,
  absoluteUrl,
  absoluteUrlForLocale,
  buildAzeriPageKeywords,
  buildLocaleAlternates,
  buildStoreGeoCoordinates,
  buildStoreOpeningHoursSpecification,
  buildStorePostalAddress,
} from "@/lib/seo";

const contactMetadata: Metadata = {
  title: "Əlaqə və Mağaza Ünvanı - Perfoumer",
  description:
    "Perfoumer Bakı mağazasının ünvanı, iş saatları, xəritə, telefon, WhatsApp və onlayn sifariş məlumatları.",
  keywords: buildAzeriPageKeywords([
    "perfoumer əlaqə",
    "ətir mağazası bakı əlaqə",
    "ətir mağazası bakı ünvan",
    "bakıda original ətir mağazası",
    "whatsapp ətir sifarişi",
    "bakı ətir çatdırılma",
  ]),
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();

  return {
    ...applySiteBranding(contactMetadata, settings),
    alternates: buildLocaleAlternates("/elaqe", locale),
  };
}

export default async function ContactPage() {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const faqEntries = applySiteBranding([
    {
      question: "Perfoumer-in Bakı mağazası haradadır?",
      answer: "Perfoumer mağazası Mirzəağa Əliyev Küçəsi, Bakı 1009, Azerbaijan ünvanında yerləşir və xəritə bağlantısı ilə birbaşa açılır.",
    },
    {
      question: "Mağazada ətirlərə baxmaq mümkündürmü?",
      answer: "Bəli. Bakı mağazasında seçilmiş ətirlərə yaxından baxmaq, sonra isə uyğun məhsulu onlayn və ya yerində sifariş etmək mümkündür.",
    },
    {
      question: "Onlayn sifariş və çatdırılma varmı?",
      answer: "Bəli. Bakı və Azərbaycan üzrə onlayn sifariş, WhatsApp dəstəyi və çatdırılma xidməti təqdim olunur.",
    },
  ] as const, settings);

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": "https://perfoumer.az/#store",
    name: settings.siteName,
    image: absoluteUrl("/perfoumerlogo.png"),
    url: absoluteUrlForLocale("/", locale),
    telephone: SEO_CONTACT.phone,
    email: SEO_CONTACT.email,
    description:
      applySiteBranding(
        "Perfoumer Bakıda real mağazası olan, həm mağazadan seçim, həm də Azərbaycan üzrə onlayn ətir sifarişi təqdim edən premium ətir mağazasıdır.",
        settings,
      ),
    address: buildStorePostalAddress(),
    geo: buildStoreGeoCoordinates(),
    hasMap: SEO_LOCAL_BUSINESS.mapUrl,
    areaServed: SEO_LOCAL_BUSINESS.areaServed,
    openingHoursSpecification: buildStoreOpeningHoursSpecification(),
    priceRange: SEO_LOCAL_BUSINESS.priceRange,
    sameAs: [...SEO_LOCAL_BUSINESS.sameAs],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana səhifə",
        item: absoluteUrlForLocale("/", locale),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Əlaqə və mağaza ünvanı",
        item: absoluteUrlForLocale("/elaqe", locale),
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };

  return (
    <div className="bg-[linear-gradient(180deg,#efefed_0%,#e8e8e6_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main className="mx-auto max-w-[1540px] px-3 pt-8 sm:px-5 md:px-8 md:pt-10">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-zinc-300/80 bg-[#f4f4f3] p-5 shadow-[0_24px_70px_rgba(22,22,22,0.08)] sm:p-7 md:p-9 lg:p-10">
          <div className="flex items-center justify-between border-b border-zinc-300/80 pb-3 text-[0.68rem] tracking-[0.14em] text-zinc-600 uppercase">
            <span>{settings.siteName}</span>
            <span>Bakı mağazası</span>
          </div>

          <div className="relative mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 xl:gap-10">
            <div className="relative z-10">
              <h1 className="text-[clamp(2.6rem,8.4vw,7.2rem)] leading-[0.86] tracking-[-0.03em] text-zinc-950 uppercase">
                ƏLAQƏ VƏ ÜNVAN
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-700 sm:text-base sm:leading-8">
                {applySiteBranding("Perfoumer həm onlayn sifariş, həm də Bakı mağazasında canlı seçim üçün açıqdır. Sifariş, nota uyğun seçim, hədiyyə məsləhəti və çatdırılma ilə bağlı suallar üçün bizimlə birbaşa əlaqə saxlayın.", settings)}
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

              <div className="mt-7 grid gap-3 md:grid-cols-3">
                <article className="rounded-[0.95rem] border border-zinc-300/80 bg-white/65 px-4 py-4">
                  <p className="text-[0.64rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Mağazada baxış</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    Bakı mağazasında ətirlərə yaxından baxıb daha rahat seçim edə bilərsiniz.
                  </p>
                </article>
                <article className="rounded-[0.95rem] border border-zinc-300/80 bg-white/65 px-4 py-4">
                  <p className="text-[0.64rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Onlayn sifariş</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    Bakı və Azərbaycan üzrə onlayn sifariş, WhatsApp dəstəyi və çatdırılma təqdim olunur.
                  </p>
                </article>
                <article className="rounded-[0.95rem] border border-zinc-300/80 bg-white/65 px-4 py-4">
                  <p className="text-[0.64rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Qoxu dəstəyi</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    Hədiyyə, gündəlik istifadə və xüsusi gün üçün qoxu seçimi ilə bağlı komanda kömək edir.
                  </p>
                </article>
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden rounded-[0.9rem] border border-zinc-300/80 bg-[linear-gradient(180deg,#ededeb_0%,#e4e4e2_100%)] lg:min-h-[460px]">
              <Image
                src="/perfmmob.png"
                alt={`${settings.siteName} contact visual`}
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-contain object-center p-6 grayscale contrast-105"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(244,244,243,0.1)_0%,rgba(244,244,243,0.4)_52%,rgba(244,244,243,0.85)_100%)]" />
            </div>
          </div>

          <section className="relative mt-8 md:mt-10">
            <div className="relative h-[520px] overflow-hidden rounded-[1.05rem] border border-zinc-300/80 bg-white shadow-[0_12px_34px_rgba(20,20,20,0.08)] md:h-[620px]">
              <iframe
                title={`${settings.siteName} location map`}
                src="https://www.google.com/maps?q=40.375092,49.833675&z=16&output=embed"
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.72)_24%,rgba(255,255,255,0)_50%),radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.65)_22%,rgba(255,255,255,0)_48%),radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.93)_0%,rgba(255,255,255,0.58)_24%,rgba(255,255,255,0)_50%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.52)_22%,rgba(255,255,255,0)_48%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_42%,rgba(255,255,255,0.12)_100%)]" />

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

          <section className="mt-8 grid gap-4 rounded-[1.25rem] border border-zinc-300/80 bg-white/72 p-4 shadow-[0_10px_28px_rgba(20,20,20,0.05)] md:grid-cols-[1.2fr_0.8fr] md:p-6">
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Bakı ətir mağazası</p>
              <h2 className="mt-2 text-[1.8rem] leading-[0.95] tracking-[-0.03em] text-zinc-900 sm:text-[2.3rem]">
                Mağazada bax, onlayn sifariş et
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-700 sm:text-base">
                {applySiteBranding(
                  "Perfoumer-in Bakı mağazası real ünvanda yerləşir. İstəsəniz mağazaya gəlib ətirlərə baxa, istəsəniz onlayn kataloqdan seçim edib WhatsApp və ya sayt üzərindən sifariş verə bilərsiniz.",
                  settings,
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Link
                href={toLocalePath("/catalog", locale)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-zinc-800"
              >
                Kataloqa keç
              </Link>
              <Link
                href={toLocalePath("/qoxunu", locale)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 transition-all duration-300 hover:-translate-y-[1px] hover:border-zinc-400"
              >
                Qoxunu Tap
              </Link>
            </div>
          </section>

          <div className="mt-8 border-t border-zinc-300/90 pt-6 md:mt-10 md:pt-8">
            <h2 className="text-[2rem] leading-[0.9] tracking-[-0.03em] text-zinc-900 sm:text-[3rem]">TEZ-TEZ VERILƏN SUALLAR</h2>
            <div className="mt-4 space-y-2 border-t border-zinc-300/85 pt-3">
              <details className="group border-b border-zinc-300/80 py-2.5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-900 sm:text-base">
                  {faqEntries[0].question}
                  <span className="text-lg leading-none text-zinc-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                  {faqEntries[0].answer}
                </p>
              </details>
              <details className="group border-b border-zinc-300/80 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-900 sm:text-base">
                  {faqEntries[1].question}
                  <span className="text-lg leading-none text-zinc-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{faqEntries[1].answer}</p>
              </details>
              <details className="group border-b border-zinc-300/80 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-900 sm:text-base">
                  {faqEntries[2].question}
                  <span className="text-lg leading-none text-zinc-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-2">
                  <p className="max-w-3xl text-sm leading-6 text-zinc-600">{faqEntries[2].answer}</p>
                </div>
              </details>
              <details className="group border-b border-zinc-300/80 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-900 sm:text-base">
                  Qayda və siyasətlərə haradan baxa bilərəm?
                  <span className="text-lg leading-none text-zinc-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href={toLocalePath("/haqqimizda", locale)} className="group inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900">
                    Haqqımızda
                    <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link href={toLocalePath("/terms-and-conditions", locale)} className="group inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900">
                    Şərtlər və qaydalar
                    <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link href={toLocalePath("/privacy-policy", locale)} className="group inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900">
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
