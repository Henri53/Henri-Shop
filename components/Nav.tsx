import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SignOutButton from "./SignOutButton";
import CurrencySwitcher from "./CurrencySwitcher";
import PriceTag from "./PriceTag";

export default async function Nav() {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user.role === "OWNER";

  // The owner login is not a database user, so only customers have a balance.
  let balanceCents: number | null = null;
  if (session && !isOwner) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balanceCents: true },
    });
    balanceCents = u?.balanceCents ?? 0;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 min-h-[64px] py-2 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-xl">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent text-black text-base">V</span>
          Vaultline
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4 text-sm flex-wrap">
          <Link href="/" className="text-muted hover:text-white transition-colors">
            Shop
          </Link>
          {isOwner && (
            <Link href="/owner" className="text-muted hover:text-white transition-colors">
              Dashboard
            </Link>
          )}
          <CurrencySwitcher />
          {session ? (
            <>
              {!isOwner && (
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-accent/60 transition-colors"
                >
                  <span className="text-muted">Balance</span>
                  <PriceTag eurCents={balanceCents ?? 0} className="font-semibold text-accent" />
                </Link>
              )}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-white transition-colors">
                Log in
              </Link>
              <Link href="/register" className="btn-primary !min-h-0 !px-4 py-1.5 text-sm">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
