import Link from "next/link";
import type { Prisma, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

type SP = { q?: string; category?: string; sort?: string };

const SORTS = [
  { key: "new", label: "Newest" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
] as const;

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const q = (searchParams.q || "").trim().slice(0, 60);
  const category = (searchParams.category || "").trim();
  const sort = searchParams.sort === "price_asc" || searchParams.sort === "price_desc" ? searchParams.sort : "new";
  const filtered = Boolean(q || category);

  const where: Prisma.ProductWhereInput = { active: true };
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc" ? { priceCents: "asc" } : sort === "price_desc" ? { priceCents: "desc" } : { createdAt: "desc" };

  const [products, everyActive, featured] = await Promise.all([
    prisma.product.findMany({ where, orderBy }),
    prisma.product.findMany({ where: { active: true }, select: { category: true } }),
    !filtered && sort === "new"
      ? prisma.product.findMany({ where: { active: true, featured: true }, orderBy: { createdAt: "desc" }, take: 3 })
      : Promise.resolve([] as Product[]),
  ]);

  const counts = new Map<string, number>();
  for (const p of everyActive) counts.set(p.category, (counts.get(p.category) || 0) + 1);
  const categories = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  function href(next: Partial<SP>) {
    const merged: SP = { q, category, sort: sort === "new" ? "" : sort, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/?${s}` : "/";
  }

  const pill = (active: boolean) =>
    `flex items-center justify-between gap-3 whitespace-nowrap px-3.5 py-2 rounded-xl text-sm border transition-colors ${
      active
        ? "bg-accent/10 border-accent/50 text-accent"
        : "border-border text-muted hover:text-white hover:border-white/20"
    }`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {!filtered && (
        <section className="relative overflow-hidden card px-6 py-10 sm:px-10 sm:py-14 mb-10">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-accent2/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
              Digital goods, <span className="text-accent">delivered fast.</span>
            </h1>
            <p className="mt-4 text-muted text-lg">
              Top up your balance with PayPal or crypto, pick a product and find your delivery in your account.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip">⚡ Delivery time on every product</span>
              <span className="chip">🛡 Warranty shown upfront</span>
              <span className="chip">💳 PayPal &amp; crypto</span>
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold mb-4">Featured</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside>
          <div className="lg:sticky lg:top-24">
            <p className="hidden lg:block text-xs uppercase tracking-wide text-muted mb-3">Categories</p>
            <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
              <Link href={href({ category: "" })} className={pill(!category)}>
                <span>All products</span>
                <span className="text-xs opacity-70">{everyActive.length}</span>
              </Link>
              {categories.map(([name, n]) => (
                <Link key={name} href={href({ category: name })} className={pill(category === name)}>
                  <span>{name}</span>
                  <span className="text-xs opacity-70">{n}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <section>
          <form action="/" method="get" className="flex gap-2 mb-4">
            {category && <input type="hidden" name="category" value={category} />}
            {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search products…"
              className="input flex-1"
              aria-label="Search products"
            />
            <button type="submit" className="btn-ghost">
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <p className="text-sm text-muted">
              {products.length} {products.length === 1 ? "product" : "products"}
              {category ? ` in ${category}` : ""}
              {q ? ` for “${q}”` : ""}
            </p>
            <div className="flex gap-2">
              {SORTS.map((s) => (
                <Link
                  key={s.key}
                  href={href({ sort: s.key === "new" ? "" : s.key })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    sort === s.key
                      ? "border-accent/50 text-accent bg-accent/10"
                      : "border-border text-muted hover:text-white"
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-display text-xl font-semibold">Nothing found</p>
              <p className="text-muted mt-1">
                {filtered ? "Try another search or category." : "No products yet. Add some from the dashboard."}
              </p>
              {filtered && (
                <Link href="/" className="btn-ghost mt-5">
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
