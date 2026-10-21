import { ChevronRight, Sparkles } from "lucide-react";
import { useId } from "react";
import statusBg from "../../../../assets/phases/menstrual/status-bg.png";
import { PhaseMilestones, type MilestoneStage } from "./PhaseMilestones";

/**
 * One status card for every phase (Menstrual, Follicular, Ovulation, Luteal).
 * Location: src/Features/phases/shared/ui/PhaseStatusCard.tsx
 *
 * Layout: the artwork lives only in the top zone, the timeline gets its own clean zone underneath,
 * so the droplet / flowers can never run behind the phase labels.
 */

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Height reserved at the bottom of the card for the timeline; the artwork never enters it. */
const TIMELINE_ZONE = "clamp(88px,7.6vw,104px)";

/** Ring + text row. Exported so MenstrualStatusCard uses the same ring size and spacing: change them here, once, for every phase. */
export const STATUS_GAP = "gap-3 sm:gap-4";
export const STATUS_ROW = `relative z-10 flex w-full items-center ${STATUS_GAP}`;
export const RING_BOX = "relative size-[clamp(89px,calc(8.6vw_-_3px),121px)] shrink-0";
export const RING_DAY = "text-[clamp(26px,2.4vw,38px)] font-black leading-none tracking-tight text-[#17152B]";
export const RING_DAY_LABEL = "mt-1 text-[clamp(0.6rem,0.65vw,0.7rem)] font-bold uppercase tracking-[0.14em] text-[#17152B]";
export const RING_PLACEHOLDER = "flex size-[104px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#FCA5C5] bg-[#FFF0F6]/90 shadow-xs sm:size-[120px]";

const SHELL =
  "relative flex h-full min-h-[300px] w-full min-w-0 flex-col justify-between lg:min-h-[clamp(160px,14.7vw,230px)] overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-b from-[#F4DEFA] via-[#F9E4F8] to-[#FFEEF7] p-5 text-left shadow-[0_8px_32px_rgba(244,63,143,0.07)] sm:p-6";

const ART_MASK = "linear-gradient(to right, transparent, #000 20%), linear-gradient(to bottom, #000 92%, transparent)";

function StatusArt() {
  return (
    <img
      src={statusBg}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute -right-2 top-0 w-auto max-w-none select-none"
      style={{
        height: `calc(100% - ${TIMELINE_ZONE})`,
        WebkitMaskImage: ART_MASK,
        maskImage: ART_MASK,
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
      }}
    />
  );
}

/**
 * Timeline background, two layers (both sit UNDER StatusArt):
 *  1. StatusBackdrop: soft silk waves, glows and sparkles across the whole card (also covers the left side the artwork doesn't reach).
 *  2. StatusEcho: your own status-bg.png flipped vertically right under the artwork, so its waves continue below the seam.
 *     Fades in at the seam and is cut off before the droplet / flowers, so only waves appear behind the timeline.
 */
const ECHO_MASK = [
  "linear-gradient(to right, transparent, #000 20%, #000 42%, transparent 66%)",
  "linear-gradient(to top, transparent, #000 14%)",
].join(", ");

export function StatusEcho() {
  return (
    <img
      src={statusBg}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute -right-2 w-auto max-w-none select-none"
      style={{
        top: `calc((100% - ${TIMELINE_ZONE}) * 0.92)`,
        height: `calc(100% - ${TIMELINE_ZONE})`,
        transform: "scaleY(-1)",
        WebkitMaskImage: ECHO_MASK,
        maskImage: ECHO_MASK,
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
      }}
    />
  );
}

