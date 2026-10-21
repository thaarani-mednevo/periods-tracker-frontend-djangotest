import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Sparkles,
  AlertCircle,
  Flame,
  Heart,
  TestTube,
  Loader2,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { InfoCard } from "../../../Elements/infoCard/InfoCard";
import { useAsync } from "../../../hooks/useAsync";
import { addDays, longDate, toIso } from "../../../lib/isoDate";

import {
  getPredictions,
  localISODate,
  type CyclePhase,
} from "../../../services/cycle";

import {
 ENERGIES,
  MOODS,
  MUCUS,
  emptyLog,
  getDailyLog,
  getLogRange,
  saveDailyLog,
  type DailyLog,
  type SymptomKey,
} from "../../../services/logs";
import { prefetchDailyLog } from "../../../services/logs";


import { getPhaseInsight } from "../../../services/insights";

import type { OnboardingData } from "../../../types";
import type { CycleInfo } from "../shared/daily-log/phaseCopy";
import { CycleDayStrip } from "../shared/daily-log/CycleDayStrip";


import { IntercourseSection, SymptomTracking, symptomExtras } from "../shared/daily-log/SymptomsSection";
import { MedicationPanel } from "../../dailyLog/MedicationPanel";
import type { PhaseViewProps } from "../types";

import { LutealShell, type LutealTab } from "../luteal/components/Shell";

import moodHappy from "../../../assets/phases/follicular/mood_happy.png";
import moodCalm from "../../../assets/phases/follicular/mood_calm.png";
import moodNeutral from "../../../assets/phases/follicular/mood_neutral.png";
import moodIrritable from "../../../assets/phases/follicular/mood_irritable.png";
import moodSad from "../../../assets/phases/follicular/mood_sad.png";

import mucusDry from "../../../assets/phases/follicular/mucus_dry.png";
import mucusSticky from "../../../assets/phases/follicular/mucus_sticky.png";
import mucusCreamy from "../../../assets/phases/follicular/mucus_creamy.png";
import mucusWatery from "../../../assets/phases/follicular/mucus_watery.png";
import mucusEggWhite from "../../../assets/phases/follicular/mucus_eggwhite.png";

interface Props {
  data: OnboardingData;
  state: PhaseViewProps["state"];
  initialDay?: string;
  onDateChange: (day: string) => void;
  onNavigate: (tab: LutealTab) => void;
}

const FOLLICULAR_SYMPTOMS: { id: string; label: string }[] = [
  { id: "increasingEnergy", label: "Increasing energy" },
  { id: "improvedMood", label: "Improved mood" },
  { id: "mildPelvicDiscomfort", label: "Mild pelvic discomfort" },
  { id: "cervicalMucusChanges", label: "Cervical mucus changes" },
  { id: "increasedFocus", label: "Increased focus" },
  { id: "libidoChanges", label: "Changes in libido" },
  { id: "breastTenderness", label: "Breast tenderness" },
  { id: "bloating", label: "Bloating" },
  { id: "mildHeadache", label: "Mild headache" },
  { id: "skinChanges", label: "Skin changes" },
];

const PHASE_TITLE: Record<CyclePhase, string> = {
  menstrual: "Menstruation",
  follicular: "Follicular Phase",
  ovulation: "Ovulation",
  luteal: "Luteal Phase",
  unknown: "Daily Log",
};

const MOOD_IMAGES: Record<string, string> = {
  Happy: moodHappy,
  Calm: moodCalm,
  Neutral: moodNeutral,
  Irritable: moodIrritable,
  Sad: moodSad,
};

const MUCUS_IMAGE: Record<string, string> = {
  Dry: mucusDry,
  Sticky: mucusSticky,
  Creamy: mucusCreamy,
  Watery: mucusWatery,
  "Egg white": mucusEggWhite,
};

const MUCUS_META: Record<
  string,
  {
    subtitle: string;
    fertility: string;
  }
> = {
  Dry: {
    subtitle: "Minimal moisture",
    fertility: "Low fertility",
  },
  Sticky: {
    subtitle: "Adhesive / Tacky",
    fertility: "Low fertility",
  },
  Creamy: {
    subtitle: "Lotion-like",
    fertility: "Transitional",
  },
  Watery: {
    subtitle: "Clear & fluid",
    fertility: "High fertility",
  },
  "Egg white": {
    subtitle: "Stretchy & clear",
    fertility: "Peak fertility",
  },
};

