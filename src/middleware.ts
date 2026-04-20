import { NextResponse, type NextRequest } from "next/server";

import {
  localeRequestHeader,
  normalizeLocale,
  stripLocalePrefix,
} from "@/lib/i18n";

const PUBLIC_FILE = /\.[^/]+$/;

function isPrefetchRequest(request: NextRequest) {
  return (
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1" ||
    request.headers.get("next-router-prefetch") === "1"
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const shouldPersistLocaleCookie = !isPrefetchRequest(request);

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

    if (shouldPersistLocaleCookie) {
      response.cookies.set("perfoumer-locale", locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }

    return response;
  }

  const cookieLocale = request.cookies.get("perfoumer-locale")?.value;
  const effectiveLocale = normalizeLocale(cookieLocale);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(localeRequestHeader, effectiveLocale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (shouldPersistLocaleCookie && cookieLocale !== effectiveLocale) {
    response.cookies.set("perfoumer-locale", effectiveLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
