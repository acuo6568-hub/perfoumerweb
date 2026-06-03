import type { Locale } from "@/lib/i18n";

export type DeliveryDisplayEstimate = {
  carrier: string;
  fee?: number;
  etaLabel: string;
  zone?: string;
  city?: string;
  deliveryMethod?: string;
};

function normalizeCity(value: string | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ə/g, "e")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c");
}

export function isBakuCity(value: string | undefined) {
  const normalized = normalizeCity(value);
  return ["baku", "baki", "baku city", "baki city", "бакy", "баку"].includes(normalized);
}

export function getBakuCourierLabel(locale: Locale | "az" | "en" | "ru" = "az") {
  if (locale === "en") return "Perfoumer Courier";
  if (locale === "ru") return "Курьер Perfoumer";
  return "Perfoumer kuryeri";
}

export function getBakuCourierEtaLabel(locale: Locale | "az" | "en" | "ru" = "az") {
  if (locale === "en") return "2-5 hours";
  if (locale === "ru") return "2-5 часов";
  return "2-5 saat";
}

export function getAzerpoctEtaLabel(locale: Locale | "az" | "en" | "ru" = "az") {
  if (locale === "en") return "1-2 business days";
  if (locale === "ru") return "1-2 рабочих дня";
  return "1-2 iş günü";
}

export function resolveDeliveryDisplayEstimate(input: {
  city?: string;
  deliveryEstimate?: unknown;
  locale?: Locale | "az" | "en" | "ru";
}): DeliveryDisplayEstimate {
  const locale = input.locale || "az";
  const stored = input.deliveryEstimate;

  if (stored && typeof stored === "object") {
    const source = stored as Record<string, unknown>;
    const carrier = typeof source.carrier === "string" ? source.carrier.trim() : "";
    const etaLabel = typeof source.etaLabel === "string" ? source.etaLabel.trim() : "";
    const city = typeof source.city === "string" ? source.city.trim() : input.city || "";
    const fee = Number(source.fee);

    if (carrier || etaLabel) {
      return {
        carrier: carrier || (isBakuCity(city) ? getBakuCourierLabel(locale) : "Azerpoct"),
        fee: Number.isFinite(fee) ? fee : undefined,
        etaLabel: etaLabel || (isBakuCity(city) ? getBakuCourierEtaLabel(locale) : getAzerpoctEtaLabel(locale)),
        zone: typeof source.zone === "string" ? source.zone : undefined,
        city,
        deliveryMethod: typeof source.deliveryMethod === "string" ? source.deliveryMethod : undefined,
      };
    }
  }

  if (isBakuCity(input.city)) {
    return {
      carrier: getBakuCourierLabel(locale),
      etaLabel: getBakuCourierEtaLabel(locale),
      fee: 0,
      zone: "baku",
      city: input.city,
    };
  }

  return {
    carrier: "Azerpoct",
    etaLabel: getAzerpoctEtaLabel(locale),
    zone: "regional",
    city: input.city,
  };
}
