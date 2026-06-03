import type { Metadata } from "next";

import { StaffOrdersPanelClient } from "@/components/staff/StaffOrdersPanelClient";
import {
  isAdminAuthenticated,
  isAdminConfigured,
  isStaffAuthenticated,
  isStaffConfigured,
} from "@/lib/admin-auth";
import { getCurrentLocale } from "@/lib/i18n.server";

export const metadata: Metadata = {
  title: "Staff Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const locale = await getCurrentLocale();
  const configured = isStaffConfigured() || isAdminConfigured();
  const authenticated = configured
    ? (await isStaffAuthenticated()) || (await isAdminAuthenticated())
    : false;

  return (
    <main className="min-h-dvh w-full bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_36%,#f5f3ff_100%)] px-3 pb-8 pt-3 sm:px-5 sm:pt-5 lg:px-7 xl:px-8">
      <StaffOrdersPanelClient
        configured={configured}
        initialAuthenticated={authenticated}
        locale={locale}
      />
    </main>
  );
}
