import { useState, type ReactNode } from "react";

// Option box: same look as the Vercel mood / mucus tiles (soft border, pink gradient when selected).
const chip = (on: boolean) =>
  `rounded-[12px] border px-4 py-2 text-[14px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 ${
    on
      ? "border-[#F0529C] bg-gradient-to-b from-[#FFF4F8] to-[#FDEAF2] text-[#EF4486] shadow-[0px_6px_16px_-6px_rgba(240,82,156,0.35)]"
      : "border-[#EEEAEE] bg-white text-gray-500 hover:border-pink-200"
  }`;

const labelCls = "text-[14px] font-semibold text-gray-900";

export const fieldCls =
  "mt-2 w-full rounded-[12px] border border-[#EEEAEE] bg-white px-4 py-2.5 text-[14px] text-gray-900 focus:border-[#F0529C] focus:outline-none focus:ring-2 focus:ring-pink-200";

export function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="w-full rounded-[22px] border border-[#F4F1F5] bg-white p-[clamp(1rem,2.4vw,2rem)] shadow-[0px_8px_30px_-12px_rgba(38,33,78,0.12)]"
    >
      <h2 id={id} className="text-[18px] font-semibold leading-tight text-gray-900">{title}</h2>
      {hint && <p className="mt-1 text-[14px] text-gray-500">{hint}</p>}
      {/* Vertical rhythm between the fields inside one card */}
      <div className="mt-4 grid gap-[clamp(1.1rem,1.8vw,1.5rem)] lg:mt-5">{children}</div>
    </section>
  );
}

/** Pick one option; tap the selected one again to clear it (an untouched field stays "not recorded"). */
export function ChoiceGroup<T extends string>({
  label, options, value, onChange,
}: { label: string; options: readonly T[]; value: T | null; onChange: (v: T | null) => void }) {
  return (
    <div role="group" aria-label={label}>
      <p className={labelCls}>{label}</p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(value === o ? null : o)} className={chip(value === o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <ChoiceGroup<"Yes" | "No">
      label={label}
      options={["Yes", "No"]}
      value={value === null ? null : value ? "Yes" : "No"}
      onChange={(v) => onChange(v === null ? null : v === "Yes")}
    />
  );
}

export function ScaleGroup({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number | null; onChange: (v: number | null) => void }) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div role="group" aria-label={label}>
      <p className={labelCls}>{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {steps.map((n) => (
          <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(value === n ? null : n)} className={`${chip(value === n)} min-w-[2.75rem] !px-0 text-center`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MultiChoice<T extends string>({
  label, options, value, onChange,
}: { label: string; options: readonly { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  const toggle = (id: T) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div role="group" aria-label={label}>
      <p className={labelCls}>{label}</p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value.includes(o.id)} onClick={() => toggle(o.id)} className={chip(value.includes(o.id))}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NumberField({
  label, value, onChange, min, max, step = 1, unit,
}: { label: string; value: number | null; onChange: (v: number | null) => void; min: number; max: number; step?: number; unit?: string }) {
  // Keep the raw text so typing "36." or "36.5" isn't rewritten on every keystroke.
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <label className={`block ${labelCls}`}>
      {label}
      {unit && <span className="font-normal text-gray-500"> ({unit})</span>}
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          if (t === "") return onChange(null);
          const n = Number(t);
          if (Number.isFinite(n)) onChange(n);
        }}
        className={fieldCls}
      />
    </label>
  );
}

export function TimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <label className={`block ${labelCls}`}>
      {label}
      <input type="time" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={fieldCls} />
    </label>
  );
}

export function NotesField({ value, onChange, max = 1000 }: { value: string | null; onChange: (v: string | null) => void; max?: number }) {
  return (
    <label className={`block ${labelCls}`}>
      Notes
      <textarea
        value={value ?? ""}
        maxLength={max}
        rows={3}
        onChange={(e) => onChange(e.target.value || null)}
        className={`${fieldCls} resize-y`}
      />
      <span className="mt-1 block text-right text-[13px] font-normal text-gray-500">{(value ?? "").length}/{max}</span>
    </label>
  );
}