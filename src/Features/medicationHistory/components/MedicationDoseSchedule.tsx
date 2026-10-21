import { Check, Moon, Sun, Sunrise, X } from 'lucide-react';
import { dayPart, formatTime, sortDoses, type DayPart } from '../lib/format';
import type { Dose, DoseState } from '../types';
import MedicationStatus from './MedicationStatus';

const PART: Record<DayPart, { Icon: typeof Sun; chip: string }> = {
  morning: { Icon: Sunrise, chip: 'bg-mh-blush text-mh-brand' },
  afternoon: { Icon: Sun, chip: 'bg-[#f0eaff] text-mh-violet' },
  evening: { Icon: Moon, chip: 'bg-mh-blush text-mh-brand' },
};

interface Props {
  medName: string;
  doses: Dose[];
  onChange: (doseId: string, state: DoseState) => void;
}

const btn =
  'mh-tap inline-flex h-[2.5em] items-center justify-center gap-[0.5em] whitespace-nowrap rounded-[0.625em] border px-[1em] text-mh-micro font-medium leading-none transition';

function DoseActions({
  dose,
  medName,
  onChange,
}: {
  dose: Dose;
  medName: string;
  onChange: Props['onChange'];
}) {
  const time = formatTime(dose.time);
  switch (dose.state) {
    case 'pending':
      return (
        <>
          <button
            type="button"
            aria-label={`Mark ${medName} ${time} dose as taken`}
            onClick={() => onChange(dose.id, 'taken')}
            className={`${btn} border-[#a9e6b8] bg-[#e7ffea] text-mh-ok-ink hover:bg-[#d3f8d9]`}
          >
            Take <Check size="1.15em" strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Mark ${medName} ${time} dose as not taken`}
            onClick={() => onChange(dose.id, 'missed')}
            className={`${btn} border-[#f2a3a6] bg-[#fdeeee] text-mh-danger hover:bg-[#fbdcdc]`}
          >
            Not Taken <X size="1.25em" strokeWidth={2.4} aria-hidden="true" />
          </button>
        </>
      );
    case 'missed':
      return (
        <button
          type="button"
          aria-label={`Mark ${medName} ${time} dose as taken`}
          onClick={() => onChange(dose.id, 'taken')}
          className={`${btn} border-[#f6b0da] bg-[#ffeaf7] text-mh-brand hover:bg-[#ffd9f0]`}
        >
          Mark taken
        </button>
      );
    case 'taken':
    case 'skipped':
      return (
        <button
          type="button"
          aria-label={`Undo ${medName} ${time} dose`}
          onClick={() => onChange(dose.id, 'pending')}
          className={`${btn} border-[#dcf9df] bg-[#dcf9df] text-mh-ok-ink hover:bg-[#c8f3cd]`}
        >
          Undo
        </button>
      );
    default:
      return null;
  }
}

export default function MedicationDoseSchedule({ medName, doses, onChange }: Props) {
  const sorted = sortDoses(doses);
  const allTaken = sorted.length > 0 && sorted.every((d) => d.state === 'taken');

  return (
    <div className="flex w-full flex-col gap-1 text-mh-micro">
      <ul className="grid gap-[0.375em]">
        {sorted.map((d) => {
          const { Icon, chip } = PART[dayPart(d.time)];
          return (
            <li key={d.id} className="flex min-h-[2.5em] flex-wrap items-center gap-x-[0.625em] gap-y-1 leading-none">
              <span className="flex w-[7.875em] shrink-0 items-center gap-[0.75em] text-mh-caption text-mh-muted">
                <span aria-hidden="true" className={`inline-flex size-[1.78em] items-center justify-center rounded-full ${chip}`}>
                  <Icon size="62%" strokeWidth={1.8} />
                </span>
                <span className="whitespace-nowrap">{formatTime(d.time)}</span>
              </span>
              <span className="w-[6.25em] shrink-0">
                <MedicationStatus state={d.state} />
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-[0.75em] desk:ml-[1.75em] desk:w-[14.25em] desk:justify-end">
                <DoseActions dose={d} medName={medName} onChange={onChange} />
              </span>
            </li>
          );
        })}
      </ul>
      {allTaken && (
        <p className="ml-[2.75em] inline-flex items-center gap-[0.5em] font-medium text-mh-ok-ink">
          <Check size="1.25em" strokeWidth={2} aria-hidden="true" /> Completed
        </p>
      )}
    </div>
  );
}
