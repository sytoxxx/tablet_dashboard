"use client";

import {
  Bluetooth,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Speaker,
  Tablet,
  Wifi,
} from "lucide-react";
import { AlbumArt } from "@/components/music/album-art";
import { useMusic } from "@/components/music/music-command-provider";
import { MUSIC_CATEGORY_LABELS, formatMusicTime } from "@/lib/music";
import type { MusicDeviceKind, MusicPlaylist } from "@/lib/music";
import { cn } from "@/lib/utils";

function LoadingGate({ children }: { children: React.ReactNode }) {
  const { ready } = useMusic();
  if (!ready) return <MusicCenterSkeleton />;
  return <>{children}</>;
}

function MusicCenterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mx-auto aspect-square max-w-sm animate-pulse rounded-[1.75rem] bg-[color:var(--surface)]" />
      <div className="mx-auto h-8 w-2/3 animate-pulse rounded-xl bg-[color:var(--surface)]" />
      <div className="h-14 w-full animate-pulse rounded-2xl bg-[color:var(--surface)]" />
    </div>
  );
}

function DeviceIcon({ kind }: { kind: MusicDeviceKind }) {
  const cls = "size-5 shrink-0";
  if (kind === "tablet") return <Tablet className={cls} aria-hidden />;
  if (kind === "bluetooth") return <Bluetooth className={cls} aria-hidden />;
  if (kind === "wifi") return <Wifi className={cls} aria-hidden />;
  return <Speaker className={cls} aria-hidden />;
}

export function MusicCenter() {
  return (
    <LoadingGate>
      <MusicCenterReady />
    </LoadingGate>
  );
}

