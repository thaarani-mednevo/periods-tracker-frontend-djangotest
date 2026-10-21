import { ChevronDown, ClipboardPlus, Lock, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FieldError, FieldGroup, TextField, TimeInput12 } from "../../../../Elements/fields/Fields";
import { OptionCard, handleRadioKeys } from "../../../../Elements/optionCard/OptionCard";
import { StepHeader } from "../../../../Elements/stepHeader/StepHeader";
import { MEDICAL_CONDITIONS, newMedication } from "../../../../constants";
import { cn, ui } from "../../../../lib/cn";
import { medicationDays, medicationEndDate, todayISO } from "../../../../lib/health";
import { medicationProblem } from "../../../../lib/validation";
import type { MedicationEntry, StepProps } from "../../../../types";
import {
  DOSE_UNITS,
  MEDICATION_FREQUENCIES,
  baseFrequency,
  dosesPerDay,
} from "../../../phases/shared/daily-log/constants";

const newId = () => Math.random().toString(36).slice(2, 9);
const DURATION_PRESETS = [5, 7, 14, 30];

/** "500 mg" -> { amount: "500", unit: "mg" }. The unit survives an empty amount (" mg"). */
function splitDose(raw: string) {
  const m = /^\s*([\d.]*)\s*(.*)$/.exec(raw);
  const unit = (m?.[2] ?? "").trim();
  return { amount: m?.[1] ?? "", unit: DOSE_UNITS.includes(unit) ? unit : DOSE_UNITS[0] };
}

function SelectBox({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <div className="relative">
      <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn(ui.input, "appearance-none pr-10")}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
    </div>
  );
}

