"use client";

import { useCurrency } from "./CurrencyProvider";

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as any)}
      className="bg-transparent border border-border rounded-lg px-2 py-1 text-sm text-muted"
      aria-label="Currency"
    >
      <option value="EUR">EUR €</option>
      <option value="USD">USD $</option>
      <option value="GBP">GBP £</option>
    </select>
  );
}
