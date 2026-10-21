import { useId } from "react";
import { Pill } from "lucide-react";

/**
 * Dose ring for the Medication card (used by every phase).
 * Location: src/Features/phases/shared/ui/MedicationRing.tsx
 *
 * Styled like the Basal body temp ring on the overview: white disc, soft track, violet-to-pink gradient, round caps.
 * Segments: taken (gradient, includes doses taken late) and skipped (grey). Upcoming doses stay as the empty track.
 * Centre text = taken / all doses.
 */

export const MED_SEG = {
  taken: { label: "Taken", color: "#BE4BDB" },
  skipped: { label: "Skipped", color: "#9CA3AF" },
  upcoming: { label: "Upcoming", color: "#E4D9F5" },
} as const;
export type MedSegKey = keyof typeof MED_SEG;
export const MED_ORDER = Object.keys(MED_SEG) as MedSegKey[];

const SIZE = 88;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 4;

interface MedicationRingProps {
  counts: Record<MedSegKey, number>;
  total: number;
  pct: number;
  /** Show "--" in the centre (loading / failed). */
  muted?: boolean;
}

export function MedicationRing({ counts, total, pct, muted = false }: MedicationRingProps) {
  const gid = useId().replace(/:/g, "");
  const keys = MED_ORDER.filter((k) => k !== "upcoming" && counts[k] > 0);
  const full = keys.length === 1 && counts[keys[0]] === total;
  const gap = keys.length > 1 ? GAP : 0;
  const done = counts.taken;
  const hasData = !muted && total > 0;

  let offset = 0;
  const arcs = keys.map((k) => {
    const len = total > 0 ? (counts[k] / total) * C : 0;
    // Round caps overshoot by STROKE/2 on each side, so trim that off plus the gap.
    const trim = full ? 0 : STROKE + gap;
    const arc = { k, dash: Math.max(len - trim, 0.01), start: offset + trim / 2 };
    offset += len;
    return arc;
  });

  return (
    <div
      className="pointer-events-none relative shrink-0 select-none self-center"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={total > 0 ? MED_ORDER.map((k) => `${counts[k]} ${MED_SEG[k].label.toLowerCase()}`).join(", ") : "No doses scheduled"}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#F43F8F" />
          </linearGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="white" stroke="#F3E8F5" strokeWidth={STROKE} />
        {arcs.map(({ k, dash, start }) => (
          <circle
            key={k}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={k === "taken" ? `url(#${gid})` : MED_SEG[k].color}
            strokeWidth={STROKE}
            strokeLinecap={full ? "butt" : "round"}
            strokeDasharray={`${dash} ${C}`}
            strokeDashoffset={-start}
            className="transition-all duration-500"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        <Pill className="mb-0.5 size-3 text-[#F43F8F]" strokeWidth={2.4} aria-hidden="true" />
        <span className="text-[15px] font-bold text-lu-ink">{hasData ? `${pct}%` : "--"}</span>
        <span className="text-[9px] font-medium text-[#8A93B2]">{hasData ? `${done}/${total} done` : "No doses"}</span>
      </div>
    </div>
  );
}