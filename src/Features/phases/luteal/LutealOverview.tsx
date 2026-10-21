import { ArrowRight, Sparkles } from "lucide-react";
import { useCallback, useId, useState, type ReactNode } from "react";
import { InfoCard } from "../../../Elements/infoCard/InfoCard";
import { useAsync } from "../../../hooks/useAsync";
import { getPhaseInsight } from "../../../services/insights";
import { getDailyLog } from "../../../services/logs";
import { fmtDate } from "../../dashboard/phases";
import type { PhaseViewProps } from "../types";
import { LogPeriodModal } from "./components/LogPeriodModal";
import { MetricCard, type MetricCardProps } from "./components/MetricCard";
import { PhaseTipsModal } from "../shared/ui/PhaseTipsModal";
import { AIRecommendation, CycleInsights, MedicationScoreCard } from "./components/OverviewSections";
import { CardWave } from "../../../Elements/CardWave/CardWave";
import { LUTEAL_COPY, symptomLabel } from "./lutealContent";
import bannerBg from "../../../assets/phases/ovulation/period-banner-bg.webp";
import statusBg from "../../../assets/phases/ovulation/status-card-bg.webp";
import lutealGirl from "../../../assets/phases/luteal/leutal-illustration.png";
import { DEFAULT_STEP_GOAL, WATER_TARGET_ML } from "../shared/daily-log/constants";
import { Emoji } from "../shared/ui/Emoji";
import { ScaleArt, WaterGlassArt } from "../shared/ui/Illustrations";
import patientPhoto from "../../../assets/phases/patient.png";
import moodHappy from "../../../assets/phases/follicular/mood_happy.png";
import moodCalm from "../../../assets/phases/follicular/mood_calm.png";
import moodNeutral from "../../../assets/phases/follicular/mood_neutral.png";
import moodIrritable from "../../../assets/phases/follicular/mood_irritable.png";
import moodSad from "../../../assets/phases/follicular/mood_sad.png";
import { CRAVING_EMOJI, EnergyBolt, FatigueBattery, SLEEP_EMOJI } from "../shared/ui/visuals";
import { PhaseMilestones } from "../shared/ui/PhaseMilestones";
import { PhaseStatusCard } from "../shared/ui/PhaseStatusCard";
// Display goals only. The backend has no goal fields yet.
export const WATER_GOAL_ML = WATER_TARGET_ML;
export const STEP_GOAL = DEFAULT_STEP_GOAL;

const visualSize = "w-[clamp(50px,4.2vw,72px)]";
const emojiSize = "text-[clamp(36px,3vw,52px)]";
const NOT_LOGGED = "Not logged";
const TAP_TO_LOG = "Tap the arrow to log today";

// Same faces the Daily Log mood tiles use, so a logged mood looks identical on the Overview card.
const MOOD_IMG: Record<string, string> = {
  Happy: moodHappy,
  Calm: moodCalm,
  Neutral: moodNeutral,
  Irritable: moodIrritable,
  Sad: moodSad,
};


const TIMELINE = ["Period", "Follicular", "Ovulation", "Luteal"] as const;
const ACTIVE_STOP = 3; // this screen is always the luteal phase
const RING_RADIUS = 58;
const RING_STROKE = 9;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Status card with the pink floral artwork behind it (luteal-phase design). */

