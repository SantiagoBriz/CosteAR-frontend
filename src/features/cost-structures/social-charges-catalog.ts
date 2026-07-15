/**
 * Catálogo de cargas sociales inciertas — el "conocimiento del sistema" (D-1).
 *
 * Fuente: cátedra de Costos (UNT), clase 8 — "Mano de obra: remuneración,
 * cargas sociales e índice de ausentismo".
 *
 * Regla de la cátedra: de las cargas INCIERTAS, solo las REMUNERATIVAS generan
 * cargas derivadas. Los conceptos que las generan son el IAP/YAP (ausentismo
 * pago — el sistema lo calcula solo, no se carga acá), el Premio por Asistencia
 * Perfecta (PAPA) y el Premio por Productividad (PPT). El resto de las inciertas
 * (uniformes, almuerzos, etc.) son NO remunerativas: se suman al índice pero no
 * generan nada encima.
 *
 * Regla general: para ser remunerativo, el concepto debe ser habitual y regular.
 *
 * Clasificar mal un concepto DESVÍA EL COSTO: una carga no remunerativa puesta
 * como remunerativa infla el índice con derivadas que no corresponden.
 */

export type SocialChargeKind = 'remunerative' | 'nonRemunerative';

export interface SocialChargeCatalogItem {
  /** Nombre canónico con el que se carga en el formulario. */
  name: string;
  kind: SocialChargeKind;
  /** Sinónimos para reconocer lo que tipea el costista (en minúsculas, sin acentos). */
  aliases: string[];
  hint?: string;
}

export const SOCIAL_CHARGES_CATALOG: SocialChargeCatalogItem[] = [
  // ── Inciertas REMUNERATIVAS (generan cargas derivadas) ───────────────────
  {
    name: 'PAP (Premio Asistencia Perfecta)',
    kind: 'remunerative',
    aliases: ['papa', 'premio asistencia', 'asistencia perfecta', 'presentismo'],
    hint: 'Genera cargas derivadas (clase 8).',
  },
  {
    name: 'PPP (Premio por Productividad)',
    kind: 'remunerative',
    aliases: ['premio productividad', 'premio por productividad', 'productividad'],
    hint: 'Genera cargas derivadas (clase 8).',
  },
  {
    name: 'Antigüedad',
    kind: 'remunerative',
    aliases: ['antiguedad'],
    hint: 'Adicional habitual y regular → remunerativo.',
  },
  {
    name: 'Gratificaciones habituales',
    kind: 'remunerative',
    aliases: ['gratificacion', 'gratificaciones'],
    hint: 'Habitual y regular → remunerativo. Si es excepcional, es NO remunerativo.',
  },
  {
    name: 'Comisiones',
    kind: 'remunerative',
    aliases: ['comision', 'comisiones'],
  },
  {
    name: 'Horas extras',
    kind: 'remunerative',
    aliases: ['horas extra', 'horas extras', 'suplementarias'],
  },
  {
    name: 'Propinas habituales',
    kind: 'remunerative',
    aliases: ['propina', 'propinas'],
    hint: 'Remunerativas si son habituales y regulares (art. 13 LCT).',
  },
  {
    name: 'Salarios en especie',
    kind: 'remunerative',
    aliases: ['en especie', 'remuneracion en especie', 'salario en especie'],
    hint: 'No pueden superar el 20% del total a pagar.',
  },

  // ── Inciertas NO REMUNERATIVAS (no generan derivadas) ────────────────────
  {
    name: 'Uniformes / ropa de trabajo',
    kind: 'nonRemunerative',
    aliases: ['uniforme', 'uniformes', 'ropa de trabajo', 'indumentaria'],
  },
  {
    name: 'Almuerzos / viandas',
    kind: 'nonRemunerative',
    aliases: ['almuerzo', 'almuerzos', 'vianda', 'viandas', 'comedor', 'vales de almuerzo'],
  },
  {
    name: 'Reintegro de guardería',
    kind: 'nonRemunerative',
    aliases: ['guarderia', 'jardin maternal'],
  },
  {
    name: 'Gastos de medicamentos',
    kind: 'nonRemunerative',
    aliases: ['medicamento', 'medicamentos', 'farmacia'],
  },
  {
    name: 'Útiles escolares',
    kind: 'nonRemunerative',
    aliases: ['utiles escolares', 'utiles'],
  },
  {
    name: 'Cursos y seminarios',
    kind: 'nonRemunerative',
    aliases: ['curso', 'cursos', 'seminario', 'seminarios', 'capacitacion'],
  },
  {
    name: 'Gastos de sepelio',
    kind: 'nonRemunerative',
    aliases: ['sepelio', 'sepelios'],
  },
  {
    name: 'Casa habitación',
    kind: 'nonRemunerative',
    aliases: ['casa habitacion', 'vivienda'],
  },
  {
    name: 'Viáticos con comprobante',
    kind: 'nonRemunerative',
    aliases: ['viatico', 'viaticos'],
    hint: 'CON comprobante → no remunerativo. SIN comprobante → remunerativo.',
  },
  {
    name: 'Asignaciones familiares',
    kind: 'nonRemunerative',
    aliases: ['asignacion familiar', 'asignaciones familiares'],
  },
  {
    name: 'Automóvil afectado al trabajo',
    kind: 'nonRemunerative',
    aliases: ['automovil', 'vehiculo afectado'],
  },
];

/** Normaliza para comparar: sin acentos, en minúsculas. */
function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Clasifica un concepto con el conocimiento del sistema. Devuelve `null` si no
 * lo reconoce: en ese caso decide el costista (modo manual), sin molestarlo.
 */
export function classifySocialCharge(name: string): SocialChargeKind | null {
  const n = norm(name);
  if (!n) return null;
  for (const item of SOCIAL_CHARGES_CATALOG) {
    if (norm(item.name) === n) return item.kind;
    // Alias de 4+ caracteres para evitar falsos positivos.
    if (item.aliases.some((a) => a.length >= 4 && n.includes(norm(a)))) return item.kind;
  }
  return null;
}
