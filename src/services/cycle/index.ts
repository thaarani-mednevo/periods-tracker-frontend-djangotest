import { apiRequest } from "../api/client";

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low";
export type DataType = "observed" | "estimated";
/** How sure the backend is about the phase: confirmed = period logged or BBT shift seen; estimated = calendar / LH only. */
export type PhaseBasis = "confirmed" | "estimated" | "none";
/** Action the backend wants the UI to offer instead of a bare "phase unknown". */
export type PhaseHint = "ovulation_not_detected" | null;

/** Shape of GET /api/v1/cycle/current. The backend owns every calculation; the UI only displays it. */
export type NeedsDataReason = "no_period_logged" | "long_gap_irregular" | "phase_unknown";

export interface CycleState {
  date: string;
  /** "needs_data" = the engine cannot place a phase yet; show the learning overview. */
  phaseState?: "ready" | "needs_data";
  needsDataReason?: NeedsDataReason | null;
  cycleDay: number | null;
  phase: CyclePhase,
  phaseBasis: PhaseBasis;
  phaseHint: PhaseHint;
  period: { start: string; end: string; type: DataType; startType: DataType } | null;
  nextPeriod: { date: string; type: DataType; rangeStart: string | null; rangeEnd: string | null } | null;
  ovulation: { date: string; type: "estimated"; confirmed: boolean; basis: "signals" | "calendar"; windowStart: string; windowEnd: string } | null;
  nextPhase: { phase: Exclude<CyclePhase, "unknown">; startDate: string; daysUntil: number } | null;
  phases: { phase: Exclude<CyclePhase, "unknown">; start: string; end: string | null; isCurrent: boolean }[];
  daysUntilNextPeriod: number | null;
  isOverdue: boolean;
  overdueDays: number;
  confidence: { level: ConfidenceLevel; reasons: string[] };
  cycleProfile: {
    sampleSize: number;
    medianCycleLength: number | null;
    variability: number | null;
    typicalPeriodLength: number | null;
    lengthSource: "history" | "history+onboarding" | "onboarding" | "none";
    irregular: boolean;
  };
}

export interface PredictedDay {
  date: string;
  phase: CyclePhase;
  phaseBasis?: PhaseBasis;
  type: DataType;
  cycleDay: number | null;
  isOvulationDay: boolean;
  inOvulationWindow: boolean;
}

export interface PeriodEntry {
  id: number;
  startDate: string;
  endDate: string | null;
  periodLength: number | null;
  cycleLength: number | null;
  source: "onboarding" | "user";
}

/** The user's LOCAL calendar date (the server runs in UTC, so it must not guess "today"). */
export function localISODate(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const getCurrentCycle = (
  dateOrSignal?: string | AbortSignal,
  signal?: AbortSignal,
) => {
  const date =
    typeof dateOrSignal === "string"
      ? dateOrSignal
      : localISODate();

  const requestSignal =
    typeof dateOrSignal === "string"
      ? signal
      : dateOrSignal;

  return apiRequest<CycleState>(
    "/api/v1/cycle/current",
    {
      query: { date },
      signal: requestSignal,
    },
  ).then(normalizeCycleState);
};

/** needs_data can still carry an estimated phase (irregular + long gap). Show it as "unknown" everywhere. */
export function normalizeCycleState(s: CycleState): CycleState {
  if (s.phaseState !== "needs_data" || s.phase === "unknown") return s;
  return { ...s, phase: "unknown", phaseBasis: "none", phaseHint: null, cycleDay: null, nextPhase: null, phases: [], ovulation: null };
}

export const getPredictions = (start: string, end: string, signal?: AbortSignal) =>
  apiRequest<{ start: string; end: string; days: PredictedDay[] }>("/api/v1/cycle/predictions", {
    query: { start, end, date: localISODate() },
    signal,
  });

export const getCycleHistory = (signal?: AbortSignal) =>
  apiRequest<{ periods: PeriodEntry[] }>("/api/v1/cycles/history", { query: { date: localISODate() }, signal });

export const logPeriod = (startDate: string, endDate?: string | null) =>
  apiRequest<{ id: number }>("/api/v1/cycles/periods", {
    method: "POST",
    query: { date: localISODate() },
    body: { startDate, endDate: endDate ?? null },
  });


export interface HormoneMarker {
  key: "estrogen" | "progesterone";
  name: string;
  level: "Low" | "Moderate" | "High" | "Peak" | "Rising" | "Falling";
  trend: "rising" | "falling" | "steady";
  segments: number; // 1-10
}
 
export interface HormonePattern {
  basis: "typical_pattern";
  phase: string;
  summary: string;
  markers: HormoneMarker[];
}