function MusicCenterReady() {
  const {
    source,
    playlists,
    devices,
    recentlyPlayed,
    playback,
    currentTrack,
    activeDevice,
    togglePlay,
    next,
    previous,
    seek,
    toggleShuffle,
    cycleRepeat,
    selectPlaylist,
    selectDevice,
    playTrack,
  } = useMusic();

  const duration = currentTrack?.durationSeconds ?? 0;
  const position = Math.min(playback.positionSeconds, duration);
  const remaining = Math.max(0, duration - position);
  const progressPct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-10 landscape-tablet:gap-8">
      <p className="sr-only">
        Quelle: {source.label}. Nur lokale Demo-Daten — kein Spotify.
      </p>

      {/* Now Playing */}
      <section
        className="grid gap-8 landscape-tablet:grid-cols-[minmax(0,22rem)_1fr] landscape-tablet:items-center landscape-tablet:gap-10"
        aria-labelledby="now-playing-title"
      >
        <div className="mx-auto w-full max-w-[22rem] landscape-tablet:mx-0">
          {currentTrack ? (
            <AlbumArt
              artwork={currentTrack.artwork}
              title={currentTrack.title}
              size="lg"
              className="mx-auto"
            />
          ) : (
            <div className="aspect-square w-full rounded-[1.5rem] bg-[color:var(--surface)]" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="space-y-1 text-center landscape-tablet:text-left">
            <h2
              id="now-playing-title"
              className="font-display text-3xl tracking-tight sm:text-4xl"
            >
              {currentTrack?.title ?? "Nichts ausgewählt"}
            </h2>
            <p className="text-xl text-[color:var(--quiet)]">
              {currentTrack?.artist ?? "—"}
            </p>
            <p className="text-base text-[color:var(--quiet)]">
              {currentTrack?.album ?? ""}
            </p>
          </div>

          <div className="space-y-2">
            <label className="sr-only" htmlFor="music-progress">
              Fortschritt
            </label>
            <input
              id="music-progress"
              type="range"
              min={0}
              max={duration || 1}
              step={1}
              value={position}
              disabled={!currentTrack}
              onChange={(e) => seek(Number(e.target.value))}
              className="music-progress h-2 w-full cursor-pointer appearance-none rounded-full bg-[color:var(--surface-strong)] accent-[color:var(--ink)] disabled:opacity-40"
              style={{
                background: `linear-gradient(to right, var(--ink) ${progressPct}%, var(--surface-strong) ${progressPct}%)`,
              }}
              aria-valuetext={`${formatMusicTime(position)} von ${formatMusicTime(duration)}`}
            />
            <div className="flex justify-between text-sm tabular-nums text-[color:var(--quiet)]">
              <span>{formatMusicTime(position)}</span>
              <span>−{formatMusicTime(remaining)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 landscape-tablet:justify-start">
            <QuietControl
              label={playback.shuffle ? "Zufall aus" : "Zufall an"}
              pressed={playback.shuffle}
              onClick={toggleShuffle}
            >
              <Shuffle className="size-5" />
            </QuietControl>

            <TransportButton label="Zurück" onClick={previous} size="md">
              <SkipBack className="size-7 fill-current" />
            </TransportButton>

            <TransportButton
              label={playback.isPlaying ? "Pause" : "Abspielen"}
              onClick={togglePlay}
              size="lg"
              primary
            >
              {playback.isPlaying ? (
                <Pause className="size-8 fill-current" />
              ) : (
                <Play className="size-8 fill-current translate-x-0.5" />
              )}
            </TransportButton>

            <TransportButton label="Weiter" onClick={next} size="md">
              <SkipForward className="size-7 fill-current" />
            </TransportButton>

            <QuietControl
              label={
                playback.repeat === "off"
                  ? "Wiederholen an"
                  : playback.repeat === "all"
                    ? "Titel wiederholen"
                    : "Wiederholen aus"
              }
              pressed={playback.repeat !== "off"}
              onClick={cycleRepeat}
            >
              {playback.repeat === "one" ? (
                <Repeat1 className="size-5" />
              ) : (
                <Repeat className="size-5" />
              )}
            </QuietControl>
          </div>
        </div>
      </section>

      {/* Für heute */}
      <section className="space-y-4" aria-labelledby="heute-playlists">
        <h2 id="heute-playlists" className="font-display text-2xl tracking-tight sm:text-3xl">
          Für heute
        </h2>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {playlists.map((pl) => (
            <PlaylistChip
              key={pl.id}
              playlist={pl}
              active={playback.selectedPlaylistId === pl.id}
              onSelect={() => selectPlaylist(pl.id)}
            />
          ))}
        </div>
      </section>

      {/* Zuletzt gehört */}
      <section className="space-y-4" aria-labelledby="recent-title">
        <h2 id="recent-title" className="font-display text-2xl tracking-tight sm:text-3xl">
          Zuletzt gehört
        </h2>
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recentlyPlayed.map((track) => {
            const active = track.id === playback.trackId;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => playTrack(track.id)}
                className={cn(
                  "flex w-[9.5rem] shrink-0 flex-col gap-2 rounded-[1.25rem] text-left transition-[transform,opacity] duration-150 active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]",
                  active && "opacity-100",
                )}
              >
                <AlbumArt
                  artwork={track.artwork}
                  title={track.title}
                  size="md"
                  className={cn(
                    "w-full !size-auto aspect-square",
                    active && "ring-2 ring-[color:var(--ink)] ring-offset-2 ring-offset-[color:var(--bg)]",
                  )}
                />
                <span className="truncate text-base font-medium text-[color:var(--ink)]">
                  {track.title}
                </span>
                <span className="truncate text-sm text-[color:var(--quiet)]">
                  {track.artist}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Wiedergabe auf */}
      <section className="space-y-4" aria-labelledby="devices-title">
        <h2 id="devices-title" className="font-display text-2xl tracking-tight sm:text-3xl">
          Wiedergabe auf
        </h2>
        <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {devices.map((device) => {
            const active = device.id === activeDevice?.id;
            return (
              <li key={device.id} className="min-w-0 sm:min-w-[12rem] sm:flex-1">
                <button
                  type="button"
                  onClick={() => selectDevice(device.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left text-base transition-[transform,background-color,border-color] duration-150 active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]",
                    active
                      ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--surface)]"
                      : "border-[color:var(--hairline)] bg-[color:var(--surface)] text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]",
                  )}
                >
                  <DeviceIcon kind={device.kind} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {device.name}
                  </span>
                  {active ? (
                    <span className="shrink-0 text-sm opacity-80">Aktiv</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function PlaylistChip({
  playlist,
  active,
  onSelect,
}: {
  playlist: MusicPlaylist;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-12 shrink-0 items-center rounded-2xl px-5 text-base font-medium transition-[transform,background-color,color] duration-150 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]",
        active
          ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
          : "bg-[color:var(--surface)] text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]",
      )}
    >
      {MUSIC_CATEGORY_LABELS[playlist.category]}
    </button>
  );
}

function TransportButton({
  children,
  label,
  onClick,
  size,
  primary,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  size: "md" | "lg";
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-[transform,background-color] duration-150 active:scale-[0.94]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]",
        size === "lg" ? "size-16 sm:size-[4.5rem]" : "size-14",
        primary
          ? "bg-[color:var(--ink)] text-[color:var(--surface)] shadow-[0_6px_20px_rgba(28,36,48,0.16)]"
          : "bg-[color:var(--surface)] text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]",
      )}
    >
      {children}
    </button>
  );
}

function QuietControl({
  children,
  label,
  pressed,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full transition-[transform,color,opacity] duration-150 active:scale-[0.95]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]",
        pressed
          ? "text-[color:var(--brand)]"
          : "text-[color:var(--quiet)] opacity-70 hover:opacity-100",
      )}
    >
      {children}
    </button>
  );
}
