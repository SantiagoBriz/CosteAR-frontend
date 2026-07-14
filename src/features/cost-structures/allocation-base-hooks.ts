import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Bases de asignación (Parte 4). Catálogo de "drivers" físicos (superficie,
 * horas-máquina, focos…) que sirven para DERIVAR los porcentajes de prorrateo
 * en vez de tipearlos. Los valores por centro son trazables (pueden enlazar a
 * la ficha del dato). Ver backend: allocation-base.routes.ts.
 */

export interface AllocationBase {
  id: string;
  companyId: string | null; // null = base del sistema (precargada)
  code: string; // 'hs_maquina', 'superficie_m2'…
  name: string; // 'Horas máquina'
  unit: string; // 'hs máquina', 'm²'…
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
}

export interface AllocationBaseValue {
  id: string;
  baseId: string;
  structureId: string;
  centerId: string;
  value: number;
  note?: string | null;
  dataPointId?: string | null;
  createdAt: string;
  voidedAt?: string | null;
}

/** Catálogo de bases visible para una empresa (bases del sistema + propias). */
export function useAllocationBases(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['companies', companyId, 'allocation-bases'],
    queryFn: async () => {
      const res = await api.get<{ data: AllocationBase[] }>(`/companies/${companyId}/allocation-bases`);
      return res.data.data;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

/** Alta de una base personalizada de la empresa (extiende el catálogo). */
export function useCreateAllocationBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      code: string;
      name: string;
      unit: string;
      description?: string;
    }) => {
      const res = await api.post<{ data: AllocationBase }>('/allocation-bases', input);
      return res.data.data;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['companies', vars.companyId, 'allocation-bases'] }),
  });
}

/** Valores de base cargados para una estructura (unidades por centro, vigentes). */
export function useAllocationValues(structureId: string | null | undefined) {
  return useQuery({
    queryKey: ['structures', structureId, 'allocation-values'],
    queryFn: async () => {
      const res = await api.get<{ data: AllocationBaseValue[] }>(`/structures/${structureId}/allocation-values`);
      return res.data.data;
    },
    enabled: !!structureId,
  });
}

/**
 * Carga/recarga la unidad de una base para un centro (append-only: no pisa el
 * histórico, versiona). Ej.: base "horas-máquina", centro "Corte" = 300.
 */
export function useSetAllocationValue(structureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      baseId: string;
      centerId: string;
      value: number;
      note?: string;
      dataPointId?: string;
    }) => {
      const res = await api.put<{ data: AllocationBaseValue }>(
        `/structures/${structureId}/allocation-values`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['structures', structureId, 'allocation-values'] }),
  });
}
