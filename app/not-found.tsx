import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <p className="font-display text-6xl font-bold text-accent">404</p>
      <h1 className="font-display text-2xl font-bold mt-4">Page not found</h1>
      <p className="text-muted mt-2">This page doesn&apos;t exist or the product was removed.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to the shop
      </Link>
    </div>
  );
}
