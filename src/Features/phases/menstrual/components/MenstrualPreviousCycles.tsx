import { CalendarPlus } from "lucide-react";
import { InfoCard } from "../../../../Elements/infoCard/InfoCard";
import type { PeriodEntry } from "../../../../services/cycle";
import { fmtDate } from "../../../dashboard/phases";
import { days, span } from "../../shared";
import { surface } from "./surface";

interface Props {
  status: "loading" | "ready" | "error";
  /** Completed cycles only (cycleLength known). */
  cycles: PeriodEntry[];
  errorMessage?: string;
  onRetry: () => void;
}

export function MenstrualPreviousCycles({ status, cycles, errorMessage, onRetry }: Props) {
  return (
    <section aria-labelledby="menstrual-previous" className={`${surface.card} min-h-[165px] w-full space-y-4 p-5 text-left sm:p-6`}>
      <h2 id="menstrual-previous" className="text-[15px] font-bold tracking-tight text-[#17152B] sm:text-base">
        Previous Cycles
      </h2>

      {status === "loading" && <p className="text-xs text-[#68708A] sm:text-[13px]">Loading…</p>}
      {status === "error" && (
        <InfoCard live>
          {errorMessage ?? "Couldn't load your cycle history."}{" "}
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Try again
          </button>
        </InfoCard>
      )}

      {status === "ready" && cycles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-2.5 flex size-12 items-center justify-center rounded-2xl border border-[#F9A8D4] bg-[#FFF0F6] text-[#F43F8F] shadow-2xs" aria-hidden="true">
            <CalendarPlus className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-[#17152B] sm:text-base">No previous cycles yet</h3>
          <p className="mt-0.5 text-xs text-[#68708A] sm:text-[13px]">Completed cycles show up here once you log your next period.</p>
        </div>
      )}

      {status === "ready" && cycles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Completed cycles</caption>
            <thead>
              <tr className="border-b border-[#F1F1F4] text-xs font-medium text-[#8A92A6]">
                <th scope="col" className="pb-2.5 font-normal">Cycle</th>
                <th scope="col" className="pb-2.5 font-normal">Cycle Length</th>
                <th scope="col" className="pb-2.5 font-normal">Period Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8F7FA] text-xs text-[#374151] sm:text-[13px]">
              {cycles.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-[#FFFDFE]">
                  <th scope="row" className="py-3 font-normal text-[#374151]">
                    {p.endDate ? span(p.startDate, p.endDate) || fmtDate(p.startDate) : fmtDate(p.startDate)}
                  </th>
                  <td className="py-3">{days(p.cycleLength ?? 0)}</td>
                  <td className="py-3">{p.periodLength ? days(p.periodLength) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
