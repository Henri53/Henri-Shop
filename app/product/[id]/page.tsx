import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import BuyBox from "@/components/BuyBox";
import ProductCard from "@/components/ProductCard";
import ProductVisual from "@/components/ProductVisual";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const [product, session, settings] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id } }),
    getServerSession(authOptions),
    getSettings(),
  ]);
  const isOwner = session?.user.role === "OWNER";
  // Hidden products are only visible to the owner (to preview them)
  if (!product || (!product.active && !isOwner)) notFound();

  let balanceCents: number | null = null;
  if (session && !isOwner) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { balanceCents: true } });
    balanceCents = u?.balanceCents ?? null;
  }

  const related = await prisma.product.findMany({
    where: { active: true, category: product.category, id: { not: product.id } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-white">
          Shop
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/?cat=${encodeURIComponent(product.category)}`} className="hover:text-white">
          {product.category}
        </Link>
      </nav>

      {!product.active && (
        <p className="mb-5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          This product is hidden. Only you can see this page.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-raised">
            <ProductVisual
              name={product.name}
              category={product.category}
              imageUrl={product.imageUrl}
              dimmed={product.stock < 1}
              large
            />
            {(product.featured || product.badge) && (
              <div className="absolute left-4 top-4 flex gap-2">
                {product.featured && (
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black">Featured</span>
                )}
                {product.badge && (
                  <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-medium backdrop-blur">
                    {product.badge}
                  </span>
                )}
              </div>
            )}
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <p className="mt-2 max-w-prose text-lg text-muted">{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Stock" value={product.stock > 0 ? `${product.stock} available` : "Sold out"} />
            {product.deliveryTime && <Fact label="Delivery" value={product.deliveryTime} />}
            {product.warrantyTime && <Fact label="Warranty" value={product.warrantyTime} />}
            {product.origin && <Fact label="Origin" value={product.origin} />}
          </dl>

          {product.longDescription && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-semibold">About this product</h2>
              <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-muted">{product.longDescription}</p>
            </section>
          )}
        </div>

        <BuyBox
          productId={product.id}
          priceCents={product.priceCents}
          stock={product.stock}
          balanceCents={balanceCents}
          isOwner={isOwner}
          paused={settings.purchasesPaused}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 font-display text-2xl font-bold">More in {product.category}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
