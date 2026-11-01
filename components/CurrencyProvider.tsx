"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Rates = {
  fiat: { EUR: number; USD: number; GBP: number };
  fiatLive?: boolean;
  updatedAt: string;
};

type Ctx = {
  currency: "EUR" | "USD" | "GBP";
  setCurrency: (c: "EUR" | "USD" | "GBP") => void;
  format: (eurCents: number) => string;
};

const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
const REFRESH_MS = 5 * 60_000; // keep long-open tabs up to date

const CurrencyContext = createContext<Ctx>({
  currency: "EUR",
  setCurrency: () => {},
  format: (c) => `€${(c / 100).toFixed(2)}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<"EUR" | "USD" | "GBP">("EUR");
  const [rates, setRates] = useState<Rates | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vaultline-currency");
      if (saved === "EUR" || saved === "USD" || saved === "GBP") setCurrency(saved);
    } catch {}

    function loadRates() {
      fetch("/api/rates")
        .then((r) => r.json())
        .then(setRates)
        .catch(() => {}); // keep the previous rates if this refresh fails
    }
    loadRates();
    const timer = setInterval(loadRates, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  function changeCurrency(c: "EUR" | "USD" | "GBP") {
    setCurrency(c);
    try {
      localStorage.setItem("vaultline-currency", c);
    } catch {}
  }

  function format(eurCents: number) {
    const eur = eurCents / 100;
    // Without trustworthy rates, show the real EUR price instead of a euro
    // number wearing a dollar sign.
    const rate = rates?.fiatLive === false ? undefined : rates?.fiat[currency];
    if (currency === "EUR" || !rate) return `€${eur.toFixed(2)}`;
    // "≈": prices are converted for display only, payments are always charged in EUR.
    return `≈${SYMBOLS[currency]}${(eur * rate).toFixed(2)}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: changeCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
