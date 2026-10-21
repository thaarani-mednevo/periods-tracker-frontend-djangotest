import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { BellRing, Clock3, Inbox, Info, Pill, Settings2, Trash2 } from 'lucide-react';
import { InfoCard } from '../../../../Elements/infoCard/InfoCard';
import { formatClock, formatDate, formatTime } from '../../../../lib/dailyLogDate';
import type { Medication, NewMedication } from '../../../../services/logs';
import { Emoji } from '../ui/Emoji';
import { AddMedicationModal, dosesPerDay } from './AddMedicationModal';

interface MedicationSectionProps {
  medications: Medication[];
  /** The selected Daily Log date (ISO) */
  date: string;
 onStatusChange: (id: number, status: 'taken' | 'skipped' | 'missed', slot?: number) => void;
  onAdd: (medication: NewMedication) => void;
  /** "menstrual" = compact card with delete. Default keeps the original look (luteal etc.). */
  variant?: 'default' | 'menstrual' | 'follicular' | 'side';
  onRemove?: (id: number) => void;
}



const STATUS_CHIP: Record<'pending' | 'taken' | 'skipped' | 'missed', { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-[#F3F4F6] text-lu-ink-muted' },
  taken: { label: 'Take', className: 'bg-[#DCFCE7] text-[#15803D]' },
  skipped: { label: 'Skip', className: 'bg-[#FEF3C7] text-[#B45309]' },
  missed: { label: 'Miss', className: 'bg-[#FEE2E2] text-[#B91C1C]' },
};

const getMedicationStatus = (
  status: Medication['status'],
): keyof typeof STATUS_CHIP => {
  if (
    status === 'taken' ||
    status === 'skipped' ||
    status === 'missed' ||
    status === 'pending'
  ) {
    return status;
  }

  return 'pending';
};

const MEDICATION_DISCLAIMER =
  "Medication logs are for your own tracking and reminders, not medical advice. Follow your prescription or the leaflet, and ask your doctor or pharmacist before starting, stopping or changing any medicine.";

/** App.tsx provides this on the Daily Log page: opens Medication History on the Upcoming tab. No provider = "Manage" falls back to the Add dialog. */
export const MedicationHistoryLink = createContext<(() => void) | null>(null);

/**
 * "i" button for the card header plus the disclaimer text that opens under the header.
 * Render `toggle` inside the header and `panel` right below it, so the icon is always visible at the top of the card.
 */
function useMedicationDisclaimer() {
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      aria-label={open ? 'Hide medication disclaimer' : 'Show medication disclaimer'}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#68708A] transition-colors hover:bg-[#FFF0F6] hover:text-[#F43F8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
    >
      <Info className="size-4" aria-hidden="true" />
    </button>
  );
  const panel = open ? (
    <p id={id} className="mt-2 shrink-0 rounded-xl bg-[#FFF0F6]/70 px-3 py-2 text-[10.5px] leading-snug text-[#68708A]">
      {MEDICATION_DISCLAIMER}
    </p>
  ) : null;
  const openHistory = useContext(MedicationHistoryLink);
  return { toggle, panel, openHistory };
}

/** Always-visible disclaimer (used in Settings). `compact` = one small line. */
export function MedicationDisclaimer({ compact, className = '' }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <p className={`flex shrink-0 gap-1.5 text-[10.5px] leading-snug text-[#68708A] ${className}`}>
        <Info className="mt-px size-3 shrink-0" aria-hidden="true" />
        <span>{MEDICATION_DISCLAIMER}</span>
      </p>
    );
  }
  return (
    <InfoCard variant="disclaimer" className={`shrink-0 ${className}`}>
      {MEDICATION_DISCLAIMER}
    </InfoCard>
  );
}

