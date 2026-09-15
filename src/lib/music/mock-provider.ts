import {
  createMockInitialPlayback,
  MOCK_DEVICES,
  MOCK_PLAYLISTS,
  MOCK_RECENT_IDS,
  MOCK_TRACKS,
} from "@/lib/music/mock-data";
import type {
  MusicDevice,
  MusicPlaybackSnapshot,
  MusicPlaylist,
  MusicProvider,
  MusicTrack,
} from "@/lib/music/types";

/**
 * Local demo source — no network, no Spotify shapes or fake API payloads.
 * Later: SpotifyMusicProvider implements the same MusicProvider interface.
 */
export class MockMusicProvider implements MusicProvider {
  readonly id = "mock-local";
  readonly label = "Lokale Demo";
  readonly statusLabel = "Bereit zum Abspielen";

  private readonly tracks: MusicTrack[];
  private readonly playlists: MusicPlaylist[];
  private readonly devices: MusicDevice[];
  private readonly recentIds: readonly string[];

  constructor(options?: {
    tracks?: MusicTrack[];
    playlists?: MusicPlaylist[];
    devices?: MusicDevice[];
    recentIds?: readonly string[];
  }) {
    this.tracks = options?.tracks ?? MOCK_TRACKS;
    this.playlists = options?.playlists ?? MOCK_PLAYLISTS;
    this.devices = options?.devices ?? MOCK_DEVICES;
    this.recentIds = options?.recentIds ?? MOCK_RECENT_IDS;
  }

  getTracks(): MusicTrack[] {
    return this.tracks.slice();
  }

  getPlaylists(): MusicPlaylist[] {
    return this.playlists.slice();
  }

  getDevices(): MusicDevice[] {
    return this.devices.slice();
  }

  getRecentlyPlayed(): MusicTrack[] {
    const byId = new Map(this.tracks.map((t) => [t.id, t]));
    return this.recentIds
      .map((id) => byId.get(id))
      .filter((t): t is MusicTrack => Boolean(t));
  }

  getInitialPlayback(): MusicPlaybackSnapshot {
    return createMockInitialPlayback();
  }
}

export function createMockMusicProvider(): MusicProvider {
  return new MockMusicProvider();
}
