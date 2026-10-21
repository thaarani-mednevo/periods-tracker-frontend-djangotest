import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { Medication, NewMedication } from '../../../../services/logs';
import { TimeInput12 } from '../../../../Elements/fields/Fields';
import { LuModal } from '../ui/LuModal';
import { DOSE_UNITS, MEDICATION_FREQUENCIES, MEDICATION_TYPES, dosesPerDay } from './constants';

// Old importers still do `import { dosesPerDay } from './AddMedicationModal'`
export { dosesPerDay };

type Form = Omit<NewMedication, 'startDate' | 'endDate' | 'time' | 'times' | 'tabletCount'> & {
  startDate: string;
  endDate: string;
  times: string[];
  tabletCount: string;
};
interface AddMedicationModalProps {
  /** Pre-fills the start date (the Daily Log's selected date) */
  defaultStartDate: string;
  onSave: (medication: NewMedication) => void;
  onClose: () => void;
  /** When set, the modal edits this medication instead of adding a new one */
  initial?: Medication;
}

type Errors = Partial<Record<'name' | 'dose' | 'times' | 'startDate' | 'endDate' | 'tabletCount', string>>;
// Stored values stay the same (saved inside `frequency`), only the UI label is "Food Relation"
const FOOD_TIMINGS = ['Anytime', 'Before food', 'After food', 'With food'];

const resizeTimes = (times: string[], n: number) => Array.from({ length: n }, (_, i) => times[i] ?? '');

/** "Three times daily · After food" -> { base: "Three times daily", food: "After food" } */
function splitFrequency(raw?: string) {
  const [base, food] = (raw ?? '').split(' · ');
  return { base: base || '', food: FOOD_TIMINGS.includes(food) ? food : FOOD_TIMINGS[0] };
}

/** "400 mg" -> { amount: "400", unit: "mg" }, so editing an old medication keeps its unit */
function splitDose(raw: string) {
  const m = raw.trim().match(/^([\d.]+)\s*(.*)$/);
  if (m && DOSE_UNITS.includes(m[2])) return { amount: m[1], unit: m[2] };
  return { amount: raw, unit: DOSE_UNITS[0] };
}

const fieldClass =
  'w-full min-w-0 rounded-full border bg-white px-4 py-[clamp(10px,0.9vw,12px)] text-lu-body text-lu-ink outline-none transition-colors placeholder:text-lu-ink-faint focus:border-lu-brand';

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-lu-label font-semibold text-lu-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-lu-caption font-medium text-[#E11D48]">
          {error}
        </p>
      )}
    </div>
  );
}

