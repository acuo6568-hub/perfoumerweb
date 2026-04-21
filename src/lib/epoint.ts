import { createHash, randomUUID } from "crypto";

import type { Locale } from "@/lib/i18n";

export const EPOINT_API_BASE_URL = "https://epoint.az/api/1";

type EpointRequestPayload = {
  public_key: string;
  amount?: string;
  currency?: "AZN";
  language?: Locale;
  order_id?: string;
  description?: string;
  success_redirect_url?: string;
  error_redirect_url?: string;
  other_attr?: Record<string, string>;
  transaction?: string;
};

export type EpointCallbackPayload = {
  order_id?: string;
  status?: string;
  code?: string;
  message?: string;
  transaction?: string;
  bank_transaction?: string;
  operation_code?: string;
  rrn?: string;
  card_name?: string;
  card_mask?: string;
  amount?: string | number;
};

export function getEpointConfig() {
  const publicKey = (process.env.EPOINT_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.EPOINT_PRIVATE_KEY || "").trim();
  const apiBaseUrl = (process.env.EPOINT_API_BASE_URL || EPOINT_API_BASE_URL).trim().replace(/\/+$/, "");

  return {
    publicKey,
    privateKey,
    apiBaseUrl,
  };
}

export function hasEpointConfig() {
  const { publicKey, privateKey } = getEpointConfig();
  return Boolean(publicKey && privateKey);
}

export function normalizeEpointLocale(locale: unknown): Locale {
  if (locale === "en" || locale === "ru") return locale;
  return "az";
}

export function normalizeEpointAmount(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "1.00";
  }

  return (Math.round(parsed * 100) / 100).toFixed(2);
}

export function encodeEpointData(payload: EpointRequestPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function decodeEpointData<T>(data: string) {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as T;
}

export function signEpointData(data: string, privateKey: string) {
  return createHash("sha1").update(`${privateKey}${data}${privateKey}`, "utf8").digest("base64");
}

export function verifyEpointSignature(data: string, signature: string, privateKey: string) {
  return signEpointData(data, privateKey) === signature;
}

export function createEpointOrderId(prefix = "perf") {
  return `${prefix}_${Date.now()}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function resolveEpointPaymentResult(status: string | null | undefined) {
  const compact = String(status || "")
    .trim()
    .toLowerCase();

  if (compact === "success") return "completed" as const;
  if (compact === "returned") return "refunded" as const;
  if (compact === "error") return "failed" as const;
  return "pending" as const;
}
