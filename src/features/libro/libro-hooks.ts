import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface LedgerEntry {
  id: string;
  companyId: string;
  dataEntryId: string | null;
  period: string;
  costSection: string;
  documentType: string;
  supplier: string | null;
  description: string;
  amount: number;
  currency: string;
  docDate: string | null;
  sourceImageUrl: string | null;
  confidence: number | null;
  aiUsed: boolean;
  wasCorrected: boolean;
  createdAt: string;
}

export interface LedgerResult {
  entries: LedgerEntry[];
  totalsBySection: Record<string, number>;
  periods: string[];
}

export function useLedger(companyId?: string, period?: string) {
  return useQuery({
    queryKey: ['ledger', companyId ?? 'all', period ?? 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.set('companyId', companyId);
      if (period) params.set('period', period);
      const qs = params.toString();
      const res = await api.get<{ data: LedgerResult }>(`/validaciones/ledger${qs ? `?${qs}` : ''}`);
      return res.data.data;
    },
  });
}

export interface ManualLedgerInput {
  companyId: string;
  period: string;
  costSection: string;
  description: string;
  amount: number;
  supplier?: string;
  currency?: string;
  docDate?: string;
}

export function useCreateLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ManualLedgerInput) => {
      const res = await api.post<{ data: LedgerEntry }>('/validaciones/ledger', input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger'] }),
  });
}

export function useUpdateLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ManualLedgerInput>) => {
      const res = await api.patch<{ data: LedgerEntry }>(`/validaciones/ledger/${id}`, patch);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger'] }),
  });
}

export function useDeleteLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/validaciones/ledger/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger'] }),
  });
}
