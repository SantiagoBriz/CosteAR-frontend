import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alert, AlertSetting, MacroSnapshot } from '@/lib/types';

/** Últimos valores macro (dólar, IPC, etc.) para el semáforo de riesgo. */
export function useMacroLatest() {
  return useQuery({
    queryKey: ['macro', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/latest');
      return res.data.data;
    },
  });
}

/** Historial de un indicador (para calcular la variación). */
export function useMacroHistory(indicatorCode: string) {
  return useQuery({
    queryKey: ['macro', 'history', indicatorCode],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/history', {
        params: { indicatorCode },
      });
      return res.data.data;
    },
    enabled: !!indicatorCode,
  });
}

export function useAlerts(unread = false) {
  return useQuery({
    queryKey: ['alerts', { unread }],
    queryFn: async () => {
      const res = await api.get<{ data: Alert[] }>('/alerts', { params: { unread } });
      return res.data.data;
    },
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/alerts/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useAlertSettings() {
  return useQuery({
    queryKey: ['alerts', 'settings'],
    queryFn: async () => {
      const res = await api.get<{ data: AlertSetting }>('/alerts/settings');
      return res.data.data;
    },
  });
}

export function useUpdateAlertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { marginThresholdPct?: number; emailNotifications?: boolean }) => {
      const res = await api.put<{ data: AlertSetting }>('/alerts/settings', input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', 'settings'] }),
  });
}
