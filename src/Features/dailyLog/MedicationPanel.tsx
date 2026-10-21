import { Fragment, type ReactNode } from "react";
import { InfoCard } from "../../Elements/infoCard/InfoCard";
import { MedicationSection } from "../phases/shared/daily-log/MedicationSection";
import { useMedications } from "../phases/shared/daily-log/useDailyLog";

/** Medication card for pages that manage their own selected day (Follicular log, generic Daily Log page). */
export function MedicationPanel({ day, variant }: { day: string; variant?: 'default' | 'menstrual' | 'follicular' | 'side' }) {
  const meds = useMedications(day);
  const error = meds.error ?? meds.loadError?.message ?? null;
  // 'side' sits inside a grid cell, so the card and its error note share one wrapper (a bare fragment would add a grid cell).
  const Wrap = variant === 'side' ? SideWrap : Fragment;
  return (
    <Wrap>
      <MedicationSection
        medications={meds.medications}
        date={day}
        variant={variant}
        onStatusChange={meds.setStatus}
        onAdd={meds.add}
        onRemove={meds.remove}
      />
      {error && <InfoCard live>{error}</InfoCard>}
    </Wrap>
  );
}

function SideWrap({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 min-w-0 flex-col gap-2">{children}</div>;
}