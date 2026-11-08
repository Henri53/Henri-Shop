"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getLiveRates } from "./rates";
import { WALLETS, DISAMBIGUATION } from "./wallets";

// Errors we want to show to the customer as-is. Everything else becomes a
// generic message so no internals leak.
class ShopError extends Error {}

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

function refreshShop() {
  revalidatePath("/");
  revalidatePath("/owner");
  revalidatePath("/account");
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

function cleanUrl(value: FormDataEntryValue | null) {
  const s = String(value || "").trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s.slice(0, 500) : null;
}

function productDataFromForm(formData: FormData) {
  const price = parseFloat(String(formData.get("price") || "0"));
  return {
    name: String(formData.get("name") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    description: String(formData.get("description") || ""),
    longDescription: String(formData.get("longDescription") || ""),
    priceCents: Number.isFinite(price) ? Math.max(0, Math.round(price * 100)) : 0,
    stock: Math.max(0, parseInt(String(formData.get("stock") || "0"), 10) || 0),
    origin: String(formData.get("origin") || ""),
    deliveryTime: String(formData.get("deliveryTime") || ""),
    warrantyTime: String(formData.get("warrantyTime") || ""),
    imageUrl: cleanUrl(formData.get("imageUrl")),
    featured: formData.get("featured") === "on",
  };
}

export async function createProduct(formData: FormData) {
  await requireOwner();
  await prisma.product.create({ data: productDataFromForm(formData) });
  refreshShop();
}

export async function updateProduct(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const data = productDataFromForm(formData);

  // Products that deliver from a key list always show the real number of unsold keys.
  const keyCount = await prisma.stockItem.count({ where: { productId: id } });
  if (keyCount > 0) {
    data.stock = await prisma.stockItem.count({ where: { productId: id, orderId: null } });
  }

  await prisma.product.update({
    where: { id },
    data: { ...data, active: formData.get("active") === "on" },
  });
  refreshShop();
}

// A product that was ever ordered can't be deleted without breaking the order
// history, so it is hidden from the shop instead.
export async function deleteProduct(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const orders = await prisma.order.count({ where: { productId: id } });
  if (orders > 0) {
    await prisma.product.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.product.delete({ where: { id } });
  }
  refreshShop();
}

// One key/code/login per line. Adds them as unsold stock and syncs the counter.
export async function addStockItems(formData: FormData) {
  await requireOwner();
  const productId = String(formData.get("productId") || "");
  const lines = String(formData.get("items") || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2000)
    .map((l) => l.slice(0, 2000));
  if (!productId || lines.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.stockItem.createMany({ data: lines.map((content) => ({ productId, content })) });
    const unsold = await tx.stockItem.count({ where: { productId, orderId: null } });
    await tx.product.update({ where: { id: productId }, data: { stock: unsold } });
  });
  refreshShop();
}

// ---- Orders (owner only) ----

// For products without a key list: the owner writes the delivery text by hand.
export async function deliverOrder(formData: FormData) {
  await requireOwner();
  const orderId = String(formData.get("orderId") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 4000);
  if (!orderId) return;
  await prisma.order.updateMany({
    where: { id: orderId, status: { in: ["PAID", "DELIVERED"] } },
    data: { status: "DELIVERED", deliveryNote: note || null },
  });
  refreshShop();
}

// Only undelivered orders can be refunded: money back, stock back.
export async function refundOrder(formData: FormData) {
  await requireOwner();
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return;

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PAID" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count !== 1) return;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    await tx.user.update({
      where: { id: order.userId },
      data: { balanceCents: { increment: order.totalCents } },
    });
    await tx.product.update({
      where: { id: order.productId },
      data: { stock: { increment: order.qty } },
    });
  });
  refreshShop();
}

// ---- Customers (owner only) ----

// Positive amount = credit, negative = deduct (never below zero).
export async function adjustBalance(formData: FormData) {
  await requireOwner();
  const userId = String(formData.get("userId") || "");
  const eur = parseFloat(String(formData.get("amount") || "0"));
  if (!userId || !Number.isFinite(eur)) return;
  const cents = Math.round(eur * 100);
  if (cents === 0 || Math.abs(cents) > 100_000_000) return;

  if (cents > 0) {
    await prisma.user.update({ where: { id: userId }, data: { balanceCents: { increment: cents } } });
  } else {
    await prisma.user.updateMany({
      where: { id: userId, balanceCents: { gte: -cents } },
      data: { balanceCents: { decrement: -cents } },
    });
  }
  refreshShop();
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

  await prisma.$transaction(async (tx) => {
    // Claim the top-up first so a double click can never credit it twice.
    const claimed = await tx.topup.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "APPROVED" },
    });
    if (claimed.count !== 1) return;
    const topup = await tx.topup.findUnique({ where: { id } });
    if (!topup) return;
    await tx.user.update({
      where: { id: topup.userId },
      data: { balanceCents: { increment: topup.amountCents } },
    });
  });
  refreshShop();
}

export async function rejectTopup(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  await prisma.topup.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED" } });
  revalidatePath("/owner");
}

// ---- Buying with balance ----

// Everything happens in one database transaction: money, stock and delivery
// either all succeed or none of them do, and the guarded updates make double
// clicks and parallel buyers safe.
export async function buyProduct(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please log in first." };
  if (session.user.role === "OWNER") {
    return { error: "The owner login can't buy. Use a customer account." };
  }

  const productId = String(formData.get("productId") || "");
  const qty = Math.min(10, Math.max(1, parseInt(String(formData.get("qty") || "1"), 10) || 1));
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.active) throw new ShopError("This product is not available.");
      if (product.stock < qty) throw new ShopError("Not enough stock left.");
      const total = product.priceCents * qty;

      const debit = await tx.user.updateMany({
        where: { id: userId, balanceCents: { gte: total } },
        data: { balanceCents: { decrement: total } },
      });
      if (debit.count === 0) throw new ShopError("Not enough balance. Top up your account first.");

      const taken = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (taken.count === 0) throw new ShopError("Not enough stock left.");

      const hasKeys = (await tx.stockItem.count({ where: { productId: product.id } })) > 0;
      const order = await tx.order.create({
        data: {
          userId,
          productId: product.id,
          qty,
          totalCents: total,
          status: hasKeys ? "DELIVERED" : "PAID",
        },
      });

      if (hasKeys) {
        const items = await tx.stockItem.findMany({
          where: { productId: product.id, orderId: null },
          orderBy: { createdAt: "asc" },
          take: qty,
        });
        if (items.length < qty) throw new ShopError("Not enough stock left.");
        for (const item of items) {
          const claimed = await tx.stockItem.updateMany({
            where: { id: item.id, orderId: null },
            data: { orderId: order.id, soldAt: new Date() },
          });
          if (claimed.count !== 1) {
            throw new ShopError("Someone just bought the last one. Please try again.");
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof ShopError) return { error: err.message };
    return { error: "Something went wrong. You were not charged. Please try again." };
  }

  refreshShop();
  redirect("/account?bought=1");
}
