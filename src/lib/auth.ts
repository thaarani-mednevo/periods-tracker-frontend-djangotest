const KEY = "mednevo.auth";

/** Session lifetime. Keep in sync with AUTH_TOKEN_TTL on the backend (apps/cycles/access.py). */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface AuthUser {
  name: string;
  email: string;
}
interface Stored {
  token: string;
  user: AuthUser;
  savedAt: number;
}

export function getAuth(): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    // Entries saved before this change have no savedAt, so they count as expired.
    const expired =
      typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > SESSION_TTL_MS;
    if (!parsed.token || !parsed.user || expired) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed as Stored;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AuthUser): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ token, user, savedAt: Date.now() }));
  } catch {
    /* storage blocked */
  }
}

export function clearAuth(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}

export const getToken = () => getAuth()?.token ?? null;