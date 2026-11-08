import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Overview from "@/components/owner/Overview";
import Products from "@/components/owner/Products";
import Orders from "@/components/owner/Orders";
import Customers from "@/components/owner/Customers";
import Topups from "@/components/owner/Topups";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "topups", label: "Top-ups" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function OwnerPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const tab: TabKey = TABS.find((t) => t.key === searchParams.tab)?.key ?? "overview";
  const pending = await prisma.topup.count({ where: { status: "PENDING" } });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Manage products, stock, orders and customers.</p>
        </div>
        <Link href="/" className="btn-ghost">
          View shop
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border mb-8">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? "/owner" : `/owner?tab=${t.key}`}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-accent text-white" : "border-transparent text-muted hover:text-white"
            }`}
          >
            {t.label}
            {t.key === "topups" && pending > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-yellow-400 text-black font-semibold">
                {pending}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <Overview />}
      {tab === "products" && <Products />}
      {tab === "orders" && <Orders />}
      {tab === "customers" && <Customers />}
      {tab === "topups" && <Topups />}
    </div>
  );
}
