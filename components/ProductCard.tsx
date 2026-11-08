import Link from "next/link";
import PriceTag from "./PriceTag";
import ProductImage from "./ProductImage";

export type CardProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  priceCents: number;
  stock: number;
  deliveryTime: string;
  warrantyTime: string;
  imageUrl: string | null;
  featured: boolean;
};

export default function ProductCard({ p }: { p: CardProduct }) {
  const out = p.stock < 1;
  const low = !out && p.stock <= 3;

  return (
    <Link
      href={`/product/${p.id}`}
      className="group card overflow-hidden flex flex-col transition hover:border-accent/50 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[16/10]">
        <ProductImage name={p.name} imageUrl={p.imageUrl} />
        <div className="absolute top-3 left-3 flex gap-2">
          {p.featured && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent2/90 text-white">Featured</span>
          )}
        </div>
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur ${
            out
              ? "bg-red-500/80 text-white"
              : low
              ? "bg-yellow-400/90 text-black"
              : "bg-black/60 text-accent border border-accent/30"
          }`}
        >
          {out ? "Out of stock" : low ? `Only ${p.stock} left` : "In stock"}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <span className="text-xs text-muted">{p.category}</span>
        <h3 className="font-display text-lg font-semibold mt-1 leading-snug">{p.name}</h3>
        <p className="text-sm text-muted line-clamp-2 mt-1">{p.description}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip">⚡ {p.deliveryTime}</span>
          <span className="chip">🛡 {p.warrantyTime}</span>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <PriceTag eurCents={p.priceCents} className="font-display text-2xl font-bold" />
          <span className="text-sm font-semibold text-accent transition group-hover:translate-x-0.5">
            {out ? "Details" : "Buy now"} →
          </span>
        </div>
      </div>
    </Link>
  );
}
