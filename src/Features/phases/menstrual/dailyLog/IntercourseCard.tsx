import { Ban, Heart, MoreHorizontal, Pill, ShieldCheck } from "lucide-react";
import { useId, type ReactNode } from "react";

import type { Protection } from "../../../../services/logs";

interface IntercourseCardProps {
  intercourse: boolean | null;
  protection: Protection | null;
  /** Used as the "Describe" text when protection is "Other". */
  notes: string | null;
  onChangeIntercourse: (value: boolean | null) => void;
  onChangeProtection: (value: Protection | null) => void;
  onChangeNotes: (value: string) => void;
  /** Not used any more (the reference has no Clear button); kept so the parent does not need to change. */
  onClear?: () => void;
}

const PROTECTION_OPTIONS: { id: Protection; icon: ReactNode }[] = [
  { id: "Pill", icon: <Pill className="h-4 w-4 text-[#F43F8F]" /> },
  { id: "Condom", icon: <ShieldCheck className="h-4 w-4 text-[#0EA5E9]" /> },
  { id: "None", icon: <Ban className="h-4 w-4 text-[#F43F8F]" /> },
  { id: "Other", icon: <MoreHorizontal className="h-4 w-4 text-[#68708A]" /> },
];

const NOTES_MAX = 200;

export function IntercourseCard({
  intercourse,
  protection,
  notes,
  onChangeIntercourse,
  onChangeProtection,
  onChangeNotes,
}: IntercourseCardProps) {
  const headingId = useId();
  const questionId = useId();
  const protectionId = useId();
  const otherId = useId();

  const isYes = intercourse === true;
  const isNo = intercourse === false;

  const choose = (value: boolean) => {
    const next = intercourse === value ? null : value;
    onChangeIntercourse(next);
    // Protection (and its description) only make sense after "Yes".
    if (next !== true) {
      onChangeProtection(null);
      onChangeNotes("");
    }
  };

  const chooseProtection = (id: Protection) => {
    const next = protection === id ? null : id;
    onChangeProtection(next);
    if (next !== "Other") onChangeNotes("");
  };

  const yesNo = (value: boolean, text: string, selected: boolean) => (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => choose(value)}
      className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-all duration-150 sm:min-h-[46px] sm:text-sm ${
        selected
          ? "border-transparent bg-[#F43F8F] text-white shadow-[0_4px_14px_rgba(244,63,143,0.3)]"
          : "border border-[#EAE7EE] bg-white text-[#17152B] hover:border-pink-200 hover:bg-pink-50/40"
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${selected ? "fill-white text-white" : "text-[#68708A]"}`} />
      <span>{text}</span>
    </button>
  );

  return (
    <section
      aria-labelledby={headingId}
      className="w-full space-y-5 rounded-[22px] border border-[#F3DEEB] bg-white p-5 text-left shadow-[0_8px_28px_rgba(244,63,143,0.045)] transition-all sm:p-6"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F] shadow-2xs sm:h-8 sm:w-8"
          aria-hidden="true"
        >
          <Heart className="h-4 w-4 fill-[#F43F8F]" />
        </div>
        <div className="min-w-0">
          <h3 id={headingId} className="text-sm font-bold leading-tight text-[#17152B] sm:text-base">
            Intercourse
          </h3>
          <p className="mt-0.5 text-xs font-medium leading-tight text-[#68708A]">
            Log your sexual activity to track your fertile window and understand your cycle better.
          </p>
        </div>
      </div>

      {/* Row 1: did you have intercourse today? */}
      <div className="grid grid-cols-1 items-center gap-3 sm:gap-4 md:grid-cols-12">
        <div className="min-w-0 md:col-span-4">
          <p id={questionId} className="text-xs font-bold text-[#17152B] sm:text-[13px]">
            Did you have intercourse today?
          </p>
        </div>
        <div role="group" aria-labelledby={questionId} className="grid grid-cols-2 gap-3 sm:gap-4 md:col-span-8">
          {yesNo(true, "Yes", isYes)}
          {yesNo(false, "No", isNo)}
        </div>
      </div>

      {/* Row 2: protection method, only after "Yes" */}
      {isYes && (
        <div className="animate-fade-in space-y-3 border-t border-[#F1DDE8]/60 pt-1">
          <div className="grid grid-cols-1 items-center gap-3 pt-2 sm:gap-4 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4">
              <p id={protectionId} className="text-xs font-bold text-[#17152B] sm:text-[13px]">
                Protection method
              </p>
            </div>
            <div
              role="group"
              aria-labelledby={protectionId}
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 md:col-span-8"
            >
              {PROTECTION_OPTIONS.map((opt) => {
                const selected = protection === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseProtection(opt.id)}
                    className={`flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2 transition-all duration-150 sm:min-h-[68px] ${
                      selected
                        ? "border-2 border-[#F43F8F] bg-[#FFF0F6] font-bold text-[#F43F8F] shadow-2xs"
                        : "border border-[#EAE7EE] bg-white font-medium text-[#68708A] hover:border-pink-200 hover:bg-pink-50/30"
                    }`}
                  >
                    <span className="shrink-0" aria-hidden="true">
                      {opt.icon}
                    </span>
                    <span className={`text-[0.72rem] tracking-tight sm:text-xs ${selected ? "font-bold text-[#F43F8F]" : "font-medium text-[#68708A]"}`}>
                      {opt.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: description, only when protection is "Other" */}
          {protection === "Other" && (
            <div className="animate-fade-in pt-2">
              <div className="grid grid-cols-1 items-center gap-3 sm:gap-4 md:grid-cols-12">
                <div className="min-w-0 md:col-span-4">
                  <label htmlFor={otherId} className="block text-xs font-bold text-[#17152B] sm:text-[13px]">
                    Describe
                  </label>
                </div>
                <div className="md:col-span-8">
                  <input
                    id={otherId}
                    type="text"
                    maxLength={NOTES_MAX}
                    value={notes ?? ""}
                    onChange={(e) => onChangeNotes(e.target.value)}
                    placeholder="Please describe…"
                    className="min-h-[44px] w-full rounded-xl border border-[#F1DDE8] bg-white px-4 py-2.5 text-xs text-[#17152B] transition-all placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F43F8F]/30 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}