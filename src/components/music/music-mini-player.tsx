"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pause, Play, SkipForward } from "lucide-react";
import { AlbumArt } from "@/components/music/album-art";
import { useMusic } from "@/components/music/music-command-provider";
import { cn } from "@/lib/utils";

/**
 * Tiny Apple-like mini player — bottom-right, landscape tablet friendly.
 * Hidden on /musik itself and when nothing is selected. Never full-width
 * so it does not cover Meine Woche / Bus / Arbeit on the left stack.
 */
export function MusicMiniPlayer({ className }: { className?: string }) {
  const pathname = usePathname();
  const { ready, currentTrack, playback, togglePlay, next } = useMusic();

  if (!ready || !currentTrack) return null;
  if (pathname?.startsWith("/musik")) return null;
  // Access / login surfaces — no chrome noise.
  if (pathname?.startsWith("/login") || pathname?.startsWith("/api")) return null;

  const title = currentTrack.title;
  const artist = currentTrack.artist;
  const shortTitle =
    title.length > 22 ? `${title.slice(0, 20).trimEnd()}…` : title;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-40",
        "right-[max(0.75rem,env(safe-area-inset-right))]",
        "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-[15.5rem] items-center gap-2 rounded-2xl",
          "border border-[color:var(--hairline)] bg-[color:var(--surface)]/95",
          "px-2 py-1.5 shadow-sm backdrop-blur-sm",
          "animate-soft-in",
        )}
        role="region"
        aria-label="Musik Mini-Player"
      >
        <Link
          href="/musik"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
          aria-label={`${title} — ${artist}. Musik öffnen`}
        >
          <AlbumArt
            artwork={currentTrack.artwork}
            title={title}
            size="sm"
            className="!size-10 !rounded-lg !shadow-none"
          />
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-[color:var(--ink)]">
              {shortTitle}
            </span>
            <span className="block truncate text-xs text-[color:var(--quiet)]">
              {artist}
            </span>
          </span>
        </Link>
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-[color:var(--ink)] transition-transform active:scale-[0.94] hover:bg-[color:var(--surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
          aria-label={playback.isPlaying ? "Pause" : "Abspielen"}
          onClick={(e) => {
            e.preventDefault();
            togglePlay();
          }}
        >
          {playback.isPlaying ? (
            <Pause className="size-5" aria-hidden />
          ) : (
            <Play className="size-5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-[color:var(--ink)] transition-transform active:scale-[0.94] hover:bg-[color:var(--surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
          aria-label="Nächster Titel"
          onClick={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <SkipForward className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
