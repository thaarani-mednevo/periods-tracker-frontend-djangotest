import type { CycleState } from "../../services/cycle";
import { fmtDate } from "../dashboard/phases";

/** Building blocks every phase overview shares, so a new phase view stays small. */
export const card = "rounded-[24px] border border-blush-300 bg-white p-5 shadow-glass sm:p-6";
export const CONFIDENCE_LABEL = { high: "Very reliable", medium: "Fairly reliable", low: "Still learning your cycle" } as const;

/** Plain-language "why" behind the prediction label (the backend only sends reason codes). */
export function confidenceReason(state: CycleState): string {
  const r = state.confidence.reasons;
  const n = state.cycleProfile.sampleSize;
  if (r.includes("period_overdue")) return "Your period is later than predicted, so dates may shift. Log it when it starts.";
  if (r.includes("no_cycle_data") || r.includes("assumed_default_cycle_length")) return "Using a typical 28-day cycle for now. Log a period to personalise it.";
  if (r.includes("based_on_onboarding_only")) return "Based on the cycle length you entered. Log periods to make it more accurate.";
  if (r.includes("only_one_cycle_logged") || r.includes("few_cycles_logged")) return `Only ${n} ${n === 1 ? "cycle" : "cycles"} logged so far. More logs make predictions more accurate.`;
  if (r.includes("moderate_cycle_variability") || r.includes("high_cycle_variability")) return "Your cycle length changes month to month, so dates are shown as a range.";
  return "Based on your logged cycles.";
}
/** Soft, never-certain wording for the prediction card. Driven only by the real logged-cycle count and the backend's variability reason codes. */
export function predictionCopy(state: CycleState): { title: string; note: string } {
  const n = state.cycleProfile.sampleSize ?? 0;
  const r = state.confidence.reasons;
  const irregular = r.includes("moderate_cycle_variability") || r.includes("high_cycle_variability");
  const overdue = r.includes("period_overdue");

  if (n <= 1) return { title: "Discovering your patterns", note: overdue ? "Your period is later than expected, so dates may shift." : "Gets better with every cycle you log." };
  if (n <= 3) return { title: "Getting to know your rhythm", note: overdue ? "Your period is later than expected, so dates may shift." : "A best estimate, refined as you log more." };
  if (irregular) return { title: "Your cycle varies a bit", note: "We show a range of dates, refined as you log more." };
  return { title: "Following your cycle", note: overdue ? "Your period is later than expected, so dates may shift." : `Estimated from your last ${n} cycles.` };
}
export const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
export const span = (a?: string | null, b?: string | null) => (a && b && a !== b ? `${fmtDate(a)} – ${fmtDate(b)}` : "");