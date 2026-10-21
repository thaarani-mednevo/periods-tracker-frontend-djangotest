import { CalendarDays, Clock } from 'lucide-react';
import { dosesLabel, formatDate, formatTime, totalPerDay } from '../lib/format';
import type { DoseState, Medication } from '../types';
import MedicationDoseSchedule from './MedicationDoseSchedule';
import MedicationIcon from './MedicationIcon';
import MedicationMenu, { type MenuAction } from './MedicationMenu';
import PhaseBadge from './PhaseBadge';

interface Props {
  med: Medication;
  onDose: (medId: string, doseId: string, state: DoseState) => void;
  onAction: (medId: string, action: MenuAction) => void;
}

const STATUS_BADGE: Record<Medication['status'], string> = {
  current: 'bg-[#d0f4e3] text-[#257858]',
  past: 'bg-[#ececf3] text-mh-muted',
  upcoming: 'bg-[#f0eaff] text-mh-violet',
};

export default function MedicationCard({ med, onDose, onAction }: Props) {
  const perDay = totalPerDay(med.doses);
  return (
    <article
      aria-label={med.name}
      className="mh-card-shadow relative grid grid-cols-2 gap-x-4 gap-y-4 rounded-[22px] border border-mh-line bg-[#fffdff] p-4 pr-3 desk:grid-cols-[minmax(0,332fr)_minmax(0,185fr)_auto_minmax(0,252fr)_44px] desk:items-center desk:gap-x-0 desk:py-4 desk:pl-4 desk:pr-[2px]"
    >
      {/* Details */}
      <div className="col-span-2 flex items-center gap-[15px] pr-10 desk:col-span-1 desk:pr-0">
        <MedicationIcon variant="tile" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-mh-name font-bold text-mh-ink">{med.name}</h3>
            <span
              className={`inline-flex h-[13px] items-center rounded-full px-[7px] text-mh-nano font-semibold capitalize ${STATUS_BADGE[med.status]}`}
            >
              {med.status}
            </span>
          </div>
          <p className="mt-[3px] text-mh-caption leading-[1.7] text-mh-muted">
            <span className="font-semibold text-mh-ink">{med.strength}</span>
            <span aria-hidden="true" className="mx-[7px]">·</span>
            {med.form}
          </p>
          <p className="text-mh-micro font-semibold leading-[1.875] text-mh-ink">
            <span className="whitespace-nowrap">{perDay} {med.unit}(s)/day</span>
            <span aria-hidden="true" className="mx-[8px]">·</span>
            <span className="whitespace-nowrap">{dosesLabel(med.doses.length)}</span>
          </p>
          {med.note && <p className="text-mh-micro leading-[1.875] text-mh-faint">{med.note}</p>}
        </div>
      </div>

      {/* Date + time */}
      <div className="text-mh-body-sm text-[#706f7e]">
        <p className="flex items-center gap-[8.6px]">
          <CalendarDays size={14} strokeWidth={1.7} className="shrink-0 text-mh-brand" aria-hidden="true" />
          {formatDate(med.date)}
        </p>
        <p className="mt-[7px] flex items-center gap-[8.6px]">
          <Clock size={14} strokeWidth={1.7} className="shrink-0 text-mh-brand" aria-hidden="true" />
          {formatTime(med.time)}
        </p>
      </div>

      {/* Phase */}
      <div className="order-3 flex flex-col items-start desk:order-4 desk:items-center">
        <PhaseBadge phase={med.phase} />
        <p className="mt-[6px] text-mh-body-sm text-mh-muted">Cycle Day {med.cycleDay}</p>
      </div>

      {/* Doses */}
      <div className="order-4 col-span-2 border-t border-mh-line pt-3 desk:order-3 desk:col-span-1 desk:border-t-0 desk:pt-0">
        <MedicationDoseSchedule
          medName={med.name}
          doses={med.doses}
          onChange={(doseId, state) => onDose(med.id, doseId, state)}
        />
      </div>

      <div className="absolute right-1 top-1 order-5 desk:static desk:justify-self-end">
        <MedicationMenu medName={med.name} onSelect={(a) => onAction(med.id, a)} />
      </div>
    </article>
  );
}
