import type { ImputacionOption } from './trazabilidad-types';
import type { StockMovement } from './cost-structure-types';

/** 'YYYY-MM-DD' → 'YYYY-MM'. */
export function toPeriod(dateIso: string): string {
  return dateIso.slice(0, 7);
}

/**
 * Movimientos "nuevos" de esta sesión de edición: los que se agregaron por
 * encima de los que ya existían en el server (`baseCount`) y tienen fecha. Son
 * los únicos que se registran como datos trazables al guardar (D.3).
 *
 * IMPORTANTE — `baseCount` DEBE capturarse ANTES de guardar. Al guardar, el
 * prop `material` se re-sincroniza y el contador sube al total nuevo; si se
 * lee DESPUÉS, este slice da vacío y no se registra nada. Ese era el bug F04:
 * el dato sin imputar nunca llegaba a crearse, así que ni el modal ni la marca
 * de "resultado incompleto" ni el bloqueo de cierre se disparaban jamás.
 */
export function newTrazableMovements(all: StockMovement[], baseCount: number): StockMovement[] {
  return all.slice(baseCount).filter((m) => m.date);
}

/**
 * Regla de imputación (manual §3): si la fecha del hecho cae en el mismo mes
 * que el período de costo de la estructura, se imputa automático sin pedir
 * nada. Si cae en otro mes, el frontend tiene que preguntar (D.3) — el
 * backend no decide esto solo, ver DECISIONES.md.
 */
export function proposeImputation(
  fechaHecho: string,
  periodoCosto: string,
): { auto: string } | { needsDecision: true; options: ImputacionOption[] } {
  const p = toPeriod(fechaHecho);
  if (p === periodoCosto) return { auto: periodoCosto };
  return {
    needsDecision: true,
    options: [
      { periodo: periodoCosto, label: `Imputar a ${periodoCosto} (devengado)`, recommended: true },
      { periodo: p, label: `Mover a la estructura ${p}` },
    ],
  };
}
