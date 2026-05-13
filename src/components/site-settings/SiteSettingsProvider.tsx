"use client";

import { createContext, useContext } from "react";

import type { SiteSettings } from "@/lib/site-branding";

const SiteSettingsContext = createContext<SiteSettings | null>(null);

export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const value = useContext(SiteSettingsContext);
  if (!value) {
    throw new Error("useSiteSettings must be used inside SiteSettingsProvider.");
  }

  return value;
}
