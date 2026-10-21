import { CalendarHeart, Flower2, ShieldAlert, Sparkles, Target } from "lucide-react";
import { useCallback, useState } from "react";
import { InfoCard } from "../../../Elements/infoCard/InfoCard";
import { useAsync } from "../../../hooks/useAsync";
import { getOvulationNote } from "../../../services/insights";
import type { FertilityTracking } from "../../../types";
import { fmtDate } from "../../dashboard/phases";
import { AIRecommendation, MedicationScoreCard } from "../luteal/components/OverviewSections";
import type { PhaseViewProps } from "../types";
import { LH_META, LIBIDO_META, MUCUS_META, fertilityLevelWithSignals, ovulationHealth, statusCopy } from "./fertility";
import { FERTILITY_COPY, MUCUS_SCALE } from "./ovulationContent";
import {
  BbtCard,
  FactGrid,
  FertilityLevelCard,
  FertilityStatusCard,
  LhCard,
  LibidoCard,
  MucusCard,
  ReadinessShell,
  useOvulationData,
  type Fact,
} from "./OvulationParts";
import { OvulationBanner, OvulationStatusCard } from "./OvulationOverview";
import { FertilityInsightCard } from "./OvulationInsight";
import { PhaseTipsModal } from "../shared/ui/PhaseTipsModal";

export interface OvulationFertilityProps extends PhaseViewProps {
  journey: "trying_to_conceive" | "pregnancy_prevention";
  /** Settings > tracking toggles. A card is shown when its toggle is on (or a value is already logged). */
  tracking: Partial<FertilityTracking>;
}

/**
 * Fertility-journey ovulation screen (ovulation-phase design).
 * Same data for both journeys; the journey changes the wording, the facts shown and the safety note.
 * Which signal cards appear follows the tracking toggles from Settings.
 */
