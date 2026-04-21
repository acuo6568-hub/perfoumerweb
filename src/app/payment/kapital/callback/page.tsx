import Link from "next/link";
import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { getCurrentLocale } from "@/lib/i18n.server";
import { toLocalePath, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Ödəniş statusu",
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
  paymentDetails: string;
  amountLabel: string;
  paymentIdLabel: string;
  orderLabel: string;
  statusLabel: string;
  statusPaid: string;
  statusDeclined: string;
  statusPending: string;
  noValue: string;
  back: string;
  catalog: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    titleSuccess: "Ödəniş uğurla tamamlandı",
    titleDeclined: "Ödəniş təsdiqlənmədi",
    titlePending: "Ödəniş emal olunur",
    summarySuccess: "Tranzaksiya uğurlu göründü. Sifariş detalını yoxlaya bilərsiniz.",
    summaryDeclined: "Bank cavabında status Declined gəldi. Kart məlumatını yenidən yoxlayın.",
    summaryPending: "Status hələ yekun deyil. Bir neçə dəqiqə sonra yenidən yoxlayın.",
    paymentDetails: "Ödəniş detalları",
    amountLabel: "Ödəniş məbləği",
    paymentIdLabel: "Payment ID",
    orderLabel: "Order ID",
    statusLabel: "Status",
    statusPaid: "Uğurla tamamlandı",
    statusDeclined: "Təsdiqlənmədi",
    statusPending: "Emal olunur",
    noValue: "-",
    back: "Məhsul səhifəsinə qayıt",
    catalog: "Kataloqa keç",
  },
  en: {
    titleSuccess: "Payment completed successfully",
    titleDeclined: "Payment was not approved",
    titlePending: "Payment is processing",
    summarySuccess: "Transaction appears successful. You can continue in the app.",
    summaryDeclined: "Bank returned Declined. Please verify card details and retry.",
    summaryPending: "Status is not final yet. Please check again in a moment.",
    paymentDetails: "Payment details",
    amountLabel: "Amount of payment",
    paymentIdLabel: "Payment ID",
    orderLabel: "Order ID",
    statusLabel: "Status",
    statusPaid: "Completed",
    statusDeclined: "Not approved",
    statusPending: "Processing",
    noValue: "-",
    back: "Back to product page",
    catalog: "Go to catalog",
  },
  ru: {
    titleSuccess: "Оплата успешно завершена",
    titleDeclined: "Оплата не подтверждена",
    titlePending: "Оплата обрабатывается",
    summarySuccess: "Транзакция выглядит успешной. Можно продолжить в приложении.",
    summaryDeclined: "Банк вернул Declined. Проверьте данные карты и попробуйте снова.",
    summaryPending: "Статус пока не финальный. Проверьте еще раз через минуту.",
    paymentDetails: "Детали оплаты",
    amountLabel: "Сумма оплаты",
    paymentIdLabel: "Payment ID",
    orderLabel: "Order ID",
    statusLabel: "Статус",
    statusPaid: "Успешно завершена",
    statusDeclined: "Не подтверждена",
    statusPending: "В обработке",
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

function findFirstParam(
  params: Record<string, string | string[] | undefined>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = toSingleValue(params[key]);
    if (value) return value;
  }

  return null;
}

function formatAmountDisplay(amount: string | null, currency: string | null, fallback: string) {
  if (!amount) {
    return [amount, currency].filter(Boolean).join(" ") || fallback;
  }

  const normalized = amount.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return [amount, currency].filter(Boolean).join(" ") || fallback;
  }

  return [`${parsed.toFixed(2)}`, currency].filter(Boolean).join(" ");
}

function normalizeNextPath(input: string | undefined) {
  if (input && input.startsWith("/") && !input.startsWith("//")) {
    return input;
  }
  return "/catalog";
}

type StatusKind = "success" | "declined" | "pending";

function resolveStatusKind(status: string): StatusKind {
  const compact = status.trim().toUpperCase().replace(/[^A-Z]/g, "");
  const successKeys = ["FULLYPAID", "PAID", "APPROVED", "AUTHORIZED", "AUTHORISED", "CAPTURED", "SUCCESS"];
  const declinedKeys = ["DECLINED", "REFUSED", "REJECTED", "FAILED", "ERROR", "CANCELLED", "CANCELED", "EXPIRED"];

  if (successKeys.some((key) => compact.includes(key))) {
    return "success";
  }
  if (declinedKeys.some((key) => compact.includes(key))) {
    return "declined";
  }
  return "pending";
}

export default async function KapitalCallbackPage({ searchParams }: CallbackPageProps) {
  const locale = await getCurrentLocale();
  const copy = copyByLocale[locale];
  const params = await searchParams;

  const orderId = findFirstParam(params, ["ID", "ORDERID", "OrderID"]) || copy.noValue;
  const status = findFirstParam(params, ["STATUS", "status", "Result", "RESULT"]) || "Unknown";
  const paymentId = findFirstParam(params, ["PAYMENTID", "PaymentID", "PID", "paymentId", "id"]) || orderId;
  const amount = findFirstParam(params, ["AMOUNT", "amount", "Amount", "ORDERAMOUNT", "OrderAmount"]);
  const currency = findFirstParam(params, ["CURRENCY", "currency", "Currency", "ORDERCURRENCY"]);
  const amountDisplay = formatAmountDisplay(amount, currency, copy.noValue);

  const nextPath = normalizeNextPath(toSingleValue(params.next) || undefined);
  const statusKind = resolveStatusKind(status);
  const friendlyStatus =
    statusKind === "success" ? copy.statusPaid : statusKind === "declined" ? copy.statusDeclined : copy.statusPending;

  const detailRows = Object.entries(params)
    .filter(([key]) => {
      const normalized = key.toLowerCase();
      return normalized !== "next" && normalized !== "status" && normalized !== "result";
    })
    .map(([key, value]) => ({ key, value: toSingleValue(value) || copy.noValue }))
    .sort((a, b) => a.key.localeCompare(b.key));

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

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                <p className="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">{copy.amountLabel}</p>
                <p className="mt-1 text-[1.2rem] font-semibold tracking-[-0.02em] text-zinc-900">{amountDisplay}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                <p className="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">{copy.paymentIdLabel}</p>
                <p className="mt-1 text-[1.2rem] font-semibold tracking-[-0.02em] text-zinc-900">{paymentId}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
              <p>
                <span className="font-semibold text-zinc-900">{copy.orderLabel}:</span> {orderId}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">{copy.statusLabel}:</span> {friendlyStatus}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/90 p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">{copy.paymentDetails}</p>
              <div className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200/80 bg-zinc-50/60">
                {detailRows.length ? (
                  detailRows.map((item) => (
                    <div key={item.key} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
                      <span className="text-zinc-500">{item.key}</span>
                      <span className="max-w-[68%] break-all text-right font-medium text-zinc-800">{item.value}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-zinc-500">{copy.noValue}</div>
                )}
              </div>
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
