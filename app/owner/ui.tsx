// Small building blocks shared by the owner dashboard sections.

export const inputCls =
  "w-full min-h-[44px] rounded-lg border border-border bg-raised px-3 text-white placeholder:text-muted/70";
export const textareaCls =
  "w-full rounded-lg border border-border bg-raised px-3 py-2 text-white placeholder:text-muted/70";
export const btnPrimary = "min-h-[40px] rounded-lg bg-accent px-4 text-sm font-semibold text-black";
export const btnGhost = "min-h-[40px] rounded-lg border border-border px-4 text-sm hover:border-accent/60";
export const btnDanger =
  "min-h-[40px] rounded-lg border border-bad/60 px-4 text-sm font-medium text-bad hover:bg-bad/10";

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  step,
  min,
  list,
  hint,
  scope,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  min?: string;
  list?: string;
  hint?: string;
  scope?: string; // makes the element id unique when the same form appears many times
}) {
  return (
    <div>
      <label htmlFor={`${scope ?? "new"}-${name}`} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <input
        id={`${scope ?? "new"}-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        step={step}
        min={min}
        list={list}
        className={inputCls}
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "border-accent/50 text-accent",
    DELIVERED: "border-good/50 text-good",
    CANCELLED: "border-border text-muted",
    PENDING: "border-accent/50 text-accent",
    APPROVED: "border-good/50 text-good",
    REJECTED: "border-bad/50 text-bad",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${styles[status] || "border-border text-muted"}`}>
      {status.toLowerCase()}
    </span>
  );
}
