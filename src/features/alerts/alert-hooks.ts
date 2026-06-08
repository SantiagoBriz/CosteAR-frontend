import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alert, AlertSetting } from '@/lib/types';

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
