import { Brain, CircleCheck, Smile, Sparkles, Zap } from "lucide-react";
import { useCallback, useId, useState } from "react";
import illustration from "../../../assets/phases/ovulation-illustration.png";
import bannerBg from "../../../assets/phases/ovulation/period-banner-bg.webp";
import statusBg from "../../../assets/phases/ovulation/status-card-bg.webp";
import { useAsync } from "../../../hooks/useAsync";
import { getPhaseInsight } from "../../../services/insights";
import { getDailyLog } from "../../../services/logs";
import { fmtDate } from "../../dashboard/phases";
import type { PhaseViewProps } from "../types";
import { PhaseTipsModal } from "../shared/ui/PhaseTipsModal";
import { MedicationScoreCard } from "../shared/ui/MedicationScoreCard";
import { ENERGY_LEVEL, MOOD_LEVEL } from "./fertility";
import { OVULATION_COPY, WELLNESS_GROUPS } from "./ovulationContent";
import { PhaseMilestones } from "../shared/ui/PhaseMilestones";
import { PhaseStatusCard } from "../shared/ui/PhaseStatusCard";
const SEGMENTS = 7;
import { CardWave } from "../../../Elements/CardWave/CardWave";

/** Type scale of the ovulation-normal design (px values are the 1440px sizes, easing down to 375px). */
const OV = {
  heading: "text-[length:clamp(1.125rem,1.0370rem_+_0.3756vw,1.375rem)]",
  title: "text-[length:clamp(1.0625rem,1.0075rem_+_0.2347vw,1.21875rem)]",
  body: "text-[length:clamp(0.96875rem,0.8917rem_+_0.3286vw,1.1875rem)]",
  card: "text-[length:clamp(1rem,0.9670rem_+_0.1408vw,1.09375rem)]",
  list: "text-[length:clamp(0.9375rem,0.9155rem_+_0.0939vw,1rem)]",
  cycleDay: "text-[length:clamp(1.25rem,0.95rem_+_0.75vw,1.5rem)]",
  cycleLabel: "text-[length:clamp(0.625rem,0.55rem_+_0.25vw,0.71875rem)]",
  status: "text-[length:clamp(0.6875rem,0.6rem_+_0.2vw,0.8125rem)]",
} as const;
/** Smaller scale for the sections below the top cards (same sizes as the follicular overview). */
const SEC = {
  heading: "text-[length:clamp(1rem,0.9rem_+_0.45vw,1.3rem)]",
  title: "text-[length:clamp(0.9rem,1vw,1.05rem)]",
  body: "text-[length:clamp(0.8rem,0.74rem_+_0.2vw,0.9375rem)]",
  list: "text-[length:clamp(0.78rem,0.72rem_+_0.18vw,0.9rem)]",
  status: "text-[length:clamp(0.6875rem,0.66rem_+_0.1vw,0.75rem)]",
} as const;
const inset = "min-w-0 rounded-[24px] border-2 border-[#FBE6F1] bg-white shadow-[0px_6px_18px_-10px_rgba(236,72,153,0.16)]";

function Badge({ icon: Icon, tone }: { icon: typeof Zap; tone: string }) {
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full lg:size-11 ${tone}`} aria-hidden="true">
      <Icon className="size-5 lg:size-[22px]" strokeWidth={1.75} />
    </span>
  );
}

function LevelCard({ title, icon, tone, fill, value, level, note, onOpen }: { title: string; icon: typeof Zap; tone: string; fill: string; value: string | null; level: number; note: string; onOpen: () => void }) {
  return (
    <section className={`${inset} relative isolate px-[clamp(1rem,1.4vw,1.25rem)] pb-5 pt-5 lg:pb-[18px] lg:pt-[25px]`} aria-label={title}>
      <CardWave behind />
      <div className="flex items-center gap-2.5">
        <Badge icon={icon} tone={tone} />
        <h3 className={`${SEC.title} font-bold leading-tight text-lu-ink`}>{title}</h3>
      </div>
      <p className={`mt-[11px] ${SEC.title} font-semibold leading-[1.3] text-lu-ink`}>{value ?? "Not logged"}</p>
      <div role="img" aria-label={`${title}: ${value ?? "not logged"}, ${level} of ${SEGMENTS}`} className="mt-2 flex items-center gap-[5px]">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={`h-[15px] w-[17px] rounded-[4px] ${i < level ? fill : "bg-[#F1E3ED]"}`} />
        ))}
      </div>
      <p className={`mt-2.5 max-w-[330px] ${SEC.body} leading-[1.45] text-[#5E566F]`}>{note}</p>
      {!value && (
        <button type="button" onClick={onOpen} className={`mt-2 ${SEC.status} font-semibold text-lu-brand-strong hover:underline`}>
          Log it in Daily Log
        </button>
      )}
    </section>
  );
}

