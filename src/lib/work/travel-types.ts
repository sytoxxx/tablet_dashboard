/** Shared travel leg / connection types for multi-leg TRIAS journeys. */

export type TravelLegType = "WALK" | "TRANSIT" | "TRANSFER";

export type TravelLeg = {
  type: TravelLegType;
  /** HH:MM wall clock when known. */
  departure: string | null;
  arrival: string | null;
  from: string | null;
  to: string | null;
  fromRef?: string | null;
  toRef?: string | null;
  line?: string | null;
  direction?: string | null;
  delayMinutes?: number | null;
  cancelled?: boolean;
  durationMinutes?: number | null;
  isRealtime?: boolean;
  /**
   * `trias` = from TripRequest ContinuousLeg;
   * `config` = walk from configured stopToWorkMinutes (not invented TRIAS distance).
   */
  timingSource?: "trias" | "config";
};

/** One concrete journey option (e.g. one of Heidi’s next 3). */
export type TravelConnection = {
  departure: string | null;
  arrival: string | null;
  leaveHome: string | null;
  durationMinutes: number | null;
  realtime: boolean;
  cancelled: boolean;
  transfers: number;
  isDirect: boolean;
  legs: TravelLeg[];
  lineSummary: string | null;
  direction: string | null;
  delayMinutes: number | null;
  walkToStopMinutes: number;
  walkTimeConfigured: boolean;
};
