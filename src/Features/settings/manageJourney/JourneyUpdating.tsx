import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { JourneyOption } from "../journeyOptions";
import { JourneyIcon } from "../controls";

const STEPS = ["Saving your journey", "Adjusting your predictions", "Refreshing your dashboard"] as const;
const STEP_MS = 1000;

interface JourneyUpdatingProps {
  option: JourneyOption;
  /** The real save. Resolves with an error message, or null when saved. */
  task: Promise<string | null>;
  /** Called once the animation finished AND the save finished. */
  onFinish: (error: string | null) => void;
}

/** Loading screen only for Manage Journey: journey icon + live checklist. Waits for the real save. */
export function JourneyUpdating({ option, task, onFinish }: JourneyUpdatingProps) {
  const [done, setDone] = useState(0);
  const finish = useRef(onFinish);
  finish.current = onFinish;

  useEffect(() => {
    const timers = STEPS.map((_, i) => setTimeout(() => setDone(i + 1), STEP_MS * (i + 1)));
    let cancelled = false;
    const minimum = new Promise((r) => setTimeout(r, STEP_MS * STEPS.length + 300));
    void Promise.all([task, minimum]).then(([error]) => {
      if (!cancelled) finish.current(error);
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [task]);

  const active = Math.min(done, STEPS.length - 1);

  return (
    <section
      aria-busy="true"
      className="mx-auto flex min-h-[520px] w-full max-w-xl animate-fade-in flex-col items-center justify-center rounded-[32px] border border-[#F4C9E0] bg-gradient-to-b from-[#FFF7FB] to-white px-6 py-12 text-center shadow-[0_20px_60px_rgba(244,63,143,0.10)]"
    >
      <div className="relative grid size-36 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#F43F8F]/10" aria-hidden="true" />
        <span className="absolute inset-3 animate-spin-slow rounded-full border-[3px] border-transparent border-l-[#F43F8F]/60 border-t-[#FF9CC6]/60" aria-hidden="true" />
        <span className="relative flex size-20 items-center justify-center rounded-full bg-[#F43F8F] text-white shadow-[0_10px_28px_rgba(244,63,143,0.35)]">
          <JourneyIcon icon={option.icon} className="size-9" />
        </span>
      </div>

      <h2 className="mt-8 text-xl font-bold tracking-tight text-[#17152B] sm:text-2xl">Updating your journey</h2>
      <p role="status" aria-live="polite" key={active} className="mt-1.5 animate-fade-up text-sm font-medium text-[#68708A]">
        {STEPS[active]}…
      </p>

      <ul className="mt-8 w-full max-w-xs space-y-3 text-left" aria-hidden="true">
        {STEPS.map((label, i) => {
          const complete = i < done;
          const current = i === done;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                  complete ? "bg-[#F43F8F] text-white" : current ? "bg-[#FFE4F1] text-[#F43F8F]" : "bg-[#F3E6EB] text-transparent"
                }`}
              >
                {complete ? <Check className="size-3.5" strokeWidth={3} /> : current ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              </span>
              <span className={`text-sm font-semibold transition-colors duration-300 ${complete || current ? "text-[#17152B]" : "text-[#A5A0B5]"}`}>{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