function firstFieldError(err: unknown) {
  const e = err as {
    message?: string;
    fieldErrors?: Record<string, string[]>;
  };

  const first = e.fieldErrors
    ? Object.values(e.fieldErrors).flat()[0]
    : undefined;

  return first
    ? `${e.message ?? "Couldn't save."} ${first}`
    : e.message ?? "Couldn't save. Please try again.";
}

function buildDates(center: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(center, i - 3));
}

function buildCycleInfo(
  days: {
    date: string;
    phase: CyclePhase;
    cycleDay: number | null;
  }[],
): (date: string) => CycleInfo {
  const map = new Map(
    days.map((d) => [
      d.date,
      {
        cycleDay: d.cycleDay,
        phase: d.phase,
      },
    ]),
  );

  return (date) =>
    map.get(date) ?? {
      cycleDay: null,
      phase: "unknown",
    };
}

const TIME_OPTIONS = ["06:00", "06:30", "06:45", "07:00", "07:30", "08:00", "08:30", "09:00"];
const DEVICE_OPTIONS = ["Connected Thermometer", "Manual Oral Thermometer", "Apple Watch / Sensor", "Oura Ring"];
const BBT_PRESETS = [36.3, 36.5, 36.35, 36.4, 36.45];
const BBT_MIN = 35;
const BBT_MAX = 38.5;

