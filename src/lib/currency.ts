import type { Locale } from "@/lib/i18n";

export type SupportedCurrency = "AZN" | "USD" | "EUR" | "RUB" | "AED" | "TRY";

type CurrencyMeta = {
  code: SupportedCurrency;
  label: string;
  shortLabel: string;
  symbol: string;
  aznRate: number;
};

export const CURRENCY_STORAGE_KEY = "perfoumer:currency";

export const CURRENCY_META: Record<SupportedCurrency, CurrencyMeta> = {
  AZN: {
    code: "AZN",
    label: "Azerbaijani manat",
    shortLabel: "AZN",
    symbol: "₼",
    aznRate: 1,
  },
  USD: {
    code: "USD",
    label: "US dollar",
    shortLabel: "USD",
    symbol: "$",
    aznRate: 1.697,
  },
  EUR: {
    code: "EUR",
    label: "Euro",
    shortLabel: "EUR",
    symbol: "€",
    aznRate: 1.9768,
  },
  RUB: {
    code: "RUB",
    label: "Russian ruble",
    shortLabel: "RUB",
    symbol: "₽",
    aznRate: 0.0202,
  },
  AED: {
    code: "AED",
    label: "UAE dirham",
    shortLabel: "AED",
    symbol: "د.إ",
    aznRate: 0.37,
  },
  TRY: {
    code: "TRY",
    label: "Turkish lira",
    shortLabel: "TL",
    symbol: "₺",
    aznRate: 0.0279,
  },
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_META) as SupportedCurrency[];

const intlLocaleByAppLocale: Record<Locale, string> = {
  az: "az-AZ",
  en: "en-US",
  ru: "ru-RU",
};

type FormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

function hasMeaningfulCents(amount: number) {
  if (!Number.isFinite(amount)) {
    return false;
  }

  return Math.round(Math.abs(amount) * 100) % 100 !== 0;
}

function resolveFractionDigits(amount: number, options?: FormatOptions) {
  const minimumFractionDigits = options?.minimumFractionDigits ?? (hasMeaningfulCents(amount) ? 2 : 0);
  const maximumFractionDigits = options?.maximumFractionDigits ?? Math.max(minimumFractionDigits, 2);

  return {
    minimumFractionDigits,
    maximumFractionDigits,
  };
}

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === "string" && value in CURRENCY_META;
}

export function convertFromAzn(amountAzn: number, currency: SupportedCurrency) {
  if (!Number.isFinite(amountAzn)) {
    return 0;
  }

  const rate = CURRENCY_META[currency].aznRate;
  if (!Number.isFinite(rate) || rate <= 0) {
    return amountAzn;
  }

  const converted = amountAzn / rate;
  return Math.round(converted * 100) / 100;
}

export function formatCurrencyAmount(
  amount: number,
  currency: SupportedCurrency,
  locale: Locale,
  options?: FormatOptions,
) {
  const { minimumFractionDigits, maximumFractionDigits } = resolveFractionDigits(amount, options);
  const formatter = new Intl.NumberFormat(intlLocaleByAppLocale[locale], {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return formatter.format(amount);
}

export function formatCurrencyFromAzn(
  amountAzn: number,
  currency: SupportedCurrency,
  locale: Locale,
  options?: FormatOptions,
) {
  return formatCurrencyAmount(convertFromAzn(amountAzn, currency), currency, locale, options);
}

export function formatNumberWithOptionalCents(
  amount: number,
  locale: Locale,
  options?: FormatOptions,
) {
  const { minimumFractionDigits, maximumFractionDigits } = resolveFractionDigits(amount, options);

  return new Intl.NumberFormat(intlLocaleByAppLocale[locale], {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function getCurrencyShortLabel(currency: SupportedCurrency) {
  return CURRENCY_META[currency].shortLabel;
}

export function getCurrencySymbol(currency: SupportedCurrency) {
  return CURRENCY_META[currency].symbol;
}
