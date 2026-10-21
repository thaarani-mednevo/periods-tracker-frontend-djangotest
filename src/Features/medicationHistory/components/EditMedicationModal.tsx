import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { totalPerDay } from '../lib/format';
import { fieldClass, labelClass, primaryBtn, secondaryBtn } from '../lib/ui';
import { CATEGORIES, FORMS, UNITS, type Dose, type Medication, type MedicationStatus } from '../types';
import Dialog from './Dialog';
import MedicationIcon from './MedicationIcon';

interface Props {
  medication: Medication;
  onSave: (next: Medication) => void;
  onClose: () => void;
}

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} appearance-none pr-9`}
      >
        {children}
      </select>
      <ChevronDown
        size={13}
        strokeWidth={2.6}
        aria-hidden="true"
        className="pointer-events-none absolute right-[11px] top-1/2 -translate-y-1/2 text-mh-navy"
      />
    </div>
  );
}

export default function EditMedicationModal({ medication, onSave, onClose }: Props) {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;

  const [name, setName] = useState(medication.name);
  const [strength, setStrength] = useState(medication.strength);
  const [form, setForm] = useState(medication.form);
  const [unit, setUnit] = useState(medication.unit);
  const [category, setCategory] = useState<MedicationStatus>(medication.status);
  const [date, setDate] = useState(medication.date);
  const [note, setNote] = useState(medication.note);
  const [doses, setDoses] = useState<Dose[]>(medication.doses.map((d) => ({ ...d })));
  const [submitted, setSubmitted] = useState(false);

  const nameInvalid = name.trim() === '';
  const dosesInvalid = doses.length === 0 || doses.some((d) => !(d.quantity > 0) || !d.time);
  const valid = !nameInvalid && !dosesInvalid;

  const patchDose = (doseId: string, patch: Partial<Dose>) =>
    setDoses((list) => list.map((d) => (d.id === doseId ? { ...d, ...patch } : d)));

  const addDose = () =>
    setDoses((list) => [
      ...list,
      { id: `${medication.id}-${Date.now()}`, quantity: 1, time: '', state: 'upcoming' },
    ]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    onSave({
      ...medication,
      name: name.trim(),
      strength: strength.trim(),
      form,
      unit,
      status: category,
      date: date || medication.date,
      note: note.trim(),
      doses,
    });
  };

  const total = totalPerDay(doses);

  return (
    <Dialog onClose={onClose} labelledBy={id('title')} describedBy={id('desc')} className="max-w-[512px]">
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex items-start gap-3 px-[23px] pt-[23px]">
          <MedicationIcon variant="chip" />
          <div className="min-w-0 flex-1 pr-8 pt-[2px]">
            <h2 id={id('title')} className="text-mh-m-title font-bold text-[#1e1c2b]">
              Edit medication
            </h2>
            <p id={id('desc')} className="text-mh-m-sub text-[#747281]">
              Keep your medication details and daily doses up to date.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-[14px] top-[14px] inline-flex size-11 items-center justify-center rounded-full text-[#64616a] transition hover:bg-mh-blush"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[23px] pb-1 pt-[26px]">
          <div className="grid gap-3">
            <div>
              <label htmlFor={id('name')} className={labelClass}>Medication name</label>
              <input
                id={id('name')}
                data-autofocus
                className={fieldClass}
                value={name}
                aria-invalid={submitted && nameInvalid}
                aria-describedby={submitted && nameInvalid ? id('name-err') : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {submitted && nameInvalid && (
                <p id={id('name-err')} role="alert" className="mt-1 text-mh-m-note font-medium text-mh-danger">
                  Enter a medication name.
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={id('strength')} className={labelClass}>Strength</label>
                <input id={id('strength')} className={fieldClass} value={strength} onChange={(e) => setStrength(e.target.value)} />
              </div>
              <div>
                <label htmlFor={id('form')} className={labelClass}>Form</label>
                <Select id={id('form')} value={form} onChange={setForm}>
                  {FORMS.map((f) => <option key={f}>{f}</option>)}
                </Select>
              </div>
              <div>
                <label htmlFor={id('unit')} className={labelClass}>Unit</label>
                <Select id={id('unit')} value={unit} onChange={setUnit}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </Select>
              </div>
              <div>
                <label htmlFor={id('category')} className={labelClass}>Category</label>
                <Select id={id('category')} value={category} onChange={(v) => setCategory(v as MedicationStatus)}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </div>
            </div>

            <div>
              <label htmlFor={id('date')} className={labelClass}>Date started</label>
              <input id={id('date')} type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <label htmlFor={id('note')} className={labelClass}>
                Note <span className="ml-[3px] text-mh-m-micro font-normal text-mh-muted">Optional</span>
              </label>
              <input id={id('note')} className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <fieldset className="mt-[6px] min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div>
                  <legend className="p-0 text-mh-m-section font-medium text-[#23212d]">Daily dose schedule</legend>
                  <p className="mt-[3px] text-mh-m-micro text-mh-muted" aria-live="polite">
                    {total} {unit}(s) daily · {doses.length} {doses.length === 1 ? 'dose' : 'doses'}
                  </p>
                </div>
                <button type="button" onClick={addDose} className={`${secondaryBtn} h-[31px] whitespace-nowrap px-[15px] text-mh-m-note!`}>
                  <Plus size={11} strokeWidth={2} aria-hidden="true" /> Add dose
                </button>
              </div>

              {submitted && doses.length === 0 && (
                <p role="alert" className="mt-2 text-mh-m-note font-medium text-mh-danger">Add at least one dose.</p>
              )}

              <div className="mt-[14px] grid gap-2">
                {doses.map((d, i) => {
                  const qInvalid = submitted && !(d.quantity > 0);
                  const tInvalid = submitted && !d.time;
                  return (
                    <div key={d.id} className="flex items-center gap-[11px] rounded-[9px] border border-[#ebe6ef] bg-[#fffdff] py-[11px] pl-[11px] pr-[6px]">
                      <span
                        aria-hidden="true"
                        className="inline-flex size-5 shrink-0 items-center justify-center self-center rounded-full bg-mh-blush text-mh-m-num font-bold text-mh-brand"
                      >
                        {i + 1}
                      </span>
                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-[8.6px] min-[460px]:grid-cols-2">
                        <div className="min-w-0">
                          <label htmlFor={id(`q${d.id}`)} className={labelClass.replace('mb-[5px]', 'mb-[6px]')}>
                            Quantity<span className="sr-only"> for dose {i + 1}</span>
                          </label>
                          <div className="relative">
                            <input
                              id={id(`q${d.id}`)}
                              type="number"
                              min={0.5}
                              step={0.5}
                              inputMode="decimal"
                              className={`${fieldClass} h-8 pr-14`}
                              value={d.quantity || ''}
                              aria-invalid={qInvalid}
                              onChange={(e) => patchDose(d.id, { quantity: Number(e.target.value) })}
                            />
                            <span className="pointer-events-none absolute right-[8px] top-1/2 -translate-y-1/2 text-mh-m-micro text-mh-muted">
                              {unit}(s)
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <label htmlFor={id(`t${d.id}`)} className={labelClass.replace('mb-[5px]', 'mb-[6px]')}>
                            Time<span className="sr-only"> for dose {i + 1}</span>
                          </label>
                          <input
                            id={id(`t${d.id}`)}
                            type="time"
                            className={`${fieldClass} h-8`}
                            value={d.time}
                            aria-invalid={tInvalid}
                            onChange={(e) => patchDose(d.id, { time: e.target.value })}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove dose ${i + 1}`}
                        onClick={() => setDoses((list) => list.filter((x) => x.id !== d.id))}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[#6b6a73] transition hover:bg-mh-danger/10 hover:text-mh-danger min-[460px]:mt-5 desk:size-8 pointer-coarse:size-11"
                      >
                        <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {submitted && doses.some((d) => !(d.quantity > 0) || !d.time) && (
                <p role="alert" className="mt-2 text-mh-m-note font-medium text-mh-danger">
                  Every dose needs a quantity above 0 and a time.
                </p>
              )}
            </fieldset>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-4 px-[23px] pb-6 pt-5">
          <button type="button" onClick={onClose} className={`${secondaryBtn} min-w-[81px] flex-1 px-4 sm:w-[81px] sm:flex-none sm:px-0`}>
            Cancel
          </button>
          <button type="submit" className={`${primaryBtn} min-w-[126px] flex-1 whitespace-nowrap px-4 sm:w-[126px] sm:flex-none sm:px-0`}>
            Save changes
          </button>
        </div>
      </form>
    </Dialog>
  );
}
