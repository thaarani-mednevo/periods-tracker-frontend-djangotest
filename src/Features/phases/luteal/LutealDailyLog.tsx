import { Zap } from "lucide-react";
import { InfoCard } from "../../../Elements/infoCard/InfoCard";
import { useAsync } from "../../../hooks/useAsync";
import type { CycleState } from "../../../services/cycle";
import { longDate } from "../../../lib/isoDate";
import { getPhaseInsight } from "../../../services/insights";
import { ENERGIES, LEVELS, MOODS, SLEEPS, type Energy, type Level, type Mood, type Sleep, type SymptomKey } from "../../../services/logs";
import type { OnboardingData } from "../../../types";
import { AIWellnessInsights } from "../shared/daily-log/AIWellnessInsights";
import { BodyWeightSection } from "../shared/daily-log/BodyWeightSection";
import { ChoiceSection, type ChoiceOption } from "../shared/daily-log/ChoiceSection";
import { CycleDayStrip } from "../shared/daily-log/CycleDayStrip";
import { DailyActivitySection } from "../shared/daily-log/DailyActivitySection";
import { HydrationSection } from "../shared/daily-log/HydrationSection";
import { MedicationSection } from "../shared/daily-log/MedicationSection";
import { PHASE_TITLE } from "../shared/daily-log/phaseCopy";
import { LUTEAL_SYMPTOMS } from "./lutealContent";
import { IntercourseSection, SymptomTracking, symptomExtras } from "../shared/daily-log/SymptomsSection";
import { SaveLogBar } from "../shared/daily-log/SaveLogBar";
import { useDailyLog } from "../shared/daily-log/useDailyLog";
import { Battery } from "../shared/ui/Battery";
import { Emoji } from "../shared/ui/Emoji";
import { CRAVING_EMOJI, EnergyBolt, SLEEP_EMOJI } from "../shared/ui/visuals";
import moodAvatar from "../../../assets/phases/patient.png";
import moodHappy from "../../../assets/phases/follicular/mood_happy.png";
import moodCalm from "../../../assets/phases/follicular/mood_calm.png";
import moodNeutral from "../../../assets/phases/follicular/mood_neutral.png";
import moodIrritable from "../../../assets/phases/follicular/mood_irritable.png";
import moodSad from "../../../assets/phases/follicular/mood_sad.png";
import { LutealShell, type LutealTab } from "./components/Shell";
import { useCallback, useEffect } from "react";

const tileEmoji = "text-[clamp(26px,2.1vw,36px)]";
const headerEmoji = "text-[clamp(22px,1.7vw,28px)]";
const batteryH = "h-[clamp(30px,2.5vw,42px)]";

const MOOD_IMG: Record<Mood, string> = {
  Happy: moodHappy,
  Calm: moodCalm,
  Neutral: moodNeutral,
  Irritable: moodIrritable,
  Sad: moodSad,
};
const MOOD_OPTIONS: ChoiceOption<Mood>[] = MOODS.map((value) => ({
  value,
  visual: <img src={MOOD_IMG[value]} alt="" className="aspect-square h-full rounded-full object-cover" />,
}));
// Daily Log tiles follow the design: the battery fills up as the fatigue level goes up.
const FATIGUE_TILE: Record<Level, { level: number; color: string }> = {
  None: { level: 0.1, color: "#F43F5E" },
  Mild: { level: 0.5, color: "#F59E0B" },
  Moderate: { level: 0.75, color: "#22C55E" },
  High: { level: 1, color: "#22C55E" },
};
const FATIGUE_OPTIONS: ChoiceOption<Level>[] = LEVELS.map((value) => ({
  value,
  visual: <Battery level={FATIGUE_TILE[value].level} color={FATIGUE_TILE[value].color} className={batteryH} />,
}));
const SLEEP_OPTIONS: ChoiceOption<Sleep>[] = SLEEPS.map((value) => ({
  value,
  visual: <Emoji symbol={SLEEP_EMOJI[value]} label={value} className={tileEmoji} />,
}));
const ENERGY_OPTIONS: ChoiceOption<Energy>[] = ENERGIES.map((value) => ({ value, visual: <EnergyBolt value={value} /> }));
const CRAVING_OPTIONS: ChoiceOption<Level>[] = LEVELS.map((value) => ({
  value,
  visual: <Emoji symbol={CRAVING_EMOJI[value]} label={value} className={tileEmoji} />,
}));

interface LutealDailyLogProps {
  data: OnboardingData;
  state: CycleState;
  initialDay?: string;
  onDateChange: (date: string) => void;
  onNavigate: (tab: LutealTab) => void;
}