export function StatusBackdrop() {
  const uid = useId().replace(/:/g, "");
  const a = `wa${uid}`;
  const b = `wb${uid}`;
  const c = `wc${uid}`;
  const glow = `gl${uid}`;
  const soft = `sf${uid}`;

  return (
    <svg aria-hidden="true" viewBox="0 0 680 310" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <filter id={soft} x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <linearGradient id={a} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".15" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".6" />
          <stop offset="1" stopColor="#fff" stopOpacity=".15" />
        </linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F9A8D4" stopOpacity=".4" />
          <stop offset=".6" stopColor="#C4A8FF" stopOpacity=".35" />
          <stop offset="1" stopColor="#E9D5FF" stopOpacity=".25" />
        </linearGradient>
        <linearGradient id={c} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFD1E8" stopOpacity=".6" />
          <stop offset="1" stopColor="#DDD0FF" stopOpacity=".5" />
        </linearGradient>
        <radialGradient id={glow} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* bokeh glows */}
      <ellipse cx="90" cy="235" rx="150" ry="70" fill={`url(#${glow})`} opacity=".75" />
      <ellipse cx="330" cy="270" rx="170" ry="55" fill={`url(#${glow})`} opacity=".6" />
      <circle cx="520" cy="225" r="38" fill={`url(#${glow})`} opacity=".55" />

      {/* silk waves */}
      <path d="M0 170 C110 120 210 215 340 168 S570 120 680 170 V310 H0Z" fill={`url(#${b})`} />
      <path d="M0 215 C130 180 250 250 390 212 S590 185 680 218 V310 H0Z" fill={`url(#${c})`} />
      <path d="M0 262 C150 238 270 288 420 258 S600 240 680 266 V310 H0Z" fill={`url(#${a})`} />

      {/* highlight ribbons */}
      <g fill="none" stroke="#fff" strokeLinecap="round" filter={`url(#${soft})`}>
        <path d="M0 150 C120 100 230 195 350 150 S570 105 680 150" strokeOpacity=".6" strokeWidth="2" />
        <path d="M0 198 C130 160 255 235 395 195 S590 170 680 202" strokeOpacity=".55" strokeWidth="1.6" />
        <path d="M0 246 C150 222 275 272 425 242 S605 226 680 250" strokeOpacity=".5" strokeWidth="1.4" />
        <path d="M0 40 C150 0 260 85 410 38 S600 10 680 45" strokeOpacity=".4" strokeWidth="1.4" />
      </g>

      {/* sparkles */}
      <g fill="#fff" opacity=".95">
        <path d="M300 78l2.4 6.6 6.6 2.4-6.6 2.4-2.4 6.6-2.4-6.6-6.6-2.4 6.6-2.4z" />
        <path d="M90 232l1.8 4.6 4.6 1.8-4.6 1.8-1.8 4.6-1.8-4.6-4.6-1.8 4.6-1.8z" />
        <path d="M545 250l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path d="M355 262l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" />
        <path d="M200 270l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4z" />
      </g>
      <g fill="#F9A8D4" opacity=".8">
        <circle cx="230" cy="215" r="2.2" />
        <circle cx="610" cy="215" r="2" />
        <circle cx="470" cy="228" r="1.6" />
      </g>
    </svg>
  );
}

function StatusPill() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[clamp(0.6rem,0.7vw,0.75rem)] font-black uppercase tracking-wider text-[#7C3AED] shadow-2xs">
      Status
    </span>
  );
}

export interface PhaseStatusCardProps {
  /** 0 Period, 1 Follicular, 2 Ovulation, 3 Luteal: highlights that badge in the timeline. */
  stage: MilestoneStage;
  /** e.g. "Menstrual Phase". */
  title: string;
  cycleDay: number | null;
  /** Ring fill, 0 to 1. */
  progress: number;
  hasInsight: boolean;
  /** When set, the title becomes a button (with a chevron) that opens the AI summary. */
  onAskAva?: () => void;
  /** Menstrual only: no cycle data yet, so invite the user to start logging. */
  notLogged?: boolean;
}

