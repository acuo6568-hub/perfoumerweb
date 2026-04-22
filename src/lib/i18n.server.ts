import { cache } from "react";
import { cookies, headers } from "next/headers";

import {
  defaultLocale,
  isLocale,
  localeRequestHeader,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n";

const resolveCurrentLocale = cache(async (): Promise<Locale> => {
  const headerStore = await headers();
  const rawHeaderLocale = headerStore.get(localeRequestHeader);
  if (isLocale(rawHeaderLocale)) {
    return rawHeaderLocale;
  }

  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("perfoumer-locale")?.value);
});

export async function getCurrentLocale(): Promise<Locale> {
  return resolveCurrentLocale();
}

export type { Locale } from "@/lib/i18n";
export { defaultLocale, normalizeLocale } from "@/lib/i18n";
