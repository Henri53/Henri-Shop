import { prisma } from "@/lib/prisma";
import { approveTopup, rejectTopup } from "@/lib/actions";
import StatusBadge from "../StatusBadge";
import { eur, day } from "./ui";

export default async function Topups() {
  const [pending, history] = await Promise.all([
    prisma.topup.findMany({
      where: { status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.topup.findMany({
      where: { status: { not: "PENDING" } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold mb-2">Pending top-ups</h2>
        <p className="mb-4 text-xs text-muted">
          PayPal top-ups confirm themselves and crypto top-ups are matched in the background. These buttons are only a
          manual fallback: confirm only after you checked that the payment really arrived.
        </p>
        {pending.length === 0 && <p className="text-sm text-muted">Nothing pending.</p>}
        <div className="flex flex-col gap-3">
          {pending.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span className="break-all">
                {t.user.email} · <strong>{eur(t.amountCents)}</strong> · {t.method}
                {t.coin && t.cryptoAmount ? ` · ${t.cryptoAmount} ${t.coin}` : ""}
              </span>
              <div className="flex gap-2">
                <form action={approveTopup}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn-primary !min-h-0 py-2 text-sm">Confirm received</button>
                </form>
                <form action={rejectTopup}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn-ghost !min-h-0 py-2 text-sm">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold mb-4">History</h2>
        {history.length === 0 && <p className="text-sm text-muted">No finished top-ups yet.</p>}
        <div className="flex flex-col gap-2">
          {history.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="break-all">
                {t.user.email} · {eur(t.amountCents)} · {t.method}{" "}
                <span className="text-muted">· {day(t.createdAt)}</span>
              </span>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