function LutealStatusCard({ cycleDay, cycleLength, hasInsight, onAskAva }: { cycleDay: number | null; cycleLength: number | null; hasInsight: boolean; onAskAva?: () => void }) {
  const progress = cycleDay && cycleLength ? Math.min(Math.max(cycleDay / cycleLength, 0), 1) : 0;
  return <PhaseStatusCard stage={3} title="Luteal Phase" cycleDay={cycleDay} progress={progress} hasInsight={hasInsight} onAskAva={onAskAva} />;
}
/** Phase banner with the floral artwork behind the text (luteal-phase design). Girl sits flush bottom-right, same as the Follicular banner. */
function LutealBanner({ onLogPeriod, onViewTips }: { onLogPeriod: () => void; onViewTips: () => void }) {
  return (
    <section
      aria-label="Current phase information"
      className="relative isolate flex w-full min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-[clamp(18px,1.6vw,24px)] border border-pink-100/70 bg-[#FBEFFA] pl-[clamp(14px,1.35vw,22px)] pt-[clamp(14px,1.35vw,22px)] shadow-[0_12px_32px_-14px_rgba(236,72,153,0.16),0_2px_6px_rgba(17,24,39,0.04)] sm:flex-row sm:items-stretch sm:gap-4 lg:h-0 lg:min-h-full"
    >
      <div className="pointer-events-none absolute inset-y-0 -right-[10%] left-0 -z-10 bg-cover bg-[position:right_center] bg-no-repeat" style={{ backgroundImage: `url(${bannerBg})` }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-white/70 via-white/45 via-45% to-transparent to-80% max-sm:via-white/55 max-sm:to-white/25 max-sm:to-100%" aria-hidden="true" />

      <div className="relative z-10 flex min-w-0 max-w-[500px] flex-col justify-center pb-[clamp(14px,1.35vw,22px)] sm:max-w-[58%]">
        <h2 className="text-[clamp(1rem,1.3vw,1.3rem)] font-bold leading-tight text-lu-ink">{LUTEAL_COPY.heading}</h2>
        <p className="mt-2 text-[clamp(0.8125rem,0.85vw,0.925rem)] leading-relaxed text-lu-ink-soft">{LUTEAL_COPY.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onLogPeriod} aria-haspopup="dialog" className="rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-[clamp(16px,1.4vw,22px)] py-2 text-[clamp(12px,0.8vw,13.5px)] font-semibold text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)] transition-all hover:opacity-95 active:scale-[0.98]">
            Log period
          </button>
          <button type="button" onClick={onViewTips} aria-haspopup="dialog" className="rounded-full bg-transparent px-[clamp(12px,1.1vw,18px)] py-2 text-[clamp(12px,0.8vw,13.5px)] font-semibold text-lu-brand-strong transition-colors hover:bg-pink-100/50">
            View Tips
          </button>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 hidden min-h-0 w-[clamp(140px,19vw,300px)] shrink-0 select-none items-end justify-center overflow-hidden pr-2 sm:flex">
        <img src={lutealGirl} alt="" aria-hidden="true" decoding="async" className="h-auto max-h-full w-full object-contain object-bottom" />
      </div>
    </section>
  );
}

const useArtId = () => useId().replace(/:/g, "");

function SymptomArt({ className = "" }: { className?: string }) {
  const id = useArtId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-b`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FBCFE8" />
          <stop offset="0.55" stopColor="#F472B6" />
          <stop offset="1" stopColor="#DB2777" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="16" ry="2.6" fill="#FBCFE8" opacity="0.7" />
      <rect x="9" y="7" width="46" height="46" rx="15" fill={`url(#${id}-b)`} />
      <path d="M15 33h8l3.5-8 5 15 4-11 2.5 4H49" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IntimacyArt({ className = "" }: { className?: string }) {
  const id = useArtId();
  const heart = "M32 54C18 44 8 35.5 8 24.5 8 17 13.8 11 21 11c4.6 0 8.6 2.4 11 6 2.4-3.6 6.4-6 11-6 7.2 0 13 6 13 13.5C56 35.5 46 44 32 54z";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-f`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#FECDD3" />
          <stop offset="0.5" stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </radialGradient>
        <radialGradient id={`${id}-k`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#EDE9FE" />
          <stop offset="0.55" stopColor="#C4B5FD" />
          <stop offset="1" stopColor="#8B5CF6" />
        </radialGradient>
      </defs>
      <ellipse cx="30" cy="59" rx="17" ry="2.6" fill="#FBCFE8" opacity="0.7" />
      <g transform="translate(14 -4) scale(0.72)"><path d={heart} fill={`url(#${id}-k)`} /></g>
      <g transform="translate(-2 6) scale(0.82)"><path d={heart} fill={`url(#${id}-f)`} /></g>
    </svg>
  );
}

/** Same container and arrow button as the metric cards, so these read as native dashboard cards. */
function SummaryCard({ icon, title, dateLabel, accent, arrowLabel, onOpen, children }: { icon: ReactNode; title: string; dateLabel: string; accent: string; arrowLabel: string; onOpen: () => void; children: ReactNode }) {
  return (
    <article className="lu-card relative isolate flex min-h-[clamp(120px,8.5vw,148px)] min-w-0 flex-col gap-3 p-lu-card" aria-label={`${title}, ${dateLabel}`}>
      <CardWave behind tone={title.includes("Symptom") ? "purple" : "pink"} />
      <header className="flex items-center gap-3">
        <span className="flex size-[clamp(44px,3.4vw,52px)] shrink-0 items-center justify-center">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lu-label font-semibold text-lu-ink">{title}</h2>
          <p className="text-lu-caption text-lu-ink-muted">{dateLabel}</p>
        </div>
      </header>
      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <button type="button" onClick={onOpen} aria-label={arrowLabel} className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-transform hover:translate-x-0.5 ${accent}`}>
          <ArrowRight className="size-4" strokeWidth={2.2} />
        </button>
      </div>
    </article>
  );
}

const NotLogged = ({ what }: { what: string }) => (
  <p className="text-lu-body font-semibold text-lu-ink-muted">
    Not logged
    <span className="block text-lu-caption font-normal">No {what} saved for this date.</span>
  </p>
);

export function LutealOverview({ state, onOpenTrends, onAskAva, onOpenDailyLog, onChanged }: PhaseViewProps) {
  const [logOpen, setLogOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const day = state.date;

  const loadLog = useCallback((s: AbortSignal) => getDailyLog(day, s), [day]);
  const log = useAsync(loadLog).data;
  const loadInsight = useCallback((s: AbortSignal) => getPhaseInsight(day, s), [day]);
  const insight = useAsync(loadInsight);

  const openLog = onOpenDailyLog ?? (() => {});
  const next = state.nextPeriod;
  const nextPeriodText = next
    ? `Your next period is expected around ${fmtDate(next.date)}.`
    : "Log a period to see when your next one is expected.";

  const symptomItems = (log?.symptoms ?? []).map(symptomLabel);
  const severity = log?.painScore ?? null;
  const symptomsLogged = symptomItems.length > 0 || severity !== null;
  const dateLabel = `Today · ${fmtDate(day)}`;
  const protection = log?.protection === "Other" ? log.notes?.trim() || "Other" : (log?.protection ?? null);

  const water = log?.waterMl ?? null;
  const steps = log?.steps ?? null;

  const metrics: MetricCardProps[] = [
    {
      label: "Mood",
      value: log?.mood ?? NOT_LOGGED,
      description: log?.mood ? "How you felt today" : TAP_TO_LOG,
      accent: "bg-[#EDE9FE] text-[#6D28D9]",
      visual: log?.mood ? (
        <img src={MOOD_IMG[log.mood]} alt="" className={`${visualSize} aspect-square rounded-full object-cover`} />
      ) : (
        <span className={`${visualSize} aspect-square overflow-hidden rounded-full bg-lu-brand-soft opacity-40`}>
          <img src={patientPhoto} alt="" className="h-full w-full object-cover object-top" />
        </span>
      ),
    },
    {
      label: "Body Weight",
      value: log?.weightKg != null ? `${log.weightKg} kg` : NOT_LOGGED,
      description: log?.weightKg != null ? "Logged today" : TAP_TO_LOG,
      accent: "bg-[#E0F2FE] text-[#0284C7]",
      visual: <ScaleArt value={log?.weightKg != null ? String(log.weightKg) : undefined} className={visualSize} />,
    },
    {
      label: "Hydration",
      value: water != null ? `${(water / 1000).toFixed(1)} / ${(WATER_GOAL_ML / 1000).toFixed(1)}L` : NOT_LOGGED,
      description: water != null ? "Daily goal" : TAP_TO_LOG,
      badge: water != null ? { text: `${Math.min(100, Math.round((water / WATER_GOAL_ML) * 100))}%`, className: "bg-[#CFFAFE] text-[#0E7490]" } : undefined,
      accent: "bg-[#CFFAFE] text-[#0891B2]",
      visual: <WaterGlassArt fill={water != null ? water / WATER_GOAL_ML : 0} className={visualSize} />,
    },
    {
      label: "Fatigue Level",
      value: log?.fatigue ? (log.fatigue === "None" ? "No Fatigue" : `${log.fatigue} Fatigue`) : NOT_LOGGED,
      description: log?.fatigue ? "How tired you felt" : TAP_TO_LOG,
      accent: "bg-[#FEF9C3] text-[#CA8A04]",
      visual: <FatigueBattery value={log?.fatigue ?? null} className="h-[clamp(50px,4.2vw,72px)]" />,
    },
    {
      label: "Sleep Quality",
      value: log?.sleep ?? NOT_LOGGED,
      description: log?.sleep ? "Last night" : TAP_TO_LOG,
      accent: "bg-[#E0E7FF] text-[#4F46E5]",
      visual: <Emoji symbol={log?.sleep ? SLEEP_EMOJI[log.sleep] : "😴"} label="Sleep" className={`${emojiSize} ${log?.sleep ? "" : "opacity-40"}`} />,
    },
    {
      label: "Daily Activity",
      value: steps != null ? `${steps.toLocaleString("en-US")} steps` : NOT_LOGGED,
      description: steps != null ? `${Math.round((steps / STEP_GOAL) * 100)}% of ${STEP_GOAL.toLocaleString("en-US")} step goal` : TAP_TO_LOG,
      accent: "bg-[#DCFCE7] text-[#16A34A]",
      visual: <Emoji symbol="👟" label="Activity" className={`${emojiSize} ${steps != null ? "" : "opacity-40"}`} />,
    },
    {
      label: "Energy Level",
      value: log?.energy ? `${log.energy} Energy` : NOT_LOGGED,
      description: log?.energy ? "How your energy felt" : TAP_TO_LOG,
      accent: "bg-[#FFEDD5] text-[#EA580C]",
      visual: (
        <span className={`${visualSize} flex aspect-square items-center justify-center rounded-full bg-[#FFF7ED]`}>
          <EnergyBolt value={log?.energy ?? null} />
        </span>
      ),
    },
    {
      label: "Cravings",
      value: log?.cravings ?? NOT_LOGGED,
      description: log?.cravings ? "Cravings today" : TAP_TO_LOG,
      accent: "bg-[#ECFCCB] text-[#65A30D]",
      visual: <Emoji symbol={log?.cravings ? CRAVING_EMOJI[log.cravings] : "🧁"} label="Cravings" className={`${emojiSize} ${log?.cravings ? "" : "opacity-40"}`} />,
    },
  ];

  return (
    <div className="flex flex-col gap-lu-grid">
      <div className="grid grid-cols-1 gap-lu-grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <LutealStatusCard cycleDay={state.cycleDay} cycleLength={state.cycleProfile.medianCycleLength} hasInsight={insight.data?.status === "ready"} onAskAva={onAskAva} />
        <LutealBanner onLogPeriod={() => setLogOpen(true)} onViewTips={() => setTipsOpen(true)} />
      </div>

      <div className="grid grid-cols-1 gap-lu-grid sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => <MetricCard key={m.label} {...m} onOpen={openLog} />)}
      </div>

      <div className="grid grid-cols-1 gap-lu-grid md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={<SymptomArt className="size-full" />} title="Today's Symptoms" dateLabel={dateLabel} accent="bg-lu-brand-soft text-lu-brand-strong" arrowLabel="Open symptom tracking in Daily Log" onOpen={openLog}>
          {!symptomsLogged ? (
            <NotLogged what="symptom log" />
          ) : (
            <div className="flex flex-col gap-2.5">
              {symptomItems.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Logged symptoms">
                  {symptomItems.map((s) => (
                    <li key={s} className="rounded-full bg-lu-brand-soft px-2.5 py-1 text-lu-caption font-semibold text-lu-brand-strong">{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-lu-label text-lu-ink-muted">No specific symptoms selected.</p>
              )}
              {severity !== null && (
                <div className="flex items-center gap-3">
                  <span className="text-lu-label text-lu-ink-soft">Severity <span className="font-semibold text-lu-ink">{severity}/10</span></span>
                  <span className="h-1.5 max-w-[160px] flex-1 overflow-hidden rounded-full bg-lu-brand-soft" aria-hidden="true">
                    <span className="block h-full rounded-full bg-lu-brand-strong" style={{ width: `${severity * 10}%` }} />
                  </span>
                </div>
              )}
            </div>
          )}
        </SummaryCard>

        <SummaryCard icon={<IntimacyArt className="size-full" />} title="Intercourse" dateLabel={dateLabel} accent="bg-[#FFE4E6] text-[#E11D48]" arrowLabel="Open intercourse log in Daily Log" onOpen={openLog}>
          {log?.intercourse == null && <NotLogged what="intercourse entry" />}
          {log?.intercourse === false && <p className="text-[clamp(1rem,1.2vw,1.2rem)] font-bold leading-tight text-lu-ink">No</p>}
          {log?.intercourse === true && (
            <div>
              <p className="text-[clamp(1rem,1.2vw,1.2rem)] font-bold leading-tight text-lu-ink">Yes</p>
              <p className="text-lu-label text-lu-ink-soft">Protection: <span className="font-semibold text-lu-ink">{protection ?? "Not specified"}</span></p>
            </div>
          )}
        </SummaryCard>

        <MedicationScoreCard day={day} onOpen={openLog} className="md:col-span-2 xl:col-span-1" />
      </div>

      <AIRecommendation insight={insight.data?.insight ?? null} loading={insight.status === "loading"} onAskAva={onAskAva} />
      <CycleInsights nextPeriodText={nextPeriodText} onViewDetails={onOpenTrends} />

      <InfoCard variant="disclaimer">Estimates are based on your logged cycles and are not a diagnosis or a method of contraception.</InfoCard>

      {tipsOpen && <PhaseTipsModal phaseLabel="Luteal" day={day} onClose={() => setTipsOpen(false)} />}

      {logOpen && (
        <LogPeriodModal
          onClose={() => setLogOpen(false)}
          onSaved={() => {
            setLogOpen(false);
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}