export function PhaseStatusCard({ stage, title, cycleDay, progress, hasInsight, onAskAva, notLogged = false }: PhaseStatusCardProps) {
  const uid = useId().replace(/:/g, "");
  const track = `ringTrack${uid}`;
  const active = `ringActive${uid}`;
  const bead = `bead${uid}`;

  if (notLogged) {
    return (
      <section aria-label="Current cycle status: not logged" className={SHELL}>
        <StatusBackdrop />
        <StatusEcho />
        <StatusArt />
         <div className={STATUS_ROW}>
           <div className={RING_PLACEHOLDER} aria-hidden="true">
            <div className="relative flex size-14 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#F43F8F] bg-white shadow-md sm:size-16">
              <div className="absolute top-0 flex h-3.5 w-full items-center justify-around bg-[#F43F8F] px-2">
                <span className="size-1.5 rounded-full bg-white" />
                <span className="size-1.5 rounded-full bg-white" />
              </div>
              <div className="grid w-full grid-cols-3 gap-1 px-2.5 pt-4">
                {[0, 0, 0, 0, 1, 0].map((on, i) => (
                  <span key={i} className={`size-2 rounded-xs ${on ? "bg-[#F43F8F]" : "bg-[#FFD1E3]"}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            <StatusPill />
            <h2 className="text-[clamp(1.25rem,1.5vw,1.65rem)] font-black leading-tight tracking-tight text-[#17152B]">Not logged</h2>
            <p className="max-w-[260px] text-[clamp(0.75rem,0.85vw,0.92rem)] font-medium leading-tight text-[#68708A]">Start logging to see your current phase.</p>
          </div>
        </div>
        <div className="relative z-10">
          <PhaseMilestones active={stage} />
        </div>
      </section>
    );
  }

  const p = Math.min(Math.max(progress, 0.06), 1);
  const angle = p * 2 * Math.PI;
  const beadX = 70 + RADIUS * Math.sin(angle);
  const beadY = 70 - RADIUS * Math.cos(angle);

  const heading = (
    <h2 className="text-[clamp(1rem,1.3vw,1.3rem)] font-black leading-tight tracking-tight text-[#17152B] transition-colors group-hover:text-[#F43F8F]">{title}</h2>
  );

  return (
    <section aria-label="Current cycle status" className={SHELL}>
      <StatusBackdrop />
      <StatusEcho />
      <StatusArt />

       <div className={STATUS_ROW}>
       <div className={RING_BOX}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F43F8F] via-[#E879F9] to-[#8B5CF6] opacity-35 blur-xl" aria-hidden="true" />
          <div className="absolute inset-[8px] rounded-full bg-gradient-to-br from-white/95 via-pink-50/75 to-purple-100/60 shadow-[inset_0_0_15px_rgba(244,63,143,0.12)]" aria-hidden="true" />

          <svg className="relative size-full select-none drop-shadow-[0_4px_16px_rgba(244,63,143,0.3)]" viewBox="0 0 140 140" role="img" aria-label={`Cycle day ${cycleDay ?? "unknown"}`}>
            <defs>
              <linearGradient id={track} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FCE7F3" />
                <stop offset="50%" stopColor="#F5E8FF" />
                <stop offset="100%" stopColor="#EDE9FE" />
              </linearGradient>
              <linearGradient id={active} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F43F8F" />
                <stop offset="35%" stopColor="#EC4899" />
                <stop offset="70%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <radialGradient id={bead} cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="30%" stopColor="#FFA0CA" />
                <stop offset="75%" stopColor="#F43F8F" />
                <stop offset="100%" stopColor="#9D174D" />
              </radialGradient>
            </defs>
            <circle cx="70" cy="70" r={RADIUS} stroke={`url(#${track})`} strokeWidth="11" fill="none" />
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              stroke={`url(#${active})`}
              strokeWidth="11.5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - p)}
              transform="rotate(-90 70 70)"
            />
            <circle cx={beadX} cy={beadY} r="6.5" fill={`url(#${bead})`} className="drop-shadow-[0_0_6px_rgba(244,63,143,0.9)]" />
            <circle cx={beadX - 2} cy={beadY - 2} r="2" fill="#FFFFFF" fillOpacity="0.9" />
          </svg>

          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex select-none flex-col items-center justify-center text-center">
            <span className="absolute right-[22%] top-[20%] animate-pulse text-[10px] text-pink-300">✦</span>
            <span className="absolute bottom-[22%] left-[22%] animate-pulse text-[9px] text-purple-300">✦</span>
            <span className={RING_DAY}>{cycleDay ?? "–"}</span>
            <span className={RING_DAY_LABEL}>Cycle day</span>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <StatusPill />
          {onAskAva ? (
            <button type="button" onClick={onAskAva} aria-haspopup="dialog" aria-label={`${title}. Ask Ava about this phase`} className="group flex cursor-pointer items-center gap-1.5 text-left">
              {heading}
              <ChevronRight className="size-4 shrink-0 text-[#7C3AED] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          ) : (
            heading
          )}
          {hasInsight && (
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFF7E0] px-3 py-0.5 text-[11.5px] font-bold text-[#17152B] shadow-2xs sm:text-xs">
              <Sparkles className="size-3.5 text-[#F59E0B]" aria-hidden="true" />
              AI Summary Ready
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <PhaseMilestones active={stage} />
      </div>
    </section>
  );
}