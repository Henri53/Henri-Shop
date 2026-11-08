import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createProduct, updateProduct, deleteProduct, addStockItems } from "@/lib/actions";
import ProductImage from "../ProductImage";
import { Field, Area, eur } from "./ui";

function ProductFields({ p, keyed }: { p?: Product; keyed?: boolean }) {
  return (
    <>
      <Field label="Name" name="name" defaultValue={p?.name} required />
      <Field label="Category" name="category" defaultValue={p?.category} placeholder="e.g. Streaming, Software, Gaming" required />
      <Field
        label="Price (EUR)"
        name="price"
        type="number"
        step="0.01"
        min="0"
        defaultValue={p ? (p.priceCents / 100).toString() : undefined}
        required
      />
      {keyed ? (
        <div>
          <label className="label">Stock</label>
          <p className="min-h-[44px] flex items-center text-sm text-muted">
            Counted automatically from the unsold keys.
          </p>
        </div>
      ) : (
        <Field label="Stock" name="stock" type="number" min="0" defaultValue={p ? String(p.stock) : undefined} required />
      )}
      <Field label="Origin" name="origin" defaultValue={p?.origin} placeholder="e.g. own subscription, own license" required />
      <Field label="Delivery time" name="deliveryTime" defaultValue={p?.deliveryTime} placeholder="e.g. Instant, within 1 hour" required />
      <Field label="Warranty" name="warrantyTime" defaultValue={p?.warrantyTime} placeholder="e.g. 24 hours, 7 days" required />
      <Field
        label="Image URL (optional)"
        name="imageUrl"
        defaultValue={p?.imageUrl ?? ""}
        placeholder="https://… (png, jpg, webp)"
      />
      <div className="sm:col-span-2">
        <Area label="Short description" name="description" defaultValue={p?.description} rows={2} required />
      </div>
      <div className="sm:col-span-2">
        <Area label="Full description" name="longDescription" defaultValue={p?.longDescription} rows={4} required />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={p?.featured} className="accent-[#4ADE80]" />
        Show in the “Featured” row on the shop home page
      </label>
      {p && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={p.active} className="accent-[#4ADE80]" />
          Visible in shop
        </label>
      )}
    </>
  );
}

export default async function Products() {
  const [products, keyRows, orderRows] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.stockItem.findMany({ select: { productId: true, orderId: true } }),
    prisma.order.findMany({ select: { productId: true } }),
  ]);

  const keys = new Map<string, { total: number; unsold: number }>();
  for (const k of keyRows) {
    const cur = keys.get(k.productId) ?? { total: 0, unsold: 0 };
    cur.total += 1;
    if (!k.orderId) cur.unsold += 1;
    keys.set(k.productId, cur);
  }
  const ordered = new Set(orderRows.map((o) => o.productId));

  return (
    <div className="flex flex-col gap-6">
      <details className="card p-5" open={products.length === 0}>
        <summary className="cursor-pointer font-display text-lg font-semibold list-none [&::-webkit-details-marker]:hidden">
          + Add a product
        </summary>
        <form action={createProduct} className="grid sm:grid-cols-2 gap-4 mt-5">
          <ProductFields />
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Add product
            </button>
          </div>
        </form>
        <p className="text-xs text-muted mt-4">
          After adding, open the product below to paste a list of keys or logins. Each line is handed to one buyer
          automatically.
        </p>
      </details>

      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold mb-4">Your products ({products.length})</h2>
        {products.length === 0 && <p className="text-sm text-muted">No products yet.</p>}
        <div className="flex flex-col gap-3">
          {products.map((p) => {
            const k = keys.get(p.id);
            return (
              <details key={p.id} className="group rounded-xl border border-border bg-surface">
                <summary className="flex items-center gap-4 p-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                    <ProductImage name={p.name} imageUrl={p.imageUrl} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted truncate">
                      {p.category} · {eur(p.priceCents)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    {!p.active && <span className="chip">Hidden</span>}
                    {p.featured && <span className="chip">Featured</span>}
                    <span
                      className={`chip ${p.stock < 1 ? "!text-red-400 !border-red-500/40" : p.stock <= 2 ? "!text-yellow-300" : ""}`}
                    >
                      {p.stock} in stock
                    </span>
                  </div>
                  <span className="text-muted transition-transform group-open:rotate-90">›</span>
                </summary>

                <div className="p-4 border-t border-border grid lg:grid-cols-[1fr_320px] gap-6">
                  <form action={updateProduct} className="grid sm:grid-cols-2 gap-3 content-start">
                    <input type="hidden" name="id" value={p.id} />
                    <ProductFields p={p} keyed={Boolean(k)} />
                    <div className="sm:col-span-2 flex flex-wrap gap-2">
                      <button type="submit" className="btn-primary">
                        Save
                      </button>
                      <button type="submit" formAction={deleteProduct} className="btn-danger">
                        {ordered.has(p.id) ? "Hide from shop" : "Delete"}
                      </button>
                    </div>
                  </form>

                  <form action={addStockItems} className="flex flex-col gap-2 content-start">
                    <input type="hidden" name="productId" value={p.id} />
                    <p className="font-semibold">Key / code list</p>
                    <p className="text-xs text-muted">
                      {k
                        ? `${k.unsold} unsold, ${k.total - k.unsold} sold. Add more below.`
                        : "Optional. Paste one key, code or login per line and every buyer gets one instantly. Without a list you deliver by hand from the Orders tab."}
                    </p>
                    <textarea
                      name="items"
                      rows={8}
                      placeholder={"KEY-AAAA-1111\nKEY-BBBB-2222"}
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-white font-mono text-sm outline-none transition-colors focus:border-accent"
                    />
                    <button type="submit" className="btn-ghost">
                      Add to stock
                    </button>
                  </form>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
