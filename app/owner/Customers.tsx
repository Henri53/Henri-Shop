import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adjustBalance } from "@/lib/actions";
import { eur, fmtDate } from "@/lib/utils";
import SubmitButton from "@/components/SubmitButton";
import { btnGhost, btnPrimary, inputCls } from "./ui";

export default async function Customers({ q }: { q: string }) {
  const where: Prisma.UserWhereInput = {};
  if (q) where.email = { contains: q, mode: "insensitive" };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.user.count(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <form action="/owner" method="get" role="search" className="flex gap-2">
        <input type="hidden" name="tab" value="customers" />
        <label htmlFor="customer-search" className="sr-only">
          Search customers by e-mail
        </label>
        <input id="customer-search" name="q" defaultValue={q} placeholder="Search by e-mail" className={inputCls} />
        <button className={btnGhost}>Search</button>
        {q && (
          <Link href="/owner?tab=customers" className={`${btnGhost} flex items-center`}>
            Clear
          </Link>
        )}
      </form>

      <p className="text-sm text-muted">
        {q ? `${users.length} of ${total} customers match.` : `${total} customers. Showing the newest ${users.length}.`}
      </p>

      {users.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          {q ? "No customer matches that e-mail." : "No customers yet. They appear here after they register."}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="min-w-[200px]">
              <p className="font-medium">{u.email}</p>
              <p className="text-xs text-muted">
                Joined {fmtDate(u.createdAt)}, {u._count.orders} {u._count.orders === 1 ? "order" : "orders"}
              </p>
            </div>
            <p className="font-display text-2xl font-bold">{eur(u.balanceCents)}</p>
            <form action={adjustBalance} className="flex items-end gap-2">
              <input type="hidden" name="userId" value={u.id} />
              <div>
                <label htmlFor={`amount-${u.id}`} className="mb-1 block text-xs text-muted">
                  Add or remove balance (EUR)
                </label>
                <input
                  id={`amount-${u.id}`}
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="5.00 or -2.00"
                  className="min-h-[40px] w-36 rounded-lg border border-border bg-raised px-3"
                />
              </div>
              <SubmitButton pendingText="…" className={btnPrimary}>
                Apply
              </SubmitButton>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
