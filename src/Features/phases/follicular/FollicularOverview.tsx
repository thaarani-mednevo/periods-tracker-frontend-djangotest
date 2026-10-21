import { useCallback, useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Activity, Brain, ChevronRight, Droplet, Heart, Minus, TestTube, Thermometer, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { InfoCard } from "../../../Elements/infoCard/InfoCard";
import { CardWave } from "../../../Elements/CardWave/CardWave";
import { Icon3D } from "../../../Elements/icon3D/Icon3D";
import { useAsync } from "../../../hooks/useAsync";
import { addDays } from "../../../lib/isoDate";
import { getPhaseInsight, getPhaseMetrics, type MetricTone, type PhaseMetricsResponse } from "../../../services/insights";import { getDailyLog, getLogRange, MUCUS, SYMPTOMS, type DailyLog, type Energy, type Libido, type Mood, type Mucus } from "../../../services/logs";
import { AIRecommendation, MedicationScoreCard } from "../luteal/components/OverviewSections";
import { card } from "../shared";
import type { PhaseViewProps } from "../types";
import { PhaseTipsModal } from "../shared/ui/PhaseTipsModal";
import { FOLLICULAR_COPY, HORMONE, CARE_TIPS, WELLNESS, METRIC_CARDS, metricCardAria } from "./follicularContent";
import { PhaseMilestones } from "../shared/ui/PhaseMilestones";

import cheering from "../../../assets/phases/follicular/woman_cheering.png";
import mucusArt from "../../../assets/phases/follicular/cervical_mucus_fingers.png";
import lhArt from "../../../assets/phases/follicular/lh_test_device.png";
import statusBg from "../../../assets/phases/follicular/phase_status_bg.webp";
import infoBg from "../../../assets/phases/follicular/phase_info_bg.webp";
import libidoArt from "../../../assets/phases/follicular/libido_heart.png";
import symptomsArt from "../../../assets/phases/follicular/symptoms.png";
import intercourseArt from "../../../assets/phases/follicular/intercourse1.png";
import { PhaseStatusCard } from "../shared/ui/PhaseStatusCard";

const NOT_LOGGED = "Not logged";
const ADD_IN_LOG = "Add it in the Daily Log";

const CARD =
  "group relative isolate flex min-h-[clamp(120px,8.5vw,148px)] w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lu-card border border-lu-brand-line bg-white p-lu-card text-left shadow-lu-card transition-all hover:border-pink-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300";
const T_CARD_TITLE = "text-lu-label font-semibold text-lu-ink";
const T_METRIC = "text-lu-metric font-bold text-lu-ink";
const T_BODY = "text-lu-label text-lu-ink-muted";
const T_CAPTION = "text-lu-caption text-lu-ink-muted";
const TONE_TEXT: Record<MetricTone, string> = {
  positive: "text-[#059669]",
  neutral: "text-lu-ink-muted",
  info: "text-[#3B82F6]",
  warning: "text-[#B45309]",
};
const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
const T_NOTE_SOFT = "text-lu-label text-[#64739B]";
const TONE_PILL: Record<MetricTone, string> = {
  positive: "bg-[#DCFCE7] text-[#15803D]",
  neutral: "bg-[#F4F5F8] text-[#68708A]",
  info: "bg-[#EFF6FF] text-[#2563EB]",
  warning: "bg-[#FEF3C7] text-[#B45309]",
};


function openProps(onOpen: () => void, label: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick: onOpen,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    },
  };
}

