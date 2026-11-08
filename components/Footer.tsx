export default function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-sm text-muted">
        <p>© {new Date().getFullYear()} Vaultline</p>
        <p>Prices in other currencies are approximate. Payments are always charged in EUR.</p>
      </div>
    </footer>
  );
}
