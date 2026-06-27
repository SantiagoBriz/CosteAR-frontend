import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Company, CostStructure } from '@/lib/types';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ data: Company[] }>('/companies');
      return res.data.data;
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: async () => {
      const res = await api.get<{ data: Company }>(`/companies/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; industry?: string; cuit?: string; description?: string }) => {
      const res = await api.post<{ data: Company }>('/companies', input);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useCostStructures(companyId: string) {
  return useQuery({
    queryKey: ['companies', companyId, 'cost-structures'],
    queryFn: async () => {
      const res = await api.get<{ data: CostStructure[] }>(
        `/companies/${companyId}/cost-structures`,
      );
      return res.data.data;
    },
    enabled: !!companyId,
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, industry, cuit, description }: { id: string; name: string; industry?: string; cuit?: string; description?: string }) => {
      const res = await api.put<{ data: Company }>(`/companies/${id}`, { name, industry, cuit, description });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['companies', variables.id] });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/companies/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
