import { useCallback, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Droplet,
  Heart,
  Info,
  LockKeyhole,
  Smile,
  Sparkles,
  TestTube,
  Thermometer,
  Zap,
} from "lucide-react";
import statusBg from "../../assets/phases/ovulation/phase_status_bg.webp";
import infoBg from "../../assets/phases/ovulation/phase_info_bg.webp";
import cheering from "../../assets/phases/follicular/woman_cheering.png";

import bbtArt from "../../assets/phases/irregular/bbt.png";
import mucusArt from "../../assets/phases/irregular/cervical mucus.png";
import lhArt from "../../assets/phases/irregular/lh test.png";
import libidoArt from "../../assets/phases/irregular/libido.png";
import moodArt from "../../assets/phases/irregular/mood.png";
import symptomsArt from "../../assets/phases/irregular/symptoms1.png";
import intercourseArt from "../../assets/phases/irregular/intercourse1.png";
import hydrationArt from "../../assets/phases/irregular/hydration.png";
import energyArt from "../../assets/phases/irregular/energy1.png";

import { useAsync } from "../../hooks/useAsync";
import { addDays } from "../../lib/isoDate";
import type { CycleState } from "../../services/cycle";
import { getPhaseInsight } from "../../services/insights";
import { getDailyLog, getLogRange, type DailyLog } from "../../services/logs";
import { AIRecommendation, MedicationScoreCard } from "../phases/luteal/components/OverviewSections";
import { card } from "../phases/shared";
import { CardWave } from "../../Elements/CardWave/CardWave";
import { RING_BOX, StatusBackdrop } from "../phases/shared/ui/PhaseStatusCard";
import { PhaseMilestones } from "../phases/shared/ui/PhaseMilestones";

/** Same zone / fade the other phase status cards use, so the droplet never runs behind the timeline. */
const TIMELINE_ZONE = "clamp(88px,7.6vw,104px)";
const ART_MASK = "linear-gradient(to right, transparent, #000 20%), linear-gradient(to bottom, #000 92%, transparent)";

interface OverviewProps {
  /** Normalized cycle state: phase is "unknown" and phaseState is "needs_data" when this screen shows. */
  state: CycleState;
  onLogPeriod: () => void;
  onAddCycleInfo: () => void;
  onOpenDailyLog: () => void;
  onAskAva?: () => void;
}

/* ───────── copy (the backend only sends reason codes) ───────── */

type Reason = NonNullable<CycleState["needsDataReason"]>;

const REASON_COPY: Record<Reason, { title: string; text: string }> = {
  no_period_logged: {
    title: "Not determined yet",
    text: "We don’t have a logged period to work from yet, so we can’t predict your phase. Log your last period and keep a daily log to get started.",
  },
  long_gap_irregular: {
    title: "Not determined yet",
    text: "Your cycles vary and it has been a while since your last logged period, so we can’t reliably place your phase. Log your period when it starts, and keep logging daily so we can learn your pattern.",
  },
  phase_unknown: {
    title: "Not determined yet",
    text: "Since your period history is limited, we can’t predict your current phase. The more you log, the smarter and more personal your insights will be!",
  },
};

const FALLBACK_REASON: Reason = "phase_unknown";

/* ───────── signal cards (real values from today's daily log) ───────── */

interface SignalDef {
  id: string;
  title: string;
  icon: ReactNode;
  iconClass: string;
  image: string;
  /** Optional signals open an info dialog first when nothing is logged yet. */
  optional?: boolean;
  description?: string;
  value: (log: DailyLog | null) => string | null;
}

