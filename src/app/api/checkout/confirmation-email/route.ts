import { NextResponse } from "next/server";

type Locale = "az" | "en" | "ru";

type EmailItem = {
  name: string;
  quantity: number;
  lineTotal: number;
};

type ShippingAddress = {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
} | null;

type PickupLocation = {
  name: string;
  address: string;
  phone: string;
} | null;

type EmailPayload = {
  locale?: string;
  email?: string;
  orderId?: string;
  status?: string;
  paymentMethod?: string;
  total?: number;
  shippingPrice?: number;
  subtotal?: number;
  items?: EmailItem[];
  shippingAddress?: ShippingAddress;
  pickupLocation?: PickupLocation;
};

type Copy = {
  subject: string;
  title: string;
  intro: string;
  pickupIntro: string;
  orderLabel: string;
  subtotalLabel: string;
  shippingLabel: string;
  totalLabel: string;
  itemsLabel: string;
  addressLabel: string;
  pickupLabel: string;
  supportTitle: string;
  supportBody: string;
  supportCta: string;
  manageTitle: string;
  manageBody: string;
  manageCta: string;
  footerLocation: string;
  linkHome: string;
  linkCatalog: string;
  linkAccount: string;
  linkSupport: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    subject: "Sifariş təsdiqi",
    title: "Sifarişiniz qəbul edildi",
    intro: "Sifarişiniz qəbul edildi və mağaza komandamızın əməliyyat növbəsinə əlavə olundu.",
    pickupIntro: "Sifarişiniz mağazadan götürmə üçün rezerv edildi. Təhvil zamanı ödəniş və yoxlama əməkdaş tərəfindən tamamlanacaq.",
    orderLabel: "Sifariş ID",
    subtotalLabel: "Ara cəmi",
    shippingLabel: "Çatdırılma",
    totalLabel: "Ümumi",
    itemsLabel: "Məhsullar",
    addressLabel: "Çatdırılma ünvanı",
    pickupLabel: "Götürmə ünvanı",
    supportTitle: "Dəstək lazımdır?",
    supportBody: "Çatdırılma, məhsul və ya sifariş barədə hər sualınız üçün komandamız sizə kömək etməyə hazırdır.",
    supportCta: "Dəstəyə yazın",
    manageTitle: "Sifarişi idarə edin",
    manageBody: "Sifarişinizin bütün mərhələlərini hesab bölməsindən izləyə bilərsiniz.",
    manageCta: "Hesabı açın",
    footerLocation: "Bakı, Azərbaycan",
    linkHome: "Ana səhifə",
    linkCatalog: "Kataloq",
    linkAccount: "Hesab",
    linkSupport: "Dəstək",
  },
  en: {
    subject: "Order confirmation",
    title: "Your order is confirmed",
    intro: "Your order has been confirmed and added to the store operations queue.",
    pickupIntro: "Your order has been reserved for store pickup. Payment and verification are completed with staff at handoff.",
    orderLabel: "Order ID",
    subtotalLabel: "Subtotal",
    shippingLabel: "Shipping",
    totalLabel: "Total",
    itemsLabel: "Items",
    addressLabel: "Shipping address",
    pickupLabel: "Pickup location",
    supportTitle: "Need help?",
    supportBody: "Our team is ready to help with delivery details, product questions, or anything else.",
    supportCta: "Contact support",
    manageTitle: "Manage your order",
    manageBody: "Track every order update anytime from your account page.",
    manageCta: "Open account",
    footerLocation: "Baku, Azerbaijan",
    linkHome: "Home",
    linkCatalog: "Catalog",
    linkAccount: "Account",
    linkSupport: "Support",
  },
  ru: {
    subject: "Подтверждение заказа",
    title: "Ваш заказ подтвержден",
    intro: "Ваш заказ подтвержден и добавлен в очередь магазина.",
    pickupIntro: "Ваш заказ зарезервирован для самовывоза. Оплата и проверка завершаются сотрудником при передаче.",
    orderLabel: "Номер заказа",
    subtotalLabel: "Подытог",
    shippingLabel: "Доставка",
    totalLabel: "Итого",
    itemsLabel: "Товары",
    addressLabel: "Адрес доставки",
    pickupLabel: "Адрес самовывоза",
    supportTitle: "Нужна помощь?",
    supportBody: "Наша команда поможет с доставкой, вопросами по товару и деталями заказа.",
    supportCta: "Написать в поддержку",
    manageTitle: "Управление заказом",
    manageBody: "Следите за этапами заказа в личном кабинете в любое время.",
    manageCta: "Открыть кабинет",
    footerLocation: "Баку, Азербайджан",
    linkHome: "Главная",
    linkCatalog: "Каталог",
    linkAccount: "Аккаунт",
    linkSupport: "Поддержка",
  },
};

