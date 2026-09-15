import { cn } from "@/lib/utils";

/** Calm local gradient placeholders — no remote album art / Spotify CDN. */
const ARTWORK: Record<string, string> = {
  "sage-mist":
    "linear-gradient(145deg, #7a9e96 0%, #c5d5cf 48%, #e8efe9 100%)",
  "warm-clay":
    "linear-gradient(145deg, #a8785c 0%, #d4b29a 50%, #f0e4d8 100%)",
  "sky-blue":
    "linear-gradient(145deg, #5b7fa8 0%, #a8c0d8 52%, #e4eef6 100%)",
  "ink-slate":
    "linear-gradient(145deg, #3a4554 0%, #6b7788 48%, #c5ccd6 100%)",
  "cool-teal":
    "linear-gradient(145deg, #3d7a78 0%, #7eb0ad 50%, #d5e8e6 100%)",
  "dusk-violet":
    "linear-gradient(145deg, #5a5478 0%, #9a93b5 50%, #e0dceb 100%)",
  "leaf-green":
    "linear-gradient(145deg, #5f8a5a 0%, #a3c49e 50%, #e4efe2 100%)",
  "peach-haze":
    "linear-gradient(145deg, #c48a72 0%, #e0b9a4 50%, #f5e8df 100%)",
  "ember-brown":
    "linear-gradient(145deg, #6e4a38 0%, #a87a5c 48%, #e0c8b4 100%)",
  "lamp-gold":
    "linear-gradient(145deg, #8a7340 0%, #c4a96a 50%, #efe4c8 100%)",
  "indigo-night":
    "linear-gradient(145deg, #2c3550 0%, #5a6788 48%, #b8c0d4 100%)",
};

const FALLBACK =
  "linear-gradient(145deg, #627084 0%, #a8b4c4 50%, #e6ebf1 100%)";

export function AlbumArt({
  artwork,
  title,
  size = "lg",
  className,
}: {
  artwork: string;
  title: string;
  size?: "lg" | "md" | "sm";
  className?: string;
}) {
  const bg = ARTWORK[artwork] ?? FALLBACK;
  const sizeClass =
    size === "lg"
      ? "aspect-square w-full max-w-[min(100%,20rem)] sm:max-w-[22rem]"
      : size === "md"
        ? "size-28 shrink-0 sm:size-32"
        : "size-20 shrink-0";

  return (
    <div
      role="img"
      aria-label={`Cover: ${title}`}
      className={cn(
        "rounded-[1.5rem] border border-[color:var(--hairline)] shadow-[0_8px_28px_rgba(28,36,48,0.08)]",
        sizeClass,
        className,
      )}
      style={{ background: bg }}
    />
  );
}
