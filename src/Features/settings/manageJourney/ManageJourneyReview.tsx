import { ArrowLeft, Bell, Check, ChevronRight, Droplet, HeartPulse, ListChecks, PencilLine, Repeat, Save, Scale, MapPin, Flag, ShieldCheck, Sparkles, Target, TriangleAlert, CalendarHeart, X, type LucideIcon } from "lucide-react";
import { useCallback, useId, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import bannerBg from "../../../assets/phases/ovulation/phase_info_bg.webp";
import { ValueList } from "../../../Composites/reviewSection/ReviewSection";
import { InfoCard } from "../../../Elements/infoCard/InfoCard";
import { BIRTH_CONTROL_CATEGORIES, BIRTH_CONTROL_OPTIONS, CYCLE_LENGTH_OPTIONS, GOAL_TRACKING, REGULARITY_OPTIONS } from "../../../constants";
import { clearCycleCache } from "../../../hooks/useCycle";
import { bmiCategory, effectiveDuration, formatLongDate, medicationLabel, pluralDays, trackingLabel, validBmi } from "../../../lib/health";
import { hasErrors, validateStep } from "../../../lib/validation";
import { submitOnboardingProfile } from "../../../services/onboarding";
import { journeyFromGoal } from "../../../services/settings";
import type { OnboardingData, StepErrors, StepId, StepProps } from "../../../types";
import { StepBirthControl } from "../../onboardingFlow/steps/stepBirthControl/StepBirthControl";
import { StepCycleLength } from "../../onboardingFlow/steps/stepCycleLength/StepCycleLength";
import { StepFertilityGoals } from "../../onboardingFlow/steps/stepFertilityGoals/StepFertilityGoals";
import { StepHealthDetails } from "../../onboardingFlow/steps/stepHealthDetails/StepHealthDetails";
import { StepLastPeriod } from "../../onboardingFlow/steps/stepLastPeriod/StepLastPeriod";
import { StepMedicalInfo } from "../../onboardingFlow/steps/stepMedicalInfo/StepMedicalInfo";
import { StepNotifications } from "../../onboardingFlow/steps/stepNotifications/StepNotifications";
import { StepPeriodDuration } from "../../onboardingFlow/steps/stepPeriodDuration/StepPeriodDuration";
import { StepPeriodRegularity } from "../../onboardingFlow/steps/stepPeriodRegularity/StepPeriodRegularity";
import { StepSymptoms, resolvedList } from "../../onboardingFlow/steps/stepSymptoms/StepSymptoms";
import { LuModal } from "../../phases/shared/ui/LuModal";
import { JourneyIcon } from "../controls";
import { getJourneyOption, getJourneySafety } from "../journeyOptions";
import { JourneySaved } from "./JourneySaved";
import { JourneyUpdating } from "./JourneyUpdating";

/** The real onboarding questions, re-used inside each edit popup. */
const STEP_FORMS: Partial<Record<StepId, ComponentType<StepProps>>> = {
  1: StepLastPeriod,
  2: StepCycleLength,
  3: StepPeriodRegularity,
  4: StepPeriodDuration,
  5: StepHealthDetails,
  6: StepMedicalInfo,
  7: StepSymptoms,
  8: StepNotifications,
  9: StepBirthControl,
  10: StepFertilityGoals,
};

interface Row {
  label: string;
  value: ReactNode;
}

interface Section {
  key: string;
  title: string;
  icon: LucideIcon;
  steps: StepId[];
  /** chips = tracked items as pills, columns = values side by side, stack = long values one under another. */
  layout: "chips" | "columns" | "stack";
  rows: Row[];
  chips?: string[];
  note?: string;
}

const dash = <span className="font-medium text-[#A5A0B5]">Not provided</span>;

const validateSection = (steps: StepId[], d: OnboardingData): StepErrors => steps.reduce<StepErrors>((all, s) => ({ ...all, ...validateStep(s, d) }), {});

/** "● On · 5 days before" with a coloured dot, like the design. */
function reminder(on: boolean, days: number | undefined, dot: string): ReactNode {
  if (!on) return <span className="inline-flex items-center gap-1.5 text-[#8A92A6]"><span className="size-2 rounded-full bg-[#CBD5E1]" aria-hidden="true" />Off</span>;
  const n = days ?? 1;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      <span className="font-bold text-[#F43F8F]">On</span>
      <span className="text-sm font-semibold text-[#17152B]">· {n} {n === 1 ? "day" : "days"} before</span>
    </span>
  );
}

