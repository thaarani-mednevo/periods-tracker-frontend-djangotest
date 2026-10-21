import { useCallback, type KeyboardEvent } from "react";
import { ChevronRight, Pill } from "lucide-react";
import { useAsync } from "../../../../hooks/useAsync";
import { localISODate } from "../../../../services/cycle";
import { getMedicationHistory, getMedications } from "../../../../services/logs";
import { fmtDate } from "../../../dashboard/phases";
import { MED_ORDER as ORDER, MED_SEG as SEG, MedicationRing, type MedSegKey as SegKey } from "./MedicationRing";

/**
 * "Medication" log card for ONE day (the day being viewed): "3 out of 5" doses taken + a status ring.
 * Location: src/Features/phases/shared/ui/MedicationScoreCard.tsx
 *
 * Ring arcs: taken (includes taken late) and skipped. Upcoming doses stay as the empty track.
 * Centre % = taken / all of that day's doses.
 * Fetches its own data, so a phase only needs to pass `day` and `onOpen` (opens the Daily Log).
 */

const CARD =
  "group relative flex min-h-[clamp(120px,8.5vw,148px)] w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lu-card border border-lu-brand-line bg-white p-lu-card text-left shadow-lu-card transition-all hover:border-pink-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300";

const HALO =
  "group relative flex min-h-[128px] w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[22px] border border-[#FBE3EE] bg-white p-4 text-left shadow-[0_6px_22px_rgba(236,72,153,0.06)] ring-[6px] ring-[#FFF4F9] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(236,72,153,0.12)] focus:outline-none focus-visible:ring-pink-300 sm:p-5";

interface MedicationScoreCardProps {
  /** ISO date being viewed (YYYY-MM-DD). */
  day: string;
  /** Opens the Daily Log. */
  onOpen: () => void;
  className?: string;
  /** Pink halo border, to match the Menstrual metric cards. */
  halo?: boolean;
}

export function MedicationScoreCard({ day, onOpen, className = "", halo = false }: MedicationScoreCardProps) {
  const load = useCallback((s: AbortSignal) => getMedicationHistory(day, day, s), [day]);
  const meds = useAsync(load);
  const loadList = useCallback((s: AbortSignal) => getMedications(day, s), [day]);
  const list = useAsync(loadList);

  const intakes = (meds.data?.intakes ?? []).filter((m) => m.date.slice(0, 10) === day);
  const medList = list.data?.medications ?? [];

  // Doses taken late count as Taken. Upcoming = not due or not logged yet.
  const counts: Record<SegKey, number> = {
    taken: intakes.filter((m) => m.status === "taken").length,
    skipped: intakes.filter((m) => m.status === "skipped").length,
    upcoming: intakes.filter((m) => m.status === "pending").length,
  };
  const total = intakes.length || medList.length;
  const done = counts.taken;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const legend = ORDER.filter((k) => counts[k] > 0);

  const loading = (meds.status === "loading" && !meds.data) || (list.status === "loading" && !list.data);
  const failed = meds.status === "error" && !meds.data;
  const empty = !loading && !failed && total === 0;
  const dayLabel = day === localISODate() ? "today" : fmtDate(day);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      aria-label="Medication. Open Daily Log to update"
      className={`${halo ? HALO : CARD} ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
          <Pill className="size-3.5" strokeWidth={2.3} aria-hidden="true" />
        </div>
        <span className="truncate text-lu-label font-semibold text-lu-ink">Medication</span>
      </div>

      <div className="relative z-10 mt-1 flex flex-1 items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <span className="text-lu-caption text-lu-ink-muted">Taken {dayLabel}</span>
          {failed ? (
            <span className="mt-2 text-lu-label text-lu-ink-muted">Couldn&apos;t load medications</span>
          ) : empty ? (
            <span className="mt-1 text-lu-label font-semibold text-lu-ink">No medications scheduled</span>
          ) : (
            <span className="mt-1 text-lu-metric font-bold text-lu-ink">
              {loading ? "—" : done}
              {!loading && <span className="ml-1.5 text-lu-body font-semibold text-lu-ink-muted">out of {total}</span>}
            </span>
          )}
          {!loading && !failed && legend.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="Dose breakdown">
              {legend.map((k) => (
                <li key={k} className="inline-flex items-center gap-1 text-lu-caption text-lu-ink-muted">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SEG[k].color }} aria-hidden="true" />
                  <span className="font-semibold text-lu-ink">{counts[k]}</span> {SEG[k].label}
                </li>
              ))}
            </ul>
          )}
          <span className="mt-auto inline-flex items-center gap-1 pt-3 text-lu-caption font-semibold text-[#F43F8F]">
            View / Edit Log <ChevronRight className="size-3.5" aria-hidden="true" />
          </span>
        </div>

        <MedicationRing counts={counts} total={total} pct={pct} muted={loading || failed} />
      </div>
    </div>
  );
}