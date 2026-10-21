import { Activity, Brain, type LucideIcon } from "lucide-react";
import { SYMPTOMS } from "../../../services/logs";

/** Static explainer copy for the luteal phase. Nothing personal lives here; all dates and values come from the backend. */
export const LUTEAL_COPY = {
  heading: "You're in your luteal phase",
  description:
    "Your body is preparing for menstruation. You may notice changes in mood, fatigue, cravings and sleep during this phase.",
  about: [
    {
      icon: Activity,
      category: "Hormonal Changes",
      title: "Progesterone is higher",
      text: "Progesterone typically rises during the luteal phase and may contribute to changes in body temperature, mood and energy.",
    },
    {
      icon: Brain,
      category: "Body & Mind",
      title: "Energy may be lower",
      text: "You may feel more tired or less energetic during this phase. Rest and balanced nutrition can help support your wellbeing.",
    },
  ] satisfies { icon: LucideIcon; category: string; title: string; text: string }[],
};

/** Luteal symptom pills (Daily Log). Ids are sent to the backend, which normalises them ("foodCravings" = "food cravings"). */
export const LUTEAL_SYMPTOMS: { id: string; label: string }[] = [
  { id: "moodChanges", label: "Mood changes" },
  { id: "bloating", label: "Bloating" },
  { id: "breastTenderness", label: "Breast tenderness" },
  { id: "foodCravings", label: "Food cravings" },
  { id: "fatigue", label: "Fatigue" },
  { id: "headache", label: "Headache" },
  { id: "acne", label: "Acne" },
  { id: "cramps", label: "Cramps" },
  { id: "troubleSleeping", label: "Trouble sleeping" },
];

/** Readable name for any stored symptom: a known id, or the text the user typed. */
export function symptomLabel(id: string): string {
  const known = LUTEAL_SYMPTOMS.find((x) => x.id === id) ?? SYMPTOMS.find((x) => x.id === id);
  if (known) return known.label;
  const spaced = id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}