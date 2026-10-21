import { useCallback, type KeyboardEvent } from "react";
import { Activity, CalendarDays, ChevronRight, Pill, Sparkles } from "lucide-react";
import illustration from "../../../../assets/phases/luteal-illustration.png";
import { fmtDate } from "../../../dashboard/phases";
import { getMedicationHistory, getMedications } from "../../../../services/logs";
import { CardWave } from "../../../../Elements/CardWave/CardWave";
import { useAsync } from "../../../../hooks/useAsync";
import { localISODate } from "../../../../services/cycle";
import type { PhaseInsight } from "../../../../services/insights";
import { ProgressRing } from "../../ProgressRing";
import { MED_ORDER, MED_SEG, MedicationRing, type MedSegKey } from "../../shared/ui/MedicationRing";
import { AvaAvatar } from "../../shared/ui/AvaAvatar";
import { Emoji } from "../../shared/ui/Emoji";
import { LUTEAL_COPY } from "../lutealContent";

export function CycleStatusCard({ cycleDay, cycleLength, hasInsight, title = "Luteal Phase", segments = 4, segmentColor, segmentTrack }: { cycleDay: number | null; cycleLength: number | null; hasInsight: boolean; title?: string; segments?: number; segmentColor?: string; segmentTrack?: string }) {
  const progress = cycleDay && cycleLength ? Math.min(cycleDay / cycleLength, 1) : 0;
  return (
    <section className="lu-card flex items-center gap-[clamp(14px,1.3vw,22px)] p-lu-card">
      <div className="w-[clamp(96px,7.5vw,132px)]">
        <ProgressRing value={progress} size={132} stroke={10} segments={segments} segmentColor={segmentColor} segmentTrack={segmentTrack}>
          <span className="text-lu-title font-bold text-lu-ink">{cycleDay ?? "–"}</span>
          <span className="mt-0.5 text-lu-caption font-medium uppercase tracking-[0.12em] text-lu-ink-muted">Cycle day</span>
        </ProgressRing>
      </div>
      <div className="min-w-0">
        <p className="text-lu-label font-medium uppercase tracking-[0.14em] text-lu-ink-muted">Status</p>
        <h2 className="mt-1.5 text-lu-heading font-semibold text-lu-ink">{title}</h2>
        {hasInsight && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lu-brand-soft px-3 py-1 text-lu-caption font-medium text-lu-brand-strong">
            <Sparkles className="size-3.5 text-[#F59E0B]" aria-hidden="true" />
            AI Summary Ready
          </span>
        )}
      </div>
    </section>
  );
}

export function PhaseCard({ onLogPeriod, onViewTips }: { onLogPeriod: () => void; onViewTips: () => void }) {
  return (
    <section className="lu-card relative flex items-center justify-between gap-4 overflow-hidden p-lu-card">
      <div className="min-w-0 max-w-[560px]">
        <h2 className="text-lu-heading font-semibold text-lu-ink">{LUTEAL_COPY.heading}</h2>
        <p className="mt-2.5 text-lu-body text-lu-ink-muted">{LUTEAL_COPY.description}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onLogPeriod}
            aria-haspopup="dialog"
            className="rounded-full bg-lu-brand-soft px-[clamp(16px,1.4vw,22px)] py-2.5 text-lu-label font-medium text-lu-brand-strong transition-colors hover:bg-[#FBCFE8]"
          >
            Log period
          </button>
          <button
            type="button"
            onClick={onViewTips}
            className="rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] px-[clamp(16px,1.4vw,22px)] py-2.5 text-lu-label font-medium text-white shadow-lu-glow transition-opacity hover:opacity-90"
          >
            View Tips
          </button>
        </div>
      </div>
      <img src={illustration} alt="" className="hidden w-[clamp(108px,9vw,150px)] shrink-0 object-contain sm:block" />
    </section>
  );
}

const CHIP_EMOJI = ["💧", "🚶‍♀️", "😴"];

