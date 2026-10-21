import type { DateRange, Dose } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** "2026-09-17" -> "Sep 17, 2026" */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const { y, m, d } = parseISO(iso);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatRange(range: DateRange): string {
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

/** "14:00" -> "02:00 PM" */
export function formatTime(time: string): string {
  if (!time) return '';
  const [h, min] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${suffix}`;
}

export function totalPerDay(doses: Dose[]): number {
  return doses.reduce((sum, d) => sum + d.quantity, 0);
}

export function dosesLabel(count: number): string {
  return `${count} ${count === 1 ? 'dose' : 'doses'}/day`;
}

export function sortDoses(doses: Dose[]): Dose[] {
  return [...doses].sort((a, b) => a.time.localeCompare(b.time));
}

export type DayPart = 'morning' | 'afternoon' | 'evening';
export function dayPart(time: string): DayPart {
  const h = Number(time.split(':')[0]);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
