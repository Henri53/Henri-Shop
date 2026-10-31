import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { amountEur } = await req.json();
  const amount = Number(amountEur);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  try {
    const orderId = await createPayPalOrder(amount);
    await prisma.topup.create({
      data: {
        userId: session.user.id,
        amountCents: Math.round(amount * 100),
        method: "PayPal",
        status: "PENDING",
        paypalOrderId: orderId,
      },
    });
    return NextResponse.json({ id: orderId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "PayPal error." }, { status: 500 });
  }
}
