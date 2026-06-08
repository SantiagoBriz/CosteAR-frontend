import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Cliente HTTP con refresh transparente. El access token vive en memoria
 * (Zustand, no localStorage) para reducir superficie de XSS; el refresh token
 * viaja en una cookie httpOnly que el navegador adjunta sola.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // envía la cookie de refresh
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post<{ data: { accessToken: string } }>(
      '/api/v1/auth/refresh',
      {},
      { withCredentials: true },
    );
    const token = res.data.data.accessToken;
    useAuthStore.getState().setAccessToken(token);
    return token;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config;
    const status = error.response?.status;

    // Un 401 dispara UN intento de refresh; las peticiones concurrentes
    // comparten la misma promesa para no spamear /auth/refresh.
    if (status === 401 && original && !(original as { _retried?: boolean })._retried) {
      (original as { _retried?: boolean })._retried = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje de error legible de la respuesta del backend. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { error?: { message?: string; details?: Array<{ message: string }> } }
      | undefined;
    if (data?.error?.details?.length) {
      return data.error.details.map((d) => d.message).join(' · ');
    }
    return data?.error?.message ?? 'Ocurrió un error inesperado';
  }
  return 'Ocurrió un error inesperado';
}
