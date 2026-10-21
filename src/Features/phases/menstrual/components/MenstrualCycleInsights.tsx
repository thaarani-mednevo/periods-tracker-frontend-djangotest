import { Smile, Sparkles, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { HormonePattern } from "../../../../services/cycle";
import type { Energy, Mood } from "../../../../services/logs";
import insightGirlImg from "../../../../assets/phases/menstrual/3d/cycle-insight.png";
import { surface } from "./surface";

const SEGMENTS = 10;
const ENERGY_SEGMENTS: Record<Energy, number> = { Low: 3, Moderate: 6, High: 9 };
const MOOD_SEGMENTS: Record<Mood, number> = { Happy: 9, Calm: 8, Neutral: 6, Irritable: 4, Sad: 3 };
const ENERGY_TEXT: Record<Energy, string> = {
  Low: "It's normal to feel lower energy during your period.",
  Moderate: "Balanced energy today. Keep hydrated and steady.",
  High: "Great energy today! Enjoy it, and keep hydrated.",
};
const MOOD_TEXT: Record<Mood, string> = {
  Happy: "Positive, bright mood logged today.",
  Calm: "Feeling relaxed, peaceful and grounded.",
  Neutral: "Balanced, steady emotional baseline today.",
  Irritable: "You may feel more emotional today. Be gentle with yourself.",
  Sad: "Take extra rest and give yourself comforting self-care.",
};
const NOT_LOGGED = "Not logged";
const LOG_HINT = "Log it in your daily log to see insights here.";

/** Bar colour by how full it is: low = pink, medium = amber, high = green. */
const LEVEL_TONES = {
  low: { fill: "bg-[#F43F8F]", track: "bg-[#FDE4EE]" },
  medium: { fill: "bg-[#F59E0B]", track: "bg-[#FFF1D6]" },
  high: { fill: "bg-[#16A34A]", track: "bg-[#DDF7E8]" },
} as const;

const levelTone = (filled: number) => (filled <= 4 ? LEVEL_TONES.low : filled <= 6 ? LEVEL_TONES.medium : LEVEL_TONES.high);

/** Short dashes. The value is also given as text for assistive tech. */
function DashMeter({ filled, label, className = "mt-3" }: { filled: number; label: string; className?: string }) {
  const tone = levelTone(filled);
  return (
    <div className={`${className} flex items-center gap-1.5`} role="img" aria-label={label}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span key={i} className={`h-[5px] w-4 rounded-full ${i < filled ? tone.fill : tone.track}`} />
      ))}
    </div>
  );
}

