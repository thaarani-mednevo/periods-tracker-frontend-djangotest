import { useState } from "react";
import { useCycle } from "../../hooks/useCycle";
import { submitOnboardingProfile } from "../../services/onboarding";
import { localISODate, logPeriod, type CycleState } from "../../services/cycle";
import type { OnboardingData } from "../../types";
import { InfoCard } from "../../Elements/infoCard/InfoCard";
import { secondaryBtn } from "../../Elements/navigationButtons/NavigationButtons";
import { AskAvaModal } from "../insights/AskAvaModal";
import { PhaseInsightCard } from "../insights/PhaseInsightCard";
import { LogPeriodModal } from "./LogPeriodPage";
import { PHASE_VIEWS, usePhaseScale } from "../phases/registry";
import { LutealShell } from "../phases/luteal/components/Shell";
import { fmtDate, PHASES } from "./phases";
import { daysBetweenIso, latePeriodNote } from "../../lib/clinicalCopy";
import { Overview } from "./Overview";

/** Plain-language reason for the confidence level; the backend only sends codes. */
function confidenceNote(state: CycleState): string | null {
  const r = state.confidence.reasons;
  if (r.includes("no_cycle_data")) return "Add your cycle length or log a couple of periods to get predictions.";
  if (r.includes("irregular_cycles")) return "Your cycles vary a lot, so dates are shown as wide ranges and are estimates only. LH tests or temperature logs make them more reliable.";
  if (r.includes("based_on_onboarding_only")) return "Predictions use the cycle length you entered. They get more accurate as you log periods.";
  if (r.includes("only_one_cycle_logged") || r.includes("few_cycles_logged")) return "Predictions are still learning from your first few cycles.";
  if (r.includes("moderate_cycle_variability") || r.includes("high_cycle_variability")) return "Your cycle length varies, so dates are shown as ranges.";
  return null;
}

const BASIS_LABEL = { confirmed: "Confirmed", estimated: "Estimated" } as const;

/** Shows how sure we are about the phase, so an estimate is never presented as a fact. */
function PhaseBasisChip({ state }: { state: CycleState }) {
  if (state.phase === "unknown" || state.phaseBasis === "none") return null;

  const label = PHASES.find((p) => p.id === state.phase)?.label ?? state.phase;
  const confirmed = state.phaseBasis === "confirmed";

  return (
    <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
      <span className="font-semibold text-ink">{label}</span>

      <span
        className={
          confirmed
            ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-micro font-bold uppercase tracking-[0.12em] text-emerald-700"
            : "rounded-full bg-[#FDF2F8] px-2.5 py-0.5 text-micro font-bold uppercase tracking-[0.12em] text-rose-ink"
        }
      >
        {BASIS_LABEL[state.phaseBasis]}
      </span>

      {!confirmed && state.phaseHint === "ovulation_not_detected" && (
        <span>Ovulation not detected yet. Log an LH test or temperature.</span>
      )}
    </p>
  );
}

/** One sentence for a late period. Irregular cycles get a range, never a single "N days late" date. */
function lateSentence(state: CycleState): string {
  const since = state.period
    ? `Your last logged period started ${fmtDate(state.period.start)}. `
    : "";

  const np = state.nextPeriod;

  if (state.cycleProfile.irregular) {
    const range =
      np?.rangeStart && np?.rangeEnd
        ? ` between ${fmtDate(np.rangeStart)} and ${fmtDate(np.rangeEnd)}`
        : "";

    return `${since}With cycles that vary, your period was expected${range}, and it hasn't been logged yet. Did you have a period since then?`;
  }

  return `${since}Your period is ${state.overdueDays} ${
    state.overdueDays === 1 ? "day" : "days"
  } later than predicted. Did you have a period since then?`;
}

interface DashboardProps {
  data: OnboardingData;
  selectedDay?: string;
  onEditSetup: () => void;
  onOpenTrends: () => void;
  onOpenDailyLog: () => void;
  onOpenMedicationHistory: () => void;
  onOpenCalendar: () => void;
  onOpenSettings?: () => void;
}

