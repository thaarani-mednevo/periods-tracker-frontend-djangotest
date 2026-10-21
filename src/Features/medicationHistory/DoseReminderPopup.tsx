import { BellRing, Check, Clock3, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMedications, setIntake, type Medication } from "../../services/logs";
import { localISODate } from "../../services/cycle";
import { getSnoozeUntil, snoozeDose, SNOOZE_MIN } from "../phases/shared/daily-log/MedicationSection";
import { DOSES_CHANGED_EVENT, markSnoozed, slotTimes } from "./doseSlots";

/** The popup comes back this often while a dose is due and not handled. */
const REMIND_EVERY_MIN = 15;
/** Stop reminding this long after the scheduled time (the dose then shows as not taken). */
const REMIND_WINDOW_MIN = 180;
const CHECK_MS = 20_000;
const REFRESH_MS = 60_000;
const MAX_VISIBLE = 3;

interface DueDose {
  key: string;
  medId: Medication["id"];
  name: string;
  detail: string;
  slot: number;
  date: string;
  time: string;
  scheduledAt: number;
}

const isScheduledOn = (m: Medication, day: string) => (!m.startDate || m.startDate <= day) && (!m.endDate || day <= m.endDate);

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/** System notification for when the tab is in the background. Permission is asked once. */
function notifyBrowser(title: string, body: string) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") void Notification.requestPermission();
    else if (Notification.permission === "granted" && document.hidden) new Notification(title, { body, tag: title });
  } catch {
    /* notifications unavailable */
  }
}

/** Every dose of today that is due, not saved yet, inside the reminder window and not snoozed. */
function findDue(meds: Medication[], now: number): DueDose[] {
  const today = localISODate();
  const out: DueDose[] = [];
  for (const med of meds) {
    if (med.reminder === false || !isScheduledOn(med, today)) continue;
    const times = slotTimes(med.time || "09:00", med.frequency, med.times);
    times.forEach((time, i) => {
      const slot = i + 1;
      if ((med.doses ?? []).some((d) => d.slot === slot && d.status !== "pending")) return; // already taken / skipped
      const scheduledAt = new Date(`${today}T${time}:00`).getTime();
      if (now < scheduledAt || now > scheduledAt + REMIND_WINDOW_MIN * 60_000) return;
      const until = getSnoozeUntil(med.id, today, slot);
      if (until && until > now) return; // snoozed: stay quiet until it ends
      out.push({
        key: `${med.id}|${today}|${slot}`,
        medId: med.id,
        name: med.name,
        detail: [med.dose, med.form].filter(Boolean).join(" · "),
        slot,
        date: today,
        time,
        scheduledAt,
      });
    });
  }
  return out.sort((a, b) => a.scheduledAt - b.scheduledAt);
}

/**
 * Notification-style reminder. Mount ONCE in the signed-in app layout, so it works on every page.
 * It appears when a dose is due and comes back every 15 minutes until the dose is taken or skipped.
 * Take / Snooze / Skip live here; a dose taken after a snooze is shown as "Taken late" with its time.
 */
export function DoseReminderPopup() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [visible, setVisible] = useState<DueDose[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const visibleRef = useRef<DueDose[]>([]);
  const lastShown = useRef(new Map<string, number>());

  const load = useCallback(async () => {
    try {
      const res = await getMedications(localISODate());
      setMeds(res.medications ?? []);
    } catch {
      /* signed out or offline: try again on the next refresh */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), REFRESH_MS);
    const onFocus = () => void load();
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(DOSES_CHANGED_EVENT, onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(DOSES_CHANGED_EVENT, onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const check = useCallback(() => {
    const now = Date.now();
    const due = findDue(meds, now);
    const byKey = new Map(due.map((d) => [d.key, d]));
    // still due and already on screen: keep; handled elsewhere or snoozed: drop
    const next = visibleRef.current.filter((v) => byKey.has(v.key)).map((v) => byKey.get(v.key)!);
    const onScreen = new Set(next.map((d) => d.key));
    for (const d of due) {
      if (onScreen.has(d.key)) continue;
      const last = lastShown.current.get(d.key) ?? 0;
      if (now - last >= REMIND_EVERY_MIN * 60_000) {
        lastShown.current.set(d.key, now); // first popup at the due time, then every 15 minutes
        next.push(d);
        notifyBrowser(`Time to take ${d.name}`, `${formatTime(d.time)} dose is due.`);
      }
    }
    visibleRef.current = next;
    setVisible(next);
  }, [meds]);

  useEffect(() => {
    check();
    const t = window.setInterval(check, CHECK_MS);
    return () => window.clearInterval(t);
  }, [check]);

  const hide = (key: string) => {
    visibleRef.current = visibleRef.current.filter((d) => d.key !== key);
    setVisible(visibleRef.current);
  };

  const save = async (d: DueDose, status: "taken" | "skipped") => {
    setBusyKey(d.key);
    try {
      await setIntake(d.medId, d.date, status, d.slot);
    } catch {
      setBusyKey(null);
      return; // not saved: keep the popup so the user can try again
    }
    setBusyKey(null);
    hide(d.key);
    window.dispatchEvent(new Event(DOSES_CHANGED_EVENT));
  };

  const snooze = (d: DueDose) => {
    snoozeDose(d.medId, d.date, d.slot);
    markSnoozed(d.medId, d.date, d.slot);
    hide(d.key);
  };

  if (visible.length === 0) return null;
  const shown = visible.slice(0, MAX_VISIBLE);
  const extra = visible.length - shown.length;
  const btn = "inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-[12px] font-semibold transition disabled:opacity-60";

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
      {shown.map((d) => {
        const minsLate = Math.max(0, Math.floor((Date.now() - d.scheduledAt) / 60_000));
        const busy = busyKey === d.key;
        return (
          <div key={d.key} role="alertdialog" aria-label={`Time to take ${d.name}`} className="pointer-events-auto rounded-[20px] border border-[#f6c3df] bg-white p-4 shadow-[0_18px_40px_-14px_rgba(60,30,70,.35)]">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffe7f4] text-[#f439a8]">
                <BellRing size={18} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#181a40]">Time to take your medicine</p>
                <p className="mt-0.5 truncate text-[14px] font-bold text-[#f439a8]">{d.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#6b6b7a]">
                  {d.detail && <span>{d.detail}</span>}
                  <span className="inline-flex items-center gap-1"><Clock3 size={11} aria-hidden="true" />{formatTime(d.time)}{minsLate >= 1 ? ` · ${minsLate} min ago` : ""}</span>
                </p>
              </div>
              <button type="button" aria-label="Remind me again in 15 minutes" onClick={() => hide(d.key)} className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#6b6b7a] hover:bg-[#fff0f7]">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void save(d, "taken")} className={`${btn} border-[#a9e6b8] bg-[#e7ffea] text-[#095d41] hover:bg-[#d3f8d9]`}>
                Take <Check size={13} strokeWidth={2.2} aria-hidden="true" />
              </button>
              <button type="button" disabled={busy} onClick={() => snooze(d)} className={`${btn} border-[#d9ccff] bg-[#f0eaff] text-[#6d28d9] hover:bg-[#e4d9ff]`}>
                Snooze {SNOOZE_MIN} min
              </button>
              <button type="button" disabled={busy} onClick={() => void save(d, "skipped")} className={`${btn} border-[#f2a3a6] bg-[#fdeeee] text-[#e0393e] hover:bg-[#fbdcdc]`}>
                Not Taken <X size={13} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
      {extra > 0 && <p className="pointer-events-auto self-end rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#6b6b7a] shadow">+{extra} more due</p>}
    </div>
  );
}