const OPTIONAL_SIGNALS: SignalDef[] = [
  {
    id: "bbt",
    title: "BBT",
    icon: <Thermometer className="size-4" />,
    iconClass: "bg-[#EEF4FF] text-[#6F8FFF]",
    image: bbtArt,
    optional: true,
    description:
      "Basal body temperature can give useful insights about your cycle. Add your daily reading to help us understand your cycle over time.",
    value: (l) => (l?.bbtCelsius != null ? `${l.bbtCelsius.toFixed(2)}°C` : null),
  },
  {
    id: "mucus",
    title: "Cervical mucus",
    icon: <Droplet className="size-4" />,
    iconClass: "bg-[#FFF0F7] text-[#F43F8F]",
    image: mucusArt,
    optional: true,
    description:
      "Tracking cervical mucus can help you notice changes throughout your cycle and better understand your fertile signs.",
    value: (l) => l?.cervicalMucus ?? null,
  },
  {
    id: "lh",
    title: "LH Ovulation Test",
    icon: <TestTube className="size-4" />,
    iconClass: "bg-[#EEF9FF] text-[#55A9E8]",
    image: lhArt,
    optional: true,
    description:
      "LH tests can help identify an LH surge and give you another useful signal when understanding your cycle.",
    value: (l) => l?.lhTest ?? null,
  },
  {
    id: "libido",
    title: "Libido",
    icon: <Heart className="size-4 fill-current" />,
    iconClass: "bg-[#FFF0F7] text-[#F43F8F]",
    image: libidoArt,
    optional: true,
    description: "Tracking libido can help you notice personal patterns and changes throughout your cycle.",
    value: (l) => l?.libido ?? null,
  },
];

const DAILY_SIGNALS: SignalDef[] = [
  {
    id: "mood",
    title: "Mood",
    icon: <Smile className="size-4" />,
    iconClass: "bg-[#FFF0F7] text-[#F43F8F]",
    image: moodArt,
    value: (l) => l?.mood ?? null,
  },
  {
    id: "symptoms",
    title: "Symptoms",
    icon: <Zap className="size-4" />,
    iconClass: "bg-[#FAF1FF] text-[#9B6BEE]",
    image: symptomsArt,
    value: (l) => {
      const n = (l?.symptoms.length ?? 0) + (l?.customSymptom?.trim() ? 1 : 0);
      return n > 0 ? `${n} logged` : null;
    },
  },
  {
    id: "sex",
    title: "Sex / Intercourse",
    icon: <Heart className="size-4" />,
    iconClass: "bg-[#FFF0F7] text-[#F43F8F]",
    image: intercourseArt,
    optional: true,
    description: "Logging intercourse can help you notice patterns and understand your fertile window over time.",
    value: (l) => (l?.intercourse == null ? null : l.intercourse ? "Yes" : "No"),
  },
  {
    id: "hydration",
    title: "Hydration",
    icon: <Droplet className="size-4" />,
    iconClass: "bg-[#EEF4FF] text-[#6F8FFF]",
    image: hydrationArt,
    value: (l) => (l?.waterMl ? `${l.waterMl} ml` : null),
  },
  {
    id: "energy",
    title: "Energy",
    icon: <Zap className="size-4" />,
    iconClass: "bg-[#FAF1FF] text-[#9B6BEE]",
    image: energyArt,
    value: (l) => l?.energy ?? null,
  },
];

