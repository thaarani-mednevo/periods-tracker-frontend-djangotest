import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMedicationHistory,
  getMedications,
  setIntake,
  removeMedication,
  updateMedication,
  type IntakeRecord,
} from "../../../services/logs";
import { getPredictions, localISODate, type PredictedDay } from "../../../services/cycle";
import type { ActivityEntry, DoseState, Medication, Phase } from "../types";

const PHASE_LABEL: Record<PredictedDay["phase"], Phase> = {
  menstrual: "Menstruation",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
  unknown: "Menstruation",
};

function phaseFor(date: string, predictions: PredictedDay[]) {
  const day = predictions.find((d) => d.date === date);
  return {
    phase: day ? PHASE_LABEL[day.phase] : "Menstruation" as Phase,
    cycleDay: day?.cycleDay ?? 1,
  };
}

function statusFor(date: string, records: IntakeRecord[]) : Medication["status"] {
  const today = localISODate();
  if (date > today) return "upcoming";
  if (date === today) return "current";
  if (records.some((r) => r.status === "pending")) return "current";
  return "past";
}

function unitFor(form: string) {
  const value = form.toLowerCase();
  if (value.includes("capsule")) return "capsule";
  if (value.includes("syrup")) return "ml";
  if (value.includes("drop")) return "drop";
  if (value.includes("patch")) return "patch";
  return "tablet";
}

function doseState(status: IntakeRecord["status"]): DoseState {
  if (status === "taken") return "taken";
  if (status === "missed") return "missed";
  if (status === "skipped") return "skipped";
  return "pending";
}

function addDays(date: string, amount: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function useMedications(range: { from: string; to: string }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyResult, predictionResult] = await Promise.all([
        getMedicationHistory(range.from, range.to),
        getPredictions(range.from, range.to),
      ]);

      const grouped = new Map<string, IntakeRecord[]>();
      for (const record of historyResult.intakes) {
        const key = `${record.name.trim().toLowerCase()}|${record.date}`;
        const list = grouped.get(key) ?? [];
        list.push(record);
        grouped.set(key, list);
      }

      // The current medication endpoint contains the richer presentation fields
      // (form, reminder schedule and backend medication id). History remains the
      // source of truth for which doses were actually logged.
      const uniqueDates = [...new Set(historyResult.intakes.map((r) => r.date))];
      const dayMedicationResults = await Promise.all(
        uniqueDates.map(async (date) => {
          try {
            const response = await getMedications(date);
            return [date, response.medications] as const;
          } catch {
            return [date, [] as import("../../../services/logs").Medication[]] as const;
          }
        }),
      );
      const dayMedications = new Map(dayMedicationResults);

      const currentCycleStart = predictionResult.days.find((d) => d.phase === "menstrual")?.date ?? range.from;
      const next: Medication[] = [];

      for (const [key, records] of grouped) {
        const [nameKey, date] = key.split("|");
        const first = records[0];
        const metadata = dayMedications
          .get(date)
          ?.find((m) => m.name.trim().toLowerCase() === nameKey);
        const phase = phaseFor(date, predictionResult.days);
        const time = metadata?.time || "08:00";
        const form = metadata?.form || "Tablet";
        const doses = records.map((r, index) => ({
          id: `${metadata?.id ?? nameKey}-${date}-${index}`,
          quantity: 1,
          time: metadata?.time || time,
          state: doseState(r.status),
        }));

        next.push({
          id: `${metadata?.id ?? nameKey}-${date}`,
          backendId: metadata?.id,
          name: first.name,
          strength: first.dose || metadata?.dose || "",
          form,
          unit: unitFor(form),
          note: metadata?.reminder ? "Reminder enabled" : "",
          date,
          time,
          phase: phase.phase,
          cycleDay: phase.cycleDay,
          status: statusFor(date, records),
          cycle: date >= currentCycleStart ? "current" : "previous",
          doses,
        });
      }

      next.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
      setMedications(next);
      setActivity(
        next.slice(0, 10).map((m, index) => ({
          id: `${m.id}-activity-${index}`,
          medicationId: m.id,
          name: m.name,
          date: m.date,
          time: m.time,
          phase: m.phase,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load medication history.");
      setMedications([]);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDoseState = useCallback((medId: string, doseId: string, state: DoseState) => {
    setMedications((list) =>
      list.map((med) => {
        if (med.id !== medId) return med;
        const dose = med.doses.find((d) => d.id === doseId);
        if (!dose) return med;
        if (med.backendId != null) {
          void setIntake(med.backendId, med.date, state === "pending" ? null : state === "upcoming" ? null : state);
        }
        return {
          ...med,
          doses: med.doses.map((d) => (d.id === doseId ? { ...d, state } : d)),
        };
      }),
    );
  }, []);

  const skip = useCallback((medId: string) => {
    setMedications((list) =>
      list.map((med) => {
        if (med.id !== medId) return med;
        if (med.backendId != null) {
          void setIntake(med.backendId, med.date, "skipped");
        }
        return {
          ...med,
          doses: med.doses.map((d) =>
            d.state === "pending" || d.state === "upcoming" ? { ...d, state: "skipped" as DoseState } : d,
          ),
        };
      }),
    );
  }, []);

  const update = useCallback((next: Medication) => {
    setMedications((list) => list.map((m) => (m.id === next.id ? next : m)));
    if (next.backendId != null) {
      void updateMedication(next.backendId, {
        name: next.name,
        dose: next.strength,
        form: next.form,
        time: next.time,
      });
    }
  }, []);

  const remove = useCallback((medId: string) => {
    setMedications((list) => {
      const med = list.find((m) => m.id === medId);
      if (med?.backendId != null) void removeMedication(med.backendId);
      return list.filter((m) => m.id !== medId);
    });
    setActivity((list) => list.filter((a) => a.medicationId !== medId));
  }, []);

  return useMemo(
    () => ({ medications, activity, setDoseState, skip, update, remove, loading, error, refetch: load }),
    [medications, activity, setDoseState, skip, update, remove, loading, error, load],
  );
}

export { addDays };
