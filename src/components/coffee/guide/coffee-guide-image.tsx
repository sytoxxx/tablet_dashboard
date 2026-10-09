import { IMAGE_SLOTS } from "@/lib/coffee/guide/parts";
import type { ImageSlotId } from "@/lib/coffee/guide/types";
import { cn } from "@/lib/utils";

/**
 * Shows the local image `public/coffee-guide/<slot>.png` (see docs/coffee-guide-sources.md
 * for where each one comes from). White card, the picture is never cropped.
 */
export function CoffeeGuideImage({
  slot,
  className,
}: {
  slot: ImageSlotId;
  className?: string;
}) {
  const info = IMAGE_SLOTS[slot];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[2rem] bg-white",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/coffee-guide/${info.file}`}
        alt={info.alt}
        className="h-full w-full object-contain"
        data-guide-image={slot}
        draggable={false}
      />
    </div>
  );
}
