import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDate } from '../../../../lib/dailyLogDate';

interface SaveLogBarProps {
  date: string;
  /** saved = just saved · dirty = unsaved edits · stored = previously saved · empty = nothing logged */
  status: 'saved' | 'dirty' | 'stored' | 'empty';
  error: string | null;
  /** Save was pressed with nothing new to save */
  noChanges: boolean;
  onSave: () => void;
}

const CONFETTI_COLORS = ['#F43F8F', '#8B5CF6', '#F59E0B', '#3B82F6', '#10B981', '#FB7185'];

/** Pink/purple confetti blast after a Daily Log save. Skipped when the user prefers reduced motion. */
function celebrate() {
  const base = { colors: CONFETTI_COLORS, disableForReducedMotion: true, zIndex: 9999, ticks: 240, gravity: 0.9 };
  confetti({ ...base, particleCount: 120, spread: 160, startVelocity: 38, origin: { x: 0.5, y: 0.15 } });
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 60, angle: 60, spread: 65, startVelocity: 50, origin: { x: 0, y: 0.65 } });
    confetti({ ...base, particleCount: 60, angle: 120, spread: 65, startVelocity: 50, origin: { x: 1, y: 0.65 } });
  }, 200);
}

export function SaveLogBar({ date, status, error, noChanges, onSave }: SaveLogBarProps) {
  // Fire only when the status *changes* to 'saved', not on every render or when the page opens
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current !== status && status === 'saved') celebrate();
    prevStatus.current = status;
  }, [status]);

  const day = formatDate(date, { month: 'long', day: 'numeric' });
  const message = noChanges
    ? `No changes to save for ${day}.`
    : {
        saved: `Log saved for ${day}.`,
        dirty: `You have unsaved changes for ${day}.`,
        stored: `Showing your saved log for ${day}.`,
        empty: `Nothing logged for ${day} yet.`,
      }[status];

  return (
    <div className="flex flex-col items-stretch gap-2.5 pt-[clamp(4px,1vw,12px)] sm:items-end">
      <button
        type="button"
        onClick={onSave}
        aria-describedby="save-log-status"
        className="w-full rounded-full bg-gradient-to-r from-lu-brand to-lu-brand-strong px-[clamp(28px,3vw,44px)] py-[clamp(12px,1vw,15px)] text-lu-body font-semibold text-white shadow-lu-glow transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[180px]"
      >
        Save Log
      </button>
      {error ? (
        <p id="save-log-status" role="alert" className="text-center text-lu-caption font-medium text-[#E11D48] sm:text-right">
          {error}
        </p>
      ) : (
        <p
          id="save-log-status"
          role="status"
          className={`flex items-center justify-center gap-1.5 text-lu-caption sm:justify-end ${status === 'saved' ? 'text-[#15803D]' : 'text-lu-ink-muted'}`}
        >
          {status === 'saved' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          {message}
        </p>
      )}
    </div>
  );
}
