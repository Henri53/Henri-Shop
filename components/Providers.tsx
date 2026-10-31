"use client";

import { SessionProvider } from "next-auth/react";
import { CurrencyProvider } from "./CurrencyProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </SessionProvider>
  );
}
