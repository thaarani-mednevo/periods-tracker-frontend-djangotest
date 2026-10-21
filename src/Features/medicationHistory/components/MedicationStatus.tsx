import { CalendarClock, Check, Clock, MinusCircle, X } from 'lucide-react';
import type { DoseState } from '../types';

const CONFIG: Record<DoseState, { label: string; cls: string; Icon: typeof Check; weight: string }> = {
  taken: { label: 'Taken', cls: 'text-mh-ok-ink', Icon: Check, weight: 'font-medium' },
  pending: { label: 'Pending', cls: 'text-[#8c8c96]', Icon: Clock, weight: 'font-normal' },
  missed: { label: 'Not Taken', cls: 'text-mh-danger', Icon: X, weight: 'font-medium' },
  upcoming: { label: 'Upcoming', cls: 'text-mh-violet', Icon: CalendarClock, weight: 'font-normal' },
  skipped: { label: 'Skipped', cls: 'text-[#8c8c96]', Icon: MinusCircle, weight: 'font-normal' },
};

/** Icon + label for a single dose's state. */
export default function MedicationStatus({ state }: { state: DoseState }) {
  const { label, cls, Icon, weight } = CONFIG[state];
  return (
    <span className={`inline-flex items-center gap-[0.5em] whitespace-nowrap text-mh-micro leading-[1.5] ${weight} ${cls}`}>
      <Icon size="1.25em" strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}
