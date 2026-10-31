import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopupPanel from "@/components/TopupPanel";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      orders: { include: { product: true }, orderBy: { createdAt: "desc" } },
      topups: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-8">Your account</h1>

      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <p className="text-sm text-muted">Balance</p>
        <p className="font-display text-4xl font-bold mt-1">€{(user.balanceCents / 100).toFixed(2)}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <h2 className="font-display text-xl font-semibold mb-4">Top up balance</h2>
        <TopupPanel />
        {user.topups.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 pt-2 border-t border-border">
            <p className="text-sm text-muted mb-1">Past top-ups</p>
            {user.topups.map((t) => (
              <div key={t.id} className="flex justify-between text-sm">
                <span>
                  €{(t.amountCents / 100).toFixed(2)} · {t.method}
                </span>
                <span
                  className={
                    t.status === "APPROVED"
                      ? "text-accent"
                      : t.status === "REJECTED"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-display text-xl font-semibold mb-4">Order history</h2>
        {user.orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
        <div className="flex flex-col gap-3">
          {user.orders.map((o) => (
            <div key={o.id} className="flex justify-between text-sm border-t border-border pt-3">
              <span>
                {o.product.name} × {o.qty}
              </span>
              <span>€{(o.totalCents / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
