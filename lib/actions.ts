"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getLiveRates } from "./rates";
import { WALLETS, DISAMBIGUATION } from "./wallets";

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Not authorized.");
  }
  return session;
}

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Please log in first.");
  return session;
}

// ---- Registration ----

export async function registerUser(
  _prevState: { error: string },
  formData: FormData
) {
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid e-mail address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (email === process.env.OWNER_EMAIL?.toLowerCase().trim()) {
    return { error: "This e-mail is reserved." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this e-mail already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, passwordHash, role: "CUSTOMER" },
  });

  redirect("/login?registered=1");
}

// ---- Products (owner only) ----

function productDataFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") || ""),
    category: String(formData.get("category") || ""),
    description: String(formData.get("description") || ""),
    longDescription: String(formData.get("longDescription") || ""),
    priceCents: Math.round(parseFloat(String(formData.get("price") || "0")) * 100),
    stock: parseInt(String(formData.get("stock") || "0"), 10) || 0,
    origin: String(formData.get("origin") || ""),
    deliveryTime: String(formData.get("deliveryTime") || ""),
    warrantyTime: String(formData.get("warrantyTime") || ""),
  };
}

export async function createProduct(formData: FormData) {
  await requireOwner();
  await prisma.product.create({ data: productDataFromForm(formData) });
  revalidatePath("/owner");
  revalidatePath("/");
}

export async function updateProduct(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  await prisma.product.update({
    where: { id },
    data: {
      ...productDataFromForm(formData),
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/owner");
  revalidatePath("/");
}

export async function deleteProduct(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  await prisma.product.delete({ where: { id } });
  revalidatePath("/owner");
  revalidatePath("/");
}

// ---- Balance top-ups (crypto) ----
// PayPal top-ups go through app/api/paypal/* instead — PayPal confirms the
// payment itself, so there's nothing to poll for.

export async function requestCryptoTopup(formData: FormData) {
  const session = await requireUser();
  const amountCents = Math.round(parseFloat(String(formData.get("amount") || "0")) * 100);
  const coin = String(formData.get("coin") || "") as keyof typeof WALLETS;
  if (!Number.isFinite(amountCents) || amountCents < 100) throw new Error("Minimum top-up is €1.00.");
  if (!WALLETS[coin]) throw new Error("Unknown coin.");

  const rates = await getLiveRates();
  // Never quote a payment amount from missing or outdated prices: the customer
  // would be told to send the wrong amount of coins.
  if (!rates.cryptoLive || !(rates.crypto[coin] > 0)) {
    throw new Error("Live crypto prices are unavailable right now. Please try again in a minute.");
  }
  const priceEur = rates.crypto[coin];
  const baseAmount = amountCents / 100 / priceEur;

  const { min, max, decimals } = DISAMBIGUATION[coin];
  const extra = min + Math.random() * (max - min);
  const cryptoAmount = (baseAmount + extra).toFixed(decimals);

  const topup = await prisma.topup.create({
    data: {
      userId: session.user.id,
      amountCents,
      method: coin,
      status: "PENDING",
      coin,
      cryptoAmount,
      address: WALLETS[coin],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour to pay
    },
  });
  revalidatePath("/account");
  return { id: topup.id, address: WALLETS[coin], cryptoAmount, coin };
}

export async function approveTopup(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const topup = await prisma.topup.findUnique({ where: { id } });
  if (!topup || topup.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.topup.update({ where: { id }, data: { status: "APPROVED" } }),
    prisma.user.update({
      where: { id: topup.userId },
      data: { balanceCents: { increment: topup.amountCents } },
    }),
  ]);
  revalidatePath("/owner");
  revalidatePath("/account");
}

export async function rejectTopup(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  await prisma.topup.update({ where: { id }, data: { status: "REJECTED" } });
  revalidatePath("/owner");
}

// ---- Buying with balance ----

export async function buyProduct(formData: FormData) {
  const session = await requireUser();
  const productId = String(formData.get("productId"));
  const qty = parseInt(String(formData.get("qty") || "1"), 10) || 1;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) throw new Error("This product is not available.");
  if (product.stock < qty) throw new Error("Not enough stock left.");

  const total = product.priceCents * qty;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.balanceCents < total) {
    throw new Error("Not enough balance. Top up your account first.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balanceCents: { decrement: total } },
    }),
    prisma.product.update({
      where: { id: product.id },
      data: { stock: { decrement: qty } },
    }),
    prisma.order.create({
      data: { userId: user.id, productId: product.id, qty, totalCents: total, status: "PAID" },
    }),
  ]);

  revalidatePath("/account");
  revalidatePath("/");
}
