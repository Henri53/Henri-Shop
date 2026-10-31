"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Rates = {
  fiat: { EUR: number; USD: number; GBP: number };
  updatedAt: string;
};

type Ctx = {
  currency: "EUR" | "USD" | "GBP";
  setCurrency: (c: "EUR" | "USD" | "GBP") => void;
  format: (eurCents: number) => string;
};

const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

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
    fetch("/api/rates")
      .then((r) => r.json())
      .then(setRates)
      .catch(() => {});
  }, []);

  function changeCurrency(c: "EUR" | "USD" | "GBP") {
    setCurrency(c);
    try {
      localStorage.setItem("vaultline-currency", c);
    } catch {}
  }

  function format(eurCents: number) {
    const rate = rates?.fiat[currency] ?? 1;
    const symbol = SYMBOLS[currency];
    return `${symbol}${((eurCents / 100) * rate).toFixed(2)}`;
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
