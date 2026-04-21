"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  CURRENCY_STORAGE_KEY,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";

type CurrencyContextValue = {
  selectedCurrency: SupportedCurrency;
  setSelectedCurrency: (currency: SupportedCurrency) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<SupportedCurrency>("AZN");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (isSupportedCurrency(stored)) {
        setSelectedCurrencyState(stored);
      }
    } catch {
      // Ignore unavailable storage.
    }
  }, []);

  const setSelectedCurrency = (currency: SupportedCurrency) => {
    setSelectedCurrencyState(currency);

    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // Ignore unavailable storage.
    }
  };

  const value = useMemo(
    () => ({
      selectedCurrency,
      setSelectedCurrency,
    }),
    [selectedCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider.");
  }

  return context;
}
