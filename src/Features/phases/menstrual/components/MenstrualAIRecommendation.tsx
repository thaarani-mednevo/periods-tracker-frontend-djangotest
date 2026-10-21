import type { PhaseInsight } from "../../../../services/insights";
import { AvaAvatar } from "../../shared/ui/AvaAvatar";
import { Emoji } from "../../shared/ui/Emoji";

const CHIP_EMOJI = ["💧", "🚶‍♀️", "😴"];

interface Props {
  insight: PhaseInsight | null;
  loading: boolean;
  onAskAva?: () => void;
}

/** Shows the stored AI insight (summary + tips). No insight means no hardcoded text. */
export function MenstrualAIRecommendation({ insight, loading, onAskAva }: Props) {
  return (
    <section
      id="ai-recommendation"
      tabIndex={-1}
      aria-labelledby="ai-recommendation-title"
      className="w-full scroll-mt-6 rounded-[22px] border border-[#F4EAF3] p-3 text-left shadow-[0_8px_28px_rgba(23,21,43,0.045)] outline-none sm:p-4"
      style={{ background: "linear-gradient(100deg, #FFFFFF 0%, #FFF8FC 55%, #FBF5FF 100%)" }}
    >
      <div className="-my-0.5 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FDE8F3]" aria-hidden="true">
            <AvaAvatar className="size-[30px]" />
          </span>
          <h2 id="ai-recommendation-title" className="text-sm font-bold tracking-tight text-[#17152B] sm:text-[15px]">
            AI Recommendation
          </h2>
        </div>
        {onAskAva && (
          <button type="button" onClick={onAskAva} aria-haspopup="dialog" className="group inline-flex min-h-[44px] shrink-0 cursor-pointer items-center">
            <span className="rounded-full bg-[#F4E3FF] px-4 py-1.5 text-xs font-bold text-[#8B5CF6] transition-colors group-hover:bg-[#EBD3FF] sm:text-[13px]">Ask Ava</span>
          </button>
        )}
      </div>

      <div
        className="mt-2.5 flex items-center gap-3 rounded-[18px] p-3 sm:gap-5 sm:px-4 sm:py-3.5"
        style={{ background: "linear-gradient(100deg, #FDEAF6 0%, #F9EDFB 50%, #F2E8FF 100%)" }}
      >
        <AvaAvatar className="size-14 shrink-0 sm:size-16" />
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-[#4B5563] sm:text-[13px]" aria-live="polite">
            {loading ? "Preparing your recommendation…" : (insight?.summary ?? "Your AI recommendation isn't available right now.")}
          </p>
          {insight && insight.tips.length > 0 && (
            <ul className="mt-2 flex flex-wrap items-center gap-2" aria-label="Suggestions">
              {insight.tips.map((tip, i) => (
                <li key={tip} className="flex items-center gap-1.5 rounded-full bg-[#EDE2FF] px-3 py-1 text-xs font-medium text-[#6D4AD8]">
                  <span>{tip}</span>
                  <Emoji symbol={CHIP_EMOJI[i % CHIP_EMOJI.length]} className="text-[12px]" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
