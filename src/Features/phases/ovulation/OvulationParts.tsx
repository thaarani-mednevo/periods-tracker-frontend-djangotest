import {
  CalendarHeart,
  ChevronRight,
  CircleCheck,
  Droplet,
  FlaskConical,
  Flower2,
  Heart,
  ShieldAlert,
  Sparkles,
  Thermometer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import mucusArt from "../../../assets/phases/follicular/cervical_mucus_fingers.png";
import mucusCreamy from "../../../assets/phases/follicular/mucus_creamy.png";
import mucusDry from "../../../assets/phases/follicular/mucus_dry.png";
import mucusEggWhite from "../../../assets/phases/follicular/mucus_eggwhite.png";
import mucusSticky from "../../../assets/phases/follicular/mucus_sticky.png";
import mucusWatery from "../../../assets/phases/follicular/mucus_watery.png";
import lhArt from "../../../assets/phases/follicular/lh_test_device.png";
import libidoArt from "../../../assets/phases/follicular/libido_heart.png";
import { useAsync } from "../../../hooks/useAsync";
import { addDays } from "../../../lib/isoDate";
import type { CycleState } from "../../../services/cycle";
import { getPhaseInsight } from "../../../services/insights";
import { getDailyLog, getLogRange, saveDailyLog, type DailyLog } from "../../../services/logs";
import illustration from "../../../assets/phases/ovulation-illustration.png";
import type { FertilityTracking } from "../../../types";
import {
  RISE_THRESHOLD_C,
  analyseBbt,
  fertileWindow,
  toFahrenheit,
  windowStatus,
  type BbtAnalysis,
  type FertileWindow,
  type WindowStatus,
} from "./fertility";
import { CardWave } from "../../../Elements/CardWave/CardWave";

/** Full-hand art for each logged consistency. Falls back to the generic art when nothing is logged. */
const MUCUS_ART: Record<string, string> = {
  Dry: mucusDry,
  Sticky: mucusSticky,
  Creamy: mucusCreamy,
  Watery: mucusWatery,
  "Egg white": mucusEggWhite,
};

// ------------------------------------------------------------------ data hook
/** Everything an ovulation screen reads for the selected day. All values are real (backend), nothing is pre-filled. */
export function useOvulationData(state: CycleState) {
  const day = state.date;
  const log = useAsync(useCallback((s: AbortSignal) => getDailyLog(day, s), [day]));
  const range = useAsync(useCallback((s: AbortSignal) => getLogRange(addDays(day, -9), day, s), [day]));
  const insight = useAsync(useCallback((s: AbortSignal) => getPhaseInsight(day, s), [day]));

  const fw: FertileWindow | null = useMemo(() => fertileWindow(state.ovulation?.date), [state.ovulation?.date]);
  const status: WindowStatus | null = useMemo(() => (fw ? windowStatus(day, fw) : null), [day, fw]);
  const logs = range.data?.logs;
  const bbt: BbtAnalysis = useMemo(() => analyseBbt(logs ?? [], day), [logs, day]);

  const refetchLogs = useCallback(() => {
    log.refetch();
    range.refetch();
  }, [log, range]);

  return { day, log, insight, fw, status, bbt, refetchLogs };
}

/** A card is shown when the user turned that tracking on in Settings, or already logged it for the day. */
export const trackingOn = (tracking: Partial<FertilityTracking>, key: keyof FertilityTracking, logged: boolean) =>
  tracking[key] === true || logged;

// ------------------------------------------------------------------ small shared UI
const panel = "rounded-lu-card border border-lu-brand-line bg-white p-lu-card shadow-lu-card";
const NOT_LOGGED = "Not logged";
/** Frosted card used by the ovulation readiness section (matches the reference design). */
const T_TITLE = "text-[length:clamp(0.9rem,1vw,1.05rem)]";
const T_BODY = "text-[length:clamp(0.8rem,0.74rem_+_0.2vw,0.9375rem)]";
const T_STATUS = "text-[length:clamp(0.6875rem,0.66rem_+_0.1vw,0.75rem)]";
const glass =
  "rounded-[26px] border border-[#F1E9F8] bg-gradient-to-br from-white/90 via-white/80 to-[#FBF3FA]/90 p-lu-card shadow-[0_0_0_4px_rgba(255,255,255,0.55),0_16px_36px_-20px_rgba(167,139,250,0.45)] backdrop-blur-md";

export function Hero({
  eyebrow,
  heading,
  description,
  onLogPeriod,
  extra,
  extraFirst = false,
  image = illustration,
}: {
  eyebrow?: string;
  heading: string;
  description: string;
  onLogPeriod: () => void;
  extra?: ReactNode;
  /** Render `extra` (e.g. View Tips) before the Log period button. */
  extraFirst?: boolean;
  image?: string;
}) {
  return (
    <section className={`${panel} flex min-h-[190px] items-center justify-between gap-5 overflow-hidden`}>
      <div className="min-w-0 max-w-[640px]">
        {eyebrow && (
          <span className="inline-flex rounded-full bg-lu-brand-soft px-3 py-1 text-lu-caption font-bold uppercase tracking-[0.12em] text-lu-brand-strong">
            {eyebrow}
          </span>
        )}
        <h2 className="mt-2 text-lu-heading font-semibold text-lu-ink">{heading}</h2>
        <p className="mt-2.5 text-lu-body text-lu-ink-muted">{description}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {extraFirst && extra}
          <button type="button" onClick={onLogPeriod} className="rounded-full bg-lu-brand-soft px-5 py-2.5 text-lu-label font-semibold text-lu-brand-strong hover:bg-[#FBCFE8]">
            Log period
          </button>
          {!extraFirst && extra}
        </div>
      </div>
      {image && <img src={image} alt="" decoding="async" className="hidden w-[clamp(110px,12vw,170px)] shrink-0 object-contain mix-blend-multiply sm:block" />}
    </section>
  );
}

export function StatusBanner({ title, text, tone }: { title: string; text: string; tone: "calm" | "alert" }) {
  return (
    <section
      role="status"
      className={`rounded-lu-card border p-lu-card shadow-lu-card ${tone === "alert" ? "border-[#F9A8D4] bg-gradient-to-r from-[#FDF2F8] to-[#F5F0FF]" : "border-lu-brand-line bg-white"}`}
    >
      <h2 className="text-lu-heading font-semibold text-lu-ink">{title}</h2>
      <p className="mt-1 text-lu-body text-lu-ink-muted">{text}</p>
    </section>
  );
}

/**
 * One card for the status headline (with real dates), how the user's ovulation looks from what they logged,
 * and, for pregnancy prevention only, the protection reminder.
 */
export function FertilityStatusCard({
  title,
  text,
  tone,
  health,
  showProtection,
}: {
  title: string;
  text: string;
  tone: "calm" | "alert";
  health: { label: string; text: string; tone: "good" | "neutral" | "empty" };
  showProtection: boolean;
}) {
  return (
    <section
      role="status"
      className={`rounded-lu-card border p-lu-card shadow-lu-card ${tone === "alert" ? "border-[#F9A8D4] bg-gradient-to-r from-[#FDF2F8] to-[#F5F0FF]" : "border-lu-brand-line bg-white"}`}
    >
      <h2 className="text-lu-heading font-semibold text-lu-ink">{title}</h2>
      <p className="mt-1 text-lu-body text-lu-ink-muted">{text}</p>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white/70 p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F7A8C8] text-white" aria-hidden="true">
          <Sparkles className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lu-ink-muted">Your ovulation health</p>
          <p className={`mt-0.5 text-lu-label font-semibold ${health.tone === "good" ? "text-[#EC4899]" : "text-lu-ink"}`}>{health.label}</p>
          <p className="mt-0.5 text-lu-label text-lu-ink-muted">{health.text}</p>
        </div>
      </div>

      {showProtection && (
        <p className="mt-3 flex items-start gap-2 text-lu-label text-lu-ink-muted">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#EC4899]" aria-hidden="true" />
          <span>
            <span className="font-semibold text-lu-ink">Keep your usual protection.</span> Tracking can show when pregnancy is more or less likely, but it cannot guarantee it.
          </span>
        </p>
      )}
    </section>
  );
}

