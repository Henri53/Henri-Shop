"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { buyProduct } from "@/lib/actions";
import PriceTag from "./PriceTag";

const initialState = { error: "" };

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary w-full min-h-[48px]">
      {pending ? "Processing…" : label}
    </button>
  );
}

export default function BuyForm({
  productId,
  stock,
  priceCents,
  mode,
  balanceCents,
}: {
  productId: string;
  stock: number;
  priceCents: number;
  mode: "guest" | "owner" | "customer";
  balanceCents: number | null;
}) {
  const [qty, setQty] = useState(1);
  const [state, formAction] = useFormState(buyProduct, initialState);

  const out = stock < 1;
  const max = Math.max(1, Math.min(stock, 10));
  const total = priceCents * qty;
  const short = mode === "customer" && balanceCents !== null && balanceCents < total;

  return (
    <div>
      <div className="flex items-end justify-between">
        <PriceTag eurCents={priceCents} className="font-display text-4xl font-bold" />
        <span className="text-sm text-muted pb-1">per unit</span>
      </div>

      {out ? (
        <button disabled className="btn-primary w-full min-h-[48px] mt-5">
          Out of stock
        </button>
      ) : mode === "guest" ? (
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/login" className="btn-primary w-full min-h-[48px]">
            Log in to buy
          </Link>
          <Link href="/register" className="btn-ghost w-full">
            Create an account
          </Link>
        </div>
      ) : mode === "owner" ? (
        <p className="mt-5 text-sm text-muted">
          You are logged in as the owner. Use a customer account to test a purchase.
        </p>
      ) : (
        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="qty" value={qty} />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Quantity</span>
            <div className="flex items-center rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 text-lg text-muted hover:text-white"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(max, q + 1))}
                className="w-10 h-10 text-lg text-muted hover:text-white"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted">Total</span>
            <PriceTag eurCents={total} className="font-display text-xl font-bold" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Your balance</span>
            <PriceTag eurCents={balanceCents ?? 0} className={short ? "text-red-400" : "text-accent"} />
          </div>

          {short && (
            <p className="text-sm text-yellow-300">
              Not enough balance for this order.{" "}
              <Link href="/account" className="underline">
                Top up your account
              </Link>
            </p>
          )}
          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <Submit label="Buy now" disabled={short} />
        </form>
      )}

      <p className="mt-4 text-xs text-muted">Paid from your account balance. Top up with PayPal or crypto on your account page.</p>
    </div>
  );
}
