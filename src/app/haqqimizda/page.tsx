import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { getCurrentLocale } from "@/lib/i18n.server";
import { applySiteBranding } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";
import {
  SEO_CONTACT,
  SEO_LOCAL_BUSINESS,
  absoluteUrlForLocale,
  buildAzeriPageKeywords,
  buildLocaleAlternates,
  buildStoreGeoCoordinates,
  buildStoreOpeningHoursSpecification,
  buildStorePostalAddress,
} from "@/lib/seo";
import { toLocalePath } from "@/lib/i18n";

const aboutMetadata: Metadata = {
  title: "Haqqımızda - Perfoumer",
  description:
    "Perfoumer-in seçmə yanaşması, müştəri təcrübəsi, sifariş prinsipləri və dəstək mədəniyyəti haqqında məlumat.",
  keywords: buildAzeriPageKeywords([
    "perfoumer haqqında",
    "ətir mağazası bakı",
    "orijinal ətir etibar",
    "sifariş və çatdırılma prosesi",
  ]),
};

const ABOUT_COPY = {
  az: {
    eyebrow: "Haqqımızda",
    title: "Ətiri sadəcə məhsul kimi deyil, gündəlik hiss kimi qururuq.",
    intro:
      "Perfoumer 2020-ci ildən bəri premium və orijinal ətir seçimlərini daha səliqəli, daha şəffaf və daha rahat etmək üçün işləyir. Məqsədimiz vitrini böyütməkdən əvvəl doğru qoxunu tapma prosesini sadələşdirməkdir.",
    lead: "Müştərinin ehtiyacına uyğun qoxu tapmaq üçün brend, not və istifadə kontekstini birlikdə düşünürük.",
    highlights: [
      {
        title: "Dəqiq seçim mədəniyyəti",
        text: "Kataloq yalnız çoxlu məhsul göstərmək üçün yox, fərqli zövqləri tez ayırd etmək üçün qurulub.",
      },
      {
        title: "Şəffaf hazırlıq",
        text: "Sifariş göndərişdən əvvəl etiket, ölçü və qablaşdırma uyğunluğu üzrə əlavə yoxlanılır.",
      },
      {
        title: "İnsanla danışan dəstək",
        text: "WhatsApp və e-poçt vasitəsilə seçim, nota uyğunluq və hədiyyə məsləhəti verilir.",
      },
    ],
    pillarsTitle: "Niyə insanlar geri qayıdır",
    pillars: [
      {
        label: "Seçim dərinliyi",
        value: "Nişdən gündəlikə",
        detail: "Həm xüsusi ovqat üçün güclü kompozisiyalar, həm də hər gün rahat istifadə olunan təmiz profillər.",
      },
      {
        label: "Hazırlıq tempi",
        value: "1-3 iş günü",
        detail: "Sifarişlər sürətli, amma səthi deyil. Hər paket ayrıca nəzarətdən keçir.",
      },
      {
        label: "Əlaqə dili",
        value: "Sadə və aydın",
        detail: "Müştərinin sualı uzun izaha ehtiyac qoymamalıdır. Qısa, faydalı və konkret cavab veririk.",
      },
    ],
    processTitle: "Biz necə işləyirik",
    process: [
      {
        step: "01",
        title: "Ehtiyacı oxuyuruq",
        text: "İstifadə məqsədi, mövsüm, qalıcılıq və qoxu üslubunu birlikdə nəzərə alırıq.",
      },
      {
        step: "02",
        title: "Qoxunu daraldırıq",
        text: "Not quruluşu, ailə və qiymət aralığına görə ən uyğun seçimləri çıxarırıq.",
      },
      {
        step: "03",
        title: "Şəffaf çatdırırıq",
        text: "Qablaşdırma və göndərişdən sonra müştəri nə baş verdiyini aydın şəkildə görür.",
      },
    ],
    notesTitle: "Kiçik, amma vacib detallar",
    notes: [
      "Hər məhsul göndərişdən əvvəl vizual uyğunluq üçün yenidən baxılır.",
      "Müştəriyə uyğunluğu gücləndirmək üçün kataloq və tavsiye axını tez-tez yenilənir.",
      "Ən çox soruşulan suallar qeyri-müəyyənlik yaratmadan, birbaşa cavablandırılır.",
    ],
    ctaTitle: "Əgər nə axtardığınızı dəqiq bilmirsinizsə, biz ordəyik.",
    ctaText: "Qoxunu tapmaq bəzən vaxt aparır. Biz həmin prosesi daha yumşaq və daha dəqiq edirik.",
    buttons: {
      contact: "Əlaqə",
      scent: "Qoxunu Tap",
      catalog: "Kataloq",
      blog: "Blog",
    },
    mission: {
      title: "Missiyamız",
      body: "Hər kəs üçün doğru qoxunu tapmağı asanlaşdırmaq — məsləhət, şəffaflıq və sürətli xidmət ilə. Məqsədimiz müştərilərin seçimlərini ruhuna uyğunlaşdırmaqdır.",
    },
    team: [
      { name: "Bakhishov", role: "Founder & Curator", bio: "Ətir sənəti və brend seçimi üzrə 10+ illik təcrübə.", avatar: "/admin/avatar-placeholder.png" },
      { name: "Leyla", role: "Customer Care", bio: "Uyğun qoxunu tapmaq üzrə məsləhətçi.", avatar: "/admin/avatar-placeholder.png" },
    ],
    timeline: [
      { year: "2020", title: "Başlanğıc", text: "Perfoumerin ilk addımı - seçmə ətirlər üzərində iş başladı." },
      { year: "2022", title: "Onlayn mağaza", text: "Rəsmi onlayn mağaza və məsləhət servisi açıldı." },
      { year: "2024", title: "Qoxunu layihəsi", text: "AI ilə qoxunun tapılması üçün qoxunu xüsusiyyəti təqdim edildi." },
    ],
    testimonials: [
      { name: "Aygun", text: "Perfoumer-dən aldığım ətir tam olaraq təsvir etdikləri kimi gəldi. Dəstək çox kömək etdi." },
      { name: "Kamran", text: "Sürətli hazırlıq və diqqətli paketləmə — təkrar alacam." },
    ],
  },
  en: {
    eyebrow: "About Us",
    title: "We treat fragrance as an everyday feeling, not just a product.",
    intro:
      "Since 2020, Perfoumer has been shaping premium and original fragrance selection into a cleaner, more transparent, and more helpful experience. The goal is not to show more products, but to help people find the right one faster.",
    lead: "We think about brand, note structure, and use case together so the result feels genuinely personal.",
    highlights: [
      {
        title: "Careful selection",
        text: "The catalog is built to make different scent styles easier to compare, not to overwhelm.",
      },
      {
        title: "Transparent preparation",
        text: "Each order is rechecked for label, size, and packaging alignment before it leaves.",
      },
      {
        title: "Human support",
        text: "WhatsApp and email support help with matching, notes, and gifting decisions.",
      },
    ],
    pillarsTitle: "Why customers come back",
    pillars: [
      {
        label: "Selection depth",
        value: "From niche to daily",
        detail: "Strong signature styles for special moments and clean profiles for everyday wear.",
      },
      {
        label: "Preparation speed",
        value: "1-3 business days",
        detail: "Orders move quickly without becoming careless. Every parcel gets individual attention.",
      },
      {
        label: "Support tone",
        value: "Simple and clear",
        detail: "Questions should not need long explanations. We keep replies short, useful, and direct.",
      },
    ],
    processTitle: "How we work",
    process: [
      {
        step: "01",
        title: "We read the need",
        text: "Use case, season, longevity, and fragrance style are considered together.",
      },
      {
        step: "02",
        title: "We narrow the match",
        text: "Note structure, scent family, and budget help shape the most relevant picks.",
      },
      {
        step: "03",
        title: "We deliver clearly",
        text: "Packaging and dispatch are handled transparently so customers know what happens next.",
      },
    ],
    notesTitle: "Small details that matter",
    notes: [
      "Each product is checked again before dispatch for visual consistency.",
      "The catalog and recommendation flow are updated often to keep choices relevant.",
      "Common questions are answered directly without unnecessary friction.",
    ],
    ctaTitle: "If you do not know exactly what you want yet, we can still help.",
    ctaText: "Finding a scent can take a minute. We make that process feel calmer and more precise.",
    buttons: {
      contact: "Contact",
      scent: "Find Your Scent",
      catalog: "Catalog",
      blog: "Blog",
    },
    mission: {
      title: "Our mission",
      body: "To make finding the right scent easier for everyone — with guidance, transparency, and fast service.",
    },
    team: [
      { name: "Bakhishov", role: "Founder & Curator", bio: "10+ years working with fragrance curation and brand selection.", avatar: "/admin/avatar-placeholder.png" },
      { name: "Leyla", role: "Customer Care", bio: "Scent-matching advisor focused on fit and occasion.", avatar: "/admin/avatar-placeholder.png" },
    ],
    timeline: [
      { year: "2020", title: "Getting started", text: "The first steps into curated fragrance selection." },
      { year: "2022", title: "Online store", text: "Launch of the official online store and advisory service." },
      { year: "2024", title: "Scent project", text: "Launched the AI-assisted scent discovery feature." },
    ],
    testimonials: [
      { name: "Aygun", text: "The perfume matched exactly what they described. Support was very helpful." },
      { name: "Kamran", text: "Fast preparation and careful packaging — would buy again." },
    ],
  },
  ru: {
    eyebrow: "О нас",
    title: "Мы воспринимаем аромат как часть повседневного ощущения, а не просто товар.",
    intro:
      "С 2020 года Perfoumer выстраивает премиальный и оригинальный выбор ароматов в более понятный, прозрачный и полезный процесс. Наша цель не в том, чтобы показать больше товаров, а в том, чтобы быстрее помочь найти нужный.",
    lead: "Мы учитываем бренд, структуру нот и сценарий использования одновременно, чтобы результат ощущался лично вашим.",
    highlights: [
      {
        title: "Точный подбор",
        text: "Каталог создан не для перегруза, а для удобного сравнения разных ароматических стилей.",
      },
      {
        title: "Прозрачная подготовка",
        text: "Перед отправкой каждый заказ дополнительно проверяется по этикетке, объему и упаковке.",
      },
      {
        title: "Живая поддержка",
        text: "Через WhatsApp и e-mail можно получить помощь по подбору, нотам и выбору подарка.",
      },
    ],
    pillarsTitle: "Почему клиенты возвращаются",
    pillars: [
      {
        label: "Глубина выбора",
        value: "От нишевых до повседневных",
        detail: "Есть как выразительные ароматы для особых моментов, так и чистые профили на каждый день.",
      },
      {
        label: "Скорость подготовки",
        value: "1-3 рабочих дня",
        detail: "Заказы идут быстро, но без спешки. Каждый пакет проходит отдельную проверку.",
      },
      {
        label: "Тон поддержки",
        value: "Просто и понятно",
        detail: "Вопросы не должны требовать длинных объяснений. Мы отвечаем коротко, полезно и по делу.",
      },
    ],
    processTitle: "Как мы работаем",
    process: [
      {
        step: "01",
        title: "Считываем задачу",
        text: "Учитываем сценарий использования, сезон, стойкость и стиль аромата.",
      },
      {
        step: "02",
        title: "Сужаем выбор",
        text: "Структура нот, семейство аромата и бюджет помогают быстро найти релевантные варианты.",
      },
      {
        step: "03",
        title: "Передаем прозрачно",
        text: "Упаковка и отправка проходят так, чтобы клиент понимал, что происходит дальше.",
      },
    ],
    notesTitle: "Маленькие детали, которые важны",
    notes: [
      "Перед отправкой каждый товар повторно проверяется на визуальную аккуратность.",
      "Каталог и рекомендации регулярно обновляются, чтобы выбор оставался актуальным.",
      "Частые вопросы отвечаются прямо и без лишней путаницы.",
    ],
    ctaTitle: "Если вы пока не знаете, что именно ищете, мы все равно поможем.",
    ctaText: "Поиск аромата может занять время. Мы делаем этот процесс спокойнее и точнее.",
    buttons: {
      contact: "Контакты",
      scent: "Подобрать аромат",
      catalog: "Каталог",
      blog: "Блог",
    },
    mission: {
      title: "Наша миссия",
      body: "Помочь каждому найти свой аромат — через советы, прозрачность и быстрый сервис.",
    },
    team: [
      { name: "Бахишов", role: "Основатель", bio: "10+ лет в мире ароматов.", avatar: "/admin/avatar-placeholder.png" },
    ],
    timeline: [
      { year: "2020", title: "Старт", text: "Начало работы над подбором ароматов." },
    ],
    testimonials: [
      { name: "Ольга", text: "Отличный сервис и очень внимательная упаковка." },
    ],
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();

  return {
    ...applySiteBranding(aboutMetadata, settings),
    alternates: buildLocaleAlternates("/haqqimizda", locale),
  };
}

export default async function AboutPage() {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const copy = ABOUT_COPY[locale];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://perfoumer.az/#organization",
    name: settings.siteName,
    url: absoluteUrlForLocale("/", locale),
    email: SEO_CONTACT.email,
    telephone: SEO_CONTACT.phone,
    foundingDate: SEO_LOCAL_BUSINESS.foundingDate,
    areaServed: SEO_LOCAL_BUSINESS.areaServed,
    address: buildStorePostalAddress(),
    geo: buildStoreGeoCoordinates(),
    hasMap: SEO_LOCAL_BUSINESS.mapUrl,
    openingHoursSpecification: buildStoreOpeningHoursSpecification(),
    sameAs: [...SEO_LOCAL_BUSINESS.sameAs],
  };

  return (
    <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(243,243,242,1)_38%,rgba(236,236,234,1)_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />

      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-8 sm:px-6 md:px-8 lg:px-10 lg:pt-10">
        <section className="relative overflow-hidden py-6 sm:py-8 lg:py-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
            <div className="max-w-4xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{copy.eyebrow}</p>
              <h1 className="mt-4 text-[clamp(3rem,6vw,5.8rem)] leading-[0.92] tracking-[-0.05em] text-zinc-950" style={{ fontFamily: "var(--font-playfair)" }}>
                {copy.title}
              </h1>
              <p className="mt-6 max-w-3xl text-[1.02rem] leading-8 text-zinc-700 sm:text-[1.08rem]">
                {copy.intro}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500">{copy.lead}</p>
            </div>

            <div className="lg:pl-12">
              <div className="border-t border-zinc-300/70 pt-6">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">{copy.pillarsTitle}</p>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{copy.highlights[0].title}</p>
                    <p className="mt-2 text-sm leading-7 text-zinc-600">{copy.highlights[0].text}</p>
                  </div>
                  <div className="h-px bg-zinc-200" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{copy.highlights[1].title}</p>
                    <p className="mt-2 text-sm leading-7 text-zinc-600">{copy.highlights[1].text}</p>
                  </div>
                  <div className="h-px bg-zinc-200" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{copy.highlights[2].title}</p>
                    <p className="mt-2 text-sm leading-7 text-zinc-600">{copy.highlights[2].text}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-8 border-t border-zinc-300/70 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{copy.processTitle}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950" style={{ fontFamily: "var(--font-playfair)" }}>
              {copy.ctaTitle}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600">{copy.ctaText}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {copy.process.map((item) => (
              <article key={item.step} className="border-t border-zinc-300/70 pt-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-zinc-400">{item.step}</p>
                <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-zinc-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-10 border-t border-zinc-300/70 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{copy.notesTitle}</p>
            <div className="mt-4 space-y-5">
              {copy.notes.map((note, index) => (
                <div key={note} className="flex gap-4 border-b border-zinc-200/80 pb-5 last:border-b-0 last:pb-0">
                  <span className="min-w-10 text-sm font-semibold text-zinc-400">0{index + 1}</span>
                  <p className="text-sm leading-7 text-zinc-700">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{copy.pillarsTitle}</p>
            <div className="mt-4 space-y-6">
              {copy.pillars.map((item) => (
                <div key={item.label} className="border-b border-zinc-200/80 pb-5 last:border-b-0 last:pb-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-zinc-950" style={{ fontFamily: "var(--font-playfair)" }}>
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-zinc-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-300/70 py-12">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{copy.mission.title}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-zinc-950">{copy.mission.body}</h2>
          </div>
        </section>

        <section className="border-t border-zinc-300/70 py-12">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{locale === 'az' ? 'Komanda' : locale === 'ru' ? 'Команда' : 'Team'}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {copy.team?.map((m: any) => (
                <div key={m.name} className="flex gap-4 items-start">
                  <img src={m.avatar} alt={m.name} className="h-14 w-14 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{m.name}</p>
                    <p className="text-xs text-zinc-500">{m.role}</p>
                    <p className="mt-2 text-sm text-zinc-600">{m.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-300/70 py-12">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{locale === 'az' ? 'Tarixçe' : locale === 'ru' ? 'История' : 'Timeline'}</p>
            <ol className="mt-6 space-y-6">
              {copy.timeline?.map((t: any) => (
                <li key={t.year} className="flex gap-4">
                  <div className="min-w-[72px] text-sm font-semibold text-zinc-700">{t.year}</div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{t.title}</p>
                    <p className="mt-1 text-sm text-zinc-600">{t.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-zinc-300/70 py-12">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{locale === 'az' ? 'Rəy və Təəssüratlar' : locale === 'ru' ? 'Отзывы' : 'Testimonials'}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {copy.testimonials?.map((t: any) => (
                <blockquote key={t.name} className="rounded-lg border border-zinc-200/80 bg-white p-5">
                  <p className="text-sm text-zinc-700">“{t.text}”</p>
                  <footer className="mt-3 text-xs font-semibold text-zinc-900">— {t.name}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-300/70 py-12">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">{locale === 'az' ? 'Etibar' : locale === 'ru' ? 'Доверие' : 'Trust'}</p>
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <div className="inline-flex h-12 w-32 items-center justify-center rounded border border-zinc-200/80 bg-white text-sm font-semibold text-zinc-700">Orijinal</div>
              <div className="inline-flex h-12 w-32 items-center justify-center rounded border border-zinc-200/80 bg-white text-sm font-semibold text-zinc-700">Güvənli Ödəniş</div>
              <div className="inline-flex h-12 w-32 items-center justify-center rounded border border-zinc-200/80 bg-white text-sm font-semibold text-zinc-700">Sürətli Çatdırılma</div>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-300/70 py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-zinc-400">FAQ</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950" style={{ fontFamily: "var(--font-playfair)" }}>
                {locale === "az" ? "Müştərilərin tez-tez soruşduğu məqamlar" : locale === "ru" ? "Что чаще всего спрашивают клиенты" : "What customers usually ask"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600">{locale === "az" ? "Qərar verməzdən əvvəl ən faydalı cavabları bir yerdə topladıq." : locale === "ru" ? "Мы собрали самые полезные ответы в одном месте." : "We gathered the most useful answers in one place."}</p>
            </div>

            <div className="divide-y divide-zinc-200/80 border-y border-zinc-300/70">
              {locale === "az"
                ? [
                    ["Sifariş neçə günə hazırlanır?", "Əksər sifarişlər 1-3 iş günü ərzində hazırlanır və göndərişə verilir."],
                    ["Mənə uyğun qoxunu necə seçə bilərəm?", "Bəyəndiyiniz notları və istifadə məqsədinizi paylaşdıqda, komanda uyğun seçimləri daraldır."],
                    ["Qoxunun qalıcılığı nədən asılıdır?", "Dəri tipi, hava şəraiti və tətbiq üsulu qalıcılığa birbaşa təsir edir."],
                    ["Qaytarılma varmı?", "İstifadə olunmamış məhsullar üçün qaytarılma qaydaları mövcuddur və dəstək vasitəsilə izah edilir."],
                  ]
                : locale === "ru"
                  ? [
                      ["За сколько дней собирается заказ?", "Большинство заказов подготавливается и отправляется в течение 1-3 рабочих дней."],
                      ["Как выбрать подходящий аромат?", "Поделитесь любимыми нотами и сценарием использования, и мы сузим выбор."],
                      ["От чего зависит стойкость?", "На стойкость влияют тип кожи, погода и способ нанесения."],
                      ["Есть ли возврат?", "Для неиспользованных товаров есть правила возврата, и поддержка объяснит детали."],
                    ]
                  : [
                      ["How long does dispatch take?", "Most orders are prepared and dispatched within 1-3 business days."],
                      ["How can I choose the right scent?", "Share the notes you like and the use case, and we will narrow the match."],
                      ["What affects longevity?", "Skin type, weather, and how you apply it all change the result."],
                      ["Do you offer returns?", "Return rules exist for unused items, and support can walk you through them."],
                    ]
                .map(([question, answer]) => (
                  <details key={question} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left text-sm font-semibold text-zinc-950">
                      <span>{question}</span>
                      <span className="text-zinc-400 transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">{answer}</p>
                  </details>
                ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-300/70 pt-10">
          <div className="flex flex-wrap items-center gap-3">
            <a href={toLocalePath("/elaqe", locale)} className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950">
              {copy.buttons.contact}
            </a>
            <a href={toLocalePath("/qoxunu", locale)} className="rounded-full border border-zinc-900 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800">
              {copy.buttons.scent}
            </a>
            <a href={toLocalePath("/catalog", locale)} className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950">
              {copy.buttons.catalog}
            </a>
            <a href={toLocalePath("/blog", locale)} className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950">
              {copy.buttons.blog}
            </a>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}