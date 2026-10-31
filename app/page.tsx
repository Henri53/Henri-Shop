import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PriceTag from "@/components/PriceTag";

export default async function ShopPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold mb-2">Shop</h1>
      <p className="text-muted mb-8">Pick a product, pay with PayPal or crypto, and get your login details.</p>

      {products.length === 0 && (
        <p className="text-muted">No products yet — add some from the owner dashboard.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/product/${p.id}`}
            className="block bg-card border border-border rounded-2xl p-5 hover:border-accent transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-muted mb-3">
              <span>{p.category}</span>
              <span>{p.stock > 0 ? "In stock" : "Out of stock"}</span>
            </div>
            <h2 className="font-display text-xl font-semibold mb-1">{p.name}</h2>
            <p className="text-sm text-muted line-clamp-2 mb-4">{p.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted mb-3">
              <span className="px-2 py-1 rounded bg-bg border border-border">{p.deliveryTime}</span>
              <span className="px-2 py-1 rounded bg-bg border border-border">{p.warrantyTime} warranty</span>
            </div>
            <PriceTag eurCents={p.priceCents} className="font-display text-2xl font-bold" />
          </Link>
        ))}
      </div>
    </div>
  );
}
