import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  /** Tailwind classes for the circular icon container */
  iconClass: string;
  value: number;
  label: string;
  caption: string;
}

export default function MedicationSummaryCard({ icon, iconClass, value, label, caption }: Props) {
  return (
    <div className="mh-card-shadow flex min-h-[95px] items-center gap-[11.5px] rounded-[21px] border border-mh-line bg-[#fffdff] px-[18px]">
      <span
        aria-hidden="true"
        className={`inline-flex size-[43px] shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0 pt-[3px]">
        <p className="text-mh-num font-bold text-mh-navy">{value}</p>
        <p className="mt-[2px] text-mh-ui font-bold text-mh-ok-dark">{label}</p>
        <p className="mt-[3.5px] text-mh-caption text-mh-muted">{caption}</p>
      </div>
    </div>
  );
}
