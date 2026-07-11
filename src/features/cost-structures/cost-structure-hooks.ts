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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { salesUnitPrice: number; salesQuantity: number }) => {
      const res = await api.put(`/cost-structures/${id}/sales`, input);
      return res.data;
    },
    // Refrescar la estructura para que la sección Venta quede marcada como
    // completa y se habilite "Calcular" sin necesidad de recargar la página.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-structures', id] }),
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
    mutationFn: async (shocks: { rawMaterial?: number; directLabor?: number; indirectCosts?: number; sales?: number }) => {
      const res = await api.post<{ data: { result: CalculationResult; simulated: boolean } }>(
        `/cost-structures/${id}/simulate`,
        shocks,
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

export function useCalculationTree(id: string, runId: string | undefined) {
  return useQuery({
    queryKey: ['cost-structures', id, 'calculations', runId, 'tree'],
    queryFn: async () => {
      if (!runId) throw new Error('runId is required');
      const res = await api.get<{ data: { tree: any[] } }>(
        `/cost-structures/${id}/calculations/${runId}/tree`,
      );
      return res.data.data.tree;
    },
    enabled: !!id && !!runId,
  });
}

export function useTraceData(versionId: string | null) {
  return useQuery({
    queryKey: ['data-point-versions', versionId, 'trace'],
    queryFn: async () => {
      if (!versionId) throw new Error('versionId is required');
      const res = await api.get<{ data: any }>(`/data-point-versions/${versionId}/trace`);
      return res.data.data;
    },
    enabled: !!versionId,
  });
}


