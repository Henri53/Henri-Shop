"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalButton({ amountEur, onDone }: { amountEur: number; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  useEffect(() => {
    if (!clientId || amountEur <= 0) return;
    setError("");
    if (ref.current) ref.current.innerHTML = "";

    function render() {
      if (!window.paypal || !ref.current) return;
      window.paypal
        .Buttons({
          style: { layout: "horizontal", height: 44, label: "pay" },
          createOrder: async () => {
            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amountEur }),
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            return json.id;
          },
          onApprove: async (data: any) => {
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const json = await res.json();
            if (json.ok) onDone();
            else setError(json.error || "Payment could not be completed.");
          },
          onError: () => setError("PayPal ran into a problem. Please try again."),
        })
        .render(ref.current);
    }

    const existing = document.getElementById("paypal-sdk") as HTMLScriptElement | null;
    if (existing && window.paypal) {
      render();
    } else if (!existing) {
      const script = document.createElement("script");
      script.id = "paypal-sdk";
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR`;
      script.onload = render;
      document.body.appendChild(script);
    } else {
      existing.addEventListener("load", render, { once: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountEur, clientId]);

  if (!clientId) {
    return (
      <p className="text-xs text-yellow-400">
        Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env to enable PayPal.
      </p>
    );
  }

  return (
    <div>
      <div ref={ref} />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
