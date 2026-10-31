import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProduct, updateProduct, deleteProduct, approveTopup, rejectTopup } from "@/lib/actions";

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        step={step}
        className="w-full min-h-[44px] px-3 rounded-lg bg-bg border border-border text-white"
      />
    </div>
  );
}

export default async function OwnerPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const [products, pendingTopups] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.topup.findMany({
      where: { status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-8">Owner dashboard</h1>

      {pendingTopups.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <h2 className="font-display text-xl font-semibold mb-4">Pending top-ups</h2>
          <p className="mb-4 text-xs text-muted">
            PayPal top-ups confirm themselves instantly, and crypto top-ups are checked automatically in the
            background every few minutes. These buttons are only a manual fallback — use them only if you've
            personally verified the payment arrived (e.g. the customer sent the wrong exact amount and the
            automatic match missed it).
          </p>
          <div className="flex flex-col gap-3">
            {pendingTopups.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm first:border-0 first:pt-0"
              >
                <span>
                  {t.user.email} · €{(t.amountCents / 100).toFixed(2)} · {t.method}
                  {t.coin && t.cryptoAmount ? ` · ${t.cryptoAmount} ${t.coin}` : ""}
                </span>
                <div className="flex gap-2">
                  <form action={approveTopup}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="px-3 py-1.5 rounded-lg bg-accent text-black text-sm font-medium">
                      Confirm received
                    </button>
                  </form>
                  <form action={rejectTopup}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="px-3 py-1.5 rounded-lg border border-border text-sm">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <h2 className="font-display text-xl font-semibold mb-4">Add a product</h2>
        <form action={createProduct} className="grid sm:grid-cols-2 gap-4">
          <Field label="Name" name="name" required />
          <Field label="Category" name="category" required />
          <Field label="Price (EUR)" name="price" type="number" step="0.01" required />
          <Field label="Stock" name="stock" type="number" required />
          <Field label="Origin" name="origin" placeholder="e.g. self-created, own subscription" required />
          <Field label="Delivery time" name="deliveryTime" placeholder="e.g. Instant, within 1 hour" required />
          <Field label="Warranty time" name="warrantyTime" placeholder="e.g. 24 hours, 7 days" required />
          <div className="sm:col-span-2">
            <label className="block text-sm text-muted mb-1">Short description</label>
            <textarea
              name="description"
              required
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-muted mb-1">Full description</label>
            <textarea
              name="longDescription"
              required
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="min-h-[44px] px-5 rounded-lg bg-accent text-black font-semibold">
              Add product
            </button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-display text-xl font-semibold mb-4">Your products</h2>
        <div className="flex flex-col gap-6">
          {products.length === 0 && <p className="text-sm text-muted">No products yet.</p>}
          {products.map((p) => (
            <form
              key={p.id}
              action={updateProduct}
              className="grid sm:grid-cols-2 gap-3 border-t border-border pt-5 first:border-0 first:pt-0"
            >
              <input type="hidden" name="id" value={p.id} />
              <Field label="Name" name="name" defaultValue={p.name} required />
              <Field label="Category" name="category" defaultValue={p.category} required />
              <Field
                label="Price (EUR)"
                name="price"
                type="number"
                step="0.01"
                defaultValue={(p.priceCents / 100).toString()}
                required
              />
              <Field label="Stock" name="stock" type="number" defaultValue={p.stock.toString()} required />
              <Field label="Origin" name="origin" defaultValue={p.origin} required />
              <Field label="Delivery time" name="deliveryTime" defaultValue={p.deliveryTime} required />
              <Field label="Warranty time" name="warrantyTime" defaultValue={p.warrantyTime} required />
              <label className="flex items-center gap-2 text-sm self-end">
                <input type="checkbox" name="active" defaultChecked={p.active} /> Visible in shop
              </label>
              <div className="sm:col-span-2">
                <label className="block text-sm text-muted mb-1">Short description</label>
                <textarea
                  name="description"
                  defaultValue={p.description}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-muted mb-1">Full description</label>
                <textarea
                  name="longDescription"
                  defaultValue={p.longDescription}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-white"
                />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="min-h-[40px] px-4 rounded-lg bg-accent text-black text-sm font-semibold">
                  Save
                </button>
                <button
                  type="submit"
                  formAction={deleteProduct}
                  className="min-h-[40px] px-4 rounded-lg border border-red-500 text-red-400 text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
