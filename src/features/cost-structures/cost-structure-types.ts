/**
 * Tipos de configuración de estructura de costos.
 * Espejo del schema de Zod del backend (cost.schema.ts).
 */

export interface WilsonConfig {
  annualDemand: number;
  orderCost: number;
  holdingRate: number;
  unitCost: number;
}

export interface StockMovement {
  date: string;
  type: 'purchase' | 'consumption';
  detail: string;
  quantity: number;
  unitCost?: number;
}

export interface RawMaterialConfig {
  // Identidad de mercado (criterio C). Opcionales por retrocompat con la MP única.
  id?: string;
  code?: string;
  name?: string;
  unit?: string;
  supplier?: string;
  wilson: WilsonConfig;
  stockPolicy: {
    minConsumption: number;
    maxConsumption: number;
    minLeadTime: number;
    maxLeadTime: number;
    safetyStock: number;
  };
  initialStock: { quantity: number; unitCost: number };
  movements: StockMovement[];
}

/** Sección de Materia Prima: N materias primas por estructura (Parte 3.1). */
export interface RawMaterialSection {
  materials: RawMaterialConfig[];
}

/** Normaliza la forma legada (MP única plana) o la nueva ({materials}) a lista. */
export function toMaterialsList(cfg: unknown): RawMaterialConfig[] {
  if (cfg && typeof cfg === 'object') {
    const o = cfg as Record<string, unknown>;
    if (Array.isArray(o.materials)) return o.materials as RawMaterialConfig[];
    if ('wilson' in o) return [o as unknown as RawMaterialConfig];
  }
  return [];
}

export interface DirectLaborConfig {
  workingDays: {
    totalDaysPerYear: number;
    unpaidAbsence: {
      sundays: number;
      saturdays: number;
      unjustifiedAbsences: number;
      holidaysOnWeekend: number;
    };
    paidAbsence: {
      holidays: number;
      vacations: number;
      sickness: number;
      specialLeaves: number;
      workAccidents: number;
    };
  };
  itcs: {
    derivationBase: number;
    fixedArt: number;
    sacFraction?: number;
    uncertainRemunerative: Array<{ name: string; coefficient: number }>;
    uncertainNonRemunerative: Array<{ name: string; coefficient: number }>;
  };
  departments: Array<{
    name: string;
    basicRemuneration: number;
    hoursWorked: number; // horas PRESUPUESTADAS (capacidad normal)
    realHours?: number; // dato real de fin de mes (no afecta el cálculo)
    operators?: Array<{ name: string; category?: string; bankedHours?: number; individualAbsenceDays?: number }>;
  }>;
}

export interface IndirectCostConfig {
  centers: Array<{ id: string; name: string; type: 'productive' | 'service' }>;
  concepts: Array<{
    name: string;
    amount: { fixed: number; variable: number };
    distribution: Record<string, number>;
  }>;
  serviceDistributions: Array<{
    serviceCenterId: string;
    toProductive?: Record<string, number>;
    toProductiveFixed?: Record<string, number>;
    toProductiveVariable?: Record<string, number>;
  }>;
  productiveSettings: Array<{
    centerId: string;
    budget: { fixed: number; variable: number };
    normalCapacity: number;
    actualActivity: number;
    actualCip: number;
  }>;
  // Orden de cierre del prorrateo secundario escalonado (Parte 4.4). Se deriva
  // del orden de las filas de "distribución de servicios": el primero cierra
  // primero y un servicio puede repartir a otro que aún no cerró.
  closureOrder?: string[];
}
