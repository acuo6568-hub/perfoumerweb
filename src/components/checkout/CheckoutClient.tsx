"use client";

import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  CARD_DELIVERY_PAYMENT_METHOD,
  CASH_DELIVERY_PAYMENT_METHOD,
  STORE_PICKUP_PAYMENT_METHOD,
  type CheckoutSettings,
} from "@/lib/checkout-settings";
import { formatCurrencyFromAzn } from "@/lib/currency";
import { toLocalePath, type Locale } from "@/lib/i18n";
import { AZERBAIJAN_CITIES, resolveAzerbaijanCity } from "@/lib/azerbaijan-cities";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";
import type { CartItemRow } from "@/types/cart";

type CheckoutClientProps = {
  perfumes: any[];
  locale: Locale;
  supabase: SupabasePublicConfig | null;
  settings: CheckoutSettings;
};

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
};

type PickupContact = {
  fullName: string;
  phone: string;
  note: string;
};

type CheckoutMode = "cash_delivery" | "card_delivery" | "store_pickup";

type Copy = {
  loading: string;
  signInTitle: string;
  signInBody: string;
  signInAction: string;
  emptyCart: string;
  steps: [string, string, string];
  savedAddresses: string;
  addAddress: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
  invalidForm: string;
  invalidFullName: string;
  invalidPhone: string;
  invalidLine1: string;
  invalidCity: string;
  invalidPostalCode: string;
  invalidCountry: string;
  noAddressYet: string;
  shippingAddressLabel: string;
  useAddress: string;
  remove: string;
  saveAddress: string;
  saveAddressLoading: string;
  delivery: string;
  standard: string;
  express: string;
  review: string;
  subtotal: string;
  shipping: string;
  total: string;
  next: string;
  back: string;
  pay: string;
  processingTitle: string;
  processingBody: string;
  successTitle: string;
  successBody: string;
  declinedTitle: string;
  declinedBody: string;
  pendingTitle: string;
  pendingBody: string;
  retryPayment: string;
  viewOrders: string;
  goHome: string;
  paymentStatusLabel: string;
  paymentStatusPaid: string;
  paymentStatusDeclined: string;
  paymentStatusPending: string;
  paymentStatusUnknown: string;
  orderSummaryTitle: string;
  deliveryEstimateTitle: string;
  deliveryEstimateLoading: string;
  deliveryEstimateEta: string;
  deliveryEstimateCarrier: string;
  paymentOptionsTitle: string;
  paymentOptionsBody: string;
  cashDeliveryTitle: string;
  cashDeliveryBody: string;
  cardDeliveryTitle: string;
  cardDeliveryBody: string;
  storePickupTitle: string;
  storePickupBody: string;
  storePickupPill: string;
  deliveryContactTitle: string;
  cardPaymentTitle: string;
  cardPaymentBody: string;
  cashPickupTitle: string;
  cashPickupBody: string;
  cashPickupPill: string;
  pickupContactTitle: string;
  pickupContactBody: string;
  pickupNote: string;
  pickupNotePlaceholder: string;
  invalidPickupContact: string;
  pickupSummaryTitle: string;
  pickupLocationTitle: string;
  pickupAddressLabel: string;
  pickupPhoneLabel: string;
  pickupPaymentHint: string;
  openMap: string;
  paymentMethodLabel: string;
  paymentMethodCard: string;
  paymentMethodCardDelivery: string;
  paymentMethodCashDelivery: string;
  paymentMethodStorePickup: string;
  paymentMethodCashPickup: string;
  cashOrderAction: string;
  cashOrderLoading: string;
  cashOrderError: string;
  cashSuccessTitle: string;
  cashSuccessBody: string;
  cashStatusReserved: string;
  pickupOrderSummaryLabel: string;
};