export function LutealDailyLog({
  data,
  state,
  initialDay,
  onDateChange,
  onNavigate,
}: LutealDailyLogProps) {
  const log = useDailyLog(initialDay);
  const loadInsight = useCallback((s: AbortSignal) => getPhaseInsight(log.selectedDate, s), [log.selectedDate]);
  const insight = useAsync(loadInsight);  
  useEffect(() => {
    if (log.selectedDate !== (initialDay ?? log.today)) onDateChange(log.selectedDate);
  }, [log.selectedDate, log.today, initialDay, onDateChange]);
  
  const { draft } = log;
  // Disclaimer + per-symptom notices from the backend; read from the draft (see symptomExtras).
  const symptomExtra = symptomExtras(draft);


  const info = log.cycleInfo(log.selectedDate);
  const isToday = log.selectedDate === log.today;

  return (
    <div className="animate-fade-up pb-12">
      <LutealShell data={data} state={state} active="daily-log" onNavigate={onNavigate} />

      <div className="flex flex-col gap-lu-grid">
        <CycleDayStrip
          today={log.today}
          dates={log.dates}
          selectedDate={log.selectedDate}
          info={info}
          cycleInfo={log.cycleInfo}
          isLogged={log.isLogged}
          onSelect={(date) => {
  log.selectDate(date);
  onDateChange(date);
}}
          onToday={() => {
            log.goToToday();
            onDateChange(log.today);
}}
          onShiftWeek={log.shiftWeek}
          onShiftMonth={log.shiftMonth}
        />

        {log.loadError && (
          <InfoCard live>
            {log.loadError.message || "Couldn't load this day."}{" "}
            <button type="button" onClick={log.retry} className="font-semibold underline">Try again</button>
          </InfoCard>
        )}
        {!draft && !log.loadError && <p className="text-lu-body text-lu-ink-muted">Loading…</p>}

        {draft && (
          <div aria-busy={!log.ready} className={`flex flex-col gap-lu-grid transition-opacity duration-200 ${log.ready ? "" : "pointer-events-none opacity-60"}`}>
            <div className="pt-1">
              <h2 className="text-lu-title font-bold text-lu-ink">{PHASE_TITLE[info.phase]}</h2>
              <p className="mt-0.5 text-lu-body text-lu-ink-muted">
                {isToday ? "Today, " : ""}
                {longDate(log.selectedDate)}
              </p>
            </div>

            {/* The stored AI insight is for today's phase, so it is only shown on today */}
            {isToday && (
              <AIWellnessInsights
                cycleDay={info.cycleDay}
                phase={info.phase}
                insight={insight.data?.insight ?? null}
                loading={insight.status === "loading"}
              />
            )}

            <div className="grid grid-cols-1 gap-lu-grid md:grid-cols-2 xl:grid-cols-3">
              <ChoiceSection
                icon={<img src={moodAvatar} alt="" className="size-full object-cover object-top" />}
                title="Mood"
                subtitle="Select how you feel today"
                info
                className="md:col-span-2 xl:col-span-1"
                options={MOOD_OPTIONS}
                value={draft.mood}
                onChange={(v) => log.update("mood", v)}
              />
              <BodyWeightSection value={log.weightText} onChange={log.changeWeight} />
              <MedicationSection medications={log.medications} date={log.selectedDate} onStatusChange={log.setMedStatus} onAdd={log.addMed} onRemove={log.removeMed} />
            </div>
            {log.medError && <InfoCard live>{log.medError}</InfoCard>}

            <div className="grid grid-cols-1 gap-lu-grid lg:grid-cols-2">
              <ChoiceSection
                icon={<Battery level={0.25} color="#F43F5E" className="h-[60%]" />}
                title="Fatigue Level"
                subtitle="How tired do you feel today?"
                options={FATIGUE_OPTIONS}
                value={draft.fatigue}
                onChange={(v) => log.update("fatigue", v)}
              />
              <ChoiceSection
                icon={<Emoji symbol="😴" className={headerEmoji} />}
                title="Sleep Quality"
                subtitle="How was your sleep last night?"
                options={SLEEP_OPTIONS}
                value={draft.sleep}
                onChange={(v) => log.update("sleep", v)}
              />
              <ChoiceSection
                icon={<Zap className="h-[45%] w-[45%]" fill="#F9A8D4" stroke="#F472B6" strokeWidth={1.2} aria-hidden="true" />}
                title="Energy Level"
                subtitle="How is your energy today?"
                options={ENERGY_OPTIONS}
                value={draft.energy}
                onChange={(v) => log.update("energy", v)}
              />
              <ChoiceSection
                icon={<Emoji symbol="🧁" className={headerEmoji} />}
                title="Cravings"
                subtitle="Did you experience any cravings today?"
                options={CRAVING_OPTIONS}
                value={draft.cravings}
                onChange={(v) => log.update("cravings", v)}
              />
            </div>

            <div className="grid grid-cols-1 gap-lu-grid lg:grid-cols-2">
              <DailyActivitySection
                steps={draft.steps ?? 0}
                goal={log.stepGoal}
                onStepsChange={(v) => log.update("steps", v)}
                onGoalChange={log.setStepGoal}
              />
              <HydrationSection {...log.hydration} onChange={log.changeWater} />
            </div>

            {/* Symptoms + Intercourse: always the last cards, right above Save */}
            {info.phase === "luteal" && (
              <>
                <SymptomTracking
                  options={LUTEAL_SYMPTOMS}
                  phaseLabel="Luteal Phase symptoms"
                  symptoms={draft.symptoms}
                  other={draft.customSymptom ?? ""}
                  severity={draft.painScore}
                  disclaimer={symptomExtra.disclaimer}
                  notices={symptomExtra.notices}
                  onSymptoms={(next) => log.update("symptoms", next as SymptomKey[])}
                  onOther={(text) => log.update("customSymptom", text)}
                  onSeverity={(n) => log.update("painScore", n)}
                />
                <IntercourseSection
                  intercourse={draft.intercourse}
                  protection={draft.protection ?? null}
                  details={draft.notes ?? ""}
                  onIntercourse={(v) => log.update("intercourse", v)}
                  onProtection={(v) => log.update("protection", v)}
                  onDetails={(v) => log.update("notes", v === "" ? null : v)}
                />
              </>
            )}

            <SaveLogBar date={log.selectedDate} onSave={log.save} error={log.error} noChanges={log.noChanges} status={log.status} />
          </div>
        )}
      </div>
    </div>
  );
}