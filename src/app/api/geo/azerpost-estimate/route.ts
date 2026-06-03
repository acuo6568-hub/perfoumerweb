import { NextResponse } from "next/server";
import {
  getBakuCourierEtaLabel,
  getBakuCourierLabel,
  getAzerpoctEtaLabel,
  isBakuCity,
} from "@/lib/delivery-display";

export const runtime = "nodejs";

type DeliveryMethod = "standard" | "express";

type EstimateRequest = {
  city?: string;
  country?: string;
  deliveryMethod?: DeliveryMethod;
  subtotal?: number;
  locale?: string;
};

type Zone = "baku" | "absheron" | "regional" | "remote";

type Estimate = {
  carrier: string;
  zone: Zone;
  city: string;
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
  etaLabel: string;
  freeThreshold: number;
};

type SupportedLocale = "az" | "en" | "ru";

const OUTSIDE_BAKU_STANDARD_FEE = 2.5;

function normalize(value: string | undefined): string {
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

function resolveLocale(value: string | undefined): SupportedLocale {
  if (value === "en" || value === "ru") {
    return value;
  }

  return "az";
}

function resolveZone(city: string): Zone {
  const normalized = normalize(city);
  if (!normalized) return "regional";

  if (isBakuCity(city) || ["baku", "baku city", "baki", "baki city", "бакy", "баку"].includes(normalized)) {
    return "baku";
  }

  if (["sumqayit", "sumgait", "xirdalan", "khirdalan", "absheron", "abseron"].includes(normalized)) {
    return "absheron";
  }

  if (["naxcivan", "nakhchivan", "lankaran", "lenkeran", "qax", "zaqatala", "zagatala"].includes(normalized)) {
    return "remote";
  }

  return "regional";
}

function buildEstimate(
  city: string,
  method: DeliveryMethod,
  subtotal: number,
  locale: SupportedLocale,
): Estimate {
  const zone = resolveZone(city);

  if (zone === "baku") {
    const fee = method === "express" ? 5 : 0;
    return {
      carrier: getBakuCourierLabel(locale),
      zone,
      city: city.trim(),
      fee,
      etaMinDays: 0,
      etaMaxDays: 0,
      etaLabel: getBakuCourierEtaLabel(locale),
      freeThreshold: 0,
    };
  }

  if (zone === "absheron") {
    const fee = method === "express" ? 7.5 : OUTSIDE_BAKU_STANDARD_FEE;
    return {
      carrier: "Azerpoct",
      zone,
      city: city.trim(),
      fee,
      etaMinDays: 1,
      etaMaxDays: method === "express" ? 2 : 3,
      etaLabel: getAzerpoctEtaLabel(locale),
      freeThreshold: 0,
    };
  }

  if (zone === "remote") {
    const fee = method === "express" ? 9.5 : OUTSIDE_BAKU_STANDARD_FEE;
    return {
      carrier: "Azerpoct",
      zone,
      city: city.trim(),
      fee,
      etaMinDays: method === "express" ? 2 : 3,
      etaMaxDays: method === "express" ? 4 : 5,
      etaLabel: getAzerpoctEtaLabel(locale),
      freeThreshold: 0,
    };
  }

  const fee = method === "express" ? 8.5 : OUTSIDE_BAKU_STANDARD_FEE;
  return {
    carrier: "Azerpoct",
    zone: "regional",
    city: city.trim(),
    fee,
    etaMinDays: method === "express" ? 1 : 2,
    etaMaxDays: method === "express" ? 3 : 4,
    etaLabel: getAzerpoctEtaLabel(locale),
    freeThreshold: 0,
  };
}

export async function POST(request: Request) {
  let body: EstimateRequest;
  try {
    body = (await request.json()) as EstimateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const city = (body.city || "").trim();
  const country = (body.country || "").trim();
  const method: DeliveryMethod = body.deliveryMethod === "express" ? "express" : "standard";
  const subtotal = Number.isFinite(body.subtotal) ? Number(body.subtotal) : 0;
  const locale = resolveLocale(typeof body.locale === "string" ? body.locale.trim().toLowerCase() : "az");

  if (!city && !country) {
    return NextResponse.json({ error: "City or country is required." }, { status: 400 });
  }

  const estimate = buildEstimate(city || country || "Azerbaijan", method, subtotal, locale);
  return NextResponse.json({ estimate }, { status: 200 });
}
