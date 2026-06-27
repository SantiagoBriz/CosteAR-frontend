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
    mutationFn: async (input: { productName: string; period: string; costingSystem?: string }) => {
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

export function useExportExcel(id: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get(`/cost-structures/${id}/export`, { responseType: 'blob' });
      // Disparar la descarga en el navegador.
      const disposition = res.headers['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `CosteAR-estructura-${id}.xlsx`;
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useSimulate(id: string) {
  return useMutation({
    mutationFn: async (overrides: {
      salesUnitPrice?: number;
      salesQuantity?: number;
      macroFactor?: number;
    }) => {
      const res = await api.post<{ data: { result: CalculationResult; simulated: boolean } }>(
        `/cost-structures/${id}/simulate`,
        overrides,
      );
      return res.data.data.result;
    },
  });
}

export function useCalculationHistory(id: string) {
  return useQuery({
    queryKey: ['cost-structures', id, 'calculations'],
    queryFn: async () => {
      const res = await api.get<{ data: CostCalculation[] }>(`/cost-structures/${id}/calculations`);
      return res.data.data;
    },
    enabled: !!id,
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
