"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getLiveRates } from "./rates";
import { WALLETS, DISAMBIGUATION } from "./wallets";
import { getSettings } from "./settings";
import { safeUrl } from "./utils";

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

const text = (fd: FormData, key: string, max = 200) => String(fd.get(key) || "").trim().slice(0, max);

function productDataFromForm(formData: FormData) {
  const price = parseFloat(text(formData, "price", 20).replace(",", "."));
  const stock = parseInt(text(formData, "stock", 10), 10);
  return {
    name: text(formData, "name", 120),
    category: text(formData, "category", 60),
    description: text(formData, "description", 300),
    longDescription: text(formData, "longDescription", 5000),
    priceCents: Number.isFinite(price) ? Math.max(0, Math.round(price * 100)) : 0,
    stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
    origin: text(formData, "origin", 120),
    deliveryTime: text(formData, "deliveryTime", 80),
    warrantyTime: text(formData, "warrantyTime", 80),
    imageUrl: safeUrl(text(formData, "imageUrl", 500)) || null,
    badge: text(formData, "badge", 16) || null,
    featured: formData.get("featured") === "on",
  };
}

function refreshShop() {
  revalidatePath("/owner");
  revalidatePath("/");
}

export async function createProduct(formData: FormData) {
  await requireOwner();
  const data = productDataFromForm(formData);
  if (!data.name || !data.category) return;
  await prisma.product.create({ data: { ...data, active: true } });
  refreshShop();
}

export async function updateProduct(formData: FormData) {
  await requireOwner();
  const id = text(formData, "id", 60);
  const data = productDataFromForm(formData);
  if (!id || !data.name || !data.category) return;
  await prisma.product.update({
    where: { id },
    data: { ...data, active: formData.get("active") === "on" },
  });
  refreshShop();
  revalidatePath(`/product/${id}`);
}

export async function deleteProduct(formData: FormData) {
  await requireOwner();
  const id = text(formData, "id", 60);
  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    // Products that already have orders cannot be deleted (the orders point at
    // them). Hide them instead, so order history stays intact.
    await prisma.product.update({ where: { id }, data: { active: false, featured: false } });
  }
  refreshShop();
}

export async function duplicateProduct(formData: FormData) {
  await requireOwner();
  const id = text(formData, "id", 60);
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return;
  await prisma.product.create({
    data: {
      name: `${p.name} (copy)`.slice(0, 120),
      category: p.category,
      description: p.description,
      longDescription: p.longDescription,
      priceCents: p.priceCents,
      stock: 0,
      origin: p.origin,
      deliveryTime: p.deliveryTime,
      warrantyTime: p.warrantyTime,
      imageUrl: p.imageUrl,
      badge: p.badge,
      featured: false,
      active: false, // copies start hidden until you have checked them
    },
  });
  refreshShop();
}

// One-click switches on the product list: "active" (visible) or "featured".
export async function toggleProductFlag(formData: FormData) {
  await requireOwner();
  const id = text(formData, "id", 60);
  const field = text(formData, "field", 20);
  const value = text(formData, "value", 1) === "1";
  if (field !== "active" && field !== "featured") return;
  await prisma.product.update({
    where: { id },
    data: field === "active" ? { active: value } : { featured: value },
  });
  refreshShop();
  revalidatePath(`/product/${id}`);
}

