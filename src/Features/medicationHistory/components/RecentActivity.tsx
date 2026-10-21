import { CalendarDays, Clock } from 'lucide-react';
import { formatDate, formatTime } from '../lib/format';
import type { ActivityEntry } from '../types';

export default function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section
      aria-labelledby="recent-activity"
      className="mh-card-shadow rounded-[20px] border border-mh-line bg-[#fefbff] px-[18px] pb-[26px] pt-[19px]"
    >
      <h2 id="recent-activity" className="text-section font-bold text-mh-navy">
        Recent Activity
      </h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-mh-ui-xs text-mh-muted">No recent medication activity.</p>
      ) : (
        <ol className="relative mt-[16px] grid gap-y-[16px] before:absolute before:bottom-[10px] before:left-[3px] before:top-[10px] before:w-px before:bg-[#f8bfdc]">
          {entries.map((e) => (
            <li key={e.id} className="relative h-[50.7px] pl-[22px]">
              <span aria-hidden="true" className="absolute left-0 top-[5px] size-[7px] rounded-full bg-mh-brand" />
              <p className="flex items-center gap-[5px] text-mh-micro-lg leading-[1.55] text-[#767583]">
                <Clock size={10} strokeWidth={1.8} aria-hidden="true" />
                <time dateTime={`${e.date}T${e.time}`}>
                  {formatDate(e.date)} · {formatTime(e.time)}
                </time>
              </p>
              <p className="mt-[4.5px] text-mh-ui font-bold text-mh-navy">{e.name}</p>
              <p className="mt-[4px] text-mh-caption font-semibold leading-[1.3] text-mh-brand">{e.phase} Phase</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function InsightCard() {
  return (
    <aside className="relative overflow-hidden rounded-[20px] border border-[#ffd0e8] bg-mh-blush px-[22px] pb-[26px] pt-[23px]">
      <CalendarDays size={24} strokeWidth={1.6} className="text-mh-brand" aria-hidden="true" />
      <p className="mt-[24px] max-w-[190px] text-mh-insight font-bold text-mh-brand">
        Your health data builds a clearer picture of your cycle.
      </p>
      <svg
        aria-hidden="true"
        viewBox="0 0 80 80"
        className="absolute -bottom-2 -right-3 size-[84px] text-mh-brand/20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      >
        <path d="M40 6c2 17 8 26 28 34-20 8-26 17-28 34-2-17-8-26-28-34 20-8 26-17 28-34z" />
      </svg>
    </aside>
  );
}
