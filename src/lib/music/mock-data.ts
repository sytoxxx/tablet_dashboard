import type {
  MusicDevice,
  MusicPlaybackSnapshot,
  MusicPlaylist,
  MusicTrack,
} from "@/lib/music/types";

/**
 * Demo catalog only — local mock data, clearly not a live music service.
 * Artwork keys map to calm CSS gradients in the UI (no remote album art).
 */

export const MOCK_TRACKS: MusicTrack[] = [
  {
    id: "tr-soft-light",
    title: "Soft Light",
    artist: "Morning Atlas",
    album: "First Light",
    artwork: "sage-mist",
    durationSeconds: 214,
    playlistId: "pl-morgen",
    category: "morgen",
  },
  {
    id: "tr-slow-pour",
    title: "Slow Pour",
    artist: "Kaffeefilter",
    album: "Kitchen Windows",
    artwork: "warm-clay",
    durationSeconds: 198,
    playlistId: "pl-morgen",
    category: "morgen",
  },
  {
    id: "tr-open-road",
    title: "Open Road",
    artist: "Field Notes",
    album: "Quiet Hours",
    artwork: "sky-blue",
    durationSeconds: 241,
    playlistId: "pl-morgen",
    category: "morgen",
  },
  {
    id: "tr-deep-work",
    title: "Deep Work",
    artist: "Studio North",
    album: "Focus Desk",
    artwork: "ink-slate",
    durationSeconds: 256,
    playlistId: "pl-fokus",
    category: "fokus",
  },
  {
    id: "tr-clear-line",
    title: "Clear Line",
    artist: "Paper Trail",
    album: "Focus Desk",
    artwork: "cool-teal",
    durationSeconds: 228,
    playlistId: "pl-fokus",
    category: "fokus",
  },
  {
    id: "tr-cursor-blink",
    title: "Cursor Blink",
    artist: "Studio North",
    album: "Late Drafts",
    artwork: "dusk-violet",
    durationSeconds: 192,
    playlistId: "pl-fokus",
    category: "fokus",
  },
  {
    id: "tr-afternoon-air",
    title: "Afternoon Air",
    artist: "Leaf & Wire",
    album: "Soft Days",
    artwork: "leaf-green",
    durationSeconds: 265,
    playlistId: "pl-entspannt",
    category: "entspannt",
  },
  {
    id: "tr-window-seat",
    title: "Window Seat",
    artist: "Harbor Glow",
    album: "Soft Days",
    artwork: "peach-haze",
    durationSeconds: 233,
    playlistId: "pl-entspannt",
    category: "entspannt",
  },
  {
    id: "tr-ember-hour",
    title: "Ember Hour",
    artist: "Night Porch",
    album: "After Dinner",
    artwork: "ember-brown",
    durationSeconds: 278,
    playlistId: "pl-abend",
    category: "abend",
  },
  {
    id: "tr-low-lamps",
    title: "Low Lamps",
    artist: "Harbor Glow",
    album: "After Dinner",
    artwork: "lamp-gold",
    durationSeconds: 221,
    playlistId: "pl-abend",
    category: "abend",
  },
  {
    id: "tr-last-page",
    title: "Last Page",
    artist: "Morning Atlas",
    album: "Quiet Hours",
    artwork: "indigo-night",
    durationSeconds: 247,
    playlistId: "pl-abend",
    category: "abend",
  },
];

export const MOCK_PLAYLISTS: MusicPlaylist[] = [
  {
    id: "pl-morgen",
    title: "Morgen",
    category: "morgen",
    trackIds: ["tr-soft-light", "tr-slow-pour", "tr-open-road"],
  },
  {
    id: "pl-fokus",
    title: "Fokus",
    category: "fokus",
    trackIds: ["tr-deep-work", "tr-clear-line", "tr-cursor-blink"],
  },
  {
    id: "pl-entspannt",
    title: "Entspannt",
    category: "entspannt",
    trackIds: ["tr-afternoon-air", "tr-window-seat", "tr-soft-light"],
  },
  {
    id: "pl-abend",
    title: "Abend",
    category: "abend",
    trackIds: ["tr-ember-hour", "tr-low-lamps", "tr-last-page"],
  },
];

export const MOCK_DEVICES: MusicDevice[] = [
  { id: "dev-tablet", name: "Tablet", kind: "tablet" },
  { id: "dev-bt-speaker", name: "Bluetooth-Lautsprecher", kind: "bluetooth" },
  { id: "dev-wlan-speaker", name: "WLAN-Lautsprecher", kind: "wifi" },
];

export const MOCK_RECENT_IDS = [
  "tr-slow-pour",
  "tr-deep-work",
  "tr-afternoon-air",
  "tr-ember-hour",
  "tr-window-seat",
] as const;

export function createMockInitialPlayback(): MusicPlaybackSnapshot {
  return {
    trackId: "tr-soft-light",
    isPlaying: false,
    positionSeconds: 42,
    shuffle: false,
    repeat: "off",
    deviceId: "dev-tablet",
    selectedPlaylistId: "pl-morgen",
  };
}
