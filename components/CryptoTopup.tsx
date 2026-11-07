"use client";

import { useEffect, useRef, useState } from "react";
import { requestCryptoTopup } from "@/lib/actions";

const COINS = [
  { code: "BTC", label: "Bitcoin" },
  { code: "LTC", label: "Litecoin" },
  { code: "SOL", label: "Solana" },
] as const;

export default function CryptoTopup({ onCredited }: { onCredited: () => void }) {
  const [amount, setAmount] = useState("10");
  const [coin, setCoin] = useState<"BTC" | "LTC" | "SOL">("BTC");
  const [pending, setPending] = useState<{ id: string; address: string; cryptoAmount: string; coin: string } | null>(
    null
  );
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function start() {
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("amount", amount);
      fd.set("coin", coin);
      const result = await requestCryptoTopup(fd);
      setPending(result);
      setStatus("PENDING");

      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/topup/${result.id}/status`);
        const json = await res.json();
        if (json.status && json.status !== "PENDING") {
          setStatus(json.status);
          if (pollRef.current) clearInterval(pollRef.current);
          if (json.status === "APPROVED") onCredited();
        }
      }, 10_000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setPending(null);
    setStatus(null);
  }

  if (pending) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "APPROVED" ? "bg-good" : status === "REJECTED" ? "bg-red-400" : "bg-yellow-400"
            }`}
          />
          {status === "PENDING" && "Waiting for payment — checked automatically every couple of minutes…"}
          {status === "APPROVED" && "Payment detected — balance credited!"}
          {status === "REJECTED" && "This top-up expired without a matching payment."}
        </div>
        {status === "PENDING" && (
          <div className="p-4 bg-bg border border-border rounded-xl text-sm">
            <p className="text-muted mb-2">
              Send <strong className="text-white">exactly</strong> this amount of {pending.coin} — the exact figure
              is how we tell your payment apart from others:
            </p>
            <p className="font-display text-xl font-bold mb-2">
              {pending.cryptoAmount} {pending.coin}
            </p>
            <p className="text-muted text-xs mb-1">to</p>
            <p className="font-mono break-all">{pending.address}</p>
          </div>
        )}
        {status !== "PENDING" && (
          <button onClick={reset} className="self-start text-sm text-accent underline">
            Start another top-up
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-sm text-muted mb-1">Amount (EUR)</label>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="min-h-[44px] px-3 rounded-lg bg-bg border border-border text-white w-32"
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">Coin</label>
        <select
          value={coin}
          onChange={(e) => setCoin(e.target.value as any)}
          className="min-h-[44px] px-3 rounded-lg bg-bg border border-border text-white"
        >
          {COINS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={start}
        disabled={loading}
        className="min-h-[44px] px-5 rounded-lg bg-accent text-black font-semibold disabled:opacity-60"
      >
        {loading ? "Preparing…" : "Show payment details"}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </div>
  );
}
