export const WATER_TARGET_ML = 2500;
export const GLASS_ML = 250;
export const STEP_GOALS = [3000, 5000, 7000] as const;
export const DEFAULT_STEP_GOAL = 5000;

export const MEDICATION_TYPES = ["Capsule", "Tablet", "Syrup", "Drops", "Injection", "Cream", "Other"] as const;
export const MEDICATION_FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Every other day", "Once weekly", "As needed"] as const;

export const DOSE_UNITS = ["mg", "mcg", "g", "ml", "IU", "tablet(s)", "drops"];

/** "Three times daily · After food" -> "Three times daily" */
export const baseFrequency = (raw?: string) => (raw ?? "").split(" · ")[0];

/** "Three times daily" -> 3. Daily Log, History and Onboarding all use this one rule */
export function dosesPerDay(frequency?: string) {
  const f = (frequency ?? "").toLowerCase();
  if (f.includes("four")) return 4;
  if (f.includes("three")) return 3;
  if (f.includes("twice") || f.includes("two")) return 2;
  return 1;
}