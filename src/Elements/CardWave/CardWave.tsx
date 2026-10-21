import { useId } from "react";

const TONES = {
  pink: { a: "#FFC9E1", b: "#FFE6F1" },
  purple: { a: "#E4D7FF", b: "#F4EEFF" },
} as const;

export type CardWaveTone = keyof typeof TONES;

/** `behind`: card needs `relative isolate`; the wave sits at z-index -1 under all content, clipped to the card corners. */
export function CardWave({ tone = "pink", behind = false }: { tone?: CardWaveTone; behind?: boolean }) {
  const id = useId();
  const { a, b } = TONES[tone];
  const wave = (
    <svg
      aria-hidden
      viewBox="0 0 400 160"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id={`${id}-back`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={b} stopOpacity="0" />
          <stop offset="1" stopColor={a} stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={b} stopOpacity="0" />
          <stop offset="1" stopColor={b} stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path d="M0,105 C70,60 150,140 240,95 S350,50 400,75 L400,160 L0,160 Z" fill={`url(#${id}-back)`} />
      <path d="M0,130 C90,95 170,155 260,120 S360,90 400,108 L400,160 L0,160 Z" fill={`url(#${id}-front)`} />
    </svg>
  );
  if (!behind) return wave;
  return <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">{wave}</div>;
}