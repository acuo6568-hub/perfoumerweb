import type { Metadata } from "next";

import { LegalPageView } from "@/components/legal/LegalPageView";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getLegalMetadata, getLegalPage } from "@/lib/legal";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  return getLegalMetadata(locale, "refund-policy", settings);
}

export default async function RefundPolicyPage() {
  const locale = await getCurrentLocale();
  const settings = await getSiteSettings();
  const page = getLegalPage(locale, "refund-policy", settings);

  return <LegalPageView locale={locale} page={page} settings={settings} />;
}
