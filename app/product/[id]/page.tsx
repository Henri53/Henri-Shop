import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buyProduct } from "@/lib/actions";
import PriceTag from "@/components/PriceTag";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <a href="/" className="text-sm text-muted">
        &larr; Back to shop
      </a>

      <div className="mt-6 grid sm:grid-cols-2 gap-8">
        <div>
          <span className="text-xs text-muted">{product.category}</span>
          <h1 className="font-display text-3xl font-bold mt-1 mb-4">{product.name}</h1>
          <p className="text-muted leading-relaxed mb-6 whitespace-pre-line">{product.longDescription}</p>

          <div className="grid grid-cols-2 gap-4 bg-card border border-border rounded-xl p-4 text-sm">
            <div>
              <p className="text-muted text-xs uppercase tracking-wide">Origin</p>
              <p className="mt-1">{product.origin}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide">Delivery</p>
              <p className="mt-1">{product.deliveryTime}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide">Warranty</p>
              <p className="mt-1">{product.warrantyTime}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide">Stock</p>
              <p className="mt-1">{product.stock}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 h-fit">
          <PriceTag eurCents={product.priceCents} className="font-display text-3xl font-bold" />

          {session ? (
            <form action={buyProduct} className="mt-4">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="qty" value="1" />
              <button
                type="submit"
                disabled={product.stock < 1}
                className="w-full min-h-[48px] rounded-xl bg-accent text-black font-semibold disabled:opacity-50"
              >
                {product.stock < 1 ? "Out of stock" : "Buy with balance"}
              </button>
            </form>
          ) : (
            <a
              href="/login"
              className="mt-4 block text-center w-full min-h-[48px] leading-[48px] rounded-xl bg-accent text-black font-semibold"
            >
              Log in to buy
            </a>
          )}
          <p className="mt-3 text-xs text-muted">Paid from your account balance — top up on your account page.</p>
        </div>
      </div>
    </div>
  );
}
