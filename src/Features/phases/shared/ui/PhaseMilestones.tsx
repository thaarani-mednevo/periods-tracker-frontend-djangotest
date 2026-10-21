import { useId, type CSSProperties, type ReactNode } from "react";

/**
 * Icon milestones (floral / leaf style) shared by all four phase status cards.
 * Location: src/Features/phases/shared/ui/PhaseMilestones.tsx
 *
 * active: 0 Period, 1 Follicular, 2 Ovulation, 3 Luteal
 */
export type MilestoneStage = 0 | 1 | 2 | 3;

const PETALS = [0, 72, 144, 216, 288];
const BADGE = "clamp(34px,calc(3.5vw - 4px),48px)";

/** Slim leaf beside a badge, pointing outward and slightly up. */
function Wing({ gradient, side }: { gradient: string; side: "left" | "right" }) {
  const style: CSSProperties = {
    transform: side === "left" ? "scaleX(-1) rotate(-20deg)" : "rotate(-20deg)",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      style={style}
      className={`pointer-events-none absolute top-[27%] size-[48%] ${side === "left" ? "-left-[44%]" : "-right-[44%]"}`}
    >
      <path d="M2 12C6 4.5 14 3.5 22 6c-2 8.5-10 12.5-20 6z" fill={`url(#${gradient})`} />
      <path d="M3.5 12 17 8" stroke="#fff" strokeOpacity=".75" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function PhaseMilestones({ active, className = "" }: { active: MilestoneStage | null; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g = { line: `${uid}-line`, pink: `${uid}-pink`, violet: `${uid}-violet`, lilac: `${uid}-lilac` };

  const icons: ReactNode[] = [
    // Period: pink five-petal flower
    <svg key="p" viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      {PETALS.map((a) => (
        <ellipse key={a} cx="12" cy="7.1" rx="3.3" ry="4.8" transform={`rotate(${a} 12 12)`} fill={`url(#${g.pink})`} />
      ))}
      <circle cx="12" cy="12" r="2.3" fill="#FFE3F0" />
    </svg>,
    // Follicular: filled leaf with vein
    <svg key="f" viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path d="M4.5 19.5C3.8 10 9.5 4 20 4c.6 9.5-5 15.5-15.5 15.5z" fill={`url(#${g.lilac})`} />
      <path d="M5.5 18.5 15 9.5" stroke="#fff" strokeOpacity=".85" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M3.5 21 6 18" stroke="#A78BFA" strokeWidth="1.4" strokeLinecap="round" />
    </svg>,
    // Ovulation: lotus
    <svg key="o" viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <ellipse cx="12" cy="13" rx="2.3" ry="5" transform="rotate(-70 12 18)" fill={`url(#${g.violet})`} opacity=".7" />
      <ellipse cx="12" cy="13" rx="2.3" ry="5" transform="rotate(70 12 18)" fill={`url(#${g.violet})`} opacity=".7" />
      <ellipse cx="12" cy="12" rx="2.7" ry="6" transform="rotate(-36 12 18)" fill={`url(#${g.violet})`} opacity=".85" />
      <ellipse cx="12" cy="12" rx="2.7" ry="6" transform="rotate(36 12 18)" fill={`url(#${g.violet})`} opacity=".85" />
      <ellipse cx="12" cy="12" rx="2.8" ry="6.2" fill={`url(#${g.violet})`} />
      <path d="M6 19.5c3.5 1.6 8.5 1.6 12 0" stroke="#A78BFA" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>,
    // Luteal: violet flower
    <svg key="l" viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      {PETALS.map((a) => (
        <ellipse key={a} cx="12" cy="7.3" rx="3" ry="4.5" transform={`rotate(${a} 12 12)`} fill={`url(#${g.violet})`} />
      ))}
      <circle cx="12" cy="12" r="2.3" fill="#EDE9FE" />
      <circle cx="12" cy="12" r="0.9" fill="#8B5CF6" />
    </svg>,
  ];

  const labels = ["Period", "Follicular", "Ovulation", "Luteal"] as const;

  return (
    <ol aria-label="Cycle phases" className={`relative m-0 grid w-full list-none grid-cols-4 p-0 ${className}`}>
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={g.pink} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF8FC2" />
            <stop offset="1" stopColor="#F43F8F" />
          </linearGradient>
          <linearGradient id={g.violet} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#C4A8FF" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id={g.lilac} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#D5C4FF" />
            <stop offset="1" stopColor="#9F7AEA" />
          </linearGradient>
        </defs>
      </svg>

      {/* wavy connector: first badge centre (12.5%) to last badge centre (87.5%) */}
      <svg aria-hidden="true" viewBox="0 0 400 52" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 w-full" style={{ height: BADGE }}>
        <defs>
          <linearGradient id={g.line} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F9A8D4" />
            <stop offset="0.5" stopColor="#D8B4FE" />
            <stop offset="1" stopColor="#B79CF5" />
          </linearGradient>
        </defs>
        <path d="M50 26 Q100 12 150 26 T250 26 T350 26" fill="none" stroke={`url(#${g.line})`} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      {labels.map((label, i) => {
        const current = i === active;
        const wings = i === 0 ? g.pink : i === 3 ? g.violet : null;
        return (
          <li key={label} aria-current={current ? "step" : undefined} className="relative flex min-w-0 flex-col items-center">
            <span className="relative block" style={{ width: BADGE, height: BADGE }}>
              {wings && (
                <>
                  <Wing gradient={wings} side="left" />
                  <Wing gradient={wings} side="right" />
                </>
              )}
              <span
                aria-hidden="true"
                className={`absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-b ${
                  current
                    ? "scale-110 border-[2.5px] border-[#FF8CC3] from-white to-[#FFE8F4] shadow-[0_0_0_5px_rgba(255,140,195,0.28),0_10px_22px_-6px_rgba(244,63,143,0.7)]"
                    : "border-[1.5px] border-[#DCCBFA] from-white to-[#F1E8FF] shadow-[0_5px_14px_-4px_rgba(139,92,246,0.4)]"
                }`}
              >
                <span className="block size-[58%]">{icons[i]}</span>
              </span>
            </span>
            <span className={`mt-2 max-w-full truncate text-[10px] leading-tight sm:text-[11px] lg:text-[clamp(0.65rem,0.8vw,0.75rem)] ${current ? "font-bold text-[#F43F8F]" : "font-medium text-[#6B6485]"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}