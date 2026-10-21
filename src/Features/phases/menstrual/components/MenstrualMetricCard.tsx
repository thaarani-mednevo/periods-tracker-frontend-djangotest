import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { CardWave, type CardWaveTone } from "../../../../Elements/CardWave/CardWave";
import { surface } from "./surface";

export interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  /** Small round icon next to the label (ignored for eyebrow cards). */
  icon?: ReactNode;
  iconClass?: string;
  /** Uppercase label with no icon (used by the AI prediction card). */
  eyebrow?: boolean;
  /** Illustration on the right: an <img> or an inline SVG visual. */
  visual?: ReactNode;
  /** Corner chevron that signals the card is tappable. On by default; pass false to hide. */
  chevron?: boolean;
  /** Colour of the wavy background. Pink by default; purple for Symptoms and AI Prediction. */
  tone?: CardWaveTone;
  onOpen: () => void;
}

export function MenstrualMetricCard({
  label,
  value,
  description,
  icon,
  iconClass = "bg-[#FFEEF5]",
  eyebrow,
  visual,
  chevron = true,
  tone = "pink",
  onOpen,
}: MetricCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label}: ${value}. Open daily log`}
      className={`${surface.halo} group relative flex min-h-[128px] w-full cursor-pointer items-center justify-between gap-3 overflow-hidden p-4 text-left font-['Inter',sans-serif] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(236,72,153,0.12)] sm:p-5`}
    >
      <CardWave tone={tone} />

      {/* Text is pinned to the top so labels and values line up across cards in the same row */}
      <span className="relative z-10 block min-w-0 flex-1 self-start pr-2">
        {/* Header row has a fixed height so eyebrow and icon cards share the same baseline */}
        <span className="flex h-6 items-center gap-2 sm:h-7">
          {eyebrow ? (
            <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#68708A]">{label}</span>
          ) : (
            <>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full sm:size-7 ${iconClass}`} aria-hidden="true">
                {icon}
              </span>
              <span className="text-xs font-bold tracking-tight text-[#17152B] sm:text-[13px]">{label}</span>
            </>
          )}
        </span>

        <span className="mt-2.5 block break-words text-base font-black leading-tight tracking-tight text-[#17152B] sm:text-[19px]">{value}</span>

        <span className="mt-1 block whitespace-pre-line break-words text-[11.5px] font-medium leading-snug text-[#68708A] sm:text-xs">{description}</span>
      </span>

      {visual && (
        <span className="relative z-10 -my-3 shrink-0 select-none self-center" aria-hidden="true">
          {visual}
        </span>
      )}

      {chevron && (
        <ChevronRight
          className="absolute right-4 top-4 z-10 size-4 text-[#A0AEC0] transition-all group-hover:translate-x-0.5 group-hover:text-[#F43F8F]"
          aria-hidden="true"
        />
      )}
    </button>
  );
}