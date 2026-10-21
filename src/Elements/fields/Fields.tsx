import { CircleAlert, type LucideIcon } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn, ui } from "../../lib/cn";
import { Icon3D } from "../icon3D/Icon3D";

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 flex animate-expand items-center gap-1.5 text-body-sm font-medium text-rose-ink">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  srOnlyLabel?: boolean;
  trailing?: ReactNode;
}

export function TextField({ id, label, value, onChange, error, hint, srOnlyLabel, trailing, className, ...rest }: TextFieldProps) {
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn(ui.label, "mb-2 block", srOnlyLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative flex items-center gap-2">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(ui.input, error && ui.inputError)}
          {...rest}
        />
        {trailing}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className={cn(ui.helper, "mt-1.5")}>
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  unit?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  decimals?: boolean;
  className?: string;
}

/**
 * Numeric input that keeps its own text buffer (so "58." can be typed) while
 * exposing a clean number | undefined to the onboarding state.
 */
export function NumberField({ id, label, value, onChange, unit, placeholder, error, hint, decimals, className }: NumberFieldProps) {
  const [text, setText] = useState(value === undefined ? "" : String(value));

  // Re-sync if the value is changed externally (restored progress, Review edits). Done during render,
  // and only when the buffer no longer represents the value, so a half-typed "58." is never clobbered.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = text.trim() === "" ? undefined : Number(text);
    if (parsed !== value) setText(value === undefined ? "" : String(value));
  }

  const handle = (raw: string) => {
    const pattern = decimals ? /^\d{0,3}(\.\d{0,1})?$/ : /^\d{0,3}$/;
    if (!pattern.test(raw)) return;
    setText(raw);
    const n = raw === "" || raw === "." ? undefined : Number(raw);
    onChange(n !== undefined && Number.isFinite(n) ? n : undefined);
  };

  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className={cn(ui.label, "mb-1.5 block")}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode={decimals ? "decimal" : "numeric"}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(e) => handle(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(ui.input, "h-12 pr-14 text-heading font-semibold tabular-nums pointer-fine:h-11", error && ui.inputError)}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-body font-semibold text-rose-ink">
            {unit}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className={cn(ui.helper, "mt-1.5")}>
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Group label + optional helper for a set of controls. */
export function FieldGroup({
  title,
  helper,
  children,
  error,
  errorId,
  className,
  icon,
}: {
  icon?: LucideIcon;
  title: string;
  helper?: string;
  children: ReactNode;
  error?: string;
  errorId?: string;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-1.5 flex w-full items-center gap-2.5">
        {icon && <Icon3D icon={icon} size="sm" active className="size-8 rounded-[10px]" />}
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-semibold text-ink">{title}</span>
          {helper && <span className={ui.helper}>{helper}</span>}
        </span>
      </legend>
      {children}
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

/**
 * 12-hour time picker (hour, minute, AM/PM). The native <input type="time"> follows the device
 * setting and shows 24h on many phones, so medication times use this instead.
 * `value` and `onChange` still use the 24h "HH:mm" string the API stores.
 */
const TIME_HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const TIME_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

type TimePeriod = "AM" | "PM";
interface TimeParts {
  hour: string; // "1".."12", or "" when no time is set yet
  minute: string; // "00".."59", or ""
  period: TimePeriod;
}

function splitTime(value: string): TimeParts {
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!m) return { hour: "", minute: "", period: "AM" };
  const h24 = Number(m[1]);
  return { hour: String(h24 % 12 || 12), minute: m[2], period: h24 >= 12 ? "PM" : "AM" };
}

function joinTime({ hour, minute, period }: TimeParts) {
  const h24 = (Number(hour) % 12) + (period === "PM" ? 12 : 0);
  return `${String(h24).padStart(2, "0")}:${minute}`;
}

export function TimeInput12({
  value, onChange, className = "", id, ariaLabel = "Time", invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Same look as the other inputs of the form (applied to each of the three selects) */
  className?: string;
  id?: string;
  ariaLabel?: string;
  invalid?: boolean;
}) {
  const cur = splitTime(value);
  // Picking any part of an empty time fills the rest (8:00 AM), so the result is always a complete time
  const change = (patch: Partial<TimeParts>) =>
    onChange(joinTime({ hour: cur.hour || "8", minute: cur.minute || "00", period: cur.period, ...patch }));
  const cls = `${className} min-w-0 flex-1 cursor-pointer`;
  const pad = { paddingInline: 10 };

  return (
    <div role="group" aria-label={ariaLabel} className="flex w-full items-center gap-1.5">
      <select id={id} aria-label={`${ariaLabel} hour`} aria-invalid={invalid || undefined} value={cur.hour} onChange={(e) => change({ hour: e.target.value })} className={cls} style={pad}>
        {!cur.hour && <option value="">--</option>}
        {TIME_HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span aria-hidden="true" className="font-bold">:</span>
      <select aria-label={`${ariaLabel} minute`} aria-invalid={invalid || undefined} value={cur.minute} onChange={(e) => change({ minute: e.target.value })} className={cls} style={pad}>
        {!cur.minute && <option value="">--</option>}
        {TIME_MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select aria-label={`${ariaLabel} AM or PM`} aria-invalid={invalid || undefined} value={cur.period} onChange={(e) => change({ period: e.target.value as TimePeriod })} className={cls} style={pad}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