/** Same empty state in every phase (copied from the Menstruation reference). Shrinks to fit fixed-height cards instead of overflowing. */
export function MedicationEmptyState({ className = '' }: { className?: string }) {
  return (
    <div className={`flex min-h-0 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#F1DDE8] bg-[#FFFCFE] p-4 text-center sm:p-5 ${className}`}>
      <div className="mx-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
        <Inbox className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-2 text-sm font-bold text-[#17152B]">No medications logged</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-[#68708A] sm:text-[0.82rem]">Use &ldquo;Manage&rdquo; to view or edit your medications.</p>
    </div>
  );
}

const shortDate = (iso: string) => formatDate(iso, { month: 'short', day: 'numeric' }); // "Sep 29", as in the date carousel

/** Snooze: one 30-minute extension per dose. Kept in this browser so Daily Log and History share it. */
export const SNOOZE_MIN = 30;
export type DoseState = 'pending' | 'due' | 'snoozed' | 'taken' | 'skipped' | 'missed';

const snoozeKey = (medId: number, date: string, slot: number) => `medSnooze:${medId}:${date.slice(0, 10)}:${slot}`;
const todayISO = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local

export function getSnoozeUntil(medId: number, date: string, slot: number): number | null {
  try {
    const v = Number(window.localStorage.getItem(snoozeKey(medId, date, slot)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function snoozeDose(medId: number, date: string, slot: number): number {
  const until = Date.now() + SNOOZE_MIN * 60_000;
  try {
    window.localStorage.setItem(snoozeKey(medId, date, slot), String(until));
  } catch {
    /* storage blocked: snooze is lost on refresh */
  }
  return until;
}

/** pending -> due -> (snoozed) -> missed, or taken / skipped. Taken after its scheduled time = late. */
export function resolveDose(o: {
  date: string;
  time: string;
  saved?: string | null;
  loggedAt?: string | null;
  snoozeUntil?: number | null;
  now?: number;
}): { status: DoseState; late: boolean } {
  const now = o.now ?? Date.now();
  const day = o.date.slice(0, 10);
  const dueMs = new Date(`${day}T${o.time}:00`).getTime();

  if (o.saved && o.saved !== 'pending') {
    const late = o.saved === 'taken' && !!o.loggedAt && new Date(o.loggedAt).getTime() > dueMs;
    return { status: o.saved as DoseState, late };
  }
  if (!Number.isFinite(dueMs) || now < dueMs) return { status: 'pending', late: false };
  if (o.snoozeUntil) return { status: now < o.snoozeUntil ? 'snoozed' : 'missed', late: false };
  return { status: day < todayISO() ? 'missed' : 'due', late: false };
}

const CHIP_TEXT = { pending: 'Pending', taken: 'Taken', skipped: 'Skipped', missed: 'Missed' } as const;
const ACCENT = {
  pending: 'border-l-[#C4B5FD]',
  taken: 'border-l-[#16A34A]',
  skipped: 'border-l-[#F59E0B]',
  missed: 'border-l-[#DC2626]',
} as const;

const two = (n: number) => String(n).padStart(2, '0');

/** Gap (hours) between doses, counted from the first dose time. "Three times daily" at 10:00 -> 10:00, 15:00, 20:00. */
const DOSE_OFFSETS: Record<number, number[]> = { 1: [0], 2: [0, 12], 3: [0, 5, 10], 4: [0, 4, 8, 12] };



function slotTimes(m: Medication): string[] {
  const n = dosesPerDay(m.frequency);
  // exact times set by the user in the modal
  const custom = (m.times ?? []).filter(Boolean);
  if (custom.length >= n) return [...custom].slice(0, n).sort();

  // older medications (first dose only) -> auto-gap logic
  const [h, mi] = (m.time || '09:00').split(':').map(Number);
  return DOSE_OFFSETS[n].map((off) => `${two((h + off) % 24)}:${two(mi)}`);
}

/** Label shown on the card, e.g. "8:00 AM · 2:00 PM · 9:00 PM" */
const timesLabel = (m: Medication) =>
  m.time || m.times?.length ? slotTimes(m).map(formatTime).join(' · ') : '';

const doseLogFor = (m: Medication, slot: number) => m.doses?.find((d) => d.slot === slot);
// (removed: clockTime followed the device locale and could show 24h. Use formatClock instead.)

/**
 * One row per dose of the day, read from the backend (`m.doses`, slot 1..n). Take / Skip saves that slot with its
 * own timestamp. A dose whose time passed without Take/Skip becomes "Missed" and is saved for that slot.
 * Take / Skip stay available on every dose (also a missed one), so a wrong or forgotten dose can still be corrected.
 * The popup reminder is NOT here: DoseReminderPopup is mounted once in App, so it works on every page.
 */
function MedicationDoses({
  m, date, active, onStatusChange,
}: {
  m: Medication;
  date: string;
  active: boolean;
  onStatusChange: (id: number, status: 'taken' | 'skipped' | 'missed', slot?: number) => void;
}) {
  const times = slotTimes(m);
  const [, setTick] = useState(0);
  const sentMissed = useRef(new Set<string>());

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const slots = times.map((time, i) => {
    const slot = i + 1;
    const log = doseLogFor(m, slot);
    const saved = log && log.status !== 'pending' ? log : null;
    const snoozeUntil = getSnoozeUntil(m.id, date, slot);
    const r = resolveDose({ date, time, saved: saved?.status, loggedAt: saved?.loggedAt, snoozeUntil });
    return { slot, time, status: r.status, late: r.late, snoozeUntil, saved: !!saved, loggedAt: saved?.loggedAt ?? null };
  });

  // Save "missed" once per slot so History / Calendar see it too
  useEffect(() => {
    if (!active) return;
    for (const s of slots) {
      const key = `${m.id}:${date}:${s.slot}`;
      if (s.status === 'missed' && !s.saved && !sentMissed.current.has(key)) {
        sentMissed.current.add(key);
        onStatusChange(m.id, 'missed', s.slot);
      }
    }
  });

  return (
    <div className="mt-3 flex flex-col gap-2">
      {slots.map((s) => (
        <div key={s.slot} className="flex items-center justify-between gap-2 rounded-2xl border border-[#F3D5E2] bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#17152B]">{shortDate(date)} · {formatTime(s.time)}</p>
            <p
              className={`text-[0.7rem] font-semibold ${
                s.status === 'missed'
                  ? 'text-[#B91C1C]'
                  : s.status === 'taken'
                    ? s.late ? 'text-[#B45309]' : 'text-[#047857]'
                    : s.status === 'skipped' || s.status === 'due'
                      ? 'text-[#B45309]'
                      : s.status === 'snoozed'
                        ? 'text-[#6D28D9]'
                        : 'text-[#68708A]'
              }`}
            >
              {s.status === 'missed'
                ? 'Missed'
                : s.status === 'taken'
                  ? s.late ? 'Taken late' : 'Taken'
                  : s.status === 'skipped'
                    ? 'Skipped'
                    : s.status === 'snoozed'
                      ? `Snoozed · till ${formatClock(new Date(s.snoozeUntil!).toISOString())}`
                      : s.status === 'due'
                        ? 'Due now'
                        : 'Pending'}
              {s.loggedAt && (s.status === 'taken' || s.status === 'skipped') && (
                <span
                  title={s.status === 'taken' ? 'Time you took this dose' : 'Time you skipped this dose'}
                  className={`ml-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[0.7rem] font-bold ${
                    s.status === 'taken' && !s.late ? 'bg-[#DCFCE7] text-[#047857]' : 'bg-[#FEF3C7] text-[#B45309]'
                  }`}
                >
                  <Clock3 className="size-3" aria-hidden="true" />
                  {formatClock(s.loggedAt)}
                </span>
              )}
            </p>
          </div>
          <div role="group" aria-label={`${m.name} ${shortDate(date)} ${formatTime(s.time)} status`} className="inline-flex flex-wrap items-center justify-end gap-1">
            {(['taken', 'skipped'] as const).map((v) => {
              const on = s.status === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  disabled={!active}
                  onClick={() => {
                    onStatusChange(m.id, v, s.slot);
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    on ? (v === 'taken' ? 'bg-[#047857] text-white' : 'bg-[#B45309] text-white') : 'border border-[#F3D5E2] text-[#68708A] hover:text-[#17152B]'
                  }`}
                >
                  {v === 'taken' ? 'Take' : 'Skip'}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Where the selected date falls within the medication's schedule. */
function scheduleState(m: Medication, date: string) {
  if (m.startDate && date < m.startDate) return { active: false, label: `Starts ${shortDate(m.startDate)}` };
  if (m.endDate && date > m.endDate) return { active: false, label: `Ended ${shortDate(m.endDate)}` };
  return { active: true, label: 'Active' };
}

export function MedicationSection({ medications: rawMedications, date, onStatusChange, onAdd, variant = 'default', onRemove }: MedicationSectionProps) {
  const medications = rawMedications;
  const disc = useMedicationDisclaimer();

  const [adding, setAdding] = useState(false);

  if (variant === 'side') {
    return <SideMedication medications={medications} date={date} onStatusChange={onStatusChange} onAdd={onAdd} onRemove={onRemove} />;
  }

  if (variant === 'follicular') {
    return <FollicularMedication medications={medications} date={date} onStatusChange={onStatusChange} onAdd={onAdd} onRemove={onRemove} />;
  }

  if (variant === 'menstrual') {
    return <MenstrualMedication medications={medications} date={date} onStatusChange={onStatusChange} onAdd={onAdd} onRemove={onRemove} />;
  }

  return (
    // xl (3-column row): the wrapper has no content height of its own, so Mood / Body Weight set the row height
    // and the card fills it; the list scrolls inside. Below xl the card is single-row, so the list is capped instead.
    <div className="relative min-w-0">
    <section className="lu-card-pink flex min-w-0 flex-col gap-[clamp(12px,1.2vw,18px)] p-lu-card xl:absolute xl:inset-0">
      <header className="flex shrink-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lu-brand-soft text-lu-brand-strong">
          <Pill className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <h3 className="flex-1 text-lu-heading font-semibold text-lu-ink">Medication</h3>
        {disc.toggle}
        <button
          type="button"
          onClick={() => (disc.openHistory ? disc.openHistory() : setAdding(true))}
          aria-haspopup="dialog"
          aria-label="Manage medications"
          className="inline-flex items-center gap-1 rounded-full bg-[#F43F5E] px-4 py-2 text-lu-label font-medium text-white shadow-soft transition-opacity hover:opacity-90"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          Manage
        </button>
      </header>
      {/* Mounted only while open, so every "+ Log" starts from a clean form */}
      {disc.panel}
      {adding && <AddMedicationModal defaultStartDate={date} onSave={onAdd} onClose={() => setAdding(false)} />}
      {medications.length === 0 ? (
        <MedicationEmptyState className="flex-1" />
      ) : (
      <ul className="flex max-h-[24rem] min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain pr-1 xl:max-h-none xl:flex-1">
        {medications.map((m) => {
          const schedule = scheduleState(m, date);
          const status = getMedicationStatus(m.status);
          const chip = STATUS_CHIP[status];
          const when = timesLabel(m);
          return (
            <li key={m.id} className="flex shrink-0 flex-wrap items-center gap-3 rounded-[clamp(14px,1.2vw,20px)] border border-lu-brand-line bg-white px-3 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full bg-lu-brand-tint">
                <Emoji symbol="💊" className="text-[20px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1">
                  <p className="min-w-0 flex-1 break-words text-lu-label font-semibold leading-snug text-lu-ink">{m.name}</p>
                  {onRemove && (
                    <button
                      type="button"
                      aria-label={`Remove ${m.name}`}
                      onClick={() => {
                        if (window.confirm(`Remove ${m.name}?`)) onRemove(m.id);
                      }}
                      className="shrink-0 rounded-full p-1 text-lu-brand-strong transition-colors hover:bg-lu-brand-soft"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="break-words text-lu-caption text-lu-ink-muted">{[m.dose, m.form, m.frequency].filter(Boolean).join(' · ')}</p>
                {when && <p className="break-words text-lu-caption text-lu-ink-muted">{when}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-lu-caption font-semibold ${
                      schedule.active ? 'bg-lu-brand-soft text-lu-brand-strong' : 'bg-[#F3F4F6] text-lu-ink-muted'
                    }`}
                  >
                    {schedule.label}
                  </span>
                  {schedule.active && (
                    <span className={`rounded-full px-2 py-0.5 text-lu-caption font-semibold ${chip.className}`} aria-live="polite">
                      {chip.label}
                    </span>
                  )}
                  {m.reminder && m.time && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2 py-0.5 text-lu-caption font-semibold text-[#6D28D9]">
                      <BellRing className="h-3 w-3" aria-hidden="true" />
                      Reminder ON
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full">
                <MedicationDoses m={m} date={date} active={schedule.active} onStatusChange={onStatusChange} />
              </div>
            </li>
          );
        })}
      </ul>
      )}
    </section>
    </div>
  );
}

/** Follicular / ovulation daily log: white card that matches the deployed follicular design. */
function FollicularMedication({ medications, date, onStatusChange, onAdd, onRemove }: MedicationSectionProps) {
  const disc = useMedicationDisclaimer();
  const [adding, setAdding] = useState(false);

  return (
    <section className="flex w-full min-w-0 flex-col rounded-[24px] border border-[#F1DDE8]/70 bg-white p-4 text-left shadow-xs sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
            <Pill className="size-4" aria-hidden="true" />
          </span>
          <h3 className="text-[clamp(0.9rem,1vw,1.05rem)] font-semibold leading-tight text-[#17152B]">Medication</h3>
          {disc.toggle}
        </div>
        <button
          type="button"
          onClick={() => (disc.openHistory ? disc.openHistory() : setAdding(true))}
          aria-haspopup="dialog"
          aria-label="Manage medications"
          className="flex items-center gap-1 rounded-full bg-[#F43F8F] px-3 py-1 text-[11px] font-semibold text-white transition-all hover:bg-[#E02E7E] active:scale-95"
        >
          <Settings2 className="size-3" aria-hidden="true" />
          <span>Manage</span>
        </button>
      </div>
      {disc.panel}
      {adding && <AddMedicationModal defaultStartDate={date} onSave={onAdd} onClose={() => setAdding(false)} />}

      {medications.length === 0 ? (
        <MedicationEmptyState />
      ) : (
        <div className="grid grid-cols-1 content-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {medications.map((m) => {
            const schedule = scheduleState(m, date);
            const status = getMedicationStatus(m.status);
            const chip = STATUS_CHIP[status];
            const when = [timesLabel(m), m.frequency].filter(Boolean).join(' · ');            const dosage = [m.dose, m.form].filter(Boolean).join(' · ');
            return (
              <div
                key={m.id}
                className={`flex min-w-0 flex-col gap-3 rounded-[18px] border border-l-4 border-[#F1EEF3] ${ACCENT[status]} bg-white p-3 shadow-xs sm:p-3.5`}
              >
                <div className="flex items-start gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
                    <Pill className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-[13px] font-semibold leading-tight text-[#17152B]">{m.name}</h4>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${schedule.active ? chip.className : 'bg-[#F3F4F6] text-[#68708A]'}`}
                      aria-live="polite"
                    >
                      {schedule.active ? CHIP_TEXT[status] : schedule.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    {onRemove && (
                      <button
                        type="button"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => {
                          if (window.confirm(`Remove ${m.name}?`)) onRemove(m.id);
                        }}
                        className="rounded-full p-1 text-[#F43F8F] hover:bg-[#FFF0F6]"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#68708A]">Dosage &amp; Type</p>
                    <p className="break-words text-[12px] font-medium text-[#17152B]">{dosage || '—'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#68708A]">Schedule</p>
                    <p className="break-words text-[12px] font-medium text-[#8B5CF6]">{when || '—'}</p>
                  </div>
                </div>

                {m.reminder && m.time && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[9.5px] font-semibold text-[#6D28D9]">
                    <BellRing className="size-3" aria-hidden="true" />
                    Reminder ON
                  </span>
                )}

                <MedicationDoses m={m} date={date} active={schedule.active} onStatusChange={onStatusChange} />
              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}

/**
 * Ovulation / follicular daily log: Medication as the 3rd column next to the BBT cards.
 * The card is absolutely filled into a relative box, so the BBT cards (not the medicine count) set the row height
 * and the list scrolls inside. On small screens the box has a fixed height instead.
 */
function SideMedication({ medications, date, onStatusChange, onAdd, onRemove }: MedicationSectionProps) {
  const disc = useMedicationDisclaimer();
  const [adding, setAdding] = useState(false);

  return (
    <div className="relative min-h-[17rem] min-w-0 flex-1 lg:min-h-0">
      <section className="absolute inset-0 flex min-w-0 flex-col rounded-[24px] border border-[#F1DDE8]/70 bg-white p-4 text-left shadow-xs sm:p-5">
        <header className="mb-3 flex shrink-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
            <Pill className="size-4" aria-hidden="true" />
          </span>
          <h3 className="flex-1 text-[clamp(0.95rem,1vw,1.1rem)] font-semibold leading-tight text-[#17152B]">Medication</h3>
          {disc.toggle}
          <button
            type="button"
            onClick={() => (disc.openHistory ? disc.openHistory() : setAdding(true))}
            aria-haspopup="dialog"
            aria-label="Manage medications"
            className="inline-flex items-center gap-1 rounded-full bg-[#F43F5E] px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Settings2 className="size-3.5" aria-hidden="true" />
            Manage
          </button>
        </header>
        {disc.panel}
        {adding && <AddMedicationModal defaultStartDate={date} onSave={onAdd} onClose={() => setAdding(false)} />}

        {medications.length === 0 ? (
          <MedicationEmptyState className="flex-1" />
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain pr-1">
            {medications.map((m) => {
              const schedule = scheduleState(m, date);
              const meta = [m.dose, m.form, m.frequency].filter(Boolean).join(' · ');
              const when = timesLabel(m);
              return (
                <li key={m.id} className="flex shrink-0 flex-wrap items-center gap-3 rounded-[18px] border border-[#F1EEF3] bg-white p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center self-start rounded-full bg-[#F3F4F6]">
                    <Emoji symbol="💊" className="text-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1">
                      <p className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug text-[#17152B]">{m.name}</p>
                      {onRemove && (
                        <button
                          type="button"
                          aria-label={`Remove ${m.name}`}
                          onClick={() => {
                            if (window.confirm(`Remove ${m.name}?`)) onRemove(m.id);
                          }}
                          className="shrink-0 rounded-full p-1 text-[#F43F8F] hover:bg-[#FFF0F6]"
                        >
                          <Trash2 className="size-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {meta && <p className="break-words text-[11px] text-[#68708A]">{meta}</p>}
                    {(when || m.reminder || !schedule.active) && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {when && <span className="text-[10px] font-medium text-[#8B5CF6]">{when}</span>}
                        {!schedule.active && <span className="text-[10px] font-semibold text-[#B45309]">{schedule.label}</span>}
                        {m.reminder && m.time && <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[9px] font-bold text-[#EC4899]">Reminder ON</span>}
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <MedicationDoses m={m} date={date} active={schedule.active} onStatusChange={onStatusChange} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MenstrualMedication({ medications, date, onStatusChange, onAdd, onRemove }: MedicationSectionProps) {
  const disc = useMedicationDisclaimer();
  const [adding, setAdding] = useState(false);

  return (
    <section className="absolute inset-0 flex min-w-0 flex-col rounded-[22px] border border-[#F1EEF3] bg-white p-5 shadow-[0_8px_28px_rgba(23,21,43,0.045)]">
      <header className="flex shrink-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
          <Pill className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight text-[#17152B]">Medication</h3>
          <p className="text-[0.7rem] font-medium leading-tight text-[#68708A]">Saved immediately</p>
        </div>
        {disc.toggle}
        <button
          type="button"
          onClick={() => (disc.openHistory ? disc.openHistory() : setAdding(true))}
          aria-haspopup="dialog"
          aria-label="Manage medications"
          className="inline-flex items-center gap-1 rounded-full bg-[#D6155F] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          Manage
        </button>
      </header>
      {disc.panel}
      {adding && <AddMedicationModal defaultStartDate={date} onSave={onAdd} onClose={() => setAdding(false)} />}

      {medications.length === 0 ? (
        <MedicationEmptyState className="mt-4 flex-1" />
      ) : (
      <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-1">
        {medications.map((m) => {
          const schedule = scheduleState(m, date);
          const meta = [m.dose, m.form, m.frequency].filter(Boolean).join(' · ');
          return (
            <li key={m.id} className="shrink-0 rounded-[18px] border border-[#F9D5E5] bg-[#FFF7FA] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold leading-snug text-[#17152B]">{m.name}</p>
                  {meta && <p className="break-words text-xs font-medium text-[#68708A]">{meta}</p>}
                  {!schedule.active && <p className="mt-1 text-[0.7rem] font-semibold text-[#B45309]">{schedule.label}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  {onRemove && (
                    <button
                      type="button"
                      aria-label={`Remove ${m.name}`}
                      onClick={() => {
                        if (window.confirm(`Remove ${m.name}?`)) onRemove(m.id);
                      }}
                      className="rounded-full p-1.5 text-[#F43F8F] transition-colors hover:bg-[#FFE4EF]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <MedicationDoses m={m} date={date} active={schedule.active} onStatusChange={onStatusChange} />
            </li>
          );
        })}
      </ul>
      )}
    </section>
  );
}