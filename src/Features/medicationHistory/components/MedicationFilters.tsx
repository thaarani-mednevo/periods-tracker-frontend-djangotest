import { Calendar, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { usePopover } from '../hooks/usePopover';
import { formatRange } from '../lib/format';
import { fieldClass, labelClass, primaryBtn, secondaryBtn } from '../lib/ui';
import type { CycleScope, DateRange } from '../types';
import SegmentedControl from './SegmentedControl';

interface Props {
  scope: CycleScope;
  onScope: (s: CycleScope) => void;
  range: DateRange;
  defaultRange: DateRange;
  onRange: (r: DateRange) => void;
  query: string;
  onQuery: (q: string) => void;
}

const pillBase =
  'mh-card-shadow h-10 rounded-full border border-mh-line bg-[#fffdff] text-mh-ui-sm outline-none transition hover:border-mh-brand/40';

function DateRangePicker({
  range,
  defaultRange,
  onRange,
}: Pick<Props, 'range' | 'defaultRange' | 'onRange'>) {
  const { open, setOpen, close, containerRef, triggerRef } = usePopover();
  const [draft, setDraft] = useState(range);
  const panelId = useId();
  const invalid = !draft.from || !draft.to || draft.from > draft.to;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setDraft(range);
          setOpen((v) => !v);
        }}
        className={`${pillBase} mh-tap flex w-full items-center gap-[8px] px-4 font-semibold text-[#636579] md:w-auto md:pr-[17px]`}
      >
        <Calendar size={13} strokeWidth={1.8} className="shrink-0 text-mh-brand" aria-hidden="true" />
        <span className="whitespace-nowrap">{formatRange(range)}</span>
        <span className="sr-only">Change date range</span>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Select date range"
          className="absolute left-0 top-full z-30 mt-2 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-mh-line bg-white p-4 shadow-[0_14px_34px_-10px_rgb(23_21_43/0.28)]"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${panelId}-from`} className={labelClass}>From</label>
              <input
                id={`${panelId}-from`}
                type="date"
                className={fieldClass}
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor={`${panelId}-to`} className={labelClass}>To</label>
              <input
                id={`${panelId}-to`}
                type="date"
                className={fieldClass}
                value={draft.to}
                min={draft.from}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              />
            </div>
          </div>
          {invalid && (
            <p role="alert" className="mt-2 text-mh-body-sm font-medium text-mh-danger">
              Choose a valid range: the start date must not be after the end date.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={`${secondaryBtn} px-4`}
              onClick={() => {
                onRange(defaultRange);
                close();
              }}
            >
              Reset
            </button>
            <button
              type="button"
              disabled={invalid}
              className={`${primaryBtn} px-4 disabled:opacity-50`}
              onClick={() => {
                onRange(draft);
                close();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedicationFilters({
  scope,
  onScope,
  range,
  defaultRange,
  onRange,
  query,
  onQuery,
}: Props) {
  const searchId = useId();
  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center lg:flex-nowrap">
      <SegmentedControl<CycleScope>
        variant="filter"
        label="Cycle"
        value={scope}
        onChange={onScope}
        className="w-full md:w-auto"
        options={[
          { value: 'all', label: 'All' },
          { value: 'current', label: 'Current Cycle' },
          { value: 'previous', label: 'Previous Cycles' },
        ]}
      />
      <DateRangePicker range={range} defaultRange={defaultRange} onRange={onRange} />
      <div className="relative min-w-0 md:basis-full lg:basis-0 lg:flex-1">
        <label htmlFor={searchId} className="sr-only">Search medication</label>
        <Search
          size={13}
          strokeWidth={1.8}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mh-muted"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search medication..."
          className={`${pillBase} mh-tap w-full pl-[38px] pr-4 text-[#1d1b28] placeholder:text-[#b7b5bd] focus:border-mh-brand focus:ring-2 focus:ring-mh-brand/25`}
        />
      </div>
    </div>
  );
}
