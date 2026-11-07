export function eur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

// Only allow normal web links. Anything else (javascript:, data:, ...) becomes "".
export function safeUrl(value: string): string {
  const s = value.trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function fmtDate(d: Date): string {
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
}

// "2026-11-07" in Berlin time, used to group orders per day
export function dayKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

// Stable colour per name, so every product without an image still gets its own tile.
export function hueFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) % 360;
  }
  return h;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