export async function updateStock(formData: FormData) {
  await requireOwner();
  const id = text(formData, "id", 60);
  const stock = parseInt(text(formData, "stock", 10), 10);
  if (!id || !Number.isFinite(stock) || stock < 0) return;
  await prisma.product.update({ where: { id }, data: { stock } });
  refreshShop();
  revalidatePath(`/product/${id}`);
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

// Errors we want the customer to read. Everything else becomes a generic message.
function shopError(message: string) {
  const e = new Error(message) as Error & { shop: true };
  e.shop = true;
  return e;
}

export async function buyProduct(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please log in first." };
  if (session.user.role === "OWNER") {
    return { error: "The owner account can't buy. Log in with a customer account." };
  }

  const productId = text(formData, "productId", 60);
  const qty = Math.min(10, Math.max(1, parseInt(text(formData, "qty", 3), 10) || 1));

  const settings = await getSettings();
  if (settings.purchasesPaused) {
    return { error: "Purchases are paused for a moment. Please try again later." };
  }

  const userId = session.user.id;
  let orderId: string;
  try {
    // Everything happens in one transaction, and balance and stock are checked
    // inside the update itself. Two people buying the last item at the same
    // moment can never both succeed, and nobody can spend the same balance twice.
    orderId = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.active) throw shopError("This product is not available.");
      if (product.stock < qty) throw shopError("Not enough stock left.");

      const total = product.priceCents * qty;

      const paid = await tx.user.updateMany({
        where: { id: userId, balanceCents: { gte: total } },
        data: { balanceCents: { decrement: total } },
      });
      if (paid.count !== 1) throw shopError("Not enough balance. Top up your account first.");

      const reserved = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (reserved.count !== 1) throw shopError("Not enough stock left.");

      const order = await tx.order.create({
        data: { userId, productId: product.id, qty, totalCents: total, status: "PAID" },
      });
      return order.id;
    });
  } catch (err) {
    if ((err as { shop?: boolean })?.shop) return { error: (err as Error).message };
    console.error("buyProduct failed", err);
    return { error: "Something went wrong. You were not charged. Please try again." };
  }

  revalidatePath("/account");
  revalidatePath("/");
  redirect(`/account?purchased=${orderId}`);
}

// ---- Orders, customers and settings (owner only) ----

export async function deliverOrder(formData: FormData) {
  await requireOwner();
  const id = text(formData, "id", 60);
  const info = text(formData, "deliveryInfo", 5000);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.status === "CANCELLED") return;
  await prisma.order.update({
    where: { id },
    data: {
      status: "DELIVERED",
      deliveryInfo: info || null,
      deliveredAt: order.deliveredAt ?? new Date(),
    },
  });
  revalidatePath("/owner");
  revalidatePath("/account");
}

// Cancel an order and give the money back. Stock only returns to the shop if
// the order was not delivered yet (a delivered item is gone).
export async function cancelOrder(formData: FormData) {
  await requireOwner();
  const id = text(formData, "id", 60);
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order || order.status === "CANCELLED") return;
    const res = await tx.order.updateMany({
      where: { id, status: order.status },
      data: { status: "CANCELLED" },
    });
    if (res.count !== 1) return;
    await tx.user.update({
      where: { id: order.userId },
      data: { balanceCents: { increment: order.totalCents } },
    });
    if (order.status === "PAID") {
      await tx.product.update({
        where: { id: order.productId },
        data: { stock: { increment: order.qty } },
      });
    }
  });
  revalidatePath("/owner");
  revalidatePath("/account");
  revalidatePath("/");
}

// Add (or, with a minus, remove) balance for a customer.
export async function adjustBalance(formData: FormData) {
  await requireOwner();
  const userId = text(formData, "userId", 60);
  const amount = Math.round(parseFloat(text(formData, "amount", 20).replace(",", ".")) * 100);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000000) return;
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.balanceCents + amount < 0) return;
    await tx.user.update({ where: { id: userId }, data: { balanceCents: { increment: amount } } });
  });
  revalidatePath("/owner");
  revalidatePath("/account");
}

export async function saveSettings(formData: FormData) {
  await requireOwner();
  const entries: [string, string][] = [
    ["siteName", text(formData, "siteName", 40) || "Vaultline"],
    ["tagline", text(formData, "tagline", 160)],
    ["announcement", text(formData, "announcement", 300)],
    ["supportUrl", safeUrl(text(formData, "supportUrl", 300))],
    ["purchasesPaused", formData.get("purchasesPaused") === "on" ? "1" : "0"],
  ];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );
  revalidatePath("/", "layout");
}
