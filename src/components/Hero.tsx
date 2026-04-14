import Link from "next/link";

import { getDictionary, type Locale } from "@/lib/i18n";

type HeroProps = {
  locale: Locale;
};
export function Hero({ locale }: HeroProps) {
  const t = getDictionary(locale);

  return (
    <section className="hero-shell relative overflow-hidden rounded-[34px] xl:rounded-[42px]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(126deg, #111214 0%, #191a1f 36%, #2a2320 68%, #3a2a24 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_78%,rgba(244,209,176,0.36),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_22%,rgba(214,227,255,0.22),transparent_44%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-white/24 via-white/8 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] bg-gradient-to-l from-[#c5d0eb]/18 via-[#c5d0eb]/8 to-transparent xl:block" />
      <div className="hero-grain pointer-events-none absolute inset-0 opacity-[0.16]" />

      <div className="relative z-[3] mx-auto flex h-full max-w-[1540px] items-start px-6 py-16 text-white md:px-10 md:py-20 xl:py-24">
        <div className="max-w-[46rem] pt-28 md:pt-32 xl:max-w-[50rem] xl:pt-36">
          <p className="hero-fade-up hero-delay-1 mb-3 text-sm tracking-[0.2em] text-white/80 uppercase">
            {t.hero.eyebrow}
          </p>
          <h1 className="hero-fade-up hero-delay-2 text-5xl leading-[1.02] font-semibold md:text-7xl xl:text-[4.75rem] 2xl:text-[5rem]">
            {t.hero.title}
          </h1>
          <p className="hero-fade-up hero-delay-3 mt-6 max-w-xl text-base text-white/85 md:text-lg">
            {t.hero.description}
          </p>
          <div className="hero-fade-up hero-delay-4 mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
            >
              {t.hero.discover}
            </Link>
            <Link
              href="/catalog"
              className="rounded-full border border-white/70 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t.hero.viewAll}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
