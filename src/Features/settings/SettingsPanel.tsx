import { ArrowRight, Bell, Clock, Heart, Info, Lock, Power, Quote, Settings, ShieldAlert, X } from "lucide-react";
import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { InfoCard } from "../../Elements/infoCard/InfoCard";
import { useAsync } from "../../hooks/useAsync";
import { submitOnboardingProfile } from "../../services/onboarding";
import { getProfile, goalFromJourney, journeyFromGoal, type Journey } from "../../services/settings";
import type { OnboardingData, PreferenceKey } from "../../types";
import settingsGirlArt from "../../assets/phases/girl setting img.png";
import intercourseArt from "../../assets/phases/Glossy Valentine Calendar Hearts.png";
import ttcArt from "../../assets/phases/Hopeful Fertility Tracking Sticker Scene.png";
import preventionArt from "../../assets/phases/Glossy Pink Health Calendar Sticker.png";
import bannerBg from "../../assets/phases/ovulation/phase_info_bg.webp";
import { MedicationDisclaimer } from "../phases/shared/daily-log/MedicationSection";
import { LuModal } from "../phases/shared/ui/LuModal";
import { JourneyIcon, LeadDaysPicker, SettingRow, ToggleSwitch } from "./controls";
import { getJourneyOption, getJourneySafety } from "./journeyOptions";

/** Banner illustration per what the user is tracking. bleed = the picture sits on the bottom edge (the girls); objects float in the middle instead. */
const BANNER_ART = {
  cycle: { src: settingsGirlArt, bleed: true }, // plain cycle tracking
  intercourse: { src: intercourseArt, bleed: false }, // cycle tracking + Intercourse Tracking ON
  ttc: { src: ttcArt, bleed: true }, // Trying to conceive
  prevention: { src: preventionArt, bleed: false }, // Pregnancy prevention
} as const;

const Divider = () => <hr className="my-2 border-[#F1DDE8]/60" />;

/** True only when the app is really talking to its API over HTTPS (false for http://localhost in development). */
const API_IS_HTTPS = (() => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL || "").protocol === "https:";
  } catch {
    return false;
  }
})();

/** Read-only "i" disclaimers for the non-journey rows in Fertility Goals. */
const ROW_DISCLAIMERS = {
  intercourse: {
    title: "Intercourse Tracking",
    body: "Logging intercourse helps relate your cycle phases and fertile window to your activity. Tracking does not prevent pregnancy or protect against STIs, and predictions are estimates, not medical advice.",
  },
  regularity: {
    title: "Cycle regularity",
    body: "Regularity insights come from the periods you log, so more complete logs give better estimates. Cycles naturally vary and this is not a diagnosis. If your cycles change suddenly or you are worried, please talk to a doctor.",
  },
} as const;

/** "i" button next to a label; opens the disclaimer popup. */
function SafetyInfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`Show safety information for ${label}`}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#68708A] transition-colors hover:bg-[#FFF0F6] hover:text-[#F43F8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
    >
      <Info className="size-4" aria-hidden="true" />
    </button>
  );
}

/**
 * Disclaimer popup. Mount only while open.
 * With onAgree: consent mode (checkbox + "Yes, I agree"; the X closes without agreeing).
 * Without onAgree: read-only mode ("Okay").
 * Ticking the checkbox only enables the "Yes, I agree" button. Clicking it turns the journey ON right away.
 */
function JourneyConsentModal({ journey, onAgree, onDecline, busy }: {
  journey: Journey;
  onAgree?: () => void;
  onDecline: () => void;
  busy?: boolean;
}) {
  const titleId = useId();
  const descId = useId();
  const checkId = useId();
  const focusBtn = useRef<HTMLButtonElement>(null); // default focus: X in consent mode, "Okay" in info mode
  const [accepted, setAccepted] = useState(false);
  const consent = !!onAgree;
  const title = getJourneyOption(journey).title;
  const safety = getJourneySafety(journey);

  return (
    <LuModal
      labelledBy={titleId}
      describedBy={descId}
      onClose={onDecline}
      initialFocus={focusBtn}
      className="max-h-[92dvh] overflow-y-auto p-6 sm:max-w-[480px] sm:p-7"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F6] text-[#F43F8F]">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lu-title font-bold text-lu-ink">
              {consent ? `Before you use ${title}` : title}
            </h2>
            <p id={descId} className="mt-1 text-lu-label text-lu-ink-muted">
              {consent ? "Please read this carefully before continuing." : "Please read this important information."}
            </p>
          </div>
        </div>
        <button
          ref={consent ? focusBtn : undefined}
          type="button"
          onClick={onDecline}
          aria-label="Close"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-lu-brand-soft text-lu-brand-strong transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
        >
          <X className="size-4" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </header>

      <InfoCard variant="disclaimer" title="Important safety information" className="mt-4">
        {safety ?? "Predictions are estimates from your logs and are not medical advice."}
      </InfoCard>

      {consent ? (
        <>
          <label
            htmlFor={checkId}
            className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#F1DDE8] bg-white p-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#F43F8F]"
          >
            <input
              id={checkId}
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#F43F8F]"
            />
            <span className="text-lu-label font-medium text-lu-ink">
              I have read and understood the safety information above, and I agree to continue.
            </span>
          </label>
          <button
            type="button"
            onClick={onAgree}
            disabled={!accepted || busy}
            className="mt-5 w-full rounded-full bg-lu-brand py-3 text-lu-body font-semibold text-white shadow-lu-glow transition-colors hover:bg-lu-brand-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? "Saving…" : "Yes, I agree"}
          </button>
        </>
      ) : (
        <button
          ref={focusBtn}
          type="button"
          onClick={onDecline}
          className="mt-5 w-full rounded-full bg-lu-brand py-3 text-lu-body font-semibold text-white shadow-lu-glow transition-colors hover:bg-lu-brand-strong"
        >
          Okay
        </button>
      )}
    </LuModal>
  );
}