function CardHeader({ icon, iconBg, title, trailing }: { icon: ReactNode; iconBg: string; title: string; trailing?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
      <span className={`truncate ${T_CARD_TITLE}`}>{title}</span>
      {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
    </div>
  );
}

/* ───────── BBT ring (ovulation card maari) ───────── */
const BBT_MIN_C = 35.5; // ring empty
const BBT_MAX_C = 37.5; // ring full

function BbtRing({ celsius }: { celsius: number | null }) {
  const gid = useId().replace(/:/g, "");
  const size = 88;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const logged = celsius != null && celsius > 0;
  const fraction = logged ? Math.min(1, Math.max(0, (celsius - BBT_MIN_C) / (BBT_MAX_C - BBT_MIN_C))) : 0;
  const fahrenheit = logged ? (celsius * 9) / 5 + 32 : null;

  return (
    <div
      className="pointer-events-none absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 select-none min-[420px]:block"
      style={{ width: size, height: size }}
      role="img"
      aria-label={logged ? `Basal body temperature ${celsius.toFixed(2)} °C` : "Basal body temperature not logged"}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#F43F8F" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="white" stroke="#F3E8F5" strokeWidth={stroke} />
        {fraction > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - fraction)}
            className="transition-all duration-500"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        <Thermometer className="mb-0.5 size-3 text-[#F43F8F]" strokeWidth={2.4} aria-hidden="true" />
        <span className="text-[15px] font-bold text-lu-ink">{fahrenheit != null ? `${fahrenheit.toFixed(2)}°F` : "0"}</span>
        <span className="text-[9px] font-medium text-[#8A93B2]">{logged ? `${celsius.toFixed(2)}°C` : "Not logged"}</span>
      </div>
    </div>
  );
}

interface MetricCardsProps {
  data: DailyLog | null | undefined;
  /** Derived text from the backend. Undefined while loading or if the request failed: cards then show only the logged values. */
  metrics: PhaseMetricsResponse | null | undefined;
  onOpen: () => void;
}

