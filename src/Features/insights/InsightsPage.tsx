// frontend/periods-onboarding/src/Features/insights/InsightsPage.tsx
// Insights page in the trend-analysis design, shared by every phase.
// Rule: nothing is invented. Each card plots only what the user logged (daily log + period history);
// the numbers on screen are plain maths over that data. Ava's text comes from the existing /insights/phase API.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Activity, CalendarDays, Check, ChevronDown, ChevronRight, Download, Droplet, Eye, Heart, Maximize2, Moon, Sparkles, Target, Thermometer, TrendingDown, TrendingUp, X } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useCycleHistory } from "../../hooks/useCycleHistory";
import { addDays, parseIso, toIso } from "../../lib/isoDate";
import { localISODate, type CycleState } from "../../services/cycle";
import { getPhaseInsight } from "../../services/insights";
import { SYMPTOMS, getLogRange, type DailyLog } from "../../services/logs";
import { fmtDate } from "../dashboard/phases";
import { downloadCsv } from "../dashboard/trends/csv";
import { cyclePoints, periodPoints, stats } from "../dashboard/trends/trendStats";
import { fertileWindow } from "../phases/ovulation/fertility";
import { DEFAULT_STEP_GOAL, WATER_TARGET_ML } from "../phases/shared/daily-log/constants";
import moodCalm from "../../assets/phases/follicular/mood_calm.png";
import moodHappy from "../../assets/phases/follicular/mood_happy.png";
import moodIrritable from "../../assets/phases/follicular/mood_irritable.png";
import moodNeutral from "../../assets/phases/follicular/mood_neutral.png";
import moodSad from "../../assets/phases/follicular/mood_sad.png";
import { RangeCalendar } from "./RangeCalendar";
import { BarChart, HeatmapLegend, LineChart, RingGauge, SymptomHeatmap, niceScale } from "./InsightCharts";

// ---------------------------------------------------------------- constants
const PURPLE = "#6C4DE8";
const PINK = "#F34F97";
const CARD = "rounded-[28px] border border-[#F1DDE8] bg-white shadow-[0_10px_34px_-12px_rgb(190_120_220/0.22)]";

/** A sentence made of plain and bold segments. */
type InsightSentence = (string | { bold: string })[];
interface StatCard {
  label: string;
  value: string;
  dot: string;
}
const DOTS = ["#F34F97", "#6C4DE8", "#0ea5e9", "#22c55e"];

type Category = "cycle" | "symptoms" | "fertility" | "lifestyle" | "hormones";
type Filter = "all" | Category;
type Tint = "pink" | "purple" | "blue" | "green" | "orange" | "red";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All Metrics" },
  { id: "cycle", label: "Cycle" },
  { id: "symptoms", label: "Symptoms" },
  { id: "fertility", label: "Fertility" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "hormones", label: "Hormones" },
];
const WINDOWS = [7, 14, 30, 90] as const;
type CycleRange = { kind: "cycles"; n: 3 | 6 | 12 } | { kind: "months"; n: 6 | 12 } | { kind: "custom"; from: string; to: string };
const DEFAULT_CYCLE_RANGE: CycleRange = { kind: "cycles", n: 12 };

const addMonthsIso = (iso: string, n: number) => {
  const d = parseIso(iso);
  d.setMonth(d.getMonth() + n);
  return toIso(d);
};

function pickCycleRange<T extends { startDate: string }>(points: T[], range: CycleRange, today: string): T[] {
  if (range.kind === "cycles") return points.slice(-range.n);
  const from = range.kind === "months" ? addMonthsIso(today, -range.n) : range.from;
  const to = range.kind === "months" ? today : range.to;
  return points.filter((p) => p.startDate >= from && p.startDate <= to);
}

const cycleRangeLabel = (range: CycleRange) =>
  range.kind === "cycles" ? `Last ${range.n} Cycles` : range.kind === "months" ? `Last ${range.n} Months` : `${fmtDate(range.from)} \u2013 ${fmtDate(range.to)}`;
const TINTS: Record<Tint, string> = { pink: "#FFF0F6", purple: "#ece6ff", blue: "#e3f0ff", green: "#dff7e9", orange: "#ffefdc", red: "#ffe6e6" };

const FLOW_LEVEL = { Spotting: 1, Light: 2, Medium: 3, Heavy: 4 } as const;
const CRAMPS_LEVEL = { None: 0, Mild: 1, Moderate: 2, Severe: 3 } as const;
const CRAMPS_NAMES = ["None", "Mild", "Moderate", "Severe"];
const FLOW_NAMES = ["None", "Spot", "Light", "Med", "Heavy"];
const MOOD_SCORE = { Sad: 1, Irritable: 2, Neutral: 3, Calm: 4, Happy: 5 } as const;
const SLEEP_SCORE = { Poor: 1, Fair: 2, Good: 3, Excellent: 4 } as const;
const SLEEP_NAMES = ["", "Poor", "Fair", "Good", "Excellent"];
const LH_SCORE = { Negative: 0, Low: 1, High: 2, Peak: 3 } as const;
const LH_NAMES = ["Neg", "Low", "High", "Peak"];
const MOOD_FACES = [
  { label: "Sad", src: moodSad },
  { label: "Irritable", src: moodIrritable },
  { label: "Neutral", src: moodNeutral },
  { label: "Calm", src: moodCalm },
  { label: "Happy", src: moodHappy },
];

// ---------------------------------------------------------------- small helpers
const round1 = (n: number) => Math.round(n * 10) / 10;
/** "Jun 13, 2026" for chart tooltips. */
const longDate = (iso: string) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const mean = (a: number[]) => (a.length ? round1(a.reduce((s, v) => s + v, 0) / a.length) : null);
const diffDays = (from: string, to: string) => Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86_400_000);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const signed = (n: number, digits = 1) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
/** Latest value minus the average of the earlier ones; null with fewer than 2 values. */
const changeOf = (values: number[]) => (values.length < 2 ? null : (values[values.length - 1] ?? 0) - (mean(values.slice(0, -1)) ?? 0));

// ---------------------------------------------------------------- health score
// Wellness score from what the user logged: pure maths, no AI. Same inputs always give the same score.
// Rules: (1) not logging never lowers the score, a factor without enough data is left out and the rest are re-weighted;
// (2) a number shows only when factors with data carry at least MIN_SCORED_WEIGHT of the 100 weight;
// (3) every factor reports the real numbers behind it. Wellness indicator, not a diagnosis.
type FactorId = "regularity" | "period" | "symptoms" | "sleep" | "hydration" | "activity";

interface HealthFactor {
  id: FactorId;
  label: string;
  /** Share of the total score when every factor has data (the weights add up to 100). */
  weight: number;
  /** 0-100, or null when there is not enough logged data yet. */
  score: number | null;
  /** What this factor looks at. */
  description: string;
  /** The real numbers behind `score`; null when `score` is null. */
  detail: string | null;
  /** What to log to unlock this factor; null once it has a score. */
  needs: string | null;
  /** Gain-ranked advice, only set when the factor is scored and has room to improve. */
  tip: string | null;
}

type HealthLabel = "Excellent" | "Good" | "Fair" | "Room to improve" | "Not enough data";

interface HealthScore {
  /** 0-100, or null while fewer factors than MIN_SCORED_WEIGHT allows have data. */
  score: number | null;
  label: HealthLabel;
  note: string;
  factors: HealthFactor[];
  scoredCount: number;
  totalCount: number;
  /** Up to 3 suggestions, biggest possible gain first. */
  tips: string[];
}

interface HealthScoreInput {
  /** Cycle lengths in days, one per logged cycle (the last 12 are enough). Invalid values are ignored. */
  cycleLengths: number[];
  /** Period lengths in days, one per logged period. Invalid values are ignored. */
  periodLengths: number[];
  /** Daily logs inside the selected window. */
  logs: DailyLog[];
  /** Length of the selected window; sets how many logged days a daily factor needs. */
  windowDays: number;
  stepGoal?: number;
  waterTargetMl?: number;
}

/** A number is shown only when factors carrying at least this much of the 100 weight have data. */
const MIN_SCORED_WEIGHT = 40;
/** Cycle and period ranges used across the app. */
const TYPICAL_CYCLE_DAYS = { min: 21, max: 35 } as const;
const TYPICAL_PERIOD_DAYS = { min: 3, max: 7 } as const;

const WEIGHTS: Record<FactorId, number> = { regularity: 30, period: 15, symptoms: 20, sleep: 15, hydration: 10, activity: 10 };
const SLEEP_POINTS = { Poor: 25, Fair: 50, Good: 80, Excellent: 100 } as const;
const MOOD_POINTS = { Sad: 25, Irritable: 40, Neutral: 65, Calm: 85, Happy: 100 } as const;
const CRAMPS_POINTS = { None: 100, Mild: 70, Moderate: 40, Severe: 10 } as const;
const SLEEP_BY_RANK = ["Poor", "Fair", "Good", "Excellent"] as const;

const clampN = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const meanOf = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const valid = (n: number) => Number.isFinite(n) && n > 0;

