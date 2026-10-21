/** Shared dose-slot helpers for the Medication History page and the global dose reminder popup. */

const two = (n: number) => String(n).padStart(2, "0");
const OFFSETS: Record<number, number[]> = { 1: [0], 2: [0, 12], 3: [0, 5, 10], 4: [0, 4, 8, 12] };

export function dosesPerDay(freq?: string) {
  const f = (freq ?? "").toLowerCase();
  if (f.includes("four")) return 4;
  if (f.includes("three")) return 3;
  if (f.includes("twice") || f.includes("two")) return 2;
  return 1;
}

/** "HH:mm" time of every dose of a medicine (exact times when the user set them, otherwise spread from the first). */
export function slotTimes(time: string, freq?: string, custom?: string[]) {
  const n = dosesPerDay(freq);
  const exact = (custom ?? []).filter(Boolean);
  if (exact.length >= n) return [...exact].slice(0, n).sort();
  const [h, m] = time.split(":").map(Number);
  return OFFSETS[n].map((off) => `${two((h + off) % 24)}:${two(m)}`);
}

/** Fired after the reminder popup saves a dose, so open pages can refetch. */
export const DOSES_CHANGED_EVENT = "mednevo:doses-changed";

/** A dose taken later than this many minutes after its scheduled time counts as "Taken late". */
export const LATE_GRACE_MIN = 15;

const SNOOZED_KEY = "mednevo.snoozedDoses.v1";
const doseKey = (medId: string | number, date: string, slot: number) => `${medId}|${date}|${slot}`;

function readSnoozed(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZED_KEY) || "{}") as Record<string, true>;
  } catch {
    return {};
  }
}

/** Remember that this dose was snoozed, so taking it afterwards is shown as "Taken late". */
export function markSnoozed(medId: string | number, date: string, slot: number) {
  try {
    const all = readSnoozed();
    all[doseKey(medId, date, slot)] = true;
    // keep the list small: drop anything that is not from the last 3 days
    const keep = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    for (const k of Object.keys(all)) if (k.split("|")[1] < keep) delete all[k];
    localStorage.setItem(SNOOZED_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: the time-based "late" rule still applies */
  }
}

export const wasSnoozed = (medId: string | number, date: string, slot: number) => readSnoozed()[doseKey(medId, date, slot)] === true;

/** Late = it was snoozed first, or it was logged more than LATE_GRACE_MIN after the scheduled time. */
export function isTakenLate(date: string, time: string, loggedAt: string | null | undefined, snoozed: boolean) {
  if (snoozed) return true;
  if (!loggedAt) return false;
  const logged = new Date(loggedAt).getTime();
  const scheduled = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(logged) && Number.isFinite(scheduled) && logged - scheduled > LATE_GRACE_MIN * 60_000;
}