function FollicularMetricCards({ data, metrics, onOpen }: MetricCardsProps) {
  const bbt = data?.bbtCelsius ?? null;
  const mucus = data?.cervicalMucus ?? null;
  const lh = data?.lhTest ?? null;
  const libido = data?.libido ?? null;
  const bbtInfo = metrics?.bbt ?? null;
  const mucusInfo = metrics?.mucus ?? null;
  const lhInfo = metrics?.lh ?? null;
  const libidoInfo = metrics?.libido ?? null;
  const bbtNote = [bbtInfo?.note, data?.bbtTime ? `Measured ${data.bbtTime}.` : null].filter(Boolean).join(" ");
  const TrendIcon = bbtInfo?.trend ? TREND_ICON[bbtInfo.trend.direction] : null;

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-3 min-[560px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <div {...openProps(onOpen, metricCardAria(METRIC_CARDS.bbt.label))} className={CARD}>
        <CardWave behind />
        <CardHeader icon={<Thermometer className="size-3.5" strokeWidth={2.3} />} iconBg="bg-[#EFF6FF] text-[#3B82F6]" title={METRIC_CARDS.bbt.title} />

        <div className="relative z-10 mt-3 min-[420px]:max-w-[58%]">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className={T_METRIC}>{bbt != null ? `${bbt.toFixed(2)}°C` : NOT_LOGGED}</span>
            {bbtInfo?.trend && TrendIcon && (
              <span className={`inline-flex items-center gap-1 text-lu-caption font-semibold ${TONE_TEXT[bbtInfo.trend.tone]}`}>
                <TrendIcon className="size-3" strokeWidth={2.6} aria-hidden="true" />
                {bbtInfo.trend.label}
              </span>
            )}
            {bbtInfo?.status && (
              <span className={`inline-flex items-center self-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${TONE_PILL[bbtInfo.status.tone]}`}>
                {bbtInfo.status.label}
              </span>
            )}
          </div>
          <p className={`mt-2 ${T_CAPTION}`}>{bbt == null ? ADD_IN_LOG : bbtNote}</p>
        </div>
        

        <BbtRing celsius={bbt} />
      </div>

      <div {...openProps(onOpen, metricCardAria(METRIC_CARDS.mucus.label))} className={CARD}>
        <CardWave behind />
       <CardHeader
          icon={<Droplet className="size-3.5" strokeWidth={2.3} />}
          iconBg="bg-[#FFF0F6] text-[#F43F8F]"
          title={METRIC_CARDS.mucus.title}
          trailing={mucusInfo?.badge ? <span className="rounded-full bg-[#FFE4F1] px-2.5 py-0.5 text-[10px] font-semibold text-[#F43F8F]">{mucusInfo.badge}</span> : null}
        />
        <div className="relative z-10 mt-3 max-w-[64%]">
          <span className={`block ${T_METRIC}`}>{mucus ?? NOT_LOGGED}</span>
          <p className={`mt-1 ${T_CAPTION}`}>{mucus ? mucusInfo?.note : ADD_IN_LOG}</p>
        </div>
        <ul className="relative z-10 mt-auto flex max-w-[64%] flex-wrap gap-1.5 pt-3" aria-label="Cervical mucus scale">
          {MUCUS.map((step) => (
            <li
              key={step}
              aria-current={step === mucus ? "true" : undefined}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${step === mucus ? "bg-[#F43F8F] text-white" : "bg-[#F3F4F8] text-[#5B6478]"}`}
            >
              {step}
            </li>
          ))}
        </ul>
        <img
          src={mucusArt}
          alt=""
          className="pointer-events-none absolute bottom-0 right-0 h-auto max-h-[78%] w-[34%] max-w-[120px] select-none object-contain object-right-bottom"
        />
      </div>

      <div {...openProps(onOpen, metricCardAria(METRIC_CARDS.lh.label))} className={CARD}>
        <CardWave behind />
        <CardHeader icon={<TestTube className="size-3.5" strokeWidth={2.3} />} iconBg="bg-[#ECFEFF] text-[#06B6D4]" title={METRIC_CARDS.lh.title} />
        
        <div className="relative z-10 mt-3 max-w-[62%]">
          <span className={`block ${T_METRIC}`}>{lh ?? NOT_LOGGED}</span>
          <p className={`mt-1 ${lh ? T_NOTE_SOFT : T_BODY}`}>{lh ? lhInfo?.note : ADD_IN_LOG}</p>
        </div>
        <div className="relative z-10 mt-auto pt-3" aria-hidden="true">
          <div className="flex h-8 w-24 items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-3 sm:w-28">
            <span className="h-5 w-2 rounded-full bg-[#F43F8F]" />
            <span className="h-5 w-2 rounded-full bg-[#F43F8F]" style={{ opacity: lh ? lhInfo?.strength ?? 0 : 0 }} />
          </div>
        </div>
        <img
          src={lhArt}
          alt=""
          className="pointer-events-none absolute bottom-1 right-1 h-auto max-h-[88%] w-[34%] max-w-[120px] select-none object-contain object-right-bottom"
        />
      </div>

      <div {...openProps(onOpen, metricCardAria(METRIC_CARDS.libido.label))} className={CARD}>
        <CardWave behind />
        <CardHeader icon={<Heart className="size-3.5 fill-[#F43F8F]" strokeWidth={2.3} />} iconBg="bg-[#FFF0F6] text-[#F43F8F]" title={METRIC_CARDS.libido.title} />
        
        <div className="relative z-10 mt-3 max-w-[58%]">
          <span className={`block ${T_METRIC}`}>{libido ?? NOT_LOGGED}</span>
          <p className={`mt-1 ${libido ? T_NOTE_SOFT : T_BODY}`}>{libido ? libidoInfo?.note : ADD_IN_LOG}</p>
        </div>
        <img
          src={libidoArt}
          alt=""
          className="pointer-events-none absolute bottom-1 right-1 h-auto max-h-[80%] w-[42%] max-w-[150px] select-none object-contain object-right-bottom"
        />
      </div>
    </div>
  );
}
/* ───────── Symptoms + Intercourse log cards ───────── */
function FollicularLogCards({ data, day, onOpen }: { data: DailyLog | null | undefined; day: string; onOpen: () => void }) {
  const symptoms = (data?.symptoms ?? []).map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id);
  const severity = data?.painScore ?? null;
  const intercourse = data?.intercourse;
  const protection = data?.protection === "Other" ? data.notes?.trim() || "Other" : (data?.protection ?? null);
  const when = new Date(`${day}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const link = "mt-auto inline-flex items-center gap-1 pt-3 text-lu-caption font-semibold text-[#F43F8F]";

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div {...openProps(onOpen, "Symptoms. Open Daily Log to update")} className={CARD}>
        <CardWave behind tone="purple" />
        <CardHeader icon={<Activity className="size-3.5" strokeWidth={2.3} />} iconBg="bg-[#FFF0F6] text-[#F43F8F]" title="Symptoms" />
        <div className="relative z-10 flex min-w-0 max-w-[62%] flex-1 flex-col">
          <p className={`mt-1 ${T_CAPTION}`}>{when}</p>
          {symptoms.length > 0 ? (
            <>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Logged symptoms">
                {symptoms.map((s) => (
                  <li key={s} className="rounded-full bg-[#FFF0F6] px-2.5 py-1 text-lu-caption font-semibold text-[#F43F8F]">{s}</li>
                ))}
              </ul>
              {severity !== null && <p className={`mt-2 ${T_BODY}`}>Severity <span className="font-semibold text-lu-ink">{severity}/10</span></p>}
            </>
          ) : (
            <p className={`mt-3 ${T_METRIC}`}>No symptoms logged today</p>
          )}
          <span className={link}>View / Edit Log <ChevronRight className="size-3.5" aria-hidden="true" /></span>
        </div>
        <img
          src={symptomsArt}
          alt=""
          className="pointer-events-none absolute bottom-1 right-2 h-auto max-h-[85%] w-[34%] max-w-[170px] select-none object-contain object-right-bottom"
        />
      </div>

      <div {...openProps(onOpen, "Intercourse log. Open Daily Log to update")} className={CARD}>
        <CardWave behind />
        <CardHeader icon={<Heart className="size-3.5 fill-[#F43F8F]" strokeWidth={2.3} />} iconBg="bg-[#FFF0F6] text-[#F43F8F]" title="Intercourse Log" />
        <div className="relative z-10 flex min-w-0 max-w-[62%] flex-1 flex-col">
          <p className={`mt-1 ${T_CAPTION}`}>{when}</p>
          <p className={`mt-3 ${T_METRIC}`}>{intercourse == null ? NOT_LOGGED : intercourse ? "Yes" : "No"}</p>
          {intercourse === true && (
            <p className={`mt-1 ${T_BODY}`}>Protection: <span className="font-semibold text-lu-ink">{protection ?? "Not specified"}</span></p>
          )}
          <span className={link}>View / Edit Log <ChevronRight className="size-3.5" aria-hidden="true" /></span>
        </div>
        <img
          src={intercourseArt}
          alt=""
          className="pointer-events-none absolute bottom-4 right-2 h-auto max-h-[85%] w-[34%] max-w-[170px] select-none object-contain object-right-bottom"
        />
      </div>

      <MedicationScoreCard day={day} onOpen={onOpen} className="md:col-span-2 xl:col-span-1" />
    </div>
  );
}

/* ───────── Status card + banner (follicular design reference) ───────── */
const RING_SIZE = 160;
const RING_STROKE = 16;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;
const PINK = "#F43F8F";
const PURPLE = "#8B5CF6";

function FollicularStatusCard({ cycleDay, cycleLength, hasInsight }: { cycleDay: number | null; cycleLength: number | null; hasInsight: boolean }) {
  const length = cycleLength && cycleLength > 0 ? cycleLength : 28;
  const day = cycleDay ? Math.min(Math.max(cycleDay, 1), length) : null;
  const openSummary = () => {
    const el = document.getElementById("ai-recommendation");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    el?.focus({ preventScroll: true });
  };
  return <PhaseStatusCard stage={1} title="Follicular Phase" cycleDay={day} progress={day ? day / length : 0} hasInsight={hasInsight} onAskAva={openSummary} />;
}
function FollicularBanner({ onLogPeriod, onViewTips }: { onLogPeriod: () => void; onViewTips: () => void }) {
  return (
    <section className="relative flex h-full w-full min-w-0 items-stretch justify-between gap-3 overflow-hidden rounded-[26px] border border-white/70 pl-4 pt-4 shadow-[0_8px_24px_rgba(236,72,153,0.14)] sm:pl-5 sm:pt-5 lg:min-h-[clamp(160px,14.7vw,230px)] lg:pl-[clamp(1.25rem,2vw,2rem)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none bg-cover bg-no-repeat bg-[position:100%_100%]"
        style={{ backgroundImage: `url(${infoBg})` }}
      />
      <div className="z-10 flex min-w-0 flex-1 flex-col justify-center pb-4 sm:pb-5">
        <h2 className="mb-2 text-[clamp(1rem,1.3vw,1.3rem)] font-semibold leading-tight text-[#17152B]">{FOLLICULAR_COPY.heading}</h2>
        <p className="mb-4 max-w-[34rem] text-lu-body font-normal text-[#68708A] sm:max-w-[68%]">{FOLLICULAR_COPY.description}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onLogPeriod}
            aria-haspopup="dialog"
            className="rounded-full bg-[#F43F8F] px-4 py-1.5 text-[12px] font-semibold text-white shadow-2xs transition-all hover:bg-[#E02E7E] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-1 active:scale-95 sm:px-5 sm:py-2 sm:text-[13px]"
          >
            Log period
          </button>
          <button
            type="button"
            onClick={onViewTips}
            aria-haspopup="dialog"
            className="rounded-full bg-white/60 px-4 py-1.5 text-[12px] font-semibold text-[#F43F8F] transition-all hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-1 active:scale-95 sm:px-5 sm:py-2 sm:text-[13px]"
          >
            View Tips
          </button>
        </div>
      </div>
      <div className="pointer-events-none relative z-10 hidden w-[clamp(110px,18vw,260px)] max-w-[260px] shrink-0 select-none items-end justify-center pr-2 min-[420px]:flex">
        <img src={cheering} alt="" className="h-auto max-h-[230px] w-full object-contain object-bottom" />
      </div>
    </section>
  );
}

const MOOD_INSIGHT: Record<Mood, { title: string; desc: string }> = {
  Happy: { title: "Positive & Radiant", desc: "Rising estrogen can lift mood and motivation, which supports focus and social energy." },
  Calm: { title: "Calm & Centered", desc: "A steady mood today. Good for focused work and mindful routines." },
  Neutral: { title: "Balanced", desc: "Your body and mind feel stable today, supporting steady productivity and recovery." },
  Irritable: { title: "Feeling on edge", desc: "Hormone shifts can affect patience. Rest, movement and balanced meals may help." },
  Sad: { title: "Rest & Gentle Care", desc: "Hormone changes can affect emotional sensitivity. Warm food and self-care can help." },
};
const ENERGY_SEGMENTS: Record<Energy, number> = { High: 10, Moderate: 7, Low: 3 };
const MOOD_SEGMENTS: Record<Mood, number> = { Happy: 12, Calm: 10, Neutral: 7, Irritable: 4, Sad: 3 };
const ENERGY_TEXT: Record<Energy, string> = {
  High: "You logged plenty of energy. A good day for more active plans.",
  Moderate: "Your energy is steady. A good balance for productive focus.",
  Low: "Rest and restorative sleep can help your body recharge.",
};

/** How much each logged value says about the hormone (0..1). Only what the user actually logged is used. */
const MUCUS_LEVEL: Record<Mucus, number> = { Dry: 0.1, Sticky: 0.25, Creamy: 0.5, Watery: 0.75, "Egg white": 1 };
const LIBIDO_LEVEL: Record<Libido, number> = { Low: 0.2, Medium: 0.55, High: 0.9 };
const BBT_FULL_RISE_C = 0.4; // a rise of about 0.4°C over the cycle's earlier readings counts as a full progesterone effect

interface HormoneSignals { estrogen: number | null; progesterone: number | null }

/**
 * Estrogen: from today's cervical mucus and libido. Progesterone: from today's BBT against the average of
 * earlier BBT readings in this cycle (needs 3+). Anything not logged stays null and shows "Not logged".
 */
function hormoneSignals(today: DailyLog | null | undefined, earlier: DailyLog[]): HormoneSignals {
  const est = [today?.cervicalMucus ? MUCUS_LEVEL[today.cervicalMucus] : null, today?.libido ? LIBIDO_LEVEL[today.libido] : null].filter((v): v is number => v != null);
  const estrogen = est.length ? est.reduce((a, b) => a + b, 0) / est.length : null;

  const base = earlier.map((l) => l.bbtCelsius).filter((v): v is number => v != null && v > 0);
  let progesterone: number | null = null;
  if (today?.bbtCelsius != null && base.length >= 3) {
    const rise = today.bbtCelsius - base.reduce((a, b) => a + b, 0) / base.length;
    progesterone = Math.max(0, Math.min(1, rise / BBT_FULL_RISE_C));
  }
  return { estrogen, progesterone };
}

function FollicularCycleInsights({ energy, mood, hormone, signals }: { energy: Energy | null; mood: Mood | null; hormone: { title: string; text: string }; signals: HormoneSignals }) {
  const filled = energy ? ENERGY_SEGMENTS[energy] : 0;
  const moodFilled = mood ? MOOD_SEGMENTS[mood] : 0;
  const hormoneFilled = signals.estrogen == null ? 0 : Math.max(1, Math.round(signals.estrogen * 13));
  const moodInfo = mood ? MOOD_INSIGHT[mood] : { title: NOT_LOGGED, desc: "Log your mood in the Daily Log to see how it relates to your cycle." };
  const cardCls = "flex w-full min-w-0 flex-col rounded-[20px] bg-[#FFF8FB] p-4 sm:p-5";

  return (
    <section aria-labelledby="follicular-cycle-insights" className="flex w-full flex-col rounded-[22px] border border-[#F1DDE8]/70 bg-white p-4 text-left shadow-2xs sm:p-5">
      <div className="mb-4">
        <h3 id="follicular-cycle-insights" className="text-lu-heading font-semibold text-lu-ink">
          Cycle Insights
        </h3>
        <p className={`mt-0.5 ${T_BODY}`}>Based on your logged data and current cycle phase.</p>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:gap-3.5 md:grid-cols-3">
        <div className={cardCls}>
          <div>
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
              <Zap className="size-5" strokeWidth={2.3} />
            </div>
            <span className={`mb-0.5 block ${T_BODY}`}>Energy Level</span>
            <span className={`mb-2.5 block ${T_CARD_TITLE}`}>{energy ?? NOT_LOGGED}</span>
            <div className="mb-3 flex items-center gap-1" role="img" aria-label={`Energy ${energy ?? "not logged"}: ${filled} of 13`}>
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < filled ? "bg-[#F43F8F]" : "bg-[#FCE7F3]"}`} />
              ))}
            </div>
          </div>
          <p className={T_BODY}>{energy ? ENERGY_TEXT[energy] : "Log your energy level in the Daily Log to see this insight."}</p>
        </div>

        <div className={cardCls}>
          <div>
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
              <Brain className="size-5" strokeWidth={2.3} />
            </div>
            <span className={`mb-0.5 block ${T_BODY}`}>Body &amp; Mind</span>
            <span className={`mb-2.5 block ${T_CARD_TITLE}`}>{moodInfo.title}</span>
            <div className="mb-3 flex items-center gap-1" role="img" aria-label={`Mood ${mood ?? "not logged"}: ${moodFilled} of 13`}>
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < moodFilled ? "bg-[#F43F8F]" : "bg-[#FCE7F3]"}`} />
              ))}
            </div>
          </div>
          <p className={T_BODY}>{moodInfo.desc}</p>
        </div>

        <div className={cardCls}>
          <div>
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#FAF5FF] text-[#8B5CF6]">
              <Activity className="size-5" strokeWidth={2.3} />
            </div>
            <span className={`mb-0.5 block ${T_BODY}`}>Hormonal Changes</span>
            <span className={`mb-2.5 block ${T_CARD_TITLE}`}>{hormone.title}</span>
            <div className="mb-3 flex items-center gap-1" role="img" aria-label={`Estrogen ${signals.estrogen == null ? "not logged" : "level"}: ${hormoneFilled} of 13`}>
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < hormoneFilled ? "bg-[#F43F8F]" : "bg-[#FCE7F3]"}`} />
              ))}
            </div>
          </div>
          <p className={T_BODY}>{hormone.text}</p>
        </div>
      </div>
    </section>
  );
}

export function FollicularOverview({ state, onLogPeriod, onAskAva, onOpenDailyLog }: PhaseViewProps) {
  const day = state.date;
  const [tipsOpen, setTipsOpen] = useState(false);
  const log = useAsync(useCallback((s: AbortSignal) => getDailyLog(day, s), [day]));
 const insight = useAsync(useCallback((s: AbortSignal) => getPhaseInsight(day, s), [day]));
  const metrics = useAsync(useCallback((s: AbortSignal) => getPhaseMetrics(day, s), [day]));

  const data = log.data;
  const openLog = onOpenDailyLog ?? (() => {});
  // Earlier days of this cycle, only to compare today's BBT against.
  const cycleDay = state.cycleDay ?? 0;
  const cycleLogs = useAsync(
    useCallback(
      (s: AbortSignal) => (cycleDay > 3 ? getLogRange(addDays(day, -(cycleDay - 1)), addDays(day, -1), s) : Promise.resolve({ logs: [] as DailyLog[] })),
      [day, cycleDay],
    ),
  );
  const signals = hormoneSignals(data, cycleLogs.data?.logs ?? []);





  return (
    <div className="flex flex-col gap-lu-grid">
      <div className="grid grid-cols-1 gap-lu-grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <FollicularStatusCard
          cycleDay={state.cycleDay}
          cycleLength={state.cycleProfile.medianCycleLength}
          hasInsight={insight.data?.status === "ready"}
        />
        <FollicularBanner onLogPeriod={onLogPeriod} onViewTips={() => setTipsOpen(true)} />
      </div>

      <FollicularMetricCards data={data} metrics={metrics.data} onOpen={openLog} />

      <FollicularLogCards data={data} day={day} onOpen={openLog} />

      <AIRecommendation insight={insight.data?.insight ?? null} loading={insight.status === "loading"} onAskAva={onAskAva} />

      

      <FollicularCycleInsights energy={data?.energy ?? null} mood={data?.mood ?? null} hormone={HORMONE} signals={signals} />

      <section id="follicular-tips" className={card} aria-labelledby="follicular-tips-title">
        <header>
          <h2 id="follicular-tips-title" className="flex items-center gap-2 text-lu-heading font-semibold text-lu-ink">
            <Heart className="size-[18px] text-[#8B5CF6]" /> Follicular wellness tips
          </h2>
          <p className="mt-0.5 text-lu-label text-lu-ink-muted">Use these as general wellness prompts, not rules.</p>
        </header>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {CARE_TIPS.map(({ icon: TipIcon, title, text }) => (
            <li key={title} className="flex items-start gap-3 rounded-[18px] bg-[#FAF5FF] p-4">
              <Icon3D icon={TipIcon} size="sm" />
              <div className="min-w-0">
                <h3 className="text-lu-body font-semibold text-lu-ink">{title}</h3>
                <p className="mt-1 text-lu-label text-lu-ink-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ul className="grid gap-lu-grid md:grid-cols-3" aria-label="Follicular wellness">
        {WELLNESS.map(({ icon: TipIcon, title, items }) => (
          <li key={title} className={card}>
            <div className="flex items-center gap-3">
              <Icon3D icon={TipIcon} size="sm" />
              <h3 className="text-lu-body font-semibold text-lu-ink">{title}</h3>
            </div>
            <ul className="mt-4 grid gap-2 text-lu-label text-lu-ink-muted">
              {items.map((item) => <li key={item} className="flex gap-2"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#8B5CF6]" />{item}</li>)}
            </ul>
          </li>
        ))}
      </ul>

      <InfoCard variant="disclaimer">
        Estimates are based on your logged cycles and are not a diagnosis or a method of contraception. General wellness information, not medical advice.
      </InfoCard>

      {tipsOpen && <PhaseTipsModal phaseLabel="Follicular" day={day} onClose={() => setTipsOpen(false)} />}
    </div>
  );
}