import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { formatDate, parts } from "../../../../lib/dailyLogDate";
import type { CyclePhase } from "../../../../services/cycle";
import { PHASE_SHORT, type CycleInfo } from "../../shared/daily-log/phaseCopy";

interface Props {
  today: string;
  /** The 7 visible dates */
  dates: string[];
  selectedDate: string;
  info: CycleInfo;
  cycleInfo: (date: string) => CycleInfo;
  isLogged: (date: string) => boolean;
  onSelect: (date: string) => void;
  onToday: () => void;
  onShiftWeek: (n: number) => void;
  /** Accepted so it can replace CycleDayStrip as-is; the reference has no month arrows. */
  onShiftMonth?: (n: number) => void;
}

/** Same phase dots as the reference date selector. */
const PHASE_DOT: Record<CyclePhase, string> = {
  menstrual: "bg-[#F43F8F]",
  follicular: "bg-white border-2 border-solid border-[#CBD5E1]",
  ovulation: "bg-[#22C55E]",
  luteal: "bg-[#8B5CF6]",
  unknown: "",
};

const LEGEND: CyclePhase[] = ["menstrual", "follicular", "ovulation", "luteal"];

const NAV =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#55607A] transition-colors hover:bg-white hover:text-[#17152B]";

export function MenstrualDateSelector({
  today,
  dates,
  selectedDate,
  info,
  cycleInfo,
  isLogged,
  onSelect,
  onToday,
  onShiftWeek,
}: Props) {
  const weekLabel = formatDate(dates[0], { month: "long", day: "numeric", year: "numeric" });

  return (
    <section
      aria-label="Choose a date"
      className="w-full space-y-4 rounded-[22px] border border-[#F1EEF3] bg-white p-4 shadow-[0_8px_28px_rgba(23,21,43,0.045)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5 text-left">
          <h2 className="text-lg font-black tracking-tight text-[#17152B] sm:text-xl">
            {info.cycleDay != null ? (
              <>
                Cycle Day <span className="text-[#C2185B]">{info.cycleDay}</span>
              </>
            ) : (
              "Cycle day unknown"
            )}
          </h2>
          <p className="text-xs font-medium text-[#68708A]">
            {selectedDate === today ? "Today · " : ""}
            {formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric" })}
            {info.phase !== "unknown" ? ` · ${PHASE_SHORT[info.phase]}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-0.5 rounded-full border border-[#F1DDE8]/70 bg-[#FAF8FA] p-0.5">
          <button type="button" onClick={() => onShiftWeek(-1)} aria-label="Show previous week" className={NAV}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="min-h-[44px] cursor-pointer rounded-full border border-pink-200 bg-[#FFF0F6] px-4 text-xs font-bold text-[#C2185B] shadow-2xs transition-colors hover:bg-pink-100"
          >
            Today
          </button>
          <button type="button" onClick={() => onShiftWeek(1)} aria-label="Show next week" className={NAV}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <ul className="grid min-w-[300px] grid-cols-7 gap-1 sm:gap-2" aria-label={`Week of ${weekLabel}`}>
          {dates.map((date) => {
            const day = cycleInfo(date);
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const logged = isLogged(date);
            const label = [
              formatDate(date, { weekday: "long", month: "long", day: "numeric" }),
              isToday ? "today" : null,
              day.cycleDay != null ? `cycle day ${day.cycleDay}` : null,
              day.phase !== "unknown" ? PHASE_SHORT[day.phase] : null,
              logged ? "logged" : "not logged",
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <li key={date}>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => onSelect(date)}
                  className={`flex min-h-[76px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-2 transition-all ${
                    isSelected
                      ? "bg-[#D81B60] text-white shadow-md shadow-pink-300/40"
                      : "text-[#17152B] hover:bg-[#FFF0F6]/70"
                  } ${isToday && !isSelected ? "ring-2 ring-inset ring-[#F43F8F]/40" : ""}`}
                >
                  <span className={`text-[0.66rem] font-bold uppercase leading-tight ${isSelected ? "text-white/90" : "text-[#68708A]"}`}>
                    {formatDate(date, { month: "short" })}
                  </span>
                  <span className="text-base font-black leading-tight sm:text-lg">{parts(date).d}</span>
                  <span className={`text-[0.62rem] font-bold leading-tight ${isSelected ? "text-white/95" : "text-[#68708A]"}`}>
                    {day.cycleDay != null ? `CD ${day.cycleDay}` : "—"}
                  </span>
                  <span className="mt-1 flex h-3 items-center gap-1" aria-hidden="true">
                    {day.phase !== "unknown" && <span className={`h-2.5 w-2.5 rounded-full ${PHASE_DOT[day.phase]}`} />}
                    {logged && <Check className={`h-3 w-3 ${isSelected ? "text-white" : "text-[#047857]"}`} strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <ul
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-[#F1DDE8]/60 pt-2 text-[0.7rem] font-medium text-[#55607A] sm:justify-start"
        aria-label="Legend"
      >
        {LEGEND.map((phase) => (
          <li key={phase} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${PHASE_DOT[phase]}`} />
            <span>{PHASE_SHORT[phase]}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <Check className="h-3 w-3 text-[#047857]" strokeWidth={3} aria-hidden="true" />
          <span>Logged</span>
        </li>
      </ul>
    </section>
  );
}
