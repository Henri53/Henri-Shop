import { hueFor, initials } from "@/lib/utils";

// The product image, or a generated tile when there is none: a colour derived
// from the category plus the product's initials, so the grid never looks empty.
export default function ProductVisual({
  name,
  category,
  imageUrl,
  dimmed = false,
  large = false,
}: {
  name: string;
  category: string;
  imageUrl?: string | null;
  dimmed?: boolean;
  large?: boolean;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        className={`h-full w-full object-cover ${dimmed ? "grayscale opacity-50" : ""}`}
      />
    );
  }
  const h = hueFor(category || name);
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${dimmed ? "grayscale opacity-50" : ""}`}
      style={{
        background: `radial-gradient(120% 120% at 18% 8%, hsl(${h} 52% 27%) 0%, hsl(${(h + 55) % 360} 45% 11%) 72%)`,
      }}
      aria-hidden="true"
    >
      <span
        className={`select-none font-display font-bold ${large ? "text-8xl" : "text-6xl"}`}
        style={{ color: `hsl(${h} 70% 84% / 0.92)` }}
      >
        {initials(name)}
      </span>
    </div>
  );
}