export function OvulationFertility({ state, journey, tracking: _tracking, onLogPeriod, onAskAva, onOpenDailyLog }: OvulationFertilityProps) {
  const d = useOvulationData(state);
  const [tipsOpen, setTipsOpen] = useState(false);
  const openLog = onOpenDailyLog ?? (() => {});
  const copy = FERTILITY_COPY[journey];
  const ttc = journey === "trying_to_conceive";
  const { fw, status, log } = d;
  const data = log.data;

  // Core ovulation signals always show on the overview. They no longer depend on Settings toggles.
  const showMucus = true;
  const showBbt = true;
  const showLh = true;
  const showLibido = true;

  const banner = status && fw ? statusCopy(status, journey, fw) : null;
  const baseHealth = ovulationHealth(d.bbt, data, status);
  // The rules above decide the label and the fallback sentence. The backend may word the sentence for this
  // same level; it is used only when it is ready and its level matches ours, otherwise the rule-based text stays.
  const noteKey = `${data?.cervicalMucus ?? ""}|${data?.lhTest ?? ""}|${d.bbt.state}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadNote = useCallback((s: AbortSignal) => getOvulationNote(d.day, s), [d.day, noteKey]);
  const note = useAsync(loadNote);
  const noteText =
    note.status === "ready" && note.data?.status === "ready" && note.data.level === baseHealth.level ? note.data.text : null;
  const health = noteText ? { ...baseHealth, text: noteText } : baseHealth;
  const level = status ? fertilityLevelWithSignals(status, data) : null;

  const facts: Fact[] = ttc
    ? [
        { icon: Flower2, label: "Fertile window", value: fw ? `${fmtDate(fw.start)} – ${fmtDate(fw.end)}` : "—", note: "5 days before ovulation to 1 day after" },
        { icon: Target, label: "Peak fertility day", value: fw ? fmtDate(fw.peakDay) : "—", note: "Usually the day before ovulation" },
        { icon: Sparkles, label: "Estimated ovulation", value: fw ? fmtDate(fw.ovulation) : "—", note: "Can shift by a few days" },
        { icon: CalendarHeart, label: "Best days to try", value: fw ? `${fmtDate(fw.bestStart)} – ${fmtDate(fw.ovulation)}` : "—", note: "Highest chance of conception" },
      ]
    : [
        { icon: Flower2, label: "Fertile window", value: fw ? `${fmtDate(fw.start)} – ${fmtDate(fw.end)}` : "—", note: "5 days before ovulation to 1 day after" },
        { icon: ShieldAlert, label: "Higher chance days", value: fw ? `${fmtDate(fw.bestStart)} – ${fmtDate(fw.ovulation)}` : "—", note: "Highest estimated chance of pregnancy" },
        { icon: Sparkles, label: "Estimated ovulation", value: fw ? fmtDate(fw.ovulation) : "—", note: "Can shift by a few days" },
        {
          icon: CalendarHeart,
          label: "Today",
          value: !status ? "—" : status.kind === "open" || status.kind === "peak" ? "Higher chance" : "Lower chance (estimate)",
          note: "Estimates can be off",
        },
      ];

  // Only what the user actually logged. Nothing is guessed; an empty pill says "Not logged".
  const signals = [
    { label: "LH surge", value: showLh && data?.lhTest ? data.lhTest : null },
    { label: "Mucus", value: showMucus && data?.cervicalMucus ? data.cervicalMucus : null },
    { label: "BBT", value: showBbt && d.bbt.state === "rising" ? "Rising" : showBbt && d.bbt.latest != null ? "Logged" : null },
  ];
  // (removed: rows are fixed below)

  return (
    <div className="flex flex-col gap-lu-grid">
      <div className="grid grid-cols-1 gap-lu-grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">      <OvulationStatusCard cycleDay={state.cycleDay} cycleLength={state.cycleProfile.medianCycleLength} hasInsight={d.insight.data?.status === "ready"} onOpenSummary={onAskAva} />
        <OvulationBanner heading={copy.heading} description={copy.description} onViewTips={() => setTipsOpen(true)} onLogPeriod={onLogPeriod} />
      </div>

      <ReadinessShell id="ovulation-readiness" title="Ovulation readiness" subtitle="Multi-signal fertility intelligence, updated live">

        {/* Row 1: BBT + Cervical mucus + Fertility level */}
        <div className="grid grid-cols-1 gap-lu-grid md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {showBbt && <BbtCard analysis={d.bbt} day={d.day} onOpen={openLog} />}
          {showMucus && <MucusCard log={data} scale={MUCUS_SCALE} meta={MUCUS_META} onOpen={openLog} />}
          {level && (
            <div className="flex min-w-0 flex-col md:col-span-2 lg:col-span-1 [&>section]:flex-1">
              <FertilityLevelCard level={level} signals={signals} />
            </div>
          )}
        </div>

        {/* Row 2: LH + Libido + Medication */}
        <div className="grid grid-cols-1 gap-lu-grid sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {showLh && <LhCard log={data} meta={LH_META} onOpen={openLog} />}
          {showLibido && <LibidoCard log={data} meta={LIBIDO_META} onOpen={openLog} />}
          <MedicationScoreCard day={d.day} onOpen={openLog} className="sm:col-span-2 lg:col-span-1" />
        </div>

        <AIRecommendation insight={d.insight.data?.insight ?? null} loading={d.insight.status === "loading"} onAskAva={onAskAva} />

        <FertilityInsightCard status={status} ttc={ttc} log={data} bbt={d.bbt} />
      </ReadinessShell>

      {banner && <FertilityStatusCard {...banner} health={health} showProtection={!ttc} />}
      <FactGrid facts={facts} />


      <InfoCard variant="disclaimer">{copy.disclaimer}</InfoCard>

      {tipsOpen && <PhaseTipsModal phaseLabel="Ovulation" day={state.date} onClose={() => setTipsOpen(false)} />}
    </div>
  );
}