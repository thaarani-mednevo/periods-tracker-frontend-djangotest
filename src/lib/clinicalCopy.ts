/**
 * Every piece of medical wording the app shows for a late or missing period lives in this one file, so a
 * clinician can review and edit it in one place.
 *
 * PENDING CLINICAL REVIEW: the thresholds and every string below are developer drafts. Do not ship to
 * production before a clinician has signed them off. Keep the tone informational: no diagnosis, no causes.
 */
export const LATE_PERIOD_COPY = {
  /** Period this many days later than predicted. */
  testHintAfterDays: 7,
  testHint: "A late period can have many causes. If you could be pregnant, a pregnancy test is a good next step.",
  /** Days since the last logged period STARTED. */
  checkInAfterDays: 60,
  checkIn:
    "It's been over two months since your last logged period. If this isn't usual for you, consider talking to a healthcare professional.",
  seeDoctorAfterDays: 90,
  seeDoctor:
    "It's been about three months or more since your last logged period. Please consider speaking with a healthcare professional, and take a pregnancy test if there's a chance you could be pregnant.",
} as const;

/** Whole days from one ISO date (YYYY-MM-DD) to another. Noon avoids daylight-saving edge cases. */
export function daysBetweenIso(from: string, to: string): number {
  const ms = new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/** The most relevant note for a late period, or null when nothing should be said yet. */
export function latePeriodNote(daysSinceLastPeriodStart: number, overdueDays: number): string | null {
  const c = LATE_PERIOD_COPY;
  if (daysSinceLastPeriodStart >= c.seeDoctorAfterDays) return c.seeDoctor;
  if (daysSinceLastPeriodStart >= c.checkInAfterDays) return c.checkIn;
  if (overdueDays >= c.testHintAfterDays) return c.testHint;
  return null;
}