export interface Fact {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
}

export function FactGrid({ facts }: { facts: Fact[] }) {
  return (
    <ul className="grid grid-cols-1 gap-lu-grid sm:grid-cols-2 xl:grid-cols-4">
      {facts.map(({ icon: Icon, label, value, note }) => (
        <li key={label} className={`${panel} flex items-center gap-3.5 !p-4`}>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lu-brand-soft text-lu-brand-strong">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-lu-caption font-semibold uppercase tracking-[0.1em] text-lu-ink-muted">{label}</p>
            <p className="mt-1 truncate text-lu-heading font-bold text-lu-ink">{value}</p>
            <p className="mt-0.5 text-lu-caption text-lu-ink-muted">{note}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CardTitle({ icon: Icon, tone, label, small }: { icon: LucideIcon; tone: string; label: string; small?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`flex size-[30px] shrink-0 items-center justify-center rounded-full ${tone}`} aria-hidden="true">
        <Icon className="size-[15px]" />
      </span>
      <h3 className={`${T_TITLE} font-bold leading-tight text-[#17152B]`}>{label}</h3>
    </div>
  );
}

function LogLink({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={`mt-3 ${T_STATUS} font-semibold text-lu-brand-strong hover:underline`}>
      {label}
    </button>
  );
}

/** Corner arrow that tells the user the card opens the Daily Log. */
function OpenArrow({ onOpen, className = "" }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open Daily Log"
      className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A0AEC0] transition-colors hover:bg-lu-brand-tint hover:text-[#F43F8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${className}`}
    >
      <ChevronRight className="size-4" aria-hidden="true" />
    </button>
  );
}

/** Four-point sparkle. Purely visual. */
function Sparkle({ className, color = "#F9A8D4" }: { className: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`absolute ${className}`}>
      <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z" fill={color} fillOpacity="0.85" />
    </svg>
  );
}

/** Glossy pink heart with a highlight. Purely visual. */
function GlossHeart({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`absolute ${className}`}>
      <path d="M12 21C12 21 3 14.5 3 8.5A4.5 4.5 0 0 1 12 6.5A4.5 4.5 0 0 1 21 8.5C21 14.5 12 21 12 21Z" fill="url(#luHeart) #F2619F" />
      <ellipse cx="8.2" cy="9.2" rx="2.3" ry="1.2" fill="#FFFFFF" fillOpacity="0.6" transform="rotate(-32 8.2 9.2)" />
    </svg>
  );
}

/** Soft translucent bubble. Purely visual. */
function Bubble({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute rounded-full border border-white/70 ${className}`}
      style={{ background: "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.25) 22%, rgba(244,200,235,0.35) 70%, rgba(226,205,250,0.45) 100%)" }}
    />
  );
}

/** Glossy pink water drop (used on the cervical mucus card). Purely visual. */
function Drop({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 52" aria-hidden="true" className={`absolute ${className}`}>
      <path d="M20 2C20 2 5 20 5 33a15 15 0 0 0 30 0C35 20 20 2 20 2Z" fill="url(#luDrop) #F7A8D2" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="1.2" />
      <path d="M12 31C12 25 15 20 18 16" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="25" cy="43" rx="6" ry="3" fill="#FFFFFF" fillOpacity="0.35" />
    </svg>
  );
}

/** Shared gradients for the heart and drop art. Rendered once inside <ReadinessShell/>. */
function ArtDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="luHeart" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#FF9CC8" />
          <stop offset="100%" stopColor="#EE3F8E" />
        </linearGradient>
        <linearGradient id="luDrop" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#FFE9F5" />
          <stop offset="100%" stopColor="#F58CC6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Lotus mark for the section header. */
function Lotus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="#FDE4F1" fillOpacity="0.7" stroke="#EC4899" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M24 8C29 15 29 24 24 33C19 24 19 15 24 8Z" />
      <path d="M24 33C17 33 11 28 10 18C16 18 21 22 24 30" />
      <path d="M24 33C31 33 37 28 38 18C32 18 27 22 24 30" />
      <path d="M24 34C14 37 7 32 5 25C10 24 14 26 17 29" />
      <path d="M24 34C34 37 41 32 43 25C38 24 34 26 31 29" />
    </svg>
  );
}

/**
 * Card art with glossy hearts, a bubble and sparkles around it.
 * `orb` also puts the art inside a layered glass bubble and adds a water drop (cervical mucus card); `leaves` is the lighter version.
 * The image itself is never clipped, so a cropped PNG edge cannot show.
 */
function ArtWithCircle({ src, className, variant = "leaves" }: { src: string; className: string; variant?: "orb" | "leaves" }) {
  const orb = variant === "orb";
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute ${className}`}>
      {orb && (
        <>
          <span
            className="absolute inset-0 rounded-full border border-white/90"
            style={{
              background: "radial-gradient(circle at 35% 28%, #FFFFFF 0%, #FDEFF7 50%, #EEE3FC 100%)",
              boxShadow: "0 18px 40px -18px rgba(167,139,250,0.6), inset 0 0 0 10px rgba(255,255,255,0.35), inset 0 -14px 40px rgba(244,114,182,0.12)",
            }}
          />
          <span
            className="absolute inset-[9%] rounded-full border border-white/70"
            style={{ background: "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.9), rgba(250,235,246,0.5) 70%)" }}
          />
        </>
      )}
      <GlossHeart className="right-[0%] top-[34%] size-[9%]" />
      <GlossHeart className="right-[10%] top-[22%] size-[6%]" />
      <Bubble className="left-[4%] top-[6%] size-[12%]" />
      {orb && <Drop className="bottom-[10%] left-[0%] w-[13%]" />}
      <Sparkle className="top-[2%] right-[22%] size-[11%]" />
      <Sparkle className="left-[14%] top-[22%] size-[8%]" color="#C4B5FD" />
      <img src={src} alt="" className={`relative size-full object-contain ${orb ? "p-[19%]" : ""}`} />
    </div>
  );
}

