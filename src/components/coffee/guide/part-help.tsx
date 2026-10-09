"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CoffeeGuideImage } from "@/components/coffee/guide/coffee-guide-image";
import { GUIDE_PARTS } from "@/lib/coffee/guide/parts";
import type { PartId } from "@/lib/coffee/guide/types";
import { cn } from "@/lib/utils";

/** "Welches Teil ist das?" — larger photo, name, one sentence. */
export function PartHelp({
  parts,
  onClose,
}: {
  parts: PartId[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<PartId>(parts[0]);
  const part = GUIDE_PARTS[selected];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portal to <body>: an animated ancestor would otherwise become the "fixed" container and clip the dialog.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welches Teil ist das?"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="grid max-h-full w-full max-w-5xl gap-6 overflow-y-auto rounded-[2rem] bg-[color:var(--bg)] p-6 shadow-2xl landscape-tablet:grid-cols-[1.15fr_1fr] landscape-tablet:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <CoffeeGuideImage
          key={part.image}
          slot={part.image}
          className="aspect-[4/3] w-full landscape-tablet:aspect-auto landscape-tablet:h-[calc(100dvh-7.5rem)] landscape-tablet:min-h-[22rem]"
        />
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-semibold tracking-[0.16em] text-[color:var(--quiet)] uppercase">
              Welches Teil ist das?
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface)] active:scale-95"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>

          {parts.length > 1 ? (
            <div className="flex flex-wrap gap-2" role="tablist">
              {parts.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={id === selected}
                  onClick={() => setSelected(id)}
                  className={cn(
                    "min-h-12 rounded-2xl px-4 text-base font-medium active:scale-[0.97]",
                    id === selected
                      ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                      : "bg-[color:var(--surface)]",
                  )}
                >
                  {GUIDE_PARTS[id].name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            <h2 className="font-display text-5xl tracking-tight">{part.name}</h2>
            <p className="text-lg text-[color:var(--quiet)]">{part.officialName}</p>
          </div>
          <p className="text-2xl leading-snug">{part.explanation}</p>

          <button
            type="button"
            onClick={onClose}
            className="mt-auto h-16 rounded-2xl bg-[color:var(--ink)] px-8 text-xl font-medium text-[color:var(--surface)] active:scale-[0.98]"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
