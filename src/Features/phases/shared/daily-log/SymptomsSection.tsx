import { Activity, AlertTriangle, Heart, Info } from "lucide-react";
import { useId, useState } from "react";

import type { Protection } from "../../../../services/logs";

/**
 * Shared "Symptom Tracking" + "Intercourse" cards (follicular design).
 * Used by Menstrual, Follicular and Luteal daily logs, always rendered at the
 * bottom of the page, right above the Save button.
 */

export interface SymptomOption {
  id: string;
  label: string;
}

/**
 * One entry of `symptomInfo` from GET/PUT /v1/logs/:day (backend `symptom_catalog.resolve`).
 * `known: false` = the symptom is not in our database; `phaseRelation: "not_typical"` = it is not usually
 * linked to the current phase. Both come with a `message` that must be shown to the user.
 */
export interface SymptomNotice {
  input: string;
  label: string;
  known: boolean;
  phaseRelation: "common" | "possible" | "not_typical" | null;
  message: string | null;
  redFlag: { key: string; urgent: boolean; message: string } | null;
}

/**
 * Reads the symptom extras the backend adds to the daily-log response (GET/PUT /v1/logs/:day):
 * `onboardingDisclaimer` (above the chips) and `symptomInfo` (per-symptom notices). Pass whatever object holds the
 * server's log (the raw response or a draft built from it). Missing fields give `null` / `undefined`.
 */
export function symptomExtras(source: unknown): { disclaimer: string | null; notices: SymptomNotice[] | undefined } {
  const s = (source ?? {}) as { onboardingDisclaimer?: { message?: string } | null; symptomInfo?: unknown };
  return {
    disclaimer: s.onboardingDisclaimer?.message ?? null,
    notices: Array.isArray(s.symptomInfo) ? (s.symptomInfo as SymptomNotice[]) : undefined,
  };
}

/** Shown when nothing the user has selected is linked to the current phase. The backend's own
 *  `onboardingDisclaimer` (setup symptoms) takes precedence when it is sent. */
const NO_PHASE_SYMPTOMS_MESSAGE =
  "You haven't logged any symptoms linked to this phase yet, so phase-based insights will be limited. Select any that apply, or add your own under Other.";

const OTHER_SYMPTOM_MAX = 60;
const NOTES_MAX = 200;
const SEVERITY_LEVELS = Array.from({ length: 11 }, (_, i) => i);
const PROTECTION_OPTIONS: Protection[] = ["Pill", "Condom", "None", "Other"];

const CARD_CLS =
  "w-full scroll-mt-6 rounded-[24px] border border-[#F1DDE8]/70 bg-white p-4 text-left shadow-sm outline-none sm:p-5";