/** Shows the stored AI insight (summary + tips). No insight means no hardcoded text. */
export function AIRecommendation({ insight, loading, onAskAva }: { insight: PhaseInsight | null; loading: boolean; onAskAva?: () => void }) {
  return (
    <section id="ai-recommendation" tabIndex={-1} aria-labelledby="ai-recommendation-title" className="lu-card scroll-mt-6 p-[clamp(12px,1.2vw,18px)] outline-none">
      <header className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#EDE9FE]">
            <AvaAvatar className="size-7" />
          </span>
          <h2 id="ai-recommendation-title" className="text-lu-body font-semibold text-lu-ink">AI Recommendation</h2>
        </div>
        {onAskAva && (
          <button type="button" onClick={onAskAva} aria-haspopup="dialog" className="rounded-full bg-[#F3E8FF] px-4 py-2 text-lu-label font-medium text-[#7E22CE] transition-colors hover:bg-[#E9D5FF]">
            Ask Ava
          </button>
        )}
      </header>
      <div className="mt-3 flex flex-col gap-4 rounded-[clamp(14px,1.2vw,18px)] bg-gradient-to-r from-[#FDF2F8] to-[#F5F0FF] p-[clamp(14px,1.4vw,22px)] sm:flex-row sm:items-center">
        <AvaAvatar className="size-[clamp(52px,4.2vw,68px)] shrink-0" />
        <div className="min-w-0">
          <p className="text-lu-body text-lu-ink-soft">
            {loading ? "Preparing your recommendation…" : (insight?.summary ?? "Your AI recommendation isn't available right now.")}
          </p>
          {insight && insight.tips.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {insight.tips.map((tip, i) => (
                <li key={tip} className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE] px-3 py-1 text-lu-caption font-medium text-[#7C3AED]">
                  {tip}
                  <Emoji symbol={CHIP_EMOJI[i % CHIP_EMOJI.length]} className="text-[12px]" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

const MED_CARD =
  "group relative isolate flex min-h-[clamp(120px,8.5vw,148px)] w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lu-card border border-lu-brand-line bg-gradient-to-br from-white via-white to-[#F6F0FF] p-lu-card text-left shadow-lu-card transition-all hover:border-pink-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300";

// Menstrual overview: same shell as the other menstrual metric cards (plain white card, soft shadow, no extra ring).
const MED_HALO =
  "group relative isolate flex h-full min-h-[clamp(130px,9.5vw,160px)] w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[24px] border border-[#F3E8F2] bg-gradient-to-br from-white via-white to-[#F8F3FF] p-4 text-left shadow-[0_6px_22px_rgba(236,72,153,0.06)] transition-all duration-200 hover:border-pink-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 sm:p-5";

/** "Medication" log card for ONE day: "3 out of 5" doses taken + status ring. Click opens the Daily Log. */
export function MedicationScoreCard({ day, onOpen, className = "", halo = false }: { day: string; onOpen: () => void; className?: string; halo?: boolean }) {
  const load = useCallback((s: AbortSignal) => getMedicationHistory(day, day, s), [day]);
  const meds = useAsync(load);
  const loadList = useCallback((s: AbortSignal) => getMedications(day, s), [day]);
  const list = useAsync(loadList);

  const intakes = (meds.data?.intakes ?? []).filter((m) => m.date.slice(0, 10) === day);
  const medList = list.data?.medications ?? [];

  // Doses taken late count as Taken. Upcoming = not due or not logged yet.
  const counts: Record<MedSegKey, number> = {
    taken: intakes.filter((m) => m.status === "taken").length,
    skipped: intakes.filter((m) => m.status === "skipped").length,
    upcoming: intakes.filter((m) => m.status === "pending").length,
  };
  const total = intakes.length || medList.length;
  const done = counts.taken;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const legend = MED_ORDER.filter((k) => counts[k] > 0);

  const loading = (meds.status === "loading" && !meds.data) || (list.status === "loading" && !list.data);
  const failed = meds.status === "error" && !meds.data;
  const empty = !loading && !failed && total === 0;
  const dayLabel = day === localISODate() ? "today" : fmtDate(day);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      aria-label="Medication. Open Daily Log to update"
      className={`${halo ? MED_HALO : MED_CARD} ${className}`}
    >
      <CardWave behind />
      <svg aria-hidden="true" viewBox="0 0 400 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[45%] w-full">
        <path d="M0 70 C80 30 160 40 240 70 S360 90 400 40 V120 H0Z" fill="#EEE6FB" fillOpacity="0.7" />
        <path d="M0 95 C100 60 200 110 300 85 S380 70 400 80 V120 H0Z" fill="#F8DDF0" fillOpacity="0.6" />
      </svg>
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F4ECFF] text-[#8B5CF6]">
          <Pill className="size-3.5" strokeWidth={2.3} aria-hidden="true" />
        </div>
        <span className="truncate text-lu-label font-semibold text-lu-ink">Medication</span>
      </div>

      <div className="z-10 mt-1 flex flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <span className="text-lu-caption text-lu-ink-muted">Taken {dayLabel}</span>
          {failed ? (
            <span className="mt-2 text-lu-label text-lu-ink-muted">Couldn&apos;t load medications</span>
          ) : empty ? (
            <span className="mt-1 text-lu-label font-semibold text-lu-ink">No medications scheduled</span>
          ) : (
            <span className="mt-1 text-[clamp(1rem,1.2vw,1.2rem)] font-bold leading-tight text-lu-ink">
              {loading ? "—" : done}
              {!loading && <span className="ml-1.5 text-lu-body font-semibold text-lu-ink-muted">out of {total}</span>}
            </span>
          )}
          {!loading && !failed && legend.length > 0 && (
            <ul className="mb-2 mt-1.5 flex flex-wrap gap-1.5" aria-label="Dose breakdown">
              {legend.map((k) => (
                <li key={k} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-lu-caption text-lu-ink-muted shadow-[0_2px_8px_-4px_rgba(139,92,246,0.35)]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: MED_SEG[k].color }} aria-hidden="true" />
                  <span className="font-semibold text-lu-ink">{counts[k]}</span> {MED_SEG[k].label}
                </li>
              ))}
            </ul>
          )}
          <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-[#F3E8FF]/80 px-3 py-1 text-lu-caption font-semibold text-[#9333EA]">
            View / Edit Log <ChevronRight className="size-3.5" aria-hidden="true" />
          </span>
        </div>

        <MedicationRing counts={counts} total={total} pct={pct} muted={loading || failed} />
      </div>
    </div>
  );
}

const ICON_CLASS = ["bg-[#EDE9FE] text-[#8B5CF6]", "bg-lu-brand-soft text-lu-brand-strong", "bg-[#DCFCE7] text-[#16A34A]"];

export function CycleInsights({ nextPeriodText, onViewDetails }: { nextPeriodText: string; onViewDetails: () => void }) {
  const items = [...LUTEAL_COPY.about, { icon: CalendarDays, category: "Cycle Pattern", title: "Luteal phase", text: nextPeriodText }];
  return (
    <section className="lu-card p-lu-card">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lu-heading font-semibold text-lu-ink">Cycle Insights</h2>
          <p className="mt-0.5 text-lu-label text-lu-ink-muted">Based on your logged data and current cycle phase.</p>
        </div>
        <button
          type="button"
          onClick={onViewDetails}
          className="inline-flex items-center gap-2 rounded-full bg-lu-brand-tint px-4 py-2 text-lu-label font-medium text-lu-brand-strong transition-colors hover:bg-lu-brand-soft"
        >
          <Activity className="size-4" aria-hidden="true" />
          View Details
        </button>
      </header>
      <ul className="mt-5 grid grid-cols-1 gap-lu-grid md:grid-cols-3">
        {items.map(({ icon: Icon, category, title, text }, i) => (
          <li key={title} className="rounded-[clamp(14px,1.2vw,20px)] bg-[#FFF7FA] p-[clamp(16px,1.4vw,24px)]">
            <span className={`flex size-10 items-center justify-center rounded-full ${ICON_CLASS[i % ICON_CLASS.length]}`}>
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <p className="mt-4 text-lu-label text-lu-ink-muted">{category}</p>
            <h3 className="mt-1 text-lu-body font-semibold text-lu-ink">{title}</h3>
            <p className="mt-2.5 text-lu-label text-lu-ink-muted">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}