/**
 * Outer frame of the "Ovulation readiness" section: soft pink-lavender wash with blurred glows,
 * lotus badge and glossy hearts in the corners. Cards inside are frosted (`glass`).
 */
export function ReadinessShell({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="relative flex flex-col gap-[15px] overflow-hidden rounded-[28px] border border-[#F6EEFB] p-3 shadow-lu-card sm:p-4 lg:p-5"
      style={{ background: "linear-gradient(135deg,#FFF6FA 0%,#F9F5FF 50%,#FFF2F8 100%)" }}
    >
      <ArtDefs />
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-10 size-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(251,207,232,0.5), transparent 70%)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-0 size-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(221,206,250,0.55), transparent 70%)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 hidden h-40 w-56 sm:block">
        <GlossHeart className="right-32 top-6 size-4" />
        <GlossHeart className="right-24 top-14 size-3" />
        <Bubble className="right-36 top-2 size-5" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 hidden h-44 w-56 sm:block">
        <GlossHeart className="bottom-20 right-36 size-4" />
      </div>
      <div className="relative z-10 flex items-center gap-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-10px_rgba(236,72,153,0.5)]" aria-hidden="true">
          <Lotus className="size-7" />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-[length:clamp(1rem,0.9rem+0.45vw,1.3rem)] font-bold leading-tight text-[#17152B]">{title}</h2>
          <p className={`mt-1.5 ${T_BODY} text-[#5E566F]`}>{subtitle}</p>
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-[15px]">{children}</div>
    </section>
  );
}

