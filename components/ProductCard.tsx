import Link from "next/link";
import PriceTag from "./PriceTag";
import ProductVisual from "./ProductVisual";

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
  badge: string | null;
  featured: boolean;
};

const chip = "inline-flex items-center gap-1.5 rounded-full border border-border bg-raised px-2.5 py-1 text-xs text-muted";

export default function ProductCard({ p }: { p: CardProduct }) {
  const soldOut = p.stock < 1;
  const low = !soldOut && p.stock <= 3;

  return (
    <Link
      href={`/product/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-accent/60"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-raised">
        <ProductVisual name={p.name} category={p.category} imageUrl={p.imageUrl} dimmed={soldOut} />
        {(p.featured || p.badge) && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {p.featured && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-black">Featured</span>
            )}
            {p.badge && (
              <span className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                {p.badge}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>
            <span className={`h-1.5 w-1.5 rounded-full ${soldOut ? "bg-bad" : low ? "bg-accent" : "bg-good"}`} />
            {soldOut ? "Sold out" : low ? `Only ${p.stock} left` : "In stock"}
          </span>
          {p.deliveryTime && <span className={chip}>{p.deliveryTime}</span>}
          {p.warrantyTime && <span className={chip}>{p.warrantyTime} warranty</span>}
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold leading-snug">{p.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>
        </div>

        <div className="mt-auto flex items-end justify-between pt-1">
          <PriceTag eurCents={p.priceCents} className="font-display text-2xl font-bold" />
          <span className="text-sm font-medium text-accent group-hover:underline">
            {soldOut ? "View details" : "Buy now"}
          </span>
        </div>
      </div>
    </Link>
  );
}
