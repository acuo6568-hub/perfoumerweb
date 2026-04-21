import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LiveStatsClient } from "@/components/stats/LiveStatsClient";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { toLocalePath } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n.server";

export const metadata: Metadata = {
  title: "Live Stats",
  description: "Realtime website analytics dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const isProd = process.env.NODE_ENV === "production";
  const configured = isAdminConfigured();
  const authenticated = configured ? await isAdminAuthenticated() : false;
  const locale = await getCurrentLocale();

  if (!configured && isProd) {
    return (
      <div className="bg-[#f3f3f2]">
        <main className="mx-auto max-w-[860px] px-4 py-10 sm:px-6 md:py-14">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_14px_36px_rgba(24,24,24,0.08)] sm:p-8">
            <h1 className="text-3xl tracking-[-0.02em] text-zinc-900 sm:text-4xl">Stats not configured</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
              Set ADMIN_PASSWORD in your environment to enable the private analytics dashboard.
            </p>
            <Link
              href={toLocalePath("/", locale)}
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-5 text-sm font-semibold text-white"
            >
              Back to home
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (configured && !authenticated) {
    redirect("/admin?next=/stats");
  }

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 md:px-10 md:py-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <h1 className="text-[2.2rem] leading-[0.95] tracking-[-0.03em] text-zinc-900 sm:text-5xl">
            Website Stats
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 sm:text-base">
            Live traffic, signed-in vs guest users, devices, and top active pages.
          </p>
        </section>

        <div className="mt-6">
          <LiveStatsClient />
        </div>
      </main>
    </div>
  );
}