type DeliveryEstimate = {
  carrier: string;
  zone: string;
  city: string;
  fee: number;
  etaLabel: string;
  freeThreshold: number;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    loading: "Yüklənir...",
    signInTitle: "Checkout üçün giriş et",
    signInBody: "Sifarişi tamamlamaq üçün hesabına daxil ol.",
    signInAction: "Giriş et",
    emptyCart: "Checkout üçün səbətdə məhsul yoxdur.",
    steps: ["Əlaqə", "Sifariş seçimi", "Yekun"],
    savedAddresses: "Çatdırılma ünvanları",
    addAddress: "Yeni ünvan əlavə et",
    fullName: "Ad Soyad",
    phone: "Telefon",
    line1: "Ünvan sətri 1",
    line2: "Ünvan sətri 2",
    city: "Şəhər",
    postalCode: "Poçt kodu",
    country: "Ölkə",
    invalidForm: "Xahiş olunur ünvan məlumatlarını düzgün doldurun.",
    invalidFullName: "Ad və soyadı düzgün daxil edin.",
    invalidPhone: "Telefon nömrəsini düzgün daxil edin.",
    invalidLine1: "Ünvan sətri minimum 5 simvol olmalıdır.",
    invalidCity: "Şəhər adını düzgün daxil edin.",
    invalidPostalCode: "Poçt kodu minimum 3 simvol olmalıdır.",
    invalidCountry: "Ölkə adını düzgün daxil edin.",
    noAddressYet: "Hələ ünvan əlavə edilməyib.",
    shippingAddressLabel: "Çatdırılma ünvanı",
    useAddress: "Seç",
    remove: "Sil",
    saveAddress: "Ünvanı yadda saxla",
    saveAddressLoading: "Yadda saxlanılır...",
    delivery: "Çatdırılma növü",
    standard: "Standart (Pulsuz)",
    express: "Ekspress",
    review: "Yekun təsdiq",
    subtotal: "Ara cəmi",
    shipping: "Çatdırılma",
    total: "Ümumi",
    next: "Növbəti",
    back: "Geri",
    pay: "Ödənişə keç",
    processingTitle: "Sifarişiniz emal olunur",
    processingBody: "Ödəniş məlumatı yoxlanılır. Bir neçə saniyə gözləyin.",
    successTitle: "Sifarişiniz təsdiqləndi",
    successBody: "Ödəniş uğurla tamamlandı. Ətiriniz hazırlanmağa başladı.",
    declinedTitle: "Ödəniş təsdiqlənmədi",
    declinedBody: "Ödəniş alınmadı. Məlumatları yoxlayıb yenidən cəhd edin.",
    pendingTitle: "Ödəniş hələ yekunlaşmayıb",
    pendingBody: "Bankdan yekun cavab gözlənilir. Bir az sonra yenidən yoxlayın.",
    retryPayment: "Ödənişi yenidən yoxla",
    viewOrders: "Sifarişlərimə bax",
    goHome: "Ana səhifəyə qayıt",
    paymentStatusLabel: "Ödəniş statusu",
    paymentStatusPaid: "Uğurla tamamlandı",
    paymentStatusDeclined: "Təsdiqlənmədi",
    paymentStatusPending: "Emal olunur",
    paymentStatusUnknown: "Yoxlanılır",
    orderSummaryTitle: "Sifariş xülasəsi",
    deliveryEstimateTitle: "Çatdırılma təxmini",
    deliveryEstimateLoading: "Çatdırılma hesablanır...",
    deliveryEstimateEta: "Təxmini müddət",
    deliveryEstimateCarrier: "Daşıyıcı",
    paymentOptionsTitle: "Ödəniş və təhvil seçimi",
    paymentOptionsBody: "Ödəniş yalnız təhvil zamanı edilir: qapıda nağd, qapıda kart və ya mağazadan götürmə.",
    cashDeliveryTitle: "Qapıda Nağd",
    cashDeliveryBody: "Sifariş çatdırılır, ödənişi məhsulu təhvil alanda nağd edirsiniz.",
    cardDeliveryTitle: "Qapıda Kart",
    cardDeliveryBody: "Sifariş çatdırılır, ödənişi məhsulu təhvil alanda kartla edirsiniz.",
    storePickupTitle: "Mağazadan Götürmə",
    storePickupBody: "Sifariş mağazada hazırlanır, götürərkən əməkdaşla ödəniş/təhvil tamamlanır.",
    storePickupPill: "Sürətli təhvil",
    deliveryContactTitle: "Çatdırılma üçün ünvan",
    cardPaymentTitle: "Qapıda Kart",
    cardPaymentBody: "Ödənişi məhsulu təhvil alanda kartla tamamlayın.",
    cashPickupTitle: "Mağazadan Götürmə",
    cashPickupBody: "Sifariş mağazada hazırlanır və götürərkən təhvil verilir.",
    cashPickupPill: "Sürətli təhvil",
    pickupContactTitle: "Götürmə üçün əlaqə məlumatı",
    pickupContactBody: "Bu məlumat sifarişinizi hazırlayanda sizinlə əlaqə saxlamaq və təhvil zamanı sifarişi yoxlamaq üçün istifadə olunur.",
    pickupNote: "Qeyd",
    pickupNotePlaceholder: "Məsələn: axşam gələcəyəm və ya hədiyyə qablaşdırılması istəyirəm",
    invalidPickupContact: "Mağazadan götürmə üçün ad və telefon məlumatını düzgün daxil edin.",
    pickupSummaryTitle: "Mağazadan götürmə xülasəsi",
    pickupLocationTitle: "Götürmə ünvanı",
    pickupAddressLabel: "Ünvan",
    pickupPhoneLabel: "Əlaqə",
    pickupPaymentHint: "Ödəniş və təhvil mağazada əməkdaş tərəfindən tamamlanır.",
    openMap: "Xəritədə aç",
    paymentMethodLabel: "Ödəniş üsulu",
    paymentMethodCard: "Qapıda Kart",
    paymentMethodCardDelivery: "Qapıda Kart",
    paymentMethodCashDelivery: "Qapıda Nağd",
    paymentMethodStorePickup: "Mağazadan Götürmə",
    paymentMethodCashPickup: "Mağazadan Götürmə",
    cashOrderAction: "Sifarişi təsdiqlə",
    cashOrderLoading: "Sifariş hazırlanır...",
    cashOrderError: "Sifariş yaradılmadı. Zəhmət olmasa yenidən cəhd edin.",
    cashSuccessTitle: "Sifarişiniz qəbul edildi",
    cashSuccessBody: "Sifarişiniz mağaza komandamızın əməliyyat növbəsinə əlavə edildi. Təhvil zamanı seçdiyiniz üsulla ödəniş tamamlanacaq.",
    cashStatusReserved: "Təhvil zamanı ödəniş",
    pickupOrderSummaryLabel: "Təhvil forması",
  },
  en: {
    loading: "Loading...",
    signInTitle: "Sign in for checkout",
    signInBody: "Log in to complete your order.",
    signInAction: "Sign in",
    emptyCart: "Your cart is empty.",
    steps: ["Details", "Order option", "Review"],
    savedAddresses: "Shipping addresses",
    addAddress: "Add new address",
    fullName: "Full name",
    phone: "Phone",
    line1: "Address line 1",
    line2: "Address line 2",
    city: "City",
    postalCode: "Postal code",
    country: "Country",
    invalidForm: "Please provide valid address information.",
    invalidFullName: "Please enter a valid full name.",
    invalidPhone: "Please enter a valid phone number.",
    invalidLine1: "Address line 1 must be at least 5 characters.",
    invalidCity: "Please enter a valid city.",
    invalidPostalCode: "Postal code must be at least 3 characters.",
    invalidCountry: "Please enter a valid country.",
    noAddressYet: "No saved addresses yet.",
    shippingAddressLabel: "Shipping address",
    useAddress: "Use",
    remove: "Remove",
    saveAddress: "Save address",
    saveAddressLoading: "Saving...",
    delivery: "Delivery method",
    standard: "Standard (Free)",
    express: "Express",
    review: "Review and pay",
    subtotal: "Subtotal",
    shipping: "Shipping",
    total: "Total",
    next: "Next",
    back: "Back",
    pay: "Proceed to payment",
    processingTitle: "Processing your order",
    processingBody: "We are validating your payment details. Please wait a moment.",
    successTitle: "Order confirmed",
    successBody: "Payment was successful and your order is now in progress.",
    declinedTitle: "Payment not approved",
    declinedBody: "We could not complete payment. Please review details and try again.",
    pendingTitle: "Payment still pending",
    pendingBody: "We are waiting for final confirmation from the bank.",
    retryPayment: "Retry payment",
    viewOrders: "View my orders",
    goHome: "Go back home",
    paymentStatusLabel: "Payment status",
    paymentStatusPaid: "Completed",
    paymentStatusDeclined: "Not approved",
    paymentStatusPending: "Processing",
    paymentStatusUnknown: "Checking",
    orderSummaryTitle: "Order summary",
    deliveryEstimateTitle: "Estimated delivery",
    deliveryEstimateLoading: "Calculating delivery...",
    deliveryEstimateEta: "Estimated time",
    deliveryEstimateCarrier: "Carrier",
    paymentOptionsTitle: "Payment and handoff",
    paymentOptionsBody: "Payment is completed at handoff only: cash on delivery, card on delivery, or store pickup.",
    cashDeliveryTitle: "Cash on Delivery",
    cashDeliveryBody: "Your order is delivered and you pay cash when you receive it.",
    cardDeliveryTitle: "Card on Delivery",
    cardDeliveryBody: "Your order is delivered and you pay by card when you receive it.",
    storePickupTitle: "Store Pickup",
    storePickupBody: "Your order is prepared in store and completed with staff at handoff.",
    storePickupPill: "Fast handoff",
    deliveryContactTitle: "Delivery address",
    cardPaymentTitle: "Card on Delivery",
    cardPaymentBody: "Pay by card when the order is handed over.",
    cashPickupTitle: "Store Pickup",
    cashPickupBody: "Your order is prepared in store and handed over by staff.",
    cashPickupPill: "Fast handoff",
    pickupContactTitle: "Pickup contact details",
    pickupContactBody: "We use these details to prepare your order and verify it smoothly at handoff.",
    pickupNote: "Note",
    pickupNotePlaceholder: "For example: I will come in the evening or I need gift wrapping",
    invalidPickupContact: "Please enter a valid name and phone number for pickup.",
    pickupSummaryTitle: "Store pickup summary",
    pickupLocationTitle: "Pickup location",
    pickupAddressLabel: "Address",
    pickupPhoneLabel: "Contact",
    pickupPaymentHint: "Payment and handoff are completed with staff in store.",
    openMap: "Open map",
    paymentMethodLabel: "Payment method",
    paymentMethodCard: "Card on Delivery",
    paymentMethodCardDelivery: "Card on Delivery",
    paymentMethodCashDelivery: "Cash on Delivery",
    paymentMethodStorePickup: "Store Pickup",
    paymentMethodCashPickup: "Store Pickup",
    cashOrderAction: "Confirm order",
    cashOrderLoading: "Placing order...",
    cashOrderError: "We could not create your order. Please try again.",
    cashSuccessTitle: "Your order is confirmed",
    cashSuccessBody: "Your order has been added to the store operations queue. Payment will be completed at handoff using your selected method.",
    cashStatusReserved: "Payment at handoff",
    pickupOrderSummaryLabel: "Pickup format",
  },
  ru: {
    loading: "Загрузка...",
    signInTitle: "Войдите для checkout",
    signInBody: "Войдите в аккаунт, чтобы завершить заказ.",
    signInAction: "Войти",
    emptyCart: "Корзина пуста.",
    steps: ["Контакт", "Способ заказа", "Подтверждение"],
    savedAddresses: "Адреса доставки",
    addAddress: "Добавить адрес",
    fullName: "Имя и фамилия",
    phone: "Телефон",
    line1: "Адрес 1",
    line2: "Адрес 2",
    city: "Город",
    postalCode: "Индекс",
    country: "Страна",
    invalidForm: "Пожалуйста, заполните адрес корректно.",
    invalidFullName: "Введите корректные имя и фамилию.",
    invalidPhone: "Введите корректный номер телефона.",
    invalidLine1: "Адрес должен быть не короче 5 символов.",
    invalidCity: "Введите корректный город.",
    invalidPostalCode: "Индекс должен содержать минимум 3 символа.",
    invalidCountry: "Введите корректную страну.",
    noAddressYet: "Сохраненных адресов пока нет.",
    shippingAddressLabel: "Адрес доставки",
    useAddress: "Выбрать",
    remove: "Удалить",
    saveAddress: "Сохранить адрес",
    saveAddressLoading: "Сохранение...",
    delivery: "Способ доставки",
    standard: "Стандарт (Бесплатно)",
    express: "Экспресс",
    review: "Подтверждение",
    subtotal: "Подытог",
    shipping: "Доставка",
    total: "Итого",
    next: "Далее",
    back: "Назад",
    pay: "Перейти к оплате",
    processingTitle: "Обрабатываем ваш заказ",
    processingBody: "Проверяем данные оплаты. Пожалуйста, подождите.",
    successTitle: "Заказ подтвержден",
    successBody: "Оплата прошла успешно, заказ передан в обработку.",
    declinedTitle: "Оплата не подтверждена",
    declinedBody: "Оплату выполнить не удалось. Проверьте данные и попробуйте снова.",
    pendingTitle: "Оплата еще в ожидании",
    pendingBody: "Ждем финального ответа от банка. Попробуйте проверить позже.",
    retryPayment: "Повторить оплату",
    viewOrders: "Мои заказы",
    goHome: "Вернуться на главную",
    paymentStatusLabel: "Статус оплаты",
    paymentStatusPaid: "Успешно завершена",
    paymentStatusDeclined: "Не подтверждена",
    paymentStatusPending: "В обработке",
    paymentStatusUnknown: "Проверяется",
    orderSummaryTitle: "Сводка заказа",
    deliveryEstimateTitle: "Оценка доставки",
    deliveryEstimateLoading: "Рассчитываем доставку...",
    deliveryEstimateEta: "Оценочное время",
    deliveryEstimateCarrier: "Перевозчик",
    paymentOptionsTitle: "Оплата и получение",
    paymentOptionsBody: "Оплата производится только при передаче: наличными при доставке, картой при доставке или при самовывозе.",
    cashDeliveryTitle: "Наличные при доставке",
    cashDeliveryBody: "Заказ доставляется, вы оплачиваете наличными при получении.",
    cardDeliveryTitle: "Картой при доставке",
    cardDeliveryBody: "Заказ доставляется, вы оплачиваете картой при получении.",
    storePickupTitle: "Самовывоз из магазина",
    storePickupBody: "Заказ готовится в магазине и передается сотрудником.",
    storePickupPill: "Быстрая выдача",
    deliveryContactTitle: "Адрес доставки",
    cardPaymentTitle: "Картой при доставке",
    cardPaymentBody: "Оплатите картой при передаче заказа.",
    cashPickupTitle: "Самовывоз из магазина",
    cashPickupBody: "Заказ готовится в магазине и передается сотрудником.",
    cashPickupPill: "Быстрая выдача",
    pickupContactTitle: "Контакты для самовывоза",
    pickupContactBody: "Эти данные нужны, чтобы подготовить заказ и быстро подтвердить его при выдаче.",
    pickupNote: "Комментарий",
    pickupNotePlaceholder: "Например: приеду вечером или нужна подарочная упаковка",
    invalidPickupContact: "Введите корректные имя и телефон для самовывоза.",
    pickupSummaryTitle: "Сводка самовывоза",
    pickupLocationTitle: "Адрес самовывоза",
    pickupAddressLabel: "Адрес",
    pickupPhoneLabel: "Контакт",
    pickupPaymentHint: "Оплата и передача завершаются сотрудником в магазине.",
    openMap: "Открыть карту",
    paymentMethodLabel: "Способ оплаты",
    paymentMethodCard: "Картой при доставке",
    paymentMethodCardDelivery: "Картой при доставке",
    paymentMethodCashDelivery: "Наличными при доставке",
    paymentMethodStorePickup: "Самовывоз из магазина",
    paymentMethodCashPickup: "Самовывоз из магазина",
    cashOrderAction: "Подтвердить заказ",
    cashOrderLoading: "Оформляем заказ...",
    cashOrderError: "Не удалось создать заказ на самовывоз. Попробуйте еще раз.",
    cashSuccessTitle: "Заказ подтвержден",
    cashSuccessBody: "Ваш заказ добавлен в очередь магазина. Оплата будет завершена при передаче выбранным способом.",
    cashStatusReserved: "Оплата при передаче",
    pickupOrderSummaryLabel: "Формат выдачи",
  },
};

