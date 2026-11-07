import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Overview from "./Overview";
import Products from "./Products";
import Orders from "./Orders";
import Customers from "./Customers";
import Topups from "./Topups";
import Settings from "./Settings";

const TABS: { key: string; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "topups", label: "Top-ups" },
  { key: "settings", label: "Settings" },
];

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const tab = TABS.some((t) => t.key === searchParams.tab) ? (searchParams.tab as string) : "overview";
  const q = (searchParams.q || "").trim().slice(0, 80);
  const status = (searchParams.status || "").trim();

  let pending = 0;
  try {
    pending = await prisma.topup.count({ where: { status: "PENDING" } });
  } catch {
    pending = 0;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Owner dashboard</h1>
        <Link href="/" className="text-sm text-muted hover:text-white">
          View the shop
        </Link>
      </div>

      <nav
        aria-label="Dashboard sections"
        className="thin-scroll -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/owner?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`relative shrink-0 px-4 py-3 text-sm ${
                active
                  ? "font-medium text-white after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-accent"
                  : "text-muted hover:text-white"
              }`}
            >
              {t.label}
              {t.key === "topups" && pending > 0 && (
                <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-black">{pending}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {tab === "overview" && <Overview />}
      {tab === "products" && <Products q={q} />}
      {tab === "orders" && <Orders status={status} />}
      {tab === "customers" && <Customers q={q} />}
      {tab === "topups" && <Topups />}
      {tab === "settings" && <Settings />}
    </div>
  );
}
