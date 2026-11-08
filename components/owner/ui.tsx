// Small shared pieces for the owner dashboard (server-side, no state).

export const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
export const day = (d: Date) => d.toISOString().slice(0, 10);

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        step={step}
        min={min}
        className="input"
      />
    </div>
  );
}

export function Area({
  label,
  name,
  defaultValue,
  rows = 3,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-white outline-none transition-colors focus:border-accent"
      />
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-3xl font-bold mt-2">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
