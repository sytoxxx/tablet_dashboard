import type {
  MusicPlaybackSnapshot,
  MusicPlaylist,
  MusicTrack,
  RepeatMode,
} from "@/lib/music/types";

export function formatMusicTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function clampPosition(position: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(Math.max(0, position), duration);
}

export function trackById(
  tracks: MusicTrack[],
  id: string | null,
): MusicTrack | null {
  if (!id) return null;
  return tracks.find((t) => t.id === id) ?? null;
}

export function playlistById(
  playlists: MusicPlaylist[],
  id: string | null,
): MusicPlaylist | null {
  if (!id) return null;
  return playlists.find((p) => p.id === id) ?? null;
}

/** Queue for prev/next: selected playlist tracks, else full catalog. */
export function queueTrackIds(
  tracks: MusicTrack[],
  playlists: MusicPlaylist[],
  selectedPlaylistId: string | null,
): string[] {
  const pl = playlistById(playlists, selectedPlaylistId);
  if (pl && pl.trackIds.length > 0) {
    const known = new Set(tracks.map((t) => t.id));
    return pl.trackIds.filter((id) => known.has(id));
  }
  return tracks.map((t) => t.id);
}

export function stepTrackId(
  queue: string[],
  currentId: string | null,
  delta: -1 | 1,
  repeat: RepeatMode,
): string | null {
  if (queue.length === 0) return null;
  if (repeat === "one" && currentId && queue.includes(currentId)) {
    return currentId;
  }
  const idx = currentId ? queue.indexOf(currentId) : -1;
  if (idx < 0) return queue[0] ?? null;
  const next = idx + delta;
  if (next < 0) {
    return repeat === "all" ? (queue[queue.length - 1] ?? null) : queue[0] ?? null;
  }
  if (next >= queue.length) {
    return repeat === "all" ? (queue[0] ?? null) : queue[queue.length - 1] ?? null;
  }
  return queue[next] ?? null;
}

export function advancePlaybackTick(
  playback: MusicPlaybackSnapshot,
  durationSeconds: number,
  deltaSeconds: number,
  queue: string[],
): MusicPlaybackSnapshot {
  if (!playback.isPlaying || !playback.trackId) return playback;
  const nextPos = playback.positionSeconds + deltaSeconds;
  if (nextPos < durationSeconds) {
    return { ...playback, positionSeconds: nextPos };
  }
  // End of track
  if (playback.repeat === "one") {
    return { ...playback, positionSeconds: 0 };
  }
  const nextId = stepTrackId(queue, playback.trackId, 1, playback.repeat);
  if (nextId && nextId !== playback.trackId) {
    return { ...playback, trackId: nextId, positionSeconds: 0 };
  }
  if (playback.repeat === "all" && nextId) {
    return { ...playback, trackId: nextId, positionSeconds: 0 };
  }
  return {
    ...playback,
    isPlaying: false,
    positionSeconds: durationSeconds,
  };
}
