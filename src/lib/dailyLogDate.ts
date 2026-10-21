const pad = (n: number) => String(n).padStart(2, "0");
const DAY_MS = 86_400_000;

export const parts = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
};

const utc = (iso: string) => {
  const { y, m, d } = parts(iso);
  return Date.UTC(y, m - 1, d);
};

export const diffDays = (a: string, b: string) => Math.round((utc(a) - utc(b)) / DAY_MS);

export function addMonths(iso: string, n: number) {
  const { y, m, d } = parts(iso);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const ty = first.getUTCFullYear();
  const tm = first.getUTCMonth() + 1;
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return `${ty}-${pad(tm)}-${pad(Math.min(d, last))}`;
}

export const formatDate = (iso: string, options: Intl.DateTimeFormatOptions, locale = "en-US") =>
  new Date(utc(iso)).toLocaleDateString(locale, { ...options, timeZone: "UTC" });

/** ISO timestamp → "02:15 PM" in local time. Always 12-hour, never the device's 24h setting. */
export function formatClock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

/** "08:00" or "08:00:00" → "08:00 AM" */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${pad(h % 12 || 12)}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}