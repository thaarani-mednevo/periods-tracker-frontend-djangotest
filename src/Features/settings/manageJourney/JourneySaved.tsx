import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";

interface SummaryItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface JourneySavedProps {
  journeyTitle: string;
  summary: SummaryItem[];
  onDashboard: () => void;
  onSettings: () => void;
}

/** Success screen only for Manage Journey. */
export function JourneySaved({ journeyTitle, summary, onDashboard, onSettings }: JourneySavedProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="mx-auto w-full max-w-2xl animate-scale-in rounded-[32px] border border-[#F4C9E0] bg-gradient-to-b from-[#FFF7FB] to-white px-5 py-10 text-center shadow-[0_20px_60px_rgba(244,63,143,0.10)] sm:px-10 sm:py-12">
      <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#F43F8F] text-white shadow-[0_10px_28px_rgba(244,63,143,0.35)]">
        <Check className="size-10" strokeWidth={3} aria-hidden="true" />
      </span>
      <h1 ref={heading} tabIndex={-1} className="mt-6 text-2xl font-bold tracking-tight text-[#17152B] outline-none sm:text-3xl">
        Your updates are saved
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-[#68708A] sm:text-base">
        You're on <span className="font-bold text-[#9D174D]">{journeyTitle}</span>. Your predictions and dashboard will now follow your new setup.
      </p>

      <ul className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-2">
        {summary.map(({ icon: Icon, label, value }, i) => (
          <li key={label} className="flex animate-fade-up items-center gap-3 rounded-[18px] border border-[#F4C9E0] bg-white p-3.5" style={{ animationDelay: `${200 + i * 80}ms` }}>
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#FFF0F6] text-[#F43F8F]" aria-hidden="true">
              <Icon className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-bold uppercase tracking-wide text-[#8A92A6]">{label}</span>
              <span className="block truncate text-sm font-semibold text-[#17152B]">{value}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button type="button" onClick={onDashboard} className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-lu-brand px-8 py-3 text-lu-body font-semibold text-white shadow-lu-glow transition-colors hover:bg-lu-brand-strong sm:w-auto">
          Go to My Dashboard
          <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
        <button type="button" onClick={onSettings} className="w-full rounded-full px-6 py-3 text-lu-body font-medium text-lu-ink-soft hover:text-lu-ink sm:w-auto">
          Back to Settings
        </button>
      </div>
    </section>
  );
}