function toLocale(input: string | undefined): Locale {
  if (input === "az" || input === "en" || input === "ru") {
    return input;
  }
  return "az";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: number) {
  return `${Math.round(value * 100) / 100} AZN`;
}

function isDisallowedPublicHost(url: URL) {
  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0" ||
    url.hostname.endsWith(".local")
  );
}

function getPublicBaseUrl(_request: Request) {
  const candidates = [
    process.env.PERFOUMER_SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
  ].filter((value): value is string => Boolean(value && value.trim()));

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (!isDisallowedPublicHost(parsed)) {
        return parsed.origin.replace(/\/$/, "");
      }
    } catch {
      // Ignore invalid URL candidates.
    }
  }

  return "https://perfoumer.az";
}

export async function POST(request: Request) {
  let body: EmailPayload;
  try {
    body = (await request.json()) as EmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const locale = toLocale(body.locale);
  const copy = copyByLocale[locale];

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const subtotal = Number.isFinite(body.subtotal) ? Number(body.subtotal) : 0;
  const shipping = Number.isFinite(body.shippingPrice) ? Number(body.shippingPrice) : 0;
  const total = Number.isFinite(body.total) ? Number(body.total) : subtotal + shipping;
  const orderId = typeof body.orderId === "string" && body.orderId.trim() ? body.orderId.trim() : "-";
  const isTestEmail = orderId.startsWith("TEST-");
  const from = process.env.ORDER_EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!from || !resendApiKey) {
    return NextResponse.json({ error: "Email provider is not configured." }, { status: 503 });
  }

  const itemsRows = items
    .map(
      (item) => `<tr>
<td style="padding:8px 0;color:#000000;">${escapeHtml(item.name)} x${item.quantity}</td>
<td style="padding:8px 0;color:#000000;text-align:right;">${money(item.lineTotal)}</td>
</tr>`,
    )
    .join("\n");

  const address = body.shippingAddress;
  const pickupLocation = body.pickupLocation;
  const isPickup = Boolean(pickupLocation);
  const detailLabel = isPickup ? copy.pickupLabel : copy.addressLabel;
  const detailHtml = isPickup
    ? pickupLocation
      ? `<p style="margin:0;color:#000000;line-height:1.65;"><strong>${escapeHtml(pickupLocation.name)}</strong><br/>${escapeHtml(pickupLocation.address)}<br/>${escapeHtml(pickupLocation.phone)}</p>`
      : `<p style="margin:0;color:#000000;">-</p>`
    : address
      ? `<p style="margin:0;color:#000000;line-height:1.65;">${escapeHtml(address.fullName)}<br/>${escapeHtml(address.line1)}${address.line2 ? `<br/>${escapeHtml(address.line2)}` : ""}<br/>${escapeHtml(address.city)} ${escapeHtml(address.postalCode)}<br/>${escapeHtml(address.country)}</p>`
      : `<p style="margin:0;color:#000000;">-</p>`;

  const subject = `${copy.subject}${orderId !== "-" ? ` #${orderId}` : ""}${isTestEmail ? " [Template v2]" : ""}`;

  const siteUrl = getPublicBaseUrl(request);
  const logoLight = "https://perfoumer.az/perfoumerlogo.png";
  const logoDark = "https://perfoumer.az/perfoumerlight.png";

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; background: #ece8dd; }
    .wrap { padding: 24px 12px; font-family: Poppins, Arial, sans-serif; background: radial-gradient(circle at 12% 8%, #faf7ef 0%, #ece8dd 52%, #e4dece 100%); }
    .mail { max-width: 600px; margin: 0 auto; }
    .logo-row { text-align: center; padding: 14px 0 22px; }
    .logo-light { display: inline-block; }
    .logo-dark { display: none; }
    .logo { height: 36px; width: auto; }
    .panel { background: #fffdf8; border: 1px solid #d8d0bb; border-radius: 18px; overflow: hidden; margin-bottom: 14px; box-shadow: 0 16px 40px rgba(60, 52, 35, 0.12); }
    .hero { padding: 42px 28px; text-align: center; background: linear-gradient(160deg, #f8f3e7 0%, #efe7d6 100%); }
    .title { margin: 0; color: #1d1a14; font-size: 40px; line-height: 1.14; letter-spacing: -0.02em; font-family: 'Playfair Display', Georgia, serif; }
    .intro { margin: 16px 0 0; color: #4e4637; font-family: Poppins, Arial, sans-serif; font-size: 16px; line-height: 1.6; }
    .body { padding: 26px 24px 28px; }
    .pill { margin: 0 0 14px; padding: 11px 13px; background: #f6efdc; border: 1px solid #d6c7a6; border-radius: 12px; color: #2a251b; font-size: 14px; }
    .heading { margin: 0 0 8px; color: #5c5547; font-family: Poppins, Arial, sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.09em; }
    .items { width: 100%; border-collapse: collapse; }
    .items td { padding: 8px 0; color: #1f1b14; font-size: 15px; }
    .items .price { text-align: right; }
    .totals { margin-top: 8px; border-top: 1px solid #dfd3b8; padding-top: 10px; color: #312a1f; font-size: 14px; line-height: 1.8; }
    .totals strong { color: #201a12; }
    .addr { margin-top: 14px; padding: 12px 13px; border: 1px solid #e0d5bc; border-radius: 12px; background: #fffaf0; }
    .split { width: 100%; border-collapse: collapse; }
    .split td { width: 50%; vertical-align: top; padding: 0; }
    .col-left { padding: 24px 10px 24px 24px !important; }
    .col-right { padding: 24px 24px 24px 10px !important; }
    .tile { border: 1px solid #ded2b6; border-radius: 14px; background: #fff9ec; padding: 16px; min-height: 148px; }
    .tile h3 { margin: 0 0 10px; color: #211a12; font-size: 18px; font-family: 'Playfair Display', Georgia, serif; }
    .tile p { margin: 0 0 12px; color: #4d4537; font-size: 14px; line-height: 1.5; font-family: Poppins, Arial, sans-serif; }
    .tile a { color: #1d1a14; text-decoration: underline; font-size: 14px; }
    .footer { background: #f6efdf; text-align: center; padding: 34px 20px; }
    .footer p { margin: 0; color: #3f3729; font-family: Poppins, Arial, sans-serif; font-size: 13px; line-height: 1.7; }
    .footer-links { margin-top: 12px; font-size: 12px; color: #3f3729; }
    .footer-links a { color: #221d15; text-decoration: none; margin: 0 8px; }

    @media (max-width: 620px) {
      .title { font-size: 32px; }
      .hero { padding: 34px 20px; }
      .body { padding: 22px 18px; }
      .split, .split tbody, .split tr, .split td { display: block; width: 100% !important; }
      .col-left, .col-right { padding: 10px 18px !important; }
      .tile { min-height: auto; }
    }

    @media (prefers-color-scheme: dark) {
      .logo-light { display: none !important; }
      .logo-dark { display: inline-block !important; }
    }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${isTestEmail ? "Template v2 test email" : copy.subject}</div>
  <div class="wrap" style="padding:24px 12px;font-family:Poppins,Arial,sans-serif;">
    <div class="mail" style="max-width:600px;margin:0 auto;">
      <div class="logo-row" style="text-align:center;padding:14px 0 22px;">
        <img class="logo logo-light" src="${logoLight}" alt="Perfoumer" width="196" height="36" style="height:36px;width:auto;display:inline-block;" />
        <img class="logo logo-dark" src="${logoDark}" alt="Perfoumer" width="196" height="36" style="height:36px;width:auto;display:none;" />
      </div>

      <div class="panel" style="background:#fffdf8;border:1px solid #d8d0bb;border-radius:18px;overflow:hidden;margin-bottom:14px;box-shadow:0 16px 40px rgba(60,52,35,0.12);">
        <div class="hero" style="padding:42px 28px;text-align:center;background:linear-gradient(160deg,#f8f3e7 0%,#efe7d6 100%);">
          <h1 class="title" style="margin:0;color:#1d1a14;font-size:40px;line-height:1.14;letter-spacing:-0.02em;font-family:'Playfair Display',Georgia,serif;">${copy.title}</h1>
          <p class="intro" style="margin:16px 0 0;color:#4e4637;font-family:Poppins,Arial,sans-serif;font-size:16px;line-height:1.6;">${isPickup ? copy.pickupIntro : copy.intro}</p>
        </div>

        <div class="body" style="padding:26px 24px 28px;">
          <p class="pill" style="margin:0 0 14px;padding:11px 13px;background:#f6efdc;border:1px solid #d6c7a6;border-radius:12px;color:#2a251b;font-size:14px;"><strong>${copy.orderLabel}:</strong> ${escapeHtml(orderId)}</p>

          <p class="heading" style="margin:0 0 8px;color:#5c5547;font-family:Poppins,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.09em;">${copy.itemsLabel}</p>
          <table class="items" style="width:100%;border-collapse:collapse;">
            ${itemsRows || `<tr><td style="padding:8px 0;color:#000000;">-</td></tr>`}
          </table>

          <div class="totals" style="margin-top:8px;border-top:1px solid #dfd3b8;padding-top:10px;color:#312a1f;font-size:14px;line-height:1.8;">
            <div><strong>${copy.subtotalLabel}:</strong> ${money(subtotal)}</div>
            <div><strong>${copy.shippingLabel}:</strong> ${money(shipping)}</div>
            <div><strong>${copy.totalLabel}:</strong> ${money(total)}</div>
          </div>

          <p class="heading" style="margin:14px 0 8px;color:#5c5547;font-family:Poppins,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.09em;">${detailLabel}</p>
          <div class="addr" style="margin-top:14px;padding:12px 13px;border:1px solid #e0d5bc;border-radius:12px;background:#fffaf0;">${detailHtml}</div>
        </div>
      </div>

      <div class="panel" style="background:#fffdf8;border:1px solid #d8d0bb;border-radius:18px;overflow:hidden;margin-bottom:14px;box-shadow:0 16px 40px rgba(60,52,35,0.12);">
        <table class="split" role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td class="col-left" style="width:50%;vertical-align:top;padding:24px 10px 24px 24px;">
              <div class="tile" style="border:1px solid #ded2b6;border-radius:14px;background:#fff9ec;padding:16px;min-height:148px;">
                <h3 style="margin:0 0 10px;color:#211a12;font-size:18px;font-family:'Playfair Display',Georgia,serif;">${copy.supportTitle}</h3>
                <p style="margin:0 0 12px;color:#4d4537;font-size:14px;line-height:1.5;font-family:Poppins,Arial,sans-serif;">${copy.supportBody}</p>
                <a href="mailto:orders@perfoumer.az" style="color:#1d1a14;text-decoration:underline;font-size:14px;font-family:Poppins,Arial,sans-serif;">${copy.supportCta}</a>
              </div>
            </td>
            <td class="col-right" style="width:50%;vertical-align:top;padding:24px 24px 24px 10px;">
              <div class="tile" style="border:1px solid #ded2b6;border-radius:14px;background:#fff9ec;padding:16px;min-height:148px;">
                <h3 style="margin:0 0 10px;color:#211a12;font-size:18px;font-family:'Playfair Display',Georgia,serif;">${copy.manageTitle}</h3>
                <p style="margin:0 0 12px;color:#4d4537;font-size:14px;line-height:1.5;font-family:Poppins,Arial,sans-serif;">${copy.manageBody}</p>
                <a href="${siteUrl}/account" style="color:#1d1a14;text-decoration:underline;font-size:14px;font-family:Poppins,Arial,sans-serif;">${copy.manageCta}</a>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <div class="panel footer" style="background:#f6efdf;text-align:center;padding:34px 20px;border:1px solid #d8d0bb;border-radius:18px;overflow:hidden;">
        <p style="margin:0;color:#3f3729;font-family:Poppins,Arial,sans-serif;font-size:13px;line-height:1.7;">© ${new Date().getFullYear()} Perfoumer<br/>${copy.footerLocation}</p>
        <div class="footer-links" style="margin-top:12px;font-size:12px;color:#3f3729;font-family:Poppins,Arial,sans-serif;">
          <a href="${siteUrl}" style="color:#221d15;text-decoration:none;margin:0 8px;">${copy.linkHome}</a> |
          <a href="${siteUrl}/catalog" style="color:#221d15;text-decoration:none;margin:0 8px;">${copy.linkCatalog}</a> |
          <a href="${siteUrl}/account" style="color:#221d15;text-decoration:none;margin:0 8px;">${copy.linkAccount}</a> |
          <a href="mailto:orders@perfoumer.az" style="color:#221d15;text-decoration:none;margin:0 8px;">${copy.linkSupport}</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textLines = [
    copy.title,
    isPickup ? copy.pickupIntro : copy.intro,
    `${copy.orderLabel}: ${orderId}`,
    "",
    `${copy.itemsLabel}:`,
    ...items.map((item) => `- ${item.name} x${item.quantity} — ${money(item.lineTotal)}`),
    "",
    `${copy.subtotalLabel}: ${money(subtotal)}`,
    `${copy.shippingLabel}: ${money(shipping)}`,
    `${copy.totalLabel}: ${money(total)}`,
  ];

  if (isPickup && pickupLocation) {
    textLines.push(
      "",
      `${copy.pickupLabel}:`,
      `${pickupLocation.name}`,
      `${pickupLocation.address}`,
      `${pickupLocation.phone}`,
    );
  } else if (address) {
    textLines.push(
      "",
      `${copy.addressLabel}:`,
      `${address.fullName}`,
      `${address.line1}${address.line2 ? `, ${address.line2}` : ""}`,
      `${address.city} ${address.postalCode}`,
      `${address.country}`,
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html,
      text: textLines.join("\n"),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    return NextResponse.json(
      {
        error: "Failed to send confirmation email.",
        provider: payload || null,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
