import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ApiError } from "../services/api/client";
import { clearDailyLogCache } from "../services/logs";
import {
  getCurrentCycle,
  type CycleState,
} from "../services/cycle";

export type CycleStatus =
  | "loading"
  | "ready"
  | "no-setup"
  | "error";

export interface UseCycleResult {
  status: CycleStatus;
  data: CycleState | null;
  error: ApiError | null;
  refetch: () => void;
}

/**
 * Loads cycle state for the selected date.
 *
 * If date is undefined, backend receives today's date.
 */
/** Last good state per day. Shared by every page, so switching tab/day/phase keeps the old screen up
 *  and swaps in the new data, instead of flashing "Loading…" and remounting the whole shell. */
const cycleCache = new Map<string, CycleState>();
let lastCycle: CycleState | null = null;
const cacheKey = (date?: string) => date ?? "today";

/** Call on logout / login / expired session so the next user never sees the previous user's data. */
const inflight = new Set<string>();

type ViewTransitionDoc = Document & { startViewTransition?: (update: () => void) => unknown };

/** Runs a state update inside a browser View Transition, so the old and new screen cross-fade.
 *  Without browser support (or with "reduce motion" on) it just runs the update. */
export function withViewTransition(update: () => void) {
  const doc = document as ViewTransitionDoc;
  if (typeof doc.startViewTransition !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}

export function clearCycleCache() {
  cycleCache.clear();
  clearDailyLogCache();
  lastCycle = null;
  inflight.clear();
}

/** Already-loaded state for a day (no request). */
export const peekCycle = (date?: string) => cycleCache.get(cacheKey(date)) ?? null;

/** Loads a day in the background so the next click on it is instant. */
export function prefetchCycle(date: string) {
  const key = cacheKey(date);
  if (cycleCache.has(key) || inflight.has(key)) return;
  inflight.add(key);
  getCurrentCycle(date)
    .then((s) => {
      cycleCache.set(key, s);
    })
    .catch(() => {
      /* a failed prefetch stays silent: the real load shows the error */
    })
    .finally(() => inflight.delete(key));
}

export function useCycle(date?: string): UseCycleResult {
  const [data, setData] =
    useState<CycleState | null>(() => cycleCache.get(cacheKey(date)) ?? lastCycle);

  const [status, setStatus] =
    useState<CycleStatus>(() => (cycleCache.has(cacheKey(date)) || lastCycle ? "ready" : "loading"));

  const [error, setError] =
    useState<ApiError | null>(null);

  const [nonce, setNonce] = useState(0);

  // A day that is already loaded shows at once; the phase on screen decides whether a later swap needs a cross-fade.
  const cached = cycleCache.get(cacheKey(date));
  const shownPhase = useRef<string | null>(null);
  shownPhase.current = (cached ?? data)?.phase ?? null;

  useEffect(() => {
    const controller = new AbortController();

    // Keep what is on screen while refetching; only show "loading" when there is nothing to show yet.
    setStatus((s) => (s === "ready" ? "ready" : "loading"));

    getCurrentCycle(date, controller.signal)
      .then((state) => {
        cycleCache.set(cacheKey(date), state);
        lastCycle = state;
        const apply = () => {
          setData(state);
          setError(null);
          setStatus("ready");
        };
        // A different phase screen is about to replace the one on screen: cross-fade instead of a hard swap.
        if (shownPhase.current && shownPhase.current !== state.phase) withViewTransition(apply);
        else apply();
      })
      .catch((err: ApiError) => {
        if (err.code === "ABORTED") {
          return;
        }

        if (err.code === "UNAUTHENTICATED" || err.code === "ONBOARDING_REQUIRED") clearCycleCache();
        setError(err);

        setStatus(
          err.code === "UNAUTHENTICATED" ||
            err.code === "ONBOARDING_REQUIRED"
            ? "no-setup"
            : "error",
        );
      });

    return () => controller.abort();
  }, [date, nonce]);

  const refetch = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  return {
    status,
    data: cached ?? data,
    error,
    refetch,
  };
}