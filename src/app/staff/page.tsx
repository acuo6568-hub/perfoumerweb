import type { Metadata } from "next";

import { StaffOrdersPanelClient } from "@/components/staff/StaffOrdersPanelClient";
import {
  isAdminAuthenticated,
  isAdminConfigured,
  isStaffAuthenticated,
  isStaffConfigured,
} from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Staff Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const configured = isStaffConfigured() || isAdminConfigured();
  const authenticated = configured
    ? (await isStaffAuthenticated()) || (await isAdminAuthenticated())
    : false;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1820px] px-3 pb-10 pt-24 sm:px-5 sm:pt-28 lg:px-7 xl:px-9">
      <StaffOrdersPanelClient configured={configured} initialAuthenticated={authenticated} />
    </main>
  );
}
