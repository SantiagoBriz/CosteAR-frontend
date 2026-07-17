import type { ImputacionOption } from './trazabilidad-types';

/** 'YYYY-MM-DD' → 'YYYY-MM'. */
export function toPeriod(dateIso: string): string {
  return dateIso.slice(0, 7);
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
