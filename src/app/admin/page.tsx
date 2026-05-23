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
  let configured = false;
  let authenticated = false;
  let data = { perfumes: [], notes: [], settings: normalizeSiteSettings(null) };

  try {
    configured = isAdminConfigured();
    authenticated = configured ? await isAdminAuthenticated() : false;

    if (configured && authenticated) {
      data = await getAdminData();
    } else {
      data = { perfumes: [], notes: [], settings: normalizeSiteSettings(null) };
    }
  } catch (error) {
    // Defensive: prevent server-side errors from crashing the admin page render.
    // Log to server console for diagnosis and fall back to unauthenticated view.
    // eslint-disable-next-line no-console
    console.error("[AdminPage] Error initializing admin page:", error);
    configured = false;
    authenticated = false;
    data = { perfumes: [], notes: [], settings: normalizeSiteSettings(null) };
  }

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
