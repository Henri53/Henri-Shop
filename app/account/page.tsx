import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopupPanel from "@/components/TopupPanel";
import PriceTag from "@/components/PriceTag";
import StatusBadge from "@/components/StatusBadge";
import CopyBlock from "@/components/CopyBlock";

export default async function AccountPage({ searchParams }: { searchParams: { bought?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "OWNER") redirect("/owner");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      orders: { include: { product: true, items: true }, orderBy: { createdAt: "desc" } },
      topups: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {searchParams.bought && (
        <p className="mb-6 rounded-xl border border-accent/30 bg-accent/10 text-accent px-4 py-3 text-sm">
          Purchase complete. Your delivery is in the order list below.
        </p>
      )}

      <div className="relative overflow-hidden card p-6 sm:p-8 mb-8">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />
        <p className="relative text-sm text-muted">{user.email}</p>
        <p className="relative text-sm text-muted mt-4">Balance</p>
        <PriceTag eurCents={user.balanceCents} className="relative font-display text-5xl font-bold" />
        <Link href="/" className="relative btn-ghost mt-5">
          Continue shopping
        </Link>
      </div>

      <div className="card p-6 mb-8">
        <h2 className="font-display text-xl font-semibold mb-4">Top up balance</h2>
        <TopupPanel />
        {user.topups.length > 0 && (
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-sm text-muted mb-3">Recent top-ups</p>
            <div className="flex flex-col gap-2">
              {user.topups.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span>
                    <PriceTag eurCents={t.amountCents} /> <span className="text-muted">· {t.method}</span>
                  </span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold mb-4">Your orders</h2>
        {user.orders.length === 0 && (
          <p className="text-sm text-muted">
            No orders yet.{" "}
            <Link href="/" className="text-accent underline">
              Browse the shop
            </Link>
          </p>
        )}
        <div className="flex flex-col gap-4">
          {user.orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {o.product.name} <span className="text-muted font-normal">× {o.qty}</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {o.createdAt.toISOString().slice(0, 10)} · #{o.id.slice(-6)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PriceTag eurCents={o.totalCents} className="font-semibold" />
                  <StatusBadge status={o.status} />
                </div>
              </div>

              {o.items.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs text-muted">Your delivery</p>
                  {o.items.map((i) => (
                    <CopyBlock key={i.id} text={i.content} />
                  ))}
                </div>
              )}

              {o.deliveryNote && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs text-muted">Your delivery</p>
                  <CopyBlock text={o.deliveryNote} />
                </div>
              )}

              {o.status === "PAID" && !o.deliveryNote && o.items.length === 0 && (
                <p className="mt-3 text-sm text-yellow-300">Waiting for delivery. Expected: {o.product.deliveryTime}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
