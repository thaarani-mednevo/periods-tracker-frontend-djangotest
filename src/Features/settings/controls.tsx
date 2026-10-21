import { Heart, ShieldCheck, Sparkles } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { ReminderDays } from "../../types";
import type { JourneyOption } from "./journeyOptions";

export function ToggleSwitch({ checked, onChange, labelledBy, describedBy, disabled }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group relative -mr-1.5 inline-flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span aria-hidden="true" className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200 ${checked ? "bg-[#F43F8F]" : "bg-[#E2E8F0]"}`}>
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

export function SettingRow({ label, description, checked, onChange, disabled, info }: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Label pakkathula kaattura chinna control (e.g. "i" button) */
  info?: ReactNode;
}) {
  const labelId = useId();
  const descId = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p id={labelId} className="text-xs font-bold text-[#17152B] sm:text-sm">{label}</p>
          {info}
        </div>        {description && <p id={descId} className="text-[0.72rem] text-[#68708A]">{description}</p>}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} labelledBy={labelId} describedBy={description ? descId : undefined} disabled={disabled} />
    </div>
  );
}

const LEAD_DAYS: readonly ReminderDays[] = [1, 3, 5];

export function LeadDaysPicker({ label, value, onChange, disabled }: {
  label: string;
  value: ReminderDays;
  onChange: (days: ReminderDays) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-1.5 pt-1.5" disabled={disabled}>
      <legend className="text-[0.68rem] font-medium text-[#68708A]">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {LEAD_DAYS.map((days) => {
          const selected = value === days;
          return (
            <button
              key={days}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(days)}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full border px-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                selected ? "border-[#F43F8F] bg-[#FFF0F6] text-[#C2185B]" : "border-[#F1DDE8] bg-white text-[#68708A] hover:bg-gray-50"
              }`}
            >
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${selected ? "bg-[#F43F8F]" : "border border-[#68708A]"}`} />
              <span>{days} {days === 1 ? "day" : "days"} before</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function JourneyIcon({ icon, className = "h-5 w-5" }: { icon: JourneyOption["icon"]; className?: string }) {
  if (icon === "heart") return <Heart className={`${className} fill-current`} aria-hidden="true" />;
  if (icon === "shield") return <ShieldCheck className={className} aria-hidden="true" />;
  return <Sparkles className={className} aria-hidden="true" />;
}

/** Soft illustration for the "Trying to conceive" banner in Settings. */
export function TtcPregnantIllustration({ className = "h-24 w-24 sm:h-28 sm:w-28" }: { className?: string }) {
  return (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0 select-none drop-shadow-sm`}>
    {/* Decorative soft pink floral leaves in background */}
    <path d="M15 90 C10 75 25 65 35 75 C45 85 30 100 15 90 Z" fill="#FCE7F3" opacity="0.8" />
    <path d="M25 105 C15 95 28 80 40 88 C50 96 35 115 25 105 Z" fill="#FBCFE8" opacity="0.6" />
    <path d="M100 80 C110 70 105 55 95 62 C85 70 90 90 100 80 Z" fill="#FCE7F3" opacity="0.8" />
    <path d="M110 95 C118 85 110 72 100 78 C90 85 102 105 110 95 Z" fill="#FBCFE8" opacity="0.6" />

    {/* Floating little hearts */}
    <path d="M42 45 C42 40 46 37 49 40 C52 37 56 40 56 45 C56 50 49 55 49 55 C49 55 42 50 42 45 Z" fill="#F472B6" opacity="0.7" />
    <path d="M102 38 C102 34 105 32 107 34 C109 32 112 34 112 38 C112 42 107 46 107 46 C107 46 102 42 102 38 Z" fill="#FDA4AF" opacity="0.8" />

    {/* Woman Hair - back bun */}
    <circle cx="82" cy="24" r="11" fill="#3730A3" />

    {/* Woman Head & Neck */}
    <circle cx="76" cy="30" r="9" fill="#FDE68A" />
    <path d="M72 38 L72 45 L78 45 L78 38 Z" fill="#FCD34D" />

    {/* Hair front silhouette */}
    <path d="M70 24 C74 20 84 22 84 30 C80 32 74 32 70 28 Z" fill="#312E81" />
    <path d="M84 28 C87 34 85 42 80 44 C82 38 84 34 84 28 Z" fill="#312E81" />

    {/* Closed peaceful eye & blush */}
    <path d="M72 30 Q74 32 76 30" stroke="#78350F" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    <circle cx="73" cy="33" r="1.5" fill="#F472B6" opacity="0.6" />

    {/* Torso & Pregnant Belly */}
    <path
      d="M68 45 C64 52 56 62 56 75 C56 88 66 98 78 98 C88 98 94 90 94 80 C94 68 86 52 78 45 Z"
      fill="url(#dressGrad)"
    />

    {/* Gentle Hands resting on pregnant bump */}
    <path d="M68 66 C72 64 78 68 82 72 C80 75 75 76 70 74 Z" fill="#FDE68A" />
    <path d="M65 72 C68 70 74 74 77 78 C75 80 70 81 66 79 Z" fill="#FCD34D" />

    {/* Soft Dress Shading */}
    <path d="M62 76 C62 86 70 94 80 94 C88 94 92 88 92 80 C88 88 80 90 74 88 C68 86 64 82 62 76 Z" fill="#E879F9" opacity="0.3" />

    {/* Gradient definitions */}
    <defs>
      <linearGradient id="dressGrad" x1="60" y1="45" x2="90" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F5D0FE" />
        <stop offset="0.5" stopColor="#E9D5FF" />
        <stop offset="1" stopColor="#DDD6FE" />
      </linearGradient>
    </defs>
  </svg>
  );
}

/** Soft illustration for the "Pregnancy prevention" banner in Settings. */
export function PreventionIllustration({ className = "size-24" }: { className?: string }) {
  return (
    <div className={`${className} relative flex shrink-0 select-none items-center justify-center`} aria-hidden="true">
      <span className="absolute size-20 rounded-full bg-[#F3E8FF]" />
      <span className="absolute -left-1 bottom-3 size-7 rounded-full bg-[#FBCFE8]/70" />
      <span className="absolute right-1 top-2 size-5 rounded-full bg-[#FCE7F3]" />
      <ShieldCheck className="relative size-11 text-[#8B5CF6] drop-shadow-sm" strokeWidth={1.8} />
    </div>
  );
}