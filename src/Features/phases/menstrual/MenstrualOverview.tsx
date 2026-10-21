import { Activity, Calendar, Droplet, Droplets, Heart, Sparkles, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { useAsync } from "../../../hooks/useAsync";
import { useCycleHistory } from "../../../hooks/useCycleHistory";
import { getPhaseInsight } from "../../../services/insights";
import { localISODate } from "../../../services/cycle";
import { getDailyLog, SYMPTOMS } from "../../../services/logs";
import { InfoCard } from "../../../Elements/infoCard/InfoCard";
import nextPeriodImg from "../../../assets/phases/menstrual/3d/Kawaii Period Tracking Calendar.png";
import periodImg from "../../../assets/phases/menstrual/3d/periods tracker1.png";
import regularityImg from "../../../assets/phases/menstrual/3d/ai-prediction-3d.webp";
import crampsImg from "../../../assets/phases/menstrual/3d/cramps level1.png";
import flowImg from "../../../assets/phases/menstrual/3d/Glossy Kawaii Droplet Trio.png";
import symptomsImg from "../../../assets/phases/menstrual/3d/symptoms-3d.webp";
import intercourseImg from "../../../assets/phases/menstrual/3d/intercourse.png";

import { fmtDate } from "../../dashboard/phases";
import { days, span, predictionCopy } from "../shared";
import { PhaseTipsModal } from "../shared/ui/PhaseTipsModal";
import type { PhaseViewProps } from "../types";
import { MenstrualAIRecommendation } from "./components/MenstrualAIRecommendation";
import { MenstrualCycleInsights } from "./components/MenstrualCycleInsights";
import { MenstrualHeroCard } from "./components/MenstrualHeroCard";
import { MenstrualMetricCard, type MetricCardProps } from "./components/MenstrualMetricCard";
import { MenstrualPreviousCycles } from "./components/MenstrualPreviousCycles";
import { MenstrualStatusCard } from "./components/MenstrualStatusCard";
import { MenstrualWellnessCards, type WellnessCard } from "./components/MenstrualWellnessCards";
import { MedicationScoreCard } from "../luteal/components/OverviewSections";
import { Visual3DCalendar, Visual3DUterusQuestion } from "./components/VisualAssets3D";
import { MENSTRUAL_COPY, WELLNESS } from "./menstrualContent";

const ICON = "size-4 text-[#F43F8F]";
const NOT_LOGGED = "Not logged";
const IMG = "max-h-full max-w-full h-auto w-auto select-none object-contain drop-shadow-xs";



/** Plain-language notes shown under the logged value. */
const CRAMPS_NOTE: Record<string, string> = {
  None: "Great, no pain logged",
  Mild: "A little discomfort",
  Moderate: "Noticeable pain, rest if you can",
  Severe: "Strong pain, take extra rest",
};
const FLOW_NOTE: Record<string, string> = {
  Spotting: "Very light bleeding",
  Light: "Light bleeding",
  Medium: "Normal bleeding",
  Heavy: "Heavy bleeding",
};

const card3d = (src: string, box: string) => (
  <span className={`flex items-center justify-center ${box}`}>
    <img src={src} alt="" loading="lazy" className={IMG} />
  </span>
);

/** Icon + check colours per wellness card (same order as WELLNESS). */
const WELLNESS_TONE = [
  { iconClass: "text-[#F43F8F]", checkClass: "text-[#F43F8F]" },
  { iconClass: "text-[#3B82F6]", checkClass: "text-[#3B82F6]" },
  { iconClass: "text-[#16A34A]", checkClass: "text-[#16A34A]" },
];
const wellnessCards: WellnessCard[] = WELLNESS.map((w, i) => ({ ...w, ...WELLNESS_TONE[i % WELLNESS_TONE.length] }));

export function MenstrualOverview({ state, onLogPeriod, onAskAva, onOpenTrends, onOpenDailyLog }: PhaseViewProps) {
  const [tipsOpen, setTipsOpen] = useState(false);
  const history = useCycleHistory();
  const day = state.date;
  const isToday = day === localISODate();
  const dayWord = isToday ? "today" : "this day";

  const loadLog = useCallback((s: AbortSignal) => getDailyLog(day, s), [day]);
  const log = useAsync(loadLog).data;
  const loadInsight = useCallback((signal: AbortSignal) => getPhaseInsight(day, signal), [day]);
  const insight = useAsync(loadInsight);

  const { cycleProfile: profile, nextPeriod: next, period } = state;
  const periodLength = profile.typicalPeriodLength;
  const completed = (history.data ?? []).filter((p) => p.cycleLength !== null);
  const openLog = onOpenDailyLog ?? (() => {});
  const hasCycleData = state.cycleDay != null;

  // Non-breaking spaces keep the date range on one line
  const nextRange = next ? span(next.rangeStart, next.rangeEnd)?.replace(/ /g, "\u00A0") : null;
  const nextNote = !next
    ? "Log your period to see when the next one may start."
    : [
        state.isOverdue ? `Running ${days(state.overdueDays)} late` : `In about ${days(state.daysUntilNextPeriod ?? 0)}`,
        nextRange ? `Could start between ${nextRange}` : null,
      ]
        .filter(Boolean)
        .join("\n");

  const symptomLabels = (log?.symptoms ?? []).map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id);
  const clots = log?.clotsPresent ? (log.clotSize ? `${log.clotSize} clots` : "Clots present") : log?.clotsPresent === false ? "No clots" : null;
  const intercourse = log?.intercourse === true ? "Yes" : log?.intercourse === false ? "No" : NOT_LOGGED;

  const metrics: (MetricCardProps & { key: string })[] = [
    {
      key: "period",
      label: "Period Tracker",
      value: hasCycleData ? `Day ${state.cycleDay}` : NOT_LOGGED,
      description: period
        ? [
            `${period.type === "observed" ? "Ended" : "Ends"} ${fmtDate(period.end)}`,
            periodLength ? `Lasts ~${Math.round(periodLength)} days` : null,
          ]
            .filter(Boolean)
            .join("\n")
        : "Log your period to see how many days it has lasted.",
      icon: <Droplet className={ICON} />,
      visual: card3d(periodImg, "h-[84px] w-[110px] sm:h-[96px] sm:w-[140px]"),
      chevron: true,
      onOpen: openLog,
    },
    {
      key: "cramps",
      label: "Cramps Level",
      value: log?.cramps === "None" ? "No cramps" : (log?.cramps ?? NOT_LOGGED),
      description: log?.cramps ? (CRAMPS_NOTE[log.cramps] ?? `Logged ${dayWord}`) : `Tap to log your cramps ${dayWord}.`,
      icon: <Activity className={ICON} />,
      visual: card3d(crampsImg, "h-[88px] w-[90px] sm:h-[100px] sm:w-[120px]"),
      onOpen: openLog,
    },
    {
      key: "flow",
      label: "Blood Flow",
      value: log?.flow ?? NOT_LOGGED,
      description: log?.flow ? [FLOW_NOTE[log.flow], clots].filter(Boolean).join("\n") : "Tap to log how heavy your flow is.",
      icon: <Droplets className={ICON} />,
      visual: card3d(flowImg, "h-[80px] w-[80px] sm:h-[96px] sm:w-[96px]"),
      onOpen: openLog,
    },
    {
      key: "symptoms",
      label: "Symptoms",
      value: symptomLabels.length ? `${symptomLabels.length} ${symptomLabels.length === 1 ? "symptom" : "Symptoms"}` : NOT_LOGGED,
      description: symptomLabels.join(", ") || "Tap to log how you feel (cramps, tiredness, etc.).",
      icon: <Users className="size-4 text-[#8B5CF6]" />,
      iconClass: "bg-[#F3EEFF]",
      tone: "purple",
      visual: card3d(symptomsImg, "h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]"),
      onOpen: openLog,
    },
    {
      key: "intercourse",
      label: "Intercourse",
      value: intercourse,
      description: log?.intercourse != null ? (isToday ? "Logged for today" : `Logged for ${fmtDate(day)}`) : "Tap to log if you had intercourse.",
      icon: <Heart className={ICON} />,
      visual: card3d(intercourseImg, "h-[80px] w-[88px] sm:h-[96px] sm:w-[104px]"),
      onOpen: openLog,
    },
    {
      key: "next",
      label: "Next Period",
      value: next ? fmtDate(next.date) : "Not available",
      description: nextNote,
      icon: <Calendar className={ICON} />,
      visual: (
        <span className="flex h-[72px] w-[86px] items-center justify-center sm:h-[84px] sm:w-[104px] lg:h-[88px] lg:w-[108px]">
          <img src={nextPeriodImg} alt="" width={128} height={104} loading="lazy" className={IMG} />
        </span>
      ),
      onOpen: onOpenTrends,
    },
    {
      key: "prediction",
      label: "How we estimate",
      eyebrow: true,
      tone: "purple",
      value: next ? predictionCopy(state).title : "Not enough data yet",
      description: next ? predictionCopy(state).note : "Log a few periods to unlock predictions.",
      icon: <Sparkles className="size-4 text-[#8B5CF6]" />,
      visual: next ? (
        <span className="flex h-[72px] w-[88px] items-center justify-center sm:h-[80px] sm:w-[104px]">
          <img src={regularityImg} alt="" width={104} height={80} loading="lazy" className={IMG} />
        </span>
      ) : (
        <Visual3DUterusQuestion className="h-16 w-20 sm:h-20 sm:w-24" />
      ),
      onOpen: onOpenTrends,
    },
  ];
  const ORDER = ["next", "period", "cramps", "flow", "symptoms", "intercourse", "prediction"];
  const ordered = ORDER.map((k) => metrics.find((m) => m.key === k)!);
  return (
    <div className="flex w-full flex-col gap-4 sm:gap-5">
      <div className="grid w-full grid-cols-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,2fr)] lg:[&>*]:min-h-[clamp(160px,14.7vw,230px)]!">
  <MenstrualStatusCard cycleDay={state.cycleDay} periodLength={periodLength} hasInsight={insight.data?.status === "ready"} onAskAva={onAskAva} />
        <MenstrualHeroCard
          heading={MENSTRUAL_COPY.heading}
          description={MENSTRUAL_COPY.description}
          hasCycleData={hasCycleData}
          onViewTips={() => setTipsOpen(true)}
          onLogPeriod={onLogPeriod}
        />
      </div>

      <div aria-label={isToday ? "Today at a glance" : `${fmtDate(day)} at a glance`} role="group" className="w-full space-y-4 sm:space-y-5">
        <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {ordered.slice(0, 4).map(({ key, ...m }) => (
            <li key={key} className="flex">
              <MenstrualMetricCard {...m} />
            </li>
          ))}
        </ul>
        <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {ordered.slice(4).map(({ key, ...m }) => (
            <li key={key} className="flex">
              <MenstrualMetricCard {...m} />
            </li>
          ))}
          <li className="flex">
            <MedicationScoreCard halo day={day} onOpen={openLog} />
          </li>
        </ul>
      </div>

      <MenstrualCycleInsights energy={log?.energy ?? null} mood={log?.mood ?? null} hormones={state.hormones ?? null} periodLogged={log?.flow != null} />

      <MenstrualAIRecommendation insight={insight.data?.insight ?? null} loading={insight.status === "loading"} onAskAva={onAskAva} />
      <MenstrualWellnessCards cards={wellnessCards} />
      <MenstrualPreviousCycles status={history.status} cycles={completed} errorMessage={history.error?.message} onRetry={history.refetch} />

      <InfoCard variant="disclaimer">
        Estimates are based on your logged cycles and are not a diagnosis or a method of contraception. General wellness information, not medical advice.
      </InfoCard>

      {tipsOpen && <PhaseTipsModal phaseLabel="Menstrual" day={day} onClose={() => setTipsOpen(false)} />}
    </div>
  );
}