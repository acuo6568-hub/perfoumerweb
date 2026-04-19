import { NextResponse } from "next/server";

import { normalizeLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = normalizeLocale(payload.locale);

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set("perfoumer-locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}
