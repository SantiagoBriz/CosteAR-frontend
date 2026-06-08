import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/stores/auth-store';

interface AuthResponse {
  data: { user: AuthUser; accessToken: string };
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (input: { cuit: string; password: string; twoFactorCode?: string }) => {
      const res = await api.post<AuthResponse>('/auth/login', input);
      return res.data.data;
    },
    onSuccess: (data) => setAuth(data.accessToken, data.user),
  });
}

export type ProfessionalType =
  | 'CONTADOR_PUBLICO'
  | 'LIC_ADMINISTRACION'
  | 'CONSULTOR_INDEPENDIENTE'
  | 'ANALISTA_INTERNO'
  | 'OTRO';

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  cuit: string;
  dni?: string;
  professionalType: ProfessionalType;
  licenseNumber?: string;
  province: string;
  initialClients?: { name: string; industry?: string; cuit?: string }[];
  marginThresholdPct: number;
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (input: RegisterPayload) => {
      const res = await api.post<AuthResponse>('/auth/register', input);
      return res.data.data;
    },
    onSuccess: (data) => setAuth(data.accessToken, data.user),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => clear(),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post<{ data: { message: string } }>('/auth/forgot-password', { email });
      return res.data.data;
    },
  });
}
