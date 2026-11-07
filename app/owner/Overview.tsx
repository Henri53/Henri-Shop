import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { dayKey, eur, fmtDate } from "@/lib/utils";
import { Card, Stat, StatusChip } from "./ui";

type Day = { key: string; label: string; total: number };

export default async function Overview() {
  const [orders, customerCount, balanceSum, lowStock, lowStockCount, recent, pending, settings] = await Promise.all([
    prisma.order.findMany({ where: { status: { not: "CANCELLED" } }, select: { totalCents: true, createdAt: true } }),
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { balanceCents: true } }),
    prisma.product.findMany({ where: { active: true, stock: { lte: 3 } }, orderBy: { stock: "asc" }, take: 8 }),
    prisma.product.count({ where: { active: true, stock: { lte: 3 } } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: true, product: true } }),
    prisma.topup.count({ where: { status: "PENDING" } }),
    getSettings(),
  ]);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  let revenue = 0;
  let revenueWeek = 0;
  for (const o of orders) {
    revenue += o.totalCents;
    if (o.createdAt.getTime() >= now - 7 * DAY) revenueWeek += o.totalCents;
  }

  // Revenue per day for the last 14 days
  const days: Day[] = [];
  const byKey: Record<string, Day> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    const day: Day = {
      key: dayKey(d),
      label: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" }),
      total: 0,
    };
    days.push(day);
    byKey[day.key] = day;
  }
  for (const o of orders) {
    const row = byKey[dayKey(o.createdAt)];
    if (row) row.total += o.totalCents;
  }
  const max = Math.max(1, ...days.map((d) => d.total));

  return (
    <div className="flex flex-col gap-6">
      {pending > 0 && (
        <Link
          href="/owner?tab=topups"
          className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm hover:border-accent"
        >
          <span className="font-medium">
            {pending} top-up{pending === 1 ? "" : "s"} waiting.
          </span>{" "}
          <span className="text-muted">Crypto and PayPal confirm themselves. Open this only to check on a stuck one.</span>
        </Link>
      )}
      {settings.purchasesPaused && (
        <Link
          href="/owner?tab=settings"
          className="rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm hover:border-bad"
        >
          <span className="font-medium">Purchases are paused.</span>{" "}
          <span className="text-muted">Customers can browse but not buy. Turn this off in Settings.</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Revenue, all time" value={eur(revenue)} hint={`${orders.length} orders`} />
        <Stat label="Revenue, last 7 days" value={eur(revenueWeek)} />
        <Stat label="Customers" value={String(customerCount)} />
        <Stat label="Held as customer balance" value={eur(balanceSum._sum.balanceCents ?? 0)} hint="Money customers topped up and have not spent yet" />
        <Stat label="Low or sold out" value={String(lowStockCount)} hint="Active products with 3 or fewer left" />
        <Stat label="Waiting top-ups" value={String(pending)} />
      </div>

      <Card title="Revenue, last 14 days">
        <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Bar chart of revenue per day for the last 14 days">
          {days.map((d) => (
            <div key={d.key} className="flex h-full flex-1 items-end" title={`${d.label}: ${eur(d.total)}`}>
              <div
                className={`w-full rounded-t ${d.total > 0 ? "bg-accent" : "bg-raised"}`}
                style={{ height: `${d.total > 0 ? Math.max(6, (d.total / max) * 100) : 3}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          {days.map((d, i) => (
            <span key={d.key} className="flex-1 text-center text-[10px] text-muted">
              {i % 2 === 0 ? d.label.slice(0, 5) : ""}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Needs restocking" aside={<Link href="/owner?tab=products" className="text-sm text-accent hover:underline">All products</Link>}>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">Everything is stocked up.</p>
          ) : (
            <ul className="flex flex-col">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-t border-border py-2.5 text-sm first:border-0 first:pt-0">
                  <span>{p.name}</span>
                  <span className={p.stock < 1 ? "text-bad" : "text-accent"}>{p.stock < 1 ? "Sold out" : `${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest orders" aside={<Link href="/owner?tab=orders" className="text-sm text-accent hover:underline">All orders</Link>}>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="flex flex-col">
              {recent.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 border-t border-border py-2.5 text-sm first:border-0 first:pt-0">
                  <div>
                    <p>
                      {o.product.name}
                      {o.qty > 1 ? ` × ${o.qty}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {o.user.email}, {fmtDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{eur(o.totalCents)}</p>
                    <StatusChip status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
