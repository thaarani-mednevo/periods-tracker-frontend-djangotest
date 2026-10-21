import { ChevronRight } from "lucide-react";
import heroBg from "../../../../assets/phases/menstrual/hero-bg.png";
import illustration from "../../../../assets/phases/menstrual/period-illustration.webp";

interface Props {
  heading: string;
  description: string;
  /** False until the engine has any cycle data: shows the "start logging" prompt instead. */
  hasCycleData: boolean;
  onViewTips: () => void;
  onLogPeriod: () => void;
}

const SHELL =
  "relative flex min-h-[220px] w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[#F3DEEB] bg-[#FFF5FA] pl-5 pt-5 text-left shadow-[0_8px_32px_rgba(244,63,143,0.07)] sm:pl-6 sm:pt-6";
const PRIMARY =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#F43F8F] px-5 py-2.5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(244,63,143,0.3)] transition-all hover:bg-[#E02874] hover:shadow-[0_8px_22px_rgba(244,63,143,0.4)] sm:px-6 sm:text-sm";
const SECONDARY =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-pink-200/90 bg-white/85 px-4 py-2.5 text-xs font-bold text-[#D81B60] shadow-2xs transition-all hover:bg-white hover:shadow-xs sm:px-5 sm:text-sm";

export function MenstrualHeroCard({ heading, description, hasCycleData, onViewTips, onLogPeriod }: Props) {
  return (
    <section aria-label={hasCycleData ? heading : "Start your period log"} className={SHELL}>
      <img src={heroBg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full select-none object-cover object-right" />

      <div className="relative z-10 flex size-full flex-col items-start justify-between gap-4 sm:gap-6 md:flex-row md:items-stretch">
        <div className="z-10 flex min-w-0 max-w-md flex-1 flex-col justify-center space-y-2 pb-5 pr-5 sm:pb-6 md:max-w-[58%] md:pr-0">
          <h2 className="text-[clamp(1rem,1.3vw,1.3rem)] font-black leading-tight tracking-tight text-[#17152B]">{hasCycleData ? heading : "Start your period log"}</h2>
          <p className="max-w-[360px] md:max-w-none text-[clamp(0.75rem,0.85vw,0.95rem)] font-medium leading-relaxed text-[#55607A]">
            {hasCycleData ? description : "Log your period to get personalized insights, predictions and health tips."}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {hasCycleData ? (
              <>
                <button type="button" onClick={onViewTips} aria-haspopup="dialog" className={PRIMARY}>
                  View Period Tips
                </button>
                <button type="button" onClick={onLogPeriod} aria-haspopup="dialog" className={SECONDARY}>
                  Log Period
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </>
            ) : (
              <button type="button" onClick={onLogPeriod} aria-haspopup="dialog" className={PRIMARY}>
                Log Period
              </button>
            )}
          </div>
        </div>

        <div className="pointer-events-none relative flex shrink-0 select-none items-end justify-center self-end overflow-hidden pr-2">
          <img
            src={illustration}
            alt=""
            width={210}
            height={185}
            className="relative z-10 h-auto w-[150px] translate-y-[7%] object-contain object-bottom sm:w-[190px] md:w-[220px] lg:w-[clamp(220px,17vw,290px)]"
          />
        </div>
      </div>
    </section>
  );
}