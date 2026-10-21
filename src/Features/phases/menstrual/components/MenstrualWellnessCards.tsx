import { Check, type LucideIcon } from "lucide-react";
import { surface } from "./surface";

export interface WellnessCard {
  icon: LucideIcon;
  title: string;
  items: string[];
  /** Tailwind text colours for the card icon and the check marks. */
  iconClass: string;
  checkClass: string;
}

export function MenstrualWellnessCards({ cards }: { cards: WellnessCard[] }) {
  return (
    <ul aria-label="Wellness tips" className="grid w-full grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ icon: Icon, title, items, iconClass, checkClass }) => (
        <li key={title} className={`${surface.card} p-5 text-left sm:p-6`}>
          <div className="flex items-center gap-2.5">
            <Icon className={`size-[18px] ${iconClass}`} aria-hidden="true" />
            <h3 className="text-[15px] font-semibold tracking-tight text-[#17152B]">{title}</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[13px] leading-snug text-[#4B5563] sm:text-sm">
                <Check className={`mt-0.5 size-4 shrink-0 ${checkClass}`} strokeWidth={2.4} aria-hidden="true" />
                <span className="break-words">{item}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