function trackedLabels(d: OnboardingData) {
  const goal = d.fertilityGoal;
  const cfg = goal ? GOAL_TRACKING[goal] : undefined;
  return {
    cfg,
    required: cfg ? cfg.required.map((k) => trackingLabel(goal, k)) : [],
    optional: cfg ? cfg.optional.filter((k) => d.fertilityTracking[k]).map((k) => trackingLabel(goal, k)) : [],
  };
}

function buildSections(d: OnboardingData): Section[] {
  const cycle =
    d.cycleLengthOption === "known" && d.cycleLength ? pluralDays(d.cycleLength) : CYCLE_LENGTH_OPTIONS.find((o) => o.value === d.cycleLengthOption)?.label;
  const duration = effectiveDuration(d);
  const { cfg, required, optional } = trackedLabels(d);
  const bcCategory = BIRTH_CONTROL_CATEGORIES.find((c) => c.value === d.birthControlCategory)?.label;
  const bcMethod = d.birthControlCategory === "other" || d.birthControlMethod === "Other" ? d.birthControlCustomMethod.trim() || "Other" : d.birthControlMethod;
  const bmi = validBmi(d.height, d.weight);
  const conditions = d.medicalConditions.flatMap((c) => (c === "Other" ? [d.otherMedicalCondition.trim() || "Other"] : [c]));
  const meds = d.takingMedication ? d.medications.filter((m) => m.name.trim()).map(medicationLabel) : [];
  const profile = [d.name.trim(), d.age && `${d.age} years`].filter(Boolean).join(" · ");

  return [
    {
      key: "tracking", title: "Journey tracking", icon: Target, steps: [10], layout: "chips",
      chips: [...required, ...optional],
      note: optional.length ? `Optional: ${optional.join(", ")}` : undefined,
      rows: cfg ? [] : [{ label: "Focus", value: dash }],
    },
    {
      key: "last-period", title: "Last period", icon: CalendarHeart, steps: [1], layout: "columns",
      rows: [{ label: "Date", value: d.lastPeriod ? formatLongDate(d.lastPeriod) : dash }, ...(profile ? [{ label: "Profile", value: profile }] : [])],
    },
    {
      key: "cycle", title: "Cycle pattern", icon: Repeat, steps: [2, 3, 4], layout: "columns",
      rows: [
        { label: "Cycle length", value: cycle ?? dash },
        { label: "Regularity", value: REGULARITY_OPTIONS.find((o) => o.value === d.periodRegularity)?.label ?? dash },
        { label: "Duration", value: duration ? pluralDays(duration) : dash },
      ],
    },
    {
      key: "birth-control", title: "Birth control", icon: ShieldCheck, steps: [9], layout: "columns",
      rows: [
        { label: "Preference", value: BIRTH_CONTROL_OPTIONS.find((o) => o.value === d.birthControl)?.label ?? dash },
        ...(d.birthControl === "yes" && bcCategory ? [{ label: "Type", value: bcCategory }] : []),
        ...(d.birthControl === "yes" && bcMethod ? [{ label: "Method", value: bcMethod }] : []),
      ],
    },
    {
      key: "health", title: "Health", icon: Scale, steps: [5], layout: "columns",
      rows: [
        { label: "Height", value: d.height ? `${d.height} cm` : dash },
        { label: "Weight", value: d.weight ? `${d.weight} kg` : dash },
        { label: "BMI", value: bmi ? `${bmi.toFixed(1)} · ${bmiCategory(bmi)}` : dash },
      ],
    },
    {
      key: "medical", title: "Medical information", icon: HeartPulse, steps: [6], layout: "stack",
      rows: [
        { label: "Conditions", value: <ValueList items={conditions} /> },
        { label: "Medications", value: d.takingMedication === false ? "None" : <ValueList items={meds} empty="Not provided" /> },
      ],
    },
    {
      key: "symptoms-mood", title: "Symptoms & mood", icon: ListChecks, steps: [7], layout: "stack",
      rows: [
        { label: "Symptoms", value: <ValueList items={resolvedList(d.symptoms, d.customSymptom).filter(Boolean)} /> },
        { label: "Mood", value: <ValueList items={resolvedList(d.moods, d.customMood).filter(Boolean)} /> },
      ],
    },
    {
      key: "reminders", title: "Reminders", icon: Bell, steps: [8], layout: "columns",
      rows: [
        { label: "Period", value: reminder(d.periodReminder, d.periodReminderDays, "bg-[#F43F8F]") },
        { label: "Ovulation", value: reminder(d.ovulationReminder, d.ovulationReminderDays, "bg-[#8B5CF6]") },
      ],
    },
  ];
}

