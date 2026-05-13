import type { Metadata } from "next";

import { AdminPanelClient } from "@/components/admin/AdminPanelClient";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { getAdminData } from "@/lib/admin-data";
import { normalizeSiteSettings } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteSettings();

  return {
    title: `Admin | ${siteName}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const configured = isAdminConfigured();
  const authenticated = configured ? await isAdminAuthenticated() : false;

  const data = configured && authenticated
    ? await getAdminData()
    : { perfumes: [], notes: [], settings: normalizeSiteSettings(null) };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1820px] px-3 pb-10 pt-24 sm:px-5 sm:pt-28 lg:px-7 xl:px-9">
      <AdminPanelClient
        configured={configured}
        initialAuthenticated={authenticated}
        initialPerfumesJson={JSON.stringify(data.perfumes, null, 2)}
        initialNotesJson={JSON.stringify(data.notes, null, 2)}
        initialSettingsJson={JSON.stringify(data.settings, null, 2)}
      />
    </main>
  );
}
