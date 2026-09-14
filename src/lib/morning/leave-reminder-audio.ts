/**
 * Quiet leave-reminder tone via Web Audio (no asset file).
 * Must unlock after a user gesture (profile tap). Never throws to UI.
 */

let sharedCtx: AudioContext | null = null;
let unlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx) sharedCtx = new Ctx();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Call from profile selection (user gesture) so later cues can play. */
export async function unlockLeaveReminderAudio(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    // Tiny silent buffer to satisfy autoplay policies on some browsers
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    unlocked = ctx.state === "running";
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("coffee-morning-audio-unlocked", unlocked ? "1" : "0");
    }
    return unlocked;
  } catch {
    unlocked = false;
    return false;
  }
}

export function isLeaveReminderAudioUnlocked(): boolean {
  if (unlocked) return true;
  try {
    return (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("coffee-morning-audio-unlocked") === "1"
    );
  } catch {
    return false;
  }
}

/**
 * Soft, short sine blip — not an alarm.
 * Returns false if audio unavailable / locked (UI still works).
 */
export async function playLeaveReminderTone(volume = 0.08): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (ctx.state !== "running") return false;

    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 528; // calm mid tone
    const level = Math.min(0.25, Math.max(0.02, volume));
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}
