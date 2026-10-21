import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Droplet, Pill } from "lucide-react";
import type { OnboardingData } from "../../types";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal, flushSync } from "react-dom";
import { InfoCard } from "../../Elements/infoCard/InfoCard";
import { useCycle } from "../../hooks/useCycle";
import { LutealShell } from "../phases/luteal/components/Shell";
import { useAsync } from "../../hooks/useAsync";
import { toIso } from "../../lib/isoDate";
import { getCurrentCycle, getPredictions, localISODate, type CyclePhase, type PredictedDay } from "../../services/cycle";
import { getLogRange, getMedicationHistory } from "../../services/logs";

type KnownPhase = Exclude<CyclePhase, "unknown">;
type CellKind = KnownPhase | "window";

/** Phase look: pastel pills, solid green for ovulation, orange for the fertile window. */
const PHASE: Record<KnownPhase, { label: string; short: string; pill: string; badge: string; dot: string }> = {
  menstrual: {
    label: "Menstruation",
    short: "Period",
    pill: "bg-[#FFDCEC] text-[#E5007A]",
    badge: "border-pink-200 text-[#D81B60]",
    dot: "bg-[#F43F8F]",
  },
  follicular: {
    label: "Follicular Phase",
    short: "Follicular",
    pill: "bg-[#E4EEFF] text-[#2F63C8]",
    badge: "border-blue-200 text-[#2F63C8]",
    dot: "bg-[#60A5FA]",
  },
  ovulation: {
    label: "Ovulation",
    short: "Ovulation",
    pill: "bg-[#22C55E] text-white shadow-[0_8px_18px_rgba(34,197,94,0.4)]",
    badge: "border-emerald-300 text-[#16A34A]",
    dot: "bg-[#22C55E]",
  },
  luteal: {
    label: "Luteal Phase",
    short: "Luteal",
    pill: "bg-[#E4DDFB] text-[#5B3FC4]",
    badge: "border-purple-200 text-[#6D4AD8]",
    dot: "bg-[#8B5CF6]",
  },
};

/** Follicular days are shaded light blue (not in the Figma legend, but they are a real phase). Set to false to leave them plain. */
const COLOR_FOLLICULAR = false;

/** Estimated fertile window around the ovulation day (the day itself stays solid green). */
const WINDOW_PILL = "bg-[#FDE8CC] text-[#C2761A]";

/** Solid pink location pin with a white dot: the Figma "intercourse" marker. */
function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="#F43F8F" />
      <circle cx="12" cy="10" r="2.6" fill="#fff" />
    </svg>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDaysIso = (iso: string, n: number) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const fmtShort = (iso: string) => fromIso(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtLong = (iso: string) =>
  fromIso(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const diffDays = (a: string, b: string) => Math.round((fromIso(a).getTime() - fromIso(b).getTime()) / 86400000);
const eachDay = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from, i = 0; d <= to && i < 800; d = addDaysIso(d, 1), i += 1) out.push(d);
  return out;
};

function phaseOf(info?: PredictedDay): KnownPhase | null {
  if (!info) return null;
  if (info.isOvulationDay) return "ovulation";
  return info.phase === "unknown" ? null : info.phase;
}

const navBtn =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#F7EEF6] text-[#55607A] transition-colors hover:bg-[#F1E2EF]";
const selectCls =
  "h-8 cursor-pointer rounded-full border border-[#F1DDE8] bg-[#FFF7FA] px-3 text-xs font-semibold text-[#17152B] outline-none transition-colors hover:bg-[#FFF0F6]";
const sideCard =
  "flex items-center justify-between gap-3 rounded-[18px] border border-[#FBD9E7] bg-[#FFF7FA] p-2.5 shadow-[0_2px_12px_rgba(236,72,153,0.05)]";

/* ------------------------------------------------------------------ */
/* Section filter: 7 days / 1 month / custom range                     */
/* ------------------------------------------------------------------ */

type SpanKind = "week" | "month" | "custom";
interface SpanState {
  kind: SpanKind;
  from: string;
  to: string;
}
type Section = "past" | "today" | "upcoming";

const INITIAL_SPAN: SpanState = { kind: "week", from: "", to: "" };

/** Turns a filter choice into a concrete date range around the picked day. */
function resolveSpan(s: SpanState, section: Section, anchor: string) {
  if (s.kind === "custom" && s.from && s.to) return { from: s.from, to: s.to };
  const n = s.kind === "month" ? 30 : 7;
  if (section === "past") return { from: addDaysIso(anchor, -n), to: addDaysIso(anchor, -1) };
  if (section === "today") return { from: addDaysIso(anchor, -(n - 1)), to: anchor };
  return { from: addDaysIso(anchor, 1), to: addDaysIso(anchor, n) };
}

