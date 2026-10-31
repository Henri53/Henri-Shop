import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findPayment } from "@/lib/chain";

// Triggered on a schedule (see README — Vercel Cron or an external cron
// service) to check public block explorers for incoming crypto top-ups and
// credit balances automatically once a matching, confirmed payment shows up.
// Protected by CRON_SECRET so nobody else can trigger it or spam the chain
// explorers through your app.

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const pending = await prisma.topup.findMany({
    where: {
      status: "PENDING",
      coin: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  const results: Record<string, string> = {};

  for (const t of pending) {
    if (!t.coin || !t.address || !t.cryptoAmount) continue;
    try {
      const match = await findPayment(
        t.coin as "BTC" | "LTC" | "SOL",
        t.address,
        parseFloat(t.cryptoAmount),
        t.createdAt.getTime()
      );
      if (!match || !match.confirmed) {
        results[t.id] = match ? "seen, waiting for confirmations" : "no match yet";
        continue;
      }

      // Make sure this on-chain transaction hasn't already been used for
      // another top-up (txId is unique in the schema, so the update below
      // would fail anyway — this just lets us skip cleanly).
      const alreadyUsed = await prisma.topup.findUnique({ where: { txId: match.txId } });
      if (alreadyUsed) {
        results[t.id] = "tx already used";
        continue;
      }

      await prisma.$transaction([
        prisma.topup.update({
          where: { id: t.id },
          data: { status: "APPROVED", txId: match.txId },
        }),
        prisma.user.update({
          where: { id: t.userId },
          data: { balanceCents: { increment: t.amountCents } },
        }),
      ]);
      results[t.id] = "approved";
    } catch (err: any) {
      results[t.id] = `error: ${err.message}`;
    }
  }

  // Quietly expire anything the customer never paid within the window.
  await prisma.topup.updateMany({
    where: { status: "PENDING", coin: { not: null }, expiresAt: { lt: new Date() } },
    data: { status: "REJECTED" },
  });

  return NextResponse.json({ checked: pending.length, results });
}
