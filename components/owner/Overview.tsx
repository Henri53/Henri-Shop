import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "../StatusBadge";
import { eur, day, StatCard } from "./ui";

export default async function Overview() {
  const [customers, sales, balances, credited, pending, lowStock, recent] = await Promise.all([
    prisma.user.count(),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.user.aggregate({ _sum: { balanceCents: true } }),
    prisma.topup.aggregate({ where: { status: "APPROVED" }, _sum: { amountCents: true } }),
    prisma.topup.count({ where: { status: "PENDING" } }),
    prisma.product.findMany({
      where: { active: true, stock: { lte: 2 } },
      orderBy: { stock: "asc" },
      take: 6,
    }),
    prisma.order.findMany({
      include: { user: true, product: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sales" value={eur(sales._sum.totalCents ?? 0)} hint="All orders except refunds" />
        <StatCard label="Orders" value={String(sales._count._all)} />
        <StatCard label="Customers" value={String(customers)} />
        <StatCard label="Customer balances" value={eur(balances._sum.balanceCents ?? 0)} hint="Money customers can still spend" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Top-ups credited" value={eur(credited._sum.amountCents ?? 0)} />
        <Link href="/owner?tab=topups" className="block">
          <StatCard
            label="Pending top-ups"
            value={String(pending)}
            hint={pending > 0 ? "Click to review" : "Nothing waiting"}
          />
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Low stock</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">All visible products are well stocked.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-3">{p.name}</span>
                  <span className={p.stock < 1 ? "text-red-400 font-semibold" : "text-yellow-300 font-semibold"}>
                    {p.stock < 1 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/owner?tab=products" className="text-sm text-accent hover:underline mt-4 inline-block">
            Manage products →
          </Link>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Recent orders</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No orders yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">
                      {o.product.name} <span className="text-muted">× {o.qty}</span>
                    </p>
                    <p className="text-xs text-muted truncate">
                      {o.user.email} · {day(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold">{eur(o.totalCents)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/owner?tab=orders" className="text-sm text-accent hover:underline mt-4 inline-block">
            All orders →
          </Link>
        </div>
      </div>
    </div>
  );
}