const chipCls = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
    on ? "border-[#F43F8F] bg-[#FFF0F6] text-[#F43F8F]" : "border-[#F1DDE8] bg-white text-[#17152B] hover:bg-gray-50"
  }`;

/* ───────── Symptom Tracking ───────── */

interface SymptomTrackingProps {
  /** Phase specific preset chips (ids are sent to the backend). */
  options: SymptomOption[];
  /** Shown top-right, e.g. "Luteal Phase symptoms". */
  phaseLabel: string;
  symptoms: string[];
  other: string;
  severity: number | null;
  /**
   * Disclaimer text from the backend (`onboardingDisclaimer.message`), set when none of the symptoms the user
   * picked in setup is linked to this phase. Pass `null`/omit to hide it.
   */
  disclaimer?: string | null;
  /**
   * Per-symptom notices from the backend (`symptomInfo`). A notice is shown only while its symptom is still
   * selected, and only when it has something to say (unknown symptom, not typical for the phase, red flag).
   */
  notices?: SymptomNotice[];
  onSymptoms: (next: string[]) => void;
  onOther: (text: string) => void;
  onSeverity: (n: number | null) => void;
}

export function SymptomTracking({
  options,
  phaseLabel,
  symptoms,
  other,
  severity,
  disclaimer,
  notices,
  onSymptoms,
  onOther,
  onSeverity,
}: SymptomTrackingProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const hintId = `${uid}-hint`;
  const otherId = `${uid}-other`;
  const severityId = `${uid}-severity`;

  // "Other" stays open while the box is empty, so the user can still type into it.
  const [otherOpen, setOtherOpen] = useState(false);
  // Keeps what was typed, so deselecting and re-selecting Other doesn't lose it.
  const [otherDraft, setOtherDraft] = useState(other);

  const otherOn = otherOpen || other.trim() !== "";
  const hasAny = symptoms.length > 0 || other.trim() !== "";

  // Symptoms the user typed themselves (anything that is not a preset chip), shown as removable chips.
  const presetIds = new Set(options.map((o) => o.id));
  const legacyCustom = symptoms.filter((s) => !presetIds.has(s));

  // Notices for symptoms that are still selected. Same whitespace rule as the backend (`" ".join(text.split())`).
  const squash = (t: string) => t.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
  const selected = new Set(symptoms.map(squash));
  const activeNotices = (notices ?? []).filter(
    (n) => selected.has(squash(n.input)) && (n.redFlag || n.message),
  );

  // "Phase related" = a preset chip (the presets are this phase's symptoms) or a symptom the backend rates
  // common / possible for this phase. Free-typed symptoms the catalog doesn't know do not count.
  const hasPhaseSymptom =
    symptoms.some((x) => presetIds.has(x)) ||
    (notices ?? []).some((n) => selected.has(squash(n.input)) && (n.phaseRelation === "common" || n.phaseRelation === "possible"));
  const shownDisclaimer = disclaimer ?? (hasPhaseSymptom ? null : NO_PHASE_SYMPTOMS_MESSAGE);

  const toggle = (id: string) =>
    onSymptoms(symptoms.includes(id) ? symptoms.filter((x) => x !== id) : [...symptoms, id]);

  const toggleOther = () => {
    if (otherOn) {
      setOtherOpen(false);
      setOtherDraft("");
      onOther("");
    } else {
      setOtherOpen(true);
      if (otherDraft) onOther(otherDraft);
    }
  };

  const typed = other.replace(/\s+/g, " ").trim();
  const [justAdded, setJustAdded] = useState(false);

  /** Turns the typed text into its own selected chip, so the user can see it was added. */
  const addCustom = () => {
    if (!typed) return;
    const lower = typed.toLowerCase();
    const preset = options.find((o) => o.label.toLowerCase() === lower || o.id.toLowerCase() === lower);
    const value = preset ? preset.id : typed;
    if (!symptoms.some((x) => x.toLowerCase() === value.toLowerCase())) onSymptoms([...symptoms, value]);
    setOtherDraft("");
    onOther("");
    setJustAdded(true);
  };

  return (
    <section id="symptom-tracking" tabIndex={-1} aria-labelledby={titleId} className={CARD_CLS}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F6] text-[#F43F8F]">
            <Activity className="size-5" />
          </div>
          <h3 id={titleId} className="text-[clamp(0.95rem,1.05vw,1.1rem)] font-bold text-[#17152B]">
            Symptom Tracking
          </h3>
        </div>
        <span className="text-[12px] text-[#68708A]">{phaseLabel}</span>
      </div>

      {shownDisclaimer && (
        <p role="note" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#F1DDE8] bg-[#FFF0F6]/60 p-3 text-[12px] leading-relaxed text-[#68708A]">
          <Info className="mt-0.5 size-4 shrink-0 text-[#F43F8F]" aria-hidden="true" />
          <span>{shownDisclaimer}</span>
        </p>
      )}

      <p id={hintId} className="mt-4 text-[13px] text-[#4B5563]">
        Select everything you&apos;re feeling today:
      </p>

      <div role="group" aria-labelledby={hintId} className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = symptoms.includes(o.id);
          return (
            <button key={o.id} type="button" aria-pressed={on} onClick={() => toggle(o.id)} className={chipCls(on)}>
              {o.label}
            </button>
          );
        })}

        {legacyCustom.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed
            aria-label={`Remove ${c}`}
            onClick={() => toggle(c)}
            className={chipCls(true)}
          >
            {c} <span aria-hidden="true">✕</span>
          </button>
        ))}

        <button type="button" aria-pressed={otherOn} onClick={toggleOther} className={chipCls(otherOn)}>
          Other
        </button>
      </div>

      {otherOn && (
        <div className="mt-4">
          <label htmlFor={otherId} className="mb-1.5 block text-[12.5px] font-medium text-[#17152B]">
            Describe your symptom
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={otherId}
            type="text"
            value={other}
            maxLength={OTHER_SYMPTOM_MAX}
            onChange={(e) => {
              setOtherDraft(e.target.value);
              setJustAdded(false);
              onOther(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Enter your symptom..."
            className="min-w-0 flex-1 rounded-xl border border-[#F1DDE8] bg-white px-3.5 py-2.5 text-[13px] text-[#17152B] placeholder:text-[#A0A6B8] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={typed === ""}
            className="shrink-0 rounded-full bg-[#F43F8F] px-6 py-2.5 text-[13px] font-semibold text-white shadow-2xs transition-all hover:bg-[#E02874] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
          </div>
          <p className="mt-1.5 text-[11px] text-[#68708A]" aria-live="polite">
            {typed !== ""
              ? "Press Enter or tap Add to include it in today's log."
              : justAdded || legacyCustom.length > 0
                ? "Added. Tap a chip to remove it."
                : "Type your own symptom, then press Enter or tap Add."}
          </p>
        </div>
      )}

      {activeNotices.length > 0 && (
        <ul aria-live="polite" className="mt-4 grid gap-2">
          {activeNotices.map((n) => {
            const urgent = n.redFlag?.urgent === true;
            const text = n.redFlag?.message ?? n.message;
            return (
              <li
                key={n.input}
                role="note"
                className={`flex items-start gap-2.5 rounded-2xl border p-3 text-[12px] leading-relaxed ${
                  n.redFlag
                    ? "border-[#F5C2C7] bg-[#FFF1F2] text-[#7F1D1D]"
                    : "border-[#F1DDE8] bg-[#FFF0F6]/60 text-[#68708A]"
                }`}
              >
                {n.redFlag ? (
                  <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${urgent ? "text-[#DC2626]" : "text-[#F43F8F]"}`} aria-hidden="true" />
                ) : (
                  <Info className="mt-0.5 size-4 shrink-0 text-[#F43F8F]" aria-hidden="true" />
                )}
                <span className="whitespace-pre-line">
                  <strong className="font-semibold text-[#17152B]">{n.label}: </strong>
                  {text}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4">
        <span id={severityId} className="text-[12.5px] font-medium text-[#17152B]">
          Severity <span className="font-normal text-[#68708A]">(optional, 0 none – 10 worst)</span>
        </span>
        <div role="group" aria-labelledby={severityId} className="mt-2 flex flex-wrap gap-2">
          {SEVERITY_LEVELS.map((n) => {
            const on = severity === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                aria-label={`Severity ${n}`}
                disabled={!hasAny}
                onClick={() => onSeverity(on ? null : n)}
                className={`flex size-8 items-center justify-center rounded-full border text-[12px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                  on
                    ? "border-[#F43F8F] bg-[#FFF0F6] text-[#F43F8F]"
                    : "border-[#F1DDE8] bg-white text-[#17152B] hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────── Intercourse ───────── */

interface IntercourseSectionProps {
  intercourse: boolean | null;
  protection: Protection | null;
  details: string;
  onIntercourse: (v: boolean | null) => void;
  onProtection: (v: Protection | null) => void;
  onDetails: (v: string) => void;
}

export function IntercourseSection({
  intercourse,
  protection,
  details,
  onIntercourse,
  onProtection,
  onDetails,
}: IntercourseSectionProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const questionId = `${uid}-question`;
  const protectionId = `${uid}-protection`;
  const detailsId = `${uid}-details`;

  const answer = (value: boolean) => {
    const next = intercourse === value ? null : value;
    onIntercourse(next);
    // Protection and its notes only belong to "Yes".
    if (next !== true) {
      onProtection(null);
      onDetails("");
    }
  };

  const selectMethod = (value: Protection) => {
    const next = protection === value ? null : value;
    onProtection(next);
    // Details only belong to "Other", so leaving it discards the text.
    if (next !== "Other") onDetails("");
  };

  const pill = (on: boolean) =>
    `rounded-full border px-6 py-2 text-[13px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
      on ? "border-[#F43F8F] bg-[#F43F8F] text-white shadow-2xs" : "border-[#F1DDE8] bg-white text-[#17152B] hover:bg-gray-50"
    }`;

  return (
    <section id="intercourse-log" tabIndex={-1} aria-labelledby={titleId} className={CARD_CLS}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F6] text-[#F43F8F]">
          <Heart className="size-5 fill-[#F43F8F]" />
        </div>
        <div className="min-w-0">
          <h3 id={titleId} className="text-[clamp(0.95rem,1.05vw,1.1rem)] font-bold leading-tight text-[#17152B]">
            Intercourse
          </h3>
          <p className="mt-0.5 text-[12px] text-[#68708A]">Log your activity to better understand your fertile window</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span id={questionId} className="text-[13px] font-medium text-[#17152B]">
          Did you have intercourse today?
        </span>
        <div role="group" aria-labelledby={questionId} className="flex gap-2">
          <button type="button" aria-pressed={intercourse === true} onClick={() => answer(true)} className={pill(intercourse === true)}>
            Yes
          </button>
          <button type="button" aria-pressed={intercourse === false} onClick={() => answer(false)} className={pill(intercourse === false)}>
            No
          </button>
        </div>
      </div>

      {intercourse === true && (
        <div className="mt-4">
          <span id={protectionId} className="mb-2.5 block text-[13px] font-medium text-[#17152B]">
            Protection / contraception method
          </span>
          <div role="group" aria-labelledby={protectionId} className="flex flex-wrap gap-2">
            {PROTECTION_OPTIONS.map((value) => {
              const on = protection === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => selectMethod(value)}
                  className={`rounded-full border px-5 py-2 text-[13px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                    on
                      ? "border-[#F43F8F] bg-[#F43F8F] text-white shadow-2xs"
                      : "border-[#F1DDE8] bg-white text-[#17152B] hover:bg-gray-50"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {intercourse === true && protection === "Other" && (
        <div className="mt-4">
          <label htmlFor={detailsId} className="mb-2 block text-[13px] font-medium text-[#17152B]">
            Additional details (optional)
          </label>
          <textarea
            id={detailsId}
            value={details}
            maxLength={NOTES_MAX}
            rows={3}
            onChange={(e) => onDetails(e.target.value)}
            placeholder="Add any notes (e.g., time, how you felt, etc.)"
            className="w-full resize-none rounded-xl border border-[#F1DDE8] bg-white px-3 py-2.5 text-[12.5px] text-[#17152B] placeholder:text-[#A0A6B8] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
          />
          <div className="mt-1 text-right text-[10.5px] text-[#68708A]">
            {details.length}/{NOTES_MAX}
          </div>
        </div>
      )}
    </section>
  );
}