function SignalCard({ def, value, locked, onClick }: { def: SignalDef; value: string | null; locked: boolean; onClick: () => void }) {
  const logged = value != null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative isolate min-h-[clamp(120px,8.5vw,148px)] overflow-hidden rounded-lu-card border border-lu-brand-line bg-white text-left shadow-lu-card transition hover:border-pink-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
    >
      <CardWave behind tone={["symptoms", "energy"].includes(def.id) ? "purple" : "pink"} />

      <div className="relative z-10 flex h-full min-h-[clamp(120px,8.5vw,148px)] flex-col p-lu-card">
        <div className="flex items-center gap-2">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${def.iconClass}`}>
            {def.icon}
          </span>
          <span className="min-w-0 truncate text-lu-label font-semibold text-lu-ink">{def.title}</span>
          {def.optional && (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FBF7FC] px-2.5 py-1 text-lu-caption font-medium text-lu-ink-muted">
              <LockKeyhole className="size-3" />
              Optional
            </span>
          )}
        </div>

        <span
          className={`mt-2 max-w-[62%] truncate ${
            logged ? "text-[clamp(1rem,1.2vw,1.2rem)] font-bold leading-tight text-lu-ink" : "text-lu-caption text-lu-ink-muted"
          }`}
        >
          {logged ? value : "Not logged"}
        </span>

        <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[#FFF0F7] px-4 py-2 text-lu-caption font-semibold text-[#F43F8F]">
          {logged ? "Update" : locked ? "Enable" : "Add today"}
          <ChevronRight className="size-3.5" />
        </span>
      </div>

      <img
        src={def.image}
        alt=""
        className="pointer-events-none absolute bottom-0 right-1 z-[1] h-auto max-h-[72%] w-[38%] max-w-[145px] object-contain object-right-bottom transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </button>
  );
}

function TrackingInfoModal({
  def,
  onClose,
  onAddToday,
}: {
  def: SignalDef;
  onClose: () => void;
  onAddToday: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#29315A]/35 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracking-info-title"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[390px] overflow-y-auto rounded-[24px] border border-[#F0DDEA] bg-white px-6 pb-6 pt-7 shadow-[0_24px_70px_rgba(55,34,79,0.22)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-[#7D87A8] hover:bg-[#FFF3F8]"
        >
          ×
        </button>

        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#EEF4FF] text-[#6F8FFF]">
          {def.icon}
        </div>

        <h2 id="tracking-info-title" className="mt-4 text-center text-lu-title font-semibold text-lu-ink">
          Track your {def.title}
        </h2>

        <p className="mx-auto mt-3 max-w-[310px] text-center text-lu-body text-lu-ink-muted">
          {def.description}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAddToday}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#F43F8F] text-[13px] font-semibold text-white transition hover:bg-[#E8327F]"
          >
            Enable and add today
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-[#F1D5E5] bg-white text-[13px] font-semibold text-[#314675] hover:bg-[#FFF8FB]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ───────── top row ───────── */

function CycleStatusCard({ reason, hasInsight }: { reason: Reason; hasInsight: boolean }) {
  const copy = REASON_COPY[reason];
  const uid = useId().replace(/:/g, "");
  const track = `ringTrack${uid}`;
  return (
    <section
      aria-label="Cycle phase not determined yet"
      className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-b from-[#F4DEFA] via-[#F9E4F8] to-[#FFEEF7] p-5 pt-[clamp(20px,2.4vw,36px)] shadow-[0_8px_32px_rgba(244,63,143,0.07)] sm:p-6 sm:pt-[clamp(20px,2.4vw,36px)] lg:min-h-[clamp(160px,14.7vw,230px)]"
    >
      <StatusBackdrop />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 select-none bg-cover bg-no-repeat bg-[position:100%_100%]"
        style={{
          height: `calc(100% - ${TIMELINE_ZONE})`,
          backgroundImage: `url(${statusBg})`,
          WebkitMaskImage: ART_MASK,
          maskImage: ART_MASK,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      />

      <div className="relative z-10 flex items-stretch gap-3 sm:gap-4">
        <div className={`${RING_BOX} self-center`}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F43F8F] via-[#E879F9] to-[#8B5CF6] opacity-35 blur-xl" aria-hidden="true" />
          <div className="absolute inset-[8px] rounded-full bg-gradient-to-br from-white/95 via-pink-50/75 to-purple-100/60 shadow-[inset_0_0_15px_rgba(244,63,143,0.12)]" aria-hidden="true" />

          <svg className="relative size-full select-none drop-shadow-[0_4px_16px_rgba(244,63,143,0.3)]" viewBox="0 0 140 140" role="img" aria-label="Cycle phase not determined yet">
            <defs>
              <linearGradient id={track} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FCE7F3" />
                <stop offset="50%" stopColor="#F5E8FF" />
                <stop offset="100%" stopColor="#EDE9FE" />
              </linearGradient>
            </defs>
            <circle cx="70" cy="70" r="54" stroke={`url(#${track})`} strokeWidth="11" fill="none" />
          </svg>

          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex select-none flex-col items-center justify-center text-center">
            <span className="absolute right-[22%] top-[20%] animate-pulse text-[10px] text-pink-300">✦</span>
            <span className="absolute bottom-[22%] left-[22%] animate-pulse text-[9px] text-purple-300">✦</span>
            <Heart className="size-3.5 fill-[#F43F8F] text-[#F43F8F]" />
            <span className="mt-1 text-[clamp(0.5rem,0.55vw,0.6rem)] font-bold uppercase tracking-[0.14em] text-[#17152B]">Your cycle</span>
            <span className="mt-0.5 text-[clamp(0.6rem,0.65vw,0.7rem)] font-semibold leading-tight text-[#17152B]">Not determined</span>
            <span className="text-[clamp(0.6rem,0.65vw,0.7rem)] font-semibold leading-tight text-[#17152B]">yet</span>
          </div>
        </div>

        <div className="min-w-0 self-start">
          <h2 className="text-[clamp(1rem,1.3vw,1.3rem)] font-black leading-tight tracking-tight text-[#17152B]">{copy.title}</h2>
          <div className="mt-2 flex items-center gap-2 text-lu-label font-semibold text-lu-ink">
            <Sparkles className="size-4 text-[#8C62EF]" />
            Cycle phase
          </div>
          {hasInsight && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFF7E0] px-3 py-0.5 text-[11.5px] font-bold text-[#17152B] shadow-2xs sm:text-xs">
              <Sparkles className="size-3.5 text-[#F59E0B]" aria-hidden="true" />
              AI Summary Ready
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <PhaseMilestones active={null} />
      </div>
    </section>
  );
}

function CycleSetupBanner({
  onLogPeriod,
  onAddCycleInfo,
}: {
  onLogPeriod: () => void;
  onAddCycleInfo: () => void;
}) {
  return (
    <section className="relative flex min-h-[clamp(160px,14.7vw,230px)] items-center overflow-hidden rounded-[26px] border border-white/70 bg-[#FFF7FC] p-5 shadow-[0_8px_24px_rgba(236,72,153,0.14)] sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 select-none bg-cover bg-no-repeat bg-[position:100%_100%]"
        style={{ backgroundImage: `url(${infoBg})` }}
      />

      <img
        src={cheering}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-2 z-10 hidden h-[92%] max-h-[230px] w-auto select-none object-contain object-bottom min-[420px]:block"
      />

      <div className="relative z-10 max-w-[760px] min-[420px]:pr-[clamp(110px,16vw,240px)]">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF] text-[#8B5CF6]">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h2 className="text-[clamp(1rem,1.3vw,1.3rem)] font-semibold leading-tight text-[#17152B]">Let’s get to know your cycle</h2>
            <p className="mt-2 max-w-[540px] text-lu-body font-normal text-[#68708A]">
              Log your period and a few details to help us understand your cycle. Once we have enough data, you’ll
              get personalized insights, predictions and recommendations.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onLogPeriod}
            className="inline-flex items-center gap-2 rounded-full bg-[#F43F8F] px-4 py-1.5 text-[12px] font-semibold text-white shadow-2xs transition-all hover:bg-[#E02E7E] active:scale-95 sm:px-5 sm:py-2 sm:text-[13px]"
          >
            <CalendarDays className="size-4" />
            Log period
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={onAddCycleInfo}
            className="inline-flex items-center gap-2 rounded-full border border-[#E7CFE1] bg-white/60 px-4 py-1.5 text-[12px] font-semibold text-[#F43F8F] transition-all hover:bg-white/90 active:scale-95 sm:px-5 sm:py-2 sm:text-[13px]"
          >
            <Info className="size-4" />
            Add cycle information
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────── "help us learn your cycle" checklist ───────── */

const TARGET_PERIODS = 2; // the engine places a phase again once two periods are logged
const TARGET_LOG_DAYS = 7; // daily logs in the last 14 days

function Step({ done, title, note }: { done: boolean; title: string; note: string }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className="flex items-start gap-3 rounded-[18px] bg-[#FAF5FF] p-4">
      <Icon className={`mt-0.5 size-5 shrink-0 ${done ? "text-[#16A34A]" : "text-[#C4B5FD]"}`} aria-hidden="true" />
      <div className="min-w-0">
        <h3 className="text-lu-body font-semibold text-lu-ink">{title}</h3>
        <p className="mt-1 text-lu-label text-lu-ink-muted">{note}</p>
      </div>
    </li>
  );
}

function LearningProgress({ periods, logDays, signalDays }: { periods: number; logDays: number; signalDays: number }) {
  return (
    <section className={card} aria-labelledby="learning-progress-title">
      <header>
        <h2 id="learning-progress-title" className="flex items-center gap-2 text-lu-heading font-semibold text-lu-ink">
          <Sparkles className="size-[18px] text-[#8B5CF6]" /> Help us learn your cycle
        </h2>
        <p className="mt-0.5 text-lu-label text-lu-ink-muted">
          A few simple steps unlock your phase, predictions and personal insights.
        </p>
      </header>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        <Step
          done={periods >= TARGET_PERIODS}
          title="Log your periods"
          note={`${Math.min(periods, TARGET_PERIODS)} of ${TARGET_PERIODS} periods logged. Add the first day of each period you remember.`}
        />
        <Step
          done={logDays >= TARGET_LOG_DAYS}
          title="Keep a daily log"
          note={`${Math.min(logDays, TARGET_LOG_DAYS)} of ${TARGET_LOG_DAYS} days logged in the last 2 weeks. Mood, symptoms and energy are enough.`}
        />
        <Step
          done={signalDays > 0}
          title="Add LH or temperature (optional)"
          note={
            signalDays > 0
              ? `${signalDays} ${signalDays === 1 ? "day" : "days"} with an LH test or BBT reading logged.`
              : "These signals can show ovulation even when your periods are irregular."
          }
        />
      </ul>
    </section>
  );
}

/* ───────── screen ───────── */

export function Overview({ state, onLogPeriod, onAddCycleInfo, onOpenDailyLog, onAskAva }: OverviewProps) {
  const day = state.date;
  const [activeSignal, setActiveSignal] = useState<SignalDef | null>(null);

  const log = useAsync(useCallback((s: AbortSignal) => getDailyLog(day, s), [day]));
  const insight = useAsync(useCallback((s: AbortSignal) => getPhaseInsight(day, s), [day]));
  const recent = useAsync(useCallback((s: AbortSignal) => getLogRange(addDays(day, -13), day, s), [day]));

  const today = log.data ?? null;
  const recentLogs = recent.data?.logs ?? [];
  const signalDays = recentLogs.filter((l) => l.bbtCelsius != null || l.lhTest != null).length;
  const reason = state.needsDataReason ?? FALLBACK_REASON;
  // sampleSize counts observed cycle lengths, which is one less than the number of logged periods.
  const periodsLogged = state.period ? state.cycleProfile.sampleSize + 1 : 0;

  // An optional signal counts as enabled once the user has logged it in the last 2 weeks.
  const isEnabled = (def: SignalDef) => def.value(today) != null || recentLogs.some((l) => def.value(l) != null);

  const openSignal = (def: SignalDef) => {
    if (def.optional && !isEnabled(def)) setActiveSignal(def);
    else onOpenDailyLog();
  };

  return (
    <>
      <div className="flex flex-col gap-lu-grid">
        <div className="grid grid-cols-1 gap-lu-grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <CycleStatusCard reason={reason} hasInsight={insight.data?.status === "ready"} />
          <CycleSetupBanner onLogPeriod={onLogPeriod} onAddCycleInfo={onAddCycleInfo} />
        </div>

        <section>
          <h2 className="text-lu-heading font-semibold text-lu-ink">Track your cycle signals</h2>
          <p className="mt-1 text-lu-label text-lu-ink-muted">
            These details help us understand your cycle over time. You can log them anytime, whenever you want.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {OPTIONAL_SIGNALS.map((def) => {
            const value = def.value(today);
            return <SignalCard key={def.id} def={def} value={value} locked={def.optional === true && !isEnabled(def)} onClick={() => openSignal(def)} />;
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DAILY_SIGNALS.map((def) => {
            const value = def.value(today);
            return <SignalCard key={def.id} def={def} value={value} locked={def.optional === true && !isEnabled(def)} onClick={() => openSignal(def)} />;
          })}
          <MedicationScoreCard day={day} onOpen={onOpenDailyLog} />
        </div>

        <AIRecommendation
          insight={insight.data?.insight ?? null}
          loading={insight.status === "loading"}
          onAskAva={onAskAva}
        />

        <LearningProgress
          periods={periodsLogged}
          logDays={recentLogs.length}
          signalDays={signalDays}
        />
      </div>

      {activeSignal && (
        <TrackingInfoModal
          def={activeSignal}
          onClose={() => setActiveSignal(null)}
          onAddToday={() => {
            setActiveSignal(null);
            onOpenDailyLog();
          }}
        />
      )}
    </>
  );
}