function CardHeader({ icon, iconClass, title }: { icon: ReactNode; iconClass: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconClass}`} aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-sm font-medium tracking-tight text-[#17152B] sm:text-[15px]">{title}</h3>
    </div>
  );
}

/* ---------- Empty-state artwork (pure CSS / SVG, only the girl is an image) ---------- */

const HEART_PATH = "M12 21s-7.5-4.6-9.6-9.2C1 8.6 2.8 5 6.2 5c2.1 0 3.6 1.1 4.3 2.3h3C14.2 6.1 15.7 5 17.8 5c3.4 0 5.2 3.6 3.8 6.8C19.5 16.4 12 21 12 21z";
const LEAF_PATH = "M0 0C16-14 16-42 0-64C-16-42-16-14 0 0Z";
const SPARKLE_PATH = "M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z";

/** Header badge: pink circle, gradient bars, small heart. */
function InsightsHeaderIcon() {
  return (
    <div className="relative size-11 shrink-0 sm:size-12" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-[#FDE0EE]" />
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full" fill="none">
        <defs>
          <linearGradient id="ci-hbar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F43F8F" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect x="14" y="24" width="5.5" height="12" rx="2.75" fill="url(#ci-hbar)" />
        <rect x="21.5" y="14" width="5.5" height="22" rx="2.75" fill="url(#ci-hbar)" />
        <rect x="29" y="20" width="5.5" height="16" rx="2.75" fill="url(#ci-hbar)" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute -right-1 -top-1 size-3.5" fill="#F472B6">
        <path d={HEART_PATH} />
      </svg>
    </div>
  );
}

/** Lightbulb with heart inside a soft pink glow. */
function InsightsBulbIcon() {
  return (
    <div className="relative flex size-16 shrink-0 items-center justify-center sm:size-[72px]" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,#FFE6F1_0%,#FFD9EA_70%,#FFD0E5_100%)]" />
      <svg viewBox="0 0 64 64" fill="none" className="relative size-[74%]">
        <defs>
          <linearGradient id="ci-bulb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FB7BB0" />
            <stop offset="1" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <g stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round">
          <path d="M32 3v6" />
          <path d="M11 12l4 4" />
          <path d="M53 12l-4 4" />
          <path d="M3 30h6" />
          <path d="M55 30h6" />
        </g>
        <path
          d="M32 14c-8.3 0-15 6.4-15 14.3 0 5 2.6 8.3 5.3 11 1.4 1.4 2.2 3 2.2 4.7v1h14.9v-1c0-1.7.8-3.3 2.2-4.7 2.7-2.7 5.4-6 5.4-11C47 20.4 40.3 14 32 14z"
          fill="#FFF7FB"
          stroke="url(#ci-bulb)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M32 35l-5.4-5.3a3.5 3.5 0 014.9-5l.5.5.5-.5a3.5 3.5 0 014.9 5L32 35z" fill="url(#ci-bulb)" />
        <path d="M26 49h12M27.5 54h9" stroke="url(#ci-bulb)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Glossy 3D-ish pink heart used as a floating decoration. */
function GlossHeart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ci-gh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF7DB5" />
          <stop offset="1" stopColor="#F0388C" />
        </linearGradient>
      </defs>
      <path d={HEART_PATH} fill="url(#ci-gh)" />
      <ellipse cx="8.2" cy="9" rx="2.2" ry="1.2" transform="rotate(-30 8.2 9)" fill="#fff" opacity="0.55" />
    </svg>
  );
}

/** Glass bubble: soft white fill, light rim, small highlight. */
function Bubble({ className = "" }: { className?: string }) {
  return (
    <span className={`absolute rounded-full border border-white/80 bg-gradient-to-br from-white/60 to-white/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.7)] ${className}`}>
      <span className="absolute left-[20%] top-[18%] size-[16%] rounded-full bg-white/90" />
    </span>
  );
}

/** Coloured leaf cluster that grows from the bottom-right corner (sits behind the girl). */
function LeafCluster() {
  const leaf = (x: number, y: number, rot: number, s: number, fill: string, o = 0.9) => (
    <g key={`${x}-${y}-${rot}`} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
      <path d={LEAF_PATH} fill={fill} />
      <path d="M0 -4V-54" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 400 260"
      preserveAspectRatio="xMaxYMax meet"
      className="absolute bottom-0 right-0 hidden h-full max-h-[300px] w-auto sm:block"
      fill="none"
    >
      <defs>
        <linearGradient id="ci-lv" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DCCBF8" />
          <stop offset="1" stopColor="#A98AEB" />
        </linearGradient>
        <linearGradient id="ci-pk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FCCFE5" />
          <stop offset="1" stopColor="#F59BC6" />
        </linearGradient>
        <linearGradient id="ci-pc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE0CC" />
          <stop offset="1" stopColor="#F9A9BE" />
        </linearGradient>
        <linearGradient id="ci-lv2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EADDFB" />
          <stop offset="1" stopColor="#C2A6F2" />
        </linearGradient>
      </defs>

      {/* back layer: pale leaves */}
      {leaf(250, 270, -48, 1.9, "url(#ci-lv2)", 0.55)}
      {leaf(300, 270, 30, 2.1, "url(#ci-pk)", 0.5)}
      {leaf(220, 272, -72, 1.4, "url(#ci-lv2)", 0.5)}

      {/* sprig with small pink leaves */}
      <path d="M232 262C226 220 236 180 262 150" stroke="#F472B6" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      {leaf(236, 214, -50, 0.38, "url(#ci-pk)", 0.95)}
      {leaf(240, 196, 42, 0.36, "url(#ci-pk)", 0.95)}
      {leaf(250, 172, -40, 0.34, "url(#ci-pk)", 0.95)}
      {leaf(262, 150, 12, 0.32, "url(#ci-pk)", 0.95)}

      {/* main cluster */}
      {leaf(330, 276, -14, 1.9, "url(#ci-lv)", 0.9)}
      {leaf(356, 276, 24, 1.85, "url(#ci-pc)", 0.92)}
      {leaf(300, 276, -42, 1.65, "url(#ci-pk)", 0.92)}
      {leaf(384, 272, 6, 2.1, "url(#ci-lv)", 0.9)}
      {leaf(270, 278, -64, 1.25, "url(#ci-lv)", 0.85)}
      {leaf(340, 278, 48, 1.4, "url(#ci-lv2)", 0.9)}
      {leaf(392, 276, -28, 1.7, "url(#ci-pc)", 0.9)}
    </svg>
  );
}

/**
 * Background built fully in code: colour glows, layered flowing waves, glass bubbles,
 * a leaf cluster, glossy hearts and sparkles. No image file needed.
 */
function InsightsBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* colour glows */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 100% at 0% 100%, rgba(244,168,210,0.45) 0%, rgba(244,168,210,0) 70%)," +
            "radial-gradient(50% 90% at 45% 0%, rgba(205,184,248,0.42) 0%, rgba(205,184,248,0) 70%)," +
            "radial-gradient(45% 100% at 100% 100%, rgba(248,172,214,0.5) 0%, rgba(248,172,214,0) 70%)," +
            "radial-gradient(40% 80% at 100% 0%, rgba(190,160,246,0.5) 0%, rgba(190,160,246,0) 70%)," +
            "linear-gradient(105deg, #FFFFFF 0%, #FEF3F9 45%, #F6EEFF 100%)",
        }}
      />

      {/* layered flowing waves */}
      <svg viewBox="0 0 1200 260" preserveAspectRatio="none" className="absolute inset-0 size-full" fill="none">
        <defs>
          <linearGradient id="ci-sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ci-wavePk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F9C6E0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#F5B5D8" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="ci-waveLv" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#DCCBF8" stopOpacity="0.1" />
            <stop offset="1" stopColor="#C8B0F4" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* coloured swooshes */}
        <path d="M-20 140C120 90 260 190 460 150C640 112 760 70 920 100C1040 122 1130 90 1220 60V0H-20Z" fill="url(#ci-waveLv)" opacity="0.55" />
        <path d="M-20 260V170C140 130 300 230 520 190C740 150 880 110 1220 150V260Z" fill="url(#ci-wavePk)" />
        <path d="M-20 260V210C200 180 380 250 620 220C860 190 1000 170 1220 200V260Z" fill="#fff" opacity="0.4" />
        {/* white sheen lines */}
        <path d="M-20 195C180 150 330 245 560 200C780 158 930 96 1220 140" stroke="url(#ci-sheen)" strokeWidth="2" />
        <path d="M-20 225C220 190 380 262 640 226C860 196 1020 176 1220 205" stroke="url(#ci-sheen)" strokeWidth="1.5" />
        <path d="M280 36C480 -14 680 70 880 30C1000 8 1110 16 1220 34" stroke="url(#ci-sheen)" strokeWidth="1.5" />
        <path d="M-20 70C120 28 260 98 430 54" stroke="url(#ci-sheen)" strokeWidth="1.5" />
        <path d="M520 110C660 60 820 120 1000 70" stroke="url(#ci-sheen)" strokeWidth="1.2" />
      </svg>

      {/* leaf cluster (right) */}
      <LeafCluster />

      {/* glass bubbles */}
      <Bubble className="-left-5 bottom-2 hidden size-16 sm:block" />
      <Bubble className="left-[3%] top-[34%] hidden size-7 sm:block" />
      <Bubble className="left-[36%] -top-3 hidden size-10 lg:block" />
      <Bubble className="right-[2%] top-2 hidden size-12 lg:block" />
      <Bubble className="left-[46%] bottom-2 hidden size-5 lg:block" />

      {/* glossy hearts near the right cluster */}
      <GlossHeart className="absolute right-[24%] top-[6%] hidden size-6 lg:block" />
      <GlossHeart className="absolute right-[5%] top-[30%] hidden size-5 lg:block" />
      <GlossHeart className="absolute right-[13%] bottom-[10%] hidden size-4 lg:block" />
      <svg viewBox="0 0 24 24" className="absolute bottom-3 left-[41%] hidden size-4 text-[#F4A6D2] opacity-70 lg:block" fill="currentColor">
        <path d={HEART_PATH} />
      </svg>

      {/* sparkles */}
      <svg viewBox="0 0 24 24" className="absolute left-[41%] top-[20%] hidden size-3.5 text-white lg:block" fill="currentColor">
        <path d={SPARKLE_PATH} />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute left-[8%] top-[20%] hidden size-3 text-white sm:block" fill="currentColor">
        <path d={SPARKLE_PATH} />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute left-[58%] top-[58%] hidden size-3 text-white lg:block" fill="currentColor">
        <path d={SPARKLE_PATH} />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute right-[34%] bottom-[12%] hidden size-3.5 text-white lg:block" fill="currentColor">
        <path d={SPARKLE_PATH} />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute right-[18%] top-[10%] hidden size-3 text-[#F9A8D4] lg:block" fill="currentColor">
        <path d={SPARKLE_PATH} />
      </svg>
    </div>
  );
}

interface Props {
  energy: Energy | null;
  mood: Mood | null;
  /** Typical estrogen / progesterone pattern for the selected day, computed by the backend from the cycle phase. */
  hormones: HormonePattern | null;
  /** Insights unlock once a flow is logged for the day. */
  periodLogged: boolean;
}

export function MenstrualCycleInsights({ energy, mood, hormones, periodLogged }: Props) {
  const nothingLogged = !periodLogged;

  // Estrogen + progesterone are shown together in one bar (average of both) with one sentence below.
  const markers = hormones?.markers ?? [];
  const sameLevel = markers.length > 0 && markers.every((h) => h.level === markers[0].level);
  const hormoneHeadline = sameLevel ? markers[0].level : "Mixed";
  const hormoneSegments = markers.length ? Math.round(markers.reduce((sum, h) => sum + h.segments, 0) / markers.length) : 0;
  const hormoneText = sameLevel
    ? `${markers.map((h) => h.name).join(" and ")} typically ${markers[0].level.toLowerCase()}.`
    : `${markers.map((h) => `${h.name} typically ${h.level.toLowerCase()}`).join(", ")}.`;

  /* ---------- Empty state (matches reference design) ---------- */
  if (nothingLogged) {
    return (
      <section
        aria-labelledby="menstrual-cycle-insights"
        className={`${surface.card} relative w-full overflow-hidden p-4 text-left sm:px-5 sm:py-4 lg:px-7`}
      >
        <InsightsBackdrop />

        <div className="relative z-10 grid grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-6">
          {/* Left: header + banner */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <InsightsHeaderIcon />
              <div className="min-w-0">
                <h2 id="menstrual-cycle-insights" className="text-lg font-extrabold tracking-tight text-[#2E1065] sm:text-[22px]">
                  Cycle Insights
                </h2>
                <p className="mt-0.5 text-xs text-[#68708A]">Based on your logged data and current cycle phase.</p>
              </div>
            </div>

            <div
              className="relative mt-3 flex flex-col items-start gap-3 overflow-hidden rounded-[24px] border border-white/80 px-4 py-3 shadow-[0_6px_20px_-12px_rgba(168,85,247,0.35)] backdrop-blur-[2px] sm:flex-row sm:items-center sm:gap-4"
              style={{ background: "linear-gradient(100deg, rgba(255,236,245,0.82) 0%, rgba(250,241,253,0.74) 55%, rgba(243,237,254,0.8) 100%)" }}
            >
              <InsightsBulbIcon />
              <span className="hidden h-12 w-px shrink-0 bg-[#E4D6F2] sm:block" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <h3 className="text-base font-extrabold tracking-tight text-[#2E1065] sm:text-[17px]">Insights will appear after you start logging</h3>
                <p className="max-w-lg text-xs font-medium leading-relaxed text-[#68708A]">
                  Log your period, symptoms and daily details to see personalized insights about your cycle, mood, energy and hormonal changes.
                </p>
              </div>
            </div>
          </div>

          {/* Right: girl illustration. mix-blend-multiply hides the PNG's white box over the background */}
          <div className="flex select-none items-center justify-center">
            <img
              src={insightGirlImg}
              alt=""
              loading="lazy"
              className="h-auto w-full max-w-[300px] object-contain mix-blend-multiply lg:h-[190px] lg:w-auto lg:max-w-none"
            />
          </div>
        </div>
      </section>
    );
  }

  /* ---------- Logged state ---------- */
  return (
    <section aria-labelledby="menstrual-cycle-insights" className={`${surface.card} w-full p-4 text-left sm:p-5`}>
      <h2 id="menstrual-cycle-insights" className="text-sm font-bold tracking-tight text-[#17152B] sm:text-[15px]">
        Cycle Insights
      </h2>
      <p className="mt-1 text-xs text-[#68708A] sm:text-[13px]">Based on your logged data and current cycle phase.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className={`${surface.inner} min-h-[168px] p-4 sm:p-5`}>
          <CardHeader icon={<Zap className="size-[18px]" />} iconClass="bg-[#FFF3DC] text-[#F59E0B]" title="Energy Level" />
          <p className="mt-4 text-lg font-semibold tracking-tight text-[#17152B] sm:text-[19px]">{energy ?? NOT_LOGGED}</p>
          <DashMeter filled={energy ? ENERGY_SEGMENTS[energy] : 0} label={`Energy ${energy ?? "not logged"}`} />
          <p className="mt-3 text-xs leading-relaxed text-[#6B7280] sm:text-[13px]">{energy ? ENERGY_TEXT[energy] : LOG_HINT}</p>
        </div>

        <div className={`${surface.inner} min-h-[168px] p-4 sm:p-5`}>
          <CardHeader icon={<Smile className="size-[18px]" />} iconClass="bg-[#DDF7E8] text-[#16A34A]" title="Mood" />
          <p className="mt-4 text-lg font-semibold tracking-tight text-[#17152B] sm:text-[19px]">{mood ?? NOT_LOGGED}</p>
          <DashMeter filled={mood ? MOOD_SEGMENTS[mood] : 0} label={`Mood ${mood ?? "not logged"}`} />
          <p className="mt-3 text-xs leading-relaxed text-[#6B7280] sm:text-[13px]">{mood ? MOOD_TEXT[mood] : LOG_HINT}</p>
        </div>

        <div className={`${surface.inner} min-h-[168px] p-4 sm:p-5 md:col-span-2 lg:col-span-1`}>
          <CardHeader icon={<Sparkles className="size-[18px]" />} iconClass="bg-[#F1EAFE] text-[#8B5CF6]" title="Hormonal Changes" />
          {hormones ? (
            <>
              <p className="mt-4 text-lg font-semibold tracking-tight text-[#17152B] sm:text-[19px]">{hormoneHeadline}</p>
              <DashMeter
                filled={hormoneSegments}
                label={`${hormoneText} Typical pattern for this point in your cycle, not a measurement.`}
              />
              <p className="mt-3 text-xs leading-relaxed text-[#6B7280] sm:text-[13px]">{hormoneText}</p>
              <p className="sr-only">{hormones.summary}</p>
            </>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-[#6B7280] sm:text-[13px]">
              Hormone patterns appear once we can place this day in your cycle. Log your period to get started.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}