import { SEO_CONTACT, SEO_LOCAL_BUSINESS } from "@/lib/seo";

export const CASH_PICKUP_PAYMENT_METHOD = "cash_pickup";
export const CASH_DELIVERY_PAYMENT_METHOD = "cash_delivery";
export const CARD_DELIVERY_PAYMENT_METHOD = "card_delivery";
export const STORE_PICKUP_PAYMENT_METHOD = "store_pickup";

export type CheckoutSettings = {
  cardPaymentsEnabled: boolean;
  pickupLocationName: string;
  pickupAddress: string;
  pickupMapUrl: string;
  pickupPhone: string;
};

function readBooleanEnvValue(value: string | undefined, fallback: boolean) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function getCheckoutSettingsFromServer(): CheckoutSettings {
  const cardPaymentsEnabled = readBooleanEnvValue(
    process.env.CHECKOUT_CARD_PAYMENTS_ENABLED ?? process.env.NEXT_PUBLIC_CHECKOUT_CARD_PAYMENTS_ENABLED,
    true,
  );

  return {
    cardPaymentsEnabled,
    pickupLocationName: "Perfoumer Store",
    pickupAddress: `${SEO_LOCAL_BUSINESS.streetAddress}, ${SEO_LOCAL_BUSINESS.cityNative} ${SEO_LOCAL_BUSINESS.postalCode}, ${SEO_LOCAL_BUSINESS.countryName}`,
    pickupMapUrl: SEO_LOCAL_BUSINESS.mapUrl,
    pickupPhone: SEO_CONTACT.phone,
  };
}
