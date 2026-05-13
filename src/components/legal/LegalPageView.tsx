import Link from "next/link";

import { Footer } from "@/components/Footer";
import type { SiteSettings } from "@/lib/site-branding";
import {
  LEGAL_CONTACT_EMAIL,
  getLegalPageLinks,
  type LegalPageContent,
} from "@/lib/legal";
import type { Locale } from "@/lib/i18n";

type LegalPageViewProps = {
  locale: Locale;
  page: LegalPageContent;
  settings: SiteSettings;
};

export function LegalPageView({ locale, page, settings }: LegalPageViewProps) {
  const legalLinks = getLegalPageLinks(locale, settings);

  return (
    <div className="bg-[#f5f5f4]">
      <main className="route-page-enter mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/80 pb-8">
          <div className="max-w-4xl">
            <p className="text-[0.72rem] font-medium tracking-[0.34em] text-zinc-500 uppercase">
              {page.eyebrow}
            </p>
            <h1 className="mt-4 max-w-[12ch] text-[2.35rem] leading-[0.95] tracking-[-0.03em] text-zinc-900 sm:text-[2.9rem] md:text-[3.6rem]">
              {page.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base md:leading-7">
              {page.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-600">
              <p>
                <span className="font-medium text-zinc-900">{page.updatedLabel}:</span>{" "}
                {page.updatedValue}
              </p>
              <a
                href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-700"
              >
                {LEGAL_CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="order-2 xl:order-1">
            <div className="xl:sticky xl:top-[7.7rem] xl:space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-[0.72rem] font-medium tracking-[0.24em] text-zinc-500 uppercase">
                  {page.navigationTitle}
                </p>
                <nav aria-label={page.navigationTitle} className="mt-4 flex flex-col">
                  {legalLinks.map((link) => {
                    const isActive = link.slug === page.slug;

                    return (
                      <Link
                        key={link.slug}
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`border-l px-4 py-3 text-sm transition-colors ${
                          isActive
                            ? "border-zinc-900 text-zinc-900"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-[0.72rem] font-medium tracking-[0.24em] text-zinc-500 uppercase">
                  {page.contactTitle}
                </p>
                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  {page.contactText}
                </p>
                <a
                  href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                  className="mt-5 inline-flex text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-700"
                >
                  {LEGAL_CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </aside>

          <div className="order-1 space-y-4 xl:order-2">
            {page.sections.map((section, index) => (
              <article
                key={section.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-7"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="shrink-0 text-sm font-medium text-zinc-400">
                    {(index + 1).toString().padStart(2, "0")}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-[1.65rem] leading-[1.08] tracking-[-0.02em] text-zinc-900 md:text-[1.95rem]">
                      {section.title}
                    </h2>

                    {section.paragraphs?.length ? (
                      <div className="mt-4 space-y-3">
                        {section.paragraphs.map((paragraph) => (
                          <p
                            key={paragraph}
                            className="max-w-4xl text-sm leading-6 text-zinc-600 sm:text-base sm:leading-7"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {section.bullets?.length ? (
                      <ul className="mt-5 space-y-2">
                        {section.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="text-sm leading-6 text-zinc-700"
                          >
                            <span className="mr-2 text-zinc-400">-</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
