import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductImage from "@/components/ProductImage";
import BuyForm from "@/components/BuyForm";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const [product, session] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id } }),
    getServerSession(authOptions),
  ]);
  const isOwner = session?.user.role === "OWNER";
  if (!product || (!product.active && !isOwner)) notFound();

  let balanceCents: number | null = null;
  if (session && !isOwner) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balanceCents: true },
    });
    balanceCents = u?.balanceCents ?? 0;
  }
  const mode = !session ? "guest" : isOwner ? "owner" : "customer";

  const specs = [
    { label: "Origin", value: product.origin, icon: "📦" },
    { label: "Delivery", value: product.deliveryTime, icon: "⚡" },
    { label: "Warranty", value: product.warrantyTime, icon: "🛡" },
    { label: "In stock", value: String(product.stock), icon: "🗂" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-sm text-muted flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">
          Shop
        </Link>
        <span>/</span>
        <Link href={`/?category=${encodeURIComponent(product.category)}`} className="hover:text-white transition-colors">
          {product.category}
        </Link>
      </div>

      {!product.active && (
        <p className="mt-4 text-sm rounded-lg border border-yellow-400/30 bg-yellow-400/10 text-yellow-300 px-4 py-2">
          This product is hidden from the shop. Only you can see this page.
        </p>
      )}

      <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div>
          <div className="relative aspect-[16/8] rounded-2xl overflow-hidden border border-border">
            <ProductImage name={product.name} imageUrl={product.imageUrl} />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-6">{product.name}</h1>
          <p className="text-muted mt-2">{product.description}</p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {specs.map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-xs uppercase tracking-wide text-muted">
                  {s.icon} {s.label}
                </p>
                <p className="mt-1.5 font-semibold break-words">{s.value}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">Details</h2>
          <p className="text-muted leading-relaxed whitespace-pre-line">{product.longDescription}</p>
        </div>

        <div className="card p-6 lg:sticky lg:top-24">
          <BuyForm
            productId={product.id}
            stock={product.stock}
            priceCents={product.priceCents}
            mode={mode}
            balanceCents={balanceCents}
          />
        </div>
      </div>
    </div>
  );
}