const TIMELINE = ["Period", "Follicular", "Ovulation", "Luteal"] as const;
const ACTIVE_STOP = 2; // this screen is always the ovulation phase
const RING_RADIUS = 63.5;
const RING_STROKE = 15;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Status card with the soft pink artwork background. Also used by OvulationFertility (TTC / prevention). */
export function OvulationStatusCard({ cycleDay, cycleLength, hasInsight, onOpenSummary }: { cycleDay: number | null; cycleLength: number | null; hasInsight: boolean; onOpenSummary?: () => void }) {
  const progress = cycleDay && cycleLength ? Math.min(Math.max(cycleDay / cycleLength, 0), 1) : 0;
  return <PhaseStatusCard stage={2} title="Ovulation Phase" cycleDay={cycleDay} progress={progress} hasInsight={hasInsight} onAskAva={onOpenSummary} />;
}
/** Phase banner with the pink petal artwork behind it. Also used by OvulationFertility (TTC / prevention). */
export function OvulationBanner({ heading, description, onViewTips, onLogPeriod }: { heading: string; description: string; onViewTips: () => void; onLogPeriod: () => void }) {
  return (
    <section
      aria-labelledby="ovulation-banner-title"
      className="flex min-w-0 flex-col-reverse items-start justify-between gap-3 overflow-hidden rounded-[28px] border border-white/70 bg-cover bg-[position:right_center] bg-no-repeat py-5 pl-[clamp(1rem,1.75vw,1.5625rem)] pr-3 shadow-[0px_10px_30px_-14px_rgba(180,80,200,0.35)] sm:flex-row sm:items-center sm:gap-4 lg:min-h-[clamp(160px,14.7vw,230px)] lg:py-[9px]"
      style={{ backgroundImage: `url(${bannerBg})` }}
    >
      <div className="min-w-0 max-w-[520px] pr-1 sm:max-w-[58%]">
        <h2 id="ovulation-banner-title" className="text-[clamp(1rem,1.3vw,1.3rem)] font-bold leading-tight text-lu-ink">{heading}</h2>
        <p className="mt-3 max-w-[500px] text-[13.5px] leading-[23px] text-[#44546F] sm:max-w-none">{description}</p>
        <div className="mt-[15px] flex flex-wrap items-center gap-2">
          <button type="button" onClick={onViewTips} aria-haspopup="dialog" className="h-10 rounded-full bg-gradient-to-r from-[#F860AE] to-[#D048C0] px-5 text-[14px] font-medium text-white shadow-[0px_6px_14px_-6px_rgba(208,72,192,0.55)] transition hover:from-[#EC4D9F] hover:to-[#BF3BB0] active:scale-95">
            View Tips
          </button>
          <button type="button" onClick={onLogPeriod} aria-haspopup="dialog" className="h-10 rounded-full bg-white/70 px-5 text-[14px] font-medium text-[#EE4D9B] transition hover:bg-white active:scale-95">
            Log period
          </button>
        </div>
      </div>
      <img src={illustration} alt="" decoding="async" className="h-auto w-[clamp(7rem,12.25vw,11rem)] shrink-0 self-center object-contain mix-blend-multiply sm:self-auto" />
    </section>
  );
}

