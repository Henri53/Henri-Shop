import Link from "next/link";
import type { Prisma, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createProduct, updateProduct, deleteProduct, duplicateProduct, toggleProductFlag, updateStock } from "@/lib/actions";
import { eur } from "@/lib/utils";
import ConfirmButton from "@/components/ConfirmButton";
import SubmitButton from "@/components/SubmitButton";
import ProductVisual from "@/components/ProductVisual";
import { Field, btnDanger, btnGhost, btnPrimary, inputCls, textareaCls } from "./ui";

function ProductFields({ p }: { p?: Product }) {
  return (
    <>
      <Field scope={p?.id} label="Name" name="name" defaultValue={p?.name} required />
      <Field scope={p?.id} label="Category" name="category" defaultValue={p?.category} list="owner-categories" required hint="Pick an existing one or type a new one." />
      <Field scope={p?.id} label="Price (EUR)" name="price" type="number" step="0.01" min="0" defaultValue={p ? (p.priceCents / 100).toFixed(2) : undefined} required />
      <Field scope={p?.id} label="Stock" name="stock" type="number" min="0" defaultValue={p ? String(p.stock) : undefined} required />
      <Field scope={p?.id} label="Image link" name="imageUrl" type="url" defaultValue={p?.imageUrl ?? undefined} placeholder="https://..." hint="Paste a link to an image. Leave empty for an automatic colour tile." />
      <Field scope={p?.id} label="Badge" name="badge" defaultValue={p?.badge ?? undefined} placeholder="e.g. New, Hot, Sale" hint="Short label shown on the product card." />
      <Field scope={p?.id} label="Delivery time" name="deliveryTime" defaultValue={p?.deliveryTime} placeholder="e.g. Instant, within 1 hour" />
      <Field scope={p?.id} label="Warranty" name="warrantyTime" defaultValue={p?.warrantyTime} placeholder="e.g. 24 hours, 7 days" />
      <div className="sm:col-span-2">
        <Field scope={p?.id} label="Origin" name="origin" defaultValue={p?.origin} placeholder="e.g. own subscription, self-created" hint="Shown on the product page. Leave empty to hide it." />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`description-${p?.id ?? "new"}`} className="mb-1 block text-sm text-muted">
          Short description
        </label>
        <textarea id={`description-${p?.id ?? "new"}`} name="description" defaultValue={p?.description} required rows={2} maxLength={300} className={textareaCls} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`longDescription-${p?.id ?? "new"}`} className="mb-1 block text-sm text-muted">
          Full description
        </label>
        <textarea id={`longDescription-${p?.id ?? "new"}`} name="longDescription" defaultValue={p?.longDescription} rows={5} className={textareaCls} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={p?.featured} /> Featured (shown first, with a badge)
      </label>
      {p && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={p.active} /> Visible in the shop
        </label>
      )}
    </>
  );
}

export default async function Products({ q }: { q: string }) {
  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }
  const [products, allForCategories] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ select: { category: true } }),
  ]);
  const categories = Array.from(new Set(allForCategories.map((p) => p.category))).sort();

  return (
    <div className="flex flex-col gap-6">
      <datalist id="owner-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <details className="rounded-2xl border border-border bg-card" open={allForCategories.length === 0}>
        <summary className="cursor-pointer px-5 py-4 font-display text-lg font-semibold sm:px-6">Add a product</summary>
        <form action={createProduct} className="grid gap-4 px-5 pb-6 sm:grid-cols-2 sm:px-6">
          <ProductFields />
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Adding…" className={btnPrimary}>
              Add product
            </SubmitButton>
          </div>
        </form>
      </details>

      <form action="/owner" method="get" role="search" className="flex gap-2">
        <input type="hidden" name="tab" value="products" />
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input id="product-search" name="q" defaultValue={q} placeholder="Search your products" className={inputCls} />
        <button className={btnGhost}>Search</button>
        {q && (
          <Link href="/owner?tab=products" className={`${btnGhost} flex items-center`}>
            Clear
          </Link>
        )}
      </form>

      {products.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          {q ? "No products match your search." : "No products yet. Add your first one above."}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-raised">
                <ProductVisual name={p.name} category={p.category} imageUrl={p.imageUrl} dimmed={!p.active} />
              </div>

              <div className="min-w-[160px] flex-1">
                <Link href={`/product/${p.id}`} className="font-medium hover:text-accent">
                  {p.name}
                </Link>
                <p className="text-xs text-muted">
                  {p.category}, {eur(p.priceCents)}
                </p>
              </div>

              <form action={updateStock} className="flex items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <label htmlFor={`stock-${p.id}`} className="text-sm text-muted">
                  Stock
                </label>
                <input
                  id={`stock-${p.id}`}
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={p.stock}
                  className="min-h-[40px] w-20 rounded-lg border border-border bg-raised px-3"
                />
                <SubmitButton pendingText="…" className={btnGhost}>
                  Save
                </SubmitButton>
              </form>

              <div className="flex items-center gap-2">
                <form action={toggleProductFlag}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="field" value="active" />
                  <input type="hidden" name="value" value={p.active ? "0" : "1"} />
                  <button
                    className={`min-h-[40px] rounded-lg border px-3 text-sm ${
                      p.active ? "border-good/50 text-good" : "border-border text-muted"
                    }`}
                    title={p.active ? "Click to hide from the shop" : "Click to show in the shop"}
                  >
                    {p.active ? "Visible" : "Hidden"}
                  </button>
                </form>
                <form action={toggleProductFlag}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="field" value="featured" />
                  <input type="hidden" name="value" value={p.featured ? "0" : "1"} />
                  <button
                    className={`min-h-[40px] rounded-lg border px-3 text-sm ${
                      p.featured ? "border-accent bg-accent font-medium text-black" : "border-border text-muted"
                    }`}
                    title={p.featured ? "Click to remove from featured" : "Click to feature this product"}
                  >
                    {p.featured ? "Featured" : "Feature"}
                  </button>
                </form>
              </div>
            </div>

            <details className="border-t border-border">
              <summary className="cursor-pointer px-4 py-3 text-sm text-muted hover:text-white">Edit details</summary>
              <div className="px-4 pb-5">
                <form action={updateProduct} className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={p.id} />
                  <ProductFields p={p} />
                  <div className="sm:col-span-2">
                    <SubmitButton pendingText="Saving…" className={btnPrimary}>
                      Save changes
                    </SubmitButton>
                  </div>
                </form>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <form action={duplicateProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className={btnGhost}>Duplicate</button>
                  </form>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton
                      message={`Delete "${p.name}"? Products that already have orders are hidden instead, so the order history stays intact.`}
                      className={btnDanger}
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
