import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * PERÍODOS DE COSTEO (problema C — Fase 2: la pantalla).
 *
 * La maquinaria vive en el backend (CostPeriodService). Acá solo la consumimos:
 * listar los períodos de una estructura, abrir el siguiente, cerrar y reabrir.
 *
 * Ojo con las rutas: los períodos cuelgan de `/structures/...`, no de
 * `/cost-structures/...` como el resto del módulo.
 */

export type CostPeriodStatus = 'OPEN' | 'CLOSED';

export interface CostPeriod {
  id: string;
  structureId: string;
  companyId: string;
  /** Código ordenable: "2026-07". */
  code: string;
  /** Cómo se muestra: "Julio 2026". */
  label: string;
  startDate: string;
  endDate: string;
  status: CostPeriodStatus;
  closedAt: string | null;
  closedBy: string | null;
  closedRunId: string | null;
  reopenCount: number;
  reopenedAt: string | null;
  reopenReason: string | null;
}

/** Todos los períodos de la estructura, del más nuevo al más viejo. */
export function usePeriods(structureId: string) {
  return useQuery({
    queryKey: ['cost-structures', structureId, 'periods'],
    queryFn: async () => {
      const res = await api.get<{ data: CostPeriod[] }>(`/structures/${structureId}/periods`);
      return res.data.data;
    },
    enabled: !!structureId,
  });
}

/** Invalida la lista de períodos y la estructura tras abrir/cerrar/reabrir. */
function usePeriodMutation<TInput, TOutput>(
  structureId: string,
  run: (input: TInput) => Promise<TOutput>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cost-structures', structureId, 'periods'] });
      void qc.invalidateQueries({ queryKey: ['cost-structures', structureId] });
    },
  });
}

/**
 * Abre el período siguiente al último. `carryAmounts` arrastra los importes (CIF
 * y sueldos) del anterior para revisarlos; la receta viene siempre.
 */
export function useOpenNextPeriod(structureId: string) {
  return usePeriodMutation(structureId, async (carryAmounts: boolean) => {
    const res = await api.post<{ data: CostPeriod }>(`/structures/${structureId}/periods`, {
      carryAmounts,
    });
    return res.data.data;
  });
}

/**
 * Cierra el período: congela los números. El backend lo rechaza si algún centro
 * productivo no tiene cargada la actividad real y el CIP real (regla de E3).
 */
export function useClosePeriod(structureId: string) {
  return usePeriodMutation(
    structureId,
    async ({ periodId, runId }: { periodId: string; runId?: string | null }) => {
      const res = await api.post<{ data: CostPeriod }>(`/periods/${periodId}/close`, {
        runId: runId ?? null,
      });
      return res.data.data;
    },
  );
}

/** Reabre un período cerrado. Exige motivo (mínimo 10 caracteres) y deja rastro. */
export function useReopenPeriod(structureId: string) {
  return usePeriodMutation(
    structureId,
    async ({ periodId, reason }: { periodId: string; reason: string }) => {
      const res = await api.post<{ data: CostPeriod }>(`/periods/${periodId}/reopen`, { reason });
      return res.data.data;
    },
  );
}
