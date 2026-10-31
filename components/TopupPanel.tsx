"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PayPalButton from "./PayPalButton";
import CryptoTopup from "./CryptoTopup";

export default function TopupPanel() {
  const router = useRouter();
  const [method, setMethod] = useState<"paypal" | "crypto">("paypal");
  const [ppAmount, setPpAmount] = useState("10");

  function refreshBalance() {
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMethod("paypal")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            method === "paypal" ? "bg-accent text-black" : "border border-border text-muted"
          }`}
        >
          PayPal
        </button>
        <button
          onClick={() => setMethod("crypto")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            method === "crypto" ? "bg-accent text-black" : "border border-border text-muted"
          }`}
        >
          Crypto
        </button>
      </div>

      {method === "paypal" ? (
        <div className="flex flex-col gap-3 max-w-xs">
          <div>
            <label className="block text-sm text-muted mb-1">Amount (EUR)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={ppAmount}
              onChange={(e) => setPpAmount(e.target.value)}
              className="min-h-[44px] px-3 w-full rounded-lg bg-bg border border-border text-white"
            />
          </div>
          <PayPalButton amountEur={parseFloat(ppAmount) || 0} onDone={refreshBalance} />
          <p className="text-xs text-muted">Confirmed instantly by PayPal — your balance updates right away.</p>
        </div>
      ) : (
        <div>
          <CryptoTopup onCredited={refreshBalance} />
          <p className="mt-3 text-xs text-muted">
            Checked automatically in the background against the public blockchain — no need to contact anyone.
          </p>
        </div>
      )}
    </div>
  );
}
