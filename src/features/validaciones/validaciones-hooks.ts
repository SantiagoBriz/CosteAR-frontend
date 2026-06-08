import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DataEntry {
  id: string;
  rawContent: string;
  sourceType: 'TEXT' | 'PDF' | 'IMAGE' | 'WHATSAPP';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  correctedContent: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  connection: {
    company: { id: string; name: string; industry: string | null };
  };
}

interface PaginatedResult {
  items: DataEntry[];
  total: number;
  page: number;
  limit: number;
}

export function usePendingEntries(page = 1) {
  return useQuery({
    queryKey: ['validaciones', 'pending', page],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedResult }>(`/validaciones/pending?page=${page}&limit=20`);
      return res.data.data;
    },
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: ['validaciones', 'pending', 'count'],
    queryFn: async () => {
      const res = await api.get<{ data: { count: number } }>('/validaciones/pending/count');
      return res.data.data.count;
    },
    refetchInterval: 60_000, // refresca cada minuto
  });
}

export function useHistorial(page = 1) {
  return useQuery({
    queryKey: ['validaciones', 'historial', page],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedResult }>(`/validaciones/historial?page=${page}&limit=20`);
      return res.data.data;
    },
  });
}

export function useReviewEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      status,
      note,
      correctedContent,
    }: {
      entryId: string;
      status: 'APPROVED' | 'REJECTED' | 'CORRECTED';
      note?: string;
      correctedContent?: string;
    }) => {
      const res = await api.post<{ data: DataEntry }>(`/validaciones/${entryId}/review`, {
        status,
        note,
        correctedContent,
      });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['validaciones'] });
    },
  });
}
