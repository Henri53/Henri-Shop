const STYLES: Record<string, { label: string; className: string }> = {
  PAID: { label: "Processing", className: "bg-yellow-400/10 text-yellow-300 border-yellow-400/30" },
  DELIVERED: { label: "Delivered", className: "bg-accent/10 text-accent border-accent/30" },
  CANCELLED: { label: "Refunded", className: "bg-red-500/10 text-red-400 border-red-500/30" },
  PENDING: { label: "Pending", className: "bg-yellow-400/10 text-yellow-300 border-yellow-400/30" },
  APPROVED: { label: "Approved", className: "bg-accent/10 text-accent border-accent/30" },
  REJECTED: { label: "Rejected", className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? { label: status, className: "bg-white/5 text-muted border-border" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.className}`}>
      {s.label}
    </span>
  );
}
