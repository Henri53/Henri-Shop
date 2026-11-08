import { prisma } from "@/lib/prisma";
import { deliverOrder, refundOrder } from "@/lib/actions";
import StatusBadge from "../StatusBadge";
import { eur, day } from "./ui";

export default async function Orders() {
  const orders = await prisma.order.findMany({
    include: { user: true, product: true, items: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const waiting = orders.filter((o) => o.status === "PAID").length;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-display text-lg font-semibold">Orders</h2>
        <p className="text-sm text-muted">
          {waiting > 0 ? `${waiting} waiting for delivery` : "Nothing waiting for delivery"} · last 100 shown
        </p>
      </div>

      {orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}

      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {o.product.name} <span className="text-muted font-normal">× {o.qty}</span>
                </p>
                <p className="text-xs text-muted mt-0.5 break-all">
                  {o.user.email} · {day(o.createdAt)} · #{o.id.slice(-6)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{eur(o.totalCents)}</span>
                <StatusBadge status={o.status} />
              </div>
            </div>

            {o.items.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                {o.items.length} key{o.items.length === 1 ? "" : "s"} delivered automatically.
              </p>
            )}

            {o.status === "PAID" && (
              <div className="mt-3 flex flex-col gap-3">
                <form action={deliverOrder} className="flex flex-col gap-2">
                  <input type="hidden" name="orderId" value={o.id} />
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Delivery text for the customer (login, key, instructions…)"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-white outline-none transition-colors focus:border-accent"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary">
                      Mark delivered
                    </button>
                  </div>
                </form>
                <form action={refundOrder}>
                  <input type="hidden" name="orderId" value={o.id} />
                  <button type="submit" className="btn-danger">
                    Refund to balance
                  </button>
                </form>
              </div>
            )}

            {o.status === "DELIVERED" && o.deliveryNote && (
              <details className="mt-3">
                <summary className="text-sm text-accent cursor-pointer">Edit delivery text</summary>
                <form action={deliverOrder} className="flex flex-col gap-2 mt-2">
                  <input type="hidden" name="orderId" value={o.id} />
                  <textarea
                    name="note"
                    rows={2}
                    defaultValue={o.deliveryNote}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-white outline-none transition-colors focus:border-accent"
                  />
                  <div>
                    <button type="submit" className="btn-ghost">
                      Save
                    </button>
                  </div>
                </form>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
