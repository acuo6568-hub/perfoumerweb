import Link from "next/link";
import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { getCurrentLocale } from "@/lib/i18n.server";
import { SEO_CONTACT, SEO_LOCAL_BUSINESS, absoluteUrl, buildAzeriPageKeywords } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Əlaqə və Ünvan - Perfoumer",
  description:
    "Perfoumer əlaqə səhifəsi: Bakı üzrə xidmət zonası, e-poçt, telefon, WhatsApp və iş saatları.",
  keywords: buildAzeriPageKeywords([
    "perfoumer əlaqə",
    "ətir mağazası bakı əlaqə",
    "whatsapp ətir sifarişi",
    "bakı ətir çatdırılma",
  ]),
  alternates: {
    canonical: "/elaqe",
  },
};

export default async function ContactPage() {
  const locale = await getCurrentLocale();

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Perfoumer",
    image: absoluteUrl("/perfoumerlogo.png"),
    url: absoluteUrl("/"),
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
    <div className="bg-[#f3f3f2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />

      <main className="mx-auto max-w-[1100px] px-4 pt-8 sm:px-6 md:px-8 md:pt-10">
        <section className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_14px_34px_rgba(22,22,24,0.06)] md:p-10">
          <h1 className="text-[2.5rem] leading-[0.95] tracking-[-0.02em] text-zinc-900 md:text-6xl">Əlaqə və lokal məlumatlar</h1>
          <p className="mt-4 text-base leading-8 text-zinc-700">
            Sifariş, nota uyğun seçim və çatdırılma ilə bağlı suallar üçün bizimlə birbaşa əlaqə saxlayın. Komanda Bakı və Azərbaycan üzrə onlayn xidmət göstərir.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <p className="text-xs tracking-[0.16em] text-zinc-400 uppercase">Telefon</p>
              <a href={`tel:${SEO_CONTACT.phone}`} className="mt-2 block text-lg font-medium text-zinc-900 transition hover:text-zinc-700">
                {SEO_CONTACT.phone}
              </a>
            </article>
            <article className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <p className="text-xs tracking-[0.16em] text-zinc-400 uppercase">E-poçt</p>
              <a href={`mailto:${SEO_CONTACT.email}`} className="mt-2 block text-lg font-medium text-zinc-900 transition hover:text-zinc-700">
                {SEO_CONTACT.email}
              </a>
            </article>
            <article className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <p className="text-xs tracking-[0.16em] text-zinc-400 uppercase">WhatsApp</p>
              <a href={SEO_CONTACT.whatsappUrl} target="_blank" rel="noreferrer" className="mt-2 block text-lg font-medium text-zinc-900 transition hover:text-zinc-700">
                Birbaşa yaz
              </a>
            </article>
            <article className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <p className="text-xs tracking-[0.16em] text-zinc-400 uppercase">Xidmət zonası</p>
              <p className="mt-2 text-lg font-medium text-zinc-900">Bakı və Azərbaycan</p>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/haqqimizda" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Haqqımızda
            </Link>
            <Link href="/terms-and-conditions" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Şərtlər və qaydalar
            </Link>
            <Link href="/privacy-policy" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Məxfilik siyasəti
            </Link>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
