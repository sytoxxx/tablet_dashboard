"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  advancePlaybackTick,
  clampPosition,
  createMockMusicProvider,
  playlistById,
  queueTrackIds,
  stepTrackId,
  trackById,
  type MusicDevice,
  type MusicPlaybackSnapshot,
  type MusicPlaylist,
  type MusicProvider,
  type MusicTrack,
  type RepeatMode,
} from "@/lib/music";

type MusicContextValue = {
  ready: boolean;
  /** Active source adapter (mock today; Spotify later). */
  source: MusicProvider;
  tracks: MusicTrack[];
  playlists: MusicPlaylist[];
  devices: MusicDevice[];
  recentlyPlayed: MusicTrack[];
  playback: MusicPlaybackSnapshot;
  currentTrack: MusicTrack | null;
  activeDevice: MusicDevice | null;
  selectedPlaylist: MusicPlaylist | null;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  selectPlaylist: (playlistId: string) => void;
  selectDevice: (deviceId: string) => void;
  playTrack: (trackId: string) => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

const TICK_MS = 250;

export function MusicCommandProvider({
  children,
  source,
}: {
  children: ReactNode;
  /** Defaults to MockMusicProvider — inject SpotifyMusicProvider later. */
  source?: MusicProvider;
}) {
  const [mockSource] = useState(() => createMockMusicProvider());
  const activeSource = source ?? mockSource;

  const [ready, setReady] = useState(false);
  const [playback, setPlayback] = useState<MusicPlaybackSnapshot>(() =>
    activeSource.getInitialPlayback(),
  );

  const tracks = useMemo(() => activeSource.getTracks(), [activeSource]);
  const playlists = useMemo(() => activeSource.getPlaylists(), [activeSource]);
  const devices = useMemo(() => activeSource.getDevices(), [activeSource]);
  const recentlyPlayed = useMemo(
    () => activeSource.getRecentlyPlayed(),
    [activeSource],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPlayback(activeSource.getInitialPlayback());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeSource]);

  const currentTrack = trackById(tracks, playback.trackId);
  const activeDevice =
    devices.find((d) => d.id === playback.deviceId) ?? devices[0] ?? null;
  const selectedPlaylist = playlistById(playlists, playback.selectedPlaylistId);

  const queue = useMemo(
    () => queueTrackIds(tracks, playlists, playback.selectedPlaylistId),
    [tracks, playlists, playback.selectedPlaylistId],
  );

  useEffect(() => {
    if (!playback.isPlaying || !currentTrack) return;
    const duration = currentTrack.durationSeconds;
    const id = window.setInterval(() => {
      setPlayback((prev) =>
        advancePlaybackTick(prev, duration, TICK_MS / 1000, queue),
      );
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playback.isPlaying, currentTrack, queue]);

  const togglePlay = useCallback(() => {
    setPlayback((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const play = useCallback(() => {
    setPlayback((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setPlayback((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const next = useCallback(() => {
    setPlayback((prev) => {
      const nextId = stepTrackId(queue, prev.trackId, 1, prev.repeat === "one" ? "off" : prev.repeat);
      if (!nextId) return prev;
      return { ...prev, trackId: nextId, positionSeconds: 0, isPlaying: true };
    });
  }, [queue]);

  const previous = useCallback(() => {
    setPlayback((prev) => {
      // Restart current if >3s in, else go back (common player UX).
      if (prev.positionSeconds > 3) {
        return { ...prev, positionSeconds: 0 };
      }
      const prevId = stepTrackId(queue, prev.trackId, -1, prev.repeat === "one" ? "off" : prev.repeat);
      if (!prevId) return { ...prev, positionSeconds: 0 };
      return { ...prev, trackId: prevId, positionSeconds: 0, isPlaying: true };
    });
  }, [queue]);

  const seek = useCallback(
    (seconds: number) => {
      const duration = currentTrack?.durationSeconds ?? 0;
      setPlayback((prev) => ({
        ...prev,
        positionSeconds: clampPosition(seconds, duration),
      }));
    },
    [currentTrack],
  );

  const toggleShuffle = useCallback(() => {
    setPlayback((prev) => ({ ...prev, shuffle: !prev.shuffle }));
  }, []);

  const cycleRepeat = useCallback(() => {
    setPlayback((prev) => {
      const order: RepeatMode[] = ["off", "all", "one"];
      const i = order.indexOf(prev.repeat);
      return { ...prev, repeat: order[(i + 1) % order.length]! };
    });
  }, []);

  const selectPlaylist = useCallback((playlistId: string) => {
    setPlayback((prev) => ({
      ...prev,
      selectedPlaylistId: playlistId,
    }));
  }, []);

  const selectDevice = useCallback((deviceId: string) => {
    setPlayback((prev) => ({ ...prev, deviceId }));
  }, []);

  const playTrack = useCallback((trackId: string) => {
    setPlayback((prev) => ({
      ...prev,
      trackId,
      positionSeconds: 0,
      isPlaying: true,
    }));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      source: activeSource,
      tracks,
      playlists,
      devices,
      recentlyPlayed,
      playback,
      currentTrack,
      activeDevice,
      selectedPlaylist,
      togglePlay,
      play,
      pause,
      next,
      previous,
      seek,
      toggleShuffle,
      cycleRepeat,
      selectPlaylist,
      selectDevice,
      playTrack,
    }),
    [
      ready,
      activeSource,
      tracks,
      playlists,
      devices,
      recentlyPlayed,
      playback,
      currentTrack,
      activeDevice,
      selectedPlaylist,
      togglePlay,
      play,
      pause,
      next,
      previous,
      seek,
      toggleShuffle,
      cycleRepeat,
      selectPlaylist,
      selectDevice,
      playTrack,
    ],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    throw new Error("useMusic must be used within MusicCommandProvider");
  }
  return ctx;
}
