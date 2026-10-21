import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Flag,
  MoreVertical,
  Moon,
  Pencil,
  Pill,
  Plus,
  Search,
  Sparkles,
  Sun,
  Sunrise,
  Trash2,
  X,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useCycle } from "../../hooks/useCycle";
import type { OnboardingData } from "../../types";
import { LutealShell, type LutealTab } from "../phases/luteal/components/Shell";
import { usePhaseScale } from "../phases/registry";
import { addDays } from "../../lib/isoDate";
import { formatClock } from "../../lib/dailyLogDate";
import {
  getCurrentCycle,
  getPredictions,
  localISODate,
  type CyclePhase,
} from "../../services/cycle";
import { addMedication, getMedicationHistory, getMedications, removeMedication, setIntake, updateMedication, type IntakeRecord, type IntakeStatus, type Medication } from "../../services/logs";
import { getSnoozeUntil, resolveDose, type DoseState } from "../phases/shared/daily-log/MedicationSection";
import { DOSES_CHANGED_EVENT, isTakenLate, slotTimes, wasSnoozed } from "./doseSlots";
import { AddMedicationModal } from "../phases/shared/daily-log/AddMedicationModal";

const today = localISODate();

/* Time each medication was added from this page (the backend has no createdAt), used to sort Recent Activity. */
const ADDED_KEY = "mednevo.med.addedAt";
const nameKey = (name: string) => name.trim().toLowerCase();

