import { prisma } from "@/lib/prisma";
import { adjustBalance } from "@/lib/actions";
import { eur, day } from "./ui";

export default async function Customers() {
  const users = await prisma.user.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-display text-lg font-semibold">Customers ({users.length})</h2>
        <p className="text-sm text-muted">Use a negative amount to deduct. Balances never go below zero.</p>
      </div>

      {users.length === 0 && <p className="text-sm text-muted">Nobody has registered yet.</p>}

      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-semibold break-all">{u.email}</p>
              <p className="text-xs text-muted mt-0.5">
                Joined {day(u.createdAt)} · {u._count.orders} order{u._count.orders === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-xl font-bold text-accent">{eur(u.balanceCents)}</span>
              <form action={adjustBalance} className="flex gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="+5.00 or -5.00"
                  className="input !w-36"
                  aria-label={`Balance change for ${u.email}`}
                />
                <button type="submit" className="btn-ghost">
                  Apply
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