function sampleSd(values: number[]): number {
  const m = meanOf(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

/** Linear interpolation through [x, y] points sorted by x; flat outside the first and last point. */
function interpolate(x: number, points: readonly (readonly [number, number])[]): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

/** Standard deviation of cycle length (days) -> 0-100. 2 and 5 days are the app's own "very consistent" / "some variation" cut-offs. */
const SD_TO_SCORE = [[2, 100], [5, 70], [10, 25], [14, 0]] as const;

/** One log per date; if the API ever repeats a date, the last one wins. */
function uniqueByDate(logs: DailyLog[]): DailyLog[] {
  return [...new Map(logs.map((l) => [l.date, l])).values()];
}

/** Minimum logged days a daily factor needs: half the window, between 4 and 5 days. */
function minDaysFor(windowDays: number): number {
  return clampN(Math.ceil(windowDays / 2), 4, 5);
}

function lockedFactor(id: FactorId, label: string, description: string, needs: string): HealthFactor {
  return { id, label, weight: WEIGHTS[id], score: null, description, detail: null, needs, tip: null };
}

function scoredFactor(id: FactorId, label: string, description: string, score: number, detail: string, tip: string | null): HealthFactor {
  return { id, label, weight: WEIGHTS[id], score: Math.round(clampN(score)), description, detail, needs: null, tip: score < 75 ? tip : null };
}

function computeHealthScore(input: HealthScoreInput): HealthScore {
  const stepGoal = input.stepGoal && input.stepGoal > 0 ? input.stepGoal : DEFAULT_STEP_GOAL;
  const waterGoalMl = input.waterTargetMl && input.waterTargetMl > 0 ? input.waterTargetMl : WATER_TARGET_ML;
  const logs = uniqueByDate(input.logs);
  const minDays = minDaysFor(input.windowDays);
  const cycles = input.cycleLengths.filter(valid);
  const periods = input.periodLengths.filter(valid);
  const factors: HealthFactor[] = [];

  // ---- cycle regularity: steadiness of cycle length (70%) and share of cycles inside the typical range (30%)
  const regDesc = "How steady your cycle length is across your logged cycles.";
  if (cycles.length >= 3) {
    const sd = round1(sampleSd(cycles));
    const inRange = cycles.filter((c) => c >= TYPICAL_CYCLE_DAYS.min && c <= TYPICAL_CYCLE_DAYS.max).length;
    const score = 0.7 * interpolate(sd, SD_TO_SCORE) + 0.3 * (inRange / cycles.length) * 100;
    factors.push(
      scoredFactor("regularity", "Cycle Regularity", regDesc, score, `Cycle length varies by about ±${sd} days across ${cycles.length} cycles; ${inRange} of ${cycles.length} were ${TYPICAL_CYCLE_DAYS.min}-${TYPICAL_CYCLE_DAYS.max} days.`, `Your cycle length varies by about ±${sd} days. Log every period start so each cycle is measured correctly.`),
    );
  } else {
    factors.push(lockedFactor("regularity", "Cycle Regularity", regDesc, "Log 3 or more cycles"));
  }

  // ---- period length: average distance outside the typical 3-7 day range
  const perDesc = `How close your average period length is to the usual ${TYPICAL_PERIOD_DAYS.min} to ${TYPICAL_PERIOD_DAYS.max} day range.`;
  if (periods.length >= 2) {
    const avg = round1(meanOf(periods));
    const outside = avg < TYPICAL_PERIOD_DAYS.min ? TYPICAL_PERIOD_DAYS.min - avg : avg > TYPICAL_PERIOD_DAYS.max ? avg - TYPICAL_PERIOD_DAYS.max : 0;
    factors.push(
      scoredFactor("period", "Period Length", perDesc, 100 - outside * 20, `Your ${periods.length} logged periods average ${avg} days.`, `Your periods average ${avg} days. If this stays outside ${TYPICAL_PERIOD_DAYS.min}-${TYPICAL_PERIOD_DAYS.max} days, consider mentioning it to a healthcare professional.`),
    );
  } else {
    factors.push(lockedFactor("period", "Period Length", perDesc, "Log 2 or more periods with an end date"));
  }

  // ---- symptoms & mood: per day, the average of the mood score and the pain score (pain 0-10, else cramps level)
  const symDesc = "How your logged mood and pain looked on the days you recorded them.";
  const dayScores = logs.flatMap((l) => {
    const parts: number[] = [];
    if (l.mood) parts.push(MOOD_POINTS[l.mood]);
    if (l.painScore !== null && Number.isFinite(l.painScore)) parts.push(100 - clampN(l.painScore, 0, 10) * 10);
    else if (l.cramps) parts.push(CRAMPS_POINTS[l.cramps]);
    return parts.length ? [meanOf(parts)] : [];
  });
  if (dayScores.length >= minDays) {
    factors.push(
      scoredFactor("symptoms", "Symptoms & Mood", symDesc, meanOf(dayScores), `Based on mood and pain on ${dayScores.length} logged days.`, "Your logged mood and pain pulled this down. Check the Mood and Pain trends to see which days are hardest."),
    );
  } else {
    factors.push(lockedFactor("symptoms", "Symptoms & Mood", symDesc, `Log mood or pain on ${minDays}+ days`));
  }

  // ---- sleep: Poor 25, Fair 50, Good 80, Excellent 100
  const sleepDesc = "The sleep quality you logged.";
  const sleepDays = logs.flatMap((l) => (l.sleep ? [SLEEP_POINTS[l.sleep]] : []));
  if (sleepDays.length >= minDays) {
    const avg = meanOf(sleepDays);
    const rank = SLEEP_BY_RANK[Math.min(3, Math.max(0, Math.round((avg - 25) / 25)))]!;
    factors.push(scoredFactor("sleep", "Sleep", sleepDesc, avg, `Average sleep quality "${rank}" over ${sleepDays.length} logged nights.`, `Your logged sleep averaged "${rank}". A regular sleep schedule can help.`));
  } else {
    factors.push(lockedFactor("sleep", "Sleep", sleepDesc, `Log sleep on ${minDays}+ days`));
  }

  // ---- hydration: each logged day counts up to the goal, so drinking more than the goal gives no extra credit
  const waterDesc = `Water logged against your ${(waterGoalMl / 1000).toFixed(1)} L daily goal.`;
  const waterDays = logs.flatMap((l) => (l.waterMl !== null && Number.isFinite(l.waterMl) && l.waterMl >= 0 ? [l.waterMl] : []));
  if (waterDays.length >= minDays) {
    const avgL = round1(meanOf(waterDays) / 1000);
    const score = meanOf(waterDays.map((ml) => Math.min(ml / waterGoalMl, 1))) * 100;
    factors.push(scoredFactor("hydration", "Hydration", waterDesc, score, `Averaged ${avgL} L a day over ${waterDays.length} logged days.`, `You averaged ${avgL} L a day against a ${(waterGoalMl / 1000).toFixed(1)} L goal.`));
  } else {
    factors.push(lockedFactor("hydration", "Hydration", waterDesc, `Log water on ${minDays}+ days`));
  }

  // ---- activity: same capped rule as hydration
  const stepsDesc = `Steps logged against your ${stepGoal.toLocaleString("en-US")} daily goal.`;
  const stepDays = logs.flatMap((l) => (l.steps !== null && Number.isFinite(l.steps) && l.steps >= 0 ? [l.steps] : []));
  if (stepDays.length >= minDays) {
    const avg = Math.round(meanOf(stepDays));
    const score = meanOf(stepDays.map((s) => Math.min(s / stepGoal, 1))) * 100;
    factors.push(scoredFactor("activity", "Activity", stepsDesc, score, `Averaged ${avg.toLocaleString("en-US")} steps a day over ${stepDays.length} logged days.`, `You averaged ${avg.toLocaleString("en-US")} steps a day against a ${stepGoal.toLocaleString("en-US")} goal.`));
  } else {
    factors.push(lockedFactor("activity", "Activity", stepsDesc, `Log steps on ${minDays}+ days`));
  }

  // ---- combine: weighted average over the factors that have data
  const withData = factors.filter((f) => f.score !== null);
  const usedWeight = withData.reduce((s, f) => s + f.weight, 0);
  const base = { factors, scoredCount: withData.length, totalCount: factors.length };

  if (usedWeight < MIN_SCORED_WEIGHT) {
    return { ...base, score: null, label: "Not enough data", note: "Keep logging to unlock your score. Nothing is lowered for days you did not log.", tips: unlockTips(factors) };
  }

  const score = Math.round(withData.reduce((s, f) => s + (f.score ?? 0) * f.weight, 0) / usedWeight);
  const label: HealthLabel = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Room to improve";
  const lead =
    label === "Excellent" ? "Your logged patterns look very healthy." : label === "Good" ? "Your logged patterns are in a good range. A few areas can be improved." : label === "Fair" ? "Some of your logged patterns have room to improve." : "Several of your logged patterns have room to improve.";
  const limited = usedWeight < 60 ? ` Based on ${withData.length} of ${factors.length} factors so far; it gets more accurate as you log.` : "";

  // rank by how many score points each factor could still add
  const ranked = withData
    .filter((f) => f.tip !== null)
    .map((f) => ({ tip: f.tip as string, gain: (f.weight / usedWeight) * (100 - (f.score ?? 0)) }))
    .sort((a, b) => b.gain - a.gain)
    .map((x) => x.tip);
  const tips = [...ranked, ...unlockTips(factors)].slice(0, 3);

  return { ...base, score, label, note: lead + limited, tips: tips.length ? tips : ["Keep logging regularly so your score stays accurate."] };
}

/** "Log X" hints for factors that are still locked, most valuable (highest weight) first. */
function unlockTips(factors: HealthFactor[]): string[] {
  return factors
    .filter((f) => f.score === null && f.needs)
    .sort((a, b) => b.weight - a.weight)
    .map((f) => `${f.needs} to add ${f.label} to your score.`);
}

// ---------------------------------------------------------------- symptom heatmap rows
/** Most rows the heatmap card draws; the CSV download has all of them. */
const HEAT_MAX_ROWS = 12;
/** From GET /v1/logs: every symptom text in the range -> its symptom key and label. */
type SymptomIndex = Record<string, { key: string; label: string }>;

/** "backPain", "back_pain" and "Back  pain" are one symptom (same rule as the backend symptom catalog). */
const symptomKey = (text: string) =>
  text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-/]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Label used when the backend index is missing: ids like "back_pain" become "Back pain", typed text stays as typed. */
function fallbackSymptomLabel(raw: string): string {
  const known = SYMPTOMS.find((s) => symptomKey(s.id) === symptomKey(raw) || symptomKey(s.label) === symptomKey(raw));
  if (known) return known.label;
  const text = /^[A-Za-z0-9_]+$/.test(raw) ? symptomKey(raw) : raw.trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One row per distinct symptom the user logged on the given dates, most frequent first. levels: 1 = logged that day. */
function buildHeatRows(logs: DailyLog[], dates: string[], index?: SymptomIndex): { symptom: string; levels: number[] }[] {
  const byDate = new Map(logs.map((l) => [l.date, l.symptoms ?? []]));
  const rows = new Map<string, { symptom: string; levels: number[] }>();
  dates.forEach((date, col) => {
    for (const raw of byDate.get(date) ?? []) {
      if (typeof raw !== "string") continue;
      const hit = index?.[raw];
      const id = hit?.key ?? symptomKey(raw);
      if (!id) continue;
      const row = rows.get(id) ?? { symptom: hit?.label ?? fallbackSymptomLabel(raw), levels: dates.map(() => 0) };
      row.levels[col] = 1;
      rows.set(id, row);
    }
  });
  const days = (r: { levels: number[] }) => r.levels.filter(Boolean).length;
  return [...rows.values()].sort((a, b) => days(b) - days(a) || a.symptom.localeCompare(b.symptom));
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

// ---------------------------------------------------------------- view pieces
function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-[#17152B]">{children}</strong>;
}

function Legend({ items, children }: { items: { label: string; color: string; dashed?: boolean }[]; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8A92A6] xl:text-xs">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={item.dashed ? "h-0 w-3 border-t-2 border-dashed" : "size-2 rounded-full"}
            style={item.dashed ? { borderColor: item.color } : { backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="grid min-h-[140px] flex-1 place-items-center rounded-2xl border border-dashed border-[#F1DDE8] bg-white/70 p-4 text-center text-xs text-[#8A92A6] md:text-[13px]">{children}</p>;
}

interface CardSpec {
  id: string;
  title: string;
  subtitle: string;
  categories: Category[];
  tint: Tint;
  insight: string;
  insightTitle?: string;
  fullWidth?: boolean;
  csv: () => (string | number)[][];
  render: (height: number, expanded?: boolean) => ReactNode;
}

function TrendCard({ spec, onExpand }: { spec: CardSpec; onExpand: () => void }) {
  const action = "grid size-11 place-items-center rounded-full text-[#8A92A6] transition-colors hover:bg-[#f1edff] hover:text-[#6C4DE8]";
  return (
    <article className={`${CARD} relative flex min-w-0 flex-col overflow-hidden p-5 sm:p-6 ${spec.fullWidth ? "md:col-span-2 xl:col-span-3" : ""}`}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 100% 0%, ${TINTS[spec.tint]} 0%, transparent 55%)` }} aria-hidden="true" />
      <div className="relative flex flex-1 flex-col">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[#17152B] md:text-[15px] xl:text-base">{spec.title}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f1edff] px-2 py-0.5 text-[10px] font-semibold text-[#6C4DE8] xl:text-[11px]">
                <Sparkles className="size-2.5" aria-hidden="true" />
                Insight
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#8A92A6] md:text-xs">{spec.subtitle}</p>
          </div>
          <div className="-mt-2.5 -mr-3.5 -mb-2 flex shrink-0 items-center">
            <button type="button" onClick={() => downloadCsv(`${slug(spec.title)}.csv`, spec.csv())} aria-label={`Download ${spec.title} data`} className={action}>
              <Download className="size-[15px]" aria-hidden="true" />
            </button>
            <button type="button" onClick={onExpand} aria-label={`Expand ${spec.title}`} className={action}>
              <Maximize2 className="size-[15px]" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="mt-3 flex flex-1 flex-col">{spec.render(250)}</div>
        <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#f1edff]/70 p-3 text-xs text-[#68708A] md:text-[13px]">
          <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-white text-[#6C4DE8]" aria-hidden="true">
            <Sparkles className="size-3" />
          </span>
          <span>
            {spec.insightTitle && <strong className="block font-semibold text-[#17152B]">{spec.insightTitle}</strong>}
            {spec.insight}
          </span>
        </p>
      </div>
    </article>
  );
}

function Overlay({ label, onClose, wide, side, children }: { label: string; onClose: () => void; wide?: boolean; side?: boolean; children: ReactNode }) {
  useEscape(onClose);

  // Lock the page behind the dialog while it is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Portal to <body>: an ancestor with a CSS animation/transform turns `fixed` into "fixed inside that ancestor",
  // which pushed the dialog far down the page.
  return createPortal(
    <div
      className={`fixed inset-0 z-[100] ${side ? "flex items-start justify-end bg-[#2a1f4a]/35 p-2 backdrop-blur-[6px] sm:p-5" : "grid place-items-center bg-[#17152B]/40 p-4 backdrop-blur-[2px]"}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative w-full overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_24px_60px_-16px_rgb(80_40_140/0.35)] ${
          side ? "max-h-[calc(100dvh-1rem)] max-w-[516px] sm:max-h-[calc(100dvh-2.5rem)] sm:p-6" : `max-h-[90dvh] ${wide ? "max-w-[1060px] sm:p-8" : "max-w-3xl sm:p-7"}`
        }`}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid size-11 place-items-center rounded-full text-[#8A92A6] hover:bg-[#f1edff] hover:text-[#6C4DE8]">
          <X className="size-4" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- range menu (pill + presets + custom calendar)
interface RangeOption {
  id: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
}

function RangeMenu({
  label,
  options,
  calendar,
}: {
  label: string;
  options: RangeOption[];
  calendar?: { today: string; start: string; end: string; active: boolean; onApply: (from: string, to: string) => void };
}) {
  const [view, setView] = useState<"closed" | "menu" | "calendar">("closed");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties>({ visibility: "hidden" });

  // The popover is portaled to <body> with fixed positioning, so it floats above the modal
  // instead of growing the modal's scroll area (that was the cause of the scrollbar).
  const place = useCallback(() => {
    const btn = ref.current;
    const pop = popRef.current;
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect();
    const margin = 8;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.max(margin, Math.min(r.right - w, window.innerWidth - w - margin));
    let top = r.bottom + 12;
    if (top + h > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - h - margin);
    setPos({ position: "fixed", top, left, visibility: "visible" });
  }, []);

  useLayoutEffect(() => {
    if (view === "closed") return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [view, place]);

  // Close on outside click or Escape (Escape must not also close a modal behind this menu).
  useEffect(() => {
    if (view === "closed") return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !popRef.current?.contains(t)) setView("closed");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setView("closed");
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [view]);

  const draftEnd = draftTo || draftFrom;
  const draftValid = !!calendar && !!draftFrom && draftFrom <= draftEnd && draftEnd <= calendar.today && addDays(draftFrom, 365) >= draftEnd;
  const popover = "z-[110] border border-[#F34F97]/15 bg-white shadow-[0_24px_60px_-16px_rgb(80_40_140/0.35)]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={view !== "closed"}
        onClick={() => setView((v) => (v === "closed" ? "menu" : "closed"))}
        className="flex h-11 w-full items-center gap-2.5 rounded-full border border-[#F34F97]/25 bg-[#FFF0F6]/40 px-4 text-xs font-medium text-[#17152B] transition-colors hover:bg-[#FFF0F6] sm:w-auto sm:min-w-[210px] md:text-[13px]"
      >
        <CalendarDays className="size-[18px] text-[#F34F97]" aria-hidden="true" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className="size-4 text-[#68708A]" aria-hidden="true" />
      </button>

      {view === "menu" && createPortal(
        <div ref={popRef} style={pos} role="menu" aria-label="Trend range" className={`${popover} w-[min(232px,calc(100vw-3rem))] rounded-[24px] p-2`}>
          <div className="px-3 pb-2 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A92A6]">Trend Range</div>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={o.checked}
              onClick={() => {
                o.onSelect();
                setView("closed");
              }}
              className={`flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-xs md:text-[13px] ${o.checked ? "bg-[#FFF0F6] font-semibold text-[#17152B]" : "text-[#68708A] hover:bg-[#f1edff]/60"}`}
            >
              <CalendarDays className={`size-[18px] ${o.checked ? "text-[#F34F97]" : "text-[#8A92A6]"}`} aria-hidden="true" />
              <span className="flex-1 text-left">{o.label}</span>
              {o.checked && <Check className="size-4 text-[#F34F97]" aria-hidden="true" />}
            </button>
          ))}
          {calendar && (
            <>
              <div className="mx-2 my-1.5 h-px bg-[#F1DDE8]" />
              <button
                type="button"
                role="menuitemradio"
                aria-checked={calendar.active}
                aria-haspopup="dialog"
                onClick={() => {
                  setDraftFrom(calendar.start);
                  setDraftTo(calendar.end);
                  setView("calendar");
                }}
                className={`flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-xs md:text-[13px] ${calendar.active ? "bg-[#FFF0F6] font-semibold text-[#17152B]" : "text-[#68708A] hover:bg-[#f1edff]/60"}`}
              >
                <CalendarDays className={`size-[18px] ${calendar.active ? "text-[#F34F97]" : "text-[#8A92A6]"}`} aria-hidden="true" />
                <span className="flex-1 text-left">Custom Range</span>
                <ChevronRight className="size-4 text-[#8A92A6]" aria-hidden="true" />
              </button>
            </>
          )}
        </div>,
        document.body,
      )}

      {view === "calendar" && calendar && createPortal(
        <div ref={popRef} style={pos} role="dialog" aria-label="Custom date range" className={`${popover} w-[min(330px,calc(100vw-3rem))] rounded-[26px] p-4`}>
          <RangeCalendar draft={{ from: draftFrom || null, to: draftTo || null }} onChange={(d) => { setDraftFrom(d.from ?? ""); setDraftTo(d.to ?? ""); }} maxDate={calendar.today} />
          {draftFrom && !draftValid && <p className="mt-2 text-[11px] text-[#e5484d]">Pick a range of up to 1 year.</p>}
          <div className="mt-3 flex justify-end gap-2 border-t border-[#F1DDE8] pt-3">
            <button type="button" onClick={() => setView("closed")} className="h-11 rounded-full px-4 text-xs font-medium text-[#68708A] hover:bg-[#f1edff] md:text-[13px]">Cancel</button>
            <button
              type="button"
              disabled={!draftValid}
              onClick={() => {
                calendar.onApply(draftFrom, draftEnd);
                setView("closed");
              }}
              className="h-11 rounded-full bg-[#F34F97] px-5 text-xs font-semibold text-white disabled:opacity-40 md:text-[13px]"
            >
              Apply
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ---------------------------------------------------------------- page
export function InsightsPage({ state, day, profileWeightKg }: { state: CycleState; day?: string; profileWeightKg?: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [presetDays, setPresetDays] = useState<(typeof WINDOWS)[number]>(30);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cycleRange, setCycleRange] = useState<CycleRange>(DEFAULT_CYCLE_RANGE);
  const closeExpanded = () => {
    setExpandedId(null);
    setCycleRange(DEFAULT_CYCLE_RANGE);
  };

  const today = localISODate();
  const end = custom ? custom.to : today;
  const windowDays = custom ? Math.round((parseIso(custom.to).getTime() - parseIso(custom.from).getTime()) / 86400000) + 1 : presetDays;
  const start = custom ? custom.from : addDays(end, -(windowDays - 1));
  const windowRangeProps = {
    label: `${fmtDate(start)} – ${fmtDate(end)}`,
    options: WINDOWS.map((w) => ({
      id: String(w),
      label: `Last ${w} days`,
      checked: !custom && presetDays === w,
      onSelect: () => {
        setCustom(null);
        setPresetDays(w);
      },
    })),
    calendar: { today, start, end, active: !!custom, onApply: (from: string, to: string) => setCustom({ from, to }) },
  };
  const history = useCycleHistory();
  const fetchStart = addDays(end, -(Math.max(windowDays, 14) - 1));
const logsReq = useAsync(useCallback((signal: AbortSignal) => getLogRange(fetchStart, end, signal), [fetchStart, end]));
  const insightReq = useAsync(useCallback((signal: AbortSignal) => getPhaseInsight(today, signal), [today]));

  const periods = useMemo(() => history.data ?? [], [history.data]);
  const allLogs = useMemo<DailyLog[]>(() => logsReq.data?.logs ?? [], [logsReq.data]);
const logs = useMemo(() => allLogs.filter((l) => l.date >= start && l.date <= end), [allLogs, start, end]);

  // Health score, summary cards and regularity always use the last 12 cycles.
  const cycles12 = useMemo(() => cyclePoints(periods, "12"), [periods]);
  const lengths12 = useMemo(() => periodPoints(periods, "12"), [periods]);
  const cs12 = useMemo(() => stats(cycles12), [cycles12]);
  const ps12 = useMemo(() => stats(lengths12), [lengths12]);
  // The Cycle Length and Period Length cards follow the cycle-count picker in their expanded view.
  const allCycles = useMemo(() => cyclePoints(periods, "all"), [periods]);
  const allLengths = useMemo(() => periodPoints(periods, "all"), [periods]);
  const cycles = useMemo(() => pickCycleRange(allCycles, cycleRange, today), [allCycles, cycleRange, today]);
  const lengths = useMemo(() => pickCycleRange(allLengths, cycleRange, today), [allLengths, cycleRange, today]);
  const cs = useMemo(() => stats(cycles), [cycles]);
  const ps = useMemo(() => stats(lengths), [lengths]);

  /** Logged values only, oldest first: one entry per day that has data. */
  const series = (pick: (l: DailyLog) => number | null) => {
    const rows = logs.flatMap((l) => {
      const v = pick(l);
      return v === null || v === undefined ? [] : [{ date: l.date, v }];
    });
    return { labels: rows.map((r) => fmtDate(r.date)), values: rows.map((r) => r.v), dates: rows.map((r) => r.date) };
  };
  const rowsCsv = (header: string[], labels: string[], ...cols: number[][]) => [header, ...labels.map((label, i) => [label, ...cols.map((c) => c[i] ?? "")])];

  // ---- health score: pure maths over logged data (see healthScore.ts). Not logging never lowers it.
  const health = computeHealthScore({
    cycleLengths: cycles12.map((c) => c.value),
    periodLengths: lengths12.map((c) => c.value),
    logs,
    windowDays,
    stepGoal: DEFAULT_STEP_GOAL,
    waterTargetMl: WATER_TARGET_ML,
  });
  const healthScore = health.score;
  const regularity = health.factors.find((f) => f.id === "regularity")?.score ?? null;
  const trackedDays = logs.length;

  // ---- predictions (all dates come from the backend cycle engine)
  const fw = fertileWindow(state.ovulation?.date);
  const confidence = cap(state.confidence.level);
  const rel = (iso: string) => {
    const d = diffDays(state.date, iso);
    return d === 0 ? "Today" : d === 1 ? "Tomorrow" : d > 1 ? `In ${d} days` : `${-d} days ago`;
  };
  const predictions = [
    {
      id: "next-period",
      title: "Next Period",
      subtitle: "Based on your cycle history",
      value: state.nextPeriod ? (state.isOverdue ? `${state.overdueDays}d late` : rel(state.nextPeriod.date)) : "—",
      note: state.nextPeriod ? `${confidence} confidence` : "Not enough data yet",
      icon: Droplet,
      tone: "pink" as const,
    },
    {
      id: "ovulation",
      title: "Ovulation",
      subtitle: "Estimated ovulation date",
      value: state.ovulation ? rel(state.ovulation.date) : "—",
      note: state.ovulation ? "Estimated" : "Not enough data yet",
      icon: Target,
      tone: "purple" as const,
    },
    {
      id: "fertile-window",
      title: "Fertile Window",
      subtitle: "5 days before to 1 day after",
      value: fw ? `${fmtDate(fw.start)} – ${fmtDate(fw.end)}` : "—",
      note: fw ? "Estimated" : "Not enough data yet",
      icon: Heart,
      tone: "pink" as const,
    },
  ];

  const ava = insightReq.data?.insight;
  const recommendations = ava ? [{ id: "summary", title: "Ava's take", body: ava.summary }, ...ava.tips.slice(0, 2).map((t, i) => ({ id: `tip-${i}`, title: "Tip", body: t }))] : [];

  // ---- summary metric cards
  const bbtS = series((l) => l.bbtCelsius);
  const bbtLatest = bbtS.values[bbtS.values.length - 1];
  const summary = [
    { id: "avg-cycle", value: cs12.mean !== null ? `${cs12.mean}d` : "—", label: "Avg Cycle", delta: changeOf(cycles12.map((c) => c.value)), icon: Activity, tone: "bg-[#f1edff] text-[#6C4DE8]" },
    { id: "period-length", value: ps12.mean !== null ? `${ps12.mean}d` : "—", label: "Period Length", delta: changeOf(lengths12.map((c) => c.value)), icon: Droplet, tone: "bg-[#FFF0F6] text-[#F34F97]" },
    { id: "bbt", value: bbtLatest !== undefined ? `${bbtLatest.toFixed(2)}°C` : "—", label: "Latest BBT", delta: changeOf(bbtS.values), icon: Thermometer, tone: "bg-sky-50 text-sky-500" },
  ];

  // ---- trend cards
  const flowS = series((l) => (l.flow ? FLOW_LEVEL[l.flow] : null));
  const painS = series((l) => l.painScore);
const crampsS = series((l) => (l.cramps ? CRAMPS_LEVEL[l.cramps] : null));
const usePainScore = painS.values.length > 0;
const painView = usePainScore ? painS : crampsS;
  const moodS = series((l) => (l.mood ? MOOD_SCORE[l.mood] : null));
  const sleepS = series((l) => (l.sleep ? SLEEP_SCORE[l.sleep] : null));
  const waterS = series((l) => (l.waterMl !== null ? round1(l.waterMl / 1000) : null));
  const stepsS = series((l) => l.steps);
  const weightLogged = series((l) => l.weightKg);
const weightFromProfile = weightLogged.values.length === 0 && !!profileWeightKg;
const weightS = weightFromProfile ? { labels: ["Setup"], values: [profileWeightKg!], dates: [end] } : weightLogged;
  const lhS = series((l) => (l.lhTest ? LH_SCORE[l.lhTest] : null));
  const latestMucus = [...logs].reverse().find((l) => l.cervicalMucus)?.cervicalMucus ?? null;

  const heatDates = Array.from({ length: 14 }, (_, i) => addDays(end, i - 13));
  // Rows come from what the user actually logged (preset chips and anything typed under "Other"),
  // so a new symptom shows up here the day it is logged. SYMPTOMS is only the empty-state placeholder.
  const symptomIndex = (logsReq.data as { symptomIndex?: SymptomIndex } | undefined)?.symptomIndex;
  const heatLogged = buildHeatRows(allLogs, heatDates, symptomIndex);
  const heatPlaceholder = SYMPTOMS.map((s) => ({ symptom: s.label, levels: heatDates.map(() => 0) }));
  const heatRows = heatLogged.length ? heatLogged.slice(0, HEAT_MAX_ROWS) : heatPlaceholder;

  const cycleScale = niceScale(cycles.map((c) => c.value), { floor: 0, minSpan: 6 });
  const periodScale = niceScale(lengths.map((c) => c.value), { floor: 0, minSpan: 4 });
  const weightScale = niceScale(weightS.values, { minSpan: 2 });
  const bbtScale = niceScale(bbtS.values, { minSpan: 1, step: 0.25 });
  const waterScale = niceScale([...waterS.values, WATER_TARGET_ML / 1000], { floor: 0, minSpan: 3, step: 1 });
  const stepsScale = niceScale([...stepsS.values, DEFAULT_STEP_GOAL], { floor: 0, minSpan: 4000, step: 2500 });
  const bbtOvulationIdx = state.ovulation ? bbtS.dates.indexOf(state.ovulation.date) : -1;
  const goalDays = waterS.values.filter((v) => v >= WATER_TARGET_ML / 1000).length;
  const minOf = (a: number[]) => (a.length ? Math.min(...a) : 0);
  const maxOf = (a: number[]) => (a.length ? Math.max(...a) : 0);
  const rangeNote = custom ? `${fmtDate(start)} – ${fmtDate(end)}` : `Last ${windowDays} days`;

  const cards: CardSpec[] = [
    {
      id: "cycle-length",
      title: "Cycle Length Trend",
      subtitle: `Last ${cycles.length || 12} cycles · days between periods`,
      categories: ["cycle"],
      tint: "purple",
      insight: cs.count ? `Your logged cycles range from ${cs.min} to ${cs.max} days and average ${cs.mean} days.` : "Cycle length appears once you log your second period.",
      csv: () => rowsCsv(["Period start", "Cycle length (days)"], cycles.map((c) => c.startDate), cycles.map((c) => c.value)),
      render: (h, big) =>
        cycles.length === 0 ? (
          <Empty>Cycle length appears once you log your second period.</Empty>
        ) : (
          <>
            {!big && (
              <>
                <Legend items={[{ label: "Cycle length", color: PURPLE }, { label: "Latest cycle", color: PINK }]} />
                <p className="-mt-1 mb-2 text-[11px] text-[#8A92A6] xl:text-xs">
                  Avg <Strong>{cs.mean}d</Strong> · Longest <Strong>{cs.max}d</Strong> · Shortest <Strong>{cs.min}d</Strong>
                </p>
              </>
            )}
            <LineChart
              ariaLabel={`Cycle length over ${cycles.length} cycles, from ${cs.min} to ${cs.max} days`}
              xLabels={cycles.map((c) => fmtDate(c.startDate))}
              tooltipLabels={cycles.map((c) => `Cycle starting ${longDate(c.startDate)}`)}
              formatValue={(v) => `${v} days`}
              yDomain={cycleScale.domain}
              yTicks={cycleScale.ticks}
              height={h}
              referenceLines={big && cs.mean !== null ? [{ value: cs.mean, color: "#cfc6ea", label: `Avg ${cs.mean} days` }] : []}
              series={[
                big
                  ? { id: "cycle", color: PURPLE, gradient: [PURPLE, PINK], values: cycles.map((c) => c.value), fill: true, dots: "all" }
                  : { id: "cycle", color: PURPLE, values: cycles.map((c) => c.value), dots: "last", lastDotColor: PINK },
              ]}
            />
          </>
        ),
    },
    {
      id: "period-length",
      title: "Period Length Trend",
      subtitle: `Duration of bleeding · last ${lengths.length || 12} periods`,
      categories: ["cycle"],
      tint: "pink",
      insight: ps.count ? `Period length averages ${ps.mean} days. The usual range is 3 to 7 days.` : "Period length shows up once you log when a period ended.",
      csv: () => rowsCsv(["Period start", "Period length (days)"], lengths.map((c) => c.startDate), lengths.map((c) => c.value)),
      render: (h) =>
        lengths.length === 0 ? (
          <Empty>Period length shows up once you log when a period ended.</Empty>
        ) : (
          <>
            <Legend items={[{ label: "Period days", color: PINK }, { label: "Latest", color: "#5b3fe4" }]} />
            <BarChart
              ariaLabel={`Period length over ${lengths.length} periods, from ${ps.min} to ${ps.max} days`}
              labels={lengths.map((c) => fmtDate(c.startDate))}
              tooltipLabels={lengths.map((c) => `Period starting ${longDate(c.startDate)}`)}
              formatValue={(v) => `${v} ${v === 1 ? "day" : "days"}`}
              valueName="Length"
              values={lengths.map((c) => c.value)}
              yDomain={periodScale.domain}
              yTicks={periodScale.ticks}
              height={h}
              gradient={["#f9a8d4", PINK]}
              highlightIndex={lengths.length - 1}
              highlightGradient={["#8b6cf5", "#5b3fe4"]}
            />
          </>
        ),
    },
    {
      id: "flow",
      title: "Flow Trend",
      subtitle: `Logged flow · ${rangeNote.toLowerCase()}`,
      categories: ["cycle"],
      tint: "pink",
      insight: flowS.values.length ? `You logged flow on ${flowS.values.length} ${flowS.values.length === 1 ? "day" : "days"}. Heaviest logged flow: ${FLOW_NAMES[maxOf(flowS.values)]?.toLowerCase()}.` : "Log your flow in the daily log to see it here.",
      csv: () => rowsCsv(["Date", "Flow level (1 spotting – 4 heavy)"], flowS.dates, flowS.values),
      render: (h) =>
        flowS.values.length === 0 ? (
          <Empty>No flow logged in this range.</Empty>
        ) : (
          <>
            <Legend items={[{ label: "Flow intensity", color: PINK }]} />
            <LineChart
              ariaLabel="Logged flow intensity over the selected range"
              xLabels={flowS.labels}
              tooltipLabels={flowS.dates.map(longDate)}
              formatValue={(v) => (["None", "Spotting", "Light", "Medium", "Heavy"][v] ?? String(v))}
              yDomain={[0, 4.4]}
              yTicks={[0, 1, 2, 3, 4]}
              formatY={(v) => FLOW_NAMES[v] ?? ""}
              height={h}
              curve="linear"
              margin={{ left: 46 }}
              series={[{ id: "flow", color: PINK, values: flowS.values, fill: true, dots: "all" }]}
            />
          </>
        ),
    },
    {
      id: "pain",
      title: "Pain Trend",
      subtitle: `${usePainScore ? "Severity score" : "Cramps level"} · ${rangeNote.toLowerCase()}`,
      categories: ["symptoms"],
      tint: "red",
      insight: painView.values.length
        ? usePainScore
          ? `Peak pain you logged was ${maxOf(painView.values)}/10. Average ${mean(painView.values)}/10.`
          : `Your highest cramps level in this range was ${CRAMPS_NAMES[maxOf(painView.values)] ?? ""}.`
        : "Log a pain score or cramps level to see it here.",
      csv: () => rowsCsv(["Date", usePainScore ? "Pain (0-10)" : "Cramps (0-3)"], painView.dates, painView.values),
      render: (h) =>
        painView.values.length === 0 ? (
          <Empty>No pain or cramps logged in this range.</Empty>
        ) : (
          <>
            <Legend items={[{ label: usePainScore ? "Pain" : "Cramps level", color: "#ef4444" }]}>
              <span>Peak <Strong>{usePainScore ? `${maxOf(painView.values)}/10` : CRAMPS_NAMES[maxOf(painView.values)] ?? ""}</Strong></span>
            </Legend>
            <LineChart
              ariaLabel="Logged pain or cramps level over the selected range"
              xLabels={painView.labels}
              tooltipLabels={painView.dates.map(longDate)}
              formatValue={usePainScore ? (v) => `${v}/10` : undefined}
              yDomain={usePainScore ? [0, 10] : [0, 3]}
              yTicks={usePainScore ? [0, 2, 4, 6, 8, 10] : [0, 1, 2, 3]}
              formatY={usePainScore ? undefined : (v) => CRAMPS_NAMES[v] ?? ""}
              height={h}
              series={[{ id: "pain", color: "#ef4444", values: painView.values, dots: painView.values.length < 15 ? "all" : "none" }]}
            />
          </>
        ),
    },
    {
      id: "mood",
      title: "Mood Trend",
      subtitle: `Daily mood · ${rangeNote.toLowerCase()}`,
      categories: ["symptoms"],
      tint: "orange",
      insight: moodS.values.length ? `Average mood ${mean(moodS.values)} out of 5 across ${moodS.values.length} logged ${moodS.values.length === 1 ? "day" : "days"}.` : "Log your mood in the daily log to see it here.",
      csv: () => rowsCsv(["Date", "Mood (1 sad – 5 happy)"], moodS.dates, moodS.values),
      render: (h) =>
        moodS.values.length === 0 ? (
          <Empty>No mood logged in this range.</Empty>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              {MOOD_FACES.map((f) => (
                <img key={f.label} src={f.src} alt={f.label} width={20} height={20} className="size-5 rounded-full object-cover" />
              ))}
            </div>
            <LineChart ariaLabel="Logged mood score over the selected range" xLabels={moodS.labels} tooltipLabels={moodS.dates.map(longDate)} formatValue={(v) => `${MOOD_FACES[v - 1]?.label ?? v} (${v}/5)`} yDomain={[1, 5]} yTicks={[1, 2, 3, 4, 5]} height={h} series={[{ id: "mood", color: "#f59e0b", values: moodS.values, dots: moodS.values.length < 15 ? "all" : "none" }]} />
          </>
        ),
    },
    {
      id: "sleep",
      title: "Sleep Trend",
      subtitle: `Sleep quality · ${rangeNote.toLowerCase()}`,
      categories: ["lifestyle"],
      tint: "purple",
      insight: sleepS.values.length ? `Average sleep quality ${SLEEP_NAMES[Math.round(mean(sleepS.values) ?? 0)] || "—"} across ${sleepS.values.length} logged ${sleepS.values.length === 1 ? "night" : "nights"}.` : "Log your sleep in the daily log to see it here.",
      csv: () => rowsCsv(["Date", "Sleep (1 poor – 4 excellent)"], sleepS.dates, sleepS.values),
      render: (h) =>
        sleepS.values.length === 0 ? (
          <Empty>No sleep logged in this range.</Empty>
        ) : (
          <>
            <Legend items={[{ label: "Sleep quality", color: PURPLE }]} />
            <LineChart
              ariaLabel="Logged sleep quality over the selected range"
              xLabels={sleepS.labels}
              tooltipLabels={sleepS.dates.map(longDate)}
              yDomain={[0.5, 4.5]}
              yTicks={[1, 2, 3, 4]}
              formatY={(v) => SLEEP_NAMES[v] ?? ""}
              height={h}
              margin={{ left: 62 }}
              series={[{ id: "sleep", color: PURPLE, values: sleepS.values, dots: "last", lastDotColor: PINK }]}
            />
          </>
        ),
    },
    {
      id: "water",
      title: "Water Intake",
      subtitle: `Litres per day · goal ${(WATER_TARGET_ML / 1000).toFixed(1)}L`,
      categories: ["lifestyle"],
      tint: "blue",
      insight: waterS.values.length ? `You reached the ${(WATER_TARGET_ML / 1000).toFixed(1)}L goal on ${goalDays} of ${waterS.values.length} logged ${waterS.values.length === 1 ? "day" : "days"}.` : "Log your water in the daily log to see it here.",
      csv: () => rowsCsv(["Date", "Litres"], waterS.dates, waterS.values),
      render: (h) =>
        waterS.values.length === 0 ? (
          <Empty>No water logged in this range.</Empty>
        ) : (
          <>
            <Legend items={[{ label: "Intake", color: "#3b82f6" }, { label: `Goal ${(WATER_TARGET_ML / 1000).toFixed(1)}L`, color: "#93c5fd", dashed: true }]} />
            <BarChart
              ariaLabel="Litres of water logged per day against the daily goal"
              labels={waterS.labels}
              tooltipLabels={waterS.dates.map(longDate)}
              formatValue={(v) => `${v} L`}
              valueName="Water"
              values={waterS.values}
              yDomain={waterScale.domain}
              yTicks={waterScale.ticks}
              height={h}
              gradient={["#7ab8ff", "#3b82f6"]}
              referenceLines={[{ value: WATER_TARGET_ML / 1000, color: "#93c5fd" }]}
            />
          </>
        ),
    },
    {
      id: "steps",
      title: "Activity Trend",
      subtitle: `Steps per day · goal ${DEFAULT_STEP_GOAL.toLocaleString()}`,
      categories: ["lifestyle"],
      tint: "green",
      insight: stepsS.values.length ? `Average ${Math.round(mean(stepsS.values) ?? 0).toLocaleString()} steps across ${stepsS.values.length} logged ${stepsS.values.length === 1 ? "day" : "days"}.` : "Log your steps in the daily log to see them here.",
      csv: () => rowsCsv(["Date", "Steps"], stepsS.dates, stepsS.values),
      render: (h) =>
        stepsS.values.length === 0 ? (
          <Empty>No steps logged in this range.</Empty>
        ) : (
          <>
            <Legend items={[{ label: "Steps", color: "#22c55e" }, { label: `Goal ${DEFAULT_STEP_GOAL.toLocaleString()}`, color: "#4ade80", dashed: true }]} />
            <BarChart
              ariaLabel="Steps logged per day against the step goal"
              labels={stepsS.labels}
              tooltipLabels={stepsS.dates.map(longDate)}
              formatValue={(v) => `${v.toLocaleString()} steps`}
              values={stepsS.values}
              yDomain={stepsScale.domain}
              yTicks={stepsScale.ticks}
              formatY={(v) => (v >= 1000 ? `${round1(v / 1000)}k` : String(v))}
              height={h}
              gradient={["#4ade80", "#16a34a"]}
              referenceLines={[{ value: DEFAULT_STEP_GOAL, color: "#4ade80" }]}
            />
          </>
        ),
    },
    {
      id: "weight",
      title: "Weight Trend",
      subtitle: `Logged weight · ${rangeNote.toLowerCase()}`,
      categories: ["lifestyle"],
      tint: "pink",
      insightTitle: weightS.values.length > 1 ? (changeOf(weightS.values)! < 0 ? "Trending down" : changeOf(weightS.values)! > 0 ? "Trending up" : "Holding steady") : undefined,
      insight: weightFromProfile ? "This is the weight you entered during setup. Log your weight in the daily log to track changes." : weightS.values.length > 1 ? `Your latest weight is ${Math.abs(round1(weightS.values[weightS.values.length - 1]! - weightS.values[0]!))} kg ${weightS.values[weightS.values.length - 1]! < weightS.values[0]! ? "lower" : "higher"} than the first one logged in this range.` : "Log your weight on two or more days to see a trend.",
      csv: () => rowsCsv(["Date", "Weight (kg)"], weightS.dates, weightS.values),
      render: (h, big) =>
        weightS.values.length === 0 ? (
          <Empty>No weight logged in this range.</Empty>
        ) : (
          <>
            <Legend items={[{ label: "Weight (kg)", color: "#ef4444" }]} />
            <LineChart ariaLabel="Logged weight in kilograms over the selected range" xLabels={weightS.labels} tooltipLabels={weightS.dates.map(longDate)} formatValue={(v) => `${v} kg`} yDomain={weightScale.domain} yTicks={weightScale.ticks} height={big ? h : Math.min(h, 235)} series={[{ id: "weight", color: "#ef4444", values: weightS.values, dots: "last" }]} />
            {!big && (
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Latest", `${weightS.values[weightS.values.length - 1]} kg`, "Most recent log"],
                ["First", `${weightS.values[0]} kg`, "Start of range"],
                ["Change", `${signed(weightS.values[weightS.values.length - 1]! - weightS.values[0]!)} kg`, "Over this range"],
              ].map(([label, value, note]) => (
                <div key={label} className="min-w-0 rounded-xl border border-[#F1DDE8] bg-white/80 px-2.5 py-2">
                  <dt className="truncate text-[11px] text-[#8A92A6]">{label}</dt>
                  <dd className="text-base font-bold text-[#17152B]">{value}</dd>
                  <dd className="truncate text-[11px] text-[#8A92A6]">{note}</dd>
                </div>
              ))}
            </dl>
            )}
          </>
        ),
    },
    {
      id: "bbt",
      title: "Basal Body Temperature",
      subtitle: `Logged readings · ${rangeNote.toLowerCase()}`,
      categories: ["fertility", "hormones"],
      tint: "pink",
      insight: bbtS.values.length ? `Readings range from ${minOf(bbtS.values).toFixed(2)} to ${maxOf(bbtS.values).toFixed(2)}°C. A sustained rise of about 0.2°C or more usually follows ovulation.` : "Log your basal temperature in the daily log to see it here.",
      csv: () => rowsCsv(["Date", "BBT (°C)"], bbtS.dates, bbtS.values),
      render: (h) =>
        bbtS.values.length === 0 ? (
          <Empty>No temperature logged in this range.</Empty>
        ) : (
          <>
            <Legend items={[{ label: "BBT °C", color: PINK }, { label: "Average", color: "#c4b8ee", dashed: true }]}>
              <span>Latest: <Strong>{bbtLatest?.toFixed(2)}°C</Strong></span>
            </Legend>
            <LineChart
              ariaLabel="Basal body temperature in degrees Celsius over the selected range"
              xLabels={bbtS.labels}
              tooltipLabels={bbtS.dates.map(longDate)}
              formatValue={(v) => `${v.toFixed(2)}\u00b0C`}
              yDomain={bbtScale.domain}
              yTicks={bbtScale.ticks}
              formatY={(v) => v.toFixed(2)}
              height={h}
              markers={bbtOvulationIdx >= 0 ? [{ index: bbtOvulationIdx, label: "Est. ovulation", color: PURPLE }] : []}
              referenceLines={[{ value: mean(bbtS.values) ?? 0, color: "#c4b8ee" }]}
              series={[{ id: "bbt", color: PINK, values: bbtS.values, dots: bbtS.values.length < 15 ? "all" : "none" }]}
            />
          </>
        ),
    },
    {
      id: "lh",
      title: "LH Test & Cervical Mucus",
      subtitle: `What you logged · ${rangeNote.toLowerCase()}`,
      categories: ["hormones", "fertility"],
      tint: "purple",
      insight: lhS.values.length ? `${lhS.values.filter((v) => v >= 2).length} high or peak LH ${lhS.values.filter((v) => v >= 2).length === 1 ? "result" : "results"} logged. A surge usually comes 24 to 36 hours before ovulation.` : "Log LH tests and cervical mucus in the daily log to see them here.",
      csv: () => rowsCsv(["Date", "LH (0 negative – 3 peak)"], lhS.dates, lhS.values),
      render: (h) =>
        lhS.values.length === 0 && !latestMucus ? (
          <Empty>No LH test or cervical mucus logged in this range.</Empty>
        ) : (
          <>
            <Legend items={[{ label: "LH test", color: "#22c55e" }]}>
              {latestMucus && <span>Latest mucus: <Strong>{latestMucus}</Strong></span>}
            </Legend>
            {lhS.values.length > 0 && (
              <BarChart ariaLabel="LH test results logged over the selected range" labels={lhS.labels} tooltipLabels={lhS.dates.map(longDate)} formatValue={(v) => ["Negative", "Low", "High", "Peak"][v] ?? String(v)} values={lhS.values} yDomain={[0, 3.5]} yTicks={[0, 1, 2, 3]} formatY={(v) => LH_NAMES[v] ?? ""} height={h} gradient={["#4ade80", "#16a34a"]} />
            )}
          </>
        ),
    },
    {
      id: "regularity",
      title: "Cycle Regularity",
      subtitle: `Consistency score · last ${cycles12.length || 12} cycles`,
      categories: ["cycle"],
      tint: "green",
      insight: cs12.sd !== null ? `Your cycle length varies by about ±${cs12.sd} days from one cycle to the next.` : "Needs 3 or more logged cycles to score regularity.",
      csv: () => [["Metric", "Value"], ["Regularity score (%)", regularity ?? ""], ["Cycle length SD (days)", cs12.sd ?? ""]],
      render: () =>
        regularity === null ? (
          <Empty>Needs 3 or more logged cycles.</Empty>
        ) : (
          <div className="flex flex-1 items-center justify-center py-2">
            <RingGauge value={regularity} size={188} strokeWidth={20} gradient={["#34d399", "#16a34a"]} trackColor="#e2f6ea" innerFill="#ffffff" ariaLabel={`Cycle regularity ${regularity} percent`}>
              <span className="text-2xl font-extrabold text-[#17152B] md:text-[28px] xl:text-[32px]">
                {regularity}
                <span className="text-base font-bold">%</span>
              </span>
              <span className="mt-1 text-xs font-semibold text-[#22B573] md:text-[13px]">{cs12.sd !== null && cs12.sd <= 2 ? "Very consistent" : cs12.sd !== null && cs12.sd <= 5 ? "Some variation" : "Varies a lot"}</span>
            </RingGauge>
          </div>
        ),
    },
    {
      id: "heatmap",
      title: "Symptom Frequency Heatmap",
      subtitle: "Symptoms you logged · last 14 days",
      categories: ["symptoms"],
      tint: "purple",
      fullWidth: true,
      insight: heatLogged.length ? `Most logged symptom: ${[...heatLogged].sort((a, b) => b.levels.filter(Boolean).length - a.levels.filter(Boolean).length)[0]?.symptom}.` : "Log symptoms in the daily log to see them here.",
      csv: () => [["Symptom", ...heatDates], ...(heatLogged.length ? heatLogged : heatRows).map((r) => [r.symptom, ...r.levels])],
      render: () => (
        <>
          <div className="mb-3">
            <HeatmapLegend />
          </div>
          <SymptomHeatmap rows={heatRows} columnLabels={heatDates.map((d) => String(parseIso(d).getDate()))} />
          {heatLogged.length === 0 && <p className="mt-3 text-[12px] text-[#8A92A6]">No symptoms logged in the last 14 days yet.</p>}
          {heatLogged.length > HEAT_MAX_ROWS && (
            <p className="mt-3 text-[12px] text-[#8A92A6]">
              Showing your {HEAT_MAX_ROWS} most frequent of {heatLogged.length} symptoms. Download the data for the full list.
            </p>
          )}
        </>
      ),
    },
  ];

  // ---- expanded view: side stat cards + Key Insights, plain maths over the same logged values
  const scope = custom ? rangeNote : `the last ${windowDays} days`;
  const describe = (s: { values: number[]; dates: string[] }, fmt: (v: number) => string, noun: string) => {
    const n = s.values.length;
    if (n === 0) return { stats: [] as StatCard[], insights: [] as InsightSentence[] };
    const avg = mean(s.values) ?? 0;
    const hi = maxOf(s.values);
    const lo = minOf(s.values);
    return {
      stats: [
        { label: "Average", value: fmt(avg), dot: DOTS[0]! },
        { label: "Highest", value: fmt(hi), dot: DOTS[1]! },
        { label: "Lowest", value: fmt(lo), dot: DOTS[2]! },
        { label: "Days logged", value: String(n), dot: DOTS[3]! },
      ],
      insights: [
        [`Across ${scope}, your ${noun} averaged `, { bold: fmt(avg) }, " over ", { bold: `${n} logged ${n === 1 ? "day" : "days"}` }, "."],
        ["Highest was ", { bold: fmt(hi) }, ` on ${fmtDate(s.dates[s.values.indexOf(hi)])}.`],
        ["Lowest was ", { bold: fmt(lo) }, ` on ${fmtDate(s.dates[s.values.indexOf(lo)])}.`],
      ] as InsightSentence[],
    };
  };
  const cycleExtra = (s: typeof cs, pts: { value: number; startDate: string }[], noun: string, nounPlural: string, lo: number, hi: number): { stats: StatCard[]; insights: InsightSentence[] } => {
    if (!s.count || s.mean === null || s.min === null || s.max === null) return { stats: [], insights: [] };
    const longest = pts.find((p) => p.value === s.max);
    return {
      stats: [
        { label: "Average", value: `${s.mean} days`, dot: DOTS[0]! },
        { label: "Longest", value: `${s.max} days`, dot: DOTS[1]! },
        { label: "Shortest", value: `${s.min} days`, dot: DOTS[2]! },
        { label: `${cap(nounPlural)} in range`, value: String(s.count), dot: DOTS[3]! },
      ],
      insights: [
        [`Across ${cycleRange.kind === "cycles" ? `last ${s.count} ${s.count === 1 ? noun : nounPlural}` : cycleRange.kind === "months" ? `the last ${cycleRange.n} months` : "the selected range"}, your ${noun} length averaged `, { bold: `${s.mean} days` }, s.mean >= lo && s.mean <= hi ? ` — within the typical ${lo}–${hi} day range.` : ` — outside the typical ${lo}–${hi} day range.`],
        ["Variation of ", { bold: `${round1(s.max - s.min)} days` }, ` between longest and shortest ${nounPlural}.`],
        [`Your longest ${noun} was `, { bold: `${s.max} days` }, longest ? `, starting ${fmtDate(longest.startDate)}.` : "."],
      ],
    };
  };
  const weightFirst = weightS.values[0] ?? 0;
  const weightLast = weightS.values[weightS.values.length - 1] ?? 0;
  const lhHigh = lhS.values.filter((v) => v >= 2).length;
  const heatTop = [...heatLogged].sort((a, b) => b.levels.filter(Boolean).length - a.levels.filter(Boolean).length)[0];
  const heatDays = heatDates.filter((d) => (allLogs.find((l) => l.date === d)?.symptoms.length ?? 0) > 0).length;
  type Extra = { range: "window" | "cycles" | "none"; stats: StatCard[]; insights: InsightSentence[] };
  const extras: Record<string, Extra> = {
    "cycle-length": { range: "cycles", ...cycleExtra(cs, cycles, "cycle", "cycles", 21, 35) },
    "period-length": { range: "cycles", ...cycleExtra(ps, lengths, "period", "periods", 3, 7) },
    flow: { range: "window", ...describe(flowS, (v) => FLOW_NAMES[Math.round(v)] ?? "—", "flow") },
    pain: { range: "window", ...describe(painView, usePainScore ? (v) => `${round1(v)}/10` : (v) => CRAMPS_NAMES[Math.round(v)] ?? "—", usePainScore ? "pain" : "cramps level") },
    mood: { range: "window", ...describe(moodS, (v) => `${round1(v)} / 5`, "mood") },
    sleep: { range: "window", ...describe(sleepS, (v) => SLEEP_NAMES[Math.round(v)] || "—", "sleep quality") },
    water: { range: "window", ...describe(waterS, (v) => `${round1(v)} L`, "water intake") },
    steps: { range: "window", ...describe(stepsS, (v) => Math.round(v).toLocaleString(), "daily steps") },
    bbt: { range: "window", ...describe(bbtS, (v) => `${v.toFixed(2)}°C`, "temperature") },
    weight: {
      range: "window",
      stats: weightS.values.length
        ? [
            { label: "Latest", value: `${weightLast} kg`, dot: DOTS[0]! },
            ...(weightS.values.length > 1
              ? [
                  { label: "First", value: `${weightFirst} kg`, dot: DOTS[1]! },
                  { label: "Change", value: `${signed(weightLast - weightFirst)} kg`, dot: DOTS[2]! },
                ]
              : []),
            weightFromProfile ? { label: "Source", value: "Setup", dot: DOTS[3]! } : { label: "Days logged", value: String(weightS.values.length), dot: DOTS[3]! },
          ]
        : [],
      insights:
        weightS.values.length > 1
          ? [
              [`Across ${scope}, your weight went from `, { bold: `${weightFirst} kg` }, " to ", { bold: `${weightLast} kg` }, "."],
              ["Change over this range: ", { bold: `${signed(weightLast - weightFirst)} kg` }, "."],
              [`Based on ${weightS.values.length} logged days.`],
            ]
          : weightS.values.length === 1
            ? [["This is the weight you entered during setup. Log your weight in the daily log to track changes."]]
            : [],
    },
    lh: {
      range: "window",
      stats:
        lhS.values.length || latestMucus
          ? [
              { label: "Tests logged", value: String(lhS.values.length), dot: DOTS[0]! },
              { label: "High or peak", value: String(lhHigh), dot: DOTS[1]! },
              { label: "Latest mucus", value: latestMucus ?? "—", dot: DOTS[2]! },
            ]
          : [],
      insights: lhS.values.length
        ? [
            [`Across ${scope}, you logged `, { bold: `${lhS.values.length} LH ${lhS.values.length === 1 ? "test" : "tests"}` }, "."],
            [{ bold: String(lhHigh) }, ` ${lhHigh === 1 ? "result was" : "results were"} high or peak.`],
            ["A surge usually comes 24 to 36 hours before ovulation."],
          ]
        : latestMucus
          ? [["Latest cervical mucus: ", { bold: latestMucus }, "."]]
          : [],
    },
    regularity: {
      range: "none",
      stats:
        regularity !== null && cs12.sd !== null
          ? [
              { label: "Score", value: `${regularity}%`, dot: DOTS[0]! },
              { label: "Variation", value: `±${cs12.sd} days`, dot: DOTS[1]! },
              { label: "Cycles used", value: String(cs12.count), dot: DOTS[3]! },
            ]
          : [],
      insights:
        regularity !== null && cs12.sd !== null
          ? [
              ["Your cycle length varies by about ", { bold: `±${cs12.sd} days` }, " from one cycle to the next."],
              ["Regularity score: ", { bold: `${regularity}%` }, ". Higher means steadier cycles."],
              [`Based on your last ${cs12.count} logged cycles.`],
            ]
          : [],
    },
    heatmap: {
      range: "none",
      stats: heatTop
        ? [
            { label: "Symptoms logged", value: String(heatLogged.length), dot: DOTS[0]! },
            { label: "Most frequent", value: heatTop.symptom, dot: DOTS[1]! },
            { label: "Days with symptoms", value: `${heatDays} / 14`, dot: DOTS[3]! },
          ]
        : [],
      insights: heatTop
        ? [
            ["Most logged symptom: ", { bold: heatTop.symptom }, ` (${heatTop.levels.filter(Boolean).length} of 14 days).`],
            ["You logged ", { bold: `${heatLogged.length} different ${heatLogged.length === 1 ? "symptom" : "symptoms"}` }, " in the last 14 days."],
            ["Each column is one day; a filled cell means you logged it."],
          ]
        : [],
    },
  };

  const visible = cards.filter((c) => filter === "all" || c.categories.includes(filter));
  const expanded = cards.find((c) => c.id === expandedId) ?? null;

  const exportReport = () => {
    // Missing values are exported as empty cells, never as the on-screen "—" placeholder.
    const rows: (string | number)[][] = [
      ["Trend Analysis report"],
      ["Range", `${start} to ${end}`],
      [],
      ["Summary metric", "Value", "Change"],
      ...summary.map((m) => [m.label, m.value === "—" ? "" : m.value, m.delta === null ? "" : signed(m.delta)]),
    ];
    for (const c of cards) {
      const data = c.csv();
      rows.push([], [c.title], ...data, ...(data.length <= 1 ? [["No data logged in this range"]] : []));
    }
    downloadCsv("trend-analysis-report.csv", rows);
  };

  const sectionTitle = "mb-3 text-lg font-bold text-[#17152B] md:text-xl xl:text-[22px]";
  const phaseLabel = state.phase === "unknown" ? "Cycle" : cap(state.phase);

  return (
    <div className="animate-fade-up">
      {/* ---- summary row */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <section aria-labelledby="health-score-title" className="flex min-w-0 flex-col">
          <h2 id="health-score-title" className={sectionTitle}>Health Score</h2>
          <div className={`${CARD} relative flex flex-1 items-center justify-between gap-4 overflow-hidden p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,#FFF0F6_0%,transparent_50%)]" aria-hidden="true" />
            <div className="relative min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-bold text-[#17152B] md:text-[17px] xl:text-lg">{health.label}</span>
                <button type="button" onClick={() => setScoreOpen(true)} className="-my-2 inline-flex h-11 items-center">
                  <span className="inline-flex h-7 items-center gap-1 rounded-full border border-[#F34F97]/30 bg-[#FFF0F6] px-2.5 text-xs font-semibold text-[#F34F97]">
                    <Eye className="size-3" aria-hidden="true" />
                    View more
                  </span>
                  <span className="sr-only"> about your health score</span>
                </button>
              </div>
              <p className="mt-2 max-w-[200px] text-xs text-[#8A92A6] md:text-[13px]">{healthScore === null ? "Keep logging to unlock your score." : `Based on ${health.scoredCount} of ${health.totalCount} factors from your logs.`}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#22B573] md:text-[13px]">
                <TrendingUp className="size-3.5" aria-hidden="true" />
                {trackedDays} of {windowDays} days logged
              </p>
            </div>
            <RingGauge value={healthScore ?? 0} size={120} strokeWidth={14} gradient={[PINK, "#8b6cf5"]} trackColor="#f0e6f8" ariaLabel={healthScore === null ? "Health score not available yet" : `Health score ${healthScore} out of 100`}>
              <span className="text-2xl font-bold text-[#17152B] md:text-[28px] xl:text-[32px]">{healthScore ?? "—"}</span>
              <span className="mt-0.5 text-[11px] text-[#8A92A6] xl:text-xs">/ 100</span>
            </RingGauge>
          </div>
        </section>

        <section aria-labelledby="predictions-title" className="flex min-w-0 flex-col">
          <h2 id="predictions-title" className={sectionTitle}>Predictions</h2>
          <ul className="flex flex-1 flex-col gap-2.5">
            {predictions.map((p) => (
              <li key={p.id} className="flex flex-1 items-center gap-3 rounded-[22px] border border-[#F1DDE8] bg-white px-4 py-2.5 shadow-[0_10px_34px_-12px_rgb(190_120_220/0.22)]">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#FFF0F6] text-[#F34F97]">
                  <p.icon className="size-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#17152B] xl:text-base">{p.title}</div>
                  <div className="text-[11px] text-[#8A92A6] xl:text-xs">{p.subtitle}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-bold xl:text-base ${p.tone === "pink" ? "text-[#F34F97]" : "text-[#6C4DE8]"}`}>{p.value}</div>
                  <div className="text-[11px] text-[#8A92A6] xl:text-xs">{p.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="recommendations-title" className="flex min-w-0 flex-col md:col-span-2 lg:col-span-1">
          <h2 id="recommendations-title" className={sectionTitle}>AI Recommendations</h2>
          <ul className="flex flex-1 flex-col gap-2.5">
            {recommendations.length === 0 ? (
              <li className="flex flex-1 items-center rounded-[22px] bg-gradient-to-r from-[#f1edff]/80 to-[#FFF0F6]/70 px-4 py-3 text-xs text-[#68708A] md:text-[13px]">
                {insightReq.status === "loading" ? "Ava is reading your cycle…" : "Ava's recommendations appear once your phase insight is ready."}
              </li>
            ) : (
              recommendations.map((r) => (
                <li key={r.id} className="flex flex-1 items-center gap-3 rounded-[22px] bg-gradient-to-r from-[#f1edff]/80 to-[#FFF0F6]/70 px-4 py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[#F34F97]/25 bg-white text-[#F34F97]">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#17152B] xl:text-base">{r.title}</div>
                    <p className="mt-0.5 text-xs text-[#68708A] md:text-[13px]">{r.body}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* ---- trend analysis */}
      <section aria-labelledby="trend-title" className="mt-9">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1edff] px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-[#6C4DE8] xl:text-[11px]">
              <Sparkles className="size-2.5" aria-hidden="true" />
              ANALYTICS
            </span>
            <h2 id="trend-title" className="mt-2 text-2xl font-bold text-[#17152B] md:text-[28px] xl:text-[32px]">Trend Analysis</h2>
            <p className="mt-1 text-[13px] text-[#8A92A6] md:text-sm">Analytics to understand your menstrual health over time, from what you log.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RangeMenu {...windowRangeProps} />
            <button type="button" onClick={exportReport} className="flex h-11 items-center gap-2 rounded-full bg-[#F34F97] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-8px_rgb(236_72_153/0.7)] md:text-[13px]">
              <Download className="size-3.5" aria-hidden="true" />
              Export Report
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Filter metrics" className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = item.id === filter;
              return (
                <button key={item.id} type="button" aria-pressed={active} onClick={() => setFilter(item.id)} className="group inline-flex h-11 items-center">
                  <span className={`inline-flex h-11 items-center rounded-full px-4 text-xs font-medium transition-colors sm:h-9 sm:px-5 md:text-[13px] ${active ? "bg-gradient-to-r from-[#4b2fd8] to-[#6C4DE8] font-semibold text-white shadow-[0_8px_18px_-8px_rgb(75_47_216/0.7)]" : "border border-[#F1DDE8] bg-white text-[#68708A] group-hover:bg-[#f1edff]/60"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div role="group" aria-label="Current cycle phase" className="flex items-center gap-4 text-[11px] text-[#8A92A6] xl:text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1edff] px-3 py-1.5 font-semibold text-[#6C4DE8]">
              <Moon className="size-3" aria-hidden="true" />
              {phaseLabel}
              {state.cycleDay ? ` · Day ${state.cycleDay}` : ""}
            </span>
          </div>
        </div>

        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {summary.map((m) => (
            <li key={m.id} className="rounded-[24px] border border-[#F1DDE8] bg-white p-5 shadow-[0_10px_34px_-12px_rgb(190_120_220/0.22)]">
              <div className="flex items-center justify-between">
                <span className={`grid size-9 place-items-center rounded-xl ${m.tone}`}>
                  <m.icon className="size-[18px]" aria-hidden="true" />
                </span>
                {m.delta !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#22B573]/10 px-2 py-0.5 text-[10px] font-semibold text-[#22B573] xl:text-[11px]">
                    {m.delta >= 0 ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
                    {signed(m.delta)}
                    <span className="sr-only"> change</span>
                  </span>
                )}
              </div>
              <div className="mt-4 text-[22px] font-bold text-[#17152B] md:text-[25px] xl:text-[28px]">{m.value}</div>
              <div className="mt-1.5 text-xs text-[#8A92A6] md:text-[13px]">{m.label}</div>
            </li>
          ))}
        </ul>

        {history.status === "error" && (
          <p role="alert" className="mt-5 rounded-[24px] border border-[#F1DDE8] bg-white p-5 text-sm text-[#68708A]">
            {history.error?.message ?? "Couldn't load your history."}{" "}
            <button type="button" onClick={history.refetch} className="font-semibold underline">Try again</button>
          </p>
        )}
        {logsReq.status === "error" && (
          <p role="alert" className="mt-5 rounded-[24px] border border-[#F1DDE8] bg-white p-5 text-sm text-[#68708A]">
            {logsReq.error?.message ?? "Couldn't load your daily logs."}{" "}
            <button type="button" onClick={logsReq.refetch} className="font-semibold underline">Try again</button>
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((spec) => (
            <TrendCard key={spec.id} spec={spec} onExpand={() => setExpandedId(spec.id)} />
          ))}
        </div>

        <p className="mt-6 rounded-[24px] border border-[#F1DDE8] bg-white/80 p-4 text-center text-xs text-[#8A92A6]">
          Trends are based on what you log and are not a diagnosis. General wellness information, not medical advice.
        </p>
      </section>

      {scoreOpen && (
        <Overlay label="About your health score" onClose={() => setScoreOpen(false)} side>
          <h2 className="pr-12 text-base font-bold text-[#17152B] md:text-lg">About Your Health Score</h2>
          <p className="mt-1 text-xs text-[#8A92A6] md:text-[13px]">
            Your score is calculated from what you log: cycle regularity, period length, mood and pain, sleep, hydration and activity. A factor without enough data is left out, and nothing is lowered for days you did not log.
          </p>
          <p className="mt-2 text-[11px] text-[#8A92A6] xl:text-xs">This is a wellness indicator and does not diagnose medical conditions.</p>

          <div className="mt-4 flex items-center gap-4">
            <RingGauge value={healthScore ?? 0} size={92} strokeWidth={11} gradient={[PINK, "#8b6cf5"]} trackColor="#f0e6f8" ariaLabel={healthScore === null ? "Health score not available yet" : `Health score ${healthScore} out of 100`}>
              <span className="text-xl font-bold text-[#17152B] md:text-2xl">{healthScore ?? "—"}</span>
              <span className="text-[11px] text-[#8A92A6]">/ 100</span>
            </RingGauge>
            <div className="min-w-0 flex-1 rounded-2xl bg-[#FFF0F6] p-4">
              <div className="text-sm font-bold text-[#F34F97] md:text-[15px]">{health.label}</div>
              <p className="mt-1 text-xs text-[#68708A] md:text-[13px]">{health.note}</p>
            </div>
          </div>

          <h3 className="mb-3 mt-5 text-sm font-bold text-[#17152B] md:text-[15px]">How is your score calculated?</h3>
          <ul className="space-y-2.5">
            {health.factors.map((f) => (
              <li key={f.id} className="rounded-2xl border border-[#F1DDE8] bg-white p-3.5">
                <div className="flex items-center justify-between gap-3 text-xs md:text-[13px]">
                  <span className="font-semibold text-[#17152B]">
                    {f.label} <span className="font-medium text-[#F34F97]">{f.weight}%</span>
                  </span>
                  <span className="shrink-0 font-semibold text-[#68708A]">{f.score === null ? "Not enough data" : `${f.score}/100`}</span>
                </div>
                <div role="progressbar" aria-label={`${f.label} score`} aria-valuenow={f.score ?? 0} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1 overflow-hidden rounded-full bg-[#f1edff]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#F34F97] to-[#8b6cf5]" style={{ width: `${f.score ?? 0}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-[#8A92A6] xl:text-xs">{f.description}</p>
                <p className="mt-1 text-[11px] font-medium text-[#68708A] xl:text-xs">{f.score === null ? `${f.needs} to include this.` : f.detail}</p>
              </li>
            ))}
          </ul>

          <section className="mt-4 rounded-2xl bg-[#FFF0F6] p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#17152B] md:text-[15px]">
              <TrendingUp className="size-4" aria-hidden="true" />
              How can you improve your score?
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#68708A] marker:text-[#F34F97] md:text-[13px]">
              {health.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </Overlay>
      )}

      {expanded && (() => {
        const extra = extras[expanded.id];
        const statCards = extra?.stats.length ? extra.stats : [{ label: "Days logged", value: "0", dot: DOTS[3]! }];
        const keyInsights: InsightSentence[] = extra?.insights.length ? extra.insights : [[expanded.insight]];
        return (
          <Overlay label={expanded.title} onClose={closeExpanded} wide>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-4 pr-12">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[#17152B] md:text-2xl">{expanded.title}</h2>
                <p className="mt-1.5 text-sm text-[#8A92A6]">{expanded.subtitle}</p>
              </div>
              {extra?.range === "window" && <RangeMenu {...windowRangeProps} />}
              {extra?.range === "cycles" && (
                <RangeMenu
                  label={cycleRangeLabel(cycleRange)}
                  options={[
                    ...([3, 6, 12] as const).map((n) => ({ id: `c${n}`, label: `Last ${n} Cycles`, checked: cycleRange.kind === "cycles" && cycleRange.n === n, onSelect: () => setCycleRange({ kind: "cycles", n }) })),
                    ...([6, 12] as const).map((n) => ({ id: `m${n}`, label: `Last ${n} Months`, checked: cycleRange.kind === "months" && cycleRange.n === n, onSelect: () => setCycleRange({ kind: "months", n }) })),
                  ]}
                  calendar={{
                    today,
                    start: cycleRange.kind === "custom" ? cycleRange.from : addMonthsIso(today, -6),
                    end: cycleRange.kind === "custom" ? cycleRange.to : today,
                    active: cycleRange.kind === "custom",
                    onApply: (from, to) => setCycleRange({ kind: "custom", from, to }),
                  }}
                />
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-8">
              <div className="flex min-h-[260px] min-w-0 flex-col">{expanded.render(340, true)}</div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:content-start">
                {statCards.map((card) => (
                  <div key={card.label} className="min-w-0 rounded-[22px] border border-[#F1DDE8] bg-white/80 px-3.5 py-3.5 shadow-sm sm:px-4">
                    <div className="flex items-center gap-2 text-xs text-[#68708A] md:text-[13px]">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: card.dot }} aria-hidden="true" />
                      <span>{card.label}</span>
                    </div>
                    <div className="mt-1 break-words text-[22px] font-bold text-[#17152B]">{card.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <section aria-labelledby="key-insights-title" className="mt-6 rounded-[24px] bg-gradient-to-r from-[#f1edff] via-[#fbf1fa] to-[#FFF0F6] p-5 sm:p-6">
              <h3 id="key-insights-title" className="mb-3 flex items-center gap-2.5 text-base font-semibold text-[#17152B]">
                <Sparkles className="size-5 text-[#6C4DE8]" aria-hidden="true" />
                Key Insights
              </h3>
              <div className="grid grid-cols-1 gap-3 text-xs text-[#68708A] md:grid-cols-3 md:gap-8 md:text-[13px]">
                {keyInsights.map((parts, i) => (
                  <p key={i}>
                    {parts.map((part, j) => (typeof part === "string" ? part : <strong key={j} className="font-semibold text-[#17152B]">{part.bold}</strong>))}
                  </p>
                ))}
              </div>
            </section>
          </Overlay>
        );
      })()}
    </div>
  );
}