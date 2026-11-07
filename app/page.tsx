import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { safeUrl } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";

type SearchParams = { q?: string; cat?: string; sort?: string; stock?: string };

const SORTS: { key: string; label: string }[] = [
  { key: "new", label: "Newest" },
  { key: "low", label: "Price: low to high" },
  { key: "high", label: "Price: high to low" },
  { key: "name", label: "Name" },
];

// Builds a shop URL that keeps the current filters and changes only what you pass in.
function shopHref(params: SearchParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.cat) sp.set("cat", params.cat);
  if (params.sort && params.sort !== "new") sp.set("sort", params.sort);
  if (params.stock === "1") sp.set("stock", "1");
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

function CategoryLink({ label, count, active, to }: { label: string; count: number; active: boolean; to: string }) {
  return (
    <Link
      href={to}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
        active ? "border-accent/60 bg-accent/10 text-white" : "border-border bg-card text-muted hover:text-white"
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-muted">{count}</span>
    </Link>
  );
}

function Pill({ label, active, to }: { label: string; active: boolean; to: string }) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active ? "border-accent bg-accent text-black font-medium" : "border-border bg-card text-muted hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q || "").trim().slice(0, 60);
  const cat = (searchParams.cat || "").trim().slice(0, 60);
  const sort = SORTS.some((s) => s.key === searchParams.sort) ? (searchParams.sort as string) : "new";
  const inStockOnly = searchParams.stock === "1";
  const current: SearchParams = { q, cat, sort, stock: inStockOnly ? "1" : undefined };

  const where: Prisma.ProductWhereInput = { active: true };
  if (cat) where.category = cat;
  if (inStockOnly) where.stock = { gt: 0 };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "low"
      ? [{ priceCents: "asc" }]
      : sort === "high"
      ? [{ priceCents: "desc" }]
      : sort === "name"
      ? [{ name: "asc" }]
      : [{ featured: "desc" }, { createdAt: "desc" }];

  const [products, allActive, settings] = await Promise.all([
    prisma.product.findMany({ where, orderBy }),
    prisma.product.findMany({ where: { active: true }, select: { category: true } }),
    getSettings(),
  ]);

  const counts = new Map<string, number>();
  for (const row of allActive) counts.set(row.category, (counts.get(row.category) || 0) + 1);
  const categories = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const support = safeUrl(settings.supportUrl);
  const filtered = !!(q || cat || inStockOnly);
  const title = cat || (q ? `Results for “${q}”` : "All products");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      {settings.announcement && (
        <div role="status" className="mb-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          {settings.announcement}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-8">
        <aside className="mb-6 lg:mb-0">
          <div className="space-y-4 lg:sticky lg:top-24">
            <form action="/" method="get" role="search">
              {cat && <input type="hidden" name="cat" value={cat} />}
              {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
              {inStockOnly && <input type="hidden" name="stock" value="1" />}
              <label htmlFor="q" className="sr-only">
                Search products
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search products"
                className="min-h-[46px] w-full rounded-xl border border-border bg-card px-4 text-sm placeholder:text-muted"
              />
            </form>

            <nav
              aria-label="Categories"
              className="thin-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
            >
              <CategoryLink label="All products" count={allActive.length} active={!cat} to={shopHref({ ...current, cat: "" })} />
              {categories.map(([name, count]) => (
                <CategoryLink key={name} label={name} count={count} active={cat === name} to={shopHref({ ...current, cat: name })} />
              ))}
            </nav>
          </div>
        </aside>

        <main>
          <div className="mb-5">
            <h1 className="font-display text-3xl font-bold">{title}</h1>
            {!filtered && settings.tagline && <p className="mt-1 text-muted">{settings.tagline}</p>}
          </div>

          {support && (
            <a
              href={support}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-accent/60"
            >
              <span>
                <span className="font-medium">Can&apos;t find what you need?</span>{" "}
                <span className="text-muted">Ask support about a custom order.</span>
              </span>
              <span className="shrink-0 font-medium text-accent">Contact support</span>
            </a>
          )}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort and filter">
              {SORTS.map((s) => (
                <Pill key={s.key} label={s.label} active={sort === s.key} to={shopHref({ ...current, sort: s.key })} />
              ))}
              <Pill
                label="In stock only"
                active={inStockOnly}
                to={shopHref({ ...current, stock: inStockOnly ? undefined : "1" })}
              />
            </div>
            <p className="text-sm text-muted">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <p className="font-display text-xl font-semibold">{filtered ? "No products match." : "Nothing in the shop yet."}</p>
              <p className="mt-1 text-sm text-muted">
                {filtered ? "Try another search or remove a filter." : "New products will show up here soon."}
              </p>
              {filtered && (
                <Link href="/" className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black">
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