export function AddMedicationModal({ defaultStartDate, onSave, onClose, initial }: AddMedicationModalProps) {
  const id = useId();
  const [form, setForm] = useState<Form>({
    name: initial?.name ?? '',
    form: initial?.form || MEDICATION_TYPES[0],
    dose: splitDose(initial?.dose ?? '').amount,
    frequency: splitFrequency(initial?.frequency).base || MEDICATION_FREQUENCIES[0],
    times: resizeTimes(
      initial?.times?.length ? initial.times : initial?.time ? [initial.time] : [],
      dosesPerDay(splitFrequency(initial?.frequency).base || MEDICATION_FREQUENCIES[0]),
    ),
    startDate: initial?.startDate ?? defaultStartDate,
    endDate: initial?.endDate ?? '',
    reminder: initial?.reminder ?? true,
    tabletCount: initial?.tabletCount != null ? String(initial.tabletCount) : '',
  });
  const [unit, setUnit] = useState(() => splitDose(initial?.dose ?? '').unit);
  const [food, setFood] = useState(() => splitFrequency(initial?.frequency).food);
  const [errors, setErrors] = useState<Errors>({});
  // Guards against double-clicks / repeated submits creating duplicate medications
  const submitted = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setTime = (i: number, value: string) => {
    setForm((f) => ({ ...f, times: f.times.map((t, idx) => (idx === i ? value : t)) }));
    setErrors((e) => ({ ...e, times: undefined }));
  };

  /** When frequency changes, the time slots resize to 1/2/3/4 and already entered times are kept */
  const changeFrequency = (frequency: string) => {
    setForm((f) => ({ ...f, frequency, times: resizeTimes(f.times, dosesPerDay(frequency)) }));
    setErrors((e) => ({ ...e, times: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = 'Enter a medication name.';
    if (!form.dose.trim()) e.dose = 'Enter a dosage.';
    if (form.times.some((t) => !t)) e.times = 'Choose a time for every dose.';
    else if (new Set(form.times).size !== form.times.length) e.times = 'Dose times must be different.';
    if (!form.startDate) e.startDate = 'Choose a start date.';
    if (form.endDate && form.startDate && form.endDate < form.startDate) e.endDate = 'End date must be on or after the start date.';
    return e;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitted.current) return;
    const problems = validate();
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    submitted.current = true;
    const times = [...form.times].sort();
    onSave({
      ...form,
      name: form.name.trim(),
      time: times[0],
      times,
      dose: `${form.dose.trim()} ${unit}`,
      frequency: food === 'Anytime' ? form.frequency : `${form.frequency} · ${food}`,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      tabletCount: form.tabletCount.trim() ? Number(form.tabletCount) : null,
    });
    onClose();
  };

  const errorProps = (key: keyof Errors) =>
    errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id}-${key}-error` } : {};
  const border = (key: keyof Errors) => (errors[key] ? 'border-[#FDA4AF]' : 'border-lu-line');

  return (
    <LuModal
      labelledBy={`${id}-title`}
      describedBy={`${id}-desc`}
      onClose={onClose}
      initialFocus={nameInput}
      className="max-h-[92dvh] overflow-y-auto px-[clamp(18px,2.4vw,36px)] pb-[clamp(20px,2.2vw,30px)] pt-3 sm:max-w-[560px] sm:rounded-[32px]"
    >
      <span aria-hidden="true" className="mx-auto mb-4 block h-1.5 w-24 rounded-full bg-lu-brand-soft" />
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-lu-title font-bold text-lu-ink">
            {initial ? 'Edit Medication' : 'Add Medication'}
          </h2>
          <p id={`${id}-desc`} className="mt-1 text-lu-label text-lu-ink-muted">
            Only the details you enter are stored. No recommendations are made.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lu-brand-soft text-lu-brand-strong transition-colors hover:bg-[#FBCFE8]"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </button>
      </header>

      <form onSubmit={handleSubmit} noValidate className="mt-[clamp(16px,1.6vw,22px)] flex flex-col gap-[clamp(14px,1.3vw,18px)]">
        <Field id={`${id}-name`} label="Medication Name" error={errors.name}>
          <input
            ref={nameInput}
            id={`${id}-name`}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Iron Supplement"
            maxLength={80}
            autoComplete="off"
            className={`${fieldClass} ${border('name')}`}
            {...errorProps('name')}
          />
        </Field>

        <Field id={`${id}-type`} label="Medication Type">
          <div className="relative">
            <select
              id={`${id}-type`}
              value={form.form}
              onChange={(e) => set('form', e.target.value)}
              className={`${fieldClass} border-lu-line appearance-none pr-10`}
            >
              {MEDICATION_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lu-ink-muted" />
          </div>
        </Field>

        <Field id={`${id}-dose`} label="Dosage" error={errors.dose}>
          <div className="flex gap-2">
            <input
              id={`${id}-dose`}
              value={form.dose}
              onChange={(e) => set('dose', e.target.value)}
              placeholder="e.g. 400"
              inputMode="decimal"
              maxLength={10}
              autoComplete="off"
              className={`${fieldClass} ${border('dose')} flex-1`}
              {...errorProps('dose')}
            />
            <div className="relative w-[7.5rem] shrink-0">
              <select
                aria-label="Dosage unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={`${fieldClass} border-lu-line appearance-none pr-9`}
              >
                {DOSE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lu-ink-muted" />
            </div>
          </div>
        </Field>

        <Field id={`${id}-frequency`} label="Frequency">
          <div className="relative">
            <select
              id={`${id}-frequency`}
              value={form.frequency}
              onChange={(e) => changeFrequency(e.target.value)}
              className={`${fieldClass} border-lu-line appearance-none pr-10`}
            >
              {MEDICATION_FREQUENCIES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lu-ink-muted" />
          </div>
        </Field>

        <Field id={`${id}-food`} label="Food Relation">
          <div className="relative">
            <select
              id={`${id}-food`}
              value={food}
              onChange={(e) => setFood(e.target.value)}
              className={`${fieldClass} border-lu-line appearance-none pr-10`}
            >
              {FOOD_TIMINGS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lu-ink-muted" />
          </div>
        </Field>

        <Field id={`${id}-time-0`} label={form.times.length > 1 ? 'Dose times' : 'Dose time'} error={errors.times}>
          <div className="flex flex-col gap-2">
            {form.times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                {form.times.length > 1 && (
                  <span className="w-14 shrink-0 text-lu-caption font-semibold text-lu-ink-muted">Dose {i + 1}</span>
                )}
                <TimeInput12
                  id={`${id}-time-${i}`}
                  ariaLabel={`Dose ${i + 1} time`}
                  invalid={!!errors.times && !t}
                  value={t}
                  onChange={(v) => setTime(i, v)}
                  className={`${fieldClass} ${errors.times && !t ? 'border-[#FDA4AF]' : 'border-lu-line'}`}
                />
              </div>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-[clamp(14px,1.3vw,18px)] min-[480px]:grid-cols-2">
          <Field id={`${id}-startDate`} label="Start Date" error={errors.startDate}>
            <input
              id={`${id}-startDate`}
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              className={`${fieldClass} ${border('startDate')}`}
              {...errorProps('startDate')}
            />
          </Field>
          <Field id={`${id}-endDate`} label="End Date" error={errors.endDate}>
            <input
              id={`${id}-endDate`}
              type="date"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => set('endDate', e.target.value)}
              className={`${fieldClass} ${border('endDate')}`}
              {...errorProps('endDate')}
            />
          </Field>
        </div>

        <Field id={`${id}-tabletCount`} label="Tablets in stock (optional)" error={errors.tabletCount}>
          <input
            id={`${id}-tabletCount`}
            value={form.tabletCount}
            onChange={(e) => set('tabletCount', e.target.value)}
            placeholder="e.g. 30"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            className={`${fieldClass} ${border('tabletCount')}`}
            {...errorProps('tabletCount')}
          />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-[24px] border border-lu-brand-line bg-lu-brand-tint px-[clamp(16px,1.5vw,20px)] py-3.5">
          <div className="min-w-0">
            <p id={`${id}-reminder`} className="text-lu-body font-semibold text-lu-ink">
              Reminder
            </p>
            <p className="text-lu-caption text-lu-ink-muted">Remind me at the scheduled time</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.reminder}
            aria-labelledby={`${id}-reminder`}
            onClick={() => set('reminder', !form.reminder)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${form.reminder ? 'bg-lu-brand' : 'bg-[#E5E7EB]'}`}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(17,24,39,0.25)] transition-transform ${
                form.reminder ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-lu-line bg-white px-5 py-2.5 text-lu-body font-medium text-lu-ink shadow-lu-pill transition-colors hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-lu-brand px-5 py-2.5 text-lu-body font-semibold text-white shadow-lu-glow transition-colors hover:bg-lu-brand-strong"
          >
            {initial ? 'Save Changes' : 'Save Medication'}
          </button>
        </div>
      </form>
    </LuModal>
  );
}