type StopState = "ok" | "edited" | "incomplete";

const PIN_TONE = {
  ok: ["from-[#FF6EA8] to-[#F43F8F]", "from-[#B197FC] to-[#8B5CF6]"],
  edited: ["from-[#F43F8F] to-[#BE185D]", "from-[#8B5CF6] to-[#6D28D9]"],
  incomplete: ["from-[#FBBF24] to-[#F59E0B]", "from-[#FBBF24] to-[#F59E0B]"],
} as const;

/** The "map": all stops on one straight dashed route down the right side. Tap a stop to edit it. */
function RouteStrip({ sections, states, onPick }: { sections: Section[]; states: StopState[]; onPick: (key: string) => void }) {
  return (
    <aside aria-label="Your journey route" className="hidden min-h-0 flex-col rounded-[24px] border border-[#F4C9E0] bg-white/80 p-4 shadow-[0_10px_28px_rgba(244,63,143,0.08)] backdrop-blur lg:flex">
      <p className="flex shrink-0 items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#F43F8F]">
        <MapPin className="size-3.5" aria-hidden="true" />
        Your route · {sections.length} stops
      </p>
      <p className="mt-0.5 shrink-0 text-xs font-medium text-[#8A92A6]">Tap a stop to edit it</p>

      <ol className="relative mt-4 flex min-h-0 flex-1 flex-col justify-between overflow-y-auto py-1">
        <span aria-hidden="true" className="pointer-events-none absolute bottom-6 left-5 top-6 -translate-x-1/2 border-l-2 border-dashed border-[#F2A8CC]" />
        {sections.map((x, i) => {
          const Icon = x.icon;
          const st = states[i];
          return (
            <li key={x.key} className="relative">
              <button type="button" onClick={() => onPick(x.key)} aria-label={`Stop ${i + 1}: ${x.title}. Edit`} className="group flex w-full items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200">
                <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${PIN_TONE[st][i % 2]} text-white shadow-[0_8px_18px_rgba(244,63,143,0.25)] ring-4 ring-white transition-transform group-hover:scale-110 ${st === "edited" ? "outline outline-4 outline-offset-2 outline-[#F43F8F]/25" : ""}`}>
                  {st === "incomplete" ? <TriangleAlert className="size-[18px]" aria-hidden="true" /> : <Icon className="size-[18px]" aria-hidden="true" />}
                  <span className="absolute -right-1.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full bg-white text-[0.6rem] font-bold text-[#BE185D] shadow">{i + 1}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[#17152B] transition-colors group-hover:text-[#BE185D]">{x.title}</span>
                  <span className={`block text-xs font-semibold ${st === "edited" ? "text-[#BE185D]" : st === "incomplete" ? "text-[#B45309]" : "text-[#A5A0B5]"}`}>
                    {st === "edited" ? "Edited" : st === "incomplete" ? "Needs info" : "Up to date"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/** One stop's details. Fills its grid cell so every row lines up. */
function JourneyCard({ section, stop, state, onEdit }: { section: Section; stop: number; state: StopState; onEdit: () => void }) {
  const Icon = section.icon;
  const violet = stop % 2 === 0;
  return (
    <section
      aria-label={section.title}
      className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border bg-white p-3.5 shadow-[0_8px_24px_rgba(244,63,143,0.07)] sm:p-4 ${state === "edited" ? "border-[#F43F8F]/50 ring-2 ring-[#F43F8F]/10" : state === "incomplete" ? "border-[#FCD34D]" : "border-[#F4DCE8]"}`}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-14 -right-12 size-44 rounded-full bg-[radial-gradient(circle,rgba(255,176,214,0.26),transparent_65%)]" />
      <div className="relative flex items-center gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${violet ? "bg-[#EFE5FF] text-[#8B5CF6]" : "bg-[#FFE4F1] text-[#F43F8F]"}`}>
          <Icon className="size-[17px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#F43F8F]">
            Stop {String(stop).padStart(2, "0")}
            {state === "edited" && <span className="rounded-full bg-[#FFF0F6] px-2 py-0.5 text-[0.56rem] tracking-wide text-[#BE185D]">Edited</span>}
            {state === "incomplete" && <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[0.56rem] tracking-wide text-[#B45309]">Needs info</span>}
          </p>
          <h3 className="truncate text-[0.92rem] font-bold tracking-tight text-[#17152B]">{section.title}</h3>
        </div>
        <button type="button" onClick={onEdit} aria-label={`Edit ${section.title.toLowerCase()}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FFF0F6] px-3 py-1.5 text-xs font-bold text-[#BE185D] transition-colors hover:bg-[#FFE0EE] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200">
          <PencilLine className="size-3.5" aria-hidden="true" />
          Edit
        </button>
      </div>

      <div className="relative mt-2.5 min-w-0">
        {section.layout === "chips" && (
          <div className="space-y-1.5">
            {section.chips && section.chips.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {section.chips.map((c) => (
                  <li key={c} className="inline-flex items-center gap-1 rounded-full bg-[#FFF0F6] px-2.5 py-1 text-[0.72rem] font-semibold text-[#F43F8F]">
                    <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
            {section.rows.map((r) => (
              <p key={r.label} className="text-sm text-[#8A92A6]">{r.label}: <span className="font-semibold text-[#17152B]">{r.value}</span></p>
            ))}
          </div>
        )}

        {section.layout === "columns" && (
          <dl className="flex flex-wrap gap-y-2">
            {section.rows.map((r, i) => (
              <div key={r.label} className={`min-w-[6rem] flex-1 pr-2 ${i > 0 ? "border-l border-[#F1E3EC] pl-3" : ""}`}>
                <dt className="text-[0.7rem] font-medium text-[#8A92A6]">{r.label}</dt>
                <dd className="mt-0.5 break-words text-[0.9rem] font-bold leading-snug text-[#17152B]">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {section.layout === "stack" && (
          <dl className="space-y-1.5">
            {section.rows.map((r) => (
              <div key={r.label}>
                <dt className="text-[0.7rem] font-medium text-[#8A92A6]">{r.label}</dt>
                <dd className="break-words text-[0.82rem] font-bold leading-snug text-[#17152B]">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/** Popup that edits one card with the real onboarding question(s). Applies only on "Save changes". */
function SectionEditor({ section, initial, onSave, onClose }: { section: Section; initial: OnboardingData; onSave: (next: OnboardingData) => void; onClose: () => void }) {
  const titleId = useId();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [local, setLocal] = useState<OnboardingData>(initial);
  const [attempted, setAttempted] = useState(() => hasErrors(validateSection(section.steps, initial)));
  const update = useCallback((patch: Partial<OnboardingData>) => setLocal((d) => ({ ...d, ...patch })), []);
  const errors = attempted ? validateSection(section.steps, local) : {};
  const Icon = section.icon;

  const save = () => {
    if (hasErrors(validateSection(section.steps, local))) {
      setAttempted(true);
      return;
    }
    onSave(local);
  };

  return (
    <LuModal labelledBy={titleId} onClose={onClose} initialFocus={closeBtn} className="flex max-h-[92dvh] flex-col sm:max-w-[680px]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-lu-line px-6 py-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F6] text-[#F43F8F]">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <h2 id={titleId} className="truncate text-lu-title font-bold text-lu-ink">Edit {section.title.toLowerCase()}</h2>
        </div>
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lu-brand-soft text-lu-brand-strong">
          <X className="size-4" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </header>

      {/* Hides the "Step N of 11" eyebrow of the onboarding questions. */}
      <div className="@container min-h-0 flex-1 overflow-y-auto overflow-x-clip px-6 py-5 sm:px-7 [&_header>p:first-of-type]:hidden">
        {section.steps.map((s) => {
          const Form = STEP_FORMS[s];
          return Form ? (
            <div key={s} className="mb-6 border-b border-lu-line pb-6 last:mb-0 last:border-0 last:pb-0">
              <Form data={local} update={update} errors={errors} />
            </div>
          ) : null;
        })}
      </div>

      <footer className="grid shrink-0 grid-cols-2 items-center gap-3 border-t border-lu-line px-6 py-4 sm:px-7">
        <button type="button" onClick={save} className="rounded-full bg-lu-brand py-3 text-lu-body font-semibold text-white shadow-lu-glow transition-colors hover:bg-lu-brand-strong">Save changes</button>
        <button type="button" onClick={onClose} className="py-3 text-lu-body font-medium text-lu-ink-soft hover:text-lu-ink">Cancel</button>
      </footer>
    </LuModal>
  );
}

/** "Are you sure?" popup, only for Manage Journey. */
function SaveConfirm({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  const titleId = useId();
  const confirmBtn = useRef<HTMLButtonElement>(null);
  return (
    <LuModal labelledBy={titleId} onClose={onCancel} initialFocus={confirmBtn} className="p-6 text-center sm:max-w-[440px] sm:p-8">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#FFF0F6] text-[#F43F8F]">
        <Target className="size-7" aria-hidden="true" />
      </span>
      <h2 id={titleId} className="mt-4 text-lu-title font-bold text-lu-ink">Save your journey changes?</h2>
      <p className="mt-2 text-lu-body leading-relaxed text-lu-ink-muted">
        Your journey will be <span className="font-semibold text-lu-ink">{title}</span>. Predictions will adjust, and you can change this anytime from Settings.
      </p>
      <div className="mt-6 grid gap-2">
        <button ref={confirmBtn} type="button" onClick={onConfirm} className="rounded-full bg-lu-brand py-3 text-lu-body font-semibold text-white shadow-lu-glow transition-colors hover:bg-lu-brand-strong">Yes, save changes</button>
        <button type="button" onClick={onCancel} className="py-3 text-lu-body font-medium text-lu-ink-soft hover:text-lu-ink">Go back</button>
      </div>
    </LuModal>
  );
}

interface ManageJourneyReviewProps {
  /** Latest saved profile. */
  data: OnboardingData;
  onBack: () => void;
  onDashboard: (data: OnboardingData) => void;
}

type Phase = "review" | "updating" | "saved";

export function ManageJourneyReview({ data, onBack, onDashboard }: ManageJourneyReviewProps) {
  const [draft, setDraft] = useState<OnboardingData>(data);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("review");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [task, setTask] = useState<Promise<string | null> | null>(null);
  const [edited, setEdited] = useState<string[]>([]);

  const sections = useMemo(() => buildSections(draft), [draft]);
  const editing = sections.find((s) => s.key === editingKey);
  const option = getJourneyOption(journeyFromGoal(draft.fertilityGoal));
  const savedOption = getJourneyOption(journeyFromGoal(data.fertilityGoal));
  const switching = option.id !== savedOption.id;
  const safety = getJourneySafety(option.id);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(data), [draft, data]);

  const requestSave = () => {
    const incomplete = sections.find((s) => hasErrors(validateSection(s.steps, draft)));
    if (incomplete) return setEditingKey(incomplete.key);
    setConfirmOpen(true);
  };

  const confirmSave = () => {
    setConfirmOpen(false);
    setSaveError(null);
    setTask(
      submitOnboardingProfile(draft).then((res) => {
        if (!res.success) return res.error ?? "Please try again.";
        clearCycleCache();
        return null;
      }),
    );
    setPhase("updating");
  };

  const finish = useCallback((error: string | null) => {
    if (error) {
      setSaveError(error);
      setPhase("review");
      return;
    }
    setPhase("saved");
  }, []);

  if (phase === "updating" && task) {
    return <div className="flex min-h-0 flex-1 overflow-y-auto py-2"><div className="my-auto w-full"><JourneyUpdating option={option} task={task} onFinish={finish} /></div></div>;
  }

  if (phase === "saved") {
    const { required, optional } = trackedLabels(draft);
    const duration = effectiveDuration(draft);
    return (
      <div className="flex min-h-0 flex-1 overflow-y-auto py-2">
        <div className="my-auto w-full">
        <JourneySaved
          journeyTitle={option.title}
          onDashboard={() => onDashboard(draft)}
          onSettings={onBack}
          summary={[
            { icon: Target, label: "Journey", value: option.title },
            { icon: ListChecks, label: "Tracking", value: [...required, ...optional].join(", ") || "Essentials only" },
            {
              icon: Droplet,
              label: "Cycle",
              value: draft.cycleLengthOption === "known" && draft.cycleLength ? `${draft.cycleLength} days · ${duration ?? "–"}-day period` : `Learning · ${duration ?? "–"}-day period`,
            },
            { icon: Bell, label: "Reminders", value: [draft.periodReminder && "Period", draft.ovulationReminder && "Ovulation"].filter(Boolean).join(" & ") || "Off" },
          ]}
        />
        </div>
      </div>
    );
  }


  const incompleteKeys = new Set(sections.filter((x) => hasErrors(validateSection(x.steps, draft))).map((x) => x.key));
  const stateOf = (key: string): StopState => (edited.includes(key) ? "edited" : incompleteKeys.has(key) ? "incomplete" : "ok");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-3 text-left lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[#17152B] sm:text-2xl">Manage Your Journey</h1>
          <p className="text-xs font-medium text-[#68708A] sm:text-sm">Review what powers your journey. Edit anything that changed, then save.</p>
        </div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full border border-[#F4C9E0] bg-white/80 px-3.5 py-2 text-lu-label font-semibold text-lu-brand-strong transition-colors hover:bg-lu-brand-soft">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Settings
        </button>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <section aria-label="Your journey" className="relative shrink-0 overflow-hidden rounded-[22px] border border-[#F4C9E0] bg-gradient-to-r from-[#FFF1F8] via-[#FCE4F2] to-[#F1E4FB] p-3 shadow-[0_10px_28px_rgba(244,63,143,0.10)] sm:p-4">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: `url("${bannerBg}")`, backgroundPosition: "100% 65%" }} />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/50 via-white/10 to-transparent" />
            <div className="relative flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6EA8] to-[#F43F8F] text-white shadow-[0_10px_22px_rgba(244,63,143,0.30)] sm:size-14">
                <JourneyIcon icon={option.icon} className="size-6 sm:size-7" />
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#F43F8F]">Your journey</p>
                <h2 className="text-lg font-bold tracking-tight text-[#17152B] sm:text-xl">{option.title}</h2>
                <p className="max-w-xl text-xs font-medium text-[#5B6180] sm:text-[0.82rem]">{option.description}</p>
                {switching && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-0.5 text-[0.66rem] font-bold text-[#B45309]">
                    <Sparkles className="size-3" aria-hidden="true" /> Switching from {savedOption.title}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setEditingKey("tracking")} className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-bold text-[#9D174D] shadow-[0_6px_16px_rgba(244,63,143,0.14)] transition-all hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200">
                <PencilLine className="size-4" aria-hidden="true" />
                Change journey
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </section>

          {safety && (
            <InfoCard key={option.id} variant="disclaimer" title="Important safety information">
              {safety}
            </InfoCard>
          )}

          {/* 3 x 3 on wide screens: 8 stops + the save cell, every row the same height, no gaps. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:grid-rows-[repeat(3,minmax(min-content,1fr))] lg:overflow-y-auto">
            {sections.map((x, i) => (
              <JourneyCard key={x.key} section={x} stop={i + 1} state={stateOf(x.key)} onEdit={() => setEditingKey(x.key)} />
            ))}

            <section aria-label="Save your journey" className="flex h-full min-w-0 flex-col justify-between gap-3 rounded-[20px] border border-[#F4C9E0] bg-gradient-to-br from-[#FFF1F8] to-[#F1E4FB] p-3.5 shadow-[0_8px_24px_rgba(244,63,143,0.10)] sm:p-4">
              <div>
                <p className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#8B5CF6]">
                  <Flag className="size-3.5" aria-hidden="true" />
                  Destination
                </p>
                <h3 className="mt-0.5 text-[0.92rem] font-bold tracking-tight text-[#17152B]">Save your journey</h3>
                <p className="mt-1 text-xs font-medium text-[#68708A]">
                  {dirty ? `${edited.length || 1} ${edited.length > 1 ? "stops" : "stop"} changed. Save to refresh your predictions.` : "Edit any stop, then save your changes here."}
                </p>
                {saveError && <p role="alert" className="mt-2 rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">Couldn't save your journey: {saveError}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={requestSave} disabled={!dirty} className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#FF5FA2] to-[#F43F8F] px-5 py-2.5 text-sm font-semibold text-white shadow-lu-glow transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none">
                  <Save className="size-4" aria-hidden="true" />
                  {dirty ? "Save Journey Changes" : "No changes yet"}
                </button>
                <button type="button" onClick={onBack} className="px-3 py-2.5 text-sm font-medium text-lu-ink-soft hover:text-lu-ink">Cancel</button>
              </div>
            </section>
          </div>
        </div>

        <RouteStrip sections={sections} states={sections.map((x) => stateOf(x.key))} onPick={setEditingKey} />
      </div>

      {editing && (
        <SectionEditor
          key={editing.key}
          section={editing}
          initial={draft}
          onSave={(next) => {
            const changed = JSON.stringify(next) !== JSON.stringify(draft);
            const key = editing.key;
            setDraft(next);
            setEdited((prev) => (JSON.stringify(next) === JSON.stringify(data) ? [] : changed && !prev.includes(key) ? [...prev, key] : prev));
            setEditingKey(null);
          }}
          onClose={() => setEditingKey(null)}
        />
      )}
      {confirmOpen && <SaveConfirm title={option.title} onConfirm={confirmSave} onCancel={() => setConfirmOpen(false)} />}
    </div>
  );
}