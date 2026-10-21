import { Pill } from 'lucide-react';

const VARIANTS = {
  /** Squircle tile on medication cards. */
  tile: { box: 'size-[61px] rounded-[20px] bg-linear-to-br from-[#fff4fa] to-[#ffeaf5]', icon: 21 },
  /** Round chip on summary cards. */
  circle: { box: 'size-[43px] rounded-full bg-mh-blush', icon: 17 },
  /** Small rounded square in the modal header. */
  chip: { box: 'size-9 rounded-xl bg-mh-blush', icon: 16 },
} as const;

interface Props {
  variant?: keyof typeof VARIANTS;
  className?: string;
}

/** The single capsule glyph used for every medication in the app. */
export default function MedicationIcon({ variant = 'tile', className = '' }: Props) {
  const v = VARIANTS[variant];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center text-mh-brand ${v.box} ${className}`}
    >
      <Pill size={v.icon} strokeWidth={1.7} />
    </span>
  );
}
