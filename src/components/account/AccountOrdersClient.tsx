"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toLocalePath, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type OrderItem = {
  perfume_slug: string;
  perfume_name: string;
  size_ml: number;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  items: OrderItem[];
  tracking_number?: string;
  created_at: string;
  completed_at?: string;
};

type AccountOrdersClientProps = {
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

export function AccountOrdersClient({ locale, supabase: supabaseConfig }: AccountOrdersClientProps) {
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const copy =
    locale === "az"
      ? {
          title: "Keçmiş sifarişlər",
          emptySubtitle: "Hələ sifarişiniz yoxdur.",
          ctaCatalog: "Kataloqa keç",
          ctaCart: "Səbətə keç",
          orderNumber: "Sifariş №",
          date: "Tarix",
          items: "Məhsullar",
          total: "Cəmi",
          status: "Status",
          payment: "Ödəniş",
          progress: "Sifariş irəliləyişi",
          tracking: "Təhvil kodu",
          noTracking: "Henüz təhvil kodu yoxdur",
          stepPlaced: "Qəbul edildi",
          stepProcessing: "Hazırlanır",
          stepShipped: "Hazırdır",
          stepDelivered: "Tamamlandı",
          cancelledHint: "Bu sifariş ləğv edilib",
          refundedHint: "Bu sifariş üçün geri ödəniş edilib",
          statusNew: "Yeni",
          statusConfirmed: "Təsdiqləndi",
          statusPreparing: "Hazırlanır",
          statusReadyForPickup: "Təhvilə hazırdır",
          statusHandedOver: "Təhvil verildi",
          statusReadyForDispatch: "Göndərişə hazırdır",
          statusOutForDelivery: "Çatdırılmaya çıxıb",
          statusPending: "Gözləmədə",
          statusProcessing: "İşləyir",
          statusCompleted: "Tamamlandı",
          statusShipped: "Göndərildi",
          statusDelivered: "Çatdırıldı",
          statusCancelled: "Ləğv edildi",
          statusRefunded: "Geri ödəndi",
          paymentPending: "Gözləmədə",
          paymentCompleted: "Ödəndi",
          paymentFailed: "Uğursuz",
          paymentRefunded: "Geri ödəndi",
        }
      : locale === "ru"
        ? {
            title: "История заказов",
            emptySubtitle: "У вас еще нет заказов.",
            ctaCatalog: "Перейти в каталог",
            ctaCart: "Перейти в корзину",
            orderNumber: "Заказ №",
            date: "Дата",
            items: "Товары",
            total: "Итого",
            status: "Статус",
            payment: "Платеж",
            progress: "Прогресс заказа",
            tracking: "Номер отслеживания",
            noTracking: "Номер отслеживания еще недоступен",
            stepPlaced: "Принят",
            stepProcessing: "Готовится",
            stepShipped: "Готов",
            stepDelivered: "Завершен",
            cancelledHint: "Этот заказ отменен",
            refundedHint: "По этому заказу оформлен возврат",
            statusNew: "Новый",
            statusConfirmed: "Подтвержден",
            statusPreparing: "Готовится",
            statusReadyForPickup: "Готов к выдаче",
            statusHandedOver: "Выдан",
            statusReadyForDispatch: "Готов к отправке",
            statusOutForDelivery: "В доставке",
            statusPending: "В ожидании",
            statusProcessing: "Обработка",
            statusCompleted: "Завершено",
            statusShipped: "Отправлено",
            statusDelivered: "Доставлено",
            statusCancelled: "Отменено",
            statusRefunded: "Возвращено",
            paymentPending: "В ожидании",
            paymentCompleted: "Оплачено",
            paymentFailed: "Завершилось с ошибкой",
            paymentRefunded: "Возвращено",
          }
        : {
            title: "Past orders",
            emptySubtitle: "You don't have any orders yet.",
            ctaCatalog: "Open catalog",
            ctaCart: "Open cart",
            orderNumber: "Order №",
            date: "Date",
            items: "Items",
            total: "Total",
            status: "Status",
            payment: "Payment",
            progress: "Order progress",
            tracking: "Tracking",
            noTracking: "Tracking number not available yet",
            stepPlaced: "Placed",
            stepProcessing: "Preparing",
            stepShipped: "Ready",
            stepDelivered: "Completed",
            cancelledHint: "This order was cancelled",
            refundedHint: "This order was refunded",
            statusNew: "New",
            statusConfirmed: "Confirmed",
            statusPreparing: "Preparing",
            statusReadyForPickup: "Ready for pickup",
            statusHandedOver: "Handed over",
            statusReadyForDispatch: "Ready for dispatch",
            statusOutForDelivery: "Out for delivery",
            statusPending: "Pending",
            statusProcessing: "Processing",
            statusCompleted: "Completed",
            statusShipped: "Shipped",
            statusDelivered: "Delivered",
            statusCancelled: "Cancelled",
            statusRefunded: "Refunded",
            paymentPending: "Pending",
            paymentCompleted: "Paid",
            paymentFailed: "Failed",
            paymentRefunded: "Refunded",
          };

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        setError("Supabase is not configured");
        setLoading(false);
        return;
      }

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/profile/orders", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (!response.ok) {
          let errorMessage = "Failed to fetch orders";
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = `Error (${response.status}): ${errorData.error}`;
            }
          } catch {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      new: copy.statusNew,
      confirmed: copy.statusConfirmed,
      preparing: copy.statusPreparing,
      ready_for_pickup: copy.statusReadyForPickup,
      handed_over: copy.statusHandedOver,
      ready_for_dispatch: copy.statusReadyForDispatch,
      out_for_delivery: copy.statusOutForDelivery,
      pending: copy.statusPending,
      processing: copy.statusProcessing,
      completed: copy.statusCompleted,
      shipped: copy.statusShipped,
      delivered: copy.statusDelivered,
      cancelled: copy.statusCancelled,
      refunded: copy.statusRefunded,
    };
    return statusMap[status] || status;
  };

  const getPaymentLabel = (status: string) => {
    const paymentMap: Record<string, string> = {
      pending: copy.paymentPending,
      completed: copy.paymentCompleted,
      failed: copy.paymentFailed,
      refunded: copy.paymentRefunded,
    };
    return paymentMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "border-blue-200 bg-blue-50/90 text-blue-700",
      confirmed: "border-sky-200 bg-sky-50/90 text-sky-700",
      preparing: "border-amber-200 bg-amber-50/90 text-amber-700",
      ready_for_pickup: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
      handed_over: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
      ready_for_dispatch: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
      out_for_delivery: "border-violet-200 bg-violet-50/90 text-violet-700",
      pending: "border-amber-200 bg-amber-50/90 text-amber-700",
      processing: "border-blue-200 bg-blue-50/90 text-blue-700",
      completed: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
      shipped: "border-sky-200 bg-sky-50/90 text-sky-700",
      delivered: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
      cancelled: "border-rose-200 bg-rose-50/90 text-rose-700",
      refunded: "border-orange-200 bg-orange-50/90 text-orange-700",
    };
    return colors[status] || "border-zinc-200 bg-zinc-50/90 text-zinc-700";
  };

  const getProgressIndex = (status: string) => {
    switch (status) {
      case "new":
      case "pending":
        return 1;
      case "confirmed":
      case "preparing":
      case "processing":
        return 2;
      case "ready_for_pickup":
      case "ready_for_dispatch":
      case "handed_over":
      case "out_for_delivery":
      case "shipped":
        return 3;
      case "delivered":
      case "completed":
        return 4;
      default:
        return 1;
    }
  };

  const progressSteps = [copy.stepPlaced, copy.stepProcessing, copy.stepShipped, copy.stepDelivered];

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(locale === "az" ? "az-AZ" : locale === "ru" ? "ru-RU" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
        <div className="mt-4 text-sm text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{copy.emptySubtitle}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-red-900 sm:text-[1.6rem]">{copy.title}</h1>
        <p className="mt-2 text-sm text-red-700 font-medium">Unable to load orders</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex min-h-9 items-center justify-center rounded-full border border-red-300 bg-white px-4 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{copy.emptySubtitle}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={toLocalePath("/catalog", locale)} className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            {copy.ctaCatalog}
          </Link>
          <Link href={toLocalePath("/cart", locale)} className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800">
            {copy.ctaCart}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>

      {orders.map((order) => (
        <div key={order.id} className="overflow-hidden rounded-[1.7rem] border border-zinc-200 bg-white shadow-[0_10px_28px_rgba(18,18,18,0.06)]">
          <div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-white px-5 py-4 sm:px-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.01em] text-zinc-900">
                  {copy.orderNumber} {order.order_number}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">{copy.date}: {formatDate(order.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <div className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${getStatusColor(order.status)}`}>
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
                  {getStatusLabel(order.status)}
                </div>
                <div className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${getStatusColor(order.payment_status)}`}>
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-sm bg-current opacity-80" aria-hidden="true" />
                  {copy.payment} · {getPaymentLabel(order.payment_status)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
              <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">{copy.progress}</p>
              {order.status === "cancelled" ? (
                <p className="flex items-center gap-2 text-sm font-medium text-red-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
                  {copy.cancelledHint}
                </p>
              ) : order.status === "refunded" ? (
                <p className="flex items-center gap-2 text-sm font-medium text-orange-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-orange-600" aria-hidden="true" />
                  {copy.refundedHint}
                </p>
              ) : (
                <>
                  <div className="sm:hidden">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {progressSteps.map((label, index) => {
                        const active = index + 1 <= getProgressIndex(order.status);
                        const completed = index + 1 < getProgressIndex(order.status);
                        return (
                          <div key={label} className="flex min-w-[82px] flex-col items-center gap-1.5 text-center">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full border ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-400"}`}
                              aria-hidden="true"
                            >
                              {completed ? (
                                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3.2 8.5l2.9 2.9 6-6" />
                                </svg>
                              ) : (
                                <span className="text-[10px] font-semibold">{index + 1}</span>
                              )}
                            </div>
                            <span className={`text-[10px] leading-3 ${active ? "font-medium text-zinc-900" : "text-zinc-400"}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="hidden grid-cols-4 gap-2 sm:grid">
                    {progressSteps.map((label, index) => {
                      const active = index + 1 <= getProgressIndex(order.status);
                      const completed = index + 1 < getProgressIndex(order.status);
                      return (
                        <div key={label} className="flex flex-col items-center gap-2 text-center">
                          <div className="flex w-full items-center gap-2">
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-400"}`}
                              aria-hidden="true"
                            >
                              {completed ? (
                                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3.2 8.5l2.9 2.9 6-6" />
                                </svg>
                              ) : (
                                <span className="text-[10px] font-semibold">{index + 1}</span>
                              )}
                            </div>
                            <div className={`h-2 w-full rounded-full ${active ? "bg-zinc-900" : "bg-zinc-200"}`} aria-hidden="true" />
                          </div>
                          <span className={`text-[11px] leading-4 ${active ? "font-medium text-zinc-900" : "text-zinc-400"}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium text-zinc-700">{copy.items}</h4>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-sm text-zinc-600">
                    <span className="max-w-[68%]">
                      {item.perfume_name} ({item.size_ml}ML) × {item.quantity}
                    </span>
                    <span className="font-medium text-zinc-900">{item.total_price.toFixed(2)} {order.currency}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex justify-between text-base font-semibold text-zinc-900">
                <span>{copy.total}</span>
                <span>
                  {order.total_amount.toFixed(2)} {order.currency}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 text-sm text-zinc-600">
              {copy.tracking}: <span className="font-medium text-zinc-900">{order.tracking_number || copy.noTracking}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
