import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eur, fmtDate } from "@/lib/utils";
import TopupPanel from "@/components/TopupPanel";

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PAID: { label: "Paid, waiting for delivery", className: "text-accent" },
  DELIVERED: { label: "Delivered", className: "text-good" },
  CANCELLED: { label: "Cancelled and refunded", className: "text-muted" },
};

const TOPUP_STATUS: Record<string, string> = {
  APPROVED: "text-good",
  REJECTED: "text-bad",
  PENDING: "text-accent",
};

export default async function AccountPage({ searchParams }: { searchParams: { purchased?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "OWNER") redirect("/owner");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      orders: { include: { product: true }, orderBy: { createdAt: "desc" } },
      topups: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) redirect("/login");

  const justBought = searchParams.purchased ? user.orders.find((o) => o.id === searchParams.purchased) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-3xl font-bold">Your account</h1>

      {justBought && (
        <div role="status" className="mb-8 rounded-2xl border border-good/40 bg-good/10 p-5">
          <p className="font-display text-lg font-semibold">
            Order placed: {justBought.product.name}
            {justBought.qty > 1 ? ` × ${justBought.qty}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted">
            {justBought.deliveryInfo
              ? "Your details are in the order list below."
              : "Your details will appear in the order list below as soon as the order is delivered."}
          </p>
        </div>
      )}

      <div className="mb-8 flex items-end justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted">Balance</p>
          <p className="mt-1 font-display text-4xl font-bold">{eur(user.balanceCents)}</p>
        </div>
        <Link href="#topup" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black">
          Top up
        </Link>
      </div>

      <section id="topup" className="mb-8 scroll-mt-24 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">Top up balance</h2>
        <TopupPanel />
        {user.topups.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
            <p className="mb-1 text-sm text-muted">Past top-ups</p>
            {user.topups.map((t) => (
              <div key={t.id} className="flex justify-between gap-4 text-sm">
                <span>
                  {eur(t.amountCents)} with {t.method}
                </span>
                <span className={TOPUP_STATUS[t.status] || "text-muted"}>{t.status.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">Orders</h2>
        {user.orders.length === 0 && (
          <p className="text-sm text-muted">
            No orders yet.{" "}
            <Link href="/" className="text-accent hover:underline">
              Browse the shop
            </Link>
          </p>
        )}
        <div className="flex flex-col">
          {user.orders.map((o) => {
            const status = ORDER_STATUS[o.status] || { label: o.status, className: "text-muted" };
            return (
              <div key={o.id} className="border-t border-border py-4 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {o.product.name}
                      {o.qty > 1 ? ` × ${o.qty}` : ""}
                    </p>
                    <p className="text-xs text-muted">{fmtDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{eur(o.totalCents)}</p>
                    <p className={`text-xs ${status.className}`}>{status.label}</p>
                  </div>
                </div>
                {o.deliveryInfo && o.status !== "CANCELLED" && (
                  <div className="mt-3 rounded-xl border border-border bg-raised p-4">
                    <p className="mb-1 text-xs text-muted">Your details</p>
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm">{o.deliveryInfo}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
