type OrderUpdateEmailType =
  | "status_changed"
  | "price_changed"
  | "address_changed"
  | "order_cancelled"
  | "order_refunded";

type SendOrderUpdateEmailInput = {
  to: string;
  locale?: string;
  orderNumber: string;
  type: OrderUpdateEmailType;
  details?: string;
};

function toLocale(value: string | undefined) {
  if (value === "az" || value === "en" || value === "ru") {
    return value;
  }
  return "az";
}

function getCopy(locale: "az" | "en" | "ru", type: OrderUpdateEmailType) {
  const map = {
    az: {
      status_changed: {
        subject: "Sifariş statusu yeniləndi",
        title: "Sifariş statusunda dəyişiklik var",
      },
      price_changed: {
        subject: "Sifariş məbləği yeniləndi",
        title: "Sifariş məbləğində dəyişiklik var",
      },
      address_changed: {
        subject: "Çatdırılma ünvanı yeniləndi",
        title: "Sifariş ünvanı yeniləndi",
      },
      order_cancelled: {
        subject: "Sifariş ləğv edildi",
        title: "Sifarişiniz ləğv edildi",
      },
      order_refunded: {
        subject: "Geri ödəniş təsdiqləndi",
        title: "Sifariş üzrə geri ödəniş başladıldı",
      },
      bodyPrefix: "Sifariş nömrəsi",
      bodySuffix: "Üçün yenilənmiş məlumatlar hesab bölmənizdə görünür.",
    },
    en: {
      status_changed: {
        subject: "Order status updated",
        title: "There is an update to your order status",
      },
      price_changed: {
        subject: "Order total updated",
        title: "There is an update to your order total",
      },
      address_changed: {
        subject: "Delivery address updated",
        title: "Your order address has been updated",
      },
      order_cancelled: {
        subject: "Order cancelled",
        title: "Your order has been cancelled",
      },
      order_refunded: {
        subject: "Refund initiated",
        title: "A refund has been initiated for your order",
      },
      bodyPrefix: "Order number",
      bodySuffix: "You can see the latest details in your account orders page.",
    },
    ru: {
      status_changed: {
        subject: "Статус заказа обновлен",
        title: "Есть обновление статуса вашего заказа",
      },
      price_changed: {
        subject: "Сумма заказа обновлена",
        title: "Есть обновление суммы вашего заказа",
      },
      address_changed: {
        subject: "Адрес доставки обновлен",
        title: "Адрес вашего заказа обновлен",
      },
      order_cancelled: {
        subject: "Заказ отменен",
        title: "Ваш заказ был отменен",
      },
      order_refunded: {
        subject: "Возврат подтвержден",
        title: "По вашему заказу инициирован возврат",
      },
      bodyPrefix: "Номер заказа",
      bodySuffix: "Актуальные детали доступны в разделе заказов аккаунта.",
    },
  } as const;

  return {
    ...map[locale][type],
    bodyPrefix: map[locale].bodyPrefix,
    bodySuffix: map[locale].bodySuffix,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendOrderUpdateEmail(input: SendOrderUpdateEmailInput) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !from) {
    return;
  }

  const locale = toLocale(input.locale);
  const copy = getCopy(locale, input.type);

  const details = typeof input.details === "string" && input.details.trim() ? input.details.trim() : "";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f6f5f3;padding:24px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e8e5df;border-radius:14px;padding:24px;">
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#111827;">${escapeHtml(copy.title)}</h1>
        <p style="margin:0 0 8px;color:#374151;">${escapeHtml(copy.bodyPrefix)}: <strong>${escapeHtml(input.orderNumber)}</strong></p>
        ${details ? `<p style="margin:0 0 12px;color:#374151;">${escapeHtml(details)}</p>` : ""}
        <p style="margin:0;color:#4b5563;">${escapeHtml(copy.bodySuffix)}</p>
      </div>
    </div>
  `;

  const text = `${copy.title}\n${copy.bodyPrefix}: ${input.orderNumber}${details ? `\n${details}` : ""}\n${copy.bodySuffix}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: `${copy.subject} #${input.orderNumber}`,
      html,
      text,
    }),
  });
}
