// frontend/periods-onboarding/src/Features/insights/RangeCalendar.tsx
// Month calendar for picking a date range (From / To fields, range highlight, keyboard navigation).
// Dates are ISO strings ("YYYY-MM-DD"), same as the rest of the insights page.
import { useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, parseIso, toIso } from "../../lib/isoDate";

export interface DraftRange {
  from: string | null;
  to: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const KEY_OFFSETS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const pad = (n: number) => String(n).padStart(2, "0");
const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
const addMonths = (iso: string, n: number) => {
  const d = parseIso(monthStart(iso));
  d.setMonth(d.getMonth() + n);
  return toIso(d);
};
/** "01 Sept 2026" */
const fieldDate = (iso: string) => {
  const d = parseIso(iso);
  return `${pad(d.getDate())} ${d.getMonth() === 8 ? "Sept" : MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const monthTitle = (iso: string) => {
  const d = parseIso(iso);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
};
const fullDate = (iso: string) => {
  const d = parseIso(iso);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

/** Weeks of a month; null pads the leading and trailing cells. */
function monthWeeks(month: string): (string | null)[][] {
  const first = parseIso(monthStart(month));
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= total; day += 1) cells.push(`${month.slice(0, 7)}-${pad(day)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const NAV = "grid size-10 place-items-center rounded-full text-[#68708A] transition-colors hover:bg-[#f1edff] disabled:opacity-30 disabled:hover:bg-transparent";
const PINK_SOFT = "#FFF0F6";

function dayClasses(state: "unavailable" | "selected" | "inRange" | "idle") {
  const base = "mx-auto grid size-9 place-items-center rounded-full text-xs font-medium transition-colors md:text-[13px]";
  switch (state) {
    case "unavailable":
      return `${base} cursor-not-allowed text-[#8A92A6]/50 line-through`;
    case "selected":
      return `${base} bg-[#F34F97] font-semibold text-white shadow-[0_6px_14px_-4px_rgb(236_72_153/0.6)]`;
    case "inRange":
      return `${base} text-[#6C4DE8] group-hover:bg-white/70`;
    default:
      return `${base} text-[#17152B] group-hover:bg-[#f1edff]`;
  }
}

export function RangeCalendar({ draft, onChange, maxDate }: { draft: DraftRange; onChange: (d: DraftRange) => void; maxDate: string }) {
  const [month, setMonth] = useState(() => monthStart(draft.from ?? maxDate));
  const [focusDate, setFocusDate] = useState(() => draft.from ?? maxDate);
  const gridRef = useRef<HTMLTableElement>(null);
  const weeks = monthWeeks(month);

  const inMonth = focusDate.slice(0, 7) === month.slice(0, 7);
  const tabStop = inMonth ? focusDate : month;
  const unavailable = (day: string) => day > maxDate;
  const atLastMonth = month.slice(0, 7) >= maxDate.slice(0, 7);

  const pick = (day: string) => {
    if (unavailable(day)) return;
    setFocusDate(day);
    if (!draft.from || draft.to) onChange({ from: day, to: null });
    else if (day < draft.from) onChange({ from: day, to: draft.from });
    else onChange({ from: draft.from, to: day });
  };

  const moveFocus = (next: string) => {
    if (unavailable(next)) return;
    flushSync(() => {
      setMonth(monthStart(next));
      setFocusDate(next);
    });
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus();
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const offset = KEY_OFFSETS[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      moveFocus(addDays(day, offset));
    } else if (event.key === "PageDown" || event.key === "PageUp") {
      event.preventDefault();
      const target = addMonths(day, event.key === "PageDown" ? 1 : -1);
      moveFocus(`${target.slice(0, 7)}-${pad(Math.min(parseIso(day).getDate(), 28))}`);
    }
  };

  const rangeEnd = draft.to ?? draft.from;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Selected range">
        {(
          [
            ["From", draft.from],
            ["To", draft.to],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-2xl border border-[#F1DDE8] bg-white px-3.5 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A92A6]">{label}</div>
            <div className="mt-0.5 truncate text-xs font-semibold text-[#17152B] md:text-[13px]">{value ? fieldDate(value) : "—"}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month" className={NAV}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="text-sm font-semibold text-[#17152B]" aria-live="polite">
          {monthTitle(month)}
        </div>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={atLastMonth} aria-label="Next month" className={NAV}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <table ref={gridRef} className="mt-2 w-full table-fixed border-collapse" aria-label={monthTitle(month)}>
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col" className="h-8 text-[11px] font-medium text-[#8A92A6]">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={`${month}-w${wi}`}>
              {week.map((day, ci) => {
                if (!day) return <td key={`blank-${ci}`} className="h-11 p-0" />;
                const isStart = day === draft.from;
                const isEnd = day === draft.to;
                const inRange = !!draft.from && !!rangeEnd && day >= draft.from && day <= rangeEnd;
                const hasSpan = !!draft.from && !!draft.to && draft.from !== draft.to;
                let band = "";
                if (inRange && hasSpan) {
                  if (isStart) band = `bg-[linear-gradient(to_right,transparent_50%,${PINK_SOFT}_50%)]`;
                  else if (isEnd) band = `bg-[linear-gradient(to_right,${PINK_SOFT}_50%,transparent_50%)]`;
                  else band = "bg-[#FFF0F6]";
                }
                const selected = isStart || isEnd;
                const off = unavailable(day);
                const state = off ? "unavailable" : selected ? "selected" : inRange ? "inRange" : "idle";
                return (
                  <td key={day} className={`h-11 p-0 text-center ${band}`}>
                    <button
                      type="button"
                      data-date={day}
                      tabIndex={day === tabStop ? 0 : -1}
                      aria-label={off ? `${fullDate(day)}, unavailable` : fullDate(day)}
                      aria-pressed={selected}
                      disabled={off}
                      onClick={() => pick(day)}
                      onKeyDown={(e) => onKey(e, day)}
                      className="group grid h-11 w-full place-items-center rounded-full"
                    >
                      <span className={dayClasses(state)}>{parseIso(day).getDate()}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}