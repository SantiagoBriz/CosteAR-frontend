import { useQuery } from '@tanstack/react-query';
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