/** "07:30" -> "07:30 AM" */
function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function BbtCard({
  value,
  time,
  onValue,
  onTime,
  aside,
  showRange = true,
}: {
  value: number | null;
  time: string | null;
  onValue: (v: number | null) => void;
  onTime: (v: string | null) => void;
  /** Rendered as the 3rd column (Medication) */
  aside?: ReactNode;
  /** The pre-ovulatory temperature note is follicular wording; hidden when the day has no phase. */
  showRange?: boolean;
}) {
  // Raw text so typing "36." or "36.5" is not rewritten on every keystroke.
  const [text, setText] = useState(value === null ? "" : value.toFixed(2));
  // UI only: the daily-log API has no device / notes fields yet.
  const [device, setDevice] = useState(DEVICE_OPTIONS[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setText((t) => (value === null ? "" : Number(t) === value ? t : value.toFixed(2)));
  }, [value]);

  const hhmm = time ? time.slice(0, 5) : "";
  const timeOptions = hhmm && !TIME_OPTIONS.includes(hhmm) ? [hhmm, ...TIME_OPTIONS] : TIME_OPTIONS;
  const stepBase = value ?? 36.4;

  const step = (delta: number) => {
    const next = Math.round((stepBase + (value === null ? 0 : delta)) * 100) / 100;
    if (next >= BBT_MIN && next <= BBT_MAX) onValue(next);
  };

  const selectCls =
    "w-full rounded-lg bg-transparent py-1 text-sm font-semibold text-[#17152B] focus:outline-none focus:ring-1 focus:ring-pink-300";
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-[#68708A]";
  const stepCls =
    "flex size-8 items-center justify-center rounded-lg border border-[#F9D5E5] bg-[#FFF7FA] text-[#F43F8F] transition-all hover:bg-[#FFE4EF] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section
      aria-labelledby="follicular-bbt"
      className="flex w-full min-w-0 flex-col text-left"
    >
      <div className="mb-3.5 px-1">
        <h2 id="follicular-bbt" className="text-[clamp(1rem,0.9rem+0.45vw,1.3rem)] font-semibold leading-tight text-[#17152B]">
          Basal Body Temperature (BBT)
        </h2>
        <p className="mt-0.5 text-[11px] leading-tight text-[#68708A] sm:text-[11.5px]">Measured on waking</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Today's BBT reading */}
        <div className="flex flex-col justify-between rounded-[24px] border border-[#F9D5E5] bg-[#FFF7FA] p-3.5 sm:p-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#F43F8F]">
                TODAY&apos;S BBT READING
              </span>
              <span className="text-[10.5px] text-[#68708A]">Morning {hhmm ? to12h(hhmm) : "--:--"}</span>
            </div>

            <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-[#F1DDE8] bg-white p-3 shadow-[0px_1px_3px_rgba(173,149,178,0.10),0px_4px_14px_rgba(173,149,178,0.06)]">
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  min={BBT_MIN}
                  max={BBT_MAX}
                  value={text}
                  placeholder="--.--"
                  aria-label="Basal body temperature in degrees Celsius"
                  onChange={(e) => {
                    const t = e.target.value;
                    setText(t);
                    if (t.trim() === "") return onValue(null);
                    const n = parseFloat(t);
                    if (!Number.isNaN(n) && n >= BBT_MIN && n <= BBT_MAX) onValue(Math.round(n * 100) / 100);
                  }}
                  className="w-[5.5ch] min-w-0 bg-transparent text-[clamp(1.5rem,2vw,2rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[#17152B] [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-[16px] font-bold text-[#F43F8F]">°C</span>
              </div>

              <div className="flex flex-col gap-1">
                <button type="button" aria-label="Increase temperature" onClick={() => step(0.05)} disabled={stepBase + 0.05 > BBT_MAX} className={stepCls}>
                  <ChevronUp className="size-3.5" />
                </button>
                <button type="button" aria-label="Decrease temperature" onClick={() => step(-0.05)} disabled={stepBase - 0.05 < BBT_MIN} className={stepCls}>
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
              {BBT_PRESETS.map((val) => {
                const active = value !== null && Math.abs(value - val) < 0.02;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onValue(val)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                      active ? "bg-[#F43F8F] text-white" : "border border-gray-200 bg-white text-[#17152B] hover:bg-gray-50"
                    }`}
                  >
                    {val.toFixed(2)}°
                  </button>
                );
              })}
            </div>
          </div>

          {showRange && (
            <p className="border-t border-[#F9D5E5]/70 pt-1 text-[10.5px] leading-snug text-[#68708A]">
              <strong className="text-[#801543]">Pre-ovulatory range:</strong> Low &amp; steady (36.20°C – 36.50°C). A
              0.3°C – 0.5°C thermal shift marks ovulation.
            </p>
          )}
        </div>

        {/* Time, device, manual enter */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-[20px] border border-[#F9D5E5] bg-[#FFF7FA] px-4 py-2.5">
            <label htmlFor="bbt-time" className={labelCls}>TIME MEASURED</label>
            <select id="bbt-time" value={hhmm} onChange={(e) => onTime(e.target.value || null)} className={selectCls}>
              {!hhmm && <option value="">Select time</option>}
              {timeOptions.map((t) => (
                <option key={t} value={t}>{to12h(t)}</option>
              ))}
            </select>
          </div>

          <div className="rounded-[20px] border border-[#F9D5E5] bg-[#FFF7FA] px-4 py-2.5">
            <label htmlFor="bbt-device" className={labelCls}>DEVICE</label>
            <select id="bbt-device" value={device} onChange={(e) => setDevice(e.target.value)} className={selectCls}>
              {DEVICE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex min-h-[7rem] flex-1 flex-col rounded-[20px] border border-[#F9D5E5] bg-[#FFF7FA] px-4 py-2.5">
            <label htmlFor="bbt-notes" className={labelCls}>MANUAL ENTER</label>
            <textarea
              id="bbt-notes"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes / symptom trigger..."
              className="mt-1.5 min-h-0 w-full flex-1 resize-none rounded-xl border border-[#F1DDE8] bg-white px-3 py-2 text-xs text-[#17152B] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        </div>

        {aside}
      </div>
    </section>
  );
}

export function FollicularDailyLog({
  data,
  state,
  initialDay,
  onDateChange,
  onNavigate,
}: Props) {
  const today = localISODate();

  const [day, setDay] = useState(
    initialDay ?? state.date ?? today,
  );

  const [draft, setDraft] = useState<DailyLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The strip stays put while you pick days inside it; it only re-centres when the day leaves it.
  const [windowCenter, setWindowCenter] = useState(day);
  const dates = useMemo(
    () => buildDates(windowCenter),
    [windowCenter],
  );

  // Load the neighbouring days in the background, so the previous / next day opens instantly.
  useEffect(() => {
    prefetchDailyLog(addDays(day, -1));
    prefetchDailyLog(addDays(day, 1));
  }, [day]);

  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];

  const loadLog = useCallback(
    (signal: AbortSignal) =>
      getDailyLog(day, signal),
    [day],
  );

  const logRes = useAsync(loadLog);

  const loadPredictions = useCallback(
    (signal: AbortSignal) =>
      getPredictions(
        rangeStart,
        rangeEnd,
        signal,
      ),
    [rangeStart, rangeEnd],
  );

  const predRes = useAsync(loadPredictions);

  const loadMarks = useCallback(
    (signal: AbortSignal) =>
      getLogRange(
        rangeStart,
        rangeEnd,
        signal,
      ),
    [rangeStart, rangeEnd],
  );

  const marksRes = useAsync(loadMarks);

  const loadInsight = useCallback(
    (signal: AbortSignal) =>
      getPhaseInsight(day, signal),
    [day],
  );

  const insightRes = useAsync(loadInsight);

  const serverLog =
    logRes.data?.date === day
      ? logRes.data
      : null;

  const log =
    draft ??
    serverLog ??
    emptyLog(day);

  // onboardingDisclaimer (above the chips) + symptomInfo (notices for unknown / not-typical symptoms).
  const symptomExtra = symptomExtras(serverLog);

  const predicted =
    predRes.data?.days ?? [];

  const selectedInfo =
    predicted.find(
      (d) => d.date === day,
    ) ?? {
      date: day,
      phase: state.phase,
      cycleDay: state.cycleDay,
    };

  const cycleInfo =
    buildCycleInfo(predicted);

  const logged = new Set(
    (marksRes.data?.logs ?? []).map(
      (l) => l.date,
    ),
  );

  const update = <
    K extends keyof DailyLog
  >(
    key: K,
    value: DailyLog[K],
  ) => {
    setDraft((current) => ({
      ...(current ?? log),
      [key]: value,
    }));

    setMessage(null);
  };

  const chooseDay = (next: string) => {
    setDraft(null);
    setMessage(null);
    setError(null);

    if (!dates.includes(next)) setWindowCenter(next);
    setDay(next);
    onDateChange(next);
  };

  const persist = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveDailyLog(day, log);

      setDraft(null);

      setMessage(
        "Daily log saved.",
      );

      marksRes.refetch();
      logRes.refetch();
    } catch (err) {
      setError(firstFieldError(err));
    } finally {
      setSaving(false);
    }
  };

  const moveMonth = (delta: number) => {
    const d = new Date(
      `${day}T12:00:00`,
    );

    d.setMonth(
      d.getMonth() + delta,
    );

    chooseDay(toIso(d));
  };

  const phase =
    selectedInfo.phase;

  const insight =
    insightRes.data?.insight;

  // "unknown" (e.g. period very late) still gets every logging field; only the phase wording differs.
  const showFollicular =
    phase === "follicular" ||
    phase === "ovulation" ||
    phase === "unknown";

  // BBT, mucus, LH and libido always show on this screen.
  const showBbt = true;
  const showMucus = true;
  const showLh = true;
  const showLibido = true;

  if (logRes.status === "error") {
    return (
      <div className="animate-fade-up pb-12">
        <LutealShell
          data={data}
          state={state}
          active="daily-log"
          onNavigate={onNavigate}
        />

        <InfoCard live>
          {logRes.error?.message ??
            "Couldn't load this day."}{" "}

          <button
            type="button"
            onClick={logRes.refetch}
            className="font-semibold underline"
          >
            Try again
          </button>
        </InfoCard>
      </div>
    );
  }

  return (
    <div className="animate-fade-up pb-12">

      {/* PHASE NAVIGATION */}

      <LutealShell
        data={data}
        state={state}
        active="daily-log"
        onNavigate={onNavigate}
      />

      {/* CYCLE DAY STRIP */}

      <CycleDayStrip
        today={today}
        dates={dates}
        selectedDate={day}
        info={{
          cycleDay:
            selectedInfo.cycleDay,
          phase:
            selectedInfo.phase,
        }}
        cycleInfo={cycleInfo}
        isLogged={(d) =>
          logged.has(d)
        }
        onSelect={chooseDay}
        onToday={() =>
          chooseDay(today)
        }
        onShiftWeek={(n) =>
          chooseDay(
            addDays(day, n * 7),
          )
        }
        onShiftMonth={moveMonth}
      />

      {/* HEADER (same heading pattern as the Luteal and Menstrual daily logs) */}

      <div className="mt-5 pt-1">
        <h2 className="text-lu-title font-bold text-lu-ink">{PHASE_TITLE[phase]}</h2>
        <p className="mt-0.5 text-lu-body text-lu-ink-muted">
          {day === today ? "Today, " : ""}
          {longDate(day)}
        </p>
      </div>

      {/* AI INSIGHT */}

      <section className="mt-5 w-full rounded-[22px] border border-[#F3E8FF] bg-gradient-to-r from-[#F7F0FF] via-[#FBF3FC] to-[#FFF0F6] p-4 text-left shadow-2xs sm:p-5">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#8B5CF6]">
          <Sparkles className="size-3 text-[#9333EA]" />
          <span>AI WELLNESS INSIGHT</span>
        </div>

        <p className="mb-3 text-body font-normal text-ink">
          {insight?.summary ??
            (phase === "unknown"
              ? "We can't place this day in a cycle phase yet. Log how you feel and Ava can build a more useful insight once your cycle is clearer."
              : "Log a few follicular signs and Ava can build a more useful phase insight for you.")}
        </p>

        {insight?.tips?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {insight.tips.map((tip, idx) => (
              <span
                key={tip}
                className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-ink-muted shadow-2xs"
              >
                {idx === 0 ? (
                  <Zap className="size-3 fill-amber-500 text-amber-500" />
                ) : (
                  <TrendingUp className="size-3 text-[#F43F8F]" />
                )}
                <span>{tip}</span>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {showFollicular && (
        <div className="mt-5 flex flex-col gap-4 sm:gap-5">
          {/* BBT */}

          <div className={showBbt ? "contents" : "hidden"}>

          <BbtCard
            value={log.bbtCelsius}
            time={log.bbtTime}
            onValue={(v) => update("bbtCelsius", v)}
            onTime={(v) => update("bbtTime", v)}
            aside={<MedicationPanel day={day} variant="side" />}
            showRange={phase !== "unknown"}
          />
          </div>

          {/* MOOD + ENERGY */}

          <div className="order-1 grid gap-3.5 sm:gap-4 md:grid-cols-2">

            {/* MOOD CARD */}

            <section className="rounded-[24px] border border-[#F1DDE8]/70 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-[#FFF0F6]">
                      <img
                        src={moodHappy}
                        alt=""
                        className="size-7 object-contain"
                      />
                    </div>

                    <h2 className="text-body font-semibold text-ink">
                      Mood
                    </h2>
                  </div>

                  <p className="mt-1 text-[11px] text-ink-muted">
                    Select how you feel today
                  </p>
                </div>

                <span className="text-xs text-ink-muted">
                  ⓘ
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {MOODS.map(
                  (mood) => {
                    const image =
                      MOOD_IMAGES[mood];

                    const selected =
                      log.mood === mood;

                    return (
                      <button
                        key={mood}
                        type="button"
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          update(
                            "mood",
                            mood,
                          )
                        }
                        className={`flex min-h-[96px] flex-col items-center justify-center rounded-2xl border px-2 py-2 transition ${
                          selected
                            ? "border-[#F43F8F] bg-[#FFF1F7]"
                            : "border-[#F3D5E2] bg-white hover:bg-[#FFF8FB]"
                        }`}
                      >
                        {image && (
                          <img
                            src={image}
                            alt=""
                            className="mb-1 h-12 w-12 object-contain"
                          />
                        )}

                        <span
                          className={`text-xs font-semibold ${
                            selected
                              ? "text-[#F43F8F]"
                              : "text-ink-muted"
                          }`}
                        >
                          {mood}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </section>

            {/* ENERGY CARD */}

            <section className="rounded-[24px] border border-[#F1DDE8]/70 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#FFF0F6]">
                      <Zap className="size-4 fill-[#F43F8F] text-[#F43F8F]" />
                    </div>

                    <h2 className="text-body font-semibold text-ink">
                      Energy Level
                    </h2>
                  </div>

                  <p className="mt-1 text-[11px] text-ink-muted">
                    How is your energy today?
                  </p>
                </div>

                <span className="text-xs text-ink-muted">
                  ⓘ
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {ENERGIES.map(
                  (energy) => {
                    const selected =
                      log.energy === energy;

                    const iconColor =
                      energy === "Low"
                        ? "text-[#EC4899]"
                        : energy === "Moderate"
                          ? "text-[#F59E0B]"
                          : "text-[#EF4444]";

                    return (
                      <button
                        key={energy}
                        type="button"
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          update(
                            "energy",
                            energy,
                          )
                        }
                        className={`flex min-h-[96px] flex-col items-center justify-center rounded-2xl border px-2 py-2 transition ${
                          selected
                            ? "border-[#F43F8F] bg-[#FFF1F7]"
                            : "border-[#F3D5E2] bg-white hover:bg-[#FFF8FB]"
                        }`}
                      >
                        <Zap
                          className={`size-4 fill-current ${iconColor}`}
                        />

                        <span
                          className={`mt-2 text-xs font-semibold ${
                            selected
                              ? "text-[#F43F8F]"
                              : "text-ink"
                          }`}
                        >
                          {energy}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          </div>

          {/* CERVICAL MUCUS */}

          <div className={showMucus ? "contents" : "hidden"}>
          <section
            aria-labelledby="follicular-mucus"
            className="w-full rounded-[24px] border border-[#F1DDE8]/70 bg-white p-4 text-left shadow-xs sm:p-5"
          >
            <div className="mb-3.5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
                  <Droplets className="size-3.5 fill-[#F43F8F]" />
                </div>
                <div>
                  <h2 id="follicular-mucus" className="text-[clamp(1rem,0.9rem+0.45vw,1.3rem)] font-semibold leading-tight text-[#17152B]">
                    Cervical Mucus &amp; Discharge
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-tight text-[#68708A] sm:text-[11.5px]">
                    Key indicator of natural fertility and estrogen progression
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#F3E8FF] bg-[#FAF5FF] px-3 py-1 text-[11px] font-semibold text-[#8B5CF6] sm:self-auto">
                <Sparkles className="size-3 text-[#9333EA]" />
                <span>
                  {phase === "unknown" ? "Fertility" : "Follicular Phase"}:{" "}
                  {(log.cervicalMucus && MUCUS_META[log.cervicalMucus]?.fertility) || "Not logged"}
                </span>
              </div>
            </div>
            <div
              role="group"
              aria-label="Cervical mucus type"
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5"
            >
              {MUCUS.map((mucus) => {
                const selected = log.cervicalMucus === mucus;
                const image = MUCUS_IMAGE[mucus];
                const meta = MUCUS_META[mucus];

                const tagColor: Record<string, string> = {
                  Dry: "bg-gray-100 text-gray-600",
                  Sticky: "border border-amber-200 bg-amber-50 text-amber-700",
                  Creamy: "border border-pink-200 bg-[#FDF2F8] text-[#EC4899]",
                  Watery: "border border-blue-200 bg-blue-50 text-blue-700",
                  "Egg white": "border border-pink-200 bg-pink-50 text-pink-700",
                };

                return (
                  <button
                    key={mucus}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update("cervicalMucus", selected ? null : mucus)}
                    className={`relative flex min-h-[150px] flex-col items-center justify-between rounded-[20px] border p-3 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                      selected
                        ? "scale-[1.02] border-[#F43F8F] bg-[#FFF0F6] shadow-[0px_1px_3px_rgba(173,149,178,0.10),0px_4px_14px_rgba(173,149,178,0.06)] ring-2 ring-[#F43F8F]/20"
                        : "border-gray-100 bg-[#FCFCFD] shadow-[0px_1px_1px_rgba(23,21,43,0.03)] hover:bg-gray-50"
                    }`}
                  >
                    {selected && (
                      <div className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[#F43F8F]" />
                    )}

                    <div className="my-1 flex size-12 shrink-0 items-center justify-center sm:size-14">
                      <img src={image} alt="" className="h-full w-full object-contain" />
                    </div>

                    <div>
                      <span
                        className={`block text-[13px] font-bold leading-tight ${
                          selected ? "text-[#17152B]" : "text-gray-800"
                        }`}
                      >
                        {mucus === "Egg white" ? "Egg White" : mucus}
                      </span>
                      <span className="mb-2 mt-0.5 block text-[10px] leading-tight text-[#68708A]">
                        {meta.subtitle}
                      </span>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold leading-tight ${tagColor[mucus] ?? ""}`}
                      >
                        {meta.fertility}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          </div>

          {/* LH + LIBIDO */}

          <div className="order-2 grid items-stretch gap-3.5 text-left sm:gap-4 md:grid-cols-2">
            {/* LH / OVULATION TEST */}
            <div className={showLh ? "contents" : "hidden"}>
              <section className="flex flex-col justify-between rounded-[24px] border border-[#F1DDE8]/70 bg-white p-4 shadow-xs sm:p-5">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
                        <TestTube className="size-3.5" />
                      </div>
                      <h2 className="text-[clamp(0.9rem,1vw,1.05rem)] font-semibold leading-tight text-[#17152B]">
                        LH / Ovulation Test
                      </h2>
                    </div>
                    <span className="text-right text-[10.5px] text-[#68708A]">OPK Strip Tracker</span>
                  </div>

                  <p className="mb-3 text-[11px] text-[#68708A]">
                    Log your daily ovulation predictor kit test line intensity:
                  </p>

                  <div role="group" aria-label="LH ovulation test result" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { value: "Negative", range: "< 10 mIU", opacity: 0, peak: false },
                      { value: "Low", range: "10–25 mIU", opacity: 0.4, peak: false },
                      { value: "High", range: "25–40 mIU", opacity: 0.75, peak: false },
                      { value: "Peak", range: "≥ 40 mIU", opacity: 1, peak: true },
                    ].map((item) => {
                      const selected = log.lhTest === item.value;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            update("lhTest", selected ? null : (item.value as DailyLog["lhTest"]))
                          }
                          className={`flex min-h-[92px] flex-col items-center justify-between rounded-[18px] border p-2.5 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                            selected
                              ? "scale-[1.02] border-[#F43F8F] bg-[#FFF0F6] shadow-[0px_1px_3px_rgba(173,149,178,0.10),0px_4px_14px_rgba(173,149,178,0.06)]"
                              : "border-gray-200/80 bg-[#F9FAFB] hover:bg-gray-100"
                          }`}
                        >
                          <div className="mb-1.5 flex h-3.5 w-10 items-center justify-around rounded border border-gray-200 bg-white px-1 shadow-[0px_1px_1px_rgba(23,21,43,0.03)]">
                            <div className="h-2.5 w-1 rounded-full bg-[#F43F8F]" />
                            <div
                              className="h-2.5 w-1 rounded-full transition-opacity"
                              style={{
                                opacity: item.opacity,
                                backgroundColor: item.peak ? "#BE185D" : "#F43F8F",
                              }}
                            />
                          </div>

                          <div>
                            <span
                              className={`block text-[12.5px] font-bold leading-tight ${
                                selected ? "text-[#F43F8F]" : "text-[#17152B]"
                              }`}
                            >
                              {item.value}
                            </span>
                            <span className="mt-0.5 block text-[10px] leading-tight text-[#68708A]">
                              {item.range}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 border-t border-[#F1DDE8]/50 pt-2.5 text-[10.5px] text-[#68708A]">
                  <AlertCircle className="size-3.5 shrink-0 text-pink-400" />
                  <span>Peak LH stimulates egg release within 24 to 36 hours.</span>
                </div>
              </section>
            </div>

            {/* LIBIDO */}
            <div className={showLibido ? "contents" : "hidden"}>
              <section className="flex flex-col justify-between rounded-[24px] border border-[#F1DDE8]/70 bg-white p-4 shadow-xs sm:p-5">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
                        <Flame className="size-3.5 fill-[#F43F8F]" />
                      </div>
                      <h2 className="text-[clamp(0.9rem,1vw,1.05rem)] font-semibold leading-tight text-[#17152B]">
                        Libido &amp; Desire Level
                      </h2>
                    </div>
                    <span className="text-right text-[10.5px] text-[#68708A]">Estrogen Peak Metric</span>
                  </div>

                  <p className="mb-3 text-[11px] text-[#68708A]">
                    Track your natural sex drive and vitality throughout the cycle:
                  </p>

                  <div role="group" aria-label="Libido and desire level" className="grid grid-cols-3 gap-2">
                    {[
                      { value: "Low", description: "Calm & resting", icon: <Heart className="size-4 text-purple-400" /> },
                      { value: "Medium", description: "Moderate desire", icon: <Sparkles className="size-4 text-pink-500" /> },
                      { value: "High", description: "Surging drive", icon: <Flame className="size-4 fill-rose-500 text-rose-500" /> },
                    ].map((item) => {
                      const selected = log.libido === item.value;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            update("libido", selected ? null : (item.value as DailyLog["libido"]))
                          }
                          className={`flex min-h-[92px] flex-col items-center justify-between rounded-[18px] border p-3 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                            selected
                              ? "scale-[1.02] border-[#F43F8F] bg-[#FFF0F6] shadow-[0px_1px_3px_rgba(173,149,178,0.10),0px_4px_14px_rgba(173,149,178,0.06)]"
                              : "border-gray-200/80 bg-[#F9FAFB] hover:bg-gray-100"
                          }`}
                        >
                          <div className="mb-1">{item.icon}</div>

                          <div>
                            <span
                              className={`block text-[12.5px] font-bold leading-tight ${
                                selected ? "text-[#F43F8F]" : "text-[#17152B]"
                              }`}
                            >
                              {item.value}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] leading-tight text-[#68708A]">
                              {item.description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 border-t border-[#F1DDE8]/50 pt-2.5 text-[10.5px] text-[#68708A]">
                  <Sparkles className="size-3.5 shrink-0 text-pink-400" />
                  <span>
                    {phase === "unknown"
                      ? "Libido varies through the cycle."
                      : "Libido naturally surges as estrogen rises towards ovulation."}
                  </span>
                </div>
              </section>
            </div>
</div>

          {/* SYMPTOM TRACKING + INTERCOURSE
              Mood/energy (order-1) and LH/libido (order-2) are ordered in this flex column, so an
              un-ordered sibling (order-0) would be pulled above them. order-3 keeps these two last. */}
          <div className="order-3 flex flex-col gap-4 sm:gap-5">
            <SymptomTracking
              key={`symptoms-${day}`}
              options={FOLLICULAR_SYMPTOMS}
              phaseLabel={phase === "unknown" ? "Symptoms" : "Follicular Phase symptoms"}
              symptoms={log.symptoms}
              other={log.customSymptom ?? ""}
              severity={log.painScore}
              disclaimer={symptomExtra.disclaimer}
              notices={symptomExtra.notices}
              onSymptoms={(next) => update("symptoms", next as SymptomKey[])}
              onOther={(text) => update("customSymptom", text)}
              onSeverity={(n) => update("painScore", n)}
            />

            <IntercourseSection
              intercourse={log.intercourse}
              protection={log.protection ?? null}
              details={log.notes ?? ""}
              onIntercourse={(v) => update("intercourse", v)}
              onProtection={(v) => update("protection", v)}
              onDetails={(v) => update("notes", v === "" ? null : v)}
            />
          </div>
        </div>
      )}

      {!showFollicular && (
        <div className="mt-5">
          <MedicationPanel day={day} variant="follicular" />
        </div>
      )}

      {error && (
        <InfoCard live>
          {error}
        </InfoCard>
      )}

      {message && (
        <p
          role="status"
          className="mt-4 rounded-full bg-[#F0FDF4] px-4 py-2 text-sm font-semibold text-[#15803D]"
        >
          {message}
        </p>
      )}

      {/* SAVE */}

      <div className="mt-5 flex items-center justify-end pb-2">
        <button
          type="button"
          onClick={() =>
            void persist()
          }
          disabled={
            saving ||
            logRes.status ===
              "loading"
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F472B6] px-10 py-3 text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(244,114,182,0.35)] transition-all hover:bg-[#EC4899] focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-200 active:scale-95 disabled:opacity-60 sm:w-auto sm:px-12 sm:text-[16px]"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}

          {saving
            ? "Saving…"
            : "Save log"}
        </button>

        
      </div>

      <p className="mt-2 text-right text-caption text-ink-muted">
        Your log is saved to the Django backend.
      </p>
    </div>
  );
}