const spanButtonLabel = (s: SpanState) =>
  s.kind === "custom" && s.from && s.to ? `${fmtShort(s.from)} – ${fmtShort(s.to)}` : s.kind === "month" ? "1 month" : "7 days";

const RC_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RC_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const RC_KEY_OFFSETS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const rcPad = (n: number) => String(n).padStart(2, "0");
const rcMonthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
const rcAddMonths = (iso: string, n: number) => {
  const d = fromIso(rcMonthStart(iso));
  d.setMonth(d.getMonth() + n);
  return toIso(d);
};
const rcFieldDate = (iso: string) => {
  const d = fromIso(iso);
  return `${rcPad(d.getDate())} ${d.getMonth() === 8 ? "Sept" : RC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const rcMonthTitle = (iso: string) => {
  const d = fromIso(iso);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
};
const rcFullDate = (iso: string) => {
  const d = fromIso(iso);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

/** Weeks of a month; null pads the leading and trailing cells. */
function rcMonthWeeks(month: string): (string | null)[][] {
  const first = fromIso(rcMonthStart(month));
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= total; day += 1) cells.push(`${month.slice(0, 7)}-${rcPad(day)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const RC_NAV = "grid size-10 place-items-center rounded-full text-[#68708A] transition-colors hover:bg-[#f1edff] disabled:opacity-30 disabled:hover:bg-transparent";

function rcDayClasses(state: "unavailable" | "selected" | "inRange" | "idle") {
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

interface DraftRange {
  from: string | null;
  to: string | null;
}

function RangeCalendar({
  draft,
  onChange,
  minDate,
  maxDate,
  anchor,
}: {
  draft: DraftRange;
  onChange: (d: DraftRange) => void;
  minDate: string;
  maxDate: string;
  anchor: string;
}) {
  const startAt = draft.from ?? anchor;
  const [month, setMonth] = useState(() => rcMonthStart(startAt));
  const [focusDate, setFocusDate] = useState(() => startAt);
  const gridRef = useRef<HTMLTableElement>(null);
  const weeks = rcMonthWeeks(month);

  const inMonth = focusDate.slice(0, 7) === month.slice(0, 7);
  const tabStop = inMonth ? focusDate : month;
  const unavailable = (day: string) => day < minDate || day > maxDate;
  const atLastMonth = month.slice(0, 7) >= maxDate.slice(0, 7);
  const atFirstMonth = month.slice(0, 7) <= minDate.slice(0, 7);

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
      setMonth(rcMonthStart(next));
      setFocusDate(next);
    });
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus();
  };

  const onKey = (event: ReactKeyboardEvent<HTMLButtonElement>, day: string) => {
    const offset = RC_KEY_OFFSETS[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      moveFocus(addDaysIso(day, offset));
    } else if (event.key === "PageDown" || event.key === "PageUp") {
      event.preventDefault();
      const target = rcAddMonths(day, event.key === "PageDown" ? 1 : -1);
      moveFocus(`${target.slice(0, 7)}-${rcPad(Math.min(fromIso(day).getDate(), 28))}`);
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
            <div className="mt-0.5 truncate text-xs font-semibold text-[#17152B] md:text-[13px]">{value ? rcFieldDate(value) : "—"}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(rcAddMonths(month, -1))} disabled={atFirstMonth} aria-label="Previous month" className={RC_NAV}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="text-sm font-semibold text-[#17152B]" aria-live="polite">
          {rcMonthTitle(month)}
        </div>
        <button type="button" onClick={() => setMonth(rcAddMonths(month, 1))} disabled={atLastMonth} aria-label="Next month" className={RC_NAV}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <table ref={gridRef} className="mt-2 w-full table-fixed border-collapse" aria-label={rcMonthTitle(month)}>
        <thead>
          <tr>
            {RC_WEEKDAYS.map((w) => (
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
                if (!day) return <td key={`blank-${ci}`} className="h-10 p-0" />;
                const isStart = day === draft.from;
                const isEnd = day === draft.to;
                const inRange = !!draft.from && !!rangeEnd && day >= draft.from && day <= rangeEnd;
                const hasSpan = !!draft.from && !!draft.to && draft.from !== draft.to;
                let band = "";
                if (inRange && hasSpan) {
                  if (isStart) band = "bg-[linear-gradient(to_right,transparent_50%,#FFF0F6_50%)]";
                  else if (isEnd) band = "bg-[linear-gradient(to_right,#FFF0F6_50%,transparent_50%)]";
                  else band = "bg-[#FFF0F6]";
                }
                const selected = isStart || isEnd;
                const off = unavailable(day);
                const state = off ? "unavailable" : selected ? "selected" : inRange ? "inRange" : "idle";
                return (
                  <td key={day} className={`h-10 p-0 text-center ${band}`}>
                    <button
                      type="button"
                      data-date={day}
                      tabIndex={day === tabStop ? 0 : -1}
                      aria-label={off ? `${rcFullDate(day)}, unavailable` : rcFullDate(day)}
                      aria-pressed={selected}
                      disabled={off}
                      onClick={() => pick(day)}
                      onKeyDown={(e) => onKey(e, day)}
                      className="group grid h-10 w-full place-items-center rounded-full"
                    >
                      <span className={rcDayClasses(state)}>{fromIso(day).getDate()}</span>
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

interface FilterMenuProps {
  ariaLabel: string;
  state: SpanState;
  onKind: (kind: "week" | "month") => void;
  custom: { min: string; max: string; anchor: string; onApply: (from: string, to: string) => void };
}

const FILTER_OPTIONS: { id: "week" | "month"; label: string }[] = [
  { id: "week", label: "7 days" },
  { id: "month", label: "1 month" },
];

function FilterMenu({ ariaLabel, state, onKind, custom }: FilterMenuProps) {
  const [view, setView] = useState<"closed" | "menu" | "calendar">("closed");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties>({ visibility: "hidden" });

  // Portaled to <body> with fixed positioning so the popover floats above the page.
  const place = useCallback(() => {
    const btn = ref.current;
    const pop = popRef.current;
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect();
    const margin = 8;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.max(margin, Math.min(r.right - w, window.innerWidth - w - margin));
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - h - margin);
    setPos({ position: "fixed", top, left, visibility: "visible" });
  }, []);

  useLayoutEffect(() => {
    if (view === "closed") return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [view, place]);

  useEffect(() => {
    if (view === "closed") return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !popRef.current?.contains(t)) setView("closed");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setView("closed");
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [view]);

  const draftEnd = draftTo || draftFrom;
  const draftValid =
    !!draftFrom && draftFrom >= custom.min && draftFrom <= draftEnd && draftEnd <= custom.max && addDaysIso(draftFrom, 365) >= draftEnd;
  const popover = "z-[110] border border-[#F34F97]/15 bg-white shadow-[0_24px_60px_-16px_rgb(80_40_140/0.35)]";
  const customActive = state.kind === "custom";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={view !== "closed"}
        aria-label={ariaLabel}
        onClick={() => setView((v) => (v === "closed" ? "menu" : "closed"))}
        className="flex h-8 items-center gap-1.5 rounded-full border border-[#F34F97]/25 bg-[#FFF0F6]/60 px-3 text-xs font-semibold text-[#17152B] transition-colors hover:bg-[#FFF0F6]"
      >
        <CalendarDays className="size-3.5 text-[#F34F97]" aria-hidden="true" />
        <span>{spanButtonLabel(state)}</span>
        <ChevronDown className="size-3.5 text-[#68708A]" aria-hidden="true" />
      </button>

      {view === "menu" &&
        createPortal(
          <div ref={popRef} style={pos} role="menu" aria-label={ariaLabel} className={`${popover} w-[min(210px,calc(100vw-3rem))] rounded-[22px] p-2`}>
            {FILTER_OPTIONS.map((o) => {
              const checked = state.kind === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={checked}
                  onClick={() => {
                    onKind(o.id);
                    setView("closed");
                  }}
                  className={`flex h-10 w-full items-center gap-3 rounded-2xl px-3 text-xs ${checked ? "bg-[#FFF0F6] font-semibold text-[#17152B]" : "text-[#68708A] hover:bg-[#f1edff]/60"}`}
                >
                  <CalendarDays className={`size-4 ${checked ? "text-[#F34F97]" : "text-[#8A92A6]"}`} aria-hidden="true" />
                  <span className="flex-1 text-left">{o.label}</span>
                  {checked && <Check className="size-4 text-[#F34F97]" aria-hidden="true" />}
                </button>
              );
            })}
            <div className="mx-2 my-1 h-px bg-[#F1DDE8]" />
            <button
              type="button"
              role="menuitemradio"
              aria-checked={customActive}
              aria-haspopup="dialog"
              onClick={() => {
                setDraftFrom(customActive ? state.from : "");
                setDraftTo(customActive ? state.to : "");
                setView("calendar");
              }}
              className={`flex h-10 w-full items-center gap-3 rounded-2xl px-3 text-xs ${customActive ? "bg-[#FFF0F6] font-semibold text-[#17152B]" : "text-[#68708A] hover:bg-[#f1edff]/60"}`}
            >
              <CalendarDays className={`size-4 ${customActive ? "text-[#F34F97]" : "text-[#8A92A6]"}`} aria-hidden="true" />
              <span className="flex-1 text-left">Custom range</span>
              <ChevronRight className="size-4 text-[#8A92A6]" aria-hidden="true" />
            </button>
          </div>,
          document.body,
        )}

      {view === "calendar" &&
        createPortal(
          <div ref={popRef} style={pos} role="dialog" aria-label="Custom date range" className={`${popover} w-[min(330px,calc(100vw-3rem))] rounded-[26px] p-4`}>
            <RangeCalendar
              draft={{ from: draftFrom || null, to: draftTo || null }}
              onChange={(d) => {
                setDraftFrom(d.from ?? "");
                setDraftTo(d.to ?? "");
              }}
              minDate={custom.min}
              maxDate={custom.max}
              anchor={custom.anchor}
            />
            {draftFrom && !draftValid && <p className="mt-2 text-[11px] text-[#e5484d]">Pick a range of up to 1 year.</p>}
            <div className="mt-3 flex justify-end gap-2 border-t border-[#F1DDE8] pt-3">
              <button type="button" onClick={() => setView("closed")} className="h-10 rounded-full px-4 text-xs font-medium text-[#68708A] hover:bg-[#f1edff]">
                Cancel
              </button>
              <button
                type="button"
                disabled={!draftValid}
                onClick={() => {
                  custom.onApply(draftFrom, draftEnd);
                  setView("closed");
                }}
                className="h-10 rounded-full bg-[#F34F97] px-5 text-xs font-semibold text-white disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

interface CalendarPageProps {
  data: OnboardingData;
  onBack: () => void;
  onOpenDay: (day: string) => void;
  onOpenOverview: () => void;
  onOpenDailyLog: () => void;
  onOpenTrends: () => void;
  onOpenMedicationHistory: () => void;
  onOpenSettings: () => void;
  selectedDay?: string;
}

export function CalendarPage({
  data,
  onOpenDay,
  onOpenOverview,
  onOpenDailyLog,
  onOpenTrends,
  onOpenMedicationHistory,
  onOpenSettings,
  selectedDay,
}: CalendarPageProps) {
  const cycle = useCycle(selectedDay);

  const today = localISODate();
  const now = new Date();
  const base = selectedDay ? fromIso(selectedDay) : now; // opens in the month of the selected date
  const [cursor, setCursor] = useState({ y: base.getFullYear(), m: base.getMonth() });
  // The day the user clicked in the calendar; drives the Past / Selected / Next panels on the right.
  const [picked, setPicked] = useState(selectedDay ?? today);
  useEffect(() => {
    if (selectedDay) setPicked(selectedDay);
  }, [selectedDay]);

  // Side card: Past / Upcoming tab (Today sits at the top of Upcoming), each with its own 7 days / 1 month / custom range filter.
  const [tab, setTab] = useState<"past" | "upcoming">("upcoming");
  const [pastSpan, setPastSpan] = useState<SpanState>(INITIAL_SPAN);
  const [upcomingSpan, setUpcomingSpan] = useState<SpanState>(INITIAL_SPAN);

  // Month grid: leading/trailing days from neighbouring months complete the weeks.
  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const last = new Date(cursor.y, cursor.m + 1, 0);
    const start = new Date(cursor.y, cursor.m, 1 - first.getDay());
    const end = new Date(cursor.y, cursor.m + 1, 6 - last.getDay());
    const days: string[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(toIso(d));
    return days;
  }, [cursor]);

  // 6-week months (e.g. Aug 2026) get slightly tighter rows so the page still fits without scrolling.
  const sixWeeks = grid.length / 7 > 5;

  const pastR = resolveSpan(pastSpan, "past", picked);
  const todayR = resolveSpan(INITIAL_SPAN, "today", picked); // Today card summary: always the last 7 days
  const upcomingR = resolveSpan(upcomingSpan, "upcoming", picked);

  // One data window that covers the grid and all three side sections.
  const dataStart = [grid[0], pastR.from, todayR.from].reduce((a, b) => (a < b ? a : b));
  const dataEnd = [grid[grid.length - 1], upcomingR.to, todayR.to].reduce((a, b) => (a > b ? a : b));

  const loadPred = useCallback((s: AbortSignal) => getPredictions(dataStart, dataEnd, s), [dataStart, dataEnd]);
  const pred = useAsync(loadPred);
  const loadLogs = useCallback((s: AbortSignal) => getLogRange(dataStart, dataEnd, s), [dataStart, dataEnd]);
  const logs = useAsync(loadLogs);
  const loadMeds = useCallback((s: AbortSignal) => getMedicationHistory(dataStart, dataEnd, s), [dataStart, dataEnd]);
  const meds = useAsync(loadMeds);
  const current = useAsync(useCallback((signal: AbortSignal) => getCurrentCycle(selectedDay ?? localISODate(), signal), [selectedDay]));

  const byDate = new Map<string, PredictedDay>((pred.data?.days ?? []).map((d) => [d.date, d]));
  const logged = new Set((logs.data?.logs ?? []).map((l) => l.date));
  const logByDate = new Map((logs.data?.logs ?? []).map((l) => [l.date, l]));
  const intercourseDays = new Set((logs.data?.logs ?? []).filter((l) => l.intercourse).map((l) => l.date));
  const bleedDays = new Set((logs.data?.logs ?? []).filter((l) => l.flow).map((l) => l.date));
  const medDays = new Set((meds.data?.intakes ?? []).filter((i) => i.status === "taken").map((i) => i.date));

  // Today card summary: plain counts over its filter range.
  const inTodayRange = (iso: string) => iso >= todayR.from && iso <= todayR.to;
  const todayTotal = diffDays(todayR.to, todayR.from) + 1;
  const todayStats = [
    { label: "Logged", value: `${[...logged].filter(inTodayRange).length}/${todayTotal} days` },
    { label: "Period days", value: String([...bleedDays].filter(inTodayRange).length) },
    { label: "Intercourse", value: String([...intercourseDays].filter(inTodayRange).length) },
    { label: "Meds taken", value: String([...medDays].filter(inTodayRange).length) },
  ];
  const todayRangeText = "Last 7 days";

  const pastDates = eachDay(pastR.from, pastR.to).reverse(); // most recent first
  const upcomingDates = eachDay(upcomingR.from, upcomingR.to);

  // Past rows: short summary of what was logged that day.
  const logSummary = (d: string) => {
    const l = logByDate.get(d);
    if (!l) return "No log yet";
    const parts = [
      l.bbtCelsius != null ? `Baseline BBT: ${l.bbtCelsius.toFixed(2)}°C` : null,
      l.energy ? `${l.energy} Energy` : null,
      l.mood,
      l.intercourse ? "Intercourse logged" : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" • ") : "Log saved";
  };

  const cycleLen = current.data?.cycleProfile.medianCycleLength;
  const todayDayLabel =
    current.data?.date === today && current.data.cycleDay
      ? `Day ${current.data.cycleDay}${cycleLen ? ` of ${Math.round(cycleLen)}` : ""}`
      : null;

  const move = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const goToday = () => setCursor({ y: now.getFullYear(), m: now.getMonth() });

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const years = useMemo(() => {
    const from = Math.min(now.getFullYear() - 5, cursor.y);
    const to = Math.max(now.getFullYear() + 2, cursor.y);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.y]);

  const isPickedToday = picked === today;
  const pickedPhase = phaseOf(byDate.get(picked));
  const pickedCycleDay = byDate.get(picked)?.cycleDay;
  const pickedDayLabel = isPickedToday ? todayDayLabel : pickedCycleDay ? `Day ${pickedCycleDay}` : null;

  const minPast = addDaysIso(today, -1095);

  /** What a calendar cell looks like: phase pill, fertile-window pill or plain. */
  const kindOf = (iso: string): CellKind | null => {
    if (fromIso(iso).getMonth() !== cursor.m) return null;
    const info = byDate.get(iso);
    const phase = phaseOf(info);
    if (phase !== "ovulation" && info?.inOvulationWindow) return "window";
    if (phase === "follicular" && !COLOR_FOLLICULAR) return null;
    return phase;
  };

  return (
    <div className="animate-fade-up w-full pb-2">
      {cycle.status === "ready" && cycle.data && (
        <LutealShell
          data={data}
          state={cycle.data}
          active="calendar"
          compact
          onNavigate={(tab) => {
            if (tab === "overview") onOpenOverview();
            else if (tab === "daily-log") onOpenDailyLog();
            else if (tab === "insights") onOpenTrends();
            else if (tab === "medication-history") onOpenMedicationHistory();
            else if (tab === "settings") onOpenSettings();
          }}
        />
      )}
      <h1 className="sr-only">Cycle calendar</h1>

      {current.data?.phase === "ovulation" && (
        <section className="mb-5 rounded-[22px] border border-emerald-200 bg-gradient-to-r from-[#F0FDF4] to-white p-4 shadow-sm sm:p-5" aria-label="Ovulation calendar summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-micro font-bold uppercase tracking-[0.16em] text-[#16A34A]">Current phase</p>
              <h2 className="mt-1 text-lg font-bold text-[#17152B]">Ovulation · Cycle day {current.data.cycleDay ?? "–"}</h2>
              <p className="mt-1 text-sm text-[#68708A]">Solid green is the estimated ovulation day. Orange is the fertile window around it.</p>
            </div>
            <button type="button" onClick={() => onOpenDay(current.data?.date ?? today)} className="rounded-full bg-[#22C55E] px-4 py-2 text-xs font-bold text-white hover:bg-[#16A34A]">
              Open today&apos;s log
            </button>
          </div>
        </section>
      )}

      {current.data?.phase === "follicular" && (
        <section className="mb-5 rounded-[22px] border border-[#E9D5FF] bg-gradient-to-r from-[#FAF5FF] to-white p-4 shadow-sm sm:p-5" aria-label="Follicular calendar summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-micro font-bold uppercase tracking-[0.16em] text-[#8B5CF6]">Current phase</p>
              <h2 className="mt-1 text-lg font-bold text-[#17152B]">Follicular phase · Cycle day {current.data.cycleDay ?? "–"}</h2>
              <p className="mt-1 text-sm text-[#68708A]">Use the calendar to jump into any day and see the phase-specific Daily Log.</p>
            </div>
            <button type="button" onClick={() => onOpenDay(current.data?.date ?? today)} className="rounded-full bg-[#8B5CF6] px-4 py-2 text-xs font-bold text-white hover:bg-[#7C3AED]">
              Open today&apos;s log
            </button>
          </div>
        </section>
      )}

      <div className="grid w-full grid-cols-1 items-stretch gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
        {/* Month calendar */}
        <section
          aria-labelledby="calendar-month"
          className="flex w-full flex-col gap-4 rounded-[24px] border border-[#F1DDE8] bg-white p-4 shadow-[0_4px_20px_rgba(23,21,43,0.03)] sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="calendar-month" className="text-lg font-bold tracking-tight text-[#17152B] sm:text-xl" aria-live="polite">
              {monthLabel}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                aria-label="Month"
                value={cursor.m}
                onChange={(e) => setCursor((c) => ({ ...c, m: Number(e.target.value) }))}
                className={selectCls}
              >
                {MONTHS_LONG.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Year"
                value={cursor.y}
                onChange={(e) => setCursor((c) => ({ ...c, y: Number(e.target.value) }))}
                className={selectCls}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => move(-1)} aria-label="Previous month" className={navBtn}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Next month" className={navBtn}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="cursor-pointer rounded-full bg-[#FFF0F6] px-4 py-1.5 text-xs font-bold text-[#D81B60] transition-colors hover:bg-pink-100"
              >
                Today
              </button>
            </div>
          </div>

          {pred.status === "error" && (
            <InfoCard live>
              {pred.error?.message ?? "Couldn't load the calendar."}{" "}
              <button type="button" onClick={pred.refetch} className="font-semibold underline">
                Try again
              </button>
            </InfoCard>
          )}

          <div className="flex w-full flex-1 flex-col">
            <div aria-hidden="true" className="grid grid-cols-7 py-1 text-center text-[11px] font-medium text-[#8A8FA3]">
              {WEEKDAYS.map((d, i) => (
                <span key={d} title={WEEKDAYS_LONG[i]}>
                  {d}
                </span>
              ))}
            </div>

            <div className="mt-2 flex flex-1 flex-col justify-around">
              {Array.from({ length: grid.length / 7 }).map((_, week) => {
                const days = grid.slice(week * 7, week * 7 + 7);
                return (
                  <ul key={week} aria-label={`Week ${week + 1}`} className={`grid grid-cols-7 last:mb-0 ${sixWeeks ? "mb-1" : "mb-2"}`}>
                    {days.map((iso) => {
                      const inMonth = fromIso(iso).getMonth() === cursor.m;
                      const info = byDate.get(iso);
                      const kind = kindOf(iso);
                      const isToday = iso === today;
                      const future = iso > today;
                      const hasLog = logged.has(iso);
                      const phase = inMonth ? phaseOf(info) : null;
                      const label = [
                        fmtLong(iso),
                        isToday ? "today" : null,
                        phase ? `${PHASE[phase].label}${info?.type === "estimated" ? " (estimate)" : ""}` : null,
                        kind === "window" ? "fertile window" : null,
                        hasLog ? "has a log" : null,
                        intercourseDays.has(iso) ? "intercourse logged" : null,
                        medDays.has(iso) ? "medication taken" : null,
                      ]
                        .filter(Boolean)
                        .join(", ");

                      const radius = "rounded-full";
                      const margins = "mx-auto w-full max-w-[76px]";
                      const tone = kind === "window" ? WINDOW_PILL : kind ? PHASE[kind].pill : inMonth ? "bg-white text-[#17152B] enabled:hover:bg-pink-50" : "text-[#A0AEC0] enabled:hover:bg-gray-50";

                      return (
                        <li key={iso} className="flex items-center justify-center px-[5px]">
                          <button
                            type="button"
                            disabled={future}
                            onClick={() => setPicked(iso)}
                            aria-label={label}
                            aria-current={isToday ? "date" : undefined}
                            className={`relative flex ${sixWeeks ? "h-8" : "h-9"} flex-col items-center justify-center gap-[2px] transition-all enabled:cursor-pointer disabled:cursor-default ${kind === "ovulation" ? "z-10" : ""} ${radius} ${margins} ${tone} ${
                              isToday ? "ring-2 ring-inset ring-[#F43F8F]" : ""
                            } ${iso === picked && !isToday ? "ring-2 ring-inset ring-[#7C3AED]" : ""}`}
                          >
                            <span className={`text-[13px] leading-none sm:text-sm ${kind ? "font-semibold" : "font-medium"}`}>{fromIso(iso).getDate()}</span>
                            {(medDays.has(iso) || intercourseDays.has(iso) || bleedDays.has(iso)) && (
                              <span aria-hidden="true" className="flex items-center gap-[3px]">
                                {medDays.has(iso) && <Pill className="size-[11px] text-[#2F7D9B]" strokeWidth={2.2} />}
                                {intercourseDays.has(iso) && <PinIcon className="size-[11px]" />}
                                {bleedDays.has(iso) && <Droplet className="size-[10px] text-[#E11D2E]" fill="currentColor" strokeWidth={1.5} />}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <ul
            aria-label="Legend"
            className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 pt-1 text-[11px] font-medium text-[#55607A] sm:gap-x-5"
          >
            {(["menstrual"] as KnownPhase[]).map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${PHASE[p].dot}`} />
                {PHASE[p].label}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#F5A524]" />
              Fertility Window
            </li>
            {((COLOR_FOLLICULAR ? ["ovulation", "luteal", "follicular"] : ["ovulation", "luteal"]) as KnownPhase[]).map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${PHASE[p].dot}`} />
                {PHASE[p].label}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <PinIcon className="size-3.5" />
              Intercourse
            </li>
            <li className="flex items-center gap-1.5">
              <Pill aria-hidden="true" className="size-3.5 text-[#2F7D9B]" strokeWidth={2.2} />
              Med taken
            </li>
          </ul>
        </section>

        {/* Details column: ONE card with Past / Upcoming tabs (Today sits at the top of Upcoming), each with its own 7 days / 1 month / custom filter.
            The card fills the row height set by the calendar and the list scrolls inside it, so the page never gets taller. */}
        <div className="relative h-[34rem] w-full text-left lg:h-[calc(100dvh-21rem)] lg:min-h-[24rem]">
          <section
            aria-label="Past and upcoming days"
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[24px] border border-[#F1DDE8] bg-white shadow-[0_4px_20px_rgba(23,21,43,0.03)]"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F1DDE8]/70 p-3 sm:px-4">
              <div role="tablist" aria-label="Show days" className="inline-flex rounded-full bg-[#FFF0F6] p-1">
                {(["upcoming", "past"] as const).map((id) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`day-tab-${id}`}
                      aria-selected={active}
                      aria-controls="day-tabpanel"
                      onClick={() => setTab(id)}
                      className={`h-8 cursor-pointer rounded-full px-4 text-xs font-bold transition-colors ${
                        active ? "bg-white text-[#D81B60] shadow-[0_2px_8px_rgba(236,72,153,0.18)]" : "text-[#68708A] hover:text-[#17152B]"
                      }`}
                    >
                      {id === "past" ? "Past" : "Upcoming"}
                    </button>
                  );
                })}
              </div>

              {tab === "past" ? (
                <FilterMenu
                  key="past-filter"
                  ariaLabel="Past range"
                  state={pastSpan}
                  onKind={(kind) => setPastSpan({ kind, from: "", to: "" })}
                  custom={{
                    min: minPast,
                    max: addDaysIso(picked, -1),
                    anchor: addDaysIso(picked, -1),
                    onApply: (from, to) => setPastSpan({ kind: "custom", from, to }),
                  }}
                />
              ) : (
                <FilterMenu
                  key="upcoming-filter"
                  ariaLabel="Upcoming range"
                  state={upcomingSpan}
                  onKind={(kind) => setUpcomingSpan({ kind, from: "", to: "" })}
                  custom={{
                    min: addDaysIso(picked, 1),
                    max: addDaysIso(today, 365),
                    anchor: addDaysIso(picked, 1),
                    onApply: (from, to) => setUpcomingSpan({ kind: "custom", from, to }),
                  }}
                />
              )}
            </div>

            <div
              id="day-tabpanel"
              role="tabpanel"
              aria-labelledby={`day-tab-${tab}`}
              className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 sm:p-4"
            >
              {tab === "past" ? (
                pastDates.map((d) => {
                  const phase = phaseOf(byDate.get(d));
                  const hasLog = logged.has(d);
                  return (
                    <div key={d} className={sideCard}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            hasLog ? "bg-[#FF2D7A] text-white shadow-sm" : "bg-[#FFE4EE] text-[#D81B60]"
                          }`}
                        >
                          {fromIso(d).getDate()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-xs font-bold text-[#17152B] sm:text-sm">
                            {fmtShort(d)} — {phase ? PHASE[phase].label : "No prediction"}
                          </h4>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-[#68708A]">{logSummary(d)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {phase && (
                          <span className={`hidden rounded-full border bg-white px-3 py-1 text-xs font-semibold sm:inline-block ${PHASE[phase].badge}`}>
                            {PHASE[phase].short}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenDay(d)}
                          className="cursor-pointer rounded-full bg-[#9333EA] px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-[#7E22CE]"
                        >
                          {hasLog ? "Edit" : "Add log"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  {/* Today (or the picked day) comes first inside Upcoming */}
                  <div className="space-y-3 rounded-[20px] border-2 border-[#D9C2FB] bg-[#F7F1FF] p-3.5 shadow-[0_0_0_3px_rgba(168,85,247,0.07),0_8px_22px_rgba(147,51,234,0.12)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#7C3AED]">
                          {isPickedToday ? "Today" : "Selected"}
                        </span>
                        <h4 className="text-xs font-bold text-[#17152B] sm:text-sm">
                          {fmtShort(picked)}
                          {pickedPhase ? ` — ${PHASE[pickedPhase].label}` : ""}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDay(picked)}
                        className="cursor-pointer rounded-full bg-[#9333EA] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#7E22CE]"
                      >
                        {logged.has(picked) ? "Update Log" : "Add Log"}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-purple-100 bg-white p-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C3AED]">
                        {logged.has(picked) ? (
                          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ClipboardList className="h-4 w-4" aria-hidden="true" />
                        )}
                      </div>
                      <p className="min-w-0 truncate text-xs font-bold text-[#17152B] sm:text-sm">
                        {logged.has(picked)
                          ? isPickedToday
                            ? "Today's log is saved"
                            : "Log saved for this day"
                          : isPickedToday
                            ? "Nothing logged yet today"
                            : "No log for this day"}
                      </p>
                      {pickedDayLabel && <span className="ml-auto shrink-0 text-[11px] font-bold text-[#7C3AED]">{pickedDayLabel}</span>}
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A92A6]">{todayRangeText}</p>
                      <div className="flex flex-wrap gap-2">
                        {todayStats.map((s) => (
                          <span key={s.label} className="rounded-full border border-[#E5D5FB] bg-white px-3 py-1.5 text-[11px] font-medium text-[#55607A]">
                            {s.label} <b className="font-bold text-[#17152B]">{s.value}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A92A6]">
                    {isPickedToday ? "Upcoming" : "Next days"} · {spanButtonLabel(upcomingSpan)}
                  </p>
                  {upcomingDates.map((d) => {
                    const phase = phaseOf(byDate.get(d));
                    const dayDiff = diffDays(d, today);
                    const text = dayDiff === 0 ? "Today" : dayDiff > 0 ? `In ${dayDiff} day${dayDiff === 1 ? "" : "s"}` : `${-dayDiff} day${dayDiff === -1 ? "" : "s"} ago`;
                    return (
                      <div key={d} className={sideCard}>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-sm font-bold text-[#7C3AED]">
                            {fromIso(d).getDate()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-xs font-bold text-[#17152B] sm:text-sm">
                              {fmtShort(d)} — {phase ? PHASE[phase].label : "No prediction"}
                            </h4>
                            <p className="mt-0.5 truncate text-[11px] font-medium text-[#68708A]">Estimated from your logged cycles</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-[#68708A]">{text}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <InfoCard variant="disclaimer" className="mt-3">
        Phases are estimates from your logged cycles. They are not a diagnosis or a method of contraception.
      </InfoCard>
    </div>
  );
}