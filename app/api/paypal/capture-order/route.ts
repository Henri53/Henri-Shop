import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { orderId } = await req.json();
  const topup = await prisma.topup.findUnique({ where: { paypalOrderId: orderId } });
  if (!topup || topup.userId !== session.user.id) {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }
  if (topup.status !== "PENDING") {
    return NextResponse.json({ ok: topup.status === "APPROVED" });
  }

  try {
    const result = await capturePayPalOrder(orderId);
    // Trust PayPal's own confirmed amount, not whatever the client claims.
    if (result.completed && Math.round(result.amountEur * 100) === topup.amountCents) {
      await prisma.$transaction([
        prisma.topup.update({ where: { id: topup.id }, data: { status: "APPROVED" } }),
        prisma.user.update({
          where: { id: topup.userId },
          data: { balanceCents: { increment: topup.amountCents } },
        }),
      ]);
      return NextResponse.json({ ok: true });
    }
    await prisma.topup.update({ where: { id: topup.id }, data: { status: "REJECTED" } });
    return NextResponse.json({ ok: false, error: "Payment was not completed." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "PayPal error." }, { status: 500 });
  }
}
