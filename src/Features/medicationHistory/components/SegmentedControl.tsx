interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** "filter" is the taller All / Current Cycle bar; "tabs" is the compact Current / Past / Upcoming bar. */
  variant: 'filter' | 'tabs';
  className?: string;
}

const CONTAINER = {
  filter: 'h-[43px] p-[5px]',
  tabs: 'h-[42.5px] p-[6px] pl-[8px]',
} as const;

const ITEM = {
  filter: 'h-[32px] px-2 text-mh-ui-fit sm:px-[18px]',
  tabs: 'h-[29px] px-[11px] text-mh-ui-xs',
} as const;

/** Rounded pill group; the active segment is the brand pink. */
export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  variant,
  className = '',
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`mh-card-shadow inline-flex items-center gap-1 rounded-full border border-mh-line bg-[#fffdff] ${CONTAINER[variant]} ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`mh-tap flex-auto whitespace-nowrap rounded-full font-semibold transition ${ITEM[variant]} ${
              active
                ? 'bg-mh-brand text-white shadow-[0_6px_12px_-4px_rgb(244_57_168/0.55)]'
                : variant === 'filter'
                  ? 'font-bold text-[#585a74] hover:bg-mh-blush'
                  : 'text-[#4b4c5e] hover:bg-mh-blush'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