/** Read-only disclaimer popup for rows that are not a journey ("Okay" only). Mount only while open. */
function InfoNoteModal({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  const titleId = useId();
  const descId = useId();
  const okBtn = useRef<HTMLButtonElement>(null);
  return (
    <LuModal labelledBy={titleId} describedBy={descId} onClose={onClose} initialFocus={okBtn} className="max-h-[92dvh] overflow-y-auto p-6 sm:max-w-[480px] sm:p-7">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F6] text-[#F43F8F]">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lu-title font-bold text-lu-ink">{title}</h2>
            <p id={descId} className="mt-1 text-lu-label text-lu-ink-muted">Please read this important information.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-lu-brand-soft text-lu-brand-strong transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
        >
          <X className="size-4" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </header>
      <InfoCard variant="disclaimer" title="Important information" className="mt-4">{body}</InfoCard>
      <button ref={okBtn} type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-lu-brand py-3 text-lu-body font-semibold text-white shadow-lu-glow transition-colors hover:bg-lu-brand-strong">
        Okay
      </button>
    </LuModal>
  );
}

/* ---------- Consent popups: one checkbox popup for every Fertility Goals toggle ---------- */

type ConsentKind = "trying_to_conceive" | "pregnancy_prevention" | "intercourse" | "regularity";
type ConsentPopup =
  | { mode: "enable"; kind: ConsentKind }
  | { mode: "switch"; from: Journey; to: Journey }
  | { mode: "disable"; kind: ConsentKind };

const CONSENT_NAMES: Record<ConsentKind, string> = {
  trying_to_conceive: "Trying to Conceive",
  pregnancy_prevention: "Pregnancy Prevention",
  intercourse: "Intercourse Tracking",
  regularity: "Cycle Regularity",
};

const ENABLE_COPY: Record<ConsentKind, { heading: string; paragraphs: string[]; checkbox: string }> = {
  trying_to_conceive: {
    heading: "Enable Trying to Conceive?",
    paragraphs: [
      "Enabling this feature will activate fertility-focused insights and tracking to help you understand your menstrual cycle and identify your estimated fertile window.",
      "These estimates are not a guarantee of ovulation or conception and should not replace professional medical advice.",
    ],
    checkbox: "I understand the information above and want to enable Trying to Conceive.",
  },
  pregnancy_prevention: {
    heading: "Enable Pregnancy Prevention?",
    paragraphs: [
      "This feature helps you track your menstrual cycle and estimate your fertile window. Fertility predictions can be inaccurate and should not be relied upon as the sole method of preventing pregnancy.",
      "If you wish to avoid pregnancy, consider using a reliable contraceptive method and consult a healthcare professional for guidance.",
    ],
    checkbox: "I understand the limitations of cycle-based predictions and want to enable Pregnancy Prevention.",
  },
  intercourse: {
    heading: "Enable Intercourse Tracking?",
    paragraphs: [
      "This feature allows you to record sexual activity in relation to your menstrual cycle and review patterns alongside your fertility insights.",
      "This information is personal and sensitive. Cycle timing and intercourse records cannot guarantee conception or prevent pregnancy.",
    ],
    checkbox: "I understand what this feature records and want to enable Intercourse Tracking.",
  },
  regularity: {
    heading: "Enable Cycle Regularity Tracking?",
    paragraphs: [
      "This feature helps you monitor your menstrual cycle and identify patterns in cycle length and regularity over time.",
      "Cycle patterns alone cannot diagnose a medical condition. Consult a healthcare professional if you experience persistent irregularity, missed periods, unusually heavy bleeding, or other concerns.",
    ],
    checkbox: "I understand the purpose and limitations of cycle tracking and want to enable this feature.",
  },
};

/** Shown in the "Enable" and "Switch" popups: what the feature is and what it records. */
const FEATURE_INFO: Record<ConsentKind, { what: string; tracks: string[] }> = {
  trying_to_conceive: {
    what: "A mode for people who want to get pregnant. It uses your logged cycles to estimate your fertile window and likely ovulation days.",
    tracks: ["Period dates and cycle length", "Estimated fertile window and ovulation day", "Ovulation reminders and fertility insights"],
  },
  pregnancy_prevention: {
    what: "A mode for people who want to avoid pregnancy. It highlights days with a higher chance of pregnancy based on your cycle.",
    tracks: ["Period dates and cycle length", "Days with a higher chance of pregnancy", "Fertile window alerts"],
  },
  intercourse: {
    what: "Lets you log sexual activity next to your cycle, so you can see patterns across your phases.",
    tracks: ["Date of each entry you log", "Protection used (if you add it)", "How entries relate to your fertile window and cycle phase"],
  },
  regularity: {
    what: "Checks how consistent your cycles are over time, based on the periods you log.",
    tracks: ["Length of each cycle", "Variation between cycles", "Notes when your cycles look irregular"],
  },
};

/** Shown in the "Disable" popup and as the OFF line in the "Switch" popup: what stops when the feature is turned off. */
const DISABLE_INFO: Record<ConsentKind, string[]> = {
  trying_to_conceive: ["Fertile window and ovulation estimates", "Ovulation reminders and fertility insights"],
  pregnancy_prevention: ["Highlights for days with a higher chance of pregnancy", "Fertile window alerts"],
  intercourse: ["Intercourse logging in your Daily Log", "Related patterns in your insights"],
  regularity: ["Cycle regularity insights", "Notes about irregular cycles"],
};

function consentCopy(popup: ConsentPopup): { heading: string; paragraphs: string[]; checkbox: string; action: string } {
  if (popup.mode === "enable") return { ...ENABLE_COPY[popup.kind], action: "Enable" };
  if (popup.mode === "switch") {
    const from = getJourneyOption(popup.from).title;
    const to = getJourneyOption(popup.to).title;
    return {
      heading: `Switch to ${to}?`,
      paragraphs: [
        `${to} cannot be active at the same time as ${from}.`,
        `If you continue, ${from} and its associated features will be turned off, and ${to} will be enabled instead.`,
        "This change may affect your fertility insights, ovulation tracking, and other related features.",
      ],
      checkbox: `I understand these changes and want to switch to ${to}.`,
      action: "Enable",
    };
  }
  return {
    heading: `Disable ${CONSENT_NAMES[popup.kind]}?`,
    paragraphs: [
      "Previously recorded information may remain available according to your data-retention settings. New tracking or updates for this feature will stop.",
      "You can enable this feature again at any time from Settings.",
    ],
    checkbox: "I understand the changes and want to disable this feature.",
    action: "Disable",
  };
}

/** Checkbox popup (enable / switch / disable). Continue needs the checkbox ticked. Mount only while open. */
function ConsentModal({ popup, onContinue, onCancel, busy }: {
  popup: ConsentPopup;
  onContinue: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const titleId = useId();
  const descId = useId();
  const checkId = useId();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [understood, setUnderstood] = useState(false);
  const copy = consentCopy(popup);
  const targetName = popup.mode === "switch" ? getJourneyOption(popup.to).title : CONSENT_NAMES[popup.kind];
  const fromName = popup.mode === "switch" ? getJourneyOption(popup.from).title : "";
  const targetJourney: Journey | null = popup.mode === "switch" ? popup.to : popup.kind === "trying_to_conceive" || popup.kind === "pregnancy_prevention" ? popup.kind : null;
  const safetyText =
    popup.mode === "disable"
      ? undefined
      : targetJourney
        ? getJourneySafety(targetJourney)
        : popup.mode === "enable" && (popup.kind === "intercourse" || popup.kind === "regularity")
          ? ROW_DISCLAIMERS[popup.kind].body
          : undefined;
  // Switch popup only: what stops in the goal that turns OFF (always TTC <-> Prevention)
  const offInfo = popup.mode === "switch" ? DISABLE_INFO[popup.from as ConsentKind] ?? [] : [];
  // Feature shown in the peach info card: the one being turned ON (enable or switch)
  const featureKind: ConsentKind | null = popup.mode === "enable" ? popup.kind : popup.mode === "switch" ? (popup.to as ConsentKind) : null;

  return (
    <LuModal labelledBy={titleId} describedBy={descId} onClose={onCancel} initialFocus={closeBtn} className="max-h-[96dvh] overflow-y-auto p-4 sm:max-w-[500px] sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </span>
          <h2 id={titleId} className="min-w-0 pt-1.5 text-lu-title font-bold text-lu-ink">{copy.heading}</h2>
        </div>
        <button
          ref={closeBtn}
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-lu-brand-soft text-lu-brand-strong transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
        >
          <X className="size-4" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </header>

      <div id={descId} className="mt-3 space-y-2.5">
        {/* Enable / Switch: (switch only: what turns OFF) + what it is, what it tracks, safety information, about this feature (ONE box) */}
        {featureKind && (
          <div className="rounded-2xl border border-[#FBD9C4] bg-[#FFF4EC] px-3 py-2.5">
            {popup.mode === "switch" && (
              <div className="mb-2 border-b border-dashed border-[#F3C9AE] pb-2">
                <p className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-wide text-[#BE185D]">
                  <Power className="size-3 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                  Turning OFF · {fromName}
                </p>
                <p className="mt-0.5 text-[0.8rem] leading-snug text-ink-soft">
                  {offInfo.join(" · ")}. Both goals cannot be ON at the same time.
                </p>
              </div>
            )}

            <div className="mb-2 border-b border-dashed border-[#F3C9AE] pb-2">
              <p className="text-[0.72rem] font-bold uppercase tracking-wide text-[#9A3412]">What is {CONSENT_NAMES[featureKind]}?</p>
              <p className="mt-0.5 text-[0.8rem] leading-snug text-lu-ink">{FEATURE_INFO[featureKind].what}</p>
              <p className="mt-1.5 text-[0.72rem] font-bold uppercase tracking-wide text-[#9A3412]">What you'll track</p>
              <ul className="mt-0.5 space-y-0.5">
                {FEATURE_INFO[featureKind].tracks.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-[0.8rem] leading-snug text-ink-soft">
                    <span aria-hidden="true" className="mt-[6px] size-1.5 shrink-0 rounded-full bg-[#F43F8F]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {safetyText && (
              <div className="flex gap-2">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-lg bg-white text-[#F43F8F] shadow-sm">
                  <ShieldAlert className="size-3" strokeWidth={2.4} />
                </span>
                <div className="min-w-0 text-[0.8rem] leading-snug text-ink-soft">
                  <p className="font-semibold text-[#9A3412]">Important safety information</p>
                  <p>{safetyText}</p>
                </div>
              </div>
            )}

            <div className={safetyText ? "mt-2 border-t border-dashed border-[#F3C9AE] pt-2" : ""}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE] py-0.5 pl-1 pr-2.5 text-[0.72rem] font-bold text-[#6D28D9]">
                <span aria-hidden="true" className="grid size-4 place-items-center rounded-full bg-[#7C3AED] text-white">
                  <Info className="size-2.5" strokeWidth={2.6} />
                </span>
                About this feature
              </span>
              <p className="mt-1 text-[0.8rem] font-medium leading-snug text-lu-ink">{ENABLE_COPY[featureKind].paragraphs[0]}</p>
            </div>
          </div>
        )}

        {/* Disabling: what stops, what stays, can turn back on */}
        {popup.mode === "disable" && (
          <div className="rounded-2xl border border-[#F9C6DD] bg-[#FFF0F6] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-lg bg-white text-[#F43F8F] shadow-sm">
                <Power className="size-3" strokeWidth={2.4} />
              </span>
              <p className="text-[0.85rem] font-semibold text-[#BE185D]">{targetName} will be turned OFF</p>
            </div>

            <div className="mt-2 border-t border-dashed border-[#F3B5D3] pt-2">
              <p className="text-[0.72rem] font-bold uppercase tracking-wide text-[#BE185D]">What will stop</p>
              <ul className="mt-0.5 space-y-0.5">
                {DISABLE_INFO[popup.kind].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-[0.8rem] leading-snug text-ink-soft">
                    <span aria-hidden="true" className="mt-[6px] size-1.5 shrink-0 rounded-full bg-[#E11D48]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE] py-0.5 pl-1 pr-2.5 text-[0.72rem] font-bold text-[#6D28D9]">
              <span aria-hidden="true" className="grid size-4 place-items-center rounded-full bg-[#7C3AED] text-white">
                <Info className="size-2.5" strokeWidth={2.6} />
              </span>
              You can turn it back on anytime from Settings
            </span>
          </div>
        )}
      </div>

      <label htmlFor={checkId} className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#F1DDE8] bg-white p-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#F43F8F]">
        <input id={checkId} type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#F43F8F]" />
        <span className="text-[0.8rem] font-medium leading-snug text-lu-ink">{copy.checkbox}</span>
      </label>

      <div className="mt-3 grid grid-cols-2 items-center gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className="w-full rounded-full border border-[#F43F8F] bg-white py-2.5 text-lu-body font-semibold text-[#F43F8F] transition-colors hover:bg-[#FFF5F9] disabled:opacity-50">Cancel</button>
        <button type="button" onClick={onContinue} disabled={!understood || busy} className="w-full rounded-full bg-lu-brand py-2.5 text-lu-body font-semibold text-white shadow-lu-glow transition-colors hover:bg-lu-brand-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
          {busy ? "Saving…" : copy.action}
        </button>
      </div>
    </LuModal>
  );
}

/** Same switch as the other rows, but read-only: it shows a fact about the connection, so it cannot be flipped. */
function StatusRow({ label, description, on }: { label: string; description: string; on: boolean }) {
  const labelId = useId();
  const descId = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p id={labelId} className="text-xs font-bold text-[#17152B] sm:text-sm">{label}</p>
        <p id={descId} className="text-[0.72rem] text-[#68708A]">{description}</p>
      </div>
      <span inert className="pointer-events-none" title={on ? "Always on" : undefined}>
        <ToggleSwitch checked={on} onChange={() => {}} labelledBy={labelId} describedBy={descId} />
      </span>
    </div>
  );
}

function SettingsCard({ title, icon, iconClass, children }: { title: string; icon: ReactNode; iconClass: string; children: ReactNode }) {
  return (
    <section className="flex h-full flex-col rounded-[22px] border border-[#F1DDE8]/80 bg-white p-6 shadow-[0_4px_20px_rgba(23,21,43,0.03)] sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`} aria-hidden="true">{icon}</div>
        <h3 className="text-base font-bold tracking-tight text-[#17152B] sm:text-lg">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Same Settings for every phase. Values come from, and are saved to, the onboarding profile. */
export function SettingsPanel({ data, onEditSetup }: {
  data: OnboardingData;
  /** Manage Journey button: goes to the onboarding Review page to edit the profile (with the latest profile) */
  onEditSetup: (data: OnboardingData) => void;
}) {
  const load = useCallback((s: AbortSignal) => getProfile(s), []);
  const profile = useAsync(load);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<ConsentPopup | null>(null); // enable / switch / disable popup
  const [infoJourney, setInfoJourney] = useState<Journey | null>(null); // "i" icon -> info popup
  const [infoNote, setInfoNote] = useState<{ title: string; body: string } | null>(null); // "i" on non-journey rows
  const [optPrefs, setOptPrefs] = useState<Partial<Record<PreferenceKey, boolean>>>({});
  const desiredPrefs = useRef<Partial<Record<PreferenceKey, boolean>>>({});
  const prefQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const p = profile.data;

  if (!p) {
    return profile.status === "error" ? (
      <InfoCard live>
        {profile.error?.message ?? "Couldn't load your settings."}{" "}
        <button type="button" onClick={profile.refetch} className="font-semibold underline">Try again</button>
      </InfoCard>
    ) : (
      <p className="text-lu-body text-lu-ink-muted">Loading settings…</p>
    );
  }

  const journey = journeyFromGoal(p.fertilityGoal);
  const option = getJourneyOption(journey);
  // Optional: shows "Since Jul 5" when the profile carries the date this journey started
  const sinceRaw = (p as { journeyStartedAt?: string }).journeyStartedAt;
  const since = sinceRaw && !Number.isNaN(new Date(sinceRaw).getTime()) ? new Date(sinceRaw).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  const isTTC = journey === "trying_to_conceive";
  const isPrev = journey === "pregnancy_prevention";
  const tracksIntercourse = p.fertilityTracking?.intercourse ?? false;
  // A goal (TTC / prevention) wins; otherwise the picture follows what the user logs.
  const art = isTTC ? BANNER_ART.ttc : isPrev ? BANNER_ART.prevention : tracksIntercourse ? BANNER_ART.intercourse : BANNER_ART.cycle;

  const save = async (patch: Partial<OnboardingData>, okText = "Settings saved") => {
    if (busy) return false;
    setBusy(true);
    setMessage(null);
    const res = await submitOnboardingProfile({ ...data, ...p, preferences: { ...p.preferences, ...desiredPrefs.current }, ...patch } as OnboardingData);
    setBusy(false);
    if (!res.success) {
      setMessage({ kind: "error", text: res.error ?? "Couldn't save your settings." });
      return false;
    }
    profile.refetch();
    setMessage({ kind: "ok", text: okText });
    return true;
  };

  const pref = (key: PreferenceKey) => (key in optPrefs ? optPrefs[key] === true : p.preferences?.[key] === true);

  // Toggle flips instantly (optimistic); saves run one after another so fast clicks never get dropped or overwrite each other.
  const savePref = (key: PreferenceKey, value: boolean) => {
    desiredPrefs.current = { ...p.preferences, ...desiredPrefs.current, [key]: value };
    setOptPrefs(desiredPrefs.current);
    const snapshot = desiredPrefs.current;
    prefQueue.current = prefQueue.current.then(async () => {
      const res = await submitOnboardingProfile({ ...data, ...p, preferences: snapshot } as OnboardingData);
      if (!res.success) {
        desiredPrefs.current = {};
        setOptPrefs({});
        setMessage({ kind: "error", text: res.error ?? "Couldn't save your settings." });
      }
    });
  };

  const changeJourney = (next: Journey) => save({ fertilityGoal: goalFromJourney(next) }, `Journey set to "${getJourneyOption(next).title}"`);

  /** Any Fertility Goals toggle flipped (ON, OFF or switch): ALWAYS show the disclaimer popup first. Nothing is remembered. */
  const requestJourney = (next: "trying_to_conceive" | "pregnancy_prevention") => {
    if (next === journey) return;
    const other = isTTC || isPrev ? journey : null; // the other journey that is ON right now
    setConsent(other ? { mode: "switch", from: other, to: next } : { mode: "enable", kind: next });
  };
  const requestDisable = (kind: "trying_to_conceive" | "pregnancy_prevention") => setConsent({ mode: "disable", kind });
  const requestSimple = (kind: "intercourse" | "regularity", on: boolean) => setConsent({ mode: on ? "enable" : "disable", kind });

  /** Intercourse Tracking / Cycle regularity: plain save. */
  const applySimple = async (kind: "intercourse" | "regularity", on: boolean): Promise<boolean> => {
    if (kind === "intercourse") return save({ fertilityTracking: { ...p.fertilityTracking, intercourse: on } });
    savePref("cycleRegularity", on);
    return true;
  };

  /** Popup "Yes, I agree" / "Disable" (checkbox ticked): applies the change right away (on, switch or off), then closes. */
  const continueConsent = async () => {
    if (!consent) return;
    let ok: boolean;
    if (consent.mode === "switch") {
      ok = await changeJourney(consent.to);
    } else {
      const { kind } = consent;
      const on = consent.mode === "enable";
      if (kind === "intercourse" || kind === "regularity") ok = await applySimple(kind, on);
      else ok = await changeJourney(on ? kind : "cycle_tracking");
    }
    if (ok) setConsent(null);
  };

  return (
    <div className="w-full space-y-7 pb-8 text-left sm:space-y-8">
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`rounded-2xl px-4 py-3 text-lu-label font-medium ${message.kind === "error" ? "bg-[#FFF1F2] text-[#E11D48]" : "bg-[#F0FDF4] text-[#15803D]"}`}
        >
          {message.text}
        </p>
      )}

      <section aria-labelledby="journey-title" className="space-y-2">
        <div>
          <h2 id="journey-title" className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#17152B] sm:text-2xl">
            Health Journey Settings
            <svg viewBox="0 0 48 20" fill="none" aria-hidden="true" className="h-5 w-12 text-[#F9A8D4]">
              <path d="M2 14c6 4 12 4 16-2s8-9 14-6 8 8 14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </h2>
          <p className="mt-0.5 text-xs font-medium text-[#68708A] sm:text-sm">Manage your journey and life stages</p>
        </div>

        {/* Banner: 3 columns on desktop (card 35% | girl 38% | quote 27%), 3:1 shape on xl like the reference. */}
        <div className="relative mt-3 grid w-full grid-cols-1 items-center gap-6 overflow-hidden rounded-[28px] border border-[#F4C9E0] bg-gradient-to-r from-[#FFF1F8] via-[#FCE4F2] to-[#F1E4FB] p-6 shadow-[0_12px_32px_rgba(244,63,143,0.12)] sm:p-7 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:p-8 lg:h-[clamp(20rem,10vw,22rem)] lg:grid-cols-[36fr_36fr_28fr] lg:gap-x-3 lg:px-[3%] lg:py-0">
          {/* Background picture */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat"
            style={{ backgroundImage: `url("${bannerBg}")`, backgroundPosition: "100% 65%" }}
          />
          {/* Light veil behind the left text */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/45 via-white/10 to-transparent" />
          {/* Soft white mist at the bottom: hides the flat bottom edge of the girl picture (sits above the girl, below the cards) */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[18%] bg-gradient-to-t from-[#FFF4FA] via-white/50 to-transparent" />

          {/* LEFT: label + frosted glass card */}
          <div className="relative z-20 min-w-0 space-y-2 lg:py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 lg:ml-2">
              <span className="relative inline-block pb-1.5 pl-1 text-[0.8rem] font-bold uppercase tracking-wide text-[#4B5563]">
                Current <span className="font-semibold text-[#8A92A6]">Journey</span>
                <span aria-hidden="true" className="absolute bottom-0 left-1 h-[2px] w-[52%] rounded-full bg-[#F43F8F]" />
              </span>
              {since && (
                <>
                  <span aria-hidden="true" className="h-4 w-px bg-[#D9CCE0]" />
                  <span className="text-[0.75rem] font-medium text-[#68708A]">Since {since}</span>
                </>
              )}
            </div>

            <div className="relative w-full max-w-[34rem] space-y-3 rounded-[28px] border border-white/80 bg-white/55 p-4 shadow-[0_12px_32px_rgba(244,63,143,0.12)] backdrop-blur-md sm:p-4">
              <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[0.7rem] font-bold normal-case tracking-normal text-[#15803D]">
                <span className="size-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
                Active
              </span>
              <div className="flex items-start gap-4">
                <div className="flex size-[72px] shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#FFEAF4] to-[#FFD3EA] text-[#F43F8F] shadow-[inset_0_1px_0_#fff,0_8px_18px_rgba(244,63,143,0.16)] ring-1 ring-white/80 sm:size-20">
                  <JourneyIcon icon={option.icon} className="h-9 w-9 sm:h-10 sm:w-10" />
                </div>
                <div className="min-w-0 pr-14">
                  <h3 className="text-xl font-bold tracking-tight text-[#17152B] sm:text-2xl">{option.title}</h3>
                  <p className="mt-1 text-xs font-semibold leading-snug text-[#5B6180] sm:text-[0.9rem]">{option.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEditSetup({ ...data, ...p, preferences: { ...p.preferences, ...desiredPrefs.current } } as OnboardingData)}
                className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-full border border-white/70 bg-gradient-to-r from-[#FFD3EA] via-[#FFC6E3] to-[#FBD0F0] py-2 pl-5 pr-2 text-base font-bold tracking-tight text-[#9D174D] shadow-[0_6px_16px_rgba(244,63,143,0.18),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200 active:translate-y-0 sm:pl-6 sm:text-base"
              >
                <span className="flex items-center gap-3">
                  <Settings className="size-5" aria-hidden="true" />
                  Manage Journey
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#BE185D] shadow-[0_2px_8px_rgba(244,63,143,0.2)] transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="size-5" aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>

          {/* MIDDLE: girl. On lg+ she is pinned to the bottom and sized by banner height, so she is never cropped. */}
          <div className={`relative z-10 flex min-w-0 justify-center self-stretch lg:block ${art.bleed ? "items-end" : "items-center"}`}>
            <img
              key={art.src}
              src={art.src}
              alt=""
              width={320}
              height={320}
              loading="lazy"
              style={
                art.bleed
                  ? {
                      WebkitMaskImage: "linear-gradient(to bottom, #000 80%, transparent 100%)",
                      maskImage: "linear-gradient(to bottom, #000 80%, transparent 100%)",
                    }
                  : undefined
              }
              className={`h-auto max-h-56 w-auto max-w-full select-none object-contain drop-shadow-md sm:max-h-64 md:max-h-72 lg:absolute lg:left-1/2 lg:max-h-none lg:max-w-none lg:-translate-x-1/2 lg:w-auto ${
                art.bleed ? "lg:bottom-[3%] lg:h-[84%]" : "lg:bottom-[12%] lg:h-[62%]"
              }`}
            />
          </div>

          {/* RIGHT: quote card (wide screens only) */}
          <div className="relative z-20 hidden rounded-[26px] border border-white/80 bg-white/60 p-5 shadow-[0_10px_28px_rgba(244,63,143,0.14)] backdrop-blur-md lg:block lg:max-w-[22rem] lg:justify-self-end lg:self-center">
            <div className="flex items-start gap-2">
              <Quote aria-hidden="true" className="mt-1 size-6 shrink-0 rotate-180 fill-[#F43F8F] stroke-[#F43F8F]" />
              <p
                className="text-[1.35rem] italic leading-tight text-[#EC4899] xl:text-[1.6rem]"
                style={{ fontFamily: '"Segoe Script","Snell Roundhand","Brush Script MT",cursive' }}
              >
                Your health,
                <br />
                <span className="whitespace-nowrap">
                  journey matters
                  <Heart className="ml-1.5 inline size-4 fill-none stroke-[#EC4899]" aria-hidden="true" />
                </span>
              </p>
            </div>
            <p className="mt-3 text-sm font-medium leading-snug text-[#5B6180] sm:text-[0.95rem]">
              Small steps today,
              <br />
              healthier tomorrow for you!
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="preferences-title" className="space-y-2 pt-1">
        <div>
          <h2 id="preferences-title" className="text-xl font-bold tracking-tight text-[#17152B] sm:text-2xl">Settings &amp; Preferences</h2>
          <p className="mt-0.5 text-xs font-medium text-[#68708A] sm:text-sm">Manage your wellness experience</p>
        </div>
        <div className="mt-3 grid w-full grid-cols-1 items-stretch gap-5 sm:gap-6 lg:grid-cols-2">
          <SettingsCard title="Notifications" icon={<Bell className="h-[18px] w-[18px]" />} iconClass="bg-[#FFF0F6] text-[#F43F8F]">
            <div className="space-y-3">
              <SettingRow
                label="Period reminders"
                description="Get a reminder before your period starts"
                checked={p.periodReminder}
                disabled={busy}
                onChange={(v) => save({ periodReminder: v, periodReminderDays: p.periodReminderDays ?? 1 })}
              />
              {p.periodReminder && (
                <LeadDaysPicker label="Remind me" value={p.periodReminderDays ?? 1} disabled={busy} onChange={(d) => save({ periodReminderDays: d })} />
              )}
            </div>
            <Divider />
            <div className="space-y-3">
              <SettingRow
                label="Ovulation alerts"
                description="Notify on fertile window"
                checked={p.ovulationReminder}
                disabled={busy}
                onChange={(v) => save({ ovulationReminder: v, ovulationReminderDays: p.ovulationReminderDays ?? 1 })}
              />
              {p.ovulationReminder && (
                <LeadDaysPicker label="Remind me" value={p.ovulationReminderDays ?? 1} disabled={busy} onChange={(d) => save({ ovulationReminderDays: d })} />
              )}
            </div>
          </SettingsCard>

          <SettingsCard title="Fertility Goals" icon={<Heart className="h-[18px] w-[18px] fill-[#16A34A] stroke-none" />} iconClass="bg-[#DCFCE7] text-[#16A34A]">
            <SettingRow
              label="Trying to conceive"
              description="Track ovulation closely"
              info={<SafetyInfoButton label="Trying to conceive" onClick={() => setInfoJourney("trying_to_conceive")} />}
              checked={isTTC}
              disabled={busy}
              onChange={(v) => {
                if (v) requestJourney("trying_to_conceive");
                else requestDisable("trying_to_conceive");
              }}
            />
            <Divider />
            <SettingRow
              label="Intercourse Tracking"
              description="Tracking across all cycle phases"
              info={<SafetyInfoButton label="Intercourse Tracking" onClick={() => setInfoNote(ROW_DISCLAIMERS.intercourse)} />}
              checked={tracksIntercourse}
              disabled={busy}
              onChange={(v) => requestSimple("intercourse", v)}
            />
            <Divider />
            <SettingRow
              label="Cycle regularity"
              description="Monitor patterns"
              info={<SafetyInfoButton label="Cycle regularity" onClick={() => setInfoNote(ROW_DISCLAIMERS.regularity)} />}
              checked={pref("cycleRegularity")}
              disabled={busy}
              onChange={(v) => requestSimple("regularity", v)}
            />
            <Divider />
            <SettingRow
              label="Pregnancy prevention"
              description="Avoid fertile window"
              info={<SafetyInfoButton label="Pregnancy prevention" onClick={() => setInfoJourney("pregnancy_prevention")} />}
              checked={isPrev}
              disabled={busy}
              onChange={(v) => {
                if (v) requestJourney("pregnancy_prevention");
                else requestDisable("pregnancy_prevention");
              }}
            />
          </SettingsCard>

          <SettingsCard title="Privacy" icon={<Lock className="h-[18px] w-[18px]" />} iconClass="bg-[#FFF0F6] text-[#F43F8F]">
            <StatusRow
              label="Encrypted health data"
              description={API_IS_HTTPS ? "Encrypted in transit and at rest" : "Needs HTTPS to be fully on"}
              on={API_IS_HTTPS}
            />
            <Divider />
            <SettingRow
              label="Share with provider"
              description="Anonymized insights"
              checked={pref("shareWithProvider")}
              disabled={busy}
              onChange={(v) => savePref("shareWithProvider", v)}
            />
            <Divider />
            <SettingRow
              label="Research participation"
              description="Contribute to studies"
              checked={pref("researchParticipation")}
              disabled={busy}
              onChange={(v) => savePref("researchParticipation", v)}
            />
          </SettingsCard>

          <SettingsCard title="Reminder Preferences" icon={<Clock className="h-[18px] w-[18px]" />} iconClass="bg-[#FFF4E0] text-[#F59E0B]">
            <SettingRow
              label="Medication reminders"
              description="Remind me to take my medication"
              checked={pref("medicationReminders")}
              disabled={busy}
              onChange={(v) => savePref("medicationReminders", v)}
            />
            <MedicationDisclaimer compact />
            <Divider />
            <SettingRow
              label="Water intake"
              description="Remind me to drink water"
              checked={pref("waterReminders")}
              disabled={busy}
              onChange={(v) => savePref("waterReminders", v)}
            />
            <Divider />
            <SettingRow
              label="Wellness Activity"
              description="Weekly summary"
              checked={pref("wellnessSummary")}
              disabled={busy}
              onChange={(v) => savePref("wellnessSummary", v)}
            />
          </SettingsCard>
        </div>
      </section>

      {/* "i" icon: read-only disclaimer */}
      {infoJourney && <JourneyConsentModal journey={infoJourney} onDecline={() => setInfoJourney(null)} />}

      {infoNote && <InfoNoteModal title={infoNote.title} body={infoNote.body} onClose={() => setInfoNote(null)} />}

      {/* Enable / switch / disable popup (checkbox + Continue). */}
      {consent && <ConsentModal popup={consent} busy={busy} onCancel={() => setConsent(null)} onContinue={() => void continueConsent()} />}
    </div>
  );
}