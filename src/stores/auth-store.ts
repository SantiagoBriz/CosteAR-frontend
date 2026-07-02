import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
}

const RT_KEY = 'costear_rt';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** true hasta que se resuelve el intento de refresh inicial. */
  initializing: boolean;
  setAuth: (token: string, user: AuthUser, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  patchUser: (patch: Partial<AuthUser>) => void;
  setInitialized: () => void;
  clear: () => void;
}

export function getStoredRefreshToken(): string | null {
  try { return localStorage.getItem(RT_KEY); } catch { return null; }
}

function storeRefreshToken(rt: string) {
  try { localStorage.setItem(RT_KEY, rt); } catch {}
}

function clearStoredRefreshToken() {
  try { localStorage.removeItem(RT_KEY); } catch {}
}

/**
 * Access token: en memoria (no persiste, se pierde en F5).
 * Refresh token: en localStorage — se envía al backend en /auth/refresh
 * para recuperar la sesión sin depender de cookies cross-origin.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  initializing: true,
  setAuth: (accessToken, user, refreshToken) => {
    if (refreshToken) storeRefreshToken(refreshToken);
    set({ accessToken, user });
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
  setInitialized: () => set({ initializing: false }),
  clear: () => {
    clearStoredRefreshToken();
    set({ accessToken: null, user: null });
  },
}));
