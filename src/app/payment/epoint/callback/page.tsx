import Link from "next/link";
import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { getCurrentLocale } from "@/lib/i18n.server";
import { toLocalePath, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Payment status",
  robots: {
    index: false,
    follow: false,
  },
};

type CallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Copy = {
  titleSuccess: string;
  titleDeclined: string;
  titlePending: string;
  summarySuccess: string;
  summaryDeclined: string;
  summaryPending: string;
  orderLabel: string;
  statusLabel: string;
  noValue: string;
  back: string;
  catalog: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    titleSuccess: "Ödəniş uğurla tamamlandı",
    titleDeclined: "Ödəniş təsdiqlənmədi",
    titlePending: "Ödəniş emal olunur",
    summarySuccess: "Epoint ödəniş yönləndirməsi uğurlu göründü. Son status checkout-da yoxlanacaq.",
    summaryDeclined: "Epoint bu ödəniş üçün uğursuz nəticə qaytardı. Kart məlumatını yenidən yoxlayın.",
    summaryPending: "Ödəniş statusu hələ yekun deyil. Bir neçə dəqiqə sonra yenidən yoxlayın.",
    orderLabel: "Order ID",
    statusLabel: "Status",
    noValue: "-",
    back: "Məhsul səhifəsinə qayıt",
    catalog: "Kataloqa keç",
  },
  en: {
    titleSuccess: "Payment completed successfully",
    titleDeclined: "Payment was not approved",
    titlePending: "Payment is processing",
    summarySuccess: "Epoint returned a successful redirect. Final status will be confirmed in checkout.",
    summaryDeclined: "Epoint returned a failed redirect for this payment. Please review your details and retry.",
    summaryPending: "Payment status is not final yet. Please check again shortly.",
    orderLabel: "Order ID",
    statusLabel: "Status",
    noValue: "-",
    back: "Back to product page",
    catalog: "Go to catalog",
  },
  ru: {
    titleSuccess: "Оплата успешно завершена",
    titleDeclined: "Оплата не подтверждена",
    titlePending: "Оплата обрабатывается",
    summarySuccess: "Epoint вернул успешный редирект. Финальный статус будет подтвержден в checkout.",
    summaryDeclined: "Epoint вернул неуспешный редирект. Проверьте данные карты и попробуйте еще раз.",
    summaryPending: "Статус пока не финальный. Проверьте позже.",
    orderLabel: "Order ID",
    statusLabel: "Статус",
    noValue: "-",
    back: "Назад к товару",
    catalog: "Перейти в каталог",
  },
};

function toSingleValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
    return normalized || null;
  }

  return null;
}

function normalizeNextPath(input: string | undefined, locale: Locale) {
  if (input && input.startsWith("/") && !input.startsWith("//")) {
    return input;
  }
  return toLocalePath("/catalog", locale);
}

type StatusKind = "success" | "declined" | "pending";

function resolveStatusKind(status: string | null): StatusKind {
  const compact = String(status || "").trim().toUpperCase();
  if (compact === "SUCCESS") return "success";
  if (compact === "FAILED" || compact === "ERROR") return "declined";
  return "pending";
}

export default async function EpointCallbackPage({ searchParams }: CallbackPageProps) {
  const locale = await getCurrentLocale();
  const copy = copyByLocale[locale];
  const params = await searchParams;

  const orderId = toSingleValue(params.epoint_order_id) || toSingleValue(params.order_id) || copy.noValue;
  const status = toSingleValue(params.epoint_redirect) || toSingleValue(params.status);
  const nextPath = normalizeNextPath(toSingleValue(params.next) || undefined, locale);
  const statusKind = resolveStatusKind(status);

  const title =
    statusKind === "success" ? copy.titleSuccess : statusKind === "declined" ? copy.titleDeclined : copy.titlePending;
  const summary =
    statusKind === "success"
      ? copy.summarySuccess
      : statusKind === "declined"
        ? copy.summaryDeclined
        : copy.summaryPending;

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-3 sm:px-6 md:px-10">
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-3xl rounded-[1.8rem] border border-white/70 bg-white/90 p-6 shadow-[0_16px_44px_rgba(20,20,22,0.08)] ring-1 ring-zinc-200/70 md:p-8">
            <h1 className="text-[2rem] leading-[0.95] tracking-[-0.02em] text-zinc-900 md:text-[2.6rem]">{title}</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600 md:text-base">{summary}</p>

            <div className="mt-6 space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
              <p>
                <span className="font-semibold text-zinc-900">{copy.orderLabel}:</span> {orderId}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">{copy.statusLabel}:</span> {status || copy.noValue}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={nextPath}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white"
              >
                {copy.back}
              </Link>
              <Link
                href={toLocalePath("/catalog", locale)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-700"
              >
                {copy.catalog}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
