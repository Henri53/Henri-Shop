"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { buyProduct } from "@/lib/actions";
import { useCurrency } from "./CurrencyProvider";
import SubmitButton from "./SubmitButton";

type Props = {
  productId: string;
  priceCents: number;
  stock: number;
  balanceCents: number | null; // null = not logged in as a customer
  isOwner: boolean;
  paused: boolean;
};

const button = "block w-full min-h-[48px] rounded-xl bg-accent px-4 text-center font-semibold leading-[48px] text-black";

export default function BuyBox({ productId, priceCents, stock, balanceCents, isOwner, paused }: Props) {
  const { format } = useCurrency();
  const [state, formAction] = useFormState(buyProduct, { error: "" });
  const [qty, setQty] = useState(1);

  const maxQty = Math.max(1, Math.min(stock, 10));
  const total = priceCents * qty;
  const soldOut = stock < 1;
  const shortfall = balanceCents !== null ? total - balanceCents : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
      <p className="text-sm text-muted">Price</p>
      <p className="font-display text-4xl font-bold">{format(priceCents)}</p>

      {soldOut ? (
        <p className="mt-5 rounded-xl border border-border bg-raised px-4 py-3 text-sm text-muted">
          Sold out right now. Check back later.
        </p>
      ) : paused ? (
        <p className="mt-5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          Purchases are paused for a moment. Please try again later.
        </p>
      ) : isOwner ? (
        <p className="mt-5 rounded-xl border border-border bg-raised px-4 py-3 text-sm text-muted">
          You are logged in as the owner. Log in with a customer account to test a purchase.
        </p>
      ) : balanceCents === null ? (
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/login" className={button}>
            Log in to buy
          </Link>
          <Link href="/register" className="text-center text-sm text-muted hover:text-white">
            No account yet? Register
          </Link>
        </div>
      ) : (
        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="productId" value={productId} />

          {maxQty > 1 && (
            <div>
              <label htmlFor="qty" className="mb-1 block text-sm text-muted">
                Quantity
              </label>
              <select
                id="qty"
                name="qty"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10))}
                className="min-h-[44px] w-full rounded-lg border border-border bg-raised px-3"
              >
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          {maxQty === 1 && <input type="hidden" name="qty" value="1" />}

          <dl className="flex flex-col gap-1.5 rounded-xl bg-raised px-4 py-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold">{format(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Your balance</dt>
              <dd>{format(balanceCents)}</dd>
            </div>
          </dl>

          {shortfall > 0 ? (
            <>
              <p className="text-sm text-bad">You need {format(shortfall)} more to buy this.</p>
              <Link href="/account#topup" className={button}>
                Top up balance
              </Link>
            </>
          ) : (
            <SubmitButton pendingText="Processing…" className="min-h-[48px] w-full rounded-xl bg-accent font-semibold text-black">
              Buy now
            </SubmitButton>
          )}

          {state?.error && (
            <p role="alert" className="text-sm text-bad">
              {state.error}
            </p>
          )}
        </form>
      )}

      <p className="mt-4 text-xs text-muted">Paid from your account balance. You can top up with PayPal or crypto.</p>
    </div>
  );
}