export function StepMedicalInfo({ data, update, errors }: StepProps) {
  const [rowIds, setRowIds] = useState<string[]>(() => data.medications.map(newId));

  const toggleCondition = (c: string) => {
    const has = data.medicalConditions.includes(c);
    if (c === "None") {
      update({
        medicalConditions: has ? [] : ["None"],
        otherMedicalCondition: "",
      });
      return;
    }
    const withoutNone = data.medicalConditions.filter((x) => x !== "None");
    const nextConditions = has ? withoutNone.filter((x) => x !== c) : [...withoutNone, c];
    update({
      medicalConditions: nextConditions,
      ...(has && c === "Other" ? { otherMedicalCondition: "" } : {}),
    });
  };

  const patchMedication = (i: number, patch: Partial<MedicationEntry>) =>
    update({ medications: data.medications.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });

  const removeMedication = (i: number) => {
    const next = data.medications.filter((_, idx) => idx !== i);
    const ids = rowIds.filter((_, idx) => idx !== i);
    update({ medications: next.length ? next : [newMedication()] });
    setRowIds(next.length ? ids : [newId()]);
    // The pressed button is gone — keep keyboard users in the list instead of dropping focus to <body>.
    requestAnimationFrame(() => document.getElementById(`med-${Math.max(0, i - 1)}`)?.focus());
  };

  const addMedication = () => {
    update({ medications: [...data.medications, newMedication()] });
    setRowIds((ids) => [...ids, newId()]);
    requestAnimationFrame(() => document.getElementById(`med-${data.medications.length}`)?.focus());
  };

  const handleTakingMedication = (taking: boolean) => {
    if (taking === data.takingMedication) return;
    if (taking) {
      update({ takingMedication: true, medications: data.medications.length ? data.medications : [newMedication()] });
      if (!rowIds.length) setRowIds([newId()]);
    } else {
      update({ takingMedication: false, medications: [] });
    }
  };

  /** Frequency changed -> one time slot per dose; times already picked stay. The " · After food" suffix stays too. */
  const changeFrequency = (i: number, m: MedicationEntry, base: string) => {
    const suffix = m.frequency.includes(" · ") ? ` · ${m.frequency.split(" · ")[1]}` : "";
    const n = dosesPerDay(base);
    patchMedication(i, { frequency: base + suffix, times: Array.from({ length: n }, (_, k) => m.times[k] ?? "") });
  };

  const setTime = (i: number, m: MedicationEntry, k: number, value: string) => {
    const n = dosesPerDay(baseFrequency(m.frequency));
    const times = Array.from({ length: n }, (_, idx) => m.times[idx] ?? "");
    times[k] = value;
    patchMedication(i, { times });
  };

  /** Days -> end date. Empty = ongoing. Start date stays as it is (empty = today). */
  const setDays = (i: number, m: MedicationEntry, days: number | undefined) =>
    patchMedication(i, days ? { startDate: m.startDate || todayISO(), endDate: medicationEndDate(m.startDate, days) } : { endDate: "" });

  const showProblems = !!errors.medications;

  return (
    <div>
      <StepHeader
        step={6}
        title="Do you have any medical conditions or take any medications?"
        subtitle="Select anything relevant so we can personalize your tracking experience."
        badge={
          <span className="inline-flex items-center gap-1 text-micro font-medium text-ink-muted" title="Your health information is used only to personalize your experience.">
            <Lock className="size-3 text-rose" aria-hidden="true" />
            Used only to personalize
          </span>
        }
      />

      <FieldGroup icon={ClipboardPlus} title="Medical conditions" helper="Select all that apply." error={errors.medicalConditions}>
        {/* Full-width checkbox cards; two per row only when the card is wide enough to keep them roomy. */}
        <div className="grid gap-1.5 @xs:grid-cols-2">
          {MEDICAL_CONDITIONS.map((c) => (
            <OptionCard key={c} mode="checkbox" size="sm" label={c} selected={data.medicalConditions.includes(c)} onSelect={() => toggleCondition(c)} />
          ))}
        </div>
      </FieldGroup>

      {data.medicalConditions.includes("Other") && (
        <TextField
          id="other-condition"
          label="Please specify"
          className="mt-2 animate-expand"
          value={data.otherMedicalCondition}
          onChange={(otherMedicalCondition) => update({ otherMedicalCondition })}
          placeholder="Please specify, e.g. Hypertension"
          error={errors.otherMedicalCondition}
          srOnlyLabel
        />
      )}

      {/* Medication question, then a full-width Yes / No */}
      <div className="flex flex-col gap-2">
        <p id="meds-q" className="text-body font-semibold text-ink">
          Are you currently taking any medications?
        </p>
        <div role="radiogroup" tabIndex={-1} aria-labelledby="meds-q" onKeyDown={handleRadioKeys} className="grid w-full grid-cols-2 gap-1 rounded-[14px] border border-line bg-blush-50 p-1">
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ].map((o) => {
            const on = data.takingMedication === o.value;
            return (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={data.takingMedication === null || on ? 0 : -1}
                onClick={() => handleTakingMedication(o.value)}
                className={cn(
                  "min-h-11 rounded-[10px] text-body-sm font-semibold transition-[background-color,color,box-shadow] duration-200 focus-ring pointer-fine:min-h-9",
                  on ? "bg-white text-rose-ink shadow-[0_1px_4px_rgb(40_20_30/0.06)] ring-1 ring-select-border" : "text-ink-soft hover:bg-hover-bg",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
      <FieldError message={errors.takingMedication} />

      {data.takingMedication && (
        <div className="animate-expand">
          <ul className="grid gap-3" aria-label="Medications">
            {data.medications.map((m, i) => {
              const { amount, unit } = splitDose(m.dose);
              const base = baseFrequency(m.frequency) || MEDICATION_FREQUENCIES[0];
              const n = dosesPerDay(base);
              const times = Array.from({ length: n }, (_, k) => m.times[k] ?? "");
              const days = medicationDays(m);
              const problem = showProblems && m.name.trim() ? medicationProblem(m) : undefined;
              const doseBad = problem?.startsWith("Enter the dose");
              const timeBad = problem && !doseBad;
              return (
                <li key={rowIds[i] ?? `row-${i}`} className="grid min-w-0 animate-expand gap-3 rounded-[18px] border border-line bg-white/70 p-3">
                  <TextField
                    id={`med-${i}`}
                    label={`Medication ${i + 1}`}
                    srOnlyLabel
                    value={m.name}
                    onChange={(name) => patchMedication(i, { name })}
                    placeholder="e.g. Levothyroxine"
                    trailing={
                      data.medications.length > 1 || m.name ? (
                        <button
                          type="button"
                          onClick={() => removeMedication(i)}
                          aria-label={`Remove medication ${i + 1}`}
                          className="grid size-11 shrink-0 place-items-center rounded-[12px] border border-line bg-white/80 text-ink-muted transition hover:border-rose/30 hover:text-rose-ink focus-ring"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null
                    }
                  />

                  {/* Dose + frequency */}
                  <div className="grid gap-3 @xs:grid-cols-2">
                    <div>
                      <label htmlFor={`med-dose-${i}`} className={cn(ui.label, "mb-1.5 block")}>
                        Dose
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={`med-dose-${i}`}
                          inputMode="decimal"
                          autoComplete="off"
                          maxLength={7}
                          placeholder="e.g. 500"
                          value={amount}
                          aria-invalid={doseBad || undefined}
                          onChange={(e) => /^\d{0,4}(\.\d{0,2})?$/.test(e.target.value) && patchMedication(i, { dose: `${e.target.value} ${unit}` })}
                          className={cn(ui.input, "min-w-0 flex-1", doseBad && ui.inputError)}
                        />
                        <div className="w-[7.5rem] shrink-0">
                          <SelectBox id={`med-unit-${i}`} label="Dose unit" value={unit} onChange={(u) => patchMedication(i, { dose: `${amount} ${u}` })}>
                            {DOSE_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </SelectBox>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`med-freq-${i}`} className={cn(ui.label, "mb-1.5 block")}>
                        How often
                      </label>
                      <SelectBox id={`med-freq-${i}`} label="How often" value={base} onChange={(v) => changeFrequency(i, m, v)}>
                        {MEDICATION_FREQUENCIES.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </SelectBox>
                    </div>
                  </div>

                  {/* One time picker per dose */}
                  <div>
                    <p className={cn(ui.label, "mb-1.5")}>{n > 1 ? "Dose times" : "Dose time"}</p>
                    <div className="grid gap-2 @xs:grid-cols-2">
                      {times.map((t, k) => (
                        <div key={k} className="flex items-center gap-2">
                          {n > 1 && <span className="w-14 shrink-0 text-body-sm font-semibold text-ink-muted">Dose {k + 1}</span>}
                          <TimeInput12
                            id={`med-time-${i}-${k}`}
                            ariaLabel={`Dose ${k + 1} time`}
                            value={t}
                            invalid={(timeBad && !t) || undefined}
                            onChange={(v) => setTime(i, m, k, v)}
                            className={cn(ui.input, timeBad && !t && ui.inputError)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tablets in stock: used for the refill date on the Medication History page */}
                  <div>
                    <label htmlFor={`med-stock-${i}`} className={cn(ui.label, "mb-1.5 block")}>
                      How many tablets do you have?
                    </label>
                    <input
                      id={`med-stock-${i}`}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      placeholder="e.g. 30"
                      value={m.tabletCount ?? ""}
                      onChange={(e) => {
                        if (!/^([1-9]\d{0,3})?$/.test(e.target.value)) return;
                        const tabletCount = e.target.value ? Number(e.target.value) : undefined;
                        // The refill date counts from the start date, so an Ongoing medicine starts today.
                        patchMedication(i, { tabletCount, ...(tabletCount && !m.startDate ? { startDate: todayISO() } : {}) });
                      }}
                      className={cn(ui.input, "w-full")}
                    />
                    <p className={cn(ui.helper, "mt-1.5")}>Optional. We use it to estimate when you will need a refill.</p>
                  </div>

                  {/* How many days */}
                  <div>
                    <label htmlFor={`med-days-${i}`} className={cn(ui.label, "mb-1.5 block")}>
                      For how many days?
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[{ label: "Ongoing", value: undefined }, ...DURATION_PRESETS.map((d) => ({ label: `${d} days`, value: d }))].map((o) => {
                        const on = days === o.value;
                        return (
                          <button
                            key={o.label}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setDays(i, m, o.value)}
                            className={cn(
                              "min-h-9 rounded-full border px-3 text-body-sm font-semibold transition focus-ring",
                              on ? "border-select-border bg-blush-50 text-rose-ink" : "border-line bg-white text-ink-soft hover:bg-hover-bg",
                            )}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                      <input
                        id={`med-days-${i}`}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Custom"
                        aria-label="Custom number of days"
                        value={days ?? ""}
                        onChange={(e) => /^([1-9]\d{0,2})?$/.test(e.target.value) && setDays(i, m, e.target.value ? Number(e.target.value) : undefined)}
                        className={cn(ui.input, "!h-9 w-24 px-3 text-body-sm")}
                      />
                    </div>
                    <p className={cn(ui.helper, "mt-1.5")}>Pick Ongoing if you take it long-term.</p>
                  </div>

                  <FieldError message={problem} />
                </li>
              );
            })}
          </ul>
          <FieldError message={showProblems && !data.medications.some((m) => m.name.trim()) ? errors.medications : undefined} />
          <button
            type="button"
            onClick={addMedication}
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1.5 text-body-sm font-semibold text-rose-ink transition hover:bg-blush-50 focus-ring pointer-fine:min-h-8"
          >
            <Plus className="size-4" aria-hidden="true" /> Add another medication
          </button>
        </div>
      )}
    </div>
  );
}