import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cancelOrder, deliverOrder } from "@/lib/actions";
import { eur, fmtDate } from "@/lib/utils";
import ConfirmButton from "@/components/ConfirmButton";
import SubmitButton from "@/components/SubmitButton";
import { StatusChip, btnDanger, btnPrimary, textareaCls } from "./ui";

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "PAID", label: "To deliver" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default async function Orders({ status }: { status: string }) {
  const where: Prisma.OrderWhereInput = {};
  if (status === "PAID" || status === "DELIVERED" || status === "CANCELLED") where.status = status;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true, product: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter orders">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/owner?tab=orders&status=${f.key}` : "/owner?tab=orders"}
            aria-current={status === f.key ? "true" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              status === f.key ? "border-accent bg-accent font-medium text-black" : "border-border bg-card text-muted hover:text-white"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          No orders here yet.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {o.product.name}
                  {o.qty > 1 ? ` × ${o.qty}` : ""}
                </p>
                <p className="text-sm text-muted">{o.user.email}</p>
                <p className="text-xs text-muted">{fmtDate(o.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{eur(o.totalCents)}</p>
                <StatusChip status={o.status} />
              </div>
            </div>

            {o.status !== "CANCELLED" && (
              <details className="mt-4 border-t border-border pt-3" open={o.status === "PAID"}>
                <summary className="cursor-pointer text-sm font-medium text-accent">
                  {o.status === "PAID" ? "Deliver this order" : "Delivery details"}
                </summary>
                <form action={deliverOrder} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="id" value={o.id} />
                  <label htmlFor={`delivery-${o.id}`} className="text-sm text-muted">
                    What the customer receives. They see this in their account.
                  </label>
                  <textarea
                    id={`delivery-${o.id}`}
                    name="deliveryInfo"
                    rows={4}
                    maxLength={5000}
                    defaultValue={o.deliveryInfo ?? ""}
                    placeholder="e.g. login details, a key, or a download link"
                    className={textareaCls}
                  />
                  <div>
                    <SubmitButton pendingText="Saving…" className={btnPrimary}>
                      {o.status === "PAID" ? "Mark as delivered" : "Save details"}
                    </SubmitButton>
                  </div>
                </form>
              </details>
            )}

            {o.status !== "CANCELLED" && (
              <form action={cancelOrder} className="mt-3">
                <input type="hidden" name="id" value={o.id} />
                <ConfirmButton
                  message="Cancel this order and refund the customer's balance? This cannot be undone."
                  className={btnDanger}
                >
                  Cancel and refund
                </ConfirmButton>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
