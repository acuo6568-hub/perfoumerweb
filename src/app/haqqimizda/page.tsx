import Link from "next/link";
import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { getCurrentLocale } from "@/lib/i18n.server";
import { toLocalePath } from "@/lib/i18n";
import { SEO_CONTACT, SEO_LOCAL_BUSINESS, absoluteUrlForLocale, buildAzeriPageKeywords, buildLocaleAlternates } from "@/lib/seo";

const aboutMetadata: Metadata = {
  title: "Haqqımızda - Perfoumer",
  description:
    "Perfoumer komandasının fəaliyyət prinsipi, sifariş keyfiyyət standartları, dəstək siyasəti və etibar yanaşması.",
  keywords: buildAzeriPageKeywords([
    "perfoumer haqqında",
    "ətir mağazası bakı",
    "orijinal ətir etibar",
    "sifariş və çatdırılma prosesi",
  ]),
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();

  return {
    ...aboutMetadata,
    alternates: buildLocaleAlternates("/haqqimizda", locale),
  };
}

export default async function AboutPage() {
  const locale = await getCurrentLocale();

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Perfoumer",
    url: absoluteUrlForLocale("/", locale),
    email: SEO_CONTACT.email,
    telephone: SEO_CONTACT.phone,
    areaServed: SEO_LOCAL_BUSINESS.areaServed,
    address: {
      "@type": "PostalAddress",
      addressLocality: SEO_LOCAL_BUSINESS.city,
      addressCountry: SEO_LOCAL_BUSINESS.countryName,
    },
  };

  return (
    <div className="bg-[#f3f3f2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <main className="mx-auto max-w-[1100px] px-4 pt-8 sm:px-6 md:px-8 md:pt-10">
        <section className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_14px_34px_rgba(22,22,24,0.06)] md:p-10">
          <h1 className="text-[2.5rem] leading-[0.95] tracking-[-0.02em] text-zinc-900 md:text-6xl">Haqqımızda</h1>
          <p className="mt-4 text-base leading-8 text-zinc-700">
            Perfoumer komandası 2020-ci ildən etibarən Azərbaycan bazarında premium və orijinal ətir seçimini daha rahat və şəffaf etmək üçün çalışır.
            Məqsədimiz istifadəçiyə yalnız məhsul satmaq deyil, ehtiyaca uyğun qoxunu düzgün seçməkdə real kömək etməkdir.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <p className="text-xs tracking-[0.16em] text-zinc-400 uppercase">Keyfiyyət</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">Hər sifariş göndərişdən əvvəl etiket, ölçü və qablaşdırma uyğunluğu üzrə yoxlanılır.</p>
            </article>
            <article className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <p className="text-xs tracking-[0.16em] text-zinc-400 uppercase">Dəstək</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">WhatsApp və e-poçt vasitəsilə not uyğunluğu, istifadə məqsədi və seçim məsləhəti təqdim olunur.</p>
            </article>
            <article className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <p className="text-xs tracking-[0.16em] text-zinc-400 uppercase">Şəffaflıq</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">Qaytarılma, məxfilik və sifariş şərtləri açıq şəkildə təqdim olunur və müştəriyə əvvəlcədən çatdırılır.</p>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link href={toLocalePath("/elaqe", locale)} className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Əlaqə və lokal məlumatlar
            </Link>
            <Link href={toLocalePath("/blog", locale)} className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Blog və kampaniyalar
            </Link>
            <Link href={toLocalePath("/catalog", locale)} className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400">
              Kataloq
            </Link>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
