export type Phase = 'Menstruation' | 'Follicular' | 'Ovulation' | 'Luteal';
export type MedicationStatus = 'current' | 'past' | 'upcoming';
export type CycleScope = 'all' | 'current' | 'previous';
export type DoseState = 'taken' | 'pending' | 'missed' | 'upcoming' | 'skipped';

export interface Dose {
  id: string;
  quantity: number;
  /** 24h "HH:mm" */
  time: string;
  state: DoseState;
}

export interface Medication {
  id: string;
  backendId?: number;
  name: string;
  strength: string;
  form: string;
  unit: string;
  note: string;
  /** ISO date yyyy-mm-dd */
  date: string;
  /** 24h "HH:mm" */
  time: string;
  phase: Phase;
  cycleDay: number;
  status: MedicationStatus;
  cycle: 'current' | 'previous';
  doses: Dose[];
}

export interface ActivityEntry {
  id: string;
  medicationId: string;
  name: string;
  /** ISO date yyyy-mm-dd */
  date: string;
  time: string;
  phase: Phase;
}

export interface DateRange {
  from: string;
  to: string;
}

export const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Patch', 'Drops'] as const;
export const UNITS = ['tablet', 'capsule', 'ml', 'drop', 'patch', 'unit'] as const;
export const CATEGORIES: { value: MedicationStatus; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'past', label: 'Past' },
  { value: 'upcoming', label: 'Upcoming' },
];
