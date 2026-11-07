import { safeUrl } from "@/lib/utils";

export default function Footer({ siteName, supportUrl }: { siteName: string; supportUrl: string }) {
  const support = safeUrl(supportUrl);
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {siteName}. Prices in USD and GBP are estimates from live exchange rates. You always pay in EUR.
        </p>
        {support && (
          <a href={support} target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent">
            Contact support
          </a>
        )}
      </div>
    </footer>
  );
}
