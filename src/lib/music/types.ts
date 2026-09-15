/** Local music catalog types — UI depends on these, not on Spotify shapes. */

export type MusicCategory = "morgen" | "fokus" | "entspannt" | "abend";

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Local placeholder artwork (CSS gradient key or data URL) — not remote CDN. */
  artwork: string;
  durationSeconds: number;
  playlistId?: string;
  category?: MusicCategory;
};

export type MusicPlaylist = {
  id: string;
  title: string;
  category: MusicCategory;
  trackIds: string[];
};

export type MusicDeviceKind = "tablet" | "bluetooth" | "wifi";

export type MusicDevice = {
  id: string;
  name: string;
  kind: MusicDeviceKind;
};

export type RepeatMode = "off" | "all" | "one";

export type MusicPlaybackSnapshot = {
  trackId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  shuffle: boolean;
  repeat: RepeatMode;
  deviceId: string;
  selectedPlaylistId: string | null;
};

/**
 * Source adapter contract.
 * UI and React context talk to this interface only —
 * swap MockMusicProvider for SpotifyMusicProvider later.
 */
export interface MusicProvider {
  readonly id: string;
  readonly label: string;
  /** Human status line for the header (demo-safe). */
  readonly statusLabel: string;
  getTracks(): MusicTrack[];
  getPlaylists(): MusicPlaylist[];
  getDevices(): MusicDevice[];
  getRecentlyPlayed(): MusicTrack[];
  getInitialPlayback(): MusicPlaybackSnapshot;
}

export const MUSIC_CATEGORY_LABELS: Record<MusicCategory, string> = {
  morgen: "Morgen",
  fokus: "Fokus",
  entspannt: "Entspannt",
  abend: "Abend",
};

export const MUSIC_CATEGORIES: MusicCategory[] = [
  "morgen",
  "fokus",
  "entspannt",
  "abend",
];
