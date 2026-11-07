import { prisma } from "@/lib/prisma";
import { approveTopup, rejectTopup } from "@/lib/actions";
import { eur, fmtDate } from "@/lib/utils";
import { Card, StatusChip, btnGhost, btnPrimary } from "./ui";

export default async function Topups() {
  const [pending, history] = await Promise.all([
    prisma.topup.findMany({ where: { status: "PENDING" }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.topup.findMany({
      where: { status: { not: "PENDING" } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Waiting for payment">
        <p className="mb-4 text-xs text-muted">
          PayPal top-ups confirm themselves instantly, and crypto top-ups are checked in the background every few
          minutes. The buttons below are a manual fallback. Use them only if you have checked yourself that the
          payment arrived, for example when a customer sent a slightly wrong amount and the automatic match missed it.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Nothing is waiting.</p>
        ) : (
          <div className="flex flex-col">
            {pending.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 text-sm first:border-0 first:pt-0"
              >
                <div>
                  <p>
                    {t.user.email}, {eur(t.amountCents)} with {t.method}
                  </p>
                  <p className="text-xs text-muted">
                    {fmtDate(t.createdAt)}
                    {t.coin && t.cryptoAmount ? `, expects ${t.cryptoAmount} ${t.coin}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={approveTopup}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className={btnPrimary}>Confirm received</button>
                  </form>
                  <form action={rejectTopup}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className={btnGhost}>Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="History">
        {history.length === 0 ? (
          <p className="text-sm text-muted">No finished top-ups yet.</p>
        ) : (
          <div className="flex flex-col">
            {history.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-2.5 text-sm first:border-0 first:pt-0"
              >
                <div>
                  <p>{t.user.email}</p>
                  <p className="text-xs text-muted">{fmtDate(t.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span>
                    {eur(t.amountCents)} with {t.method}
                  </span>
                  <StatusChip status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
