import { ArrowRight, Pill } from "lucide-react";
import { fmtDate } from "../../../dashboard/phases";
import type { IntakeRecord } from "../../../../services/logs";
import { Visual3DMedicine } from "./VisualAssets3D";

interface Props {
  entries: IntakeRecord[];
  onViewAll: () => void;
}

/** Real logged intakes only. */
export function MenstrualMedicationHistory({ entries, onViewAll }: Props) {
  return (
    <section aria-labelledby="menstrual-med-history" className="min-h-[155px] w-full rounded-[24px] border border-[#F1DDE8]/80 bg-[#FFFCFE] p-4 text-left sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]" aria-hidden="true">
            <Pill className="size-5 -rotate-45" />
          </div>
          <div>
            <h2 id="menstrual-med-history" className="text-[15px] font-bold tracking-tight text-[#17152B]">
              Medication History
            </h2>
            <p className="text-xs text-[#68708A] sm:text-[13px]">Medications you&apos;ve logged throughout your cycle</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 px-1 text-xs font-bold text-[#F43F8F] transition-colors hover:text-[#D81B60] sm:text-sm"
        >
          <span>View All History</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center sm:mt-5">
          <div className="mb-2.5 flex size-12 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F] shadow-2xs" aria-hidden="true">
            <Pill className="size-6 -rotate-45" />
          </div>
          <h3 className="text-sm font-bold text-[#17152B] sm:text-base">No medications logged</h3>
          <p className="mt-0.5 text-xs text-[#68708A] sm:text-[13px]">Mark a medication as taken in your Daily Log and it will appear here.</p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {entries.map((m, i) => (
            <li
              key={`${m.date}-${m.name}-${i}`}
              className="flex min-h-[118px] flex-col justify-between gap-3 rounded-[20px] border border-[#F1DDE8] bg-white p-4 transition-shadow hover:shadow-[0_6px_18px_rgba(236,72,153,0.10)]"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6]" aria-hidden="true">
                  <Visual3DMedicine name={m.name} className="size-8 object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-[13px] font-bold tracking-tight text-[#17152B]">{m.name}</h3>
                  <p className="mt-0.5 text-[11px] text-[#68708A]">{m.dose || "—"}</p>
                </div>
              </div>
              <div className="flex items-end justify-between gap-2">
                <p className="text-[11px] leading-relaxed text-[#68708A]">{fmtDate(m.date)}</p>
                <span className="rounded-full border border-pink-100 bg-[#FFF0F6] px-2.5 py-0.5 text-[10px] font-bold capitalize text-[#D81B60]">{m.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