function readAdded(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(ADDED_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function markAdded(name: string) {
  try {
    window.localStorage.setItem(ADDED_KEY, JSON.stringify({ ...readAdded(), [nameKey(name)]: Date.now() }));
  } catch {
    /* private mode: falls back to dose time */
  }
}

function unmarkAdded(name: string) {
  try {
    const all = readAdded();
    delete all[nameKey(name)];
    window.localStorage.setItem(ADDED_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/* ---------- dose slots: see ./doseSlots (shared with the reminder popup) ---------- */

const loggedTime = formatClock; // 12-hour AM/PM, whatever the device clock setting is

/* ---------- types ---------- */

type Scope = "all" | "current" | "previous";
type Tab = "current" | "past" | "upcoming";
type DoseView = DoseState;

interface DoseItem {
  id: string;
  /** 1-based slot sent to the backend */
  slot: number;
  time: string;
  status: DoseView;
  loggedAt?: string | null;
  late?: boolean;
  snoozeUntil?: number | null;
}

interface CardMedication {
  id: string;
  name: string;
  dose: string;
  form: string;
  frequency: string;
  date: string;
  time: string;
  status: IntakeStatus;
  phase: string;
  cycleDay: number | null;
  /** Date-based: the medication day falls inside the current cycle or an earlier one (drives the scope filter). */
  cycle: "current" | "previous";
  /** Which tab owns the card: scheduled today, already in the past, or starting later. */
  kind: Tab;
  note: string;
  startDate?: string | null;
  endDate?: string | null;
  tabletCount?: number | null;
  doses: DoseItem[];
}

/* ---------- helpers ---------- */

function formatDate(value: string) {
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(value: string) {
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(value?: string) {
  if (!value) return "09:00 AM";
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/** True when the medication's start/end dates cover `day`. A missing date means open-ended. */
function isScheduledOn(m: Medication, day: string) {
  return (!m.startDate || m.startDate <= day) && (!m.endDate || day <= m.endDate);
}

function phaseLabel(phase: CyclePhase | undefined) {
  if (!phase || phase === "unknown") return "Menstruation";
  return phase === "menstrual" ? "Menstruation" : phase.charAt(0).toUpperCase() + phase.slice(1);
}

function phaseTone(phase: string) {
  if (phase === "Follicular" || phase === "Luteal") return "bg-[#f0eaff] text-[#8057e8]";
  return "bg-[#ffe8f4] text-[#e12a83]";
}

function dayIcon(time?: string) {
  if (!time) return Sun;
  const hour = Number(time.split(":")[0]);
  if (hour < 12) return Sunrise;
  if (hour < 18) return Sun;
  return Moon;
}

function findMedicationMeta(name: string, medications: Medication[]) {
  const needle = name.trim().toLowerCase();
  return medications.find((m) => m.name.trim().toLowerCase() === needle);
}

/* ---------- date strip + dose rows (shared by the cards of every day) ---------- */

/** The strip covers the last 30 days and the next 14 days. */

type SavedDose = { status: string; loggedAt?: string | null };

const noteOf = (meta?: Medication) => (meta?.reminder === false ? "Reminder off" : "Reminder enabled");

const overallOf = (doses: DoseItem[]): IntakeStatus =>
  doses.some((d) => d.status === "missed")
    ? "missed"
    : doses.every((d) => d.status === "taken")
      ? "taken"
      : doses.every((d) => d.status === "taken" || d.status === "skipped")
        ? "skipped"
        : "pending";

const makeDoses = (idPrefix: string, date: string, baseTime: string, meta: Medication | undefined, saved: Map<number, SavedDose>): DoseItem[] =>
  slotTimes(baseTime, meta?.frequency, meta?.times).map((t, i) => {
    const log = saved.get(i + 1);
    const snoozeUntil = meta ? getSnoozeUntil(meta.id, date, i + 1) : null;
    const r = resolveDose({ date, time: t, saved: log?.status, loggedAt: log?.loggedAt, snoozeUntil });
    // Taken after a snooze (or well after the scheduled time) = "Taken late"
    const late = r.status === "taken" && (!!r.late || snoozeUntil != null || isTakenLate(date, t, log?.loggedAt, meta ? wasSnoozed(meta.id, date, i + 1) : false));
    return { id: `${idPrefix}-${i}`, slot: i + 1, time: t, loggedAt: log?.loggedAt ?? null, status: r.status, late, snoozeUntil };
  });

/* ---------- components ---------- */

function ScopeControl({ value, onChange }: { value: Scope; onChange: (v: Scope) => void }) {
  const options: { value: Scope; label: string }[] = [
    { value: "all", label: "All Time" },
    { value: "current", label: "This Cycle" },
    { value: "previous", label: "Past Cycles" },
  ];

  return (
    <div className="inline-flex h-[43px] max-w-full items-center justify-between gap-1 rounded-full border border-[#eee7ef] bg-white p-[5px] shadow-[0_8px_22px_-14px_rgba(70,35,70,.20)] lg:justify-start">
      {options.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`h-[32px] whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition sm:px-[18px] ${
            value === item.value
              ? "bg-[#f43f8f] text-white shadow-[0_6px_12px_-4px_rgba(244,63,143,.45)]"
              : "text-[#53566e] hover:bg-[#fff0f7]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function DateRangeButton({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setDraftFrom(from);
          setDraftTo(to);
          setOpen((v) => !v);
        }}
        className="flex h-[43px] items-center gap-2 rounded-full border border-[#eee7ef] bg-white px-4 text-[12px] font-semibold text-[#626477] shadow-[0_8px_22px_-14px_rgba(70,35,70,.20)]"
      >
        <CalendarDays size={13} strokeWidth={1.8} className="text-[#f43f8f]" />
        <span>{formatShortDate(from)} – {formatShortDate(to)}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[48px] z-40 w-[310px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#eee7ef] bg-white p-4 shadow-[0_18px_40px_-18px_rgba(40,25,50,.28)]">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[#626477]">
              From
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#eee7ef] px-2 py-2 text-xs outline-none"
              />
            </label>
            <label className="text-xs font-semibold text-[#626477]">
              To
              <input
                type="date"
                min={draftFrom}
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#eee7ef] px-2 py-2 text-xs outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[#eee7ef] px-4 py-2 text-xs font-semibold text-[#686b7d]">
              Cancel
            </button>
            <button
              type="button"
              disabled={!draftFrom || !draftTo || draftFrom > draftTo}
              onClick={() => {
                onChange(draftFrom, draftTo);
                setOpen(false);
              }}
              className="rounded-full bg-[#f43f8f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  caption,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  caption: string;
  tone: string;
}) {
  return (
    <div className="flex min-h-[95px] items-center gap-[11.5px] rounded-[21px] border border-[#efe9f1] bg-[#fffdff] px-[18px] shadow-[0_10px_28px_-14px_rgba(60,30,70,.16)]">
      <span className={`inline-flex size-[43px] shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</span>
      <div className="min-w-0 pt-[3px]">
        <p className="text-[24px] font-bold leading-none text-[#181a40]">{value}</p>
        <p className="mt-[3px] text-[12px] font-bold text-[#095d41]">{label}</p>
        <p className="mt-[3px] text-[10px] text-[#6b6b7a]">{caption}</p>
      </div>
    </div>
  );
}

/** Highlighted time the user actually took (or skipped) a dose. */
function TimeChip({ time, tone }: { time: string; tone: "ok" | "late" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-bold ${tone === "ok" ? "bg-[#dcfce7] text-[#159447]" : "bg-[#fef3c7] text-[#b45309]"}`}>
      <Clock3 size={10} strokeWidth={2} aria-hidden="true" />{time}
    </span>
  );
}

/** Status text of one dose. Take / Snooze / Skip are not here: they live in the reminder popup. */
function DoseStatus({ dose, upcoming = false }: { dose: DoseItem; upcoming?: boolean }) {
  const tone =
    dose.status === "taken"
      ? dose.late ? "text-[#b45309]" : "text-[#159447]"
      : dose.status === "missed"
        ? "text-[#e0393e]"
        : dose.status === "due"
          ? "text-[#b45309]"
          : dose.status === "snoozed"
            ? "text-[#6d28d9]"
            : "text-[#8c8795]";
  const at = dose.loggedAt ? loggedTime(dose.loggedAt) : null;

  return (
    <span className={`min-w-[150px] shrink-0 whitespace-nowrap text-[10px] font-semibold ${tone}`}>
      {dose.status === "missed" ? (
        <span className="inline-flex items-center gap-1"><X size={10} strokeWidth={2.4} />Missed</span>
      ) : dose.status === "taken" ? (
        <span className="inline-flex items-center gap-1.5">
          <Check size={10} strokeWidth={2.2} />{dose.late ? "Taken late" : "Taken"}
          {at && <TimeChip time={at} tone={dose.late ? "late" : "ok"} />}
        </span>
      ) : dose.status === "skipped" ? (
        <span className="inline-flex items-center gap-1.5">Skipped{at && <TimeChip time={at} tone="late" />}</span>
      ) : dose.status === "snoozed" ? (
        `Snoozed · till ${loggedTime(new Date(dose.snoozeUntil!).toISOString())}`
      ) : dose.status === "due" ? (
        "Due now"
      ) : (
        <span className="inline-flex items-center gap-1"><Clock3 size={10} strokeWidth={2} />{upcoming ? "Scheduled" : "Pending"}</span>
      )}
    </span>
  );
}

/** Take / Skip for a dose. Both are always shown, so a wrong Skip can be corrected to Take later. (Snooze lives in the reminder popup.) */
function DoseActions({ dose, medName, onStatus }: { dose: DoseItem; medName: string; onStatus: (status: "taken" | "skipped") => void }) {
  const btn = "inline-flex h-[26px] items-center justify-center gap-1 whitespace-nowrap rounded-[7px] border px-[10px] text-[10px] font-medium leading-none transition";
  const time = formatTime(dose.time);
  return (
    <>
      <button type="button" aria-label={`Mark ${medName} ${time} dose as taken`} onClick={() => onStatus("taken")} className={`${btn} border-[#a9e6b8] bg-[#e7ffea] text-[#095d41] hover:bg-[#d3f8d9]`}>
        Take <Check size={11} strokeWidth={2.2} />
      </button>
      <button type="button" aria-label={`Skip ${medName} ${time} dose`} onClick={() => onStatus("skipped")} className={`${btn} border-[#f2a3a6] bg-[#fdeeee] text-[#e0393e] hover:bg-[#fbdcdc]`}>
        Skip <X size={11} strokeWidth={2.4} />
      </button>
    </>
  );
}

/** "Edit" button of one dose: opens Take / Skip. Used in the Past and Upcoming tabs. */
function DoseEdit({ dose, medName, onStatus }: { dose: DoseItem; medName: string; onStatus: (status: "taken" | "skipped") => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        aria-label={`Edit ${medName} ${formatTime(dose.time)} dose`}
        onClick={() => setOpen(true)}
        className="inline-flex h-[26px] items-center gap-1 rounded-[7px] border border-[#f8bfdc] bg-white px-[10px] text-[10px] font-semibold text-[#f43f8f] transition hover:bg-[#fff0f7]"
      >
        <Pencil size={11} strokeWidth={2} aria-hidden="true" /> Edit
      </button>
    );
  }
  return (
    <>
      <DoseActions
        dose={dose}
        medName={medName}
        onStatus={(status) => {
          setOpen(false);
          onStatus(status);
        }}
      />
      <button type="button" onClick={() => setOpen(false)} className="text-[10px] font-semibold text-[#8c8795] hover:text-[#4b4c5e]">
        Cancel
      </button>
    </>
  );
}

function DoseRow({ dose, medName, upcoming = false, hideStatus = false, detail, onEdit }: { dose: DoseItem; medName: string; upcoming?: boolean; hideStatus?: boolean; detail?: string; onEdit?: (status: "taken" | "skipped") => void }) {
  const Icon = dayIcon(dose.time);
  return (
    <div className="flex min-h-[30px] flex-wrap items-center gap-x-3 gap-y-1.5 py-[2px] text-[10px] leading-none">
      <span className="flex w-[84px] shrink-0 items-center gap-2 text-[10px] text-[#6e6e7d]">
        <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#f0eaff] text-[#8057e8]">
          <Icon size={12} strokeWidth={1.8} />
        </span>
        <span className="whitespace-nowrap">{formatTime(dose.time)}</span>
      </span>
      {!hideStatus && <DoseStatus dose={dose} upcoming={upcoming} />}
      {detail && <span className="whitespace-nowrap text-[11px] font-medium text-[#4b4c5e]">{detail}</span>}
      {onEdit && (
        <span className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <DoseEdit dose={dose} medName={medName} onStatus={onEdit} />
        </span>
      )}
    </div>
  );
}

type MenuAction = "edit" | "download" | "delete";

const MENU_ITEMS: { action: MenuAction; label: string; Icon: typeof Pill; danger?: boolean }[] = [
  { action: "edit", label: "Edit medication", Icon: Pill },
  { action: "download", label: "Download details", Icon: Download },
  { action: "delete", label: "Delete medication", Icon: Trash2, danger: true },
];

function MedicationMenu({ medName, onSelect }: { medName: string; onSelect: (action: MenuAction) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="absolute right-1 top-1 @xl:relative @xl:right-auto @xl:top-auto @xl:col-start-4 @xl:row-start-1 @xl:justify-self-end">
      <button
        type="button"
        aria-label={`More options for ${medName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-1 text-[#5d5e6d] hover:bg-[#fff0f7]"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`${medName} actions`}
          className="absolute right-0 top-[calc(100%+2px)] z-30 w-[204px] max-w-[calc(100vw-2rem)] rounded-[14px] border border-[#ece8f0] bg-white py-[5px] shadow-[0_14px_34px_-10px_rgba(23,21,43,0.28)]"
        >
          {MENU_ITEMS.map(({ action, label, Icon, danger }) => (
            <div key={action}>
              {danger && <div role="separator" className="my-[4px] border-t border-[#ece8f0]" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSelect(action);
                }}
                className={`flex h-[34px] w-full items-center gap-[10px] pl-[13px] pr-3 text-left text-[12px] font-medium leading-none hover:bg-[#ffe7f4] ${danger ? "text-[#e0393e]" : "text-[#272830]"}`}
              >
                <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                {label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Plain-text export of one medication card (no backend call). */
function downloadDetails(med: CardMedication) {
  const lines = [
    `Medication: ${med.name}`,
    `Dose: ${med.dose || "—"} · ${med.form || "Tablet"}`,
    `Frequency: ${med.frequency || "—"}`,
    `Date: ${formatDate(med.date)}`,
    `Phase: ${med.phase}${med.cycleDay ? ` · Cycle Day ${med.cycleDay}` : ""}`,
    "",
    "Doses:",
    ...med.doses.map((d) => `  ${formatTime(d.time)} - ${d.status}${d.loggedAt ? ` (logged ${loggedTime(d.loggedAt)})` : ""}`),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${med.name.replace(/\s+/g, "-").toLowerCase()}-${med.date}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] text-[#959298]">{label}</dt>
      <dd className="mt-[2px] text-[12px] font-semibold text-[#1d1b28]">{value}</dd>
    </div>
  );
}

/** Refill estimate: the tablets in stock last (stock / doses per day) days from the start date, counting 1 tablet per dose. */
function refillDate(med: CardMedication): string {
  if (!med.tabletCount || !med.startDate) return "—";
  const date = addDays(med.startDate, Math.floor(med.tabletCount / Math.max(med.doses.length, 1)));
  if (med.endDate && date > med.endDate) return "Not needed";
  return formatDate(date);
}

/** Ring = tablets left out of the starting stock. Turns amber at 40% and red at 20%. */
function StockRing({ left, total }: { left: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.max(left / total, 0), 1) : 0;
  const r = 16;
  const c = 2 * Math.PI * r;
  const color = pct <= 0.2 ? "#e0393e" : pct <= 0.4 ? "#d97706" : "#f439a8";
  return (
    <div className="min-w-0 @3xl:row-span-2 @3xl:self-center">
      <dt className="text-[10px] text-[#959298]">Tablets in stock</dt>
      <dd className="mt-1 flex items-center gap-2">
        <span className="relative inline-flex size-[40px] shrink-0 items-center justify-center" role="img" aria-label={`${left} of ${total} tablets left`}>
          <svg viewBox="0 0 40 40" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="20" cy="20" r={r} fill="none" stroke="#f3e6ee" strokeWidth="4" />
            <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
          </svg>
          <span className="absolute text-[9px] font-bold text-[#1d1b28]">{Math.round(pct * 100)}%</span>
        </span>
        <span className="text-[12px] font-semibold text-[#1d1b28]">
          {left} <span className="font-normal text-[#959298]">/ {total} left</span>
        </span>
      </dd>
    </div>
  );
}

function MedicationCard({ med, stock, onMenu }: { med: CardMedication; stock: { left: number; total: number } | null; onMenu: (action: MenuAction) => void }) {
  return (
    // Layout follows the card's own width: stacked when narrow, one row (info | details | cycle | menu) from 36rem.
    <article className="@container relative min-w-0 rounded-[22px] border border-[#efe9f1] bg-[#fffdff] p-4 shadow-[0_10px_28px_-14px_rgba(60,30,70,.16)]">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto_36px] @xl:items-center">
        {/* Medicine */}
        <div className="flex min-w-0 items-center gap-[15px] pr-8 @xl:pr-0">
          <span className="inline-flex size-[58px] shrink-0 items-center justify-center rounded-[18px] bg-[#ffe8f4] text-[#f439a8]">
            <Pill size={25} strokeWidth={1.55} className="-rotate-45" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="break-words text-[16px] font-bold text-[#1d1b28]">{med.name}</h3>
              <span className="inline-flex h-[14px] items-center rounded-full bg-[#d0f4e3] px-[7px] text-[9px] font-semibold text-[#257858]">Current</span>
            </div>
            <p className="mt-[3px] text-[11px] leading-[1.7] text-[#6b6b7a]">{med.form || "Tablet"}</p>
            <p className="text-[10px] font-semibold leading-[1.875] text-[#1d1b28]">{med.frequency}</p>
            <p className="text-[9px] leading-[1.875] text-[#959298]">{med.note}</p>
          </div>
        </div>

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @3xl:grid-cols-4">
          <Detail label="Time" value={med.doses.map((d) => formatTime(d.time)).join(", ")} />
          <Detail label="Times a day" value={`${med.doses.length} ${med.doses.length === 1 ? "time" : "times"}`} />
          <Detail label="Dose" value={med.dose || "—"} />
          {stock ? <StockRing left={stock.left} total={stock.total} /> : <Detail label="Tablets in stock" value={med.tabletCount != null ? String(med.tabletCount) : "—"} />}
          <Detail label="Start date" value={med.startDate ? formatDate(med.startDate) : "—"} />
          <Detail label="End date" value={med.endDate ? formatDate(med.endDate) : "No end date"} />
          <Detail label="Refill date" value={refillDate(med)} />
        </dl>

        {/* Cycle */}
        <div className="flex min-w-0 flex-col items-start">
          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-[4px] text-[10px] font-semibold ${phaseTone(med.phase)}`}>{med.phase}</span>
          <p className="mt-[6px] whitespace-nowrap text-[11px] text-[#6b6b7a]">{med.cycleDay ? `Cycle Day ${med.cycleDay}` : "Cycle Day —"}</p>
        </div>

        <MedicationMenu medName={med.name} onSelect={onMenu} />
      </div>
    </article>
  );
}


function TimelineChip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[10px] font-semibold ${tone}`}>{children}</span>;
}

/** Past tab: one block per day, newest first. Read-only history of every dose (taken, taken late, skipped, not taken). */
function PastTimeline({ items, canEdit, onEdit }: { items: CardMedication[]; canEdit: (med: CardMedication) => boolean; onEdit: (med: CardMedication, dose: DoseItem, status: "taken" | "skipped") => void }) {
  const byDate = new Map<string, CardMedication[]>();
  for (const m of items) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m]);

  return (
    <div className="grid gap-6">
      {[...byDate.entries()].map(([date, meds]) => {
        const doses = meds.flatMap((m) => m.doses);
        const count = (test: (d: DoseItem) => boolean) => doses.filter(test).length;
        const taken = count((d) => d.status === "taken" && !d.late);
        const late = count((d) => d.status === "taken" && !!d.late);
        const skipped = count((d) => d.status === "skipped");
        const missed = count((d) => d.status === "missed" || d.status === "pending" || d.status === "due");
        const first = meds[0];
        return (
          <section key={date} aria-label={formatDate(date)}>
            <header className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h3 className="text-[14px] font-bold text-[#181a40]">{formatDate(date)}</h3>
              <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-[3px] text-[10px] font-semibold ${phaseTone(first.phase)}`}>{first.phase}</span>
              {first.cycleDay ? <span className="text-[11px] text-[#6b6b7a]">Cycle Day {first.cycleDay}</span> : null}
              <span className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                {taken > 0 && <TimelineChip tone="bg-[#e7ffea] text-[#095d41]">{taken} taken</TimelineChip>}
                {late > 0 && <TimelineChip tone="bg-[#fff3dc] text-[#b45309]">{late} taken late</TimelineChip>}
                {skipped > 0 && <TimelineChip tone="bg-[#f0f0f4] text-[#6b6b7a]">{skipped} skipped</TimelineChip>}
                {missed > 0 && <TimelineChip tone="bg-[#fdeeee] text-[#e0393e]">{missed} missed</TimelineChip>}
              </span>
            </header>
            <ol className="grid gap-2.5 border-l-2 border-[#f8bfdc] pl-4">
              {meds.map((m) => (
                <li key={m.id} className="relative rounded-[18px] border border-[#efe9f1] bg-[#fffdff] p-3.5 shadow-[0_10px_28px_-14px_rgba(60,30,70,.16)]">
                  <span aria-hidden="true" className="absolute -left-[23px] top-5 size-[9px] rounded-full bg-[#f439a8] ring-4 ring-[#fff0f7]" />
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#ffe8f4] text-[#f439a8]">
                      <Pill size={18} strokeWidth={1.6} className="-rotate-45" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-[14px] font-bold text-[#1d1b28]">{m.name}</p>
                      <p className="text-[11px] text-[#6b6b7a]"><span className="font-semibold text-[#1d1b28]">{m.dose || "—"}</span><span aria-hidden="true" className="mx-[6px]">·</span>{m.form || "Tablet"}<span aria-hidden="true" className="mx-[6px]">·</span>{m.frequency}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-0.5 border-t border-[#efe9f1] pt-2">
                    {m.doses.map((dose) => <DoseRow key={dose.id} dose={dose} medName={m.name} onEdit={canEdit(m) ? (status) => onEdit(m, dose, status) : undefined} />)}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/** Upcoming tab: the doses still to take, as a timeline by day and time. Take / Skip work for today's doses; later days are just scheduled. */
function UpcomingTimeline({ items, onAct }: { items: CardMedication[]; onAct: (med: CardMedication, dose: DoseItem, status: "taken" | "skipped") => void }) {
  const days = new Map<string, { label: string; list: { med: CardMedication; dose: DoseItem }[] }>();
  for (const med of items) {
    const day = days.get(med.date) ?? { label: med.phase, list: [] }; // for upcoming cards `phase` holds "Later today" / "Tomorrow" / date
    for (const dose of med.doses) day.list.push({ med, dose });
    days.set(med.date, day);
  }

  return (
    <div className="grid gap-6">
      {[...days.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { label, list }]) => {
          const isToday = date <= today;
          const sorted = [...list].sort((a, b) => a.dose.time.localeCompare(b.dose.time));
          return (
            <section key={date} aria-label={isToday ? "Today's schedule" : label}>
              <header className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-[14px] font-bold text-[#181a40]">{isToday ? "Today's schedule" : label}</h3>
                <span className="text-[11px] text-[#6b6b7a]">{formatDate(date)} · {sorted.length} {sorted.length === 1 ? "dose" : "doses"} to take</span>
              </header>
              <ol className="relative grid gap-2.5 before:absolute before:bottom-3 before:left-[68px] before:top-3 before:w-px before:bg-[#f8bfdc] sm:before:left-[80px]">
                {sorted.map(({ med, dose }) => {
                  const Icon = dayIcon(dose.time);
                  return (
                    <li key={`${med.id}-${dose.id}`} className="relative grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-6 sm:grid-cols-[68px_minmax(0,1fr)] sm:gap-x-7">
                      <time className="text-right text-[12px] font-bold text-[#181a40]">{formatTime(dose.time)}</time>
                      <span aria-hidden="true" className="absolute left-[64px] top-1/2 size-[9px] -translate-y-1/2 rounded-full bg-[#f439a8] ring-4 ring-[#fff0f7] sm:left-[76px]" />
                      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] border border-[#efe9f1] bg-[#fffdff] p-3.5 shadow-[0_10px_28px_-14px_rgba(60,30,70,.16)]">
                        <span className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#ffe8f4] text-[#f439a8]">
                          <Icon size={17} strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[14px] font-bold text-[#1d1b28]">{med.name}</p>
                          <p className="text-[11px] text-[#6b6b7a]">
                            <span className="font-semibold text-[#1d1b28]">{med.dose || "—"}</span>
                            <span aria-hidden="true" className="mx-[6px]">·</span>
                            {med.form || "Tablet"}
                            <span aria-hidden="true" className="mx-[6px]">·</span>
                            {med.frequency}
                          </p>
                        </div>
                        {isToday ? (
                          <span className="flex shrink-0 items-center gap-2">
                            <DoseActions dose={dose} medName={med.name} onStatus={(status) => onAct(med, dose, status)} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8c8795]"><Clock3 size={10} strokeWidth={2} />Scheduled</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
    </div>
  );
}

function RecentActivity({ entries }: { entries: CardMedication[] }) {
  return (
    <section className="rounded-[20px] border border-[#efe9f1] bg-[#fefbff] px-[18px] pb-[24px] pt-[19px] shadow-[0_10px_28px_-14px_rgba(60,30,70,.16)]">
      <h2 className="text-[15px] font-bold text-[#181a40]">Recent Activity</h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-[11px] text-[#6b6b7a]">No recent medication activity.</p>
      ) : (
        <ol className="relative mt-[16px] grid gap-y-[14px] before:absolute before:bottom-[10px] before:left-[3px] before:top-[10px] before:w-px before:bg-[#f8bfdc]">
          {entries.slice(0, 5).map((entry, index) => (
            <li key={`${entry.id}-${index}`} className="relative min-h-[50px] pl-[22px]">
              <span className="absolute left-0 top-[5px] size-[7px] rounded-full bg-[#f439a8]" aria-hidden="true" />
              <p className="flex items-center gap-[5px] text-[9px] leading-[1.55] text-[#767583]">
                <Clock3 size={10} strokeWidth={1.8} />
                <time>{formatDate(entry.date)} · {formatTime(entry.time)}</time>
              </p>
              <p className="mt-[4px] text-[12px] font-bold text-[#181a40]">{entry.name}</p>
              <p className="mt-[4px] text-[9px] font-semibold leading-[1.3] text-[#f439a8]">{entry.phase} Phase</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function InsightCard() {
  return (
    <aside className="relative min-h-[168px] overflow-hidden rounded-[20px] border border-[#ffd0e8] bg-[#ffe7f4] px-[22px] pb-[26px] pt-[23px]">
      <CalendarDays size={24} strokeWidth={1.6} className="text-[#f439a8]" aria-hidden="true" />
      <p className="mt-[24px] max-w-[190px] text-[16px] font-bold leading-[1.49] text-[#f439a8]">Your health data builds a clearer picture of your cycle.</p>
      <svg aria-hidden="true" viewBox="0 0 80 80" className="absolute -bottom-2 -right-3 size-[84px] text-[#f439a8]/20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <path d="M40 6c2 17 8 26 28 34-20 8-26 17-28 34-2-17-8-26-28-34 20-8 26-17 28-34z" />
      </svg>
    </aside>
  );
}

/* ---------- page ---------- */

export function MedicationHistoryPage({
  data,
  onBack,
  onNavigate,
  initialTab,
}: {
  data: OnboardingData;
  onBack: () => void;
  onNavigate: (tab: LutealTab) => void;
  initialTab?: Tab;
}) {
  // Same top navigation bar as the other Cycle Tracker pages.
  const shellCycle = useCycle();
  const shellState = shellCycle.status === "ready" ? shellCycle.data : null;
  const shellPhase = shellState && shellState.phase !== "unknown" ? shellState.phase : undefined;
  usePhaseScale(shellPhase === "menstrual" || shellPhase === "luteal" ? shellPhase : "follicular");

  const cycle = useAsync(useCallback((signal: AbortSignal) => getCurrentCycle(today, signal), []));
  const cycleStart = cycle.data?.period?.start ?? addDays(today, -29);
  const [from, setFrom] = useState(cycleStart);
  const [to, setTo] = useState(today);
  const [scope, setScope] = useState<Scope>("all");
  const [tab, setTab] = useState<Tab>(initialTab ?? "current");
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);

  // Re-check "missed" every minute so a dose flips without a refresh.
  useEffect(() => {
    const t = window.setInterval(() => setVersion((v) => v + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const effectiveFrom = from > to ? to : from;
  const history = useAsync(useCallback((signal: AbortSignal) => getMedicationHistory(effectiveFrom, to, signal), [effectiveFrom, to]));
  const predictions = useAsync(useCallback((signal: AbortSignal) => getPredictions(effectiveFrom, to, signal), [effectiveFrom, to]));
  const activeMeds = useAsync(useCallback((signal: AbortSignal) => getMedications(today, signal), []));

  // Stock ring: doses taken since each medication's start date (the history above only covers the date filter).
  const stockFrom = useMemo(() => {
    const starts = (activeMeds.data?.medications ?? []).filter((m) => m.tabletCount && m.startDate).map((m) => m.startDate as string);
    return starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null;
  }, [activeMeds.data]);
  const stockHistory = useAsync(
    useCallback(
      (signal: AbortSignal) =>
        stockFrom && stockFrom <= today ? getMedicationHistory(stockFrom, today, signal) : Promise.resolve({ intakes: [] as IntakeRecord[] }),
      [stockFrom],
    ),
  );
  // Tablets left = starting stock - taken doses since the start date (1 tablet per dose, same as the refill estimate).
  const stockOf = (med: CardMedication) => {
    if (!med.tabletCount || !med.startDate || stockHistory.status !== "ready") return null;
    const name = med.name.trim().toLowerCase();
    const taken = (stockHistory.data?.intakes ?? []).filter(
      (r) => r.status === "taken" && r.name.trim().toLowerCase() === name && r.date >= med.startDate! && (!med.endDate || r.date <= med.endDate),
    ).length;
    return { left: Math.max(med.tabletCount - taken, 0), total: med.tabletCount };
  };

  const phaseByDate = useMemo(() => {
    const map = new Map<string, { phase: CyclePhase; cycleDay: number | null }>();
    for (const day of predictions.data?.days ?? []) map.set(day.date, { phase: day.phase, cycleDay: day.cycleDay });
    return map;
  }, [predictions.data]);

  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [adding, setAdding] = useState(false);
  // Every medication that has not ended yet: running today, or starting later.
  const activeMedications = useMemo(() => activeMeds.data?.medications ?? [], [activeMeds.data]);

  const rows = useMemo<CardMedication[]>(() => {
    const todayInfo = { phase: cycle.data?.phase, cycleDay: cycle.data?.cycleDay ?? null };
    const cycleOf = (date: string): "current" | "previous" => (date >= cycleStart ? "current" : "previous");

    const out: CardMedication[] = [];

    const tomorrow = addDays(today, 1);
    const savedToday = (med: Medication) => {
      const saved = new Map<number, SavedDose>();
      for (const d of med.doses ?? []) if (d.status !== "pending") saved.set(d.slot, d);
      return saved;
    };
    // The upcoming card's badge says when the next doses are.
    const whenLabel = (date: string) => (date === today ? "Later today" : date === tomorrow ? "Tomorrow" : formatShortDate(date));

    for (const med of activeMedications) {
      const baseTime = med.time || "09:00";
      const common = {
        name: med.name,
        dose: med.dose || "—",
        form: med.form || "Tablet",
        frequency: med.frequency || "Once daily",
        note: noteOf(med),
        startDate: med.startDate,
        endDate: med.endDate,
        tabletCount: med.tabletCount ?? null,
      };

      // CURRENT: everything scheduled today, with today's saved dose statuses from the backend.
      if (isScheduledOn(med, today)) {
        const doses = makeDoses(`current-${med.id}`, today, baseTime, med, savedToday(med));
        out.push({
          ...common,
          id: `current-${med.id}`,
          date: today,
          time: baseTime,
          status: overallOf(doses),
          phase: phaseLabel(todayInfo.phase),
          cycleDay: todayInfo.cycleDay,
          cycle: cycleOf(today),
          kind: "current",
          doses,
        });

        // PAST (today): doses already logged (or missed) today also show in Past, so a Take / Skip done in Upcoming appears there at once.
        const logged = doses.filter((d) => d.status === "taken" || d.status === "skipped" || d.status === "missed");
        if (logged.length > 0 && today >= effectiveFrom && today <= to) {
          out.push({
            ...common,
            id: `past-today-${med.id}`,
            date: today,
            time: logged[0].time,
            status: overallOf(logged),
            phase: phaseLabel(todayInfo.phase),
            cycleDay: todayInfo.cycleDay,
            cycle: cycleOf(today),
            kind: "past",
            doses: logged,
          });
        }
      }

      // UPCOMING: the doses still to come. Later today if some dose is not due yet,
      // otherwise the next scheduled day (tomorrow, or the start date of a medicine that starts later).
      let upDate = today;
      let upDoses = isScheduledOn(med, today)
        ? makeDoses(`upcoming-${med.id}`, today, baseTime, med, savedToday(med)).filter((d) => d.status === "pending")
        : [];
      if (upDoses.length === 0) {
        upDate = med.startDate && med.startDate > tomorrow ? med.startDate : tomorrow;
        if (med.endDate && upDate > med.endDate) continue; // the course ends before the next day
        upDoses = makeDoses(`upcoming-${med.id}`, upDate, baseTime, med, new Map());
      }
      out.push({
        ...common,
        id: `upcoming-${med.id}`,
        date: upDate,
        time: upDoses[0]?.time ?? baseTime,
        status: "pending",
        phase: whenLabel(upDate), // shown in the badge of the card
        cycleDay: null,
        cycle: cycleOf(upDate),
        kind: "upcoming",
        doses: upDoses,
      });
    }

    // PAST: one card per day and medicine from the intake history.
    const raw = history.data?.intakes ?? [];
    const logsByKey = new Map<string, Map<number, IntakeRecord>>();
    for (const r of raw) {
      if (r.status === "pending") continue;
      const k = `${r.date}|${r.name.trim().toLowerCase()}`;
      const bySlot = logsByKey.get(k) ?? new Map<number, IntakeRecord>();
      bySlot.set(r.slot ?? 1, r);
      logsByKey.set(k, bySlot);
    }

    const seen = new Set<string>();
    for (const record of raw) {
      const key = `${record.date}|${record.name.trim().toLowerCase()}`;
      if (seen.has(key) || record.date > today) continue;
      const meta = findMedicationMeta(record.name, activeMedications);
      // Today's doses of a medicine that runs today belong to the Current tab, not to history.
      if (record.date === today && meta && isScheduledOn(meta, today)) continue;
      seen.add(key);

      const baseTime = meta?.time || "09:00";
      const info = phaseByDate.get(record.date) ?? (record.date === today ? todayInfo : undefined);
      const doses = makeDoses(key, record.date, baseTime, meta, logsByKey.get(key) ?? new Map());
      out.push({
        id: `past-${key}`,
        name: record.name,
        dose: record.dose || meta?.dose || "—",
        form: meta?.form || "Tablet",
        frequency: meta?.frequency || "Once daily",
        date: record.date,
        time: baseTime,
        status: overallOf(doses),
        phase: phaseLabel(info?.phase),
        cycleDay: info?.cycleDay ?? null,
        cycle: cycleOf(record.date),
        kind: "past",
        note: noteOf(meta),
        doses,
      });
    }

    return out;
    // `version` re-runs this each minute and after a Take/Skip so missed doses update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.data, activeMedications, phaseByDate, cycle.data, cycleStart, effectiveFrom, to, version]);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((m) => m.kind === tab)
      .filter((m) => scope === "all" || m.cycle === scope)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.dose.toLowerCase().includes(q))
      .sort((a, b) => {
        const order = `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`);
        return tab === "past" ? -order : order; // history newest first, today / upcoming in schedule order
      });
  }, [rows, scope, tab, query]);

  const stats = useMemo(() => {
    const names = (list: CardMedication[]) => new Set(list.map((m) => m.name.trim().toLowerCase()).filter(Boolean));
    const live = names(rows.filter((m) => m.kind !== "past"));
    const past = rows.filter((m) => m.kind === "past");
    return {
      total: names(rows).size,
      active: names(rows.filter((m) => m.kind === "current")).size,
      // Completed = taken in the past and no longer running or scheduled.
      completed: [...names(past)].filter((n) => !live.has(n)).length,
      thisCycle: names(rows.filter((m) => m.kind !== "upcoming" && m.cycle === "current")).size,
    };
  }, [rows]);

  const refreshAll = () => {
    history.refetch();
    stockHistory.refetch();
    activeMeds.refetch();
    setVersion((v) => v + 1);
  };

  // The reminder popup (Take / Snooze / Skip) can save a dose from any page: refresh this one when it does.
  const refreshRef = useRef(refreshAll);
  refreshRef.current = refreshAll;
  useEffect(() => {
    const onChanged = () => refreshRef.current();
    window.addEventListener(DOSES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DOSES_CHANGED_EVENT, onChanged);
  }, []);

  /** Upcoming tab: Take / Skip a dose (only doses of today; a later day's doses are just scheduled). */
  const setDoseStatus = async (med: CardMedication, dose: DoseItem, status: "taken" | "skipped") => {
    const matching = findMedicationMeta(med.name, activeMedications);
    if (!matching) return;
    try {
      await setIntake(matching.id, med.date, status, dose.slot);
    } catch {
      return; // not saved: leave the row as it was
    }
    window.dispatchEvent(new Event(DOSES_CHANGED_EVENT)); // refreshes this page and the reminder popup
  };

  const handleMenu = async (med: CardMedication, action: MenuAction) => {
    if (action === "download") {
      downloadDetails(med);
      return;
    }
    const meta = findMedicationMeta(med.name, activeMedications);
    if (!meta) return;
    if (action === "edit") {
      setEditingMed(meta);
    } else if (window.confirm(`Delete ${med.name}? This removes the medication and its dose history.`)) {
      try {
        await removeMedication(meta.id);
      } catch {
        return; // not deleted: keep the card
      }
      unmarkAdded(meta.name);
      window.dispatchEvent(new Event(DOSES_CHANGED_EVENT));
    }
  };

  // Recent activity = today's medicines (pending or newly added) + earlier history, newest first.
  // "past-today-" rows are skipped because the same medicine already appears as a "current" row.
  // A just-added medicine sorts by the time it was added; everything else by its date / dose time.
  const addedAt = readAdded();
  const stampOf = (m: CardMedication) =>
    addedAt[nameKey(m.name)] ?? new Date(`${m.date}T${m.kind === "current" ? "00:00" : m.time || "00:00"}`).getTime();
  const recentSeen = new Set<string>();
  const recent = rows
    .filter((m) => m.kind === "current" || (m.kind === "past" && !m.id.startsWith("past-today-")))
    .sort((a, b) => (stampOf(b) || 0) - (stampOf(a) || 0))
    .filter((m) => {
      const k = nameKey(m.name);
      if (recentSeen.has(k)) return false; // one entry per medicine
      recentSeen.add(k);
      return true;
    })
    .slice(0, 5);
  const missedToday = rows.filter((m) => m.date === today && m.status === "missed");

  // Current and Upcoming come from today's medication list; Past comes from the intake history.
  const sources = tab === "past" ? [history] : [activeMeds];
  const source: Pick<ReturnType<typeof useAsync>, "status" | "error"> = {
    status: sources.some((s) => s.status === "error") ? "error" : sources.some((s) => s.status === "loading") ? "loading" : "ready",
    error: sources.find((s) => s.error)?.error ?? null,
  };
  const emptyText = { current: "No medications are active today.", past: "No past medication history in this date range.", upcoming: "No upcoming medications." }[tab];

  const tabs: [Tab, string][] = [
    ["current", "My medications"],
    ["past", "Past"],
    ["upcoming", "Upcoming"],
  ];

  return (
    <div className="mx-auto w-full max-w-[2080px] pb-16 pt-5 lg:pt-[28px]">
      {shellState && <LutealShell data={data} state={shellState} active="medication-history" compact onNavigate={onNavigate} />}
      <div className="mt-3 flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <ScopeControl value={scope} onChange={setScope} />
        <DateRangeButton from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search medication</span>
          <Search size={13} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#888a98]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medication..."
            className="h-[43px] w-full rounded-full border border-[#eee7ef] bg-white pl-10 pr-4 text-[12px] text-[#24242d] outline-none placeholder:text-[#b0aeb8] shadow-[0_8px_22px_-14px_rgba(70,35,70,.20)] focus:border-[#f43f8f]"
          />
        </label>
      </div>

      {tab !== "current" && missedToday.length > 0 && (
        <div role="alert" className="mt-3 flex items-start gap-3 rounded-[18px] border border-[#f2a3a6] bg-[#fdeeee] px-4 py-3 text-[12px] text-[#b91c1c]">
          <X size={16} strokeWidth={2.4} className="mt-px shrink-0" aria-hidden="true" />
          <p>
            <span className="font-bold">You have missed medicine today.</span>{" "}
            {[...new Set(missedToday.map((m) => m.name))].join(", ")}
          </p>
        </div>
      )}

      <section aria-label="Medication summary" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[12.6px]">
        <SummaryCard icon={<Pill size={22} strokeWidth={1.6} />} tone="bg-[#ffe7f4] text-[#f439a8]" value={stats.total} label="Total Medications" caption="All time" />
        <SummaryCard icon={<CheckCircle2 size={20} strokeWidth={1.7} />} tone="bg-[#d0fcdd] text-[#16a34a]" value={stats.active} label="Currently Active" caption="In your cycle" />
        <SummaryCard icon={<Flag size={21} strokeWidth={1.6} />} tone="bg-[#ffe7f4] text-[#f439a8]" value={stats.completed} label="Completed" caption="Previously taken" />
        <SummaryCard icon={<Sparkles size={22} strokeWidth={1.6} />} tone="bg-[#f0eaff] text-[#8b5cf6]" value={stats.thisCycle} label="This Cycle" caption={`${formatShortDate(from)} – ${formatShortDate(to)}`} />
      </section>

      <div className="mt-3 flex items-center justify-between gap-3">
      <div className="inline-flex h-[42px] items-center gap-1 rounded-full border border-[#eee7ef] bg-white p-[5px] pl-2 shadow-[0_8px_22px_-14px_rgba(70,35,70,.20)]">
        {tabs.map(([item, label]) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`h-[30px] rounded-full px-4 text-[12px] font-semibold ${tab === item ? "bg-[#f43f8f] text-white shadow-[0_6px_12px_-4px_rgba(244,63,143,.45)]" : "text-[#4b4c5e] hover:bg-[#fff0f7]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setAdding(true)}
        aria-haspopup="dialog"
        className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full bg-[#f43f8f] px-4 text-[12px] font-semibold text-white shadow-[0_6px_12px_-4px_rgba(244,63,143,.45)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add medication
      </button>
      </div>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-x-[14px]">
        <section aria-live="polite" className="grid min-w-0 gap-3">
          {source.status === "loading" && <div className="rounded-[22px] border border-[#eee7ef] bg-white p-8 text-center text-sm text-[#68708a]">Loading medication history…</div>}
          {source.status === "error" && <div className="rounded-[22px] border border-red-100 bg-red-50 p-8 text-center text-sm text-red-700">{source.error?.message ?? "Could not load medication history."}</div>}
          {source.status === "ready" && filtered.length === 0 && <div className="rounded-[22px] border border-dashed border-[#eee7ef] bg-white p-12 text-center text-sm text-[#68708a]">{emptyText}</div>}
          {tab === "past" && source.status === "ready" ? (
            <PastTimeline
              items={filtered}
              canEdit={(med) => !!findMedicationMeta(med.name, activeMedications)}
              onEdit={(med, dose, status) => void setDoseStatus(med, dose, status)}
            />
          ) : tab === "upcoming" && source.status === "ready" ? (
            <UpcomingTimeline items={filtered} onAct={(med, dose, status) => void setDoseStatus(med, dose, status)} />
          ) : (
            filtered.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                stock={stockOf(med)}
                onMenu={(action) => void handleMenu(med, action)}
              />
            ))
          )}
        </section>

        <div className="grid min-w-0 gap-[14px] md:grid-cols-2 md:items-start xl:grid-cols-1">
          <RecentActivity entries={recent} />
          <InsightCard />
        </div>
      </div>

      {editingMed && (
        <AddMedicationModal
          key={editingMed.id}
          initial={editingMed}
          defaultStartDate={today}
          onSave={(m) => {
            void updateMedication(editingMed.id, m).then(() => window.dispatchEvent(new Event(DOSES_CHANGED_EVENT))).catch(() => {});
          }}
          onClose={() => setEditingMed(null)}
        />
      )}

      {adding && (
        <AddMedicationModal
          defaultStartDate={today}
          onSave={(m) => {
            void addMedication(m)
              .then(() => {
                markAdded(m.name); // so Recent Activity shows it at the top right away
                window.dispatchEvent(new Event(DOSES_CHANGED_EVENT));
              })
              .catch(() => {});
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}