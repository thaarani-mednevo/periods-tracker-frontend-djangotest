import { apiRequest } from "../api/client";
import { localISODate } from "../cycle";

// Mirrors backend/apps/logs/schema.py - keep the two in sync.
export const FLOWS = ["Spotting", "Light", "Medium", "Heavy"] as const;
export const BLOOD_COLORS = ["Bright Red", "Dark Red", "Brown", "Pink"] as const;
export const CLOT_SIZES = ["Small", "Medium", "Large"] as const;
export const CRAMPS = ["None", "Mild", "Moderate", "Severe"] as const;
export const MOODS = ["Happy", "Calm", "Neutral", "Irritable", "Sad"] as const;
export const ENERGIES = ["Low", "Moderate", "High"] as const;
export const LIBIDOS = ["Low", "Medium", "High"] as const;
export const MUCUS = ["Dry", "Sticky", "Creamy", "Watery", "Egg white"] as const;
export const LH_TESTS = ["Negative", "Low", "High", "Peak"] as const;
export const SLEEPS = ["Poor", "Fair", "Good", "Excellent"] as const;
export const LEVELS = ["None", "Mild", "Moderate", "High"] as const;
export const SYMPTOMS = [
  { id: "headache", label: "Headache" },
  { id: "bloating", label: "Bloating" },
  { id: "fatigue", label: "Fatigue" },
  { id: "backPain", label: "Back pain" },
  { id: "breastTenderness", label: "Breast tenderness" },
  { id: "acne", label: "Acne" },
  { id: "nausea", label: "Nausea" },
  { id: "cravings", label: "Cravings" },
  { id: "insomnia", label: "Insomnia" },
  { id: "anxiety", label: "Anxiety" },
] as const;
export const PRODUCT_TYPES = ["Pad", "Tampon", "Menstrual cup", "Other"] as const;
export const PROTECTIONS = ["None", "Condom", "Pill", "Other"] as const;

export type Flow = (typeof FLOWS)[number];
export type BloodColor = (typeof BLOOD_COLORS)[number];
export type ClotSize = (typeof CLOT_SIZES)[number];
export type Cramps = (typeof CRAMPS)[number];
export type Mood = (typeof MOODS)[number];
export type Energy = (typeof ENERGIES)[number];
export type Libido = (typeof LIBIDOS)[number];
export type Mucus = (typeof MUCUS)[number];
export type LhTest = (typeof LH_TESTS)[number];
export type Sleep = (typeof SLEEPS)[number];
export type Level = (typeof LEVELS)[number];
export type SymptomKey = (typeof SYMPTOMS)[number]["id"];
export type ProductType = (typeof PRODUCT_TYPES)[number];
export type Protection = (typeof PROTECTIONS)[number];

export const PRODUCT_SIZES: Record<ProductType, readonly string[]> = {
  Pad: ["Small", "Medium", "Large", "Overnight"],
  Tampon: ["Light", "Regular", "Super"],
  "Menstrual cup": ["Small", "Medium", "Large"],
  Other: [],
};

export interface Product {
  type: ProductType;
  label: string;
  size: string | null;
  quantity: number;
}

/** One day of self-reported data. `null` / [] means "not recorded"; nothing is ever pre-filled. */
export interface DailyLog {
  date: string;
  flow: Flow | null;
  bloodColor: BloodColor | null;
  clotsPresent: boolean | null;
  clotSize: ClotSize | null;
  cramps: Cramps | null;
  painScore: number | null;
  symptoms: SymptomKey[];
  /** Free-text symptom typed by the user. Needs backend support (see saveDailyLog). */
  customSymptom?: string | null;
  mood: Mood | null;
  energy: Energy | null;
  libido: Libido | null;
  cervicalMucus: Mucus | null;
  bbtCelsius: number | null;
  bbtTime: string | null;
  lhTest: LhTest | null;
  intercourse: boolean | null;
  /** Needs backend support (see saveDailyLog). */
  protection?: Protection | null;
  sleep: Sleep | null;
  fatigue: Level | null;
  cravings: Level | null;
  waterMl: number | null;
  steps: number | null;
  weightKg: number | null;
  products: Product[];
  notes: string | null;
}

export function emptyLog(date: string): DailyLog {
  return {
    date, flow: null, bloodColor: null, clotsPresent: null, clotSize: null, cramps: null, painScore: null,
    symptoms: [], mood: null, energy: null, libido: null, cervicalMucus: null, bbtCelsius: null, bbtTime: null,
    lhTest: null, intercourse: null, sleep: null, fatigue: null, cravings: null, waterMl: null, steps: null,
    weightKg: null, products: [], notes: null,
  };
}

const q = () => ({ date: localISODate() });

