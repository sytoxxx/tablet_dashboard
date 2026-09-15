export type {
  MusicCategory,
  MusicTrack,
  MusicPlaylist,
  MusicDevice,
  MusicDeviceKind,
  MusicPlaybackSnapshot,
  MusicProvider,
  RepeatMode,
} from "@/lib/music/types";
export {
  MUSIC_CATEGORIES,
  MUSIC_CATEGORY_LABELS,
} from "@/lib/music/types";
export { MockMusicProvider, createMockMusicProvider } from "@/lib/music/mock-provider";
export {
  formatMusicTime,
  clampPosition,
  trackById,
  playlistById,
  queueTrackIds,
  stepTrackId,
  advancePlaybackTick,
} from "@/lib/music/playback";