export function Dashboard({
  data,
  selectedDay,
  onEditSetup,
  onOpenTrends,
  onOpenDailyLog,
  onOpenMedicationHistory,
  onOpenCalendar,
  onOpenSettings,
}: DashboardProps) {
  const cycle = useCycle(selectedDay);

  const [retrying, setRetrying] = useState(false);
  const [avaOpen, setAvaOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [lateDismissed, setLateDismissed] = useState(false);
  const [startingToday, setStartingToday] = useState(false);

  const periodStartedToday = async () => {
    setStartingToday(true);

    try {
      await logPeriod(localISODate());
      cycle.refetch();
    } catch {
      openLogPeriod();
    } finally {
      setStartingToday(false);
    }
  };

  const openLogPeriod = () => setLogOpen(true);

  const state = cycle.data;

  // Unknown phase uses the follicular scale, same as the daily log.
  usePhaseScale(state ? (state.phase !== "unknown" ? state.phase : "follicular") : undefined);

  const View =
    state && state.phase !== "unknown"
      ? PHASE_VIEWS[state.phase]
      : undefined;

  const shelled =
    cycle.status === "ready" &&
    (
      state?.phase === "luteal" ||
      state?.phase === "menstrual" ||
      state?.phase === "follicular" ||
      state?.phase === "ovulation" ||
      state?.phase === "unknown"
    );

  const note = state ? confidenceNote(state) : null;

  const lateNote = state?.isOverdue
    ? latePeriodNote(
        state.period ? daysBetweenIso(state.period.start, state.date) : 0,
        state.overdueDays
      )
    : null;

  const next = state?.nextPhase;

  const nextLabel = next
    ? PHASES.find((p) => p.id === next.phase)?.label
    : undefined;

  const retrySave = async () => {
    setRetrying(true);
    await submitOnboardingProfile(data);
    setRetrying(false);
    cycle.refetch();
  };

  return (
    <div className="animate-fade-up pb-12">

      {/* =========================================================
          OVERVIEW HEADER + PLATFORM MENU
          ========================================================= */}
      <div
        className={
          shelled || cycle.status === "loading"
            ? "hidden"
            : "mb-6 flex flex-col gap-5"
        }
      >
        {/* Page title */}
        <div>
          <p className="text-micro font-bold uppercase tracking-[0.16em] text-rose-ink">
            Cycle dashboard
          </p>

          <h1 className="mt-1 text-headline font-bold tracking-[-0.02em] text-ink">
            {data.name.trim()
              ? `Welcome, ${data.name.trim().split(/\s+/)[0]}`
              : "Welcome to your tracker"}
          </h1>

          {next && nextLabel && (
            <p className="mt-1 text-body-sm text-ink-muted">
              Next:{" "}
              <span className="font-semibold text-ink">
                {nextLabel}
              </span>{" "}
              {next.daysUntil === 1
                ? "tomorrow"
                : `in ${next.daysUntil} days`}{" "}
              · {fmtDate(next.startDate)}
            </p>
          )}
        </div>

        {/* =====================================================
            SAME MENU POSITION AS CALENDAR / PHASE PAGES
            ===================================================== */}
        <nav
          aria-label="Cycle tracker"
          className="w-full overflow-x-auto rounded-full bg-[#FDF0F6] p-[clamp(4px,0.35vw,6px)]"
        >
          <ul className="flex min-w-max items-center justify-start gap-[clamp(2px,0.6vw,12px)]">

            {/* Overview */}
            <li>
              <button
                type="button"
                aria-current="page"
                className="block whitespace-nowrap rounded-full bg-white px-[clamp(14px,1.5vw,24px)] py-[clamp(7px,0.55vw,10px)] text-lu-body font-semibold text-lu-brand-strong shadow-lu-pill"
              >
                Overview
              </button>
            </li>

            {/* Calendar */}
            <li>
              <button
                type="button"
                onClick={onOpenCalendar}
                className="block whitespace-nowrap rounded-full px-[clamp(14px,1.5vw,24px)] py-[clamp(7px,0.55vw,10px)] text-lu-body font-medium text-lu-ink-soft hover:text-lu-brand-strong"
              >
                Calendar
              </button>
            </li>

            {/* Daily Log */}
            <li>
              <button
                type="button"
                onClick={onOpenDailyLog}
                className="block whitespace-nowrap rounded-full px-[clamp(14px,1.5vw,24px)] py-[clamp(7px,0.55vw,10px)] text-lu-body font-medium text-lu-ink-soft hover:text-lu-brand-strong"
              >
                Daily Log
              </button>
            </li>

            {/* Medications */}
            <li>
              <button
                type="button"
                onClick={onOpenMedicationHistory}
                className="block whitespace-nowrap rounded-full px-[clamp(14px,1.5vw,24px)] py-[clamp(7px,0.55vw,10px)] text-lu-body font-medium text-lu-ink-soft hover:text-lu-brand-strong"
              >
                Medications
              </button>
            </li>

            {/* Insights */}
            <li>
              <button
                type="button"
                onClick={onOpenTrends}
                className="block whitespace-nowrap rounded-full px-[clamp(14px,1.5vw,24px)] py-[clamp(7px,0.55vw,10px)] text-lu-body font-medium text-lu-ink-soft hover:text-lu-brand-strong"
              >
                Insights
              </button>
            </li>

            {/* Settings */}
            <li>
              <button
                type="button"
                onClick={() =>
                  (onOpenSettings ?? onEditSetup)()
                }
                className="block whitespace-nowrap rounded-full px-[clamp(14px,1.5vw,24px)] py-[clamp(7px,0.55vw,10px)] text-lu-body font-medium text-lu-ink-soft hover:text-lu-brand-strong"
              >
                Settings
              </button>
            </li>

          </ul>
        </nav>
      </div>

      {/* =========================================================
          PHASE SHELL
          ========================================================= */}
      {shelled && state && (
        <LutealShell
          data={data}
          state={state}
          active="overview"
          onNavigate={(tab) => {
            if (tab === "calendar") onOpenCalendar();
            else if (tab === "daily-log") onOpenDailyLog();
            else if (tab === "insights") onOpenTrends();
            else if (tab === "medication-history")
              onOpenMedicationHistory();
            else if (tab === "settings")
              (onOpenSettings ?? onEditSetup)();
          }}
        />
      )}

      {/* =========================================================
          LOADING
          ========================================================= */}
      {cycle.status === "loading" && (
        <div className="grid gap-5" aria-busy="true">
          <span className="sr-only">Loading…</span>

          <div className="h-24 animate-pulse rounded-[22px] bg-[#FDF2F8]" />

          <div className="h-[220px] animate-pulse rounded-[22px] bg-[#FDF2F8]" />

          <div className="h-[160px] animate-pulse rounded-[22px] bg-[#FDF2F8]" />
        </div>
      )}

      {/* =========================================================
          NO SETUP
          ========================================================= */}
      {cycle.status === "no-setup" && (
        <InfoCard live>
          We couldn't find your saved setup.{" "}
          <button
            type="button"
            onClick={retrySave}
            disabled={retrying}
            className="font-semibold underline"
          >
            {retrying ? "Saving…" : "Save it now"}
          </button>
        </InfoCard>
      )}

      {/* =========================================================
          ERROR
          ========================================================= */}
      {cycle.status === "error" && (
        <InfoCard live>
          {cycle.error?.message ?? "Couldn't load your cycle."}{" "}
          <button
            type="button"
            onClick={cycle.refetch}
            className="font-semibold underline"
          >
            Try again
          </button>
        </InfoCard>
      )}

      {/* =========================================================
          READY
          ========================================================= */}
      {cycle.status === "ready" && state && (
        <div className="grid gap-5">

          {/* Late period */}
          {state.isOverdue && !lateDismissed ? (
            <InfoCard live>
              <p>{lateSentence(state)}</p>

              {state.phaseHint === "ovulation_not_detected" && (
                <p className="mt-2">
                  Ovulation hasn't been detected yet. Log an LH test or your
                  temperature and we'll work from your own signs.
                </p>
              )}

              {lateNote && (
                <p className="mt-2">
                  {lateNote}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={openLogPeriod}
                  className={secondaryBtn}
                >
                  Yes, add the date
                </button>

                <button
                  type="button"
                  onClick={periodStartedToday}
                  disabled={startingToday}
                  className={secondaryBtn}
                >
                  {startingToday
                    ? "Saving…"
                    : "It started today"}
                </button>

                <button
                  type="button"
                  onClick={onOpenDailyLog}
                  className={secondaryBtn}
                >
                  Log LH / temperature
                </button>

                <button
                  type="button"
                  onClick={() => setLateDismissed(true)}
                  className={secondaryBtn}
                >
                  Not yet
                </button>

              </div>
            </InfoCard>
          ) : (
            note && <InfoCard>{note}</InfoCard>
          )}

          <PhaseBasisChip state={state} />

          {View ? (
            <>
              <View
                state={state}
                onLogPeriod={openLogPeriod}
                onOpenTrends={onOpenTrends}
                onAskAva={() => setAvaOpen(true)}
                onOpenDailyLog={onOpenDailyLog}
                onOpenMedicationHistory={onOpenMedicationHistory}
                onChanged={cycle.refetch}
              />

              {/* Keyed so a new phase or day fetches a fresh insight */}
              {!shelled && (
                <PhaseInsightCard
                  key={`${state.phase}-${state.date}`}
                />
              )}
            </>
          ) : (
            <Overview
              state={state}
              onLogPeriod={openLogPeriod}
              onAddCycleInfo={onEditSetup}
              onOpenDailyLog={onOpenDailyLog}
              onAskAva={() => setAvaOpen(true)}
            />
          )}

        </div>
      )}

      {/* =========================================================
          ASK AVA
          ========================================================= */}
      {avaOpen && (
        <AskAvaModal
          onClose={() => setAvaOpen(false)}
        />
      )}

      {/* =========================================================
          LOG PERIOD MODAL
          ========================================================= */}
      {logOpen && (
        <LogPeriodModal
          onClose={() => setLogOpen(false)}
          onSaved={() => {
            setLogOpen(false);
            cycle.refetch();
          }}
        />
      )}

    </div>
  );
}