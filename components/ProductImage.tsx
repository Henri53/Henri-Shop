// Fills its parent (the parent must be `relative` and have a size).
// With an image URL it shows the picture, otherwise a generated gradient
// whose color comes from the product name, so every product looks distinct
// even before the owner uploads artwork.

function hueFor(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export default function ProductImage({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  const h = hueFor(name);
  return (
    <div
      className="absolute inset-0 grid place-items-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(${h} 55% 22%), hsl(${(h + 55) % 360} 55% 9%))`,
      }}
    >
      <div
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-30 blur-2xl"
        style={{ background: `hsl(${(h + 20) % 360} 80% 55%)` }}
      />
      <span className="relative font-display font-bold text-6xl text-white/90">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}