/** Default ovulation screen (journey: Track my cycle). Static education + the user's own logs + the stored AI insight. */
export function OvulationOverview({ state, onLogPeriod, onAskAva, onOpenDailyLog }: PhaseViewProps) {
  const day = state.date;
  const [tipsOpen, setTipsOpen] = useState(false);
  const log = useAsync(useCallback((s: AbortSignal) => getDailyLog(day, s), [day]));
  const insight = useAsync(useCallback((s: AbortSignal) => getPhaseInsight(day, s), [day]));
  const openLog = onOpenDailyLog ?? (() => {});
  const data = log.data;
  const ai = insight.data?.insight ?? null;

  return (
    <div className="flex flex-col gap-lu-grid">
      <div className="grid grid-cols-1 gap-lu-grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">        <OvulationStatusCard cycleDay={state.cycleDay} cycleLength={state.cycleProfile.medianCycleLength} hasInsight={insight.data?.status === "ready"} onOpenSummary={onAskAva} />
        <OvulationBanner heading={OVULATION_COPY.heroHeading} description={OVULATION_COPY.heroDescription} onViewTips={() => setTipsOpen(true)} onLogPeriod={onLogPeriod} />
      </div>

      <div className="flex flex-col gap-[15px] rounded-[28px] border border-[#F1EEFF] bg-white p-3 shadow-lu-card sm:p-4 lg:pb-[57px] lg:pl-8 lg:pr-[15px] lg:pt-[18px]">
        <section className={`${inset} flex flex-col justify-between gap-4 pb-5 pl-[clamp(1rem,1.6vw,1.4375rem)] pr-[clamp(1rem,1.5vw,1.375rem)] pt-5 md:flex-row md:items-start lg:pb-[18px] lg:pt-[30px]`} aria-labelledby="ovulation-summary">
          <div className="min-w-0 max-w-[760px]">
            <h2 id="ovulation-summary" className={`${SEC.heading} font-bold leading-[1.3] text-lu-ink`}>{OVULATION_COPY.heading}</h2>
            <p className={`mt-2.5 ${SEC.body} leading-[1.38] text-[#5E566F]`}>{OVULATION_COPY.description}</p>
            {state.ovulation && (
              <p className={`mt-2 ${SEC.status} font-semibold text-lu-brand-strong`}>Estimated ovulation: around {fmtDate(state.ovulation.date)}</p>
            )}
          </div>
          <p className={`inline-flex h-12 flex-shrink-0 items-center self-start whitespace-nowrap rounded-full bg-[#FFF4FA] px-5 ${SEC.body} font-semibold text-[#E0006A] lg:h-[60px] lg:px-[21px]`}>
            {OVULATION_COPY.encouragement}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-3 xl:grid-cols-4">
          <section className={`${inset} px-[clamp(1rem,1.4vw,1.25rem)] pb-5 pt-5 lg:pb-[18px] lg:pt-[25px]`} aria-label="Hormonal changes">
            <div className="flex items-center gap-2.5">
              <Badge icon={Sparkles} tone="bg-[#F4ECFF] text-[#873DE3]" />
              <h3 className={`${SEC.title} font-bold leading-tight text-lu-ink`}>Hormonal Changes</h3>
            </div>
            <p className={`mt-2.5 max-w-[280px] ${SEC.body} leading-[1.45] text-[#8A3FE6]`}>{OVULATION_COPY.hormones}</p>
          </section>
          <LevelCard title="Energy Level" icon={Zap} tone="bg-[#FFEED1] text-[#EA7100]" fill="bg-[#F2217E]" value={data?.energy ?? null} level={data?.energy ? ENERGY_LEVEL[data.energy] ?? 0 : 0} note={OVULATION_COPY.energyNote} onOpen={openLog} />
          <LevelCard title="Mood" icon={Smile} tone="bg-[#DCF9E5] text-[#00983B]" fill="bg-[#03A14A]" value={data?.mood ?? null} level={data?.mood ? MOOD_LEVEL[data.mood] ?? 0 : 0} note={OVULATION_COPY.moodNote} onOpen={openLog} />
          <MedicationScoreCard day={day} onOpen={openLog} className="lg:col-span-3 xl:col-span-1" />
        </div>

        <section id="ai-recommendation" tabIndex={-1} className={`${inset} flex items-start gap-[clamp(0.75rem,1.3vw,1.1875rem)] pb-5 pl-[clamp(1rem,1.75vw,1.5625rem)] pr-5 pt-5 outline-none lg:pb-[19px] lg:pt-6`} aria-labelledby="ovulation-ai">
          <Badge icon={Brain} tone="bg-[#F4ECFF] text-[#873DE3]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="ovulation-ai" className={`${SEC.heading} font-bold leading-[1.3] text-lu-ink`}>AI Insights</h3>
              {onAskAva && (
                <button type="button" onClick={onAskAva} aria-haspopup="dialog" className="rounded-full bg-[#F3E8FF] px-4 py-1.5 text-lu-label font-medium text-[#7E22CE] hover:bg-[#E9D5FF]">
                  Ask Ava
                </button>
              )}
            </div>
            <p className={`mt-[7px] ${SEC.body} leading-[1.47] text-[#5E566F]`}>
              {insight.status === "loading" ? "Preparing your insight…" : (ai?.summary ?? "Your AI insight isn't available right now.")}
            </p>
            {ai && ai.tips.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {ai.tips.map((tip) => (
                  <li key={tip} className="rounded-full bg-[#EDE9FE] px-3 py-1 text-lu-caption font-medium text-[#7C3AED]">{tip}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div id="ovulation-tips" className="grid scroll-mt-6 grid-cols-1 gap-[15px] lg:grid-cols-3">
          {WELLNESS_GROUPS.map(({ id, title, icon, tone, check, items }) => (
            <section key={id} className={`${inset} px-[clamp(1rem,1.4vw,1.25rem)] pb-5 pt-5 lg:pb-[18px] lg:pt-6`} aria-label={title}>
              <div className="flex items-center gap-2.5">
                <Badge icon={icon} tone={tone} />
                <h3 className={`${SEC.title} font-bold leading-tight text-lu-ink`}>{title}</h3>
              </div>
              <ul className="mt-2.5 max-w-[320px] space-y-[9.5px]">
                {items.map((tip) => (
                  <li key={tip} className={`flex items-start gap-[11px] ${SEC.list} leading-[1.28] text-[#5E566F]`}>
                    <CircleCheck className={`mt-px size-[18px] shrink-0 ${check}`} strokeWidth={2} aria-hidden="true" />
                    <span className="min-w-0">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {tipsOpen && <PhaseTipsModal phaseLabel="Ovulation" day={day} onClose={() => setTipsOpen(false)} />}
    </div>
  );
}