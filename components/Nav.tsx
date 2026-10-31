import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignOutButton from "./SignOutButton";
import CurrencySwitcher from "./CurrencySwitcher";

export default async function Nav() {
  const session = await getServerSession(authOptions);

  return (
    <nav className="border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" className="font-display font-bold text-xl">
          Vaultline
        </Link>
        <div className="flex items-center gap-5 text-sm flex-wrap">
          <Link href="/" className="text-muted hover:text-white">
            Shop
          </Link>
          {session?.user.role === "OWNER" && (
            <Link href="/owner" className="text-muted hover:text-white">
              Owner dashboard
            </Link>
          )}
          <CurrencySwitcher />
          {session ? (
            <>
              <Link href="/account" className="text-muted hover:text-white">
                My account
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-white">
                Log in
              </Link>
              <Link href="/register" className="px-3 py-1.5 rounded-lg bg-accent text-black font-medium">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