/** Days already loaded (or prefetched), kept for 60s so picking a neighbouring date opens instantly.
 *  A save replaces the entry; logout / login clears them (see clearCycleCache). */
const DAY_TTL_MS = 60_000;
const dayCache = new Map<string, { log: DailyLog; at: number }>();
const dayInflight = new Set<string>();
const fresh = (day: string) => {
  const hit = dayCache.get(day);
  return hit && Date.now() - hit.at < DAY_TTL_MS ? hit.log : null;
};

export const clearDailyLogCache = () => {
  dayCache.clear();
  dayInflight.clear();
};

export const getDailyLog = async (day: string, signal?: AbortSignal) => {
  const hit = fresh(day);
  if (hit) return hit;
  const log = await apiRequest<DailyLog>(`/api/v1/logs/${day}`, { query: q(), signal });
  dayCache.set(day, { log, at: Date.now() });
  return log;
};

/** Loads a day in the background so the next click on it is instant. Failures stay silent. */
export function prefetchDailyLog(day: string) {
  if (fresh(day) || dayInflight.has(day)) return;
  dayInflight.add(day);
  apiRequest<DailyLog>(`/api/v1/logs/${day}`, { query: q() })
    .then((log) => dayCache.set(day, { log, at: Date.now() }))
    .catch(() => {})
    .finally(() => dayInflight.delete(day));
}

export function saveDailyLog(day: string, log: DailyLog) {
  const body: Partial<DailyLog> = { ...log };
  delete body.date;
  // customSymptom / protection are newer fields. Only send them when filled in, so a backend that
  // doesn't know them yet keeps accepting every other save.
  if (!body.customSymptom?.trim()) delete body.customSymptom;
  if (body.protection == null) delete body.protection;
  dayCache.delete(day);
  return apiRequest<DailyLog>(`/api/v1/logs/${day}`, { method: "PUT", query: q(), body }).then((saved) => {
    dayCache.set(day, { log: saved, at: Date.now() });
    return saved;
  });
}

export const getLogRange = (start: string, end: string, signal?: AbortSignal) =>
  apiRequest<{ logs: DailyLog[] }>("/api/v1/logs", { query: { ...q(), start, end }, signal });
// ---- medications
export type IntakeStatus = "taken" | "skipped" | "missed" | "pending";

/** One dose slot of the day (1 = first dose). `loggedAt` is an ISO timestamp, null while pending. */
export interface DoseLog {
  slot: number;
  status: IntakeStatus;
  loggedAt: string | null;
}

export interface Medication {
  id: number;
  name: string;
  dose: string;
  form: string;
  frequency: string;
 time: string;
  /** Oru dose ku oru time, sorted. Multi-time varuvadharku munnadi save aana meds la illa */
  times?: string[];
  startDate: string | null;
  endDate: string | null;
  reminder: boolean;
  /** Tablets the user has in stock (optional) */
  tabletCount?: number | null;
   status: IntakeStatus;
  /** Per-slot log for the requested day (from the backend) */
  doses?: DoseLog[];
}

export interface NewMedication {
  name: string;
  dose: string;
  form: string;
  frequency: string;
 time: string;
  times?: string[];
  startDate: string | null;
  endDate: string | null;
  reminder: boolean;
  tabletCount?: number | null;
}

export const getMedications = (day: string, signal?: AbortSignal) =>
  apiRequest<{ medications: Medication[] }>("/api/v1/medications", { query: { ...q(), day }, signal });

export const addMedication = (m: NewMedication) =>
  apiRequest<Medication>("/api/v1/medications", { method: "POST", query: q(), body: m });

export const updateMedication = (id: number, m: Partial<NewMedication>) =>
  apiRequest<Medication>(`/api/v1/medications/${id}`, { method: "PATCH", query: q(), body: m });

export const removeMedication = (id: number) =>
  apiRequest<void>(`/api/v1/medications/${id}`, { method: "DELETE", query: q() });
export const setIntake = (id: number, day: string, status: "taken" | "skipped" | "missed" | null, slot = 1) =>
  apiRequest<{ id: number; slot: number; status: IntakeStatus; loggedAt: string | null }>(`/api/v1/medications/${id}/intake/${day}`, {
    method: "PUT",
    query: q(),
    body: { status, slot },
  });

export interface IntakeRecord {
  date: string;
  name: string;
  dose: string;
  /** "pending" = due on the last day of the range but not marked yet */
  status: "taken" | "skipped" | "missed" | "pending";
  /** 1-based dose slot of that day; absent on "pending" rows */
  slot?: number;
  loggedAt?: string | null;
}

export const getMedicationHistory = (start: string, end: string, signal?: AbortSignal) =>
  apiRequest<{ intakes: IntakeRecord[] }>("/api/v1/medications/history", { query: { ...q(), start, end }, signal });