import { ChevronRight, Sparkles } from "lucide-react";
import { useId } from "react";
import statusBg from "../../../../assets/phases/menstrual/status-bg.png";
import { PhaseMilestones } from "../../shared/ui/PhaseMilestones";
import { RING_BOX, RING_DAY, RING_DAY_LABEL, RING_PLACEHOLDER, STATUS_GAP, STATUS_ROW, StatusBackdrop, StatusEcho } from "../../shared/ui/PhaseStatusCard";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Height reserved at the bottom of the card for the timeline; the artwork never enters it. */
const TIMELINE_ZONE = "clamp(88px,7.6vw,104px)";

const SHELL =
  "relative flex min-h-[300px] w-full flex-col justify-between overflow-hidden rounded-[28px] border bg-gradient-to-b from-[#F4DEFA] via-[#F9E4F8] to-[#FFEEF7] p-5 text-left shadow-[0_8px_32px_rgba(244,63,143,0.07)] sm:p-6";

const ART_MASK = "linear-gradient(to right, transparent, #000 20%), linear-gradient(to bottom, #000 92%, transparent)";

/** Droplet + flowers artwork, pinned top-right and only as tall as the area above the timeline. */
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

function PhaseTimeline() {
  return (
    <div className="relative z-10">
      <PhaseMilestones active={0} />
    </div>
  );
}

function StatusPill() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[clamp(0.6rem,0.7vw,0.75rem)] font-black uppercase tracking-wider text-[#7C3AED] shadow-2xs">
      Status
    </span>
  );
}

interface Props {
  /** Day of the cycle (null until the engine has any data). */
  cycleDay: number | null;
  /** Typical period length: the ring fills as the period days go by. */
  periodLength: number | null;
  /** True once the backend has an AI summary for today. */
  hasInsight: boolean;
  onAskAva?: () => void;
}

export function MenstrualStatusCard({ cycleDay, periodLength, hasInsight, onAskAva }: Props) {
  const uid = useId().replace(/:/g, "");
  const track = `ringTrack${uid}`;
  const active = `ringActive${uid}`;
  const bead = `bead${uid}`;

  // No cycle data at all: invite the user to start logging instead of showing a made-up day.
  if (cycleDay == null) {
    return (
      <section aria-label="Current cycle status: not logged" className={`${SHELL} border-[#F3DEEB]`}>
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
        <PhaseTimeline />
      </section>
    );
  }

  // No known period length: show only a small starting arc rather than inventing a length.
  const total = periodLength ? Math.max(1, Math.round(periodLength)) : null;
  const progress = total ? Math.min(Math.max(cycleDay / total, 0.06), 1) : 0.06;
  const angle = progress * 2 * Math.PI;
  const beadX = 70 + RADIUS * Math.sin(angle);
  const beadY = 70 - RADIUS * Math.cos(angle);

  const title = (
    <h2 className="whitespace-nowrap text-[clamp(1rem,1.3vw,1.3rem)] font-black leading-tight tracking-tight text-[#17152B] transition-colors group-hover:text-[#F43F8F]">Menstrual Phase</h2>
  );

  return (
    <section aria-label="Current cycle status" className={`${SHELL} border-white/60`}>
      <StatusBackdrop />
      <StatusEcho />
      <StatusArt />

       <div className={STATUS_ROW}>
       <div className={`flex min-w-0 items-center ${STATUS_GAP}`}>
          <div className={RING_BOX}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F43F8F] via-[#E879F9] to-[#8B5CF6] opacity-35 blur-xl" aria-hidden="true" />
            <div className="absolute inset-[8px] rounded-full bg-gradient-to-br from-white/95 via-pink-50/75 to-purple-100/60 shadow-[inset_0_0_15px_rgba(244,63,143,0.12)]" aria-hidden="true" />

            <svg className="relative size-full select-none drop-shadow-[0_4px_16px_rgba(244,63,143,0.3)]" viewBox="0 0 140 140" role="img" aria-label={`Cycle day ${cycleDay}`}>
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
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                transform="rotate(-90 70 70)"
              />
              <circle cx={beadX} cy={beadY} r="6.5" fill={`url(#${bead})`} className="drop-shadow-[0_0_6px_rgba(244,63,143,0.9)]" />
              <circle cx={beadX - 2} cy={beadY - 2} r="2" fill="#FFFFFF" fillOpacity="0.9" />
            </svg>

            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex select-none flex-col items-center justify-center text-center">
              <span className="absolute right-[22%] top-[20%] animate-pulse text-[10px] text-pink-300">✦</span>
              <span className="absolute bottom-[22%] left-[22%] animate-pulse text-[9px] text-purple-300">✦</span>
              <span className={RING_DAY}>{cycleDay}</span>
              <span className={RING_DAY_LABEL}>Cycle day</span>
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <StatusPill />
            {onAskAva ? (
              <button type="button" onClick={onAskAva} aria-haspopup="dialog" aria-label="Menstrual Phase. Ask Ava about this phase" className="group flex cursor-pointer items-center gap-1.5 text-left">
                {title}
                <ChevronRight className="size-4 shrink-0 text-[#7C3AED] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            ) : (
              title
            )}
            {hasInsight && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFF7E0] px-3 py-0.5 text-[11.5px] font-bold text-[#17152B] shadow-2xs sm:text-xs">
                <Sparkles className="size-3.5 text-[#F59E0B]" aria-hidden="true" />
                AI Summary Ready
              </span>
            )}
          </div>
        </div>
      </div>

      <PhaseTimeline />
    </section>
  );
}