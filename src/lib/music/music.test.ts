import { describe, expect, it } from "vitest";
import {
  advancePlaybackTick,
  createMockMusicProvider,
  formatMusicTime,
  MockMusicProvider,
  queueTrackIds,
  stepTrackId,
} from "@/lib/music";

describe("MockMusicProvider", () => {
  it("exposes local demo identity and catalog", () => {
    const provider = createMockMusicProvider();
    expect(provider.id).toBe("mock-local");
    expect(provider.label).toBe("Lokale Demo");
    expect(provider.statusLabel).toBe("Bereit zum Abspielen");
    expect(provider.getTracks().length).toBeGreaterThan(0);
    expect(provider.getPlaylists()).toHaveLength(4);
    expect(provider.getDevices().some((d) => d.kind === "tablet")).toBe(true);
    expect(provider.getRecentlyPlayed().length).toBeGreaterThan(0);
  });

  it("is constructible as MusicProvider implementation", () => {
    const provider: MockMusicProvider = new MockMusicProvider();
    const initial = provider.getInitialPlayback();
    expect(initial.deviceId).toBe("dev-tablet");
    expect(initial.isPlaying).toBe(false);
    expect(provider.getTracks().some((t) => t.id === initial.trackId)).toBe(true);
  });
});

describe("music playback helpers", () => {
  it("formats elapsed time", () => {
    expect(formatMusicTime(0)).toBe("0:00");
    expect(formatMusicTime(65)).toBe("1:05");
    expect(formatMusicTime(214)).toBe("3:34");
  });

  it("builds playlist queue and steps tracks", () => {
    const provider = createMockMusicProvider();
    const tracks = provider.getTracks();
    const playlists = provider.getPlaylists();
    const queue = queueTrackIds(tracks, playlists, "pl-morgen");
    expect(queue).toEqual(["tr-soft-light", "tr-slow-pour", "tr-open-road"]);
    expect(stepTrackId(queue, "tr-soft-light", 1, "off")).toBe("tr-slow-pour");
    expect(stepTrackId(queue, "tr-open-road", 1, "off")).toBe("tr-open-road");
    expect(stepTrackId(queue, "tr-open-road", 1, "all")).toBe("tr-soft-light");
    expect(stepTrackId(queue, "tr-soft-light", 1, "one")).toBe("tr-soft-light");
  });

  it("advances position while playing and stops at end without repeat", () => {
    const queue = ["a", "b"];
    const playing = {
      trackId: "a",
      isPlaying: true,
      positionSeconds: 10,
      shuffle: false,
      repeat: "off" as const,
      deviceId: "dev-tablet",
      selectedPlaylistId: null,
    };
    expect(advancePlaybackTick(playing, 12, 1, queue).positionSeconds).toBe(11);
    const atEnd = advancePlaybackTick(
      { ...playing, positionSeconds: 11.5 },
      12,
      1,
      queue,
    );
    expect(atEnd.trackId).toBe("b");
    expect(atEnd.positionSeconds).toBe(0);
  });
});
