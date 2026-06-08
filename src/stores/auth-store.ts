import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** true hasta que se resuelve el intento de refresh inicial. */
  initializing: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  setInitialized: () => void;
  clear: () => void;
}

/**
 * Estado de autenticación en memoria. El access token NO se persiste en
 * localStorage (mitiga XSS); se recupera vía refresh al cargar la app.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  initializing: true,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setInitialized: () => set({ initializing: false }),
  clear: () => set({ accessToken: null, user: null }),
}));
