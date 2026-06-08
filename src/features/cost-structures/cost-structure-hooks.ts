import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CostStructure, CalculationResult, CostCalculation } from '@/lib/types';

export function useCostStructure(id: string) {
  return useQuery({
    queryKey: ['cost-structures', id],
    queryFn: async () => {
      const res = await api.get<{ data: CostStructure }>(`/cost-structures/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCostStructure(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productName: string; period: string }) => {
      const res = await api.post<{ data: CostStructure }>(
        `/companies/${companyId}/cost-structures`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['companies', companyId, 'cost-structures'] }),
  });
}

export function useUpdateCostSection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      section: 'raw-material' | 'direct-labor' | 'indirect-costs';
      config: unknown;
    }) => {
      const res = await api.put<{ data: CostStructure }>(
        `/cost-structures/${id}/${input.section}`,
        input.config,
      );
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-structures', id] }),
  });
}

export function useUpdateSales(id: string) {
  return useMutation({
    mutationFn: async (input: { salesUnitPrice: number; salesQuantity: number }) => {
      const res = await api.put(`/cost-structures/${id}/sales`, input);
      return res.data;
    },
  });
}

export function useCalculate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: { result: CalculationResult; calculationId: string } }>(
        `/cost-structures/${id}/calculate`,
        {},
      );
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-structures', id, 'calculations'] }),
  });
}

export function useLatestCalculation(id: string) {
  return useQuery({
    queryKey: ['cost-structures', id, 'calculations', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: CostCalculation | null }>(
        `/cost-structures/${id}/calculations/latest`,
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}