type PaymentResultKind = "success" | "declined" | "pending";

type DraftFieldErrors = {
  fullName?: string;
  phone?: string;
  line1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

type PickupFieldErrors = {
  fullName?: string;
  phone?: string;
};

type OrderPayloadItem = {
  perfume_slug: string;
  perfume_name: string;
  size_ml: number;
  quantity: number;
  unit_price: number;
  total_price: number;
};

function resolvePaymentResultKind(status: string): PaymentResultKind {
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

function resolveFriendlyPaymentStatus(kind: PaymentResultKind | null, copy: Copy): string {
  if (kind === "success") return copy.paymentStatusPaid;
  if (kind === "declined") return copy.paymentStatusDeclined;
  if (kind === "pending") return copy.paymentStatusPending;
  return copy.paymentStatusUnknown;
}

const STORAGE_KEY = "perfoumer.checkout.addresses.v1";
const ADDRESS_TABLE = "checkout_addresses";
const EMAIL_SENT_STORAGE_KEY = "perfoumer.checkout.email.sent-orders.v1";
const CART_CLEARED_STORAGE_KEY = "perfoumer.checkout.cart-cleared-orders.v1";
const ORDER_SAVED_STORAGE_KEY = "perfoumer.checkout.order-saved.v1";
const ORDER_NUMBER_BY_PAYMENT_STORAGE_KEY = "perfoumer.checkout.order-number-by-payment.v1";
const PAYMENT_STATUS_FETCHED_STORAGE_KEY = "perfoumer.checkout.payment-status-fetched.v1";

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function validateDraftAddress(address: Address, copy: Copy): DraftFieldErrors {
  const errors: DraftFieldErrors = {};

  const fullName = address.fullName.trim();
  const phone = normalizePhone(address.phone.trim());
  const line1 = address.line1.trim();
  const city = address.city.trim();
  const postalCode = address.postalCode.trim();
  const country = address.country.trim();

  if (!/^[\p{L}][\p{L}\s'-]{2,}$/u.test(fullName)) {
    errors.fullName = copy.invalidFullName;
  }

  if (!/^\+?[\d]{7,15}$/.test(phone)) {
    errors.phone = copy.invalidPhone;
  }

  if (line1.length < 5) {
    errors.line1 = copy.invalidLine1;
  }

  if (!resolveAzerbaijanCity(city)) {
    errors.city = copy.invalidCity;
  }

  if (postalCode.length < 3) {
    errors.postalCode = copy.invalidPostalCode;
  }

  if (!/^[\p{L}\s.'-]{2,}$/u.test(country)) {
    errors.country = copy.invalidCountry;
  }

  return errors;
}

function validatePickupContact(contact: PickupContact, copy: Copy): PickupFieldErrors {
  const errors: PickupFieldErrors = {};

  if (!/^[\p{L}][\p{L}\s'-]{2,}$/u.test(contact.fullName.trim())) {
    errors.fullName = copy.invalidFullName;
  }

  if (!/^\+?[\d]{7,15}$/.test(normalizePhone(contact.phone.trim()))) {
    errors.phone = copy.invalidPhone;
  }

  return errors;
}

function parsePrice(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyAddress(): Address {
  return {
    id: "",
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "Azerbaijan",
  };
}

function emptyPickupContact(): PickupContact {
  return {
    fullName: "",
    phone: "",
    note: "",
  };
}

function normalizeAddressInput(address: Address): Address {
  const normalizedCity = resolveAzerbaijanCity(address.city);

  return {
    ...address,
    fullName: address.fullName.trim(),
    phone: normalizePhone(address.phone.trim()),
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: normalizedCity,
    postalCode: address.postalCode.trim(),
    country: address.country.trim() || "Azerbaijan",
  };
}

function normalizePickupContact(contact: PickupContact): PickupContact {
  return {
    fullName: contact.fullName.trim(),
    phone: normalizePhone(contact.phone.trim()),
    note: contact.note.trim(),
  };
}

export function CheckoutClient({ perfumes, locale, supabase: supabaseConfig, settings }: CheckoutClientProps) {
  const copy = copyByLocale[locale];
  const { selectedCurrency } = useCurrency();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const searchParams = useSearchParams();

  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(() => Boolean(supabase));
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [cartRows, setCartRows] = useState<CartItemRow[]>([]);
  const [step, setStep] = useState(0);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [draftAddress, setDraftAddress] = useState<Address>(emptyAddress());
  const [draftErrors, setDraftErrors] = useState<DraftFieldErrors>({});
  const [hasTriedSaveAddress, setHasTriedSaveAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [recentlyAddedAddressId, setRecentlyAddedAddressId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express">("standard");
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);

  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>(
    "cash_delivery",
  );
  const [pickupContact, setPickupContact] = useState<PickupContact>(emptyPickupContact());
  const [pickupErrors, setPickupErrors] = useState<PickupFieldErrors>({});
  const [cashOrderState, setCashOrderState] = useState<"idle" | "submitting" | "success">("idle");
  const [cashOrderError, setCashOrderError] = useState("");

  const [paymentResult, setPaymentResult] = useState<PaymentResultKind | null>(null);
  const [isPaymentResultResolving, setIsPaymentResultResolving] = useState(false);
  const [paymentStatusText, setPaymentStatusText] = useState("");
  const [paymentTransactionId, setPaymentTransactionId] = useState("");
  const [canonicalOrderNumber, setCanonicalOrderNumber] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | null>(null);
  const [isDeliveryEstimating, setIsDeliveryEstimating] = useState(false);
  const reviewStepEnteredAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Address[];
      if (!Array.isArray(parsed)) return;
      setAddresses(parsed);
      if (parsed[0]?.id) {
        setSelectedShippingId(parsed[0].id);
      }
    } catch {
      // ignore malformed saved checkout data
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  }, [addresses]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const providerOrderId =
      searchParams.get("epoint_order_id") ||
      searchParams.get("order_id") ||
      "";
    const providerRedirectStatus =
      searchParams.get("epoint_redirect") ||
      "";
    const legacyStatus =
      searchParams.get("STATUS") ||
      searchParams.get("status") ||
      searchParams.get("Result") ||
      searchParams.get("RESULT");
    const legacyOrderId =
      searchParams.get("ID") ||
      searchParams.get("ORDERID") ||
      searchParams.get("OrderID") ||
      "";
    const paymentId =
      searchParams.get("transaction") ||
      searchParams.get("PAYMENTID") ||
      searchParams.get("PaymentID") ||
      searchParams.get("PID") ||
      searchParams.get("paymentId") ||
      "";
    const status = providerRedirectStatus || legacyStatus;
    const orderId = providerOrderId || legacyOrderId;

    if (!status && !providerOrderId) {
      setPaymentResult(null);
      setIsPaymentResultResolving(false);
      setPaymentStatusText("");
      return;
    }

    setIsPaymentResultResolving(true);
    setPaymentStatusText(status || "new");
    setPaymentTransactionId(paymentId);
    setStep(2);

    if (providerOrderId) {
      const debugKey = `${providerOrderId}:${(providerRedirectStatus || "check").trim().toUpperCase()}`;
      let shouldFetchStatus = true;
      let isMounted = true;

      try {
        const raw = window.sessionStorage.getItem(PAYMENT_STATUS_FETCHED_STORAGE_KEY);
        const fetched = raw ? (JSON.parse(raw) as string[]) : [];
        if (fetched.includes(debugKey)) {
          shouldFetchStatus = false;
        } else {
          window.sessionStorage.setItem(
            PAYMENT_STATUS_FETCHED_STORAGE_KEY,
            JSON.stringify([debugKey, ...fetched].slice(0, 60)),
          );
        }
      } catch {
        // ignore session storage errors for debug dedupe
      }

      const fallbackResult = resolvePaymentResultKind(providerRedirectStatus || "pending");

      const resolveStatus = async () => {
        if (!shouldFetchStatus) {
          if (isMounted) {
            setPaymentResult(fallbackResult);
            setIsPaymentResultResolving(false);
          }
          return;
        }

        try {
          const response = await fetch(`/api/payments/epoint/status/${encodeURIComponent(providerOrderId)}`, {
            method: "GET",
            cache: "no-store",
          });

          const payload = (await response.json().catch(() => null)) as
            | {
                payment?: {
                  status?: string;
                  message?: string;
                  transaction?: string;
                };
              }
            | null;

          if (!isMounted) return;

          if (response.ok) {
            const providerStatus = typeof payload?.payment?.status === "string" ? payload.payment.status : providerRedirectStatus || "pending";
            const providerTransaction = typeof payload?.payment?.transaction === "string" ? payload.payment.transaction : paymentId;
            setPaymentStatusText(providerStatus);
            setPaymentTransactionId(providerTransaction || "");
            setPaymentResult(resolvePaymentResultKind(providerStatus));
          } else {
            setPaymentStatusText(providerRedirectStatus || "pending");
            setPaymentResult(fallbackResult);
          }
        } catch {
          if (!isMounted) return;
          setPaymentStatusText(providerRedirectStatus || "pending");
          setPaymentResult(fallbackResult);
        } finally {
          if (isMounted) {
            setIsPaymentResultResolving(false);
          }
        }
      };

      void resolveStatus();

      return () => {
        isMounted = false;
      };
    }

    const nextResult = resolvePaymentResultKind(status || "pending");
    const timer = window.setTimeout(() => {
      setPaymentResult(nextResult);
      setIsPaymentResultResolving(false);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (!nextSession) setCartRows([]);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user) return;

    let isMounted = true;
    const loadCart = async () => {
      setIsCartLoading(true);
      const { data } = await supabase
        .from("cart_items")
        .select("id,user_id,perfume_slug,size_ml,quantity,unit_price,created_at,updated_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      setCartRows((data as CartItemRow[] | null) ?? []);
      setIsCartLoading(false);
    };

    void loadCart();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user]);

  useEffect(() => {
    if (!supabase || !session?.user) return;

    let isMounted = true;
    const loadAddresses = async () => {
      const { data, error } = await supabase
        .from(ADDRESS_TABLE)
        .select("id,full_name,phone,line1,line2,city,postal_code,country")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as Address[];
              if (Array.isArray(parsed)) {
                setAddresses(parsed);
                if (parsed[0]?.id) {
                  setSelectedShippingId(parsed[0].id);
                }
              }
            } catch {
              // ignore malformed local fallback data
            }
          }
        }
        return;
      }

      const mapped = ((data as any[] | null) ?? []).map((row) => ({
        id: row.id,
        fullName: row.full_name ?? "",
        phone: row.phone ?? "",
        line1: row.line1 ?? "",
        line2: row.line2 ?? "",
        city: row.city ?? "",
        postalCode: row.postal_code ?? "",
        country: row.country ?? "Azerbaijan",
      })) as Address[];

      setAddresses(mapped);
      if (mapped[0]?.id) {
        setSelectedShippingId(mapped[0].id);
      } else {
        setSelectedShippingId("");
      }
    };

    void loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user]);

  const perfumesBySlug = useMemo(() => new Map(perfumes.map((item) => [item.slug, item])), [perfumes]);

  const items = useMemo(
    () =>
      cartRows.map((row) => {
        const perfume = perfumesBySlug.get(row.perfume_slug) ?? null;
        const catalogPrice = perfume?.sizes?.find((size: any) => size.ml === row.size_ml)?.price ?? 0;
        const unitPrice = parsePrice(row.unit_price) || catalogPrice;
        const quantity = Number.isFinite(row.quantity) ? row.quantity : 1;

        return {
          row,
          perfume,
          quantity,
          lineTotal: Math.round(unitPrice * quantity * 100) / 100,
        };
      }),
    [cartRows, perfumesBySlug],
  );

  const payloadItems = useMemo<OrderPayloadItem[]>(
    () =>
      items.map((item) => {
        const catalogPrice = item.perfume?.sizes?.find((size: any) => size.ml === item.row.size_ml)?.price ?? 0;
        const unitPrice = catalogPrice || parsePrice(item.row.unit_price);
        return {
          perfume_slug: item.row.perfume_slug,
          perfume_name: item.perfume?.name || item.row.perfume_slug,
          size_ml: item.row.size_ml,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: Math.round(unitPrice * item.quantity * 100) / 100,
        };
      }),
    [items],
  );

  const subtotal = useMemo(() => Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100, [items]);
  const selectedShipping = addresses.find((item) => item.id === selectedShippingId) ?? null;
  const isStorePickup = checkoutMode === "store_pickup";
  const selectedPaymentMethodLabel =
    checkoutMode === "cash_delivery"
      ? copy.paymentMethodCashDelivery
      : checkoutMode === "card_delivery"
        ? copy.paymentMethodCardDelivery
        : copy.paymentMethodStorePickup;
  const shippingPrice = isStorePickup
    ? 0
    : Number.isFinite(deliveryEstimate?.fee)
      ? Number(deliveryEstimate?.fee)
      : deliveryMethod === "express"
        ? 5
        : 0;
  const total = Math.round((subtotal + shippingPrice) * 100) / 100;

  const paymentOrderId =
    searchParams.get("epoint_order_id") ||
    searchParams.get("order_id") ||
    searchParams.get("ID") ||
    searchParams.get("ORDERID") ||
    searchParams.get("OrderID") ||
    "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!paymentOrderId) {
      if (cashOrderState !== "success") {
        setCanonicalOrderNumber("");
      }
      return;
    }

    try {
      const raw = window.localStorage.getItem(ORDER_NUMBER_BY_PAYMENT_STORAGE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      const known = map[paymentOrderId];
      if (typeof known === "string" && known.trim()) {
        setCanonicalOrderNumber(known.trim());
      }
    } catch {
      // ignore malformed storage payload
    }
  }, [cashOrderState, paymentOrderId]);

  const isPickupContactValid = useMemo(
    () => Object.keys(validatePickupContact(pickupContact, copy)).length === 0,
    [copy, pickupContact],
  );

  const canStepForward = useMemo(() => {
    if (step === 0) {
      return isStorePickup ? isPickupContactValid : Boolean(selectedShipping);
    }
    return true;
  }, [isPickupContactValid, isStorePickup, selectedShipping, step]);

  useEffect(() => {
    if (isStorePickup || !selectedShipping) {
      setDeliveryEstimate(null);
      return;
    }

    let isMounted = true;
    setIsDeliveryEstimating(true);

    const estimate = async () => {
      try {
        const response = await fetch("/api/geo/azerpost-estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            city: selectedShipping.city,
            country: selectedShipping.country,
            deliveryMethod,
            subtotal,
            locale,
          }),
        });

        if (!response.ok) {
          if (isMounted) setDeliveryEstimate(null);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          estimate?: DeliveryEstimate;
        };

        if (isMounted) {
          setDeliveryEstimate(payload.estimate ?? null);
        }
      } catch {
        if (isMounted) setDeliveryEstimate(null);
      } finally {
        if (isMounted) setIsDeliveryEstimating(false);
      }
    };

    void estimate();

    return () => {
      isMounted = false;
    };
  }, [deliveryMethod, isStorePickup, selectedShipping, subtotal, locale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabase || paymentResult !== "success" || !paymentOrderId) return;

    const userId = session?.user?.id;
    if (!userId) return;

    const orderKey = `${paymentOrderId}:${userId}`;
    const parseStored = (key: string) => {
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const markStored = (key: string, maxSize: number) => {
      const existing = parseStored(key);
      if (existing.includes(orderKey)) return;
      window.localStorage.setItem(key, JSON.stringify([orderKey, ...existing].slice(0, maxSize)));
    };

    const persistOrderNumber = (orderNumber: string) => {
      const normalized = orderNumber.trim();
      if (!normalized) return;

      setCanonicalOrderNumber(normalized);
      try {
        const raw = window.localStorage.getItem(ORDER_NUMBER_BY_PAYMENT_STORAGE_KEY);
        const current = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        current[paymentOrderId] = normalized;
        window.localStorage.setItem(ORDER_NUMBER_BY_PAYMENT_STORAGE_KEY, JSON.stringify(current));
      } catch {
        // ignore storage failures
      }
    };

    if (parseStored(CART_CLEARED_STORAGE_KEY).includes(orderKey)) return;

    const createOrderIfNeeded = async () => {
      if (parseStored(ORDER_SAVED_STORAGE_KEY).includes(orderKey)) {
        return true;
      }
      if (!session?.access_token) return false;
      if (!payloadItems.length) return false;

      const response = await fetch("/api/profile/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          payment_order_id: paymentOrderId,
          payment_method: "epoint",
          payment_transaction_id: paymentTransactionId || null,
          payment_status: "completed",
          total_amount: total,
          selected_address_id: selectedShipping?.id || null,
          items: payloadItems,
          fulfillment_method: "delivery",
          delivery_estimate: deliveryEstimate
            ? {
                carrier: deliveryEstimate.carrier,
                etaLabel: deliveryEstimate.etaLabel,
                fee: shippingPrice,
                zone: deliveryEstimate.zone,
                city: deliveryEstimate.city,
                deliveryMethod,
              }
            : null,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        order?: { order_number?: string };
      };

      const orderNumber = payload.order?.order_number;
      if (typeof orderNumber === "string" && orderNumber.trim()) {
        persistOrderNumber(orderNumber);
      }

      markStored(ORDER_SAVED_STORAGE_KEY, 120);
      return true;
    };

    const clearCart = async () => {
      const orderSaved = await createOrderIfNeeded();
      if (!orderSaved) return;

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (!error) {
        setCartRows([]);
        markStored(CART_CLEARED_STORAGE_KEY, 120);
      }
    };

    void clearCart();
  }, [payloadItems, paymentOrderId, paymentResult, paymentTransactionId, selectedShipping?.id, session?.access_token, session?.user?.id, supabase, total]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canonicalOrderNumber) return;

    const isCardSuccess = paymentResult === "success" && Boolean(paymentOrderId);
    const isCashSuccess = cashOrderState === "success";

    if (!isCardSuccess && !isCashSuccess) return;

    const email = session?.user?.email?.trim();
    if (!email) return;

    const orderKey = `${canonicalOrderNumber}:${email.toLowerCase()}`;

    const parseSent = () => {
      try {
        const raw = window.localStorage.getItem(EMAIL_SENT_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const markSent = () => {
      const sent = parseSent();
      if (sent.includes(orderKey)) return;
      window.localStorage.setItem(EMAIL_SENT_STORAGE_KEY, JSON.stringify([orderKey, ...sent].slice(0, 80)));
    };

    if (parseSent().includes(orderKey)) return;
    markSent();

    const send = async () => {
      try {
        await fetch("/api/checkout/confirmation-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            email,
            orderId: canonicalOrderNumber,
            status: isCardSuccess ? paymentStatusText || "" : copy.cashStatusReserved,
            paymentMethod: isCardSuccess ? "epoint" : selectedPaymentMethodLabel,
            total,
            shippingPrice,
            subtotal,
            items: items.map((item) => ({
              name: item.perfume?.name || item.row.perfume_slug,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
            shippingAddress: isCardSuccess && selectedShipping
              ? {
                  fullName: selectedShipping.fullName,
                  line1: selectedShipping.line1,
                  line2: selectedShipping.line2,
                  city: selectedShipping.city,
                  postalCode: selectedShipping.postalCode,
                  country: selectedShipping.country,
                }
              : null,
            pickupLocation: isCashSuccess && isStorePickup
              ? {
                  name: settings.pickupLocationName,
                  address: settings.pickupAddress,
                  phone: settings.pickupPhone,
                }
              : null,
          }),
        });
      } catch {
        // ignore temporary email delivery errors in client flow
      }
    };

    void send();
  }, [
    canonicalOrderNumber,
    cashOrderState,
    copy.cashStatusReserved,
    items,
    locale,
    paymentOrderId,
    paymentResult,
    paymentStatusText,
    selectedShipping,
    selectedPaymentMethodLabel,
    session?.user?.email,
    settings.pickupAddress,
    settings.pickupLocationName,
    settings.pickupPhone,
    shippingPrice,
    subtotal,
    isStorePickup,
    total,
  ]);

  const addAddress = async () => {
    if (isSavingAddress) return;

    setIsSavingAddress(true);
    setHasTriedSaveAddress(true);
    const nextErrors = validateDraftAddress(draftAddress, copy);
    setDraftErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setIsSavingAddress(false);
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 520));

    const normalized = normalizeAddressInput(draftAddress);

    let nextAddress: Address = {
      ...normalized,
      id: crypto.randomUUID(),
    };

    if (supabase && session?.user) {
      const { data, error } = await supabase
        .from(ADDRESS_TABLE)
        .insert({
          user_id: session.user.id,
          full_name: normalized.fullName,
          phone: normalized.phone,
          line1: normalized.line1,
          line2: normalized.line2,
          city: normalized.city,
          postal_code: normalized.postalCode,
          country: normalized.country,
        })
        .select("id,full_name,phone,line1,line2,city,postal_code,country")
        .single();

      if (!error && data) {
        nextAddress = {
          id: data.id,
          fullName: data.full_name ?? normalized.fullName,
          phone: data.phone ?? normalized.phone,
          line1: data.line1 ?? normalized.line1,
          line2: data.line2 ?? normalized.line2,
          city: data.city ?? normalized.city,
          postalCode: data.postal_code ?? normalized.postalCode,
          country: data.country ?? normalized.country,
        };
      }
    }

    setAddresses((prev) => [nextAddress, ...prev.filter((item) => item.id !== nextAddress.id)]);
    setSelectedShippingId(nextAddress.id);
    setDraftAddress(emptyAddress());
    setDraftErrors({});
    setHasTriedSaveAddress(false);
    setRecentlyAddedAddressId(nextAddress.id);
    window.setTimeout(() => setRecentlyAddedAddressId(""), 900);
    setIsAddAddressOpen(false);
    setIsSavingAddress(false);
  };

  const canSaveAddress = useMemo(
    () => Object.keys(validateDraftAddress(draftAddress, copy)).length === 0,
    [copy, draftAddress],
  );

  const removeAddress = async (id: string) => {
    if (supabase && session?.user) {
      await supabase
        .from(ADDRESS_TABLE)
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);
    }

    setAddresses((prev) => prev.filter((item) => item.id !== id));
    if (selectedShippingId === id) setSelectedShippingId("");
  };

  const paymentHref = useMemo(() => {
    const query = new URLSearchParams({
      locale,
      perfumeSlug: items[0]?.row.perfume_slug ?? "checkout",
      perfumeName: `Checkout order (${items.length} items)`,
      amount: String(total),
      returnPath: toLocalePath("/checkout", locale),
    });

    return `/api/payments/epoint?${query.toString()}`;
  }, [items, locale, total]);

  const goNext = () => setStep((prev) => Math.min(2, prev + 1));
  const goBack = () => setStep((prev) => Math.max(0, prev - 1));

  const submitOfflineOrder = async () => {
    if (cashOrderState === "submitting") return;
    if (!session?.access_token) {
      setCashOrderError(copy.cashOrderError);
      return;
    }

    let normalizedPickupContact: PickupContact | null = null;
    if (isStorePickup) {
      const nextErrors = validatePickupContact(pickupContact, copy);
      setPickupErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        setCashOrderError(copy.invalidPickupContact);
        return;
      }
      normalizedPickupContact = normalizePickupContact(pickupContact);
    } else if (!selectedShipping) {
      setCashOrderError(copy.invalidForm);
      return;
    }

    if (!payloadItems.length) {
      setCashOrderError(copy.cashOrderError);
      return;
    }

    setCashOrderState("submitting");
    setCashOrderError("");

    try {
      const paymentMethod =
        checkoutMode === "cash_delivery"
          ? CASH_DELIVERY_PAYMENT_METHOD
          : checkoutMode === "card_delivery"
            ? CARD_DELIVERY_PAYMENT_METHOD
            : STORE_PICKUP_PAYMENT_METHOD;
      const response = await fetch("/api/profile/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          payment_status: "pending",
          total_amount: total,
          items: payloadItems,
          selected_address_id: isStorePickup ? null : selectedShipping?.id || null,
          fulfillment_method: isStorePickup ? "pickup" : "delivery",
          delivery_estimate: !isStorePickup && deliveryEstimate
            ? {
                carrier: deliveryEstimate.carrier,
                etaLabel: deliveryEstimate.etaLabel,
                fee: shippingPrice,
                zone: deliveryEstimate.zone,
                city: deliveryEstimate.city,
                deliveryMethod,
              }
            : null,
          pickup_contact: normalizedPickupContact
            ? {
                full_name: normalizedPickupContact.fullName,
                phone: normalizedPickupContact.phone,
                note: normalizedPickupContact.note || null,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        setCashOrderState("idle");
        setCashOrderError(copy.cashOrderError);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        order?: { order_number?: string };
      };

      const orderNumber = payload.order?.order_number?.trim();
      if (!orderNumber) {
        setCashOrderState("idle");
        setCashOrderError(copy.cashOrderError);
        return;
      }

      setCanonicalOrderNumber(orderNumber);

      if (supabase && session.user?.id) {
        const { error } = await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", session.user.id);

        if (!error) {
          setCartRows([]);
        }
      } else {
        setCartRows([]);
      }

      setCashOrderState("success");
      setStep(2);
    } catch {
      setCashOrderState("idle");
      setCashOrderError(copy.cashOrderError);
    }
  };

  const handleNext = () => {
    if (step === 0 && isStorePickup) {
      const nextErrors = validatePickupContact(pickupContact, copy);
      setPickupErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        setCashOrderError(copy.invalidPickupContact);
        return;
      }
      setCashOrderError("");
    }

    if (step < 2) {
      if (step === 1) {
        reviewStepEnteredAtRef.current = Date.now();
      }
      goNext();
      return;
    }

    if (Date.now() - reviewStepEnteredAtRef.current < 700) {
      return;
    }

    void submitOfflineOrder();
  };

  if (isSessionLoading || isCartLoading) {
    return <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 text-zinc-500">{copy.loading}</div>;
  }

  if (!session) {
    return (
      <div className="rounded-[2rem] border border-zinc-200 bg-white/85 p-7">
        <h2 className="text-2xl text-zinc-900">{copy.signInTitle}</h2>
        <p className="mt-2 text-zinc-600">{copy.signInBody}</p>
        <Link href={`${toLocalePath("/login", locale)}?next=${encodeURIComponent(toLocalePath("/checkout", locale))}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white">
          {copy.signInAction}
        </Link>
      </div>
    );
  }

  const isCashOrderSuccess = cashOrderState === "success";
  const isPaymentFeedbackVisible = isPaymentResultResolving || Boolean(paymentResult) || isCashOrderSuccess;
  const feedbackTitle = isCashOrderSuccess
    ? copy.cashSuccessTitle
    : isPaymentResultResolving
      ? copy.processingTitle
      : paymentResult === "success"
        ? copy.successTitle
        : paymentResult === "declined"
          ? copy.declinedTitle
          : copy.pendingTitle;
  const feedbackBody = isCashOrderSuccess
    ? copy.cashSuccessBody
    : isPaymentResultResolving
      ? copy.processingBody
      : paymentResult === "success"
        ? copy.successBody
        : paymentResult === "declined"
          ? copy.declinedBody
          : copy.pendingBody;
  const friendlyPaymentStatus = isCashOrderSuccess
    ? copy.cashStatusReserved
    : isPaymentResultResolving
      ? copy.paymentStatusPending
      : resolveFriendlyPaymentStatus(paymentResult, copy);

  if (items.length === 0 && !isPaymentFeedbackVisible) {
    return (
      <div className="rounded-[2rem] border border-zinc-200 bg-white/85 p-7 text-zinc-700">
        {copy.emptyCart}
      </div>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {isPaymentFeedbackVisible ? (
        <div className="xl:col-span-2 rounded-[1.9rem] border border-zinc-200/85 bg-[radial-gradient(circle_at_10%_5%,#ffffff_0%,#f7f7f5_48%,#efefec_100%)] p-5 shadow-[0_20px_48px_rgba(20,20,20,0.08)] md:p-8" style={{ animation: "fadeUp 420ms cubic-bezier(0.22,1,0.36,1) both" }}>
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-stretch">
            <div className="rounded-[1.5rem] border border-white/75 bg-white/80 p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className={[
                  "mt-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                  isCashOrderSuccess
                    ? "bg-amber-100 text-amber-700"
                    : isPaymentResultResolving
                      ? "bg-zinc-900 text-white"
                      : paymentResult === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : paymentResult === "declined"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700",
                ].join(" ")}>
                  {isCashOrderSuccess ? (
                    <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M4 10.5l4 4L16 6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : isPaymentResultResolving ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                  ) : paymentResult === "success" ? (
                    <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M4 10.5l4 4L16 6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : paymentResult === "declined" ? (
                    <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" /></svg>
                  ) : (
                    <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4.2l2.8 1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </div>

                <div>
                  <h3 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-zinc-900 md:text-[1.7rem]">{feedbackTitle}</h3>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">{feedbackBody}</p>
                  {canonicalOrderNumber ? (
                    <div className="mt-4 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700">
                      #{canonicalOrderNumber}
                    </div>
                  ) : null}
                </div>
              </div>

              {!isPaymentResultResolving ? (
                <div className="mt-6 flex flex-wrap gap-3" style={{ animation: "fadeUp 320ms cubic-bezier(0.22,1,0.36,1) both" }}>
                  {paymentResult === "declined" ? (
                    <a href={paymentHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-zinc-800">
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M16.1 9.3a6.2 6.2 0 10.9 3.2" strokeLinecap="round" /><path d="M16.2 4.6v4.2H12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {copy.retryPayment}
                    </a>
                  ) : null}
                  <Link href={toLocalePath("/account", locale)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-zinc-800">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 5.5h14M3 10h14M3 14.5h8" strokeLinecap="round" /></svg>
                    {copy.viewOrders}
                  </Link>
                  <Link href={toLocalePath("/", locale)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:bg-zinc-100">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3.2 9.2L10 3.8l6.8 5.4v7.2H3.2z" /><path d="M7.4 16.4v-3.8h5.2v3.8" /></svg>
                    {copy.goHome}
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-[1.5rem] border border-zinc-200/80 bg-white/88 p-5 md:p-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.09em] text-zinc-500 uppercase">{copy.paymentStatusLabel}</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.015em] text-zinc-900">{friendlyPaymentStatus}</p>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-200/80">
                  <div
                    className={[
                      "h-full rounded-full transition-all duration-700",
                      isCashOrderSuccess
                        ? "w-full bg-amber-500"
                        : isPaymentResultResolving
                          ? "w-2/3 bg-zinc-800"
                          : paymentResult === "success"
                            ? "w-full bg-emerald-500"
                            : paymentResult === "declined"
                              ? "w-full bg-rose-500"
                              : "w-5/6 bg-amber-500",
                    ].join(" ")}
                  />
                </div>
              </div>

              {isCashOrderSuccess ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                  <p className="text-xs font-semibold tracking-[0.09em] text-amber-700 uppercase">{copy.pickupLocationTitle}</p>
                  <p className="mt-2 text-sm font-medium text-zinc-900">{settings.pickupLocationName}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-700">{settings.pickupAddress}</p>
                  <p className="mt-1 text-sm text-zinc-700">{settings.pickupPhone}</p>
                  <p className="mt-3 text-sm text-amber-800">{copy.pickupPaymentHint}</p>
                  <a href={settings.pickupMapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-amber-100">
                    {copy.openMap}
                  </a>
                </div>
              ) : null}

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/85 p-4">
                <p className="text-xs font-semibold tracking-[0.09em] text-zinc-500 uppercase">{copy.orderSummaryTitle}</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {items.map((item) => (
                    <div key={item.row.id} className="flex items-start justify-between gap-3 text-zinc-700">
                      <span className="max-w-[70%] truncate">{item.perfume?.name || item.row.perfume_slug} x{item.quantity}</span>
                      <span>{formatCurrencyFromAzn(item.lineTotal, selectedCurrency, locale)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-1.5 border-t border-zinc-200 pt-3 text-sm">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>{copy.subtotal}</span>
                    <span>{formatCurrencyFromAzn(subtotal, selectedCurrency, locale)}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>{copy.shipping}</span>
                    <span>{formatCurrencyFromAzn(shippingPrice, selectedCurrency, locale)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold text-zinc-900">
                    <span>{copy.total}</span>
                    <span>{formatCurrencyFromAzn(total, selectedCurrency, locale)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!isPaymentFeedbackVisible ? (
        <>
          <div className="space-y-5 rounded-[1.8rem] border border-zinc-200/85 bg-[linear-gradient(165deg,#ffffff_0%,#fbfbfa_58%,#f3f3f1_100%)] p-4 shadow-[0_18px_40px_rgba(24,24,24,0.06)] md:p-6">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {copy.steps.map((item, index) => {
                const isDone = index < step;
                const isCurrent = index === step;

                return (
                  <div
                    key={item}
                    className={[
                      "rounded-full border px-3 py-2 text-center text-sm font-medium transition",
                      isCurrent
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : isDone
                          ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                          : "border-zinc-200 bg-white/70 text-zinc-400",
                    ].join(" ")}
                  >
                    {item}
                  </div>
                );
              })}
            </div>

            <div key={`checkout-step-${step}`} style={{ animation: "fadeUp 360ms cubic-bezier(0.22,1,0.36,1) both" }}>
              {step === 0 ? (
                isStorePickup ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.45rem] border border-amber-200 bg-[linear-gradient(145deg,#fffaf1_0%,#fff2de_100%)] p-5">
                      <p className="inline-flex rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-amber-700 uppercase">{copy.cashPickupPill}</p>
                      <h3 className="mt-4 text-lg font-semibold tracking-[-0.015em] text-zinc-900">{copy.pickupContactTitle}</h3>
                      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-600">{copy.pickupContactBody}</p>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm text-zinc-600">
                          <span>{copy.fullName}</span>
                          <input
                            value={pickupContact.fullName}
                            onChange={(event) => {
                              setPickupContact((prev) => ({ ...prev, fullName: event.target.value }));
                              setPickupErrors((prev) => ({ ...prev, fullName: undefined }));
                            }}
                            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                          />
                          {pickupErrors.fullName ? <span className="text-xs text-red-600">{pickupErrors.fullName}</span> : null}
                        </label>
                        <label className="space-y-1 text-sm text-zinc-600">
                          <span>{copy.phone}</span>
                          <input
                            value={pickupContact.phone}
                            onChange={(event) => {
                              setPickupContact((prev) => ({ ...prev, phone: event.target.value }));
                              setPickupErrors((prev) => ({ ...prev, phone: undefined }));
                            }}
                            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                          />
                          {pickupErrors.phone ? <span className="text-xs text-red-600">{pickupErrors.phone}</span> : null}
                        </label>
                        <label className="space-y-1 text-sm text-zinc-600 md:col-span-2">
                          <span>{copy.pickupNote}</span>
                          <textarea
                            value={pickupContact.note}
                            onChange={(event) => setPickupContact((prev) => ({ ...prev, note: event.target.value }))}
                            rows={4}
                            placeholder={copy.pickupNotePlaceholder}
                            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">{copy.deliveryContactTitle}</h3>

                    <div className="space-y-2">
                      {addresses.map((address) => {
                        const isSelected = selectedShippingId === address.id;
                        const isRecentlyAdded = recentlyAddedAddressId === address.id;

                        return (
                          <div
                            key={address.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedShippingId(address.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                setSelectedShippingId(address.id);
                              }
                            }}
                            className={[
                              "cursor-pointer rounded-2xl border p-3 transition",
                              isSelected
                                ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_12px_24px_rgba(24,24,24,0.2)]"
                                : "border-zinc-200 bg-white/90 text-zinc-700 hover:border-zinc-300",
                              isRecentlyAdded ? "ring-2 ring-emerald-300/80 ring-offset-2 ring-offset-white" : "",
                            ].join(" ")}
                            style={isRecentlyAdded ? { animation: "fadeUp 520ms cubic-bezier(0.22,1,0.36,1) both" } : undefined}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-sm leading-relaxed">
                                <p className={isSelected ? "font-semibold text-white" : "font-semibold text-zinc-900"}>{address.fullName}</p>
                                <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                                <p>{address.city} {address.postalCode}</p>
                                <p>{address.phone}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void removeAddress(address.id);
                                }}
                                className={[
                                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                                  isSelected
                                    ? "border-white/40 bg-white/15 text-white hover:bg-white/25"
                                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100",
                                ].join(" ")}
                              >
                                {copy.remove}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {addresses.length === 0 ? (
                        <p className="rounded-xl border border-zinc-200 bg-white/85 px-3 py-2 text-sm text-zinc-500">{copy.noAddressYet}</p>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white/92 p-4">
                      <button
                        type="button"
                        onClick={() => setIsAddAddressOpen((prev) => !prev)}
                        className="inline-flex min-h-10 items-center rounded-full border border-zinc-300 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                      >
                        {copy.addAddress}
                      </button>

                      {isAddAddressOpen ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <label className="space-y-1 text-sm text-zinc-600"><span>{copy.fullName}</span><input value={draftAddress.fullName} onChange={(event) => { setDraftAddress((prev) => ({ ...prev, fullName: event.target.value })); setDraftErrors((prev) => ({ ...prev, fullName: undefined })); }} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm" />{draftErrors.fullName ? <span className="text-xs text-red-600">{draftErrors.fullName}</span> : null}</label>
                          <label className="space-y-1 text-sm text-zinc-600"><span>{copy.phone}</span><input value={draftAddress.phone} onChange={(event) => { setDraftAddress((prev) => ({ ...prev, phone: event.target.value })); setDraftErrors((prev) => ({ ...prev, phone: undefined })); }} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm" />{draftErrors.phone ? <span className="text-xs text-red-600">{draftErrors.phone}</span> : null}</label>
                          <label className="space-y-1 text-sm text-zinc-600"><span>{copy.line1}</span><input value={draftAddress.line1} onChange={(event) => { setDraftAddress((prev) => ({ ...prev, line1: event.target.value })); setDraftErrors((prev) => ({ ...prev, line1: undefined })); }} placeholder={copy.line1} autoComplete="street-address" className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm" />{draftErrors.line1 ? <span className="text-xs text-red-600">{draftErrors.line1}</span> : null}</label>
                          <label className="space-y-1 text-sm text-zinc-600"><span>{copy.line2}</span><input value={draftAddress.line2} onChange={(event) => setDraftAddress((prev) => ({ ...prev, line2: event.target.value }))} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm" /></label>
                          <label className="space-y-1 text-sm text-zinc-600"><span>{copy.city}</span><select value={draftAddress.city} onChange={(event) => { setDraftAddress((prev) => ({ ...prev, city: event.target.value })); setDraftErrors((prev) => ({ ...prev, city: undefined })); }} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"><option value="">{copy.city}</option>{AZERBAIJAN_CITIES.map((cityName) => (<option key={cityName} value={cityName}>{cityName}</option>))}</select>{draftErrors.city ? <span className="text-xs text-red-600">{draftErrors.city}</span> : null}</label>
                          <label className="space-y-1 text-sm text-zinc-600"><span>{copy.postalCode}</span><input value={draftAddress.postalCode} onChange={(event) => { setDraftAddress((prev) => ({ ...prev, postalCode: event.target.value })); setDraftErrors((prev) => ({ ...prev, postalCode: undefined })); }} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm" />{draftErrors.postalCode ? <span className="text-xs text-red-600">{draftErrors.postalCode}</span> : null}</label>
                          <label className="space-y-1 text-sm text-zinc-600 md:col-span-2"><span>{copy.country}</span><input value={draftAddress.country} onChange={(event) => { setDraftAddress((prev) => ({ ...prev, country: event.target.value })); setDraftErrors((prev) => ({ ...prev, country: undefined })); }} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm" />{draftErrors.country ? <span className="text-xs text-red-600">{draftErrors.country}</span> : null}</label>

                          <div className="md:col-span-2">
                            {hasTriedSaveAddress && !canSaveAddress ? <p className="mb-2 text-xs text-red-600">{copy.invalidForm}</p> : null}
                            <button type="button" onClick={() => { void addAddress(); }} disabled={!canSaveAddress || isSavingAddress} className="inline-flex min-h-10 items-center rounded-full border border-zinc-900 bg-zinc-900 px-5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-45">
                              {isSavingAddress ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                                  {copy.saveAddressLoading}
                                </span>
                              ) : (
                                copy.saveAddress
                              )}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">{copy.paymentOptionsTitle}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-600">{copy.paymentOptionsBody}</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutMode("cash_delivery")}
                      className={[
                        "rounded-[1.35rem] border p-4 text-left transition",
                        checkoutMode === "cash_delivery"
                          ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_18px_28px_rgba(24,24,24,0.18)]"
                          : "border-zinc-200 bg-white/90 text-zinc-800 hover:border-zinc-300",
                      ].join(" ")}
                    >
                      <p className="text-sm font-semibold">{copy.cashDeliveryTitle}</p>
                      <p className={checkoutMode === "cash_delivery" ? "mt-2 text-sm leading-6 text-white/80" : "mt-2 text-sm leading-6 text-zinc-600"}>{copy.cashDeliveryBody}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCheckoutMode("card_delivery")}
                      className={[
                        "rounded-[1.35rem] border p-4 text-left transition",
                        checkoutMode === "card_delivery"
                          ? "border-blue-300 bg-[linear-gradient(150deg,#eff6ff_0%,#dbeafe_100%)] text-zinc-900 shadow-[0_18px_28px_rgba(37,99,235,0.12)]"
                          : "border-zinc-200 bg-white/90 text-zinc-800 hover:border-zinc-300",
                      ].join(" ")}
                    >
                      <p className="text-sm font-semibold">{copy.cardDeliveryTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.cardDeliveryBody}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCheckoutMode("store_pickup")}
                      className={[
                        "rounded-[1.35rem] border p-4 text-left transition md:col-span-2",
                        checkoutMode === "store_pickup"
                          ? "border-amber-300 bg-[linear-gradient(150deg,#fff8ed_0%,#ffefcf_100%)] text-zinc-900 shadow-[0_18px_28px_rgba(165,118,36,0.12)]"
                          : "border-zinc-200 bg-white/90 text-zinc-800 hover:border-zinc-300",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{copy.storePickupTitle}</p>
                        <span className="rounded-full border border-amber-300 bg-white/85 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-amber-700 uppercase">{copy.storePickupPill}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.storePickupBody}</p>
                    </button>
                  </div>

                  {!isStorePickup ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold tracking-[-0.01em] text-zinc-900">{copy.delivery}</h4>
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white/88 p-3 transition hover:border-zinc-300">
                        <input type="radio" checked={deliveryMethod === "standard"} onChange={() => setDeliveryMethod("standard")} />
                        <span>{copy.standard}</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white/88 p-3 transition hover:border-zinc-300">
                        <input type="radio" checked={deliveryMethod === "express"} onChange={() => setDeliveryMethod("express")} />
                        <span>{copy.express} ({formatCurrencyFromAzn(5, selectedCurrency, locale)})</span>
                      </label>

                      <div className="rounded-2xl border border-zinc-200 bg-white/88 p-3 text-sm text-zinc-700">
                        <p className="text-xs font-semibold tracking-[0.09em] text-zinc-500 uppercase">
                          {copy.deliveryEstimateTitle}
                        </p>
                        {isDeliveryEstimating ? (
                          <p className="mt-2 text-zinc-500">{copy.deliveryEstimateLoading}</p>
                        ) : deliveryEstimate ? (
                          <div className="mt-2 space-y-1.5">
                            <p>
                              <span className="text-zinc-500">{copy.deliveryEstimateCarrier}: </span>
                              <span className="font-medium text-zinc-900">{deliveryEstimate.carrier}</span>
                            </p>
                            <p>
                              <span className="text-zinc-500">{copy.shipping}: </span>
                              <span className="font-medium text-zinc-900">{formatCurrencyFromAzn(shippingPrice, selectedCurrency, locale)}</span>
                            </p>
                            <p>
                              <span className="text-zinc-500">{copy.deliveryEstimateEta}: </span>
                              <span className="font-medium text-zinc-900">{deliveryEstimate.etaLabel}</span>
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-zinc-500">-</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.4rem] border border-amber-200 bg-[linear-gradient(150deg,#fffaf1_0%,#fff1d8_100%)] p-4">
                      <p className="text-xs font-semibold tracking-[0.11em] text-amber-700 uppercase">{copy.pickupSummaryTitle}</p>
                      <h4 className="mt-2 text-base font-semibold tracking-[-0.01em] text-zinc-900">{settings.pickupLocationName}</h4>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/70 bg-white/70 p-3">
                          <p className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.pickupAddressLabel}</p>
                          <p className="mt-2 text-sm leading-6 text-zinc-700">{settings.pickupAddress}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/70 p-3">
                          <p className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.pickupPhoneLabel}</p>
                          <p className="mt-2 text-sm leading-6 text-zinc-700">{settings.pickupPhone}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-amber-900">{copy.pickupPaymentHint}</p>
                      <a href={settings.pickupMapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-amber-100">
                        {copy.openMap}
                      </a>
                    </div>
                  )}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold tracking-[-0.015em] text-zinc-900">{copy.review}</h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200 bg-white/85 p-3 text-sm text-zinc-700">
                      <p className="font-medium text-zinc-900">{copy.paymentMethodLabel}</p>
                      <p className="mt-1">{selectedPaymentMethodLabel}</p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white/85 p-3 text-sm text-zinc-700">
                      <p className="font-medium text-zinc-900">{copy.pickupOrderSummaryLabel}</p>
                      <p className="mt-1">{isStorePickup ? copy.storePickupTitle : copy.delivery}</p>
                    </div>
                  </div>

                  {isStorePickup ? (
                    <>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-zinc-700">
                        <p className="font-medium text-zinc-900">{copy.pickupContactTitle}</p>
                        <p>{pickupContact.fullName || "-"}</p>
                        <p>{pickupContact.phone || "-"}</p>
                        {pickupContact.note.trim() ? <p>{pickupContact.note.trim()}</p> : null}
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-zinc-700">
                        <p className="font-medium text-zinc-900">{copy.pickupLocationTitle}</p>
                        <p>{settings.pickupLocationName}</p>
                        <p>{settings.pickupAddress}</p>
                        <p>{settings.pickupPhone}</p>
                        <p className="mt-2 text-amber-900">{copy.pickupPaymentHint}</p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-zinc-200 bg-white/85 p-3 text-sm text-zinc-700">
                      <p className="font-medium text-zinc-900">{copy.shippingAddressLabel}</p>
                      <p>{selectedShipping?.fullName || "-"}</p>
                      <p>{selectedShipping?.line1 || "-"}</p>
                      <p>{selectedShipping?.city || "-"}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {cashOrderError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {cashOrderError}
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || cashOrderState === "submitting"}
                className="inline-flex min-h-10 items-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-45"
              >
                {copy.back}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={cashOrderState === "submitting" || !canStepForward}
                className="inline-flex min-h-10 items-center rounded-full border border-zinc-900 bg-zinc-900 px-5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:opacity-45"
              >
                {cashOrderState === "submitting" ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                    {copy.cashOrderLoading}
                  </span>
                ) : step === 2 ? (
                  copy.cashOrderAction
                ) : copy.next}
              </button>
            </div>
          </div>

          <aside className="h-fit rounded-[1.7rem] border border-zinc-200/85 bg-[linear-gradient(160deg,#ffffff_0%,#f8f8f7_52%,#f1f1ef_100%)] p-5 shadow-[0_20px_44px_rgba(24,24,24,0.08)] xl:sticky xl:top-24">
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.row.id} className="flex items-start justify-between gap-3 text-zinc-700">
                  <span className="max-w-[70%] truncate">{item.perfume?.name || item.row.perfume_slug} x{item.quantity}</span>
                  <span>{formatCurrencyFromAzn(item.lineTotal, selectedCurrency, locale)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-zinc-200 bg-white/70 p-4">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.paymentMethodLabel}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {settings.cardPaymentsEnabled ? (
                  <span className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    checkoutMode === "card_delivery"
                      ? "border-blue-300 bg-blue-100 text-blue-800"
                      : "border-zinc-300 bg-white text-zinc-600",
                  ].join(" ")}>
                    {copy.paymentMethodCardDelivery}
                  </span>
                ) : null}
                <span className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  checkoutMode === "cash_delivery"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-600",
                ].join(" ")}>
                  {copy.paymentMethodCashDelivery}
                </span>
                <span className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  isStorePickup
                    ? "border-amber-300 bg-amber-100 text-amber-800"
                    : "border-zinc-300 bg-white text-zinc-600",
                ].join(" ")}>
                  {copy.paymentMethodStorePickup}
                </span>
              </div>
            </div>

            {isStorePickup ? (
              <div className="mt-4 rounded-[1.3rem] border border-amber-200 bg-[linear-gradient(155deg,#fff9ef_0%,#fff0d4_100%)] p-4">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-amber-700 uppercase">{copy.pickupLocationTitle}</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">{settings.pickupLocationName}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{settings.pickupAddress}</p>
                <p className="mt-1 text-sm text-zinc-700">{settings.pickupPhone}</p>
                <p className="mt-3 text-sm leading-6 text-amber-900">{copy.pickupPaymentHint}</p>
              </div>
            ) : null}

            <div className="mt-4 space-y-1.5 border-t border-zinc-200 pt-3 text-sm">
              <div className="flex items-center justify-between text-zinc-600">
                <span>{copy.subtotal}</span>
                <span>{formatCurrencyFromAzn(subtotal, selectedCurrency, locale)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>{copy.shipping}</span>
                <span>{formatCurrencyFromAzn(shippingPrice, selectedCurrency, locale)}</span>
              </div>
              {!isStorePickup && deliveryEstimate ? (
                <div className="text-xs text-zinc-500">
                  {copy.deliveryEstimateTitle}: {deliveryEstimate.etaLabel}
                </div>
              ) : null}
              <div className="flex items-center justify-between text-base font-semibold text-zinc-900">
                <span>{copy.total}</span>
                <span>{formatCurrencyFromAzn(total, selectedCurrency, locale)}</span>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </section>
  );
}
