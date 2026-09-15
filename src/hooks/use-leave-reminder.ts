"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonId } from "@/lib/types";
import type { TravelPlan } from "@/lib/work/travel-planner";
import type { MorningTimeline } from "@/lib/morning/timeline";
import {
  createLeaveReminderFiredStore,
  resolveLeaveReminder,
  resolveLeaveReminderPrefs,
  type LeaveReminderCue,
  type LeaveReminderPrefs,
} from "@/lib/morning/leave-reminder";
import {
  isLeaveReminderAudioUnlocked,
  playLeaveReminderTone,
} from "@/lib/morning/leave-reminder-audio";
import { toIsoDate } from "@/lib/day/tomorrow";

const firedStore = createLeaveReminderFiredStore();

/**
 * At most one quiet tone per leaveHome event while in the leave-soon window.
 * Survives re-renders / polling via module-level fired set.
 */
export function useLeaveReminder(input: {
  personId: PersonId;
  wallNow: Date;
  travel: TravelPlan | null;
  timeline: MorningTimeline | null;
  prefs?: Partial<LeaveReminderPrefs> | null;
}): LeaveReminderCue & { audioUnlocked: boolean; played: boolean } {
  const prefs = resolveLeaveReminderPrefs(input.prefs);
  const dateIso = toIsoDate(input.wallNow);
  const cue = resolveLeaveReminder({
    personId: input.personId,
    dateIso,
    now: input.wallNow,
    travel: input.travel,
    prefs,
    timelineState: input.timeline?.state ?? null,
  });

  const playingRef = useRef(false);
  // Re-render after async play so `played` reflects the fired store.
  const [, setPlayedEpoch] = useState(0);

  useEffect(() => {
    if (!cue.soundDue || !cue.eventKey || !prefs.enabled) return;
    if (firedStore.has(cue.eventKey)) return;
    if (playingRef.current) return;
    if (!isLeaveReminderAudioUnlocked()) return;

    const key = cue.eventKey;
    playingRef.current = true;
    void playLeaveReminderTone(prefs.volume)
      .then(() => {
        firedStore.mark(key);
        setPlayedEpoch((n) => n + 1);
      })
      .catch(() => {
        // Still mark to avoid retry spam; visual reminder remains.
        firedStore.mark(key);
        setPlayedEpoch((n) => n + 1);
      })
      .finally(() => {
        playingRef.current = false;
      });
  }, [cue.soundDue, cue.eventKey, prefs.enabled, prefs.volume]);

  return {
    ...cue,
    audioUnlocked: isLeaveReminderAudioUnlocked(),
    played: cue.eventKey ? firedStore.has(cue.eventKey) : false,
  };
}

/** Test helper — clear fired keys between cases. */
export function __resetLeaveReminderFiredForTests() {
  firedStore.clear();
}
