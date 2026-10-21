import type { Phase } from '../types';

const STYLES: Record<Phase, string> = {
  Menstruation: 'bg-mh-blush text-mh-brand',
  Follicular: 'bg-[#f0eaff] text-mh-violet',
  Ovulation: 'bg-[#dcf9df] text-mh-ok-ink',
  Luteal: 'bg-[#eceaf6] text-[#4b4c7a]',
};

interface Props {
  phase: Phase;
  className?: string;
}

export default function PhaseBadge({ phase, className = '' }: Props) {
  return (
    <span
      className={`inline-flex h-[17px] items-center rounded-full px-2 text-mh-ui-sm font-bold leading-none ${STYLES[phase]} ${className}`}
    >
      {phase}
    </span>
  );
}
