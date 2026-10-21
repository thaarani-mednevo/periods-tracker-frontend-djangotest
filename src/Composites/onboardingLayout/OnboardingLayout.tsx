import { Lock } from "lucide-react";
import { cn } from "../../lib/cn";
import type { ReactNode } from "react";
import brandLogo from "../../assets/logo/periods logo.png";

/** Ambient background: predominantly white with barely-visible pink glows, rings and sparkles. */
function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      <div className="absolute -left-48 -top-48 size-[640px] rounded-full bg-[radial-gradient(circle,rgb(255_156_198/0.16),transparent_62%)] blur-2xl" />
      <div className="absolute -bottom-56 -right-48 size-[680px] rounded-full bg-[radial-gradient(circle,rgb(255_214_196/0.18),rgb(255_229_239/0.12)_40%,transparent_65%)] blur-2xl" />
      <div className="absolute right-1/4 top-1/4 size-[420px] rounded-full bg-[radial-gradient(circle,rgb(255_243_247/0.8),transparent_70%)] blur-3xl" />

      {/* Thin pink holographic rings */}
      <div className="absolute -right-32 top-28 size-[420px] animate-spin-slower rounded-full border border-rose/[0.06]">
        <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose/30" />
      </div>

      {/* Blush circles */}
      <div className="absolute left-[5%] top-[62%] size-12 animate-float-slow rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff,rgb(255_156_198/0.25)_65%)] opacity-70" />
      <div className="absolute right-[7%] top-[9%] size-6 animate-float rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff,rgb(243_79_151/0.2)_65%)]" />

      {/* Pink particles */}
      {["left-[22%] top-[12%]", "left-[62%] top-[6%]", "right-[4%] top-[48%]", "left-[3%] top-[32%]", "right-[28%] bottom-[6%]"].map((pos, i) => (
        <span key={pos} className={`absolute ${pos} size-1.5 animate-glow rounded-full bg-rose/25`} style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
    </div>
  );
}

/**
 * Brand logo from assets/logo. The PNG is a 500x500 canvas with the artwork in the middle, so the wrapper
 * crops to the artwork (x 48-396, y 195-305) and the logo fills the header height instead of looking tiny.
 */
export function BrandMark() {
  return (
    <div className="relative h-10 w-[127px] shrink-0 overflow-hidden sm:h-12 sm:w-[152px]">
      <img
        src={brandLogo}
        alt="Mednevo Cycle Tracker"
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: "143.678%", left: "-13.793%", top: "-177.273%" }}
      />
    </div>
  );
}

/** Subtle, always-visible data privacy indicator. */
export function PrivacyPill() {
  return (
    <p className="flex shrink-0 items-center gap-1.5 rounded-full border border-blush-300 bg-white/80 px-2.5 py-1.5 sm:px-3 text-caption font-medium text-ink-muted shadow-glass backdrop-blur-md">
      <Lock className="size-3.5 text-rose" aria-hidden="true" />
      <span className="min-[380px]:hidden">Private</span>
      <span className="hidden min-[380px]:inline sm:hidden">Private &amp; secure</span>
      <span className="hidden sm:inline">Your data is private &amp; secure</span>
    </p>
  );
}

interface OnboardingLayoutProps {
  children: ReactNode;
  /** Right side of the header (defaults to the privacy pill). */
  headerRight?: ReactNode;
  /**
   * "page"  — normal scrolling page (welcome, dashboard).
   * "fixed" — one-viewport app screen: header + flex-1 main, no body scroll.
   */
  mode?: "page" | "fixed";
  /** "ambient" — soft pink glows and rings; "plain" — clean white (welcome page). */
  background?: "ambient" | "plain";
  /** Optional custom container classes (e.g. max-w-[1160px] mx-auto). */
  containerClassName?: string;
}

export function OnboardingLayout({
  children,
  headerRight = <PrivacyPill />,
  mode = "page",
  background = "ambient",
  containerClassName,
}: OnboardingLayoutProps) {
  const fixed = mode === "fixed";
  return (
    <div className={cn("relative isolate", fixed ? "h-dvh overflow-hidden" : "min-h-dvh")}>
      {background === "ambient" ? <AmbientBackground /> : <div aria-hidden="true" className="fixed inset-0 -z-10 bg-canvas-warm" />}
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-white px-4 py-2 text-body font-semibold text-rose-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* Container — max-width centered or responsive gutters */}
      <div className={cn("w-full", containerClassName ?? "px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16", fixed && "flex h-full flex-col")}>
        <header className={cn("flex shrink-0 items-center justify-between gap-3", fixed ? "h-14 short:h-12" : "h-16 sm:h-20")}>
          <BrandMark />
          {headerRight}
        </header>
        <main id="main" className={cn(fixed && "flex min-h-0 flex-1 flex-col")}>
          {children}
        </main>
      </div>
    </div>
  );
}
