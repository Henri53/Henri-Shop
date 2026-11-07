import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eur } from "@/lib/utils";
import SignOutButton from "./SignOutButton";
import CurrencySwitcher from "./CurrencySwitcher";

export default async function Nav({ siteName }: { siteName: string }) {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user.role === "OWNER";

  // Customers see their balance in the bar, so a top-up is one click away.
  let balanceCents: number | null = null;
  if (session && !isOwner) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { balanceCents: true },
      });
      balanceCents = u?.balanceCents ?? null;
    } catch {
      balanceCents = null;
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="10.5" r="2.2" fill="currentColor" />
            <path d="M12 12.5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {siteName}
        </Link>

        <nav className="flex items-center gap-3 text-sm sm:gap-5" aria-label="Main">
          <Link href="/" className="hidden text-muted hover:text-white sm:inline">
            Shop
          </Link>
          {isOwner && (
            <Link href="/owner" className="text-muted hover:text-white">
              Dashboard
            </Link>
          )}
          <CurrencySwitcher />
          {session ? (
            <>
              {balanceCents !== null && (
                <Link
                  href="/account#topup"
                  className="rounded-full border border-border bg-raised px-3 py-1.5 font-medium hover:border-accent/60"
                  title="Your balance. Click to top up."
                >
                  {eur(balanceCents)}
                </Link>
              )}
              <Link href="/account" className="text-muted hover:text-white">
                Account
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-white">
                Log in
              </Link>
              <Link href="/register" className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-black">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
