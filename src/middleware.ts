import { NextResponse, type NextRequest } from "next/server";

import {
  defaultLocale,
  localeRequestHeader,
  normalizeLocale,
  stripLocalePrefix,
} from "@/lib/i18n";

const PUBLIC_FILE = /\.[^/]+$/;

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/ornaments") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const { locale, pathname: strippedPath } = stripLocalePrefix(pathname);

  if (locale) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(localeRequestHeader, locale);

    const response = NextResponse.rewrite(
      new URL(`${strippedPath}${search}`, request.url),
      {
        request: {
          headers: requestHeaders,
        },
      },
    );
    response.cookies.set("perfoumer-locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const cookieLocale = request.cookies.get("perfoumer-locale")?.value;
  const normalizedLocale = normalizeLocale(cookieLocale);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(localeRequestHeader, normalizedLocale);

  if (cookieLocale && normalizedLocale !== defaultLocale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${normalizedLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
