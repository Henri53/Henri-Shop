"use client";

import { useCurrency } from "./CurrencyProvider";

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as "EUR" | "USD" | "GBP")}
      className="bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
      aria-label="Currency"
    >
      <option value="EUR">EUR €</option>
      <option value="USD">USD $</option>
      <option value="GBP">GBP £</option>
    </select>
  );
}