// ------------------------------------------------------------------ readiness cards (ovulation-phase design)
const weekday = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });

const TREND_DAYS = 7;
/** Decorative wave used only when there is nothing to plot. It is muted and labelled, never real data. */
const WAVE_PATH = "M0,38 C60,30 110,30 160,36 S260,28 320,24 S420,14 460,6";

/**
 * Always draws the chart frame (last 7 days, ending on the selected day), like the design.
 * 2+ logged readings: a smooth line through the real values, each on its own day, with a °F axis.
 * Fewer than 2: a muted wave with a "Not logged" label, so nothing looks like a real trend.
 */
function BbtSparkline({ points, day }: { points: BbtAnalysis["points"]; day: string }) {
  const days = Array.from({ length: TREND_DAYS }, (_, i) => addDays(day, i - (TREND_DAYS - 1)));
  const byDate = new Map(points.map((p) => [p.date, p.value]));
  const logged = days.flatMap((d, i) => (byDate.has(d) ? [{ i, value: byDate.get(d)! }] : []));
  const real = logged.length >= 2;
  const values = logged.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Minimum visible span, so tiny day-to-day noise (like 0.04°) isn't stretched into a big wave.
  const span = Math.max(max - min, 0.6);
  const lo = (min + max) / 2 - span / 2;
  const coords = logged.map((p) => ({ x: (p.i / (TREND_DAYS - 1)) * 460, y: 40 - ((p.value - lo) / span) * 32 }));
  // Smooth S-curves between readings (control points at the midpoint, so it never overshoots the data).
  const line = coords
    .map(({ x, y }, k) => {
      if (k === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
      const prev = coords[k - 1]!;
      const cx = ((prev.x + x) / 2).toFixed(1);
      return `C${cx},${prev.y.toFixed(1)} ${cx},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  // °F axis taken from the same scale the line is plotted on, so labels always match the line.
  const loF = toFahrenheit(lo);
  const hiF = toFahrenheit(lo + span);
  const ticks = real ? [hiF, (hiF + loF) / 2, loF].map((t) => t.toFixed(1)) : [];
  return (
    <div className="mt-auto flex gap-3.5 pt-3" aria-hidden="true">
      {real && (
        <div className="flex h-20 flex-col justify-between py-[7px] text-[10px] text-lu-ink-muted">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="relative">
          <svg className="h-20 w-full" viewBox="0 0 460 48" preserveAspectRatio="none">
            <defs>
              <linearGradient id="bbtTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B7CF6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8B7CF6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="bbtEmptyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9C2F5" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#C9C2F5" stopOpacity="0" />
              </linearGradient>
            </defs>
            {real ? (
              <>
                <path d={`${line} L${last!.x},48 L${first!.x},48 Z`} fill="url(#bbtTrendFill)" />
                <path d={line} fill="none" stroke="#7C6FF0" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </>
            ) : (
              <>
                <path d={`${WAVE_PATH} L460,48 L200,48 Z`} fill="url(#bbtTrendFill)" />
                <path d={WAVE_PATH} fill="none" stroke="#7C6FF0" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
          {real &&
            coords.map(({ x, y }, k) => (
              <span
                key={x}
                style={{ left: `${(x / 460) * 100}%`, top: `${(y / 48) * 100}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C6FF0] ${k === coords.length - 1 ? "size-2.5 ring-4 ring-[#7C6FF0]/20" : "size-1.5"}`}
              />
            ))}
          {!real && (
            <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-lu-caption font-semibold text-lu-ink-soft">
              {logged.length === 0 ? "Not logged" : "Log more mornings to see your trend"}
            </span>
          )}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-lu-ink-muted">
          {days.map((d) => (
            <span key={d}>{weekday(d)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Today's temperature in °F inside a gradient ring. The arc shows how far the rise over baseline is toward the 0.2°C threshold. */
function TempRing({ celsius, delta }: { celsius: number | null; delta: number | null }) {
  const progress = celsius == null ? 0 : delta != null ? Math.min(Math.max(delta / RISE_THRESHOLD_C, 0.08), 1) : 0.08;
  const CIRC = 2 * Math.PI * 44;
  return (
    <div className="relative -mt-2 grid size-[clamp(6rem,8.5vw,7.5rem)] shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_22px_-8px_rgba(236,72,153,0.4)]">
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="bbtRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F9A8D4" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#FBE3EF" strokeWidth="5" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="url(#bbtRingGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)} />
      </svg>
      <div className="relative flex w-[72%] flex-col items-center text-center">
        <Thermometer className="size-3.5 text-[#EC4899]" aria-hidden="true" />
        <p className="text-[clamp(0.9375rem,0.8rem+0.4vw,1.0625rem)] font-bold leading-tight text-[#1E1B5E]">{celsius == null ? "0" : toFahrenheit(celsius).toFixed(2)}°F</p>
        {delta != null && delta > 0 && (
          <p className="mt-0.5 text-[8px] leading-[1.15] text-[#EC4899]">
            +{delta.toFixed(2)}°C above
            <br />
            baseline
          </p>
        )}
      </div>
    </div>
  );
}

export function BbtCard({ analysis, day, title = "Basal body temp", onOpen }: { analysis: BbtAnalysis; day: string; title?: string; onOpen: () => void }) {
  const { latest, baseline, delta, state, points } = analysis;
  const note =
    state === "no_reading"
      ? "No reading for this day yet."
      : state === "not_enough"
        ? "Log a few more mornings to compare with your baseline."
        : state === "rising"
          ? `Your body temperature is ${delta!.toFixed(2)}°C above your baseline. This rise supports that ovulation may be near.`
          : `Close to your recent baseline (${baseline!.toFixed(2)}°C). A rise of ${RISE_THRESHOLD_C}°C or more usually follows ovulation.`;
  const headline = delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}°C` : latest != null ? `${latest.toFixed(2)}°C` : NOT_LOGGED;
  return (
    <section className={`${glass} relative isolate flex flex-col`} aria-label={title}>
      <CardWave behind />
      <div className="flex items-center justify-between gap-3">
        <CardTitle icon={Thermometer} tone="bg-[#EEF2FF] text-[#6366F1]" label={title} />
        <div className="flex shrink-0 items-center gap-1.5">
          {state === "rising" && <span className="rounded-full bg-[#E9F9EF] px-2.5 py-0.5 text-[10px] font-semibold text-[#16A34A]">Above baseline</span>}
          <OpenArrow onOpen={onOpen} className="-mr-2" />
        </div>
      </div>
      <div className="-mb-5 mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`flex flex-wrap items-baseline gap-2 ${T_TITLE} font-semibold leading-[1.3] text-[#17152B]`}>
            {headline}
            {state === "rising" && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#16A34A]">
                <TrendingUp className="size-3" aria-hidden="true" /> Rising
              </span>
            )}
          </p>
          <p className={`mt-1 max-w-[300px] ${T_BODY} leading-[1.45] text-[#5E566F]`}>{note}</p>
        </div>
        <TempRing celsius={latest} delta={delta} />
      </div>
      <BbtSparkline points={points} day={day} />
      {latest == null && <LogLink label="Log today's temperature" onOpen={onOpen} />}
    </section>
  );
}

export function MucusCard({ log, scale, meta, onOpen }: { log: DailyLog | null; scale: readonly string[]; meta: Record<string, { description: string; badge: string }>; onOpen: () => void }) {
  const value = log?.cervicalMucus ?? null;
  const info = value ? meta[value] : null;
  return (
    <section
      className={`${glass} relative isolate overflow-hidden`}
      style={{ background: "linear-gradient(135deg,#fff 0%,#FFF8FC 55%,#F7F1FF 100%)" }}
      aria-label="Cervical mucus"
    >
      <CardWave behind />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <CardTitle icon={Droplet} tone="bg-lu-brand-soft text-lu-brand-strong" label="Cervical mucus" />
          {info && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-white bg-gradient-to-r from-[#FBE1F1] to-[#FDEEF8] py-1 pl-2.5 pr-3.5 text-[13px] font-semibold text-[#E04BA8] shadow-[0_6px_16px_-8px_rgba(236,72,153,0.5)]">
              <Sparkles className="size-4 fill-current text-[#EC4899]" aria-hidden="true" />
              {info.badge}
            </span>
          )}
        </div>
        <OpenArrow onOpen={onOpen} className="-mr-2" />
      </div>
      <div className="relative z-10 mt-4 max-w-[48%]">
        <p className={`${T_TITLE} font-semibold leading-[1.3] text-[#17152B]`}>{value ?? NOT_LOGGED}</p>
        <p className={`mt-1 ${T_BODY} leading-[1.45] text-[#5E566F]`}>{info?.description ?? "Log it to see what it means for your fertility."}</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Consistency scale">
          {scale.map((s) => (
            <span key={s} title={s} className={`rounded-full px-3 py-1 ${T_BODY} font-medium ${s === value ? "bg-[#F472B6] text-white" : "bg-[#F6EEF4] text-[#5E566F]"}`}>
              {s === "Egg white" && s === value ? "EW" : s}
            </span>
          ))}
        </div>
        {!value && <LogLink label="Log today's mucus" onOpen={onOpen} />}
      </div>

      {/* Image: vertically centered in the card, on the right */}
      <ArtWithCircle
        src={(value && MUCUS_ART[value]) || mucusCreamy}
        variant="orb"
        className="right-[6%] top-1/2 hidden aspect-square h-[70%] -translate-y-1/2 min-[420px]:block"
      />
    </section>
  );
}

export function LhCard({ log, meta, onOpen }: { log: DailyLog | null; meta: Record<string, string>; onOpen: () => void }) {
  const value = log?.lhTest ?? null;
  return (
    <section className={`${glass} relative isolate min-h-[190px] overflow-hidden`} aria-label="LH ovulation test">
      <CardWave behind />
      <OpenArrow onOpen={onOpen} className="absolute right-2 top-2 z-20" />
      <CardTitle icon={FlaskConical} tone="bg-[#EAF6FE] text-[#38A5E8]" label="LH Ovulation Test" small />
      <div className="relative z-10 mt-4 max-w-[62%]">
        <p className={`${T_TITLE} font-semibold leading-[1.3] text-[#17152B]`}>{value ?? NOT_LOGGED}</p>
        <p className={`mt-1 ${T_BODY} leading-[1.45] text-[#5E566F]`}>{value ? meta[value] : "Log a test result to see it here."}</p>
        {value && (
          <div className="mt-4 h-2.5 w-[clamp(110px,10vw,150px)] overflow-hidden rounded-full bg-[#FBE3EF]" aria-hidden="true">
            <span className={`block h-full rounded-full bg-gradient-to-r from-[#F472B6] to-[#FB9BC8] ${value === "Peak" ? "w-full" : value === "High" ? "w-1/2" : value === "Low" ? "w-1/4" : "w-[8%]"}`} />
          </div>
        )}
        {!value && <LogLink label="Log today's test" onOpen={onOpen} />}
      </div>
      <ArtWithCircle src={lhArt} decor={false} className="bottom-5 right-7 size-[clamp(96px,9vw,120px)]" />
    </section>
  );
}

export function LibidoCard({ log, meta, onOpen }: { log: DailyLog | null; meta: Record<string, string>; onOpen: () => void }) {
  const value = log?.libido ?? null;
  return (
    <section className={`${glass} relative isolate min-h-[190px] overflow-hidden`} aria-label="Libido">
      <CardWave behind />
      <OpenArrow onOpen={onOpen} className="absolute right-2 top-2 z-20" />
      <CardTitle icon={Heart} tone="bg-[#FDECF3] text-[#EC4899]" label="Libido" small />
      <div className="relative z-10 mt-4 max-w-[50%]">
        <p className={`${T_TITLE} font-semibold leading-[1.3] text-[#17152B]`}>{value ?? NOT_LOGGED}</p>
        <p className={`mt-1 ${T_BODY} leading-[1.45] text-[#5E566F]`}>{value ? meta[value] : "Log it to track changes through your cycle."}</p>
        {!value && <LogLink label="Log today's libido" onOpen={onOpen} />}
      </div>
      <ArtWithCircle src={libidoArt} decor={false} className="bottom-5 right-7 size-[clamp(96px,9vw,120px)]" />
    </section>
  );
}

/** Level comes from where today sits in the estimated window. It is not a measured score. */
const LEVEL_STAGES = ["Low", "Rising", "Peak", "Falling"] as const;
type LevelStage = (typeof LEVEL_STAGES)[number];

/** Each stage has its own color so Low, Rising, Peak and Falling look clearly different. */
const LEVEL_THEME: Record<LevelStage, { from: string; to: string; text: string; badge: string; glow: string }> = {
  Low: { from: "#D8D2E3", to: "#ECE8F2", text: "#5E566F", badge: "from-[#F3F0F7] to-[#F8F6FB] text-[#5E566F]", glow: "rgba(150,140,170,0.30)" },
  Rising: { from: "#A78BFA", to: "#F0A6D8", text: "#9B5DE5", badge: "from-[#F1EAFE] to-[#FAEAF6] text-[#9B5DE5]", glow: "rgba(167,139,250,0.4)" },
  Peak: { from: "#F472B6", to: "#E11D74", text: "#E0006A", badge: "from-[#FBE1F1] to-[#FDEEF8] text-[#E04BA8]", glow: "rgba(236,72,153,0.55)" },
  Falling: { from: "#FBBF77", to: "#F58FB8", text: "#EA7100", badge: "from-[#FFEFD9] to-[#FFF5E8] text-[#EA7100]", glow: "rgba(245,158,11,0.4)" },
};
/** Level comes from where today sits in the estimated window. It is not a measured score. */
export function FertilityLevelCard({
  level,
  signals,
}: {
  level: { label: string; percent: number; note: string };
  signals: { label: string; value: string | null }[];
}) {
  const stage: LevelStage = (LEVEL_STAGES as readonly string[]).includes(level.label) ? (level.label as LevelStage) : "Low";
  const theme = LEVEL_THEME[stage];
  const activeStage = LEVEL_STAGES.indexOf(stage);
  const anyLogged = signals.some((s) => !!s.value);
  return (
    <section className={`${glass} relative overflow-hidden`} aria-label="Fertility level">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full" style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }} />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <CardTitle icon={Heart} tone="bg-[#F1EDFE] text-[#8B5CF6]" label="Fertility level" />
        <span className={`inline-flex items-center gap-1.5 rounded-full border-2 border-white bg-gradient-to-r py-0.5 pl-2.5 pr-3.5 text-[12px] font-bold uppercase tracking-wide shadow-[0_6px_16px_-8px_rgba(236,72,153,0.5)] ${theme.badge}`}>
          <Sparkles className="size-3.5 fill-current" aria-hidden="true" />
          {anyLogged ? level.label : `${level.label} · est.`}
        </span>
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-5">
        {/* Small semicircle gauge */}
        <div
          className="relative w-[clamp(110px,10vw,132px)] shrink-0"
          role="img"
          aria-label={`Fertility level ${level.label}, estimated from your cycle dates`}
        >
          <svg viewBox="0 0 180 100" className="w-full" aria-hidden="true">
            <defs>
              <linearGradient id="fertGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={theme.from} />
                <stop offset="100%" stopColor={theme.to} />
              </linearGradient>
            </defs>
            <path d="M20,90 A70,70 0 0 1 160,90" pathLength="100" fill="none" stroke="#EEEAF8" strokeWidth="16" strokeLinecap="round" />
            <path
              d="M20,90 A70,70 0 0 1 160,90"
              pathLength="100"
              fill="none"
              stroke="url(#fertGaugeGrad)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(level.percent, 2)} 100`}
              style={{ filter: `drop-shadow(0 4px 6px ${theme.glow})` }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center">
            <p className="text-[22px] font-semibold leading-none tracking-tight" style={{ color: theme.text }}>{level.label}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-[#7B8DB8]">{anyLogged ? "your logs" : "estimate"}</p>
          </div>
        </div>

        {/* Note, stage track and signals */}
        <div className="min-w-0 flex-1">
          <p className={`${T_TITLE} font-semibold leading-tight text-[#17152B]`}>{level.note}</p>
          {!anyLogged && (
            <p className="mt-1 text-[12px] leading-snug text-[#7B8DB8]">Based on your cycle dates only. Log LH, mucus or temperature to confirm.</p>
          )}

          <div className="mt-2.5 flex gap-1.5">
            {LEVEL_STAGES.map((s, i) => {
              const active = i === activeStage;
              const passed = i < activeStage;
              const t = LEVEL_THEME[s];
              return (
                <div key={s} className="min-w-0 flex-1">
                  <span
                    className={`block rounded-full ${active ? "h-2" : "h-1.5"} ${active || passed ? "" : "bg-[#EEEAF8]"}`}
                    style={
                      active
                        ? { background: `linear-gradient(90deg, ${t.from}, ${t.to})`, boxShadow: `0 3px 8px -2px ${t.glow}` }
                        : passed
                          ? { background: `linear-gradient(90deg, ${t.from}, ${t.to})`, opacity: 0.6 }
                          : undefined
                    }
                  />
                  <span
                    className={`mt-1 block truncate text-[10.5px] ${active ? "font-bold" : passed ? "font-medium" : "text-[#7B8DB8]"}`}
                    style={active || passed ? { color: t.text } : undefined}
                  >
                    {s}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {signals.map((s, i) => {
              const Icon = [FlaskConical, Droplet, Thermometer][i] ?? Sparkles;
              const logged = !!s.value;
              return (
                <span
                  key={s.label}
                  className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-3 text-[12px] ${logged ? "border-[#F3D5E8] bg-white font-semibold text-[#1E1B5E]" : "border-[#EEEAF8] bg-[#F8F6FD] text-[#7B8DB8]"}`}
                >
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${logged ? "bg-[#FDE8F2] text-[#EC4899]" : "bg-white text-[#A9B3D1]"}`} aria-hidden="true">
                    <Icon className="size-3" />
                  </span>
                  <span className="truncate">
                    <span className="font-normal text-[#7B8DB8]">{s.label}: </span>
                    {s.value ?? NOT_LOGGED}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
/** Yes / No for today. Saves straight to the daily log, so Calendar, Trends and the insight see it. */
export function IntercourseCard({ log, day, onSaved }: { log: DailyLog | null; day: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = log?.intercourse ?? null;

  const choose = async (next: boolean) => {
    if (!log || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveDailyLog(day, { ...log, intercourse: next });
      onSaved();
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={panel} aria-label="Intercourse">
      <CardTitle icon={CalendarHeart} tone="bg-[#FDECF3] text-[#EC4899]" label="Intercourse today" />
      <p className="mt-3 text-lu-label text-lu-ink-muted">Logged dates are compared with your fertile window.</p>
      <div className="mt-4 flex gap-3">
        {[
          { label: "Yes", v: true },
          { label: "No", v: false },
        ].map(({ label, v }) => (
          <button
            key={label}
            type="button"
            disabled={saving || !log}
            aria-pressed={value === v}
            onClick={() => choose(v)}
            className={`rounded-full px-6 py-2 text-lu-label font-semibold transition-colors disabled:opacity-60 ${value === v ? "bg-lu-brand-strong text-white" : "bg-lu-brand-soft text-lu-brand-strong hover:bg-[#FBCFE8]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-lu-caption text-[#B91C1C]">{error}</p>}
    </section>
  );
}

export function ProtectionCard() {
  return (
    <section className="flex items-start gap-3 rounded-lu-card border border-[#F9A8D4] bg-[#FDF1F6] p-lu-card" aria-label="Protection reminder">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F7A8C8] text-white" aria-hidden="true">
        <ShieldAlert className="size-[18px]" />
      </span>
      <div>
        <h3 className="text-lu-label font-semibold text-lu-ink">Keep your usual protection</h3>
        <p className="mt-1 text-lu-label text-lu-ink-muted">
          Tracking can show when pregnancy is more or less likely, but it cannot guarantee it. Continue using your regular method of protection.
        </p>
      </div>
    </section>
  );
}

export function CheckList({ items, check }: { items: string[]; check: string }) {
  return (
    <ul className="mt-2.5 space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2.5 text-lu-label text-lu-ink-soft">
          <CircleCheck className={`mt-px size-[18px] shrink-0 ${check}`} aria-hidden="true" />
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  );
}