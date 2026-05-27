"use client";

import { useEffect } from "react";

type CreditLine = {
  lang: string;
  text: string;
};

const CREDIT_LINES: CreditLine[] = [
  {
    lang: "AZ",
    text: "Bu vebsayt Bakhishov Brands tərəfindən hazırlanıb. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "EN",
    text: "This website is made by Bakhishov Brands. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "TR",
    text: "Bu web sitesi Bakhishov Brands tarafından hazırlandı. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "RU",
    text: "Этот сайт создан Bakhishov Brands. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "ES",
    text: "Este sitio fue creado por Bakhishov Brands. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "FR",
    text: "Ce site est cree par Bakhishov Brands. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "DE",
    text: "Diese Website wurde von Bakhishov Brands erstellt. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "AR",
    text: "تم إنشاء هذا الموقع بواسطة Bakhishov Brands. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "IT",
    text: "Questo sito e stato creato da Bakhishov Brands. WhatsApp: +994 55 575 77 77.",
  },
  {
    lang: "PT",
    text: "Este site foi feito por Bakhishov Brands. WhatsApp: +994 55 575 77 77.",
  },
];

export function ConsoleCredit() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const imageBlockStyle = [
      "display:block",
      "padding:88px 240px",
      "line-height:1",
      "border-radius:20px",
      "background-image:url('/BAKHISHOV.png')",
      "background-size:cover",
      "background-position:center",
      "box-shadow:0 20px 50px rgba(0,0,0,0.35)",
      "margin:24px 0 10px 0",
    ].join(";");

    const titleStyle = [
      "font:900 22px/1.1 'Poppins',sans-serif",
      "letter-spacing:.2em",
      "color:#f6f6f7",
      "text-shadow:0 8px 24px rgba(0,0,0,0.35)",
    ].join(";");

    const subtitleStyle = [
      "font:700 11px/1.4 'Poppins',sans-serif",
      "letter-spacing:.24em",
      "text-transform:uppercase",
      "color:#bfbfc5",
      "margin-bottom:8px",
    ].join(";");

    const printCredit = () => {
      console.log("%c ", imageBlockStyle);
      console.log("%cBAKHISHOV BRANDS", titleStyle);
      console.log("%cWEBSITE CREDIT + WHATSAPP", subtitleStyle);

      let index = 0;
      const intervalId = window.setInterval(() => {
        const item = CREDIT_LINES[index % CREDIT_LINES.length];
        const hue = (index * 37) % 360;

        const lineStyle = [
          "font:700 14px/1.45 'Poppins',sans-serif",
          "letter-spacing:.04em",
          "color:white",
          `text-shadow:0 0 18px hsla(${hue}, 88%, 74%, .55)`,
        ].join(";");

        console.log(`%c${item.lang}: ${item.text}`, lineStyle);

        index += 1;
        if (index >= CREDIT_LINES.length * 2) {
          window.clearInterval(intervalId);

          const lockStyle = [
            "font:800 13px/1.4 'Poppins',sans-serif",
            "letter-spacing:.16em",
            "text-transform:uppercase",
            "color:#ffd7b5",
            "margin-top:4px",
          ].join(";");

          console.log("%cBakhishov Brands · +994 55 575 77 77", lockStyle);
        }
      }, 900);

      return intervalId;
    };

    let intervalId: number | ReturnType<typeof setInterval> | null = null;
    let idleCallbackId: number | null = null;
    let fallbackTimeoutId: number | ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      intervalId = printCredit();
    };

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(schedule, { timeout: 5000 });
    } else {
      fallbackTimeoutId = globalThis.setTimeout(schedule, 2200);
    }

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (idleCallbackId !== null) {
        if ("cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleCallbackId);
        }
      }
      if (fallbackTimeoutId !== null) {
        globalThis.clearTimeout(fallbackTimeoutId);
      }
    };
  }, []);

  return null;
}
