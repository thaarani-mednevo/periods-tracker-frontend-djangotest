import { useCallback, useEffect, useState } from "react";
import { Pill, X } from "lucide-react";
import { addDays } from "../../lib/isoDate";
import { localISODate } from "../../services/cycle";
import { getMedications, type Medication } from "../../services/logs";
import { DOSES_CHANGED_EVENT, slotTimes } from "./doseSlots";

const DISMISSED_KEY = "mednevo.refill.dismissed";
const RECHECK_MS = 10 * 60_000;

/** Same estimate as the Refill date on the Medication History card: stock / doses per day, counted from the start date. */
export function refillDateOf(med: Medication): string | null {
  if (!med.tabletCount || !med.startDate) return null;
  const perDay = Math.max(slotTimes(med.time || "09:00", med.frequency, med.times).length, 1);
  const date = addDays(med.startDate, Math.floor(med.tabletCount / perDay));
  return med.endDate && date > med.endDate ? null : date; // the course ends before the tablets run out
}

function readDismissed(): string[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveDismissed(keys: string[]) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(keys.slice(-100)));
  } catch {
    /* private mode: the reminder just shows again next time */
  }
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

interface DueRefill {
  /** medication id + refill date, so a new refill date (after the stock is edited) reminds again */
  key: string;
  name: string;
  date: string;
}

/** Mounted once for every signed-in page. Shows up on the refill day (and stays until dismissed if it was missed). */
export function RefillReminderPopup() {
  const [due, setDue] = useState<DueRefill[]>([]);

  const check = useCallback(async (signal?: AbortSignal) => {
    const today = localISODate();
    try {
      const { medications } = await getMedications(today, signal);
      const dismissed = new Set(readDismissed());
      const next: DueRefill[] = [];
      for (const med of medications) {
        const date = refillDateOf(med);
        if (!date || date > today) continue;
        const key = `${med.id}:${date}`;
        if (!dismissed.has(key)) next.push({ key, name: med.name, date });
      }
      setDue(next);
    } catch {
      /* offline or signed out: the next check tries again */
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void check(controller.signal);
    const timer = window.setInterval(() => void check(), RECHECK_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    window.addEventListener(DOSES_CHANGED_EVENT, onFocus); // medication added / edited / deleted
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(DOSES_CHANGED_EVENT, onFocus);
    };
  }, [check]);

  if (due.length === 0) return null;
  const today = localISODate();

  const dismiss = () => {
    saveDismissed([...readDismissed(), ...due.map((d) => d.key)]);
    setDue([]);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-[20px] border border-[#ffd0e8] bg-white p-4 shadow-[0_18px_40px_-18px_rgba(40,25,50,.28)]"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#ffe8f4] text-[#f439a8]">
          <Pill size={18} strokeWidth={1.6} className="-rotate-45" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#181a40]">Time to refill</p>
          <ul className="mt-1 grid gap-0.5 text-[12px] text-[#6b6b7a]">
            {due.map((d) => (
              <li key={d.key} className="break-words">
                <span className="font-semibold text-[#1d1b28]">{d.name}</span>
                {" · "}
                {d.date === today ? "your tablets run out today" : `refill was due ${shortDate(d.date)}`}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss refill reminder" className="rounded-full p-1 text-[#5d5e6d] hover:bg-[#fff0f7]">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 inline-flex h-[30px] w-full items-center justify-center rounded-full bg-[#f43f8f] text-[12px] font-semibold text-white shadow-[0_6px_12px_-4px_rgba(244,63,143,.45)] transition-opacity hover:opacity-90"
      >
        Got it
      </button>
    </div>
  );
}