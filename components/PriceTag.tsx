"use client";

import { useCurrency } from "./CurrencyProvider";

export default function PriceTag({ eurCents, className }: { eurCents: number; className?: string }) {
  const { format } = useCurrency();
  return <span className={className}>{format(eurCents